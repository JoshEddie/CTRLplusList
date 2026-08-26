import { ListTable } from '@/lib/types';
import ListForm from './ListForm';

export default function ListFormContainer({
  list,
  isEditing,
  actingAs,
  onClose,
  onSuccess,
}: {
  list?: ListTable;
  isEditing?: boolean;
  actingAs?: string;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  return (
    <ListForm
      list={list}
      isEditing={isEditing}
      actingAs={actingAs}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}
