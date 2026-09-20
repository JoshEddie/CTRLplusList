import { facelessView } from '@/app/ui/components/ProfileAvatar';
import { getMessage } from '@/lib/i18n/utils';
import { atLeast } from '@/lib/spoilers';
import { priceAmount } from '@/lib/storeValidity';
import {
  EntryCapacity,
  ProfileAvatarView,
  PurchaseView,
  SpoilerTier,
} from '@/lib/types';

// The disc a claim is drawn as. A free-text purchaser has no profile and so no
// look: the name that was typed is all there is to draw initials from. Account
// linkage governs nothing — a managed profile carries art on the same terms as
// anyone else.
export function claimAvatar(claim: PurchaseView): ProfileAvatarView {
  return claim.avatar ?? facelessView(claim.name);
}

// What the entry already has spoken for, phrased for the label row beside a
// units control. Derived from capacity rather than summed over the projected
// claims, which below `claims` are only the ones the viewer holds.
export function unitsClaimedLabel(quantity: number, remaining: number): string {
  return getMessage('claim_units_status', {
    claimed: quantity - remaining,
    quantity,
  });
}

// The same reading, gated: every surface that states what an entry already has
// spoken for withholds it below `claims`, where capacity's remainder is
// subtracted from a count the payload does not carry and would read as a false
// zero. Absent off a list, where there is no entry to have spoken for anything.
export function claimedStatusLabel(
  capacity: EntryCapacity | null | undefined,
  tier: SpoilerTier
): string | undefined {
  return capacity && atLeast(tier, 'claims')
    ? unitsClaimedLabel(capacity.quantity, capacity.remaining)
    : undefined;
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

// Claims the viewer may act on, and the ones a view of "your claims" lists:
// the claims they are the purchaser of, and the ones they recorded for someone
// else. Both compare the self-profile, so neither takes the owner floor.
export function heldByViewer(claim: PurchaseView): boolean {
  return claim.by === 'self' || claim.claimedByViewer;
}

// One home for the complement: two surfaces read it for the same reason, and a
// divergence between them would fail silently — the owner's confirmation would
// stop matching the count the manage view renders under the list.
export function othersClaimCount(claims: PurchaseView[]): number {
  return claims.filter((claim) => !heldByViewer(claim)).length;
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
// purchaseView=claim, the banner sets purchaseView=roster; anything else falls
// to the default rule. Owner and guest modals render their single
// viewer-appropriate state from the claim view. The roster is read before
// ownership: the owner reaches it through the same banner everyone else does,
// and it is a reading of the item rather than an act on it.
export function resolveModalView(opts: {
  isOwner: boolean;
  purchaseView: string | null | undefined;
  hasViewerClaim: boolean;
}): 'manage' | 'claim' | 'roster' {
  if (opts.purchaseView === 'roster') return 'roster';
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
