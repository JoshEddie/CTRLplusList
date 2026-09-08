'use client';

import ItemCard from '@/app/(main)/items/ui/components/ItemCard';
import { containerClasses } from '@/app/(main)/items/ui/components/utils';
import ViewItemLink from '@/app/(main)/items/ui/components/ViewItemLink';
import { Stepper } from '@/app/ui/components/stepper';
import { MAX_ENTRY_QUANTITY } from '@/lib/data/listItems.schema';
import { getMessage } from '@/lib/i18n/utils';
import { ItemDisplay } from '@/lib/types';
import { statusLabel, type RowStatus } from './editModeRows';

// The stepper's label is for assistive technology only: membership
// reads from the card's outline and its status line, and the stepper's own
// number says the quantity.
export default function EditModeCard({
  item,
  quantity,
  status,
  onQuantityChange,
}: {
  item: ItemDisplay;
  quantity: number;
  status: RowStatus;
  onQuantityChange: (itemId: string, quantity: number) => void;
}) {
  const line =
    statusLabel(status) ??
    (quantity > 0 ? getMessage('edit_mode_card_on_list') : '');
  return (
    <div
      className={containerClasses({
        className: `edit-mode-card edit-mode-card--${status}${
          quantity > 0 ? ' is-on' : ''
        }`,
        isOwner: true,
        purchased: false,
        hasMyClaim: false,
      })}
    >
      <ItemCard
        item={item}
        entryLine={line}
        actions={
          <div className="edit-mode-card-actions">
            <Stepper
              label={getMessage('edit_mode_card_stepper_label', {
                name: item.name,
              })}
              value={quantity}
              min={0}
              max={MAX_ENTRY_QUANTITY}
              onChange={(next) => onQuantityChange(item.id, next)}
            />
            <ViewItemLink store={item.store} size="sm" />
          </div>
        }
      />
    </div>
  );
}
