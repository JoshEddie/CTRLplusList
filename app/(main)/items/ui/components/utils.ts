import { getMessage } from '@/lib/i18n/utils';
import { priceAmount } from '@/lib/storeValidity';
import { atLeast } from '@/lib/spoilers';
import { PurchaseView, SpoilerTier } from '@/lib/types';

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

// The card's "Claimed by …" line. No tier names another party's claim, so the
// line reports how many rather than who — names are the modal's reveal alone.
export function claimSummaryOf(claims: PurchaseView[]): string {
  return getMessage('claim_summary', { count: claims.length });
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
