'use client';

import { FormGroup, FormInput, FormLabel } from '@/app/ui/components/Form/Form';
import TooltipWrapper from '@/app/ui/components/TooltipWrapper';
import { ChangeEvent } from 'react';

interface QuantityLimitInputProps {
  value: number | null;
  onChange: (value: number | null) => void;
  isPending?: boolean;
  error?: string;
}

export function QuantityLimitSelect({
  value,
  onChange,
  isPending,
  error = '',
}: QuantityLimitInputProps) {
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
    <FormGroup>
      <FormLabel>Quantity Limit</FormLabel>
      <TooltipWrapper
        className={`input-tooltip ${error ? 'form-error' : ''}`}
        tooltip={error}
      >
        <div className="quantity-limit-control">
          <FormInput
            type="number"
            name="quantity_limit"
            min={1}
            step={1}
            value={isUnlimited ? '' : value ?? 1}
            onChange={handleNumberChange}
            disabled={isPending || isUnlimited}
            className={error ? 'form-input-error' : ''}
            placeholder="Unlimited"
          />
          <label className="unlimited-toggle">
            <input
              type="checkbox"
              checked={isUnlimited}
              onChange={handleUnlimitedToggle}
              disabled={isPending}
            />
            Unlimited
          </label>
        </div>
      </TooltipWrapper>
    </FormGroup>
  );
}
