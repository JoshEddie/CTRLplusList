'use client';

import { TextField } from '@/app/ui/components/field';
import type { ReactNode } from 'react';
import AccentPicker from './AccentPicker';

// The three fields both writers share. The tagline's `maxLength` mirrors its
// server contract client-side per profiles-data-model; the trim-to-null is the
// schema's own transform, not restated here.
export default function ProfileFields({
  name,
  onNameChange,
  tagline,
  onTaglineChange,
  accent,
  onAccentChange,
  disabled,
  errors,
  preview,
}: {
  name: string;
  onNameChange: (value: string) => void;
  tagline: string;
  onTaglineChange: (value: string) => void;
  accent: string;
  onAccentChange: (accent: string) => void;
  disabled?: boolean;
  errors?: Record<string, string[]>;
  /** Filled by the birth form, which has no surface of its own to repaint;
      the profile space leaves it empty because its own head is the preview. */
  preview?: ReactNode;
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

      {preview}

      <AccentPicker
        value={accent}
        onChange={onAccentChange}
        disabled={disabled}
      />
    </>
  );
}
