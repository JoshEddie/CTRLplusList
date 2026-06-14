import { z } from 'zod';

// Define Zod schema for item validation. The actor's user_id is resolved
// server-side from the session, never accepted from the client payload — see
// openspec/specs/server-endpoint-authorization.
export const ItemSchema = z.object({
  name: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title must be less than 100 characters'),

  description: z.string().optional(),

  image_url: z
    .string()
    .optional()
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

  image_candidates: z
    .array(
      z.string().refine(
        (val) => {
          try {
            const url = new URL(val);
            return url.protocol === 'http:' || url.protocol === 'https:';
          } catch {
            return false;
          }
        },
        { message: 'Image candidates must be valid http(s) URLs' }
      )
    )
    .max(10, 'At most 10 image candidates are allowed')
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
  stores: z
    .array(
      z.object({
        name: z.string().optional(),
        link: z.string().optional(),
        price: z.string().optional(),
        price_fetched_at: z.string().datetime().nullable().optional(),
        canonical_url: z.string().nullable().optional(),
        currency: z.string().nullable().optional(),
      })
    )
    .optional()
    .refine(
      (stores) => {
        if (!stores) return true;
        return stores.every((store) => {
          const hasAnyField = store.name || store.link || store.price;
          if (!hasAnyField) return true;
          if (!store.name || !store.link || !store.price) return false;

          try {
            new URL(store.link);
            return true;
          } catch {
            return false;
          }
        });
      },
      {
        message: 'Please provide a valid URL',
        path: ['stores'],
      }
    ),
});

export type ItemData = z.infer<typeof ItemSchema>;
