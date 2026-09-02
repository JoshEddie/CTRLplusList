'use client';

import { TextField } from '@/app/ui/components/field';
import {
  EntryQuantitySchema,
  MAX_ENTRY_QUANTITY,
} from '@/lib/data/listItems.schema';
import { useState } from 'react';
import '../styles/item.css';
import Modal from './purchasemodal/Modal';
import ModalButtons from './purchasemodal/ModalButtons';

export default function QuantityDialog({
  quantity,
  onClose,
  onSave,
}: {
  /** The entry's current quantity — the field's starting value. */
  quantity: number;
  onClose: () => void;
  onSave: (next: number) => void;
}) {
  const [value, setValue] = useState(String(quantity));
  const parsed = Number(value);
  // A blank field parses to 0 rather than NaN, so emptiness is its own test.
  const valid =
    value.trim() !== '' && EntryQuantitySchema.safeParse(parsed).success;

  return (
    <Modal onClose={onClose}>
      <div className="entry-quantity">
        <h3 className="entry-quantity-title">How many do you want?</h3>
        <TextField
          label="Quantity"
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_ENTRY_QUANTITY}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          description="Just for this list — the same item can ask for a different number on another."
        />
        <ModalButtons
          primary_button_text="Save"
          primary_button_disabled={!valid}
          primary_button_onclick={() => {
            onSave(parsed);
            onClose();
          }}
          secondary_button_text="Cancel"
          secondary_button_onclick={onClose}
        />
      </div>
    </Modal>
  );
}
