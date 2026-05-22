'use client';

import { CheckboxField, TextField } from '@/app/ui/components/field';
import { ChangeEvent } from 'react';

interface QuantityLimitFieldProps {
  value: number | null;
  onChange: (value: number | null) => void;
  isPending?: boolean;
  error?: string;
}

export function QuantityLimitField({
  value,
  onChange,
  isPending,
  error = '',
}: QuantityLimitFieldProps) {
  const isUnlimited = value === null;

  const handleUnlimitedToggle = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.checked ? null : 1);
  };

  const handleNumberChange = (e: ChangeEvent<HTMLInputElement>) => {
    const parsed = parseInt(e.target.value, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      onChange(parsed);
    } else if (e.target.value === '') {
      onChange(1);
    }
  };

  return (
    <div className="quantity-limit-control">
      <TextField
        type="number"
        label="Quantity Limit"
        error={error || undefined}
        name="quantity_limit"
        min={1}
        step={1}
        value={isUnlimited ? '' : (value ?? 1)}
        onChange={handleNumberChange}
        disabled={isPending || isUnlimited}
        placeholder="Unlimited"
      />
      <CheckboxField
        label="Unlimited"
        checked={isUnlimited}
        onChange={handleUnlimitedToggle}
        disabled={isPending}
      />
    </div>
  );
}
