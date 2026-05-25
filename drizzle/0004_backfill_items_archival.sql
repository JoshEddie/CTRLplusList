-- Backfill for environments that were initialized before the 0000 snapshot
-- existed. The items.archived_at column and the quantity_limit nullability
-- change were introduced in commit 0e9a654 ("items archival, multi-purchase,
-- and spoiler-aware visibility") but predated the first generated migration,
-- so any DB that pre-dates 0000 is missing them. Idempotent — safe to re-run.

ALTER TABLE "items" ADD COLUMN IF NOT EXISTS "archived_at" timestamp;--> statement-breakpoint
ALTER TABLE "items" ALTER COLUMN "quantity_limit" DROP NOT NULL;
