-- paste-link-prefill: optional fetched-price provenance on item_stores.
-- Additive-only, all columns nullable (manual rows stay null).
-- Rollback: ALTER TABLE "item_stores" DROP COLUMN IF EXISTS "price_fetched_at", DROP COLUMN IF EXISTS "canonical_url", DROP COLUMN IF EXISTS "currency";
ALTER TABLE "item_stores" ADD COLUMN IF NOT EXISTS "price_fetched_at" timestamp;--> statement-breakpoint
ALTER TABLE "item_stores" ADD COLUMN IF NOT EXISTS "canonical_url" text;--> statement-breakpoint
ALTER TABLE "item_stores" ADD COLUMN IF NOT EXISTS "currency" text;
