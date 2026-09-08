'use client';

import { Stepper } from '@/app/ui/components/stepper';
import { MAX_ENTRY_QUANTITY } from '@/lib/data/listItems.schema';
import { getMessage } from '@/lib/i18n/utils';

// The card's own membership control, rendered as the footer's last row so it
// reads as an extension of the claim banner above it. Its floor is 0 rather
// than 1 because 0 is what "not on this list" means, and reaching it is the
// same operation the menu's Remove from list performs.
export default function EntryStepper({
  name,
  quantity,
  onChange,
}: {
  name: string;
  quantity: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="item-entry-stepper">
      <Stepper
        label={getMessage('entry_stepper_label', { name })}
        value={quantity}
        min={0}
        max={MAX_ENTRY_QUANTITY}
        compact
        onChange={onChange}
      />
    </div>
  );
}
