import { ListTable } from '@/lib/types';
import ListForm from './ListForm';

export default function ListFormContainer({
  list,
  isEditing,
  onClose,
  onSuccess,
}: {
  list?: ListTable;
  isEditing?: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  return (
    <ListForm
      list={list}
      isEditing={isEditing}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}
