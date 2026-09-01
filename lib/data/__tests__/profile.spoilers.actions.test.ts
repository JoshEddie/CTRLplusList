/**
 * Pins `spoiler-visibility` — "A baseline SHALL be writable by the member it
 * belongs to and by an owner of the profile", and the seed's own scope: writing
 * the profile-level default moves nobody already holding a membership. Also
 * pins the revocation clear: a revoked member's account-keyed tier row is
 * deleted, since it does not cascade with the membership row.
 *
 * The disabled control in Settings is never the enforcement; these actions are.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SPOILER_TIER_PREFERENCE_ID,
  profile_preferences,
} from '@/db/schema';
import { bootPglite, resetDb } from '@/test/helpers/db';
import { mockNextCache } from '@/test/helpers/next-cache';
import {
  seedManagedProfile,
  seedMembership,
  seedSpoilerCatalog,
  seedSpoilerDefault,
  seedUsers,
} from '@/test/helpers/seedFollowGraph';
import { and, eq, isNull } from 'drizzle-orm';

mockNextCache();

type TestDb = Awaited<ReturnType<typeof bootPglite>>['db'];

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock('@/db', () => ({
  get db() {
    return holder.db;
  },
}));
vi.mock('@/lib/data/user.session', () => ({
  UNAUTHORIZED_RESPONSE: {
    success: false,
    message: 'Unauthorized',
    error: 'Unauthorized',
  },
  authedUserId: vi.fn(),
}));

const OWNER = 'owner-account';
const MANAGER = 'manager-account';
const STRANGER = 'stranger';
const KIDDO = 'kiddo';

let db: TestDb;
let actions: typeof import('@/lib/data/profile.spoilers.actions');
let writes: typeof import('@/lib/data/profilePreference.write');
let session: typeof import('@/lib/data/user.session');

beforeAll(async () => {
  const booted = await bootPglite();
  db = booted.db;
  holder.db = booted.db;
  actions = await import('@/lib/data/profile.spoilers.actions');
  writes = await import('@/lib/data/profilePreference.write');
  session = await import('@/lib/data/user.session');
});

beforeEach(async () => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  await resetDb(db);
  // The catalog rows the migration inserts; the value rows FK them.
  await seedSpoilerCatalog(db);
  await seedUsers(db, [{ id: OWNER }, { id: MANAGER }, { id: STRANGER }]);
  await seedManagedProfile(db, { id: KIDDO, name: 'Kiddo' });
  await seedMembership(db, { user_id: OWNER, profile_id: KIDDO, role: 'owner' });
  await seedMembership(db, {
    user_id: MANAGER,
    profile_id: KIDDO,
    role: 'manager',
  });
});

const actingAs = (userId: string | null = null) =>
  vi.mocked(session.authedUserId).mockResolvedValue(userId);

// The persisted account-keyed tier row, read straight from the table.
async function memberTierRow(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ value: profile_preferences.value })
    .from(profile_preferences)
    .where(
      and(
        eq(profile_preferences.profile_id, KIDDO),
        eq(profile_preferences.user_id, userId),
        eq(profile_preferences.preference_id, SPOILER_TIER_PREFERENCE_ID)
      )
    );
  return row?.value ?? null;
}

async function defaultRow(): Promise<string | null> {
  const [row] = await db
    .select({ value: profile_preferences.value })
    .from(profile_preferences)
    .where(
      and(
        eq(profile_preferences.profile_id, KIDDO),
        isNull(profile_preferences.user_id),
        eq(profile_preferences.preference_id, SPOILER_TIER_PREFERENCE_ID)
      )
    );
  return row?.value ?? null;
}

describe('setMemberTier', () => {
  describe('OwnRow', () => {
    it('ManagerWritingTheirOwn_SucceedsWhateverTheirRole', async () => {
      actingAs(MANAGER);

      expect(
        (await actions.setMemberTier(KIDDO, MANAGER, 'claims')).success
      ).toBe(true);
      expect(await memberTierRow(MANAGER)).toBe('claims');
    });
  });

  describe('AnotherMembersRow', () => {
    it('OwnerWritingAnothers_Succeeds', async () => {
      actingAs(OWNER);

      expect(
        (await actions.setMemberTier(KIDDO, MANAGER, 'claims')).success
      ).toBe(true);
      expect(await memberTierRow(MANAGER)).toBe('claims');
    });

    it('ManagerWritingAnothers_RefusesAndWritesNothing', async () => {
      actingAs(MANAGER);

      expect(await actions.setMemberTier(KIDDO, OWNER, 'claims')).toEqual({
        success: false,
        message: 'Forbidden',
        error: 'Forbidden',
      });
      expect(await memberTierRow(OWNER)).toBeNull();
    });

    it('SignedOut_RefusesAsUnauthorized', async () => {
      actingAs(null);

      expect(await actions.setMemberTier(KIDDO, MANAGER, 'claims')).toEqual({
        success: false,
        message: 'Unauthorized',
        error: 'Unauthorized',
      });
      expect(await memberTierRow(MANAGER)).toBeNull();
    });
  });

  describe('Conflict', () => {
    it('OwnerThenMemberDisagree_LaterWriteStands', async () => {
      actingAs(OWNER);
      await actions.setMemberTier(KIDDO, MANAGER, 'claims');
      actingAs(MANAGER);
      await actions.setMemberTier(KIDDO, MANAGER, 'claims');

      expect(await memberTierRow(MANAGER)).toBe('claims');
    });
  });

  describe('MissingMembership', () => {
    it('NonMemberTarget_ReportsNoMembershipAndWritesNothing', async () => {
      actingAs(OWNER);

      expect(await actions.setMemberTier(KIDDO, STRANGER, 'claims')).toEqual({
        success: false,
        message: 'That membership can no longer be changed',
        error: 'No membership',
      });
      expect(await memberTierRow(STRANGER)).toBeNull();
    });
  });
});

describe('setProfileSpoilerDefault', () => {
  it('Owner_WritesTheSeedAndMovesNoMembership', async () => {
    actingAs(OWNER);

    expect(
      (await actions.setProfileSpoilerDefault(KIDDO, 'claims')).success
    ).toBe(true);
    expect(await defaultRow()).toBe('claims');
    expect(await memberTierRow(OWNER)).toBeNull();
    expect(await memberTierRow(MANAGER)).toBeNull();
  });

  it('Rewritten_ReplacesTheStoredSeedRatherThanAccumulating', async () => {
    actingAs(OWNER);
    await actions.setProfileSpoilerDefault(KIDDO, 'claims');
    await actions.setProfileSpoilerDefault(KIDDO, 'claims');

    expect(await defaultRow()).toBe('claims');
  });

  it('Manager_RefusesAndWritesNothing', async () => {
    actingAs(MANAGER);

    expect(await actions.setProfileSpoilerDefault(KIDDO, 'claims')).toEqual({
      success: false,
      message: 'Forbidden',
      error: 'Forbidden',
    });
    expect(await defaultRow()).toBeNull();
  });

  it('SignedOut_RefusesAsUnauthorized', async () => {
    actingAs(null);

    expect(await actions.setProfileSpoilerDefault(KIDDO, 'claims')).toEqual({
      success: false,
      message: 'Unauthorized',
      error: 'Unauthorized',
    });
  });
});

// The account-keyed tier row does not cascade with the membership row, so
// revocation clears it explicitly (`profiles-data-model`).
describe('deleteMemberPreferences', () => {
  it('MemberWithATierRow_ClearsThatAccountRowButLeavesTheDefault', async () => {
    await seedSpoilerDefault(db, KIDDO, 'claims');
    await writes.writeMemberTier(KIDDO, MANAGER, 'claims');
    expect(await memberTierRow(MANAGER)).toBe('claims');

    await writes.deleteMemberPreferences(KIDDO, MANAGER);

    expect(await memberTierRow(MANAGER)).toBeNull();
    // The null-account, profile-wide seed is untouched.
    expect(await defaultRow()).toBe('claims');
  });
});

describe('WriteFailures', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('MemberTierInsertThrows_ReportsFailureRatherThanSuccess', async () => {
    actingAs(OWNER);
    vi.spyOn(db, 'insert').mockImplementation(() => {
      throw new Error('boom');
    });

    expect(await actions.setMemberTier(KIDDO, MANAGER, 'claims')).toEqual({
      success: false,
      message: 'An error occurred while updating claim visibility',
      error: 'Failed to update claim visibility',
    });
  });

  // `writeSpoilerDefault` reports rather than raises, so the action turns the
  // report into a refusal instead of claiming a seed it did not store.
  it('DefaultInsertThrows_ReportsFailureRatherThanSuccess', async () => {
    actingAs(OWNER);
    vi.spyOn(db, 'insert').mockImplementation(() => {
      throw new Error('boom');
    });

    expect(await actions.setProfileSpoilerDefault(KIDDO, 'claims')).toEqual({
      success: false,
      message: 'An error occurred while updating claim visibility',
      error: 'Failed to update claim visibility',
    });
  });

  it('MembershipLookupThrows_ReportsFailureRatherThanSuccess', async () => {
    actingAs(MANAGER);
    vi.spyOn(db, 'select').mockImplementation(() => {
      throw new Error('boom');
    });

    expect(await actions.setMemberTier(KIDDO, MANAGER, 'claims')).toEqual({
      success: false,
      message: 'An error occurred while updating claim visibility',
      error: 'Failed to update claim visibility',
    });
  });

  it('GateThrows_ReportsFailureRatherThanSuccess', async () => {
    vi.mocked(session.authedUserId).mockRejectedValue(new Error('boom'));

    expect(
      (await actions.setProfileSpoilerDefault(KIDDO, 'claims')).success
    ).toBe(false);
  });
});
