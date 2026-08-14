import { PurchaseView } from '@/lib/types';

export const GUEST_CLAIMS_COOKIE = 'guest_claims';

// 400 days — the browser cap on cookie lifetime; re-applied on every write so
// an active guest's cookie never expires.
export const GUEST_CLAIMS_COOKIE_ATTRIBUTES = {
  httpOnly: true,
  path: '/',
  sameSite: 'lax',
  secure: process.env.NODE_ENV !== 'development',
  maxAge: 400 * 24 * 60 * 60,
} as const;

// Bounded id list keeps the cookie well under the 4KB limit (~36 bytes/id).
export const GUEST_CLAIMS_MAX_IDS = 50;

const MAX_COOKIE_BYTES = 4096;

export type GuestClaims = {
  id: string;
  name: string;
  purchases: string[];
};

export function parseGuestClaims(
  raw: string | null | undefined
): GuestClaims | null {
  if (!raw || raw.length > MAX_COOKIE_BYTES) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return null;
  }
  const { id, name, purchases } = parsed as Record<string, unknown>;
  if (typeof id !== 'string' || id === '') return null;
  if (typeof name !== 'string') return null;
  if (
    !Array.isArray(purchases) ||
    purchases.some((p) => typeof p !== 'string' || p === '')
  ) {
    return null;
  }
  return { id, name, purchases: purchases as string[] };
}

export function serializeGuestClaims(claims: GuestClaims): string {
  return JSON.stringify(claims);
}

export function appendGuestClaim(
  existing: GuestClaims | null,
  purchaseId: string,
  guestName: string
): GuestClaims {
  const base = existing ?? {
    id: crypto.randomUUID(),
    name: guestName,
    purchases: [],
  };
  return {
    id: base.id,
    name: guestName,
    purchases: [purchaseId, ...base.purchases.filter((p) => p !== purchaseId)]
      .slice(0, GUEST_CLAIMS_MAX_IDS),
  };
}

export function pruneGuestClaim(
  claims: GuestClaims,
  purchaseId: string
): GuestClaims {
  return {
    ...claims,
    purchases: claims.purchases.filter((p) => p !== purchaseId),
  };
}

export function overlayGuestClaims<
  T extends { purchases?: PurchaseView[] },
>(items: T[], cookiePurchaseIds: ReadonlySet<string>): T[] {
  if (cookiePurchaseIds.size === 0) return items;
  return items.map((item) => {
    if (!item.purchases?.some((p) => cookiePurchaseIds.has(p.id))) return item;
    return {
      ...item,
      purchases: item.purchases.map((p) =>
        cookiePurchaseIds.has(p.id)
          ? { ...p, claimedByViewer: true, by: 'self' as const }
          : p
      ),
    };
  });
}
