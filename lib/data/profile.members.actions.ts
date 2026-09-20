'use server';

import { db } from '@/db';
import { profile_invites, profile_members, user_blocks } from '@/db/schema';
import {
  FORBIDDEN_RESPONSE,
  ownsProfile,
  writableMembership,
} from '@/lib/data/profile.gate';
import { ROLES, grantableRole } from '@/lib/data/profile.roles';
import { selfMemberships } from '@/lib/data/profile.identity';
import { invalidateMembership } from '@/lib/data/profile.members.tags';
import {
  deleteMemberPreferences,
  writeMemberTier,
} from '@/lib/data/profilePreference.write';
import {
  UNAUTHORIZED_RESPONSE,
  authedIdentity,
  authedUserId,
} from '@/lib/data/user.session';
import {
  type ActionResponse,
  type RoleShape,
  type SpoilerTier,
} from '@/lib/types';
import { and, eq, exists, gt, inArray, isNull, ne, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

// Membership administration is addressed to the profile the request *names*,
// not the one it acts as: the Permissions section is reached without switching
// to the profile it administers, so the shared write gate's acting-profile
// comparison would refuse every control the page renders as operable.
// The actor's own role rides back out because minting turns on it: `self`
// clears the owner floor, and a self-profile is the one profile no link may
// admit anyone to.
async function administeringOwner(
  profileId: string
): Promise<{ userId: string; role: RoleShape } | { error: ActionResponse }> {
  const userId = await authedUserId();
  if (!userId) return { error: UNAUTHORIZED_RESPONSE };
  const membership = await writableMembership(userId, profileId);
  if (!membership || !membership.role.admin)
    return { error: FORBIDDEN_RESPONSE };
  return { userId, role: membership.role };
}

export async function setMemberRole(
  profileId: string,
  userId: string,
  role: string
): Promise<ActionResponse> {
  try {
    const actor = await administeringOwner(profileId);
    if ('error' in actor) return actor.error;
    if (actor.userId === userId) return FORBIDDEN_RESPONSE;
    const granted = grantableRole(role);
    if (!granted) return FORBIDDEN_RESPONSE;

    // `self` is excluded in the statement, not by the caller that happens to
    // produce the target today: rewriting the row that marks the account a
    // profile *is* would leave it with no self membership and no path back.
    const updated = await db
      .update(profile_members)
      .set({ role: granted.value })
      .where(
        and(
          eq(profile_members.user_id, userId),
          eq(profile_members.profile_id, profileId),
          ne(profile_members.role, ROLES.self.value)
        )
      )
      .returning({ user_id: profile_members.user_id });

    if (updated.length === 0) {
      return {
        success: false,
        message: 'That membership can no longer be changed',
        error: 'No membership',
      };
    }

    invalidateMembership(profileId, userId);
    return { success: true, message: 'Role updated' };
  } catch (error) {
    console.error('Error updating member role:', error);
    return {
      success: false,
      message: 'An error occurred while updating the role',
      error: 'Failed to update role',
    };
  }
}

export async function removeMember(
  profileId: string,
  userId: string
): Promise<ActionResponse> {
  try {
    const actingUserId = await authedUserId();
    if (!actingUserId) return UNAUTHORIZED_RESPONSE;
    const leavingSelf = actingUserId === userId;
    if (!leavingSelf && !(await ownsProfile(actingUserId, profileId)))
      return FORBIDDEN_RESPONSE;

    // The ≥1-owner floor rides inside the DELETE rather than preceding it as a
    // read: the driver offers no interactive transaction, and no unique index
    // can express a lower bound on a set. Zero rows affected is the refusal.
    const survivor = alias(profile_members, 'surviving_owner');
    const deleted = await db
      .delete(profile_members)
      .where(
        and(
          eq(profile_members.user_id, userId),
          eq(profile_members.profile_id, profileId),
          exists(
            db
              .select({ user_id: survivor.user_id })
              .from(survivor)
              .where(
                and(
                  eq(survivor.profile_id, profileId),
                  ne(survivor.user_id, userId),
                  inArray(
                    survivor.role,
                    Object.values(ROLES)
                      .filter((role) => role.admin)
                      .map((role) => role.value)
                  )
                )
              )
          )
        )
      )
      .returning({ user_id: profile_members.user_id });

    if (deleted.length === 0) {
      return {
        success: false,
        message: 'A profile must keep at least one owner',
        error: 'Last owner',
      };
    }

    // The membership row cascades nothing to the account's preference rows, so
    // revocation clears them explicitly — leaving no record of a revoked
    // member's tier.
    await deleteMemberPreferences(profileId, userId);
    invalidateMembership(profileId, userId);
    return { success: true, message: 'Member removed' };
  } catch (error) {
    console.error('Error removing member:', error);
    return {
      success: false,
      message: 'An error occurred while removing the member',
      error: 'Failed to remove member',
    };
  }
}

const INVITE_DAYS = 7;

// One refusal for an unknown token, an expired one and an already-spent one:
// distinguishing them would confirm to a stranger holding a guessed token that
// a token existed.
const INVALID_INVITE_RESPONSE: ActionResponse = {
  success: false,
  message: 'This invite link is no longer valid',
  error: 'Invalid invite',
};

// The token is the whole grant: it names the profile and the role, and whoever
// holds it may redeem it once. Nothing binds it to a recipient, so its lifetime
// and its single use are the only bounds it has.
export async function mintInvite(
  profileId: string,
  role: string = ROLES.manager.value
): Promise<ActionResponse> {
  try {
    const actor = await administeringOwner(profileId);
    if ('error' in actor) return actor.error;
    const granted = grantableRole(role);
    if (!granted) return FORBIDDEN_RESPONSE;
    // A self-profile admits nobody. Enforced here rather than by withholding
    // the control: `self` clears the owner floor, so without this an account
    // could mint an owner link onto the profile that *is* them, and the
    // redeemer would then satisfy `removeMember`'s survivor clause and evict
    // that account from its own identity.
    if (actor.role.isSelf) return FORBIDDEN_RESPONSE;

    const expires = new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000);
    const [invite] = await db
      .insert(profile_invites)
      .values({
        profile_id: profileId,
        created_by_user_id: actor.userId,
        role: granted.value,
        expires_at: expires,
      })
      .returning({ token: profile_invites.token });

    return { success: true, message: 'Invite link ready', id: invite.token };
  } catch (error) {
    console.error('Error minting invite:', error);
    return {
      success: false,
      message: 'An error occurred while creating the link',
      error: 'Failed to mint invite',
    };
  }
}

// The one profile-scoped write whose actor holds no membership on the profile
// it touches — that membership is what is being granted, so the token is the
// authorization. Consuming it and writing the row are one statement: a spent
// token with no membership behind it is repairable by nobody, since the
// recipient cannot redeem twice and the owner is never told.
export async function redeemInvite(
  token: string,
  tier: SpoilerTier
): Promise<ActionResponse> {
  try {
    const identity = await authedIdentity();
    if (!identity) return UNAUTHORIZED_RESPONSE;
    const { userId, selfProfile } = identity;

    // A plain read ahead of the write rather than a fourth clause inside it: a
    // block edge landing mid-redemption harms nobody, and the minter's own
    // profile has to be resolved through their `self` membership anyway.
    // The standing membership rides along on the same read: it decides only
    // what the success message says, never whether the token was live — that
    // stays the redeeming statement's own answer.
    const sitting = alias(profile_members, 'sitting_membership');
    const [invite] = await db
      .select({
        profile_id: profile_invites.profile_id,
        blocked: user_blocks.blocker_profile_id,
        sitting_role: sitting.role,
      })
      .from(profile_invites)
      .innerJoin(
        selfMemberships,
        eq(selfMemberships.user_id, profile_invites.created_by_user_id)
      )
      .leftJoin(
        user_blocks,
        or(
          and(
            eq(user_blocks.blocker_profile_id, selfMemberships.profile_id),
            eq(user_blocks.blocked_profile_id, selfProfile.id)
          ),
          and(
            eq(user_blocks.blocker_profile_id, selfProfile.id),
            eq(user_blocks.blocked_profile_id, selfMemberships.profile_id)
          )
        )
      )
      .leftJoin(
        sitting,
        and(
          eq(sitting.profile_id, profile_invites.profile_id),
          eq(sitting.user_id, userId)
        )
      )
      .where(eq(profile_invites.token, token));
    if (!invite || invite.blocked) return INVALID_INVITE_RESPONSE;

    const spent = db.$with('spent').as(
      db
        .update(profile_invites)
        .set({ redeemed_at: new Date() })
        .where(
          and(
            eq(profile_invites.token, token),
            isNull(profile_invites.redeemed_at),
            gt(profile_invites.expires_at, new Date())
          )
        )
        .returning({
          profile_id: profile_invites.profile_id,
          role: profile_invites.role,
        })
    );

    const admitted = await db
      .with(spent)
      .insert(profile_members)
      .select(
        // Every column, in table order: drizzle rejects an insert-select whose
        // projection is not the table's own.
        db
          .select({
            user_id: sql<string>`${userId}`.as('user_id'),
            profile_id: spent.profile_id,
            role: spent.role,
            ride_along: sql<boolean>`false`.as('ride_along'),
            last_active_at: sql<Date | null>`NULL`.as('last_active_at'),
            created_at: sql<Date>`now()`.as('created_at'),
          })
          .from(spent)
      )
      // A link admits and nothing more, so a redeemer who already sits keeps
      // the role they hold. Written as a no-op update rather than DO NOTHING so
      // the statement still returns their row: with DO NOTHING, zero rows would
      // mean either the guard refused the token or the conflict swallowed it,
      // and resolving that ambiguity in favour of success reports a dead token
      // as a redemption.
      .onConflictDoUpdate({
        target: [profile_members.user_id, profile_members.profile_id],
        set: { role: sql`${profile_members.role}` },
      })
      .returning({ profile_id: profile_members.profile_id });

    // Zero rows now means one thing: the UPDATE's guard refused the token.
    if (admitted.length === 0) return INVALID_INVITE_RESPONSE;

    // The accepted tier is a separate write against a different table, seeded
    // from the offered value. Only for a genuinely new membership — a sitting
    // member is neither re-seeded nor promoted. A membership with no tier row
    // resolves safely to full protection, so this need not share the statement.
    if (!invite.sitting_role) {
      await writeMemberTier(invite.profile_id, userId, tier);
    }

    invalidateMembership(invite.profile_id, userId);
    return invite.sitting_role
      ? { success: true, message: 'You already run this profile' }
      : { success: true, message: 'You now run this profile' };
  } catch (error) {
    console.error('Error redeeming invite:', error);
    return {
      success: false,
      message: 'An error occurred while redeeming the link',
      error: 'Failed to redeem invite',
    };
  }
}

// Revoking is a delete rather than an expiry stamp: an invite nobody redeemed
// leaves nothing to account for, and `redeemed_at` means spent, not withdrawn.
// Guarded on `redeemed_at IS NULL` so a revoke racing a redemption cannot take
// back a membership that has already been granted.
export async function revokeInvite(
  profileId: string,
  token: string
): Promise<ActionResponse> {
  try {
    const actor = await administeringOwner(profileId);
    if ('error' in actor) return actor.error;

    const deleted = await db
      .delete(profile_invites)
      .where(
        and(
          eq(profile_invites.token, token),
          eq(profile_invites.profile_id, profileId),
          isNull(profile_invites.redeemed_at)
        )
      )
      .returning({ token: profile_invites.token });

    if (deleted.length === 0) return INVALID_INVITE_RESPONSE;
    return { success: true, message: 'Invite link revoked' };
  } catch (error) {
    console.error('Error revoking invite:', error);
    return {
      success: false,
      message: 'An error occurred while revoking the link',
      error: 'Failed to revoke invite',
    };
  }
}

// The role a link grants is editable while it is still outstanding — the token
// is unchanged, so a link already sent grants whatever it says at the moment it
// is redeemed. Guarded on `redeemed_at IS NULL` for the same reason revoking
// is: a sitting member's role is never rewritten through an invite.
export async function setInviteRole(
  profileId: string,
  token: string,
  role: string
): Promise<ActionResponse> {
  try {
    const actor = await administeringOwner(profileId);
    if ('error' in actor) return actor.error;
    const granted = grantableRole(role);
    if (!granted) return FORBIDDEN_RESPONSE;

    const updated = await db
      .update(profile_invites)
      .set({ role: granted.value })
      .where(
        and(
          eq(profile_invites.token, token),
          eq(profile_invites.profile_id, profileId),
          isNull(profile_invites.redeemed_at)
        )
      )
      .returning({ token: profile_invites.token });

    if (updated.length === 0) return INVALID_INVITE_RESPONSE;
    return { success: true, message: 'Invite role updated' };
  } catch (error) {
    console.error('Error updating invite role:', error);
    return {
      success: false,
      message: 'An error occurred while updating the link',
      error: 'Failed to update invite role',
    };
  }
}
