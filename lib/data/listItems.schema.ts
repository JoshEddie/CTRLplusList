import { z } from 'zod';

// The ceiling is not a product rule about gift lists — it is where a number
// stops being a quantity and starts being an integer overflow. The field and
// the action read the same schema so neither can drift from the other.
export const MAX_ENTRY_QUANTITY = 999;

export const EntryQuantitySchema = z
  .number()
  .int()
  .min(1)
  .max(MAX_ENTRY_QUANTITY);

export const ENTRY_QUANTITY_ERROR = `Quantity must be a whole number between 1 and ${MAX_ENTRY_QUANTITY}`;
