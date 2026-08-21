-- Migration: profiles-page-and-creation (openspec change)
--
-- Additive only, no backfill. Two independent statements:
--   1. profiles.tagline — nullable text, NULL on every pre-existing row. The
--      40-character cap and the empty→NULL normalization are validation-layer
--      contracts, not column constraints: see
--      openspec/adr/2026-08-19-profile-attributes-column-or-preference.md
--   2. The accent catalog row. The feature introducing a preference owns its
--      catalog row (profiles-data-model), and this change introduces the first
--      one — profile_preferences stays empty until a profile is given an
--      accent. The stored value is a preset NAME, so `type` is `text`: the
--      palette owns what each name renders as, which keeps a re-brand a
--      palette edit rather than a rewrite of every stored row.
--
-- Rollback is dropping the column and deleting the catalog row; per-profile
-- values cascade off the catalog entry.

ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "tagline" text;--> statement-breakpoint
INSERT INTO "preferences" ("id", "name", "type") VALUES ('accent', 'Accent color', 'text') ON CONFLICT ("id") DO NOTHING;
