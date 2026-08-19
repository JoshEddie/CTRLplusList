-- Migration: profiles-schema-phase-1 (openspec change)
--
-- Forward-only additive schema plus idempotent backfill. No DROP statements,
-- no repoints, no FK or index changes to pre-existing tables. Phase 2 (repoint
-- + enforce) and phase 3 (drops) land as separate soaked migrations. See:
--   openspec/changes/profiles-schema-phase-1/design.md
--
-- Rollback (run manually if needed):
--   ALTER TABLE "items" DROP COLUMN "updated_by_user_id";
--   ALTER TABLE "lists" DROP COLUMN "updated_by_user_id";
--   DROP TABLE "profile_preferences";
--   DROP TABLE "preferences";
--   DROP TABLE "profile_members";
--   DROP TABLE "profiles";
-- Data loss on rollback: profile and membership rows only. Every pre-existing
-- table, column, constraint and index is untouched by this migration and
-- survives a rollback intact.
--
-- Operational note: this file was rewritten in place by profiles-schema-phase-3.
-- Drizzle applies migrations by timestamp and never compares hashes, so a
-- database that already ran the earlier version of this file silently skips the
-- rewrite. `npm run db:reset:dev` is data-only and will not repair it — such a
-- database must be dropped and rebuilt from the migration files.

CREATE TABLE IF NOT EXISTS "preferences" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "profile_members" (
	"user_id" text NOT NULL,
	"profile_id" text NOT NULL,
	"role" text NOT NULL,
	"ride_along" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "profile_members_user_id_profile_id_pk" PRIMARY KEY("user_id","profile_id"),
	CONSTRAINT "profile_members_role_valid" CHECK ("profile_members"."role" IN ('self', 'owner', 'manager'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "profile_preferences" (
	"profile_id" text NOT NULL,
	"preference_id" text NOT NULL,
	"value" text NOT NULL,
	CONSTRAINT "profile_preferences_profile_id_preference_id_pk" PRIMARY KEY("profile_id","preference_id")
);
--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN IF NOT EXISTS "updated_by_user_id" text;--> statement-breakpoint
ALTER TABLE "lists" ADD COLUMN IF NOT EXISTS "updated_by_user_id" text;--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profile_members_user_id_user_id_fk') THEN
		ALTER TABLE "profile_members" ADD CONSTRAINT "profile_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profile_members_profile_id_profiles_id_fk') THEN
		ALTER TABLE "profile_members" ADD CONSTRAINT "profile_members_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profile_preferences_profile_id_profiles_id_fk') THEN
		ALTER TABLE "profile_preferences" ADD CONSTRAINT "profile_preferences_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profile_preferences_preference_id_preferences_id_fk') THEN
		ALTER TABLE "profile_preferences" ADD CONSTRAINT "profile_preferences_preference_id_preferences_id_fk" FOREIGN KEY ("preference_id") REFERENCES "public"."preferences"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'items_updated_by_user_id_user_id_fk') THEN
		ALTER TABLE "items" ADD CONSTRAINT "items_updated_by_user_id_user_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
	END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lists_updated_by_user_id_user_id_fk') THEN
		ALTER TABLE "lists" ADD CONSTRAINT "lists_updated_by_user_id_user_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
	END IF;
END $$;--> statement-breakpoint
-- Both directions are load-bearing: the account side is "one self-profile per
-- account", the profile side is what makes a claim asserter resolve back to
-- exactly one human. They also carry this migration's backfill idempotency,
-- since a profile id is no longer derivable from the account it belongs to.
CREATE UNIQUE INDEX IF NOT EXISTS "profile_members_one_self_per_user_idx" ON "profile_members" USING btree ("user_id") WHERE "profile_members"."role" = 'self';
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "profile_members_one_self_per_profile_idx" ON "profile_members" USING btree ("profile_id") WHERE "profile_members"."role" = 'self';
--> statement-breakpoint

-- Temporary id generator: 21 characters drawn from nanoid's own 64-character
-- alphabet, indexed by 6-bit masks over the 32 random bytes of two
-- gen_random_uuid() calls, so no modulo bias and the same shape the JS
-- generator emits. pgcrypto (and so gen_random_bytes) is unavailable in PGlite,
-- which replays every migration on every test boot. The alphabet must stay
-- exactly 64 characters — at 63, substr returns empty for byte value 63 and
-- silently emits short ids. Dropped at the end of this file.
CREATE OR REPLACE FUNCTION "migration_0010_nanoid"() RETURNS text
LANGUAGE sql VOLATILE AS $$
	SELECT string_agg(
		substr(
			'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict',
			(get_byte(s."bytes", i) & 63) + 1,
			1
		),
		'' ORDER BY i
	)
	FROM (
		SELECT decode(
			replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
			'hex'
		) AS "bytes"
	) s, generate_series(0, 20) AS i;
$$;
--> statement-breakpoint

-- Backfill: one self-profile and its `self` membership per account, both in one
-- data-modifying CTE so a failure cannot leave a profile no membership reaches.
-- Membership is the sole account link, so it is also the re-run guard: an
-- account that already holds a `self` row is skipped. UNTITLED is a sentinel,
-- not a display name — nothing reads profiles.name this phase, and a later
-- change replaces it with a generated name.
WITH "minted" AS MATERIALIZED (
	SELECT
		u."id" AS "user_id",
		COALESCE(u."name", 'UNTITLED') AS "name",
		"migration_0010_nanoid"() AS "profile_id"
	FROM "user" u
	WHERE NOT EXISTS (
		SELECT 1 FROM "profile_members" m
		WHERE m."user_id" = u."id" AND m."role" = 'self'
	)
), "created" AS (
	INSERT INTO "profiles" ("id", "name")
	SELECT "profile_id", "name" FROM "minted"
)
INSERT INTO "profile_members" ("user_id", "profile_id", "role")
SELECT "user_id", "profile_id", 'self' FROM "minted";
--> statement-breakpoint

DROP FUNCTION IF EXISTS "migration_0010_nanoid"();
--> statement-breakpoint

-- Backfill: last-mutator audit columns seeded from the current owner. No
-- application code reads or writes them this phase.
UPDATE "items" SET "updated_by_user_id" = "user_id" WHERE "updated_by_user_id" IS NULL;
--> statement-breakpoint
UPDATE "lists" SET "updated_by_user_id" = "user_id" WHERE "updated_by_user_id" IS NULL;
