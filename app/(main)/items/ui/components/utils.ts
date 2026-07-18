import { storeComplete } from '@/lib/storeValidity';
import { ItemStoreTable, PurchaseView } from '@/lib/types';

export function claimLabel(claim: PurchaseView): string {
  const name = claim.by === 'self' ? 'You' : claim.firstName;
  return claim.claimerFirstName
    ? `${name} — added by ${claim.claimerFirstName}`
    : name;
}

export function firstToken(name: string): string {
  return name.trim().split(/\s+/)[0];
}

// PRICE_PATTERN accepts an optional leading `$`, which Number() does not.
function priceAmount(price: string | number): number {
  return typeof price === 'string'
    ? Number(price.replace(/^\$/, ''))
    : price;
}

export function sortedValidStores(
  stores: ItemStoreTable[] | null | undefined
): ItemStoreTable[] {
  return (stores ?? [])
    .filter(storeComplete)
    .sort((a, b) => priceAmount(a.price) - priceAmount(b.price));
}

export function lowestPricedStore(
  stores: ItemStoreTable[] | null | undefined
): ItemStoreTable | null {
  return sortedValidStores(stores)[0] ?? null;
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

