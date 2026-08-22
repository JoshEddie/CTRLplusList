'use client';

import { useState } from 'react';
import { FaDollarSign } from 'react-icons/fa6';
import { MdClose } from 'react-icons/md';
import { FormField } from './FormField';

const PRICE_FORMATTER = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const DOLLAR_ICON = <FaDollarSign aria-hidden="true" />;

interface PriceFieldProps {
  amount: number | null;
  onChange: (value: number) => void;
  /** Opt-in clear affordance: renders a trailing in-field button that empties
   *  the field to the no-price state. Incremental backspace still bottoms out
   *  at $0.00 by design — typed 0 stays a real, valid price. */
  onClear?: () => void;
  allowNegative?: boolean;
  label?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  'aria-label'?: string;
}

/**
 * Currency input. Uses cents-as-integer math with formatted-string display —
 * `inputMode="numeric"` (NOT `"decimal"`, which is buggy across mobile
 * browsers). The dollar-sign icon is locked.
 */
export function PriceField({
  amount,
  onChange,
  onClear,
  allowNegative = false,
  label,
  error,
  required,
  disabled,
  autoFocus,
  className,
  'aria-label': ariaLabel,
}: PriceFieldProps) {
  const [isNegative, setIsNegative] = useState(amount !== null && amount < 0);

  const handleChange = (value: string) => {
    let negative = false;

    if (!allowNegative || (isNegative && value[value.length - 1] === '-')) {
      setIsNegative(false);
    } else if (allowNegative && value.includes('-')) {
      negative = true;
      setIsNegative(true);
    }

    const digits = value.replace(/\D/g, '');
    const cents = Number(digits || '0');
    const next = ((negative ? -1 : 1) * cents) / 100;
    onChange(next);
  };

  const formatted =
    amount === null ? '' : PRICE_FORMATTER.format(Math.abs(amount));
  const display = isNegative ? `-${formatted}` : formatted;

  const showClear = onClear !== undefined && amount !== null && !disabled;

  return (
    <FormField
      label={label}
      error={error}
      required={required}
      disabled={disabled}
      icon={DOLLAR_ICON}
      iconPosition="left"
      className={className}
      trailing={
        showClear ? (
          <button
            type="button"
            className="price_field_clear"
            onClick={() => {
              setIsNegative(false);
              onClear();
            }}
            aria-label="Clear price"
          >
            <MdClose aria-hidden="true" />
          </button>
        ) : undefined
      }
    >
      <input
        type="text"
        inputMode="numeric"
        className="form_field_input"
        value={display}
        onChange={(e) => handleChange(e.target.value)}
        disabled={disabled}
        placeholder="0.00"
        autoFocus={autoFocus}
        aria-label={ariaLabel}
      />
    </FormField>
  );
}

PriceField.displayName = 'PriceField';
