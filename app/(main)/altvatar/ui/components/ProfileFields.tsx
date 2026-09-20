'use client';

import { TextField } from '@/app/ui/components/field';

// The two text fields both writers share. The tagline's `maxLength` mirrors its
// server contract client-side; the trim-to-null is the
// schema's own transform, not restated here.
export default function ProfileFields({
  name,
  onNameChange,
  tagline,
  onTaglineChange,
  disabled,
  errors,
}: {
  name: string;
  onNameChange: (value: string) => void;
  tagline: string;
  onTaglineChange: (value: string) => void;
  disabled?: boolean;
  errors?: Record<string, string[]>;
}) {
  return (
    <>
      <TextField
        label="Name"
        required
        name="name"
        placeholder="Display name"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        disabled={disabled}
        maxLength={60}
        error={errors?.name?.join(', ')}
      />

      <TextField
        label="Tagline"
        name="tagline"
        value={tagline}
        onChange={(e) => onTaglineChange(e.target.value)}
        disabled={disabled}
        placeholder="Short description"
        maxLength={40}
        error={errors?.tagline?.join(', ')}
      />
    </>
  );
}
