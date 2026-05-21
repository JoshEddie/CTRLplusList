## Context

`scripts/seed-dev-users.ts` is the only path that populates the dev DB for preview-based UI review (per `CLAUDE.md`'s `AUTH_BYPASS=true` workflow). It currently leaves `items.quantity_limit` at the schema default of `1` for every row and writes a single deterministic purchase ID per item (`${itemId}-purchase`) with `onConflictDoUpdate`, capping each item at one purchase.

The UI in `app/(main)/items/ui/components/Item.tsx:67-72,167-171` branches on three states this seed never produces:

- `quantity_limit > 1 && claimCount < limit` → `"{claimCount}/{limit} claimed"` partial counter
- `quantity_limit > 1 && claimCount >= limit` → `isFullyClaimed` lockout
- `quantity_limit == null` → unlimited counter (`"{claimCount} claimed"` with no denominator)

The `purchases` table has no per-item uniqueness constraint (`db/schema.ts:164-172`), so multiple buyer rows per `item_id` are schema-legal — only the seed's choice of ID enforces 1-per-item today.

## Goals / Non-Goals

**Goals:**
- Every reseeded dev DB contains at least one example of each of the three currently-missing UI states (partial multi-claim, fully-claimed multi-claim, unlimited).
- Variety distributed across viewer-owned AND friend-owned lists so both authoring (my list) and viewing (friend's list) flows surface the states.
- Coverage at the **start, second position, and end** of each list — so any position-dependent layout/styling bugs in `Item.tsx`, list-detail rendering, and the choose-items flow are catchable.
- Idempotent re-seeds — re-running `npm run db:seed:dev` produces the same rows (no duplicates, no drift).
- Production safety preserved (`NODE_ENV=production` guard, `dev-*` ID prefix scoping).

**Non-Goals:**
- No changes to `items.quantity_limit` schema, defaults, or DAL logic.
- No changes to `purchases` schema or uniqueness rules.
- No changes to production seed paths (there are none — script is dev-only).
- No new test infrastructure — verification is manual via the dev preview workflow already documented in `CLAUDE.md`.

## Decisions

### D1 — Position assignment: item[0], item[1], item[last] × {3, null, 1}

For every list (viewer- and friend-owned), apply quantity overrides at three positions. The three values `3`, `null`, and `1` rotate across those positions on a 3-list cycle keyed by `listIdx`:

| `listIdx % 3` | `item[0]` | `item[1]` | `item[last]` |
|---------------|-----------|-----------|--------------|
| `0`           | `3`       | `null`    | `1`          |
| `1`           | `null`    | `1`       | `3`          |
| `2`           | `1`       | `3`       | `null`       |

**Why this layout:**
- Over any consecutive 3 lists, every position (start, second, last) renders every quantity value. A reviewer paging through lists sees the full matrix without hunting.
- The `1` rows at these positions are deliberately included so the *layout* of a default-qty item alongside multi-claim/unlimited siblings is also exercised at the boundaries — for example, a `1` item rendered last (which today is the only `last` state in the dataset) gets explicitly visited at one position in each cycle.
- Determinism: a reviewer can predict states from list index alone — no need to read the DB.
- All other positions (`2..last-1`) inherit the schema default of `1`, so the seed still produces mostly-single-claim datasets, matching real-world distribution.

**Edge cases:**
- All current lists are 15-20 items, so `last >= 2` always. If a future template ever produced a 1-item list, `item[0] === item[last]` and `onConflictDoUpdate` resolves the collision by last-write-wins. Acceptable.

**Alternative considered:** randomize by hash. Rejected — hash-based distribution scatters states unpredictably across lists, so a reviewer can't reliably say "open list X and look at position Y." Determinism at known positions is more valuable here than statistical spread.

### D2 — Purchase fan-out for multi-claim and unlimited items

For each item with `quantity_limit !== 1`, generate **multiple** purchase rows instead of one. Driven by `listIdx % 2` so the dataset contains both partial and fully-claimed examples:

- **`quantity_limit = 3`, partially claimed**: emit 1 purchase (`1/3`). Triggered when `listIdx % 2 === 0`.
- **`quantity_limit = 3`, fully claimed**: emit 3 purchases (`3/3`). Triggered when `listIdx % 2 === 1`.
- **`quantity_limit = null`, single buyer**: emit 1 purchase. Triggered when `listIdx % 2 === 0`.
- **`quantity_limit = null`, many buyers**: emit 4 purchases. Triggered when `listIdx % 2 === 1`.

`quantity_limit = 1` items continue to follow the existing single-purchase stride-based rule from the current seed (~30% of viewer-active items, ~40% of friend items, ~70% of archived viewer items).

Purchase IDs become `${itemId}-purchase-${n}` where `n` is the buyer index — keeps determinism, avoids collisions with existing `${itemId}-purchase` rows from prior seeds (which we deliberately rewrite below).

**Buyer rotation:** advance through the existing `buyerId` pool (viewer + friends minus owner) by `(h + n) % pool.length` so each multi-claim item gets distinct buyers, not the same buyer repeated.

**Alternative considered:** keep one purchase per item, only seed the `quantity_limit` field, and tell reviewers to "click around" to get multi-claim states. Rejected because the entire point of this change is to remove the manual-clicking dependency.

### D3 — Backfill cleanup for existing `${itemId}-purchase` rows

Prior seed runs left rows with ID `${itemId}-purchase` (no suffix). The new scheme uses `-purchase-1`, `-purchase-2`, etc. Without cleanup, an old `-purchase` row would coexist with the new `-purchase-1` row on the same item, inflating claim counts.

**Decision:** before the purchase insert, run a `DELETE FROM purchases WHERE id LIKE '%-purchase' AND id NOT LIKE '%-purchase-%'` against IDs we're about to write. Scoped tightly to the seeded ID pattern so it won't touch any user-created purchases.

**Alternative considered:** keep the unsuffixed ID for buyer #1 and add `-purchase-2`, `-purchase-3`, etc. for additional buyers. Rejected — looks ad-hoc and makes ID parsing harder if anyone ever debugs by item ID. The cleanup is one extra query, runs only on dev DBs, and produces a cleaner steady state.

### D4 — Verification approach

Per `CLAUDE.md`, dev preview is the only way to validate UI changes through the harness. The plan:

1. Run `npm run db:reset:dev` (full wipe + reseed) to ensure no stale `-purchase` rows remain.
2. Restart the dev server (cache invalidation, per CLAUDE.md guidance).
3. With `AUTH_BYPASS=true`, walk a representative set of pages via `preview_*` tools:
   - `/items` (viewer's items page) — confirm `3/3`, `1/3`, `4 claimed`, `1 claimed` counters render.
   - A viewer-owned list detail page — confirm same counters in list context, plus item[0]/item[1]/item[last] visual positions.
   - A friend-owned list detail page — confirm the public-view rendering of these states.
   - The `/lists/[id]/choose-items` flow on a fully-claimed multi-claim item — confirm it's not selectable.
4. `preview_screenshot` of one items-page view + one list-detail view as proof artifacts.

## Risks / Trade-offs

- **[Existing purchase rows with the old ID could survive]** → D3 cleanup query handles it; verification step 1 (full reset) is a belt-and-suspenders fallback.
- **[Counter inflation if cleanup runs after insert]** → Order matters: cleanup must run *before* the new purchase insert. Document this in tasks.md.
- **[Visual regression on list-detail pages where item[last] now renders a counter where there was none before]** → Intended — this is exactly what we're trying to surface. Reviewer should screenshot before/after.
- **[Lists shorter than 2 items would have item[0] === item[last]]** → No such lists today (all are 15-20 items). If a future template adds one, `onConflictDoUpdate` resolves the collision by last-write-wins; visible as a single `qty=null` item at position 0. Acceptable.
- **[Friend lists are visited by viewer; multi-claim friend items may show as "I already bought one" awkwardly]** → This is realistic and matches prod behavior. No mitigation needed.
