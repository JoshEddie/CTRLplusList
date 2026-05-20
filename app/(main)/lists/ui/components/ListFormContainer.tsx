import { ListTable } from '@/lib/types';
import ListForm from './ListForm';

export default function ListFormContainer({
  user_id,
  list,
  isEditing,
  onClose,
  onSuccess,
}: {
  user_id: string;
  list?: ListTable;
  isEditing?: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  return (
    <ListForm
      user_id={user_id}
      list={list}
      isEditing={isEditing}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}
