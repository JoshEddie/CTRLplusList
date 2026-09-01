-- Migration: profiles-schema-phase-3
--
-- Forward-only drops: the seven remaining account-valued columns phase 2
-- superseded (the eighth, profiles.user_id, is explained below),
-- their foreign keys, and the account-valued purchaser partial unique. Every
-- reader and writer moved to the profile-valued columns in phase 2, so these
-- carry backfilled data nothing reads.
--
-- No down-migration. The drops are irreversible by design (the three-phase plan
-- settled on #184): the data they hold is fully reconstructible from the
-- profile-valued columns through each profile's `self` membership, so a revert
-- would be a forward migration re-adding the columns and backfilling them the
-- other way round, not a rollback of this file.
--
-- profiles.user_id is absent from this file on purpose: phase 1's migration was
-- rewritten in place by this change, so the column is never created.

ALTER TABLE "items" DROP CONSTRAINT IF EXISTS "items_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "lists" DROP CONSTRAINT IF EXISTS "lists_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "purchases" DROP CONSTRAINT IF EXISTS "purchases_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "purchases" DROP CONSTRAINT IF EXISTS "purchases_claimed_by_user_id_fk";
--> statement-breakpoint
ALTER TABLE "user_blocks" DROP CONSTRAINT IF EXISTS "user_blocks_blocker_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "user_blocks" DROP CONSTRAINT IF EXISTS "user_blocks_blocked_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "user_follows" DROP CONSTRAINT IF EXISTS "user_follows_followee_id_user_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "purchases_item_user_unique_idx";--> statement-breakpoint
ALTER TABLE "items" DROP COLUMN IF EXISTS "user_id";--> statement-breakpoint
ALTER TABLE "lists" DROP COLUMN IF EXISTS "user_id";--> statement-breakpoint
ALTER TABLE "purchases" DROP COLUMN IF EXISTS "user_id";--> statement-breakpoint
ALTER TABLE "purchases" DROP COLUMN IF EXISTS "claimed_by";--> statement-breakpoint
ALTER TABLE "user_blocks" DROP COLUMN IF EXISTS "blocker_id";--> statement-breakpoint
ALTER TABLE "user_blocks" DROP COLUMN IF EXISTS "blocked_id";--> statement-breakpoint
ALTER TABLE "user_follows" DROP COLUMN IF EXISTS "followee_id";
