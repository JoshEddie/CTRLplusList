'use client';

import { Button } from '@/app/ui/components/button';
import { TextField } from '@/app/ui/components/field';
import { getMessage } from '@/lib/i18n/utils';
import { clampUnits } from '../utils';

// How many units a claim covers, wherever one is chosen: the claim flow before
// the claim lands, and the two places it can be moved afterwards. Capped at
// what the entry still has room for, so the control cannot offer a number the
// capacity guard would refuse.
export default function UnitsField({
  label,
  description,
  value,
  max,
  onChange,
  onSubmit,
}: {
  label: string;
  /** What is still free, where the cap IS the entry's remainder — so a viewer reads how much room there is before committing. Absent on an editor whose ceiling includes the claim's own units, which is not a remainder. */
  description?: string;
  value: string;
  max: number;
  onChange: (next: string) => void;
  /** Present where the number is saved on its own; absent where a claim CTA carries it. */
  onSubmit?: (units: number) => void;
}) {
  const units = clampUnits(value, max);
  return (
    <div className="claim-units">
      <TextField
        label={label}
        description={description}
        type="number"
        inputMode="numeric"
        min={1}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {onSubmit && (
        <Button
          variant="secondary"
          disabled={units === null}
          onClick={() => units !== null && onSubmit(units)}
        >
          {getMessage('claim_units_update_label')}
        </Button>
      )}
    </div>
  );
}
