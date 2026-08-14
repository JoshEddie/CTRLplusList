-- item-placeholder-art: DB backstop for the guest-callable mint path.
-- At most one active image row per item, enforced by a partial-unique index so
-- concurrent check-then-insert mints (no transactions on neon-http) collapse to
-- one winner via ON CONFLICT DO NOTHING.
--
-- The dedupe and the index creation share one DO block: each top-level
-- statement is its own HTTP round-trip on this driver, so this is the only way
-- "deactivate strays, then constrain" applies atomically.
--
-- Dedupe keeps the lowest-id active row per item — the same row every read
-- already resolves via `active ORDER BY id LIMIT 1` — so no displayed image
-- changes.
--
-- Rollback: DROP INDEX IF EXISTS "item_images_one_active_idx". Deactivated
-- stray rows stay inactive; the pre-change read path never showed them.
DO $$ BEGIN
 UPDATE "item_images" AS im
 SET "active" = false
 WHERE im."active"
   AND im."id" <> (
     SELECT min(inner_im."id")
     FROM "item_images" AS inner_im
     WHERE inner_im."item_id" = im."item_id" AND inner_im."active"
   );
 CREATE UNIQUE INDEX IF NOT EXISTS "item_images_one_active_idx" ON "item_images" USING btree ("item_id") WHERE "item_images"."active";
END $$;
