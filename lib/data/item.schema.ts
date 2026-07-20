import { MAX_IMAGE_CANDIDATES } from '@/lib/imageCandidates';
import {
  PLACEHOLDER_URI_MAX_LENGTH,
  isPlaceholderUri,
} from '@/lib/placeholderArt.shared';
import { z } from 'zod';

function isHttpUrl(val: string): boolean {
  try {
    const url = new URL(val);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// Define Zod schema for item validation. The actor's user_id is resolved
// server-side from the session, never accepted from the client payload — see
// openspec/specs/server-endpoint-authorization.
export const ItemSchema = z.object({
  name: z
    .string()
    .min(3, 'Item name must be at least 3 characters')
    .max(100, 'Item name must be less than 100 characters'),

  description: z
    .string()
    .max(100, 'Description must be less than 100 characters')
    .optional(),

  image_url: z
    .string()
    .nullish()
    .superRefine((val, ctx) => {
      // If the value is empty or undefined, it's valid
      if (!val) return true;

      // Otherwise, validate it as a URL
      try {
        new URL(val);
        return true;
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please provide a valid URL',
        });
        return false;
      }
    }),

  // Up to MAX_IMAGE_CANDIDATES http(s) URLs, plus at most one size-capped
  // placeholder-art data URI that is exempt from the cap — a placeholder never
  // displaces a real fetched image. Any other data: URI is invalid.
  image_candidates: z
    .array(z.string())
    .superRefine((candidates, ctx) => {
      const placeholders = candidates.filter(isPlaceholderUri);
      const rest = candidates.filter((val) => !isPlaceholderUri(val));
      if (rest.some((val) => !isHttpUrl(val))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Image candidates must be valid image URLs',
        });
      }
      if (rest.length > MAX_IMAGE_CANDIDATES) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `At most ${MAX_IMAGE_CANDIDATES} image candidates are allowed`,
        });
      }
      if (placeholders.length > 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'At most one placeholder image is allowed',
        });
      }
      if (placeholders.some((val) => val.length > PLACEHOLDER_URI_MAX_LENGTH)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Placeholder image is too large',
        });
      }
    })
    .optional(),

  quantity_limit: z
    .number()
    .int('Quantity limit must be a whole number')
    .min(1, 'Quantity limit must be at least 1')
    .nullable(),
  lists: z
    .array(
      z.object({
        value: z.string(),
        label: z.string(),
      })
    )
    .optional(),
  store: z
    .object({
      name: z.string().optional(),
      link: z.string().optional(),
      price: z.string().optional(),
      price_fetched_at: z.string().datetime().nullable().optional(),
      canonical_url: z.string().nullable().optional(),
      currency: z.string().nullable().optional(),
    })
    .nullish()
    .refine(
      (store) => {
        if (!store) return true;
        const hasAnyField = store.name || store.link || store.price;
        if (!hasAnyField) return true;
        if (!store.name || !store.link || !store.price) return false;

        try {
          new URL(store.link);
          return true;
        } catch {
          return false;
        }
      },
      {
        message: 'Please provide a valid URL',
        path: ['store'],
      }
    ),
});

export type ItemData = z.infer<typeof ItemSchema>;
