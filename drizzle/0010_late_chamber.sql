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

CREATE TABLE IF NOT EXISTS "preferences" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"user_id" text,
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
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_user_id_user_id_fk') THEN
		ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
	END IF;
END $$;--> statement-breakpoint
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
CREATE UNIQUE INDEX IF NOT EXISTS "profiles_one_self_per_user_idx" ON "profiles" USING btree ("user_id") WHERE "profiles"."user_id" IS NOT NULL;
--> statement-breakpoint

-- Backfill: one self-profile per account. Deterministic 'self-' || user id keeps
-- re-runs and debugging sane; app-created profiles use nanoid. UNTITLED is a
-- sentinel, not a display name — nothing reads profiles.name this phase, and a
-- later change replaces it with a generated name.
INSERT INTO "profiles" ("id", "name", "user_id")
SELECT 'self-' || u."id", COALESCE(u."name", 'UNTITLED'), u."id" FROM "user" u
ON CONFLICT DO NOTHING;
--> statement-breakpoint

-- Backfill: a `self` membership row per self-profile. Selects from profiles, not
-- "user", so an account whose membership row was lost self-heals on re-run.
INSERT INTO "profile_members" ("user_id", "profile_id", "role")
SELECT p."user_id", p."id", 'self' FROM "profiles" p WHERE p."user_id" IS NOT NULL
ON CONFLICT DO NOTHING;
--> statement-breakpoint

-- Backfill: last-mutator audit columns seeded from the current owner. No
-- application code reads or writes them this phase.
UPDATE "items" SET "updated_by_user_id" = "user_id" WHERE "updated_by_user_id" IS NULL;
--> statement-breakpoint
UPDATE "lists" SET "updated_by_user_id" = "user_id" WHERE "updated_by_user_id" IS NULL;
