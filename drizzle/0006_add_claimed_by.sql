-- Migration: expand-claim-attribution (openspec change)
--
-- Adds `claimed_by` (who asserted the claim) alongside `user_id`, whose
-- meaning sharpens to "the purchaser". Pre-existing rows with `user_id` set
-- were all self-claims, so they backfill `claimed_by = user_id`. Legacy guest
-- rows (user_id NULL) stay all-NULL — the asserter's identity was never
-- stored and is not recoverable.
--
-- Rollback (run manually if needed):
--   ALTER TABLE "purchases" DROP COLUMN "claimed_by";
-- Non-destructive: the column is purely additive; pre-change rows are
-- untouched apart from the backfill.

ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "claimed_by" text;--> statement-breakpoint
DO $$
BEGIN
  -- Postgres has no ADD CONSTRAINT IF NOT EXISTS; guard via pg_constraint.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'purchases_claimed_by_user_id_fk'
  ) THEN
    ALTER TABLE "purchases" ADD CONSTRAINT "purchases_claimed_by_user_id_fk" FOREIGN KEY ("claimed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
UPDATE "purchases" SET "claimed_by" = "user_id" WHERE "user_id" IS NOT NULL AND "claimed_by" IS NULL;
