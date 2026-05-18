import { ListTable } from '@/lib/types';
import Modal from '../purchasemodal/Modal';
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
    <Modal className="item-form-modal" onClose={onClose}>
      <ItemForm user_id={user_id} lists={lists} onSuccess={onSuccess} />
    </Modal>
  );
};

export default ItemFormContainer;
