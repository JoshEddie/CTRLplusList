-- Migration: roles-enforcement-and-permissions (openspec change)
--
-- Additive only. No backfill: an invite is minted by an owner's act, so there
-- is nothing to carry forward for existing profiles.
--
-- Forward-only. Rollback is dropping the table; nothing else in this file.
-- Dropping it discards unredeemed invites, while redeemed ones have already
-- become `profile_members` rows that survive independently.
--   DROP TABLE IF EXISTS "profile_invites";

CREATE TABLE IF NOT EXISTS "profile_invites" (
	"token" text PRIMARY KEY NOT NULL,
	"profile_id" text NOT NULL,
	"created_by_user_id" text NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"redeemed_at" timestamp,
	CONSTRAINT "profile_invites_role_valid" CHECK ("profile_invites"."role" IN ('owner', 'manager'))
);
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profile_invites_profile_id_profiles_id_fk') THEN
		ALTER TABLE "profile_invites" ADD CONSTRAINT "profile_invites_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profile_invites_created_by_user_id_user_id_fk') THEN
		ALTER TABLE "profile_invites" ADD CONSTRAINT "profile_invites_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
