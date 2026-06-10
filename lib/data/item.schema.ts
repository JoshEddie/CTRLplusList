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

  // Optional fields
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
      })
    )
    .optional()
    .refine(
      (stores) => {
        if (!stores) return true;
        return stores.every((store) => {
          const hasAnyField = store.name || store.link || store.price;
          const hasAllFields = store.name && store.link && store.price;

          // If no fields are filled, it's valid
          if (!hasAnyField) return true;

          // If any field is filled, all must be filled
          if (!hasAllFields) return false;

          // Validate URL format if link is provided
          /* v8 ignore next -- hasAllFields above guarantees link is truthy, so this guard's false branch is unreachable */
          if (store.link) {
            try {
              new URL(store.link);
              return true;
            } catch {
              return false;
            }
          }
          /* v8 ignore next -- unreachable: the if above always returns when link is truthy (and hasAllFields guarantees it is) */
          return true;
        });
      },
      {
        message: 'Please provide a valid URL',
        path: ['stores'],
      }
    ),
});

export type ItemData = z.infer<typeof ItemSchema>;
