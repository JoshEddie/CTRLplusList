-- Migration: altvatar-and-onboarding-gate
--
-- Additive only. No backfill and no default row: the absence of a row is what
-- `onboarding-gate` reads to decide an account has not onboarded, so a
-- backfilled row would silently disable the gate for every existing account.
--
-- Forward-only. Rollback is dropping the table; nothing else in this file.
--   DROP TABLE IF EXISTS "profile_avatars";

CREATE TABLE IF NOT EXISTS "profile_avatars" (
	"profile_id" text PRIMARY KEY NOT NULL,
	"style" text NOT NULL,
	"options" jsonb NOT NULL,
	"art" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profile_avatars_profile_id_profiles_id_fk') THEN
		ALTER TABLE "profile_avatars" ADD CONSTRAINT "profile_avatars_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
