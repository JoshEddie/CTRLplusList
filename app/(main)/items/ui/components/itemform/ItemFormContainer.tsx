import { ListTable } from '@/lib/types';
import ItemForm from './ItemForm';

const ItemFormContainer = ({
  user_id,
  lists,
  onClose,
  onSuccess,
}: {
  user_id: string;
  lists: ListTable[];
  onClose: () => void;
  onSuccess?: () => void;
}) => {
  return (
    <ItemForm
      user_id={user_id}
      lists={lists}
      onSuccess={onSuccess}
      onClose={onClose}
    />
  );
};

export default ItemFormContainer;
