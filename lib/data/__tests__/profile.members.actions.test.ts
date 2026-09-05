/**
 * Pins `profile-permissions` — "A profile SHALL admit a member only by
 * single-use invite link", "A member's role SHALL be changed only by another
 * owner", "A member SHALL be removable by themselves or by an owner", and
 * "A profile SHALL keep at least one owner". These four actions are the whole
 * of membership administration, and each authorizes against the profile the
 * request *names* rather than the one it acts as, so none of them passes the
 * shared gate that the gate suite covers.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SPOILER_TIER_PREFERENCE_ID,
  profile_invites,
  profile_members,
  profile_preferences,
} from '@/db/schema';
import { bootPglite, resetDb } from '@/test/helpers/db';
import { mockNextCache } from '@/test/helpers/next-cache';
import { makeIdentity, makeProfile } from '@/test/helpers/profile';
import {
  seedBlock,
  seedManagedProfile,
  seedMembership,
  seedSpoilerCatalog,
  seedUsers,
  selfProfileOf,
} from '@/test/helpers/seedFollowGraph';
import { and, eq } from 'drizzle-orm';
import { updateTag } from 'next/cache';
import { cacheTags } from '@/lib/cacheTags';

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
  authedIdentity: vi.fn(),
}));

const OWNER = 'owner-account';
const OWNER2 = 'second-owner';
const MANAGER = 'manager-account';
const STRANGER = 'stranger';
const KIDDO = 'kiddo';

let db: TestDb;
let actions: typeof import('@/lib/data/profile.members.actions');
let reads: typeof import('@/lib/data/profile.members');
let writes: typeof import('@/lib/data/profilePreference.write');
let session: typeof import('@/lib/data/user.session');

beforeAll(async () => {
  const booted = await bootPglite();
  db = booted.db;
  holder.db = booted.db;
  actions = await import('@/lib/data/profile.members.actions');
  reads = await import('@/lib/data/profile.members');
  writes = await import('@/lib/data/profilePreference.write');
  session = await import('@/lib/data/user.session');
});

beforeEach(async () => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  await resetDb(db);
  // Redemption seeds an accepted tier via `writeMemberTier`, whose value row
  // FKs the catalog row the migration inserts.
  await seedSpoilerCatalog(db);
  await seedUsers(db, [
    { id: OWNER },
    { id: OWNER2 },
    { id: MANAGER },
    { id: STRANGER },
  ]);
  await seedManagedProfile(db, { id: KIDDO, name: 'Kiddo' });
  await seedMembership(db, {
    user_id: OWNER,
    profile_id: KIDDO,
    role: 'owner',
  });
  await seedMembership(db, {
    user_id: MANAGER,
    profile_id: KIDDO,
    role: 'manager',
  });
});

const actingAs = (userId: string) => {
  vi.mocked(session.authedUserId).mockResolvedValue(userId);
  vi.mocked(session.authedIdentity).mockResolvedValue(
    makeIdentity(userId, makeProfile(selfProfileOf(userId)))
  );
};

async function roleOf(
  userId: string,
  profileId: string = KIDDO
): Promise<string | null> {
  const [row] = await db
    .select({ role: profile_members.role })
    .from(profile_members)
    .where(
      and(
        eq(profile_members.user_id, userId),
        eq(profile_members.profile_id, profileId)
      )
    );
  return row?.role ?? null;
}

async function tierRowOf(
  userId: string,
  profileId: string = KIDDO
): Promise<string | null> {
  const [row] = await db
    .select({ value: profile_preferences.value })
    .from(profile_preferences)
    .where(
      and(
        eq(profile_preferences.profile_id, profileId),
        eq(profile_preferences.user_id, userId),
        eq(profile_preferences.preference_id, SPOILER_TIER_PREFERENCE_ID)
      )
    );
  return row?.value ?? null;
}

async function mintFor(
  role: 'owner' | 'manager' = 'manager',
  overrides: { expires_at?: Date; redeemed_at?: Date } = {}
): Promise<string> {
  const [row] = await db
    .insert(profile_invites)
    .values({
      profile_id: KIDDO,
      created_by_user_id: OWNER,
      role,
      expires_at:
        overrides.expires_at ?? new Date(Date.now() + 24 * 60 * 60 * 1000),
      redeemed_at: overrides.redeemed_at ?? null,
    })
    .returning({ token: profile_invites.token });
  return row.token;
}

async function redeemedAt(token: string): Promise<Date | null> {
  const [row] = await db
    .select({ at: profile_invites.redeemed_at })
    .from(profile_invites)
    .where(eq(profile_invites.token, token));
  return row?.at ?? null;
}

describe('setMemberRole', () => {
  it('OwnerPromotesAManager_WritesOwner', async () => {
    actingAs(OWNER);

    const result = await actions.setMemberRole(KIDDO, MANAGER, 'owner');

    expect(result.success).toBe(true);
    expect(await roleOf(MANAGER)).toBe('owner');
    expect(updateTag).toHaveBeenCalledWith(cacheTags.profilesOfUser(MANAGER));
  });

  it('OwnerPromotesAManager_FiresTheNarrowTagsAndNotTheCoarseTableTag', async () => {
    actingAs(OWNER);

    await actions.setMemberRole(KIDDO, MANAGER, 'owner');

    expect(updateTag).toHaveBeenCalledWith(cacheTags.membersOfProfile(KIDDO));
    // The coarse table tag would invalidate every account's memberships for
    // one profile's change, so its absence is half of what the rule states.
    expect(updateTag).not.toHaveBeenCalledWith(cacheTags.profileMembers);
  });

  it('OwnerDemotesAnotherOwner_WritesManager', async () => {
    await seedMembership(db, {
      user_id: OWNER2,
      profile_id: KIDDO,
      role: 'owner',
    });
    actingAs(OWNER);

    expect(
      (await actions.setMemberRole(KIDDO, OWNER2, 'manager')).success
    ).toBe(true);
    expect(await roleOf(OWNER2)).toBe('manager');
  });

  it('OwnerTargetingTheirOwnRow_RejectsForbiddenAndLeavesTheRow', async () => {
    await seedMembership(db, {
      user_id: OWNER2,
      profile_id: KIDDO,
      role: 'owner',
    });
    actingAs(OWNER);

    expect(await actions.setMemberRole(KIDDO, OWNER, 'manager')).toEqual({
      success: false,
      message: 'Forbidden',
      error: 'Forbidden',
    });
    expect(await roleOf(OWNER)).toBe('owner');
  });

  it('ManagerActor_RejectsForbiddenAndLeavesTheRow', async () => {
    actingAs(MANAGER);

    expect(await actions.setMemberRole(KIDDO, OWNER, 'manager')).toEqual({
      success: false,
      message: 'Forbidden',
      error: 'Forbidden',
    });
    expect(await roleOf(OWNER)).toBe('owner');
  });

  describe('SelfRowAndNoRow', () => {
    it('TargetHoldsTheSelfRow_RefusesAndLeavesItSelf', async () => {
      // The reachable shape: a self-profile someone else co-owns, so a `self`
      // row and an `owner` row sit on one profile. The statement, not the
      // caller that happens to produce the target, keeps `self` out of reach.
      const coOwned = selfProfileOf(STRANGER);
      await seedMembership(db, {
        user_id: OWNER,
        profile_id: coOwned,
        role: 'owner',
      });
      actingAs(OWNER);

      expect(
        await actions.setMemberRole(coOwned, STRANGER, 'manager')
      ).toMatchObject({ success: false });
      expect(await roleOf(STRANGER, coOwned)).toBe('self');
    });

    it('TargetHoldsNoMembership_RefusesRatherThanReportingSuccess', async () => {
      actingAs(OWNER);

      expect(
        await actions.setMemberRole(KIDDO, STRANGER, 'owner')
      ).toMatchObject({ success: false });
      expect(await roleOf(STRANGER)).toBeNull();
    });
  });

  describe('UngrantableRole', () => {
    // `MemberRole` is erased at runtime, so the endpoint is what stands between
    // a caller-supplied string and the column.
    it('RoleSelf_RefusesForbiddenAndLeavesTheStoredRole', async () => {
      actingAs(OWNER);

      expect(
        await actions.setMemberRole(KIDDO, MANAGER, 'self' as 'manager')
      ).toMatchObject({ error: 'Forbidden' });
      expect(await roleOf(MANAGER)).toBe('manager');
    });

    it('RoleUnmodelled_RefusesForbiddenAndLeavesTheStoredRole', async () => {
      actingAs(OWNER);

      expect(
        await actions.setMemberRole(KIDDO, MANAGER, 'admin' as 'manager')
      ).toMatchObject({ error: 'Forbidden' });
      expect(await roleOf(MANAGER)).toBe('manager');
    });
  });
});

describe('removeMember', () => {
  it('OwnerRemovesAManager_DeletesTheRow', async () => {
    actingAs(OWNER);

    expect((await actions.removeMember(KIDDO, MANAGER)).success).toBe(true);
    expect(await roleOf(MANAGER)).toBeNull();
    expect(updateTag).toHaveBeenCalledWith(cacheTags.profilesOfUser(MANAGER));
  });

  it('ManagerRemovesThemselves_DeletesTheRow', async () => {
    actingAs(MANAGER);

    expect((await actions.removeMember(KIDDO, MANAGER)).success).toBe(true);
    expect(await roleOf(MANAGER)).toBeNull();
  });

  it('ManagerTargetingAnotherMember_RejectsForbiddenAndLeavesTheRow', async () => {
    actingAs(MANAGER);

    expect(await actions.removeMember(KIDDO, OWNER)).toEqual({
      success: false,
      message: 'Forbidden',
      error: 'Forbidden',
    });
    expect(await roleOf(OWNER)).toBe('owner');
  });

  describe('OwnerFloor', () => {
    it('SoleOwnerRemovesThemselves_RejectsLastOwnerAndLeavesTheRow', async () => {
      actingAs(OWNER);

      expect(await actions.removeMember(KIDDO, OWNER)).toMatchObject({
        success: false,
        error: 'Last owner',
      });
      expect(await roleOf(OWNER)).toBe('owner');
    });

    it('OneOfTwoOwnersRemovesThemselves_DeletesTheRow', async () => {
      await seedMembership(db, {
        user_id: OWNER2,
        profile_id: KIDDO,
        role: 'owner',
      });
      actingAs(OWNER);

      expect((await actions.removeMember(KIDDO, OWNER)).success).toBe(true);
      expect(await roleOf(OWNER)).toBeNull();
      expect(await roleOf(OWNER2)).toBe('owner');
    });

    it('OnlyManagerRemoved_DeletesTheRow', async () => {
      actingAs(OWNER);

      // The floor counts owners, not members: removing the last manager is
      // unaffected by it.
      expect((await actions.removeMember(KIDDO, MANAGER)).success).toBe(true);
      expect(await roleOf(MANAGER)).toBeNull();
    });
  });
});

describe('mintInvite', () => {
  async function invitesOn(profileId: string) {
    return db
      .select({ role: profile_invites.role })
      .from(profile_invites)
      .where(eq(profile_invites.profile_id, profileId));
  }

  it('SelfProfileNamed_RefusesForbiddenAndMintsNothing', async () => {
    actingAs(OWNER);

    // `self` clears the owner floor, so the floor alone would let an account
    // mint an owner link onto the profile that *is* them — and the redeemer
    // would then satisfy the survivor clause and evict them from it.
    expect(await actions.mintInvite(selfProfileOf(OWNER))).toMatchObject({
      error: 'Forbidden',
    });
    expect(await invitesOn(selfProfileOf(OWNER))).toEqual([]);
  });

  it('NoRoleGiven_MintsAManagerToken', async () => {
    actingAs(OWNER);

    const result = await actions.mintInvite(KIDDO);

    expect(result.success).toBe(true);
    expect(result.id).toEqual(expect.any(String));
    expect(await invitesOn(KIDDO)).toEqual([{ role: 'manager' }]);
  });

  it('OwnerRoleChosen_MintsAnOwnerToken', async () => {
    actingAs(OWNER);

    await actions.mintInvite(KIDDO, 'owner');

    expect(await invitesOn(KIDDO)).toEqual([{ role: 'owner' }]);
  });

  it('SelfRoleSubmitted_RejectsForbiddenAndMintsNothing', async () => {
    actingAs(OWNER);

    // The type forbids it, but a server action is a trust boundary and the
    // payload is whatever the caller sent.
    expect(
      await actions.mintInvite(KIDDO, 'self' as unknown as 'owner')
    ).toEqual({ success: false, message: 'Forbidden', error: 'Forbidden' });
    expect(await invitesOn(KIDDO)).toEqual([]);
  });

  it('ManagerActor_RejectsForbiddenAndMintsNothing', async () => {
    actingAs(MANAGER);

    expect(await actions.mintInvite(KIDDO)).toEqual({
      success: false,
      message: 'Forbidden',
      error: 'Forbidden',
    });
    expect(await invitesOn(KIDDO)).toEqual([]);
  });

  it('AnyMint_FiresNoTagBecauseNoCachedReadListsInvites', async () => {
    actingAs(OWNER);

    await actions.mintInvite(KIDDO);

    // The pending roster is read uncached, and minting admits nobody, so
    // there is no cached result for this write to invalidate.
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe('redeemInvite', () => {
  // The accepted tier is written explicitly rather than left to a default: a
  // default would silently substitute full protection for what was offered.
  describe('AcceptedTier', () => {
    it('OfferedTierUntouched_WritesItAsTheAccountRow', async () => {
      const token = await mintFor('manager');
      actingAs(STRANGER);

      await actions.redeemInvite(token, 'surprise');

      expect(await tierRowOf(STRANGER)).toBe('surprise');
    });

    it('AdjustedTier_WritesTheAdjustedValueInstead', async () => {
      const token = await mintFor('manager');
      actingAs(STRANGER);

      await actions.redeemInvite(token, 'claims');

      expect(await tierRowOf(STRANGER)).toBe('claims');
    });

    it('LaterDefaultChange_MovesNoSeatedMember', async () => {
      const token = await mintFor('manager');
      actingAs(STRANGER);
      await actions.redeemInvite(token, 'claims');

      // A profile-wide default change after redemption seeds nobody sitting.
      await writes.writeSpoilerDefault(KIDDO, 'claims');

      expect(await tierRowOf(STRANGER)).toBe('claims');
    });

    it('SittingMemberWithATierRow_KeepsTheirRoleAndTierUnchanged', async () => {
      await seedMembership(db, {
        user_id: STRANGER,
        profile_id: KIDDO,
        role: 'manager',
        baseline: 'claims',
      });
      const token = await mintFor('owner');
      actingAs(STRANGER);

      await actions.redeemInvite(token, 'claims');

      expect(await roleOf(STRANGER)).toBe('manager');
      // Offered 'claims' is neither re-seeded over their row nor a promotion.
      expect(await tierRowOf(STRANGER)).toBe('claims');
    });

    it('SittingMemberWithNoTierRow_StaysUnseededAndResolvesToSurprise', async () => {
      await seedMembership(db, {
        user_id: STRANGER,
        profile_id: KIDDO,
        role: 'manager',
      });
      const token = await mintFor('owner');
      actingAs(STRANGER);

      await actions.redeemInvite(token, 'claims');

      expect(await tierRowOf(STRANGER)).toBeNull();
      expect(await reads.getSpoilerBaseline(STRANGER, KIDDO)).toBe('surprise');
    });
  });

  it('LiveToken_WritesTheMembershipAtTheTokensRole', async () => {
    const token = await mintFor('owner');
    actingAs(STRANGER);

    expect((await actions.redeemInvite(token, 'surprise')).success).toBe(
      true
    );
    expect(await roleOf(STRANGER)).toBe('owner');
    expect(await redeemedAt(token)).not.toBeNull();
    expect(updateTag).toHaveBeenCalledWith(cacheTags.profilesOfUser(STRANGER));
  });

  describe('IdenticalRefusals', () => {
    const refusal = {
      success: false,
      message: 'This invite link is no longer valid',
      error: 'Invalid invite',
    };

    it('SpentToken_RefusesAndWritesNothing', async () => {
      const token = await mintFor('manager', { redeemed_at: new Date() });
      actingAs(STRANGER);

      expect(await actions.redeemInvite(token, 'surprise')).toEqual(
        refusal
      );
      expect(await roleOf(STRANGER)).toBeNull();
    });

    it('ExpiredToken_RefusesAndWritesNothing', async () => {
      const token = await mintFor('manager', {
        expires_at: new Date(Date.now() - 1000),
      });
      actingAs(STRANGER);

      expect(await actions.redeemInvite(token, 'surprise')).toEqual(
        refusal
      );
      expect(await roleOf(STRANGER)).toBeNull();
    });

    it('UnknownToken_RefusesAndWritesNothing', async () => {
      actingAs(STRANGER);

      expect(
        await actions.redeemInvite('no-such-token', 'surprise')
      ).toEqual(refusal);
      expect(await roleOf(STRANGER)).toBeNull();
    });
  });

  it('RedeemerAlreadyHoldsAMembership_ConsumesTheTokenAndKeepsTheirRole', async () => {
    const token = await mintFor('manager');
    actingAs(OWNER);

    const result = await actions.redeemInvite(token, 'surprise');

    expect(result.success).toBe(true);
    expect(await roleOf(OWNER)).toBe('owner');
    expect(await redeemedAt(token)).not.toBeNull();
  });

  // The join is an `or` of two `and` clauses, so each direction needs its own
  // test — one alone leaves the other clause deletable with the suite green.
  describe('BlockEdge', () => {
    it('RedeemerBlocksTheMinter_RefusesAndLeavesTheTokenRedeemable', async () => {
      const token = await mintFor('manager');
      await seedBlock(db, STRANGER, OWNER);
      actingAs(STRANGER);

      expect((await actions.redeemInvite(token, 'surprise')).success).toBe(
        false
      );
      expect(await roleOf(STRANGER)).toBeNull();
      expect(await redeemedAt(token)).toBeNull();
    });

    it('MinterBlocksTheRedeemer_RefusesAndLeavesTheTokenRedeemable', async () => {
      const token = await mintFor('manager');
      await seedBlock(db, OWNER, STRANGER);
      actingAs(STRANGER);

      expect((await actions.redeemInvite(token, 'surprise')).success).toBe(
        false
      );
      expect(await roleOf(STRANGER)).toBeNull();
      expect(await redeemedAt(token)).toBeNull();
    });
  });

  it('SpentTokenAndCallerAlreadySits_RefusesRatherThanReadingAsSuccess', async () => {
    const token = await mintFor('manager', { redeemed_at: new Date() });
    actingAs(OWNER);

    // The membership row is untouched either way, so a sitting caller is the
    // one case where a dead token could be mistaken for a redemption.
    expect(await actions.redeemInvite(token, 'surprise')).toMatchObject({
      success: false,
      error: 'Invalid invite',
    });
    expect(await roleOf(OWNER)).toBe('owner');
  });

  it('UnauthenticatedCaller_RejectsUnauthorized', async () => {
    const token = await mintFor('manager');
    vi.mocked(session.authedIdentity).mockResolvedValue(null);

    expect(await actions.redeemInvite(token, 'surprise')).toMatchObject({
      error: 'Unauthorized',
    });
    expect(await redeemedAt(token)).toBeNull();
  });
});

describe('revokeInvite', () => {
  it('OwnerRevokesALiveToken_DeletesItAndRefusesRedemption', async () => {
    const token = await mintFor('manager');
    actingAs(OWNER);

    expect((await actions.revokeInvite(KIDDO, token)).success).toBe(true);

    actingAs(STRANGER);
    expect((await actions.redeemInvite(token, 'surprise')).success).toBe(
      false
    );
    expect(await roleOf(STRANGER)).toBeNull();
  });

  it('SpentToken_RefusesAndLeavesTheMembershipItGranted', async () => {
    const token = await mintFor('manager');
    actingAs(STRANGER);
    await actions.redeemInvite(token, 'surprise');
    actingAs(OWNER);

    // A revoke that raced a redemption cannot take back the seat.
    expect(await actions.revokeInvite(KIDDO, token)).toMatchObject({
      success: false,
      error: 'Invalid invite',
    });
    expect(await roleOf(STRANGER)).toBe('manager');
  });

  it('ManagerActor_RejectsForbiddenAndLeavesTheTokenRedeemable', async () => {
    const token = await mintFor('manager');
    actingAs(MANAGER);

    expect(await actions.revokeInvite(KIDDO, token)).toEqual({
      success: false,
      message: 'Forbidden',
      error: 'Forbidden',
    });
    expect(await redeemedAt(token)).toBeNull();

    actingAs(STRANGER);
    expect((await actions.redeemInvite(token, 'surprise')).success).toBe(
      true
    );
  });
});

describe('setInviteRole', () => {
  async function roleOfInvite(token: string): Promise<string | null> {
    const [row] = await db
      .select({ role: profile_invites.role })
      .from(profile_invites)
      .where(eq(profile_invites.token, token));
    return row?.role ?? null;
  }

  it('OwnerRaisesTheRole_RedemptionGrantsTheNewOne', async () => {
    const token = await mintFor('manager');
    actingAs(OWNER);

    expect((await actions.setInviteRole(KIDDO, token, 'owner')).success).toBe(
      true
    );
    expect(await roleOfInvite(token)).toBe('owner');

    // The token is unchanged, so a link already sent grants what it says at the
    // moment it is redeemed.
    actingAs(STRANGER);
    await actions.redeemInvite(token, 'surprise');
    expect(await roleOf(STRANGER)).toBe('owner');
  });

  it('SpentToken_RefusesAndLeavesTheSittingRole', async () => {
    const token = await mintFor('manager');
    actingAs(STRANGER);
    await actions.redeemInvite(token, 'surprise');
    actingAs(OWNER);

    expect(await actions.setInviteRole(KIDDO, token, 'owner')).toMatchObject({
      success: false,
      error: 'Invalid invite',
    });
    expect(await roleOf(STRANGER)).toBe('manager');
  });

  it('ManagerActor_RejectsForbiddenAndLeavesTheRole', async () => {
    const token = await mintFor('manager');
    actingAs(MANAGER);

    expect(await actions.setInviteRole(KIDDO, token, 'owner')).toEqual({
      success: false,
      message: 'Forbidden',
      error: 'Forbidden',
    });
    expect(await roleOfInvite(token)).toBe('manager');
  });

  describe('UngrantableRole', () => {
    // The endpoint is what stands between a caller-supplied string and the
    // column: reaching the CHECK would surface as a generic write failure
    // rather than the refusal the requirement names.
    it('RoleSelf_RefusesForbiddenAndLeavesTheRole', async () => {
      const token = await mintFor('manager');
      actingAs(OWNER);

      expect(
        await actions.setInviteRole(KIDDO, token, 'self' as 'manager')
      ).toMatchObject({ error: 'Forbidden' });
      expect(await roleOfInvite(token)).toBe('manager');
    });

    it('RoleUnmodelled_RefusesForbiddenAndLeavesTheRole', async () => {
      const token = await mintFor('manager');
      actingAs(OWNER);

      expect(
        await actions.setInviteRole(KIDDO, token, 'admin' as 'manager')
      ).toMatchObject({ error: 'Forbidden' });
      expect(await roleOfInvite(token)).toBe('manager');
    });
  });
});

// Every action swallows its own failure into a refusal shape rather than
// letting a driver error reach the form: the caller can only act on a message.
describe('DriverFailures', () => {
  const throwOn = (method: 'insert' | 'update' | 'delete' | 'select') => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(db, method).mockImplementation(() => {
      throw new Error('boom');
    });
  };

  it('MintThrows_ReturnsFailedToMintInvite', async () => {
    actingAs(OWNER);
    throwOn('insert');

    expect(await actions.mintInvite(KIDDO)).toMatchObject({
      success: false,
      error: 'Failed to mint invite',
    });
  });

  it('RedeemThrows_ReturnsFailedToRedeemInvite', async () => {
    const token = await mintFor('manager');
    actingAs(STRANGER);
    throwOn('select');

    expect(await actions.redeemInvite(token, 'surprise')).toMatchObject({
      success: false,
      error: 'Failed to redeem invite',
    });
  });

  it('RevokeThrows_ReturnsFailedToRevokeInvite', async () => {
    const token = await mintFor('manager');
    actingAs(OWNER);
    throwOn('delete');

    expect(await actions.revokeInvite(KIDDO, token)).toMatchObject({
      success: false,
      error: 'Failed to revoke invite',
    });
  });

  it('InviteRoleChangeThrows_ReturnsFailedToUpdateInviteRole', async () => {
    const token = await mintFor('manager');
    actingAs(OWNER);
    throwOn('update');

    expect(await actions.setInviteRole(KIDDO, token, 'owner')).toMatchObject({
      success: false,
      error: 'Failed to update invite role',
    });
  });

  it('MemberRoleChangeThrows_ReturnsFailedToUpdateRole', async () => {
    actingAs(OWNER);
    throwOn('update');

    expect(await actions.setMemberRole(KIDDO, MANAGER, 'owner')).toMatchObject({
      success: false,
      error: 'Failed to update role',
    });
  });

  it('RemovalThrows_ReturnsFailedToRemoveMember', async () => {
    actingAs(OWNER);
    throwOn('delete');

    expect(await actions.removeMember(KIDDO, MANAGER)).toMatchObject({
      success: false,
      error: 'Failed to remove member',
    });
  });
});

describe('UnauthenticatedActor', () => {
  beforeEach(() => {
    vi.mocked(session.authedUserId).mockResolvedValue(null);
  });

  it('MintWithNoSession_RejectsUnauthorized', async () => {
    expect(await actions.mintInvite(KIDDO)).toMatchObject({
      error: 'Unauthorized',
    });
  });

  it('RemovalWithNoSession_RejectsUnauthorizedAndLeavesTheRow', async () => {
    expect(await actions.removeMember(KIDDO, MANAGER)).toMatchObject({
      error: 'Unauthorized',
    });
    expect(await roleOf(MANAGER)).toBe('manager');
  });
});
