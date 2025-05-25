import { Suspense } from 'react';
import ItemsLoading from './ItemLoading';
import Items from './Items';

interface ItemsContainerProps {
  listId?: string;
}

export default function ItemsContainer({
  listId,
}: ItemsContainerProps) {
  return (
    <Suspense fallback={<ItemsLoading />}>
      <Items listId={listId} />
    </Suspense>
  );
}
