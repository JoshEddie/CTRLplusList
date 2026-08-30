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
import { profile_invites, profile_members } from '@/db/schema';
import { bootPglite, resetDb } from '@/test/helpers/db';
import { mockNextCache } from '@/test/helpers/next-cache';
import { makeIdentity, makeProfile } from '@/test/helpers/profile';
import {
  seedBlock,
  seedManagedProfile,
  seedMembership,
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
let session: typeof import('@/lib/data/user.session');

beforeAll(async () => {
  const booted = await bootPglite();
  db = booted.db;
  holder.db = booted.db;
  actions = await import('@/lib/data/profile.members.actions');
  session = await import('@/lib/data/user.session');
});

beforeEach(async () => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  await resetDb(db);
  await seedUsers(db, [
    { id: OWNER },
    { id: OWNER2 },
    { id: MANAGER },
    { id: STRANGER },
  ]);
  await seedManagedProfile(db, { id: KIDDO, name: 'Kiddo' });
  await seedMembership(db, { user_id: OWNER, profile_id: KIDDO, role: 'owner' });
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

async function roleOf(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ role: profile_members.role })
    .from(profile_members)
    .where(
      and(
        eq(profile_members.user_id, userId),
        eq(profile_members.profile_id, KIDDO)
      )
    );
  return row?.role ?? null;
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

  it('AnyMint_RefreshesTheRosterWithoutTouchingMemberships', async () => {
    actingAs(OWNER);

    await actions.mintInvite(KIDDO);

    // The pending row is a cached read keyed on the profile; no membership
    // changed, so no account's own profile surfaces are touched.
    expect(updateTag).toHaveBeenCalledWith(cacheTags.invitesOfProfile(KIDDO));
    expect(updateTag).not.toHaveBeenCalledWith(cacheTags.profileMembers);
  });
});

describe('redeemInvite', () => {
  it('LiveToken_WritesTheMembershipAtTheTokensRole', async () => {
    const token = await mintFor('owner');
    actingAs(STRANGER);

    expect((await actions.redeemInvite(token)).success).toBe(true);
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

      expect(await actions.redeemInvite(token)).toEqual(refusal);
      expect(await roleOf(STRANGER)).toBeNull();
    });

    it('ExpiredToken_RefusesAndWritesNothing', async () => {
      const token = await mintFor('manager', {
        expires_at: new Date(Date.now() - 1000),
      });
      actingAs(STRANGER);

      expect(await actions.redeemInvite(token)).toEqual(refusal);
      expect(await roleOf(STRANGER)).toBeNull();
    });

    it('UnknownToken_RefusesAndWritesNothing', async () => {
      actingAs(STRANGER);

      expect(await actions.redeemInvite('no-such-token')).toEqual(refusal);
      expect(await roleOf(STRANGER)).toBeNull();
    });
  });

  it('RedeemerAlreadyHoldsAMembership_ConsumesTheTokenAndKeepsTheirRole', async () => {
    const token = await mintFor('manager');
    actingAs(OWNER);

    const result = await actions.redeemInvite(token);

    expect(result.success).toBe(true);
    expect(await roleOf(OWNER)).toBe('owner');
    expect(await redeemedAt(token)).not.toBeNull();
  });

  it('BlockEdgeWithTheMinter_RefusesAndLeavesTheTokenRedeemable', async () => {
    const token = await mintFor('manager');
    await seedBlock(db, STRANGER, OWNER);
    actingAs(STRANGER);

    expect((await actions.redeemInvite(token)).success).toBe(false);
    expect(await roleOf(STRANGER)).toBeNull();
    expect(await redeemedAt(token)).toBeNull();
  });

  it('UnauthenticatedCaller_RejectsUnauthorized', async () => {
    const token = await mintFor('manager');
    vi.mocked(session.authedIdentity).mockResolvedValue(null);

    expect(await actions.redeemInvite(token)).toMatchObject({
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
    expect(updateTag).toHaveBeenCalledWith(cacheTags.invitesOfProfile(KIDDO));

    actingAs(STRANGER);
    expect((await actions.redeemInvite(token)).success).toBe(false);
    expect(await roleOf(STRANGER)).toBeNull();
  });

  it('SpentToken_RefusesAndLeavesTheMembershipItGranted', async () => {
    const token = await mintFor('manager');
    actingAs(STRANGER);
    await actions.redeemInvite(token);
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
    expect((await actions.redeemInvite(token)).success).toBe(true);
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
    await actions.redeemInvite(token);
    expect(await roleOf(STRANGER)).toBe('owner');
  });

  it('SpentToken_RefusesAndLeavesTheSittingRole', async () => {
    const token = await mintFor('manager');
    actingAs(STRANGER);
    await actions.redeemInvite(token);
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

    expect(await actions.redeemInvite(token)).toMatchObject({
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
