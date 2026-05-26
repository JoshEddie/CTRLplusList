-- Migration: harden-server-action-authorization (openspec change)
--
-- Adds a partial unique index that backstops `createPurchase` against
-- duplicate authenticated claims on the same item. Pairs with the new
-- transactional row lock in `createPurchase` (the lock catches capacity
-- races; this index catches same-user duplicates).
--
-- Rollback (run manually if needed):
--   DROP INDEX IF EXISTS "purchases_item_user_unique_idx";
-- Non-destructive: drops only the index, no data loss.
--
-- Pre-flight (must pass before applying in prod — Vercel Postgres console):
--   SELECT (item_id, user_id), COUNT(*) FROM purchases
--   WHERE user_id IS NOT NULL GROUP BY (item_id, user_id) HAVING COUNT(*) > 1;
-- If rows return, ship a one-off cleanup migration first.

CREATE UNIQUE INDEX IF NOT EXISTS "purchases_item_user_unique_idx" ON "purchases" USING btree ("item_id","user_id") WHERE "purchases"."user_id" IS NOT NULL;
