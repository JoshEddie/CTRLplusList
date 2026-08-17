import {
  GUEST_CLAIMS_COOKIE,
  overlayGuestClaims,
  parseGuestClaims,
} from '@/lib/data/purchase.cookie';
import { getItemsByListId, getItemsByProfile } from '@/lib/data/item';
import { authedIdentity } from '@/lib/data/user.session';
import { ItemDisplay } from '@/lib/types';
import LoadingIndicator from '@/app/ui/components/LoadingIndicator';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import ItemsBrowser from './ItemsBrowser';
import Items from './Items';
import { readItemsPageSize, viewerDisplayName } from '../../utils';

interface ItemsContainerProps {
  listId?: string;
  isListOwner?: boolean;
  viewerProfileId?: string;
  showSpoilers?: boolean;
}

export default async function ItemsContainer({
  listId,
  isListOwner,
  viewerProfileId,
  showSpoilers,
}: ItemsContainerProps) {
  let items: ItemDisplay[];

  const identity = await authedIdentity();

  if (listId) {
    items = await getItemsByListId(listId, {
      viewerProfileId: viewerProfileId ?? identity?.profile.id,
      isOwner: isListOwner ?? false,
      showSpoilers: showSpoilers ?? false,
    });
    if (!identity) {
      // Post-cache, request-scope only: the cookie must never reach the
      // 'use cache' read above, so guests keep sharing one cached variant.
      const store = await cookies();
      const claims = parseGuestClaims(store.get(GUEST_CLAIMS_COOKIE)?.value);
      items = overlayGuestClaims(items, new Set(claims?.purchases));
    }
  } else if (identity) {
    items = await getItemsByProfile(identity.profile.id);
  } else {
    redirect('/');
  }

  const firstLastInitial = viewerDisplayName(identity?.profile.name);

  if (listId) {
    const initialPageSize = await readItemsPageSize();
    return (
      <Suspense fallback={<LoadingIndicator size="page" />}>
        <ItemsBrowser
          items={items}
          mode="list"
          initialPageSize={initialPageSize}
          profile_id={identity?.profile.id}
          user_name={firstLastInitial}
        />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<LoadingIndicator size="page" />}>
      <Items
        items={items}
        profile_id={identity?.profile.id}
        user_name={firstLastInitial}
      />
    </Suspense>
  );
}
