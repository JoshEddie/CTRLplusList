import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  preferences,
  profile_members,
  profile_preferences,
  profiles,
  user_blocks,
  user_follows,
  users,
} from '@/db/schema';
import { auth } from '@/lib/auth';
import { bootPglite, resetDb } from '@/test/helpers/db';
import { mockNextCache } from '@/test/helpers/next-cache';
import {
  seedAccentCatalog,
  seedBlock,
  seedFollow,
  seedManagedProfile,
  seedUsers,
  selfProfileOf,
} from '@/test/helpers/seedFollowGraph';
import { ACCENT_NAMES } from '@/lib/accent';
import { eq, sql } from 'drizzle-orm';

mockNextCache();

type TestDb = Awaited<ReturnType<typeof bootPglite>>['db'];

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock('@/db', () => ({
  get db() {
    return holder.db;
  },
}));
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

const VIEWER = { id: 'viewer', email: 'viewer@test.local' };
const TARGET = { id: 'target', email: 'target@test.local' };
const THIRD = { id: 'third', email: 'third@test.local' };
const VIEWER_PROFILE = selfProfileOf(VIEWER.id);
const TARGET_PROFILE = selfProfileOf(TARGET.id);

let db: TestDb;
let actions: typeof import('@/lib/data/profile.actions');
let updateTag: ReturnType<typeof vi.fn>;

function asViewer() {
  vi.mocked(auth).mockResolvedValue({ user: { email: VIEWER.email } } as never);
}
function asTarget() {
  vi.mocked(auth).mockResolvedValue({ user: { email: TARGET.email } } as never);
}
function noSession() {
  vi.mocked(auth).mockResolvedValue(null as never);
}

async function followRows() {
  return db.select().from(user_follows);
}
async function blockRows() {
  return db.select().from(user_blocks);
}

beforeAll(async () => {
  const booted = await bootPglite();
  db = booted.db;
  holder.db = booted.db;
  actions = await import('@/lib/data/profile.actions');
  ({ updateTag } = (await import('next/cache')) as unknown as {
    updateTag: ReturnType<typeof vi.fn>;
  });
});

beforeEach(async () => {
  // db is shared per-file, so restore spies first or they leak between tests.
  vi.restoreAllMocks();
  await resetDb(db);
  await seedUsers(db, [VIEWER, TARGET, THIRD]);
  await seedAccentCatalog(db);
  updateTag.mockClear();
  asViewer();
});

describe('followUser', () => {
  it('AuthedNewTarget_InsertsFollowRow', async () => {
    const res = await actions.followUser(TARGET_PROFILE);
    expect(res.success).toBe(true);
    const rows = await followRows();
    expect(rows).toEqual([
      expect.objectContaining({
        follower_id: VIEWER.id,
        followee_profile_id: TARGET_PROFILE,
      }),
    ]);
  });

  it('AlreadyFollowing_NoDuplicateRowNoError', async () => {
    await actions.followUser(TARGET_PROFILE);
    const res = await actions.followUser(TARGET_PROFILE);
    expect(res.success).toBe(true);
    expect(await followRows()).toHaveLength(1);
  });

  it('SelfFollow_ReturnsInvalid-NoRow', async () => {
    const res = await actions.followUser(VIEWER_PROFILE);
    expect(res.error).toBe('Invalid');
    expect(await followRows()).toHaveLength(0);
  });

  it('BlockedByTarget_ReturnsBlocked-NoRow', async () => {
    await seedBlock(db, TARGET.id, VIEWER.id);
    const res = await actions.followUser(TARGET_PROFILE);
    expect(res.error).toBe('Blocked');
    expect(await followRows()).toHaveLength(0);
  });

  it('BlockedViewer_ReturnsBlocked-NoRow', async () => {
    await seedBlock(db, VIEWER.id, TARGET.id);
    const res = await actions.followUser(TARGET_PROFILE);
    expect(res.error).toBe('Blocked');
    expect(await followRows()).toHaveLength(0);
  });

  it('NoSession_ReturnsUnauthorized-NoRow', async () => {
    noSession();
    const res = await actions.followUser(TARGET_PROFILE);
    expect(res.error).toBe('Unauthorized');
    expect(await followRows()).toHaveLength(0);
  });

  it('Success_CallsUpdateTagUserFollowsOnce', async () => {
    await actions.followUser(TARGET_PROFILE);
    expect(updateTag.mock.calls).toEqual([['user_follows']]);
  });

  it('EarlyReturns_DoNotCallUpdateTag', async () => {
    noSession();
    await actions.followUser(TARGET_PROFILE);
    asViewer();
    await actions.followUser(VIEWER_PROFILE);
    await seedBlock(db, VIEWER.id, TARGET.id);
    await actions.followUser(TARGET_PROFILE);
    expect(updateTag).not.toHaveBeenCalled();
  });

  it('InsertThrows_ReturnsFailed-NoUpdateTag', async () => {
    const res = await actions.followUser('ghost-profile-id');
    expect(res.error).toBe('Failed');
    expect(await followRows()).toHaveLength(0);
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe('unfollowUser', () => {
  it('Following_DeletesRow', async () => {
    await seedFollow(db, VIEWER.id, TARGET.id);
    const res = await actions.unfollowUser(TARGET_PROFILE);
    expect(res.success).toBe(true);
    expect(await followRows()).toHaveLength(0);
  });

  it('NotFollowing_NoOpSuccess', async () => {
    const res = await actions.unfollowUser(TARGET_PROFILE);
    expect(res.success).toBe(true);
    expect(await followRows()).toHaveLength(0);
  });

  it('NoSession_ReturnsUnauthorized', async () => {
    noSession();
    const res = await actions.unfollowUser(TARGET_PROFILE);
    expect(res.error).toBe('Unauthorized');
  });

  it('Success_CallsUpdateTagUserFollowsOnce', async () => {
    await actions.unfollowUser(TARGET_PROFILE);
    expect(updateTag.mock.calls).toEqual([['user_follows']]);
  });

  it('EarlyReturns_DoNotCallUpdateTag', async () => {
    noSession();
    await actions.unfollowUser(TARGET_PROFILE);
    expect(updateTag).not.toHaveBeenCalled();
  });

  it('DeleteThrows_ReturnsFailed-NoUpdateTag', async () => {
    vi.spyOn(db, 'delete').mockImplementation(() => {
      throw new Error('boom');
    });
    const res = await actions.unfollowUser(TARGET_PROFILE);
    expect(res.error).toBe('Failed');
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe('blockUser', () => {
  it('Authed_InsertsBlockRow-DeletesBothFollowDirections', async () => {
    await seedFollow(db, VIEWER.id, TARGET.id);
    await seedFollow(db, TARGET.id, VIEWER.id);
    const res = await actions.blockUser(TARGET_PROFILE);
    expect(res.success).toBe(true);
    expect(await blockRows()).toEqual([
      expect.objectContaining({
        blocker_profile_id: VIEWER_PROFILE,
        blocked_profile_id: TARGET_PROFILE,
      }),
    ]);
    expect(await followRows()).toHaveLength(0);
  });

  it('BlockFirstOrdering_RacingFollowStillGated', async () => {
    await actions.blockUser(TARGET_PROFILE);
    asTarget();
    const res = await actions.followUser(VIEWER_PROFILE);
    expect(res.error).toBe('Blocked');
    expect(await followRows()).toHaveLength(0);
  });

  it('BlockFirstOrdering_BlockInsertPrecedesMembershipLookup', async () => {
    const order: string[] = [];
    const insert = db.insert.bind(db);
    const select = db.select.bind(db);
    vi.spyOn(db, 'insert').mockImplementation(((table: never) => {
      order.push('block-insert');
      return insert(table);
    }) as never);
    vi.spyOn(db, 'select').mockImplementation(((fields: never) => {
      order.push('select');
      return select(fields);
    }) as never);
    await actions.blockUser(TARGET_PROFILE);
    // The two leading selects are authedIdentity resolving the viewer, which
    // runs before the action body; the blocked profile's membership lookup
    // comes after the block row.
    expect(order).toEqual(['select', 'select', 'block-insert', 'select']);
  });

  it('Reblock_CleansLeftoverFollowRowIdempotently', async () => {
    await actions.blockUser(TARGET_PROFILE);
    await seedFollow(db, TARGET.id, VIEWER.id);
    const res = await actions.blockUser(TARGET_PROFILE);
    expect(res.success).toBe(true);
    expect(await followRows()).toHaveLength(0);
    expect(await blockRows()).toHaveLength(1);
  });

  it('ManagedProfileTarget_InsertsBlockRow-SkipsAccountlessBackEdgeDelete', async () => {
    // A managed profile has no account, so there is no follower id to
    // resolve for the back edge; the viewer's own follow edge still goes.
    await seedManagedProfile(db, { id: 'managed-1' });
    await seedFollow(db, VIEWER.id, TARGET.id);
    const res = await actions.blockUser('managed-1');
    expect(res.success).toBe(true);
    expect(await blockRows()).toEqual([
      expect.objectContaining({
        blocker_profile_id: VIEWER_PROFILE,
        blocked_profile_id: 'managed-1',
      }),
    ]);
    expect(await followRows()).toEqual([
      expect.objectContaining({
        follower_id: VIEWER.id,
        followee_profile_id: TARGET_PROFILE,
      }),
    ]);
  });

  it('SelfBlock_ReturnsInvalid-NoRows', async () => {
    const res = await actions.blockUser(VIEWER_PROFILE);
    expect(res.error).toBe('Invalid');
    expect(await blockRows()).toHaveLength(0);
  });

  it('NoSession_ReturnsUnauthorized', async () => {
    noSession();
    const res = await actions.blockUser(TARGET_PROFILE);
    expect(res.error).toBe('Unauthorized');
  });

  it('Success_CallsUpdateTagUserFollowsAndUserBlocksOnceEach', async () => {
    await actions.blockUser(TARGET_PROFILE);
    expect(updateTag.mock.calls).toEqual([['user_follows'], ['user_blocks']]);
  });

  it('StatementThrows_NeitherUpdateTagFires', async () => {
    const res = await actions.blockUser('ghost-profile-id');
    expect(res.error).toBe('Failed');
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe('unblockUser', () => {
  it('Blocked_DeletesBlockRow', async () => {
    await seedBlock(db, VIEWER.id, TARGET.id);
    const res = await actions.unblockUser(TARGET_PROFILE);
    expect(res.success).toBe(true);
    expect(await blockRows()).toHaveLength(0);
  });

  it('NotBlocked_NoOpSuccess', async () => {
    const res = await actions.unblockUser(TARGET_PROFILE);
    expect(res.success).toBe(true);
    expect(await blockRows()).toHaveLength(0);
  });

  it('NoSession_ReturnsUnauthorized', async () => {
    noSession();
    const res = await actions.unblockUser(TARGET_PROFILE);
    expect(res.error).toBe('Unauthorized');
  });

  it('Success_CallsUpdateTagUserBlocksOnly', async () => {
    await actions.unblockUser(TARGET_PROFILE);
    expect(updateTag.mock.calls).toEqual([['user_blocks']]);
  });

  it('DeleteThrows_ReturnsFailed-NoUpdateTag', async () => {
    vi.spyOn(db, 'delete').mockImplementation(() => {
      throw new Error('boom');
    });
    const res = await actions.unblockUser(TARGET_PROFILE);
    expect(res.error).toBe('Failed');
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe('NoInteractiveTransactions', () => {
  it('NoCodePath_UsesTransactionApi', async () => {
    const txSpy = vi.fn();
    (db as unknown as { transaction: unknown }).transaction = txSpy;
    await seedFollow(db, TARGET.id, VIEWER.id);
    await actions.followUser(TARGET_PROFILE);
    await actions.unfollowUser(TARGET_PROFILE);
    await actions.blockUser(TARGET_PROFILE);
    await actions.unblockUser(TARGET_PROFILE);
    expect(txSpy).not.toHaveBeenCalled();
  });
});

const ACCENT = ACCENT_NAMES[0];
const validPayload = {
  name: 'Kiddo',
  tagline: 'Loves dinosaurs',
  accent: ACCENT,
};

async function profileRows() {
  return db.select().from(profiles);
}
async function membershipRows() {
  return db.select().from(profile_members);
}
async function accentRows() {
  return db.select().from(profile_preferences);
}

describe('createProfile', () => {
  it('AuthedValidPayload_InsertsProfile-OwnerMembership-NoSelfMembership', async () => {
    const res = await actions.createProfile(validPayload);
    expect(res.success).toBe(true);

    const created = (await profileRows()).filter((p) => p.id === res.id);
    expect(created).toEqual([
      expect.objectContaining({ name: 'Kiddo', tagline: 'Loves dinosaurs' }),
    ]);

    const members = (await membershipRows()).filter(
      (m) => m.profile_id === res.id
    );
    expect(members).toEqual([
      expect.objectContaining({ user_id: VIEWER.id, role: 'owner' }),
    ]);
    expect(members.some((m) => m.role === 'self')).toBe(false);
  });

  it('AuthedValidPayload_StoresAccentValue-BustsProfilesAndMembersTags', async () => {
    const res = await actions.createProfile(validPayload);
    const stored = (await accentRows()).filter((r) => r.profile_id === res.id);
    expect(stored).toEqual([
      expect.objectContaining({
        preference_id: 'accent',
        value: ACCENT,
      }),
    ]);
    // The whole set, not a containment check: `getProfileCardsForUser` holds
    // every one of these tables, so a tag this action stops firing leaves that
    // read serving a profile it no longer matches.
    expect(updateTag.mock.calls).toEqual([
      ['profile_preferences'],
      ['profiles'],
      ['profile_members'],
    ]);
  });

  it('SameNameTwice_CreatesTwoDistinctProfilesEachWithOwnerMembership', async () => {
    const first = await actions.createProfile(validPayload);
    const second = await actions.createProfile(validPayload);
    expect(first.id).not.toBe(second.id);

    const named = (await profileRows()).filter((p) => p.name === 'Kiddo');
    expect(named).toHaveLength(2);
    for (const id of [first.id, second.id]) {
      const members = (await membershipRows()).filter(
        (m) => m.profile_id === id
      );
      expect(members).toEqual([
        expect.objectContaining({ user_id: VIEWER.id, role: 'owner' }),
      ]);
    }
  });

  it('MembershipWriteRejected_LeavesNoProfileRow', async () => {
    // Force the membership branch of the CTE to fail. One statement is one
    // implicit transaction, so the profile INSERT must roll back with it.
    await db.execute(
      sql.raw(
        `ALTER TABLE "profile_members" ADD CONSTRAINT tmp_no_owner CHECK (role <> 'owner')`
      )
    );
    try {
      const before = (await profileRows()).length;
      const res = await actions.createProfile(validPayload);
      expect(res.success).toBe(false);
      expect(await profileRows()).toHaveLength(before);
      expect(updateTag).not.toHaveBeenCalled();
    } finally {
      await db.execute(
        sql.raw(
          `ALTER TABLE "profile_members" DROP CONSTRAINT tmp_no_owner`
        )
      );
    }
  });

  it('BlankTagline_PersistsNullNotEmptyString', async () => {
    const res = await actions.createProfile({
      ...validPayload,
      tagline: '   ',
    });
    const [created] = (await profileRows()).filter((p) => p.id === res.id);
    expect(created.tagline).toBeNull();
  });

  it('WhitespaceOnlyName_ReturnsNameFieldError-NoProfileRow', async () => {
    const before = (await profileRows()).length;
    const res = await actions.createProfile({ ...validPayload, name: '   ' });
    expect(res.errors?.name).toBeDefined();
    expect(await profileRows()).toHaveLength(before);
  });

  it('NameOver60Characters_ReturnsNameFieldError-NoProfileRow', async () => {
    const before = (await profileRows()).length;
    const res = await actions.createProfile({
      ...validPayload,
      name: 'x'.repeat(61),
    });
    expect(res.errors?.name).toBeDefined();
    expect(await profileRows()).toHaveLength(before);
  });

  it('TaglineOver40Characters_ReturnsTaglineFieldError-NoProfileRow', async () => {
    const before = (await profileRows()).length;
    const res = await actions.createProfile({
      ...validPayload,
      tagline: 'x'.repeat(41),
    });
    expect(res.errors?.tagline).toBeDefined();
    expect(await profileRows()).toHaveLength(before);
  });

  it('AccentNotAPreset_ReturnsAccentFieldError-NoProfileRow', async () => {
    const before = (await profileRows()).length;
    const res = await actions.createProfile({
      ...validPayload,
      accent: 'chartreuse',
    });
    expect(res.errors?.accent).toBeDefined();
    expect(await profileRows()).toHaveLength(before);
  });

  it('NoSession_ReturnsUnauthorized-NoProfileRow', async () => {
    noSession();
    const before = (await profileRows()).length;
    const res = await actions.createProfile(validPayload);
    expect(res.error).toBe('Unauthorized');
    expect(await profileRows()).toHaveLength(before);
  });

  it('RejectedPaths_DoNotCallUpdateTag', async () => {
    // A discarded cache entry is a valid one thrown away, so a path that lands
    // no row must fire nothing — otherwise an edit that moved `updateTag` above
    // the write, or into the catch, would pass unnoticed.
    noSession();
    await actions.createProfile(validPayload);
    expect(updateTag).not.toHaveBeenCalled();

    asViewer();
    await actions.createProfile({ ...validPayload, name: '  ' });
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe('updateProfileSettings', () => {
  const MANAGED = 'managed-profile';
  const NEXT_ACCENT = ACCENT_NAMES[1];
  const edit = {
    name: 'Renamed',
    tagline: 'New tagline',
    accent: NEXT_ACCENT,
  };

  beforeEach(async () => {
    await seedManagedProfile(db, { id: MANAGED, name: 'Kiddo' });
  });

  it('Owner_PersistsNameTaglineAndAccent', async () => {
    await db.insert(profile_members).values({
      user_id: VIEWER.id,
      profile_id: MANAGED,
      role: 'owner',
    });
    const res = await actions.updateProfileSettings(MANAGED, edit);
    expect(res.success).toBe(true);

    const [row] = await db.select().from(profiles).where(eq(profiles.id, MANAGED));
    expect(row).toEqual(
      expect.objectContaining({ name: 'Renamed', tagline: 'New tagline' })
    );
    expect(
      (await accentRows()).filter((r) => r.profile_id === MANAGED)
    ).toEqual([
      expect.objectContaining({ value: String(NEXT_ACCENT) }),
    ]);
    expect(updateTag.mock.calls).toEqual([
      ['profile_preferences'],
      ['profiles'],
    ]);
  });

  it('Manager_ReturnsUnauthorized-NoColumnOrPreferenceWritten', async () => {
    await db.insert(profile_members).values({
      user_id: VIEWER.id,
      profile_id: MANAGED,
      role: 'manager',
    });
    const res = await actions.updateProfileSettings(MANAGED, edit);
    expect(res.error).toBe('Unauthorized');

    const [row] = await db.select().from(profiles).where(eq(profiles.id, MANAGED));
    expect(row.name).toBe('Kiddo');
    expect(row.tagline).toBeNull();
    expect(await accentRows()).toHaveLength(0);
  });

  it('NonMember_ReturnsUnauthorized-NoColumnOrPreferenceWritten', async () => {
    const res = await actions.updateProfileSettings(MANAGED, edit);
    expect(res.error).toBe('Unauthorized');

    const [row] = await db.select().from(profiles).where(eq(profiles.id, MANAGED));
    expect(row.name).toBe('Kiddo');
    expect(await accentRows()).toHaveLength(0);
  });

  it('RejectedPaths_DoNotCallUpdateTag', async () => {
    await actions.updateProfileSettings(MANAGED, edit);
    expect(updateTag).not.toHaveBeenCalled();

    await db.insert(profile_members).values({
      user_id: VIEWER.id,
      profile_id: MANAGED,
      role: 'owner',
    });
    await actions.updateProfileSettings(MANAGED, { ...edit, name: '  ' });
    expect(updateTag).not.toHaveBeenCalled();
  });

  it('SelfProfileRename_WritesProfileNameOnly-LeavesAccountRecord', async () => {
    const res = await actions.updateProfileSettings(VIEWER_PROFILE, {
      ...edit,
      name: 'New Display Name',
    });
    expect(res.success).toBe(true);

    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, VIEWER_PROFILE));
    expect(profile.name).toBe('New Display Name');

    const [account] = await db.select().from(users).where(eq(users.id, VIEWER.id));
    expect(account.name).toBe(VIEWER.id);
  });
});

describe('AccentWriteFailure', () => {
  const MANAGED = 'accent-fail-profile';

  // Dropping the catalog row breaks `profile_preferences`' foreign key, which
  // is the only way to fail the accent write without touching the profile and
  // membership rows that go in the CTE.
  async function withNoAccentCatalog(run: () => Promise<void>) {
    await db.delete(preferences);
    try {
      await run();
    } finally {
      await seedAccentCatalog(db);
    }
  }

  it('CreateWithFailingAccentWrite_StillCreatesProfileAndMembership', async () => {
    await withNoAccentCatalog(async () => {
      const res = await actions.createProfile(validPayload);
      expect(res.success).toBe(true);

      expect((await profileRows()).filter((p) => p.id === res.id)).toHaveLength(
        1
      );
      expect(
        (await membershipRows()).filter((m) => m.profile_id === res.id)
      ).toEqual([expect.objectContaining({ role: 'owner' })]);
      // The profile carries no accent and renders the fallback.
      expect(await accentRows()).toHaveLength(0);
    });
  });

  it('UpdateWithFailingAccentWrite_ReportsFailureThoughNameAndTaglinePersisted', async () => {
    await seedManagedProfile(db, { id: MANAGED, name: 'Kiddo' });
    await db.insert(profile_members).values({
      user_id: VIEWER.id,
      profile_id: MANAGED,
      role: 'owner',
    });

    await withNoAccentCatalog(async () => {
      const res = await actions.updateProfileSettings(MANAGED, {
        name: 'Renamed',
        tagline: 'New tagline',
        accent: ACCENT_NAMES[1],
      });
      expect(res.success).toBe(false);
      expect(res.message).toContain('accent');

      const [row] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, MANAGED));
      expect(row.name).toBe('Renamed');
      expect(await accentRows()).toHaveLength(0);
    });
  });
});

describe('ProfileWriteErrors', () => {
  const MANAGED = 'error-profile';

  beforeEach(async () => {
    await seedManagedProfile(db, { id: MANAGED, name: 'Kiddo' });
    await db.insert(profile_members).values({
      user_id: VIEWER.id,
      profile_id: MANAGED,
      role: 'owner',
    });
  });

  it('UpdateWithWhitespaceOnlyName_ReturnsNameFieldError-LeavesColumnsUnchanged', async () => {
    const res = await actions.updateProfileSettings(MANAGED, {
      name: '   ',
      tagline: 'New tagline',
      accent: ACCENT_NAMES[0],
    });
    expect(res.errors?.name).toBeDefined();

    const [row] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, MANAGED));
    expect(row.name).toBe('Kiddo');
    expect(await accentRows()).toHaveLength(0);
  });

  it('UpdateRejectedByDatabase_ReturnsFailedToUpdateProfile', async () => {
    await db.execute(
      sql.raw(
        `ALTER TABLE "profiles" ADD CONSTRAINT tmp_no_rename CHECK (name <> 'Renamed')`
      )
    );
    try {
      const res = await actions.updateProfileSettings(MANAGED, {
        name: 'Renamed',
        tagline: null,
        accent: ACCENT_NAMES[0],
      });
      expect(res.error).toBe('Failed to update profile');
      expect(updateTag).not.toHaveBeenCalled();
    } finally {
      await db.execute(
        sql.raw(`ALTER TABLE "profiles" DROP CONSTRAINT tmp_no_rename`)
      );
    }
  });

  it('CreateWithOmittedTagline_PersistsNull', async () => {
    const res = await actions.createProfile({
      name: 'No Tagline',
      tagline: undefined as unknown as null,
      accent: ACCENT_NAMES[0],
    });
    expect(res.success).toBe(true);
    const [created] = (await profileRows()).filter((p) => p.id === res.id);
    expect(created.tagline).toBeNull();
  });
});
