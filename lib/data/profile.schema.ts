import { isAccentName } from '@/lib/accent';
import { AltvatarSchema } from '@/lib/data/profileAvatar.write';
import { z } from 'zod';

// Zod contract for every profile writer. Internal, not an actions export: a
// `'use server'` module's exports are client-callable endpoints, and a schema
// is not one.
//
// Split in two because the settings surface commits them separately: the fields
// wait for a submit, while the identity commits the moment the customizer is
// confirmed. Creation writes all four at once and composes them back below.
export const ProfileFieldsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(60, 'Name must be 60 characters or less'),

  // Trim first, then cap: the 40 bounds what is stored, and a blank tagline is
  // NULL rather than ''.
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
});

export const ProfileIdentitySchema = z.object({
  accent: z
    .string()
    .refine(isAccentName, { message: 'Choose an accent colour' }),

  // Selections only — the rendering is derived server-side by `writeAltvatar`,
  // never taken from the payload.
  altvatar: AltvatarSchema,
});

export const ProfileSettingsSchema = ProfileFieldsSchema.extend(
  ProfileIdentitySchema.shape
);

// The input side: the forms hold whatever the radio group produced, and this
// schema's refine is what narrows `accent` to a preset.
export type ProfileFieldsData = z.input<typeof ProfileFieldsSchema>;
export type ProfileIdentityData = z.input<typeof ProfileIdentitySchema>;
export type ProfileSettingsData = z.input<typeof ProfileSettingsSchema>;
