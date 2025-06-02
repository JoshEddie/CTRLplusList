import Empty from '@/app/ui/components/Empty';
import { ItemDisplay } from '@/lib/types';
import Item from './Item';

interface ItemsProps {
  items: ItemDisplay[];
  user_id?: string;
  user_name?: string | null;
  type?: string;
}

export default function Items({
  items,
  user_id,
  user_name,
  type = 'item',
}: ItemsProps) {

  return (
    items.length === 0 ? (
      <Empty type={type} />
    ) : (
    <div className="item-grid">
      {items.map((item) => {
        return (
          <Item key={item.id} item={item} user_id={user_id} user_name={user_name} />
        )
      })}
    </div>
    )
  );
}