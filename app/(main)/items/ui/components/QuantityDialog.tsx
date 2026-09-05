'use client';

import { Stepper } from '@/app/ui/components/stepper';
import { MAX_ENTRY_QUANTITY } from '@/lib/data/listItems.schema';
import { getMessage } from '@/lib/i18n/utils';
import { useState } from 'react';
import '../styles/item.css';
import Modal from './purchasemodal/Modal';
import ModalButtons from './purchasemodal/ModalButtons';

export default function QuantityDialog({
  quantity,
  onClose,
  onSave,
}: {
  /** The entry's current quantity — the control's starting value. */
  quantity: number;
  onClose: () => void;
  onSave: (next: number) => void;
}) {
  const [value, setValue] = useState(quantity);

  return (
    <Modal onClose={onClose}>
      <div className="entry-quantity">
        <h3 className="entry-quantity-title">
          {getMessage('entry_quantity_title')}
        </h3>
        <Stepper
          label={getMessage('entry_quantity_field_label')}
          value={value}
          max={MAX_ENTRY_QUANTITY}
          onChange={setValue}
          description={getMessage('entry_quantity_description')}
        />
        <ModalButtons
          primary_button_text={getMessage('entry_quantity_save_label')}
          primary_button_onclick={() => {
            onSave(value);
            onClose();
          }}
          secondary_button_text={getMessage('entry_quantity_cancel_label')}
          secondary_button_onclick={onClose}
        />
      </div>
    </Modal>
  );
}
