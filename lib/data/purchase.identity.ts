import { auth } from '@/lib/auth';
import {
  GUEST_CLAIMS_COOKIE,
  GUEST_CLAIMS_COOKIE_ATTRIBUTES,
  type GuestClaims,
  appendGuestClaim,
  parseGuestClaims,
  pruneGuestClaim,
} from '@/lib/data/purchase.cookie';
import { authedIdentity } from '@/lib/data/user.session';
import { type ActionResponse, type UserIdentity } from '@/lib/types';
import { cookies } from 'next/headers';

export type ResolvedClaimIdentity = {
  viewer: UserIdentity | null;
  callerProfileId: string | null;
  purchaserProfileId: string | null;
  guestName: string | null;
};

// Resolve who a createPurchase claim is authorized AS vs stored AS, producing
// one of the four row shapes (claimed_by_profile_id = who asserted,
// profile_id = the purchaser):
//   self-claim:               asserter = caller's self-profile, purchaser = caller's self-profile
//   attributed claim:         asserter = caller's self-profile, purchaser = purchased_by target
//   authenticated guest name: asserter = caller's self-profile, purchaser = NULL, guest_name set
//   signed-out guest:         asserter = NULL,                  purchaser = NULL, guest_name set
// The asserter is always the session-resolved caller's self-profile — a claim
// is a human act; the purchased_by target is a payload field but only an
// attribution target (a profile id) — eligibility is re-verified against the
// live follow/block graph before insert.
export async function resolveClaimIdentity(
  rawGuestName: string | null,
  purchasedBy: string | null
): Promise<ResolvedClaimIdentity | { error: ActionResponse }> {
  const session = await auth();
  const trimmed = rawGuestName?.trim() ?? '';
  if (session?.user?.email) {
    const identity = await authedIdentity();
    if (!identity) {
      return {
        error: {
          success: false,
          message: 'User not found',
          error: 'Unauthorized',
        },
      };
    }
    if (purchasedBy && trimmed) {
      return {
        error: {
          success: false,
          message: 'Cannot identify which claim to add',
          error: 'Ambiguous purchaser',
        },
      };
    }
    if (purchasedBy) {
      return {
        viewer: identity,
        callerProfileId: identity.selfProfile.id,
        purchaserProfileId: purchasedBy,
        guestName: null,
      };
    }
    return trimmed
      ? {
          viewer: identity,
          callerProfileId: identity.selfProfile.id,
          purchaserProfileId: null,
          guestName: trimmed,
        }
      : {
          viewer: identity,
          callerProfileId: identity.selfProfile.id,
          purchaserProfileId: identity.selfProfile.id,
          guestName: null,
        };
  }
  if (purchasedBy || !trimmed) {
    return {
      error: {
        success: false,
        message: 'Cannot identify which claim to add',
        error: 'Missing identity',
      },
    };
  }
  return {
    viewer: null,
    callerProfileId: null,
    purchaserProfileId: null,
    guestName: trimmed,
  };
}

export async function readGuestClaims(): Promise<GuestClaims | null> {
  const store = await cookies();
  return parseGuestClaims(store.get(GUEST_CLAIMS_COOKIE)?.value);
}

async function writeGuestClaims(claims: GuestClaims): Promise<void> {
  const store = await cookies();
  store.set(
    GUEST_CLAIMS_COOKIE,
    JSON.stringify(claims),
    GUEST_CLAIMS_COOKIE_ATTRIBUTES
  );
}

export async function rememberGuestClaim(
  purchaseId: string,
  guestName: string
): Promise<void> {
  await writeGuestClaims(
    appendGuestClaim(await readGuestClaims(), purchaseId, guestName)
  );
}

export async function forgetGuestClaim(
  claims: GuestClaims,
  purchaseId: string
): Promise<void> {
  await writeGuestClaims(pruneGuestClaim(claims, purchaseId));
}
