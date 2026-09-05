-- Migration: quantity-belongs-to-the-entry (the contract half of the
-- quantity-moves-to-the-list-entry change)
--
-- Drops `items.quantity_limit`, which 0018 backfilled into
-- `list_items.quantity` and left in place while the read paths moved over.
-- Nothing reads it any more: capacity is the entry's, per occasion, and an
-- unlimited quantity no longer exists anywhere to express.
--
-- Forward-only. Rollback in shape (the values are not recoverable — the
-- entries they were copied to are now authoritative and may have diverged):
--   ALTER TABLE "items" ADD COLUMN "quantity_limit" integer DEFAULT 1;

ALTER TABLE "items" DROP COLUMN IF EXISTS "quantity_limit";
