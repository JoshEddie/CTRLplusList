'use client';

import ItemPhoto from '@/app/(main)/items/ui/components/ItemPhoto';
import PriceLine from '@/app/(main)/items/ui/components/PriceLine';
import ViewItemLink from '@/app/(main)/items/ui/components/ViewItemLink';
import { Button } from '@/app/ui/components/button';
import { Stepper } from '@/app/ui/components/stepper';
import { MAX_ENTRY_QUANTITY } from '@/lib/data/listItems.schema';
import { getMessage } from '@/lib/i18n/utils';
import { ItemDisplay } from '@/lib/types';
import type { ReactNode } from 'react';

// No claim state on purpose: a claim belongs to a list entry, not to an item,
// so a library row surfaced here carries none this list could judge.
//
// Two affordances per row, one of each pair always `display: none`: the inline
// stepper the desktop row has the width for against the chip that opens the
// row's sheet where it does not, and with them the name — a sheet trigger only
// below the breakpoint, where the note and the store link have nowhere else to
// live. A hidden element leaves the accessibility tree with it, so each pair
// offers exactly one control.
export default function EditModeRow({
  item,
  quantity,
  pending,
  onQuantityChange,
  onOpen,
  handle,
}: {
  item: ItemDisplay;
  /** Staged units wanted here; 0 is not in the list at all. */
  quantity: number;
  /** Differs from what is saved — added, removed, re-quantified, or moved. */
  pending: boolean;
  onQuantityChange: (itemId: string, quantity: number) => void;
  onOpen: (item: ItemDisplay) => void;
  /** The drag handle, supplied only by the sortable wrapper. */
  handle?: ReactNode;
}) {
  const inList = quantity > 0;
  const name = item.name ?? '';
  return (
    <div
      className={`edit-mode-row ${inList ? 'is-on' : 'is-off'}${
        pending ? ' is-pending' : ''
      }`}
    >
      <div className="edit-mode-row-handle">{handle}</div>
      <ItemPhoto itemId={item.id} name={name} url={item.image_url || ''} />
      <div className="edit-mode-row-main">
        {/* The dot is outside the pair so it is stated once however the name
            is rendered. Reading, never adding: the sheet opens at whatever is
            staged, including 0, and only its stepper adds the item. */}
        <div className="edit-mode-row-nameline">
          <button
            type="button"
            className="itemName edit-mode-row-name"
            onClick={() => onOpen(item)}
          >
            {name}
          </button>
          <span className="itemName edit-mode-row-name-static">{name}</span>
          {pending && (
            <span
              className="edit-mode-pending"
              role="img"
              aria-label={getMessage('edit_mode_pending_change_label')}
            />
          )}
        </div>
        <div className="edit-mode-row-meta">
          <PriceLine item={item} />
          <ViewItemLink
            store={item.store}
            size="sm"
            className="edit-mode-row-view"
          />
        </div>
        {item.description && (
          <p className="edit-mode-row-note">{item.description}</p>
        )}
      </div>
      <div className="edit-mode-row-stepper">
        <Stepper
          label={
            inList
              ? getMessage('edit_mode_wants_label', { count: quantity })
              : getMessage('edit_mode_not_in_list_label')
          }
          value={quantity}
          min={0}
          max={MAX_ENTRY_QUANTITY}
          onChange={(next) => onQuantityChange(item.id, next)}
        />
      </div>
      <Button
        variant={inList ? 'primary' : 'secondary'}
        className="edit-mode-row-chip"
        aria-label={getMessage(
          inList ? 'edit_mode_quantity_chip_label' : 'edit_mode_add_chip_label',
          { name }
        )}
        onClick={() => onOpen(item)}
      >
        {inList
          ? getMessage('edit_mode_quantity_chip_text', { count: quantity })
          : getMessage('edit_mode_add_chip_text')}
      </Button>
    </div>
  );
}
