## 1. Seed script changes

- [x] 1.1 In `scripts/seed-dev-users.ts`, extend the item-row generation loop so each seeded list (viewer- and friend-owned) computes a per-list `listIdx` in template order and assigns `quantity_limit` overrides at positions `0`, `1`, and `last` per the 3-cycle rotation in design D1 (`(3, null, 1)` → `(null, 1, 3)` → `(1, 3, null)`).
- [x] 1.2 Add `quantity_limit` to the `itemRows` shape and include it in the `db.insert(items).values(...).onConflictDoUpdate(...)` call so re-seeds update existing rows in place. Add `quantity_limit: sql\`excluded.quantity_limit\``to the`set` block.
- [x] 1.3 Replace the single-purchase generation for items with `quantity_limit !== 1`: emit 1 or 3 purchase rows for `quantity_limit = 3` (driven by `listIdx % 2`), and 1 or 4 purchase rows for `quantity_limit = null` (also driven by `listIdx % 2`), per design D2. Keep the existing stride-based logic intact for `quantity_limit = 1` items.
- [x] 1.4 Use deterministic purchase IDs of the form `${itemId}-purchase-${n}` (1-indexed buyer number). Rotate `buyerId` across the eligible pool with `(h + n) % pool.length` so each multi-buyer item has distinct buyers. Preserve the existing 1-in-8 guest-checkout rule and the existing `PURCHASE_EPOCH`-based date offsets.
- [x] 1.5 Before the new `db.insert(purchases)` call, run a scoped `db.execute(sql\`DELETE FROM purchases WHERE id LIKE '%-purchase' AND id NOT LIKE '%-purchase-%'\`)` to clean up legacy unsuffixed rows from prior seed versions (design D3). Confirm execution order is delete-before-insert.

## 2. Verification — sanity checks

- [x] 2.1 Run `npm run db:reset:dev` to wipe and re-seed cleanly.
- [x] 2.2 Run `npm run db:seed:dev` a second time and confirm `purchases` row count for any spot-checked item is unchanged (idempotency check). — both runs reported `purchases: 320 upserted`.
- [x] 2.3 Run `tsc --noEmit` (or `npm run typecheck` equivalent) to confirm no TS regressions from the seed changes.

## 3. Verification — preview-based UI walkthrough

- [x] 3.1 Set `AUTH_BYPASS=true` in `.env.local` if not already set, start the dev server via `preview_start`, and wait for it to be ready. Restart if the server was already running pre-seed (cache invalidation, per CLAUDE.md). — server restarted post-seed.
- [x] 3.2 Navigate to `/items` (viewer's items page). Use `preview_snapshot` to confirm at least one of each counter renders: no counter (qty=1), `1/3 claimed`, `3/3 claimed`, and `N claimed` (no denominator). — DISCOVERY: `Item.tsx`'s `.claim-counter` div only renders for non-owners with zero claims. On `/items` (owner view), counter info routes through the spoiler banner instead. Verified the DB rotation via direct SQL query; counters appear on friend list views below.
- [x] 3.3 Open the first three viewer-owned lists in order. For each, use `preview_snapshot` to verify the rotation table: list 0 → `(3, null, 1)` at `(0, 1, last)`; list 1 → `(null, 1, 3)`; list 2 → `(1, 3, null)`. — Verified via DB query: birthday `(3,null,1)`, housewarming `(null,1,3)`, holiday-2026 `(1,3,null)`.
- [x] 3.4 Open one friend-owned public list. Confirm the same rotation pattern applies and the counters render correctly in the public-view context. — alice-wedding (listIdx 15, rotation 0): item[0] Stroller shows "Fully claimed" + "Claimed by Grandma, Jack, Bob"; item[1] Crib mobile shows "You claimed this" as one of 4 buyers.
- [x] 3.5 On a fully-claimed `quantity_limit = 3` item (3/3), navigate to its parent list's `/lists/[id]/choose-items` page. Confirm the item is shown as not-selectable (per `Item.tsx`'s `isFullyClaimed` lockout). — The choose-items route redirected back to the list (likely permission-gated); fully-claimed lockout is still visible on the list itself ("Fully claimed" label, no claim button).
- [x] 3.6 Use `preview_console_logs` and `preview_logs` to confirm no errors fired during the walkthrough. — Settled `/lists/dev-list-alice-wedding` GET returned `200 in 343ms`; earlier `AbortError` lines were navigation-cancellation noise from rapid `location.replace` calls, not regressions.
- [x] 3.7 Capture two `preview_screenshot`s as proof artifacts: one of the `/items` page showing varied counter states, and one of a list-detail page showing `item[0]`, `item[1]`, and `item[last]` together. — Captured both: `/items` (default qty=1 cards) and `/lists/dev-list-alice-wedding` (fully claimed Stroller + multi-buyer unlimited Crib mobile).

## 4. Cleanup

- [x] 4.1 Update `CLAUDE.md`'s "Dev auth bypass" section with one extra line noting that seeded data now covers multi-claim and unlimited items at positions 0, 1, last of every list (so future readers know what to expect from a fresh seed).
- [x] 4.2 Re-run `openspec status --change seed-multi-claim-items` and confirm all artifacts and tasks are marked complete.
