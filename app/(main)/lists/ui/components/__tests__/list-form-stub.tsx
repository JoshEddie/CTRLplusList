import type { ListTable } from '@/lib/types';

/**
 * Inert stand-in for `ListFormContainer`, shared by every test that only needs
 * to prove a surface opened the list form and handed it the right list and
 * owner floor. One home so the attributes the assertions read cannot drift
 * apart between the surfaces.
 */
export function ListFormContainerStub({
  list,
  isEditing,
  deleteDisabled,
  onClose,
}: {
  list?: ListTable;
  isEditing?: boolean;
  deleteDisabled?: boolean;
  onClose: () => void;
}) {
  return (
    <div
      data-testid="list-form-container"
      data-editing={String(!!isEditing)}
      data-list-id={list?.id}
      data-delete-disabled={String(!!deleteDisabled)}
    >
      <button type="button" onClick={onClose}>
        close-form
      </button>
    </div>
  );
}
