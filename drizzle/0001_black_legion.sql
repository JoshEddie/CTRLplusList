-- Migration: add-following-and-history (openspec change)
--
-- Forward-only schema additions plus data backfill. No DROP statements.
-- Legacy artifacts (lists.shared, saved_lists) are intentionally preserved
-- for the soak period and dropped in a follow-up change. See:
--   openspec/changes/add-following-and-history/design.md
--
-- Rollback (run manually if needed):
--   ALTER TABLE "user" DROP COLUMN "last_seen_following_at";
--   ALTER TABLE "lists" DROP COLUMN "shared_at";
--   ALTER TABLE "lists" DROP COLUMN "visibility";
--   DROP TABLE "list_visits";
--   DROP TABLE "user_follows";
--   DROP TABLE "user_blocks";
-- Data loss on rollback: visit history (non-bookmarked), follows, blocks, and any
-- bookmarks made during the soak. `saved_lists` and `lists.shared` are untouched
-- by this migration and survive a rollback intact.

-- Pre-flight assertions: abort migration on inconsistency.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM lists WHERE shared IS NULL) THEN
    RAISE EXCEPTION 'Pre-flight failed: lists.shared has NULL values';
  END IF;
  IF EXISTS (
    SELECT user_id, list_id, COUNT(*) FROM saved_lists
    GROUP BY user_id, list_id HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Pre-flight failed: saved_lists has duplicate (user_id, list_id) rows';
  END IF;
END $$;
--> statement-breakpoint

CREATE TABLE "list_visits" (
	"user_id" text NOT NULL,
	"list_id" text NOT NULL,
	"last_visited_at" timestamp DEFAULT now() NOT NULL,
	"visit_count" integer DEFAULT 1 NOT NULL,
	"favorited_at" timestamp,
	CONSTRAINT "list_visits_user_id_list_id_pk" PRIMARY KEY("user_id","list_id")
);
--> statement-breakpoint
CREATE TABLE "user_blocks" (
	"blocker_id" text NOT NULL,
	"blocked_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_blocks_blocker_id_blocked_id_pk" PRIMARY KEY("blocker_id","blocked_id"),
	CONSTRAINT "user_blocks_blocker_not_blocked" CHECK ("blocker_id" <> "blocked_id")
);
--> statement-breakpoint
CREATE TABLE "user_follows" (
	"follower_id" text NOT NULL,
	"followee_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_follows_follower_id_followee_id_pk" PRIMARY KEY("follower_id","followee_id"),
	CONSTRAINT "user_follows_follower_not_followee" CHECK ("follower_id" <> "followee_id")
);
--> statement-breakpoint
ALTER TABLE "lists" ADD COLUMN "visibility" text DEFAULT 'private' NOT NULL;--> statement-breakpoint
ALTER TABLE "lists" ADD COLUMN "shared_at" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "last_seen_following_at" timestamp;--> statement-breakpoint
ALTER TABLE "list_visits" ADD CONSTRAINT "list_visits_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_visits" ADD CONSTRAINT "list_visits_list_id_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocker_id_user_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocked_id_user_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_follower_id_user_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_followee_id_user_id_fk" FOREIGN KEY ("followee_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- Data backfill: derive visibility + shared_at from the legacy shared boolean.
-- Conservative: previously-shared lists become 'unlisted' (link-only), not 'public'.
UPDATE "lists"
SET
  "visibility" = CASE WHEN "shared" THEN 'unlisted' ELSE 'private' END,
  "shared_at" = CASE WHEN "shared" THEN "created_at" ELSE NULL END;
--> statement-breakpoint

-- Data copy: existing saves become bookmarks. saved_lists is preserved (not dropped).
INSERT INTO "list_visits" ("user_id", "list_id", "last_visited_at", "visit_count", "favorited_at")
SELECT "user_id", "list_id", NOW(), 0, NOW() FROM "saved_lists"
ON CONFLICT ("user_id", "list_id") DO NOTHING;
