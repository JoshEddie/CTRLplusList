import { priceAmount } from '@/lib/storeValidity';
import { atLeast } from '@/lib/spoilers';
import { PurchaseView, SpoilerTier } from '@/lib/types';

// A claim carrying no name is one the viewer's tier withholds the identity of;
// the card never renders such a row, but the fallback keeps the label total.
export function claimLabel(claim: PurchaseView): string {
  const name = claim.by === 'self' ? 'You' : (claim.firstName ?? 'Someone');
  return claim.claimerFirstName
    ? `${name} — added by ${claim.claimerFirstName}`
    : name;
}

// The owner-side claim pill: never below `claims`, and from `claims` up whenever
// the item carries claims. One home so the card's `purchased` styling and the
// banner itself agree on when it shows.
export function showsSpoilerBanner(
  isOwner: boolean,
  tier: SpoilerTier,
  hasAnyClaim: boolean
): boolean {
  return isOwner && hasAnyClaim && atLeast(tier, 'claims');
}

// The card's "Claimed by …" line. Below `identity` no other party's claim
// carries a name, so the line reports how many rather than who.
export function claimSummaryOf(
  claims: PurchaseView[],
  tier: SpoilerTier
): string {
  if (claims.length === 0) return '';
  if (tier !== 'identity') {
    return claims.length === 1 ? '1 person' : `${claims.length} people`;
  }
  return claims
    .map((claim) => (claim.by === 'self' ? 'You' : (claim.firstName ?? 'Someone')))
    .join(', ');
}

export function firstToken(name: string): string {
  return name.trim().split(/\s+/)[0];
}

export function formatStorePrice(price: string | number): string {
  return `$${priceAmount(price).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Opening state is affordance-routed (claim-attribution spec): Add Claim sets
// purchaseView=claim; anything else falls to the default rule. Owner and guest
// modals render their single viewer-appropriate state from the claim view.
export function resolveModalView(opts: {
  isOwner: boolean;
  purchaseView: string | null | undefined;
  hasViewerClaim: boolean;
}): 'manage' | 'claim' {
  if (opts.isOwner || opts.purchaseView === 'claim') return 'claim';
  return opts.hasViewerClaim ? 'manage' : 'claim';
}

export function containerClasses(flags: {
  className?: string;
  isOwner: boolean;
  purchased: boolean;
  hasMyClaim: boolean;
  preview?: boolean;
}): string {
  return [
    'item-container',
    flags.className || '',
    flags.isOwner ? 'owner' : '',
    flags.purchased ? 'purchased' : '',
    flags.hasMyClaim ? 'has-my-claim' : '',
    flags.preview ? 'preview' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

