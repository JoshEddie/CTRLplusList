import { ListTable } from '@/lib/types';
import ListForm from './ListForm';

export default function ListFormContainer({
  list,
  isEditing,
  actingAs,
  deleteDisabled,
  onClose,
  onSuccess,
}: {
  list?: ListTable;
  isEditing?: boolean;
  actingAs?: string;
  deleteDisabled?: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  return (
    <ListForm
      list={list}
      isEditing={isEditing}
      actingAs={actingAs}
      deleteDisabled={deleteDisabled}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}
