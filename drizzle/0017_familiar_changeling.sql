-- Migration: spoiler-visibility-redesign
--
-- Additive/reshaping, forward-only. The spoiler tier moves off profile_members
-- (no columns there) into profile_preferences, which gains a nullable account
-- key so one preference row can be profile-wide (user_id NULL) or per-member
-- (user_id set). A nullable column cannot sit in a primary key and a plain
-- unique index treats NULLs as distinct, so uniqueness is two partial indexes.
-- Existing rows are all null-account (profile-wide) values and stay valid; no
-- backfill. The `spoiler_tier` catalog row is registered last.
--
-- Safe ahead of the deploy: the added column is nullable, existing rows are
-- untouched, and the previous app version ignores columns and rows it does not
-- read. Deploy order is migration, then app.

ALTER TABLE "profile_preferences" DROP CONSTRAINT "profile_preferences_profile_id_preference_id_pk";--> statement-breakpoint
ALTER TABLE "profile_preferences" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "profile_preferences" ADD CONSTRAINT "profile_preferences_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "profile_preferences_default_idx" ON "profile_preferences" USING btree ("profile_id","preference_id") WHERE "profile_preferences"."user_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "profile_preferences_member_idx" ON "profile_preferences" USING btree ("profile_id","user_id","preference_id") WHERE "profile_preferences"."user_id" IS NOT NULL;--> statement-breakpoint
INSERT INTO "preferences" ("id", "name", "type") VALUES
	('spoiler_tier', 'Claim visibility tier', 'text')
ON CONFLICT ("id") DO NOTHING;
