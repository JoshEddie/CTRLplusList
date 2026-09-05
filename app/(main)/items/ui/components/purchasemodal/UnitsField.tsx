'use client';

import { Button } from '@/app/ui/components/button';
import { Stepper } from '@/app/ui/components/stepper';
import { getMessage } from '@/lib/i18n/utils';
import type { ReactNode } from 'react';

// An editor saves the number on its own, so it needs the number it would be
// saving over; the claim flow's CTA carries the number instead and has nothing
// to save over yet.
type SaveVariant =
  | { onSubmit: (units: number) => void; saved: number }
  | { onSubmit?: never; saved?: never };

// How many units a claim covers, wherever one is chosen: the claim flow before
// the claim lands, and the two places it can be moved afterwards. Capped at
// what the entry still has room for, so the control cannot offer a number the
// capacity guard would refuse.
export default function UnitsField({
  label,
  status,
  value,
  max,
  onChange,
  onSubmit,
  saved,
}: {
  label: string;
  /** What the entry already has spoken for, where the surface may say. */
  status?: ReactNode;
  value: number;
  max: number;
  onChange: (next: number) => void;
} & SaveVariant) {
  return (
    <div className="claim-units">
      <Stepper
        label={label}
        status={status}
        value={value}
        max={max}
        onChange={onChange}
      />
      {onSubmit && (
        <Button
          variant="primary"
          disabled={value === saved}
          onClick={() => onSubmit(value)}
        >
          {value === saved
            ? getMessage('claim_units_update_label')
            : getMessage('claim_units_update_to_label', { units: value })}
        </Button>
      )}
    </div>
  );
}
