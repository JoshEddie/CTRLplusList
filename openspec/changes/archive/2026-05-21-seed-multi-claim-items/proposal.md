## Why

The dev seed (`scripts/seed-dev-users.ts`) currently writes every item with `quantity_limit = 1` and at most one purchase per item. That leaves three real UI states unseeded and unreachable from `npm run db:seed:dev`:

1. **Multi-claim items** (`quantity_limit = 3`) — partially claimed (`1/3`) and fully claimed (`3/3`)
2. **Unlimited items** (`quantity_limit = null`) — claim counter without a denominator
3. **Multi-buyer purchases on a single item** — the only way to drive a multi-claim item past `1/N`

Because none of these states appear in seeded data, design/regression review of `Item.tsx`'s `claimCount/limit` counter, the `isFullyClaimed` lockout branch, and the unlimited counter branch all rely on manual UI clicking — which is fragile and easy to skip.

## What Changes

- Add `quantity_limit` overrides to the seed's item-row generator at three positions per list — **item[0]**, **item[1]**, and **item[last]** — rotating the three values `3`, `null`, and `1` across those positions per list (3-list cycle, so every position sees every value)
- Fan out the purchase loop to emit multiple buyer rows for `quantity_limit = 3` and `quantity_limit = null` items, producing both partial and fully-claimed states across the dataset
- Keep purchase IDs deterministic (suffix with buyer index) so re-runs remain idempotent
- Default for all other items remains `quantity_limit = 1` (current behavior)
- Verify the change end-to-end against the dev preview (lists page, items page, list detail, choose-items flow) before marking done

## Capabilities

### New Capabilities
- `dev-seed-coverage`: Defines what UI states the local dev seed must cover so preview-based design review can verify them without manual data setup.

### Modified Capabilities
<!-- none -->

## Impact

- **Code**: `scripts/seed-dev-users.ts` only.
- **Data**: Re-seeded items will gain `quantity_limit` values on viewer- and friend-owned lists; existing rows update via `onConflictDoUpdate`. New purchase rows appear with `-purchase-<n>` suffixed IDs.
- **No schema changes.** `items.quantity_limit` and `purchases` already support this; only the seed populates them.
- **No production impact.** Script hard-fails on `NODE_ENV=production` (line 22).
- **Downstream UI**: `Item.tsx` counter branches and the choose-items flow at `app/(main)/lists/[id]/choose-items` now exercise real seeded data.
