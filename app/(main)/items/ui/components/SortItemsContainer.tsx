import { getItemsByListId } from '@/lib/data/item';
import { authedIdentity } from '@/lib/data/user.session';
import { ItemDisplay } from '@/lib/types';
import LoadingIndicator from '@/app/ui/components/LoadingIndicator';
import { Suspense } from 'react';
import SortItems from './SortItems';

interface SortItemsContainerProps {
  listId: string;
  isOwner?: boolean;
  showSpoilers?: boolean;
}

export default async function SortItemsContainer({
  listId,
  isOwner,
  showSpoilers,
}: SortItemsContainerProps) {
  const identity = await authedIdentity();

  const items: ItemDisplay[] = await getItemsByListId(listId, {
    viewerSelfProfileId: identity?.selfProfile.id,
    isOwner: isOwner ?? false,
    showSpoilers: showSpoilers ?? false,
  });

  const actor = identity?.activeProfile;

  return (
    <Suspense fallback={<LoadingIndicator size="page" />}>
      <SortItems
        items={items}
        actor={actor}
        listId={listId}
        showSpoilers={showSpoilers}
      />
    </Suspense>
  );
}
