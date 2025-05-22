import { Suspense } from 'react';
import ItemsLoading from './ItemLoading';
import Items from './Items';

interface ItemsContainerProps {
  listId?: string;
  showEditButton?: boolean;
}

export default function ItemsContainer({
  listId,
  showEditButton = false,
}: ItemsContainerProps) {
  return (
    <Suspense fallback={<ItemsLoading />}>
      <Items listId={listId} showEditButton={showEditButton} />
    </Suspense>
  );
}
