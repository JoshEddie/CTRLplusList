-- item-image-candidates: the per-item image pool + active-image pointer.
-- item_images.active replaces items.image_url as the active pointer. This is the
-- EXPAND step of an expand/contract migration — items.image_url is left in place
-- and untouched here; a later CONTRACT migration drops it once nothing reads or
-- writes it.
--
-- Rollback: DROP TABLE item_images. items.image_url still holds every active URL
-- (never modified by this migration), so the pre-change read path keeps working.

CREATE TABLE IF NOT EXISTS "item_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" text NOT NULL,
	"url" text NOT NULL,
	"active" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "item_images" ADD CONSTRAINT "item_images_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
-- Backfill: seed one active row per item that already has an image, so reads
-- (which now source image_url from item_images) keep showing existing images.
-- The table is created empty above, so a plain insert suffices — no de-dup
-- needed. NOT EXISTS keeps it idempotent if the migration is re-run.
INSERT INTO "item_images" ("item_id", "url", "active")
SELECT i."id", i."image_url", true
FROM "items" AS i
WHERE i."image_url" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "item_images" im WHERE im."item_id" = i."id"
  );
