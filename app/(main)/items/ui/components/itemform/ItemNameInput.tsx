'use client';

import { TextField } from '@/app/ui/components/field';

interface ItemNameInputProps {
  value: string;
  error: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function ItemNameInput({
  value,
  error,
  onChange,
  disabled,
}: ItemNameInputProps) {
  return (
    <TextField
      label="Name"
      required
      error={error || undefined}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder="Item Name"
      autoComplete="off"
    />
  );
}
