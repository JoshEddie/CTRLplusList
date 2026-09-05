import { z } from 'zod';

// Two digits is as far as an occasion's ask goes, so the stepper's jump-to-max
// stays a number somebody would actually pick. The field and the action read
// the same schema so neither can drift from the other.
export const MAX_ENTRY_QUANTITY = 99;

export const EntryQuantitySchema = z
  .number()
  .int()
  .min(1)
  .max(MAX_ENTRY_QUANTITY);

export const ENTRY_QUANTITY_ERROR = `Quantity must be a whole number between 1 and ${MAX_ENTRY_QUANTITY}`;
