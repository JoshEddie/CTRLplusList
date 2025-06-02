// ImageUrlInput.tsx
'use client';

import { FormGroup, FormLabel } from '@/app/ui/components/Form/Form';

interface ImageUrlInputProps {
  value?: string | null;
  error: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function ImageUrlInput({ value, error, onChange, disabled }: ImageUrlInputProps) {
  return (
    <FormGroup>
      <FormLabel>Image URL</FormLabel>
      <input
          type="url"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`form-input ${error ? 'form-input-error' : ''}`}
          placeholder="https://example.com/image.jpg"
          autoComplete="off"
        />
      <div className="input-error">
        {error}
      </div>
    </FormGroup>
  );
}