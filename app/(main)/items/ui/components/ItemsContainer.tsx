import {
  GUEST_CLAIMS_COOKIE,
  overlayGuestClaims,
  parseGuestClaims,
} from '@/lib/data/purchase.cookie';
import { getItemsByListId, getItemsByProfile } from '@/lib/data/item';
import { authedIdentity } from '@/lib/data/user.session';
import { ItemDisplay, SpoilerTier } from '@/lib/types';
import LoadingIndicator from '@/app/ui/components/LoadingIndicator';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import ItemsBrowser from './ItemsBrowser';
import Items from './Items';
import { readItemsPageSize } from '../../utils';

interface ItemsContainerProps {
  listId?: string;
  viewerSelfProfileId?: string;
  /** The viewer's resolved tier, forwarded rather than resolved here: it is database-backed, so resolving it beneath the cache boundary would key the cache on an input that can go stale. A signed-out list viewer forwards the maximal projection. */
  tier?: SpoilerTier;
  /** The viewer owns this list and is looking at it as its owner — false in their own viewer preview. Decides whether a soft-removed entry reaches them. */
  isOwner?: boolean;
}

export default async function ItemsContainer({
  listId,
  viewerSelfProfileId,
  tier,
  isOwner,
}: ItemsContainerProps) {
  let items: ItemDisplay[];

  const identity = await authedIdentity();

  if (listId) {
    // Request-scope only. The cookie reaches the UNCACHED wrapper below, never
    // the cached read beneath it, so guests keep sharing one cached variant
    // and what it projects for each of them is decided after the cache.
    const guestClaims = identity
      ? null
      : parseGuestClaims((await cookies()).get(GUEST_CLAIMS_COOKIE)?.value);
    items = await getItemsByListId(listId, {
      // Claims are the human's, so the viewer they are attributed against is
      // the self-profile whatever profile the request acts as.
      viewerSelfProfileId: viewerSelfProfileId ?? identity?.selfProfile.id,
      tier,
      isOwner,
      // A guest holds their claims by cookie and by nothing else, so it is
      // what tells a soft-removed entry apart from one they may not see.
      heldClaimIds: guestClaims?.purchases,
    });
    if (guestClaims) {
      items = overlayGuestClaims(items, guestClaims);
    }
  } else if (identity) {
    items = await getItemsByProfile(identity.activeProfile.id);
  } else {
    redirect('/');
  }

  const actor = identity?.activeProfile;

  if (listId) {
    const initialPageSize = await readItemsPageSize();
    return (
      <Suspense fallback={<LoadingIndicator size="page" />}>
        <ItemsBrowser
          items={items}
          mode="list"
          initialPageSize={initialPageSize}
          tier={tier}
          actor={actor}
          user_name={identity?.selfProfile.name}
        />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<LoadingIndicator size="page" />}>
      <Items
        items={items}
        actor={actor}
        user_name={identity?.selfProfile.name}
      />
    </Suspense>
  );
}
