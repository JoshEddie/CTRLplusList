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
}

export default async function ItemsContainer({
  listId,
  viewerSelfProfileId,
  tier,
}: ItemsContainerProps) {
  let items: ItemDisplay[];

  const identity = await authedIdentity();

  if (listId) {
    items = await getItemsByListId(listId, {
      // Claims are the human's, so the viewer they are attributed against is
      // the self-profile whatever profile the request acts as.
      viewerSelfProfileId: viewerSelfProfileId ?? identity?.selfProfile.id,
      tier,
    });
    if (!identity) {
      // Post-cache, request-scope only: the cookie must never reach the
      // 'use cache' read above, so guests keep sharing one cached variant.
      const store = await cookies();
      const claims = parseGuestClaims(store.get(GUEST_CLAIMS_COOKIE)?.value);
      items = overlayGuestClaims(items, claims);
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
