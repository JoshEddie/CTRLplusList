-- Migration: profiles-schema-phase-2 (openspec change)
--
-- Forward-only: add the seven profile-valued columns beside their account
-- columns, backfill each through the owning account's self-profile, tighten
-- NOT NULL where the predecessor holds it, recreate the two edge-table
-- primary keys over the profile columns, and drop the dormant saved_lists
-- table. No interactive transactions (neon-http): every statement-breakpoint
-- chunk is its own round trip; every cross-statement assertion lives inside
-- a single DO $$ block. See:
--   openspec/changes/profiles-schema-phase-2/design.md
--
-- Rollback (run manually if needed):
--   Steps 1-4 (columns, backfills, SET NOT NULL, new index) are additive and
--   inert if unread — a code revert alone restores behavior; to remove:
--     ALTER TABLE "lists" DROP COLUMN "profile_id";
--     ALTER TABLE "items" DROP COLUMN "profile_id";
--     ALTER TABLE "purchases" DROP COLUMN "profile_id";
--     ALTER TABLE "purchases" DROP COLUMN "claimed_by_profile_id";
--     ALTER TABLE "user_follows" DROP COLUMN "followee_profile_id";
--     ALTER TABLE "user_blocks" DROP COLUMN "blocker_profile_id";
--     ALTER TABLE "user_blocks" DROP COLUMN "blocked_profile_id";
--   The recreated primary keys and the saved_lists drop are NOT revert-
--   reversible; they need their own forward migration. The account columns
--   keep their data through this phase, so the old state is reconstructible
--   from the row.

-- Pre-flight: every referenced account must already have a self-profile
-- (phase-1 invariant); a missing one would strand a backfill NULL.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "user" u
    WHERE NOT EXISTS (SELECT 1 FROM "profiles" p WHERE p."user_id" = u."id")
  ) THEN
    RAISE EXCEPTION 'Pre-flight failed: account without a self-profile';
  END IF;
END $$;
--> statement-breakpoint

-- 1. Add all seven columns, nullable at this step.
ALTER TABLE "lists" ADD COLUMN IF NOT EXISTS "profile_id" text;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN IF NOT EXISTS "profile_id" text;--> statement-breakpoint
ALTER TABLE "user_follows" ADD COLUMN IF NOT EXISTS "followee_profile_id" text;--> statement-breakpoint
ALTER TABLE "user_blocks" ADD COLUMN IF NOT EXISTS "blocker_profile_id" text;--> statement-breakpoint
ALTER TABLE "user_blocks" ADD COLUMN IF NOT EXISTS "blocked_profile_id" text;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "profile_id" text;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "claimed_by_profile_id" text;--> statement-breakpoint

-- Foreign keys, mirroring each predecessor's delete behavior.
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lists_profile_id_profiles_id_fk') THEN
		ALTER TABLE "lists" ADD CONSTRAINT "lists_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'items_profile_id_profiles_id_fk') THEN
		ALTER TABLE "items" ADD CONSTRAINT "items_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_follows_followee_profile_id_profiles_id_fk') THEN
		ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_followee_profile_id_profiles_id_fk" FOREIGN KEY ("followee_profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_blocks_blocker_profile_id_profiles_id_fk') THEN
		ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocker_profile_id_profiles_id_fk" FOREIGN KEY ("blocker_profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_blocks_blocked_profile_id_profiles_id_fk') THEN
		ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocked_profile_id_profiles_id_fk" FOREIGN KEY ("blocked_profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'purchases_profile_id_profiles_id_fk') THEN
		ALTER TABLE "purchases" ADD CONSTRAINT "purchases_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'purchases_claimed_by_profile_id_profiles_id_fk') THEN
		ALTER TABLE "purchases" ADD CONSTRAINT "purchases_claimed_by_profile_id_profiles_id_fk" FOREIGN KEY ("claimed_by_profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;
	END IF;
END $$;--> statement-breakpoint

-- 2. Backfill each column through the owning account's self-profile.
-- Idempotent: each UPDATE only touches rows still NULL.
UPDATE "lists" l SET "profile_id" = p."id"
FROM "profiles" p WHERE p."user_id" = l."user_id" AND l."profile_id" IS NULL;
--> statement-breakpoint
UPDATE "items" i SET "profile_id" = p."id"
FROM "profiles" p WHERE p."user_id" = i."user_id" AND i."profile_id" IS NULL;
--> statement-breakpoint
UPDATE "user_follows" f SET "followee_profile_id" = p."id"
FROM "profiles" p WHERE p."user_id" = f."followee_id" AND f."followee_profile_id" IS NULL;
--> statement-breakpoint
UPDATE "user_blocks" b SET "blocker_profile_id" = p."id"
FROM "profiles" p WHERE p."user_id" = b."blocker_id" AND b."blocker_profile_id" IS NULL;
--> statement-breakpoint
UPDATE "user_blocks" b SET "blocked_profile_id" = p."id"
FROM "profiles" p WHERE p."user_id" = b."blocked_id" AND b."blocked_profile_id" IS NULL;
--> statement-breakpoint
-- Guest purchases (user_id NULL) correctly stay NULL in both profile columns.
UPDATE "purchases" pu SET "profile_id" = p."id"
FROM "profiles" p WHERE p."user_id" = pu."user_id" AND pu."profile_id" IS NULL;
--> statement-breakpoint
UPDATE "purchases" pu SET "claimed_by_profile_id" = p."id"
FROM "profiles" p WHERE p."user_id" = pu."claimed_by" AND pu."claimed_by_profile_id" IS NULL;
--> statement-breakpoint

-- 3. SET NOT NULL where the predecessor holds it, each gated on its own
-- backfill having left no NULL behind. Assertion and ALTER share one DO $$
-- block, so the gate and the tighten are a single atomic statement.
DO $$ BEGIN
	IF EXISTS (SELECT 1 FROM "lists" WHERE "profile_id" IS NULL) THEN
		RAISE EXCEPTION 'Backfill incomplete: lists.profile_id has NULLs';
	END IF;
	ALTER TABLE "lists" ALTER COLUMN "profile_id" SET NOT NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	IF EXISTS (SELECT 1 FROM "items" WHERE "profile_id" IS NULL) THEN
		RAISE EXCEPTION 'Backfill incomplete: items.profile_id has NULLs';
	END IF;
	ALTER TABLE "items" ALTER COLUMN "profile_id" SET NOT NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	IF EXISTS (SELECT 1 FROM "user_follows" WHERE "followee_profile_id" IS NULL) THEN
		RAISE EXCEPTION 'Backfill incomplete: user_follows.followee_profile_id has NULLs';
	END IF;
	ALTER TABLE "user_follows" ALTER COLUMN "followee_profile_id" SET NOT NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	IF EXISTS (SELECT 1 FROM "user_blocks" WHERE "blocker_profile_id" IS NULL OR "blocked_profile_id" IS NULL) THEN
		RAISE EXCEPTION 'Backfill incomplete: user_blocks profile columns have NULLs';
	END IF;
	ALTER TABLE "user_blocks" ALTER COLUMN "blocker_profile_id" SET NOT NULL;
	ALTER TABLE "user_blocks" ALTER COLUMN "blocked_profile_id" SET NOT NULL;
END $$;--> statement-breakpoint

-- 4. New purchaser partial unique, created by addition: the account-valued
-- purchases_item_user_unique_idx stays in place throughout, so no point in
-- this sequence leaves the concurrent-claim path unprotected.
CREATE UNIQUE INDEX IF NOT EXISTS "purchases_item_profile_unique_idx" ON "purchases" USING btree ("item_id","profile_id") WHERE "purchases"."profile_id" IS NOT NULL;
--> statement-breakpoint

-- 5. Recreate the two composite primary keys over the profile columns.
-- Drop and recreate share one DO $$ block, so each swap is a single atomic
-- statement and no window exists without the de-duplication backstop.
DO $$ BEGIN
	IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_follows_follower_id_followee_id_pk') THEN
		ALTER TABLE "user_follows" DROP CONSTRAINT "user_follows_follower_id_followee_id_pk";
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_follows_follower_id_followee_profile_id_pk') THEN
		ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_follower_id_followee_profile_id_pk" PRIMARY KEY("follower_id","followee_profile_id");
	END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
	IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_blocks_blocker_id_blocked_id_pk') THEN
		ALTER TABLE "user_blocks" DROP CONSTRAINT "user_blocks_blocker_id_blocked_id_pk";
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_blocks_blocker_profile_id_blocked_profile_id_pk') THEN
		ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocker_profile_id_blocked_profile_id_pk" PRIMARY KEY("blocker_profile_id","blocked_profile_id");
	END IF;
END $$;--> statement-breakpoint

-- 6. DROP NOT NULL on the vacated columns. The two edge tables need it
-- explicitly: Postgres leaves the implicit NOT NULL behind when a primary
-- key goes.
ALTER TABLE "lists" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "items" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user_follows" ALTER COLUMN "followee_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user_blocks" ALTER COLUMN "blocker_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user_blocks" ALTER COLUMN "blocked_id" DROP NOT NULL;--> statement-breakpoint

-- 7. Drop the dormant saved_lists table. Its rows were copied into
-- list_visits by 0001_black_legion; no application code reads or writes it.
DROP TABLE IF EXISTS "saved_lists" CASCADE;
