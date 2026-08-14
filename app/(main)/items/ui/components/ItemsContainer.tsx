import { auth } from '@/lib/auth';
import {
  GUEST_CLAIMS_COOKIE,
  overlayGuestClaims,
  parseGuestClaims,
} from '@/lib/data/purchase.cookie';
import { getItemsByListId, getItemsByUser } from '@/lib/data/item';
import { getUserIdByEmail } from '@/lib/data/user';
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
  viewerId?: string;
  showSpoilers?: boolean;
}

export default async function ItemsContainer({
  listId,
  isListOwner,
  viewerId,
  showSpoilers,
}: ItemsContainerProps) {
  const session = await auth();

  let items: ItemDisplay[];

  const user = session?.user?.email
    ? await getUserIdByEmail(session.user.email)
    : null;

  if (listId) {
    items = await getItemsByListId(listId, {
      viewerId: viewerId ?? user?.id,
      isOwner: isListOwner ?? false,
      showSpoilers: showSpoilers ?? false,
    });
    if (!session?.user?.email) {
      // Post-cache, request-scope only: the cookie must never reach the
      // 'use cache' read above, so guests keep sharing one cached variant.
      const store = await cookies();
      const claims = parseGuestClaims(store.get(GUEST_CLAIMS_COOKIE)?.value);
      items = overlayGuestClaims(items, new Set(claims?.purchases));
    }
  } else if (user) {
    items = await getItemsByUser(user.id);
  } else {
    redirect('/');
  }

  const firstLastInitial = viewerDisplayName(user?.name);

  if (listId) {
    const initialPageSize = await readItemsPageSize();
    return (
      <Suspense fallback={<LoadingIndicator size="page" />}>
        <ItemsBrowser
          items={items}
          mode="list"
          initialPageSize={initialPageSize}
          user_id={user?.id}
          user_name={firstLastInitial}
        />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<LoadingIndicator size="page" />}>
      <Items items={items} user_id={user?.id} user_name={firstLastInitial} />
    </Suspense>
  );
}
