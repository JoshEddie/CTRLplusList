'use client';

import ItemPhoto from '@/app/(main)/items/ui/components/ItemPhoto';
import PriceLine from '@/app/(main)/items/ui/components/PriceLine';
import Modal from '@/app/(main)/items/ui/components/purchasemodal/Modal';
import ViewItemLink from '@/app/(main)/items/ui/components/ViewItemLink';
import { Button } from '@/app/ui/components/button';
import { Stepper } from '@/app/ui/components/stepper';
import { MAX_ENTRY_QUANTITY } from '@/lib/data/listItems.schema';
import { getMessage } from '@/lib/i18n/utils';
import { ItemDisplay } from '@/lib/types';

// The row's sheet, where the row is too narrow to carry the note, the store
// link and a five-cell stepper at once. Quantity is staged like every other
// edit — Done only closes; the footer's Save is what writes.
export default function EditModeQuantitySheet({
  item,
  quantity,
  onQuantityChange,
  onClose,
}: {
  item: ItemDisplay;
  /** Staged units wanted here; 0 is not in the list at all. */
  quantity: number;
  onQuantityChange: (itemId: string, quantity: number) => void;
  onClose: () => void;
}) {
  const name = item.name ?? '';
  return (
    <Modal className="edit-mode-sheet" onClose={onClose}>
      <div className="edit-mode-sheet-body">
        <div className="edit-mode-sheet-head">
          <ItemPhoto itemId={item.id} name={name} url={item.image_url || ''} />
          <div className="edit-mode-sheet-heading">
            <h3 className="edit-mode-sheet-name">{name}</h3>
            <PriceLine item={item} />
          </div>
        </div>
        {item.description && (
          <p className="edit-mode-sheet-note">{item.description}</p>
        )}
        <Stepper
          label={
            quantity > 0
              ? getMessage('edit_mode_wants_label', { count: quantity })
              : getMessage('edit_mode_not_in_list_sheet_heading')
          }
          value={quantity}
          min={0}
          max={MAX_ENTRY_QUANTITY}
          onChange={(next) => onQuantityChange(item.id, next)}
        />
        <div className="edit-mode-sheet-actions">
          <ViewItemLink store={item.store} />
          <Button variant="primary" onClick={onClose}>
            {getMessage('edit_mode_sheet_done_label')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
