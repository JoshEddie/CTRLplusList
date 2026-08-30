'use server';

import { db } from '@/db';
import { profile_invites, profile_members, user_blocks } from '@/db/schema';
import { cacheTags, updateTags } from '@/lib/cacheTags';
import { FORBIDDEN_RESPONSE, ownsProfile } from '@/lib/data/profile.gate';
import { selfMemberships } from '@/lib/data/profile.identity';
import {
  UNAUTHORIZED_RESPONSE,
  authedIdentity,
  authedUserId,
} from '@/lib/data/user.session';
import { type ActionResponse } from '@/lib/types';
import { and, eq, exists, gt, isNull, ne, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

export type MemberRole = 'owner' | 'manager';

// Membership administration is addressed to the profile the request *names*,
// not the one it acts as: the Permissions section is reached without switching
// to the profile it administers, so the shared write gate's acting-profile
// comparison would refuse every control the page renders as operable.
async function administeringOwner(
  profileId: string
): Promise<{ userId: string } | { error: ActionResponse }> {
  const userId = await authedUserId();
  if (!userId) return { error: UNAUTHORIZED_RESPONSE };
  if (!(await ownsProfile(userId, profileId)))
    return { error: FORBIDDEN_RESPONSE };
  return { userId };
}

// Both the acting owner's and the affected account's tags: a write that
// refreshes only the actor leaves the other party's Profiles page and profile
// switcher stating a membership that no longer holds.
function invalidateMembership(profileId: string, affectedUserId: string): void {
  updateTags(
    cacheTags.profileMembers,
    cacheTags.profilesOfUser(affectedUserId),
    cacheTags.profile(profileId)
  );
}

export async function setMemberRole(
  profileId: string,
  userId: string,
  role: MemberRole
): Promise<ActionResponse> {
  try {
    const actor = await administeringOwner(profileId);
    if ('error' in actor) return actor.error;
    if (actor.userId === userId) return FORBIDDEN_RESPONSE;

    await db
      .update(profile_members)
      .set({ role })
      .where(
        and(
          eq(profile_members.user_id, userId),
          eq(profile_members.profile_id, profileId)
        )
      );

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
                  or(eq(survivor.role, 'self'), eq(survivor.role, 'owner'))
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

// The roster's pending rows are a cached read keyed on the profile, so every
// write that mints, re-roles, revokes or spends an invite refreshes it.
function invalidateInvites(profileId: string): void {
  updateTags(cacheTags.invitesOfProfile(profileId));
}

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
  role: MemberRole = 'manager'
): Promise<ActionResponse> {
  try {
    const actor = await administeringOwner(profileId);
    if ('error' in actor) return actor.error;
    if (role !== 'owner' && role !== 'manager') return FORBIDDEN_RESPONSE;

    const expires = new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000);
    const [invite] = await db
      .insert(profile_invites)
      .values({
        profile_id: profileId,
        created_by_user_id: actor.userId,
        role,
        expires_at: expires,
      })
      .returning({ token: profile_invites.token });

    invalidateInvites(profileId);
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
export async function redeemInvite(token: string): Promise<ActionResponse> {
  try {
    const identity = await authedIdentity();
    if (!identity) return UNAUTHORIZED_RESPONSE;
    const { userId, selfProfile } = identity;

    // A plain read ahead of the write rather than a fourth clause inside it: a
    // block edge landing mid-redemption harms nobody, and the minter's own
    // profile has to be resolved through their `self` membership anyway.
    const [invite] = await db
      .select({
        profile_id: profile_invites.profile_id,
        blocked: user_blocks.blocker_profile_id,
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
      .onConflictDoNothing()
      .returning({ profile_id: profile_members.profile_id });

    // Zero rows is ambiguous between a token the guard refused and a redeemer
    // who already sits on the profile — the conflict swallows the row either
    // way. A link admits and nothing more, so a sitting member's standing role
    // is left as it is and the redemption still reads as a success.
    if (admitted.length === 0) {
      const [sitting] = await db
        .select({ role: profile_members.role })
        .from(profile_members)
        .where(
          and(
            eq(profile_members.user_id, userId),
            eq(profile_members.profile_id, invite.profile_id)
          )
        );
      if (!sitting) return INVALID_INVITE_RESPONSE;
      invalidateInvites(invite.profile_id);
      return { success: true, message: 'You already run this profile' };
    }

    invalidateMembership(invite.profile_id, userId);
    invalidateInvites(invite.profile_id);
    return { success: true, message: 'You now run this profile' };
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

    invalidateInvites(profileId);
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
  role: MemberRole
): Promise<ActionResponse> {
  try {
    const actor = await administeringOwner(profileId);
    if ('error' in actor) return actor.error;
    if (role !== 'owner' && role !== 'manager') return FORBIDDEN_RESPONSE;

    const updated = await db
      .update(profile_invites)
      .set({ role })
      .where(
        and(
          eq(profile_invites.token, token),
          eq(profile_invites.profile_id, profileId),
          isNull(profile_invites.redeemed_at)
        )
      )
      .returning({ token: profile_invites.token });

    invalidateInvites(profileId);
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
