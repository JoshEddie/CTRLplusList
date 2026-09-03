import { getMessage } from '@/lib/i18n/utils';
import { priceAmount } from '@/lib/storeValidity';
import { atLeast } from '@/lib/spoilers';
import { EntryCapacity, PurchaseView, SpoilerTier } from '@/lib/types';

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

// What the entry already has spoken for, phrased for the label row beside a
// units control. Derived from capacity rather than from the projected claims,
// which carry no unit counts below the revealed tier.
export function unitsClaimedLabel(quantity: number, remaining: number): string {
  return getMessage('claim_units_status', {
    claimed: quantity - remaining,
    quantity,
  });
}

// What an existing claim could be raised to: everything the entry has spare,
// plus what the claim already holds — a claim does not compete with itself. A
// ceiling of one is an entry asking for one, which is where every units control
// disappears.
export function claimUnitsCeiling(
  capacity: EntryCapacity | null | undefined,
  claim: PurchaseView
): number {
  return (capacity?.remaining ?? 0) + (claim.units ?? 1);
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
