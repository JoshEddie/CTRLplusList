-- Migration: image-framing
--
-- Gives each pooled image its own focal point and fit. The defaults (centre,
-- cover) reproduce how every card rendered before, so existing rows take them
-- as-is and need no backfill.
--
-- Forward-only. Rollback in shape:
--   ALTER TABLE "item_images" DROP CONSTRAINT IF EXISTS "item_images_framing_valid";
--   ALTER TABLE "item_images" DROP COLUMN IF EXISTS "fit";
--   ALTER TABLE "item_images" DROP COLUMN IF EXISTS "focal_y";
--   ALTER TABLE "item_images" DROP COLUMN IF EXISTS "focal_x";

ALTER TABLE "item_images" ADD COLUMN IF NOT EXISTS "focal_x" integer DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE "item_images" ADD COLUMN IF NOT EXISTS "focal_y" integer DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE "item_images" ADD COLUMN IF NOT EXISTS "fit" text DEFAULT 'cover' NOT NULL;--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'item_images_framing_valid') THEN
		ALTER TABLE "item_images" ADD CONSTRAINT "item_images_framing_valid" CHECK ("item_images"."fit" IN ('cover', 'contain') AND "item_images"."focal_x" BETWEEN 0 AND 100 AND "item_images"."focal_y" BETWEEN 0 AND 100);
	END IF;
END $$;
