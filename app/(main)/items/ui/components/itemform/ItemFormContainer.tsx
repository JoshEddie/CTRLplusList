import { ItemStoreTable, ItemTable, ListTable } from '@/lib/types';
import ItemForm from './ItemForm';

const ItemFormContainer = ({
  user_id,
  lists,
  item,
  onClose,
  onSuccess,
}: {
  user_id: string;
  lists: ListTable[];
  item?: ItemTable & { stores: ItemStoreTable[]; lists: ListTable[] };
  onClose: () => void;
  onSuccess?: () => void;
}) => {
  return (
    <ItemForm
      user_id={user_id}
      lists={lists}
      item={item}
      onSuccess={onSuccess}
      onClose={onClose}
    />
  );
};

export default ItemFormContainer;
