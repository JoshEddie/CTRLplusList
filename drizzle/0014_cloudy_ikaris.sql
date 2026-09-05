-- Migration: active-profile-switcher
--
-- Additive only, no backfill. NULL is the correct value for a membership never
-- acted as: `active-profile` defines when the timestamp is written (a switch,
-- or a profile-scoped write, coarsened to at most hourly) and orders a NULL
-- after every membership carrying a value. A backfill would invent use that
-- never happened and destroy the never-acted-as ordering branch.
--
-- Forward-only. Rollback is dropping the column; nothing else in this file.

ALTER TABLE "profile_members" ADD COLUMN IF NOT EXISTS "last_active_at" timestamp;
