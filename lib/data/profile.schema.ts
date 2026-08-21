import { isAccentName } from '@/lib/accent';
import { z } from 'zod';

// Zod contract for both profile writers. Internal, not an actions export: a
// `'use server'` module's exports are client-callable endpoints, and a schema
// is not one — see openspec/specs/data-layer-organization.
export const ProfileSettingsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(60, 'Name must be 60 characters or less'),

  // Trim first, then cap: the 40 bounds what is stored, and a blank tagline is
  // NULL rather than '' (profiles-data-model).
  tagline: z
    .string()
    .optional()
    .nullable()
    .transform((v) => {
      const trimmed = v?.trim() ?? '';
      return trimmed === '' ? null : trimmed;
    })
    .refine((v) => v === null || v.length <= 40, {
      message: 'Tagline must be 40 characters or less',
    }),

  accent: z
    .string()
    .refine(isAccentName, { message: 'Choose an accent colour' }),
});

// The input side: the forms hold whatever the radio group produced, and this
// schema's refine is what narrows `accent` to a preset.
export type ProfileSettingsData = z.input<typeof ProfileSettingsSchema>;
