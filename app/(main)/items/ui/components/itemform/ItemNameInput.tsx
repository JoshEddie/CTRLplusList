// ItemNameInput.tsx
'use client';

import { FormGroup, FormLabel } from '@/app/ui/components/Form/Form';
import TooltipWrapper from '@/app/ui/components/TooltipWrapper';

interface ItemNameInputProps {
  value: string;
  error: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function ItemNameInput({ value, error, onChange, disabled }: ItemNameInputProps) {
  return (
    <FormGroup>
      <FormLabel>Name*</FormLabel>
      <TooltipWrapper
        className={`input-tooltip ${error ? 'form-error' : ''}`}
        tooltip={error}
      >
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`form-input ${error ? 'form-input-error' : ''}`}
          placeholder="Item Name"
          required
          autoComplete="off"
        />
      </TooltipWrapper>
    </FormGroup>
  );
}