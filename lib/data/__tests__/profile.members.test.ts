/**
 * Pins `profile-permissions`'s reads: the Permissions roster (each member's own
 * face, role and last-acted-as) and the pending invites that sit beside it,
 * plus the resolution the invite page makes — where a spent, expired or unknown
 * token must be indistinguishable from one that never existed.
 */
import { ROLES } from '@/lib/data/profile.roles';
import { MAXIMAL_TIER } from '@/lib/spoilers';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { profile_invites } from '@/db/schema';
import { bootPglite, resetDb } from '@/test/helpers/db';
import { mockNextCache } from '@/test/helpers/next-cache';
import {
  seedAccentCatalog,
  seedAccentValue,
  seedAvatar,
  seedManagedProfile,
  seedMembership,
  seedSpoilerDefault,
  seedUsers,
  selfProfileOf,
} from '@/test/helpers/seedFollowGraph';
import { cacheTag } from 'next/cache';
import { cacheTags } from '@/lib/cacheTags';

mockNextCache();

type TestDb = Awaited<ReturnType<typeof bootPglite>>['db'];

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock('@/db', () => ({
  get db() {
    return holder.db;
  },
}));

const OWNER = 'owner-account';
const MANAGER = 'manager-account';
const KIDDO = 'kiddo';

let db: TestDb;
let dal: typeof import('@/lib/data/profile.members');

beforeAll(async () => {
  const booted = await bootPglite();
  db = booted.db;
  holder.db = booted.db;
  dal = await import('@/lib/data/profile.members');
});

beforeEach(async () => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  await resetDb(db);
  await seedAccentCatalog(db);
  await seedUsers(db, [{ id: OWNER }, { id: MANAGER }]);
  await seedManagedProfile(db, { id: KIDDO, name: 'Kiddo' });
});

async function seedInvite(overrides: {
  role?: string;
  expires_at?: Date;
  redeemed_at?: Date | null;
}): Promise<string> {
  const [row] = await db
    .insert(profile_invites)
    .values({
      profile_id: KIDDO,
      created_by_user_id: OWNER,
      role: overrides.role ?? 'manager',
      expires_at:
        overrides.expires_at ?? new Date(Date.now() + 24 * 60 * 60 * 1000),
      redeemed_at: overrides.redeemed_at ?? null,
    })
    .returning({ token: profile_invites.token });
  return row.token;
}

describe('getProfileMembers', () => {
  it('MembersOfTheProfile_ReturnsEachWithTheirOwnFaceAndRole', async () => {
    await seedMembership(db, {
      user_id: OWNER,
      profile_id: KIDDO,
      role: 'owner',
      last_active_at: new Date('2026-08-20T00:00:00Z'),
      baseline: 'claims',
    });
    // No baseline row for the manager — the roster resolves that absence to the
    // protected `surprise`, never the profile default.
    await seedMembership(db, {
      user_id: MANAGER,
      profile_id: KIDDO,
      role: 'manager',
    });
    // The row wears the member's own self-profile face, not the administered
    // profile's.
    await seedAvatar(db, selfProfileOf(OWNER), { art: '<svg id="owner" />' });
    await seedAccentValue(db, selfProfileOf(OWNER), 'rose');

    const rows = await dal.getProfileMembers(KIDDO);

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          user_id: OWNER,
          role: ROLES.owner,
          id: selfProfileOf(OWNER),
          art: '<svg id="owner" />',
          accent: 'rose',
          last_active_at: new Date('2026-08-20T00:00:00Z'),
          baseline: 'claims',
        }),
        expect.objectContaining({
          user_id: MANAGER,
          role: ROLES.manager,
          last_active_at: null,
          art: null,
          accent: null,
          baseline: 'surprise',
        }),
      ])
    );
    expect(rows).toHaveLength(2);
  });

  it('AnotherProfilesMembers_AreNotReturned', async () => {
    await seedManagedProfile(db, { id: 'nana', name: 'Nana' });
    await seedMembership(db, { user_id: OWNER, profile_id: 'nana' });

    expect(await dal.getProfileMembers(KIDDO)).toEqual([]);
  });

  it('EveryMember_TagsTheirOwnAccount', async () => {
    await seedMembership(db, { user_id: MANAGER, profile_id: KIDDO });

    await dal.getProfileMembers(KIDDO);

    // The read is keyed on the profile but its rows belong to accounts, so a
    // membership write on either side has a tag to fire.
    expect(cacheTag).toHaveBeenCalledWith(cacheTags.profilesOfUser(MANAGER));
    // The profile's own narrow tag, so a role change on one profile need not
    // fire the coarse table tag and invalidate every account's memberships.
    expect(vi.mocked(cacheTag).mock.calls.flat()).toContain(
      cacheTags.membersOfProfile(KIDDO)
    );
  });

  it('QueryThrows_RejectsWithFailedToFetchProfileMembers', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(db, 'select').mockImplementation(() => {
      throw new Error('boom');
    });

    await expect(dal.getProfileMembers(KIDDO)).rejects.toThrow(
      'Failed to fetch profile members'
    );
  });
});

describe('getPendingInvites', () => {
  it('LiveInvites_ReturnedOldestFirstWithTheirToken', async () => {
    const first = await seedInvite({ role: 'manager' });
    const second = await seedInvite({ role: 'owner' });

    const rows = await dal.getPendingInvites(KIDDO);

    expect(rows.map((r) => r.token)).toEqual([first, second]);
    expect(rows.map((r) => r.role)).toEqual([ROLES.manager, ROLES.owner]);
  });

  it('AnyRead_IsUncachedSoTheExpiryFilterIsNotFrozen', async () => {
    await seedInvite({ role: 'manager' });

    await dal.getPendingInvites(KIDDO);

    // The WHERE filters `expires_at > now`, so a cached entry would hold a
    // clock. No tag can restore it — expiry is elapsed time, not a write.
    expect(cacheTag).not.toHaveBeenCalled();
  });

  it('SpentInvite_IsNotPending', async () => {
    await seedInvite({ redeemed_at: new Date() });

    expect(await dal.getPendingInvites(KIDDO)).toEqual([]);
  });

  it('ExpiredInvite_IsNotPending', async () => {
    await seedInvite({ expires_at: new Date(Date.now() - 1000) });

    expect(await dal.getPendingInvites(KIDDO)).toEqual([]);
  });

  it('QueryThrows_RejectsWithFailedToFetchPendingInvites', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(db, 'select').mockImplementation(() => {
      throw new Error('boom');
    });

    await expect(dal.getPendingInvites(KIDDO)).rejects.toThrow(
      'Failed to fetch pending invites'
    );
  });
});

describe('getLiveInvite', () => {
  it('LiveToken_ReturnsTheProfileItAdmitsToAndTheRoleItGrants', async () => {
    await seedAvatar(db, KIDDO, { art: '<svg id="kiddo" />' });
    const token = await seedInvite({ role: 'owner' });

    expect(await dal.getLiveInvite(token)).toMatchObject({
      id: KIDDO,
      name: 'Kiddo',
      role: ROLES.owner,
      art: '<svg id="kiddo" />',
    });
  });

  // The three refusals are indistinguishable by design: resolving any of them
  // to a profile would confirm to a stranger that a guessed token existed.
  it('SpentToken_ReturnsNull', async () => {
    expect(await dal.getLiveInvite(await seedInvite({ redeemed_at: new Date() })))
      .toBeNull();
  });

  it('ExpiredToken_ReturnsNull', async () => {
    const token = await seedInvite({ expires_at: new Date(Date.now() - 1000) });

    expect(await dal.getLiveInvite(token)).toBeNull();
  });

  it('UnknownToken_ReturnsNull', async () => {
    expect(await dal.getLiveInvite('no-such-token')).toBeNull();
  });

  it('QueryThrows_RejectsWithFailedToFetchInvite', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(db, 'select').mockImplementation(() => {
      throw new Error('boom');
    });

    await expect(dal.getLiveInvite('tok')).rejects.toThrow(
      'Failed to fetch invite'
    );
  });
});

/**
 * Pins `spoiler-visibility`'s resolution: protection follows the human's
 * membership on the profile owning the content, never the ownership comparison
 * the request already holds.
 */
describe('getSpoilerBaseline', () => {
  beforeEach(async () => {
    await seedUsers(db, [{ id: 'stranger' }]);
    await seedMembership(db, {
      user_id: OWNER,
      profile_id: KIDDO,
      baseline: 'claims',
    });
  });

  it('MemberActingAsAnotherProfile_ResolvesFromTheMembershipOnTheOwner', async () => {
    // The acting profile is never an input: the account id and the OWNING
    // profile are, so a switch cannot un-protect the human, and ownership
    // contributes nothing to the resolution.
    expect(await dal.getSpoilerBaseline(OWNER, KIDDO)).toBe('claims');
  });

  it('NonMember_ResolvesToTheMaximalTier', async () => {
    expect(await dal.getSpoilerBaseline('stranger', KIDDO)).toBe(MAXIMAL_TIER);
  });

  it('SignedOutViewer_ResolvesToTheMaximalTier', async () => {
    expect(await dal.getSpoilerBaseline(undefined, KIDDO)).toBe(MAXIMAL_TIER);
  });

  it('MembershipCarryingNoTierRow_ResolvesToSurprise', async () => {
    await seedMembership(db, { user_id: MANAGER, profile_id: KIDDO });

    expect(await dal.getSpoilerBaseline(MANAGER, KIDDO)).toBe('surprise');
  });

  it('MembershipWithNoRowDespiteAProfileDefault_ResolvesToSurpriseNotTheDefault', async () => {
    // The profile-wide default seeds new memberships; a sitting member with no
    // row resolves to `surprise` without ever consulting it.
    await seedSpoilerDefault(db, KIDDO, 'identity');
    await seedMembership(db, { user_id: MANAGER, profile_id: KIDDO });

    expect(await dal.getSpoilerBaseline(MANAGER, KIDDO)).toBe('surprise');
  });

  it('QueryThrows_RejectsWithFailedToFetchSpoilerBaseline', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(db, 'select').mockImplementation(() => {
      throw new Error('boom');
    });

    await expect(dal.getSpoilerBaseline(OWNER, KIDDO)).rejects.toThrow(
      'Failed to fetch spoiler baseline'
    );
  });
});

describe('viewerIsProfileMember', () => {
  it('AccountHoldingAMembership_ReturnsTrue', async () => {
    await seedMembership(db, { user_id: MANAGER, profile_id: KIDDO });

    expect(await dal.viewerIsProfileMember(MANAGER, KIDDO)).toBe(true);
  });

  it('AccountWithNoMembership_ReturnsFalse', async () => {
    expect(await dal.viewerIsProfileMember(MANAGER, KIDDO)).toBe(false);
  });

  it('SignedOutViewer_ReturnsFalse', async () => {
    expect(await dal.viewerIsProfileMember(undefined, KIDDO)).toBe(false);
  });
});

describe('getSpoilerDefault', () => {
  it('StoredRow_ReturnsTheStoredTier', async () => {
    await seedSpoilerDefault(db, KIDDO, 'identity');

    expect(await dal.getSpoilerDefault(KIDDO)).toBe('identity');
  });

  it('NoStoredRow_ReturnsSurprise', async () => {
    expect(await dal.getSpoilerDefault(KIDDO)).toBe('surprise');
  });

  it('QueryThrows_RejectsWithFailedToFetchSpoilerDefault', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(db, 'select').mockImplementation(() => {
      throw new Error('boom');
    });

    await expect(dal.getSpoilerDefault(KIDDO)).rejects.toThrow(
      'Failed to fetch spoiler default'
    );
  });
});
