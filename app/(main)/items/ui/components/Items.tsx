import Empty from '@/app/ui/components/Empty';
import { ItemStoreTable, ItemTable } from '@/lib/types';
import Item from './Item';

interface ItemsProps {
  items: (ItemTable & { stores: ItemStoreTable[] })[];
  user_id?: string;
}

export default function Items({
  items,
  user_id,
}: ItemsProps) {

  return (
    items.length === 0 ? (
      <Empty type="item" />
    ) : (
    <div className="item-grid">
      {items.map((item) => {
        return (
          <Item key={item.id} item={item} showEditButton={item.user_id === user_id} />
        )
      })}
    </div>
    )
  );
}