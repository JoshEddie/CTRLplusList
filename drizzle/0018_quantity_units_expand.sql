-- Migration: quantity-units-expand (#361, the expand half of #359)
--
-- Additive and backfill only. Every column and index the feature needs lands
-- beside what it replaces; nothing reads them yet. `items.quantity_limit` is
-- untouched and remains the value every read path uses, so the app behaves
-- exactly as it did before this ran.
--
-- Two relaxations rather than additions: `purchases.item_id` becomes nullable
-- with ON DELETE SET NULL, and `purchases.list_id` arrives nullable with the
-- same. A claim must outlive the item or the list it was made against — the
-- owner deletes those from behind the spoiler wall, and a cascade would make
-- somebody else's record of a real purchase the casualty of a routine act.
--
-- No `claimed_units` column, departing from #359: capacity sums
-- `purchases.units` instead. See ADR-0016. The composite FK to list_items is
-- likewise absent by decision, not oversight; #359 records why, and its CHECK
-- on the counter is moot here since there is no counter.
--
-- Every added column carries a DEFAULT, so NOT NULL is satisfied at ADD time
-- and no rewrite happens (PG 11+). That is why these land tightened rather
-- than following the usual add-loose / backfill / tighten order — there is no
-- window in which an existing row is unset.
--
-- `purchases_item_profile_unique_idx` is deliberately KEPT. The generalised
-- index cannot bind a null list, and the write path does not set `list_id`
-- until a later ticket; dropping the item-scoped index here would leave
-- duplicate claims unguarded in between. It goes in the contract half.
--
-- Every backfill statement is idempotent — each touches only rows it has not
-- already settled, so a re-run is a no-op.
--
-- Forward-only. Rollback in shape (no data is dropped by this migration):
--   DROP INDEX IF EXISTS "purchases_list_item_profile_unique_idx";
--   ALTER TABLE "purchases" DROP COLUMN IF EXISTS "store_name", ... "item_price", "item_name", "units", "list_id";
--   ALTER TABLE "list_items" DROP COLUMN IF EXISTS "shown", ... "quantity";
-- Restoring the NOT NULL and cascade on "purchases"."item_id" is only safe
-- while no claim has been orphaned by an item deletion.

ALTER TABLE "list_items" ADD COLUMN IF NOT EXISTS "quantity" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "list_items" ADD COLUMN IF NOT EXISTS "shown" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "list_id" text;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "units" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "item_name" text;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "item_price" text;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "store_name" text;--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'purchases_list_id_lists_id_fk') THEN
		ALTER TABLE "purchases" ADD CONSTRAINT "purchases_list_id_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."lists"("id") ON DELETE set null ON UPDATE no action;
	END IF;
END $$;--> statement-breakpoint
ALTER TABLE "purchases" ALTER COLUMN "item_id" DROP NOT NULL;--> statement-breakpoint
-- Drop and re-add is the only way to change a foreign key's ON DELETE action.
-- Unlike a uniqueness constraint this leaves no window worth protecting: the
-- gap between the two admits an item deletion that cascades where it will soon
-- set null, and no orphan row that the re-added constraint would then reject.
ALTER TABLE "purchases" DROP CONSTRAINT IF EXISTS "purchases_item_id_items_id_fk";--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Backfill: every claim names a list.
--
-- Measured against production: no claim sits on an item belonging to no list,
-- so every row resolves. Four claims sit on items appearing on more than one
-- list. The ordering below is the placement rule — the nearest occasion at or
-- after the claim date, falling back to the nearest before it if none follows.
-- Three of the four resolve unambiguously that way.
--
-- The fourth is genuinely ambiguous: its two candidate lists are duplicates of
-- each other, same name, same occasion, same date, so the rule cannot separate
-- them and neither could a person. The `li.list_id` tiebreak decides it. That
-- makes the placement deterministic and re-derivable, but it does NOT name it:
-- reading this file you cannot tell which claim or which list. Naming it takes
-- an explicit `UPDATE purchases SET list_id = … WHERE id = …` above this
-- statement, carrying the two production ids. Since the candidates are
-- duplicates of each other, either placement is equivalent by construction.
--
-- Attaching a claim to every entry of its item was rejected: it fabricates
-- claims nobody made, and the person who made the original would see two.
UPDATE "purchases" p
SET "list_id" = (
	SELECT li."list_id"
	FROM "list_items" li
	JOIN "lists" l ON l."id" = li."list_id"
	WHERE li."item_id" = p."item_id"
	ORDER BY (l."date" >= p."purchased_at") DESC, GREATEST(l."date" - p."purchased_at", p."purchased_at" - l."date"), li."list_id"
	LIMIT 1
)
WHERE p."list_id" IS NULL AND p."item_id" IS NOT NULL;--> statement-breakpoint
-- Backfill: quantity carries over from the item, and unlimited becomes 1.
--
-- Measured against production: no item has a quantity above one, so the copy
-- is exact and lossless, and the three unlimited items all carry zero claims —
-- landing them on 1 strands nothing. Restricted to entries still on the
-- default so a re-run cannot clobber a quantity set after this ran.
UPDATE "list_items" li
SET "quantity" = GREATEST(COALESCE(i."quantity_limit", 1), 1)
FROM "items" i
WHERE i."id" = li."item_id"
	AND li."quantity" = 1
	AND GREATEST(COALESCE(i."quantity_limit", 1), 1) <> 1;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "purchases_list_item_profile_unique_idx" ON "purchases" USING btree ("list_id","item_id","profile_id") WHERE "purchases"."profile_id" IS NOT NULL;
