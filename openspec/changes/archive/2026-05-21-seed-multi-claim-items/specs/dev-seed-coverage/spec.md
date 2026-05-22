## ADDED Requirements

### Requirement: Seed covers all `quantity_limit` UI states

The dev seed script (`scripts/seed-dev-users.ts`) SHALL produce items that exercise every distinct `quantity_limit` rendering branch in `app/(main)/items/ui/components/Item.tsx`, so preview-based UI review can verify them without manual data entry.

The required branches are:

- `quantity_limit = 1` (single-claim default) — both unclaimed and claimed
- `quantity_limit > 1`, partially claimed (`claimCount < limit`)
- `quantity_limit > 1`, fully claimed (`claimCount >= limit`)
- `quantity_limit = null` (unlimited), with at least one claim

#### Scenario: Fresh seed renders every counter branch

- **WHEN** `npm run db:reset:dev` runs to completion and the dev server is restarted
- **THEN** the `/items` page for `dev-test-viewer` displays at least one item showing each of: no counter (qty=1), `1/3 claimed`, `3/3 claimed`, and `N claimed` (no denominator, qty=null)

#### Scenario: Multi-claim and unlimited examples appear across the dataset

- **WHEN** a reviewer scans across the first three seeded viewer-owned lists in order
- **THEN** at least one `quantity_limit = 3` item and at least one `quantity_limit = null` item appear across that set (each list contributes one of each value via the rotation)

### Requirement: Position coverage at start, second, and end of each list

The seed SHALL place explicit `quantity_limit` values at positions 0, 1, and last of every seeded list so layout/styling bugs that depend on item position are catchable by inspecting a single list. The three values `3`, `null`, and `1` SHALL rotate across those positions on a 3-list cycle keyed by list index in template order:

| `listIdx % 3` | `item[0]` | `item[1]` | `item[last]` |
| ------------- | --------- | --------- | ------------ |
| `0`           | `3`       | `null`    | `1`          |
| `1`           | `null`    | `1`       | `3`          |
| `2`           | `1`       | `3`       | `null`       |

Over any 3 consecutive lists, each of the three positions SHALL render each of the three quantity values exactly once.

#### Scenario: Rotation matches the table for the first three lists

- **WHEN** the first three seeded lists in template order are inspected
- **THEN** list 0 has `(items[0], items[1], items[last]).quantity_limit === (3, null, 1)`
- **AND** list 1 has `(null, 1, 3)`
- **AND** list 2 has `(1, 3, null)`

#### Scenario: Every position eventually sees every value

- **WHEN** any 3 consecutive seeded lists in template order are inspected
- **THEN** the multiset of `quantity_limit` values seen at position 0 across those lists equals `{1, 3, null}`
- **AND** the same is true for position 1 and for position last

### Requirement: Multi-buyer purchase fan-out

The seed SHALL generate multiple `purchases` rows for multi-claim and unlimited items so the partial- and fully-claimed UI states are reachable from seeded data alone, without UI interaction.

- For `quantity_limit = 3` items: produce either 1 or 3 purchase rows
- For `quantity_limit = null` items: produce either 1 or 4 purchase rows
- Buyers SHALL be distinct across purchases on the same item (no repeated `user_id` or `guest_name` on one item)
- Buyer selection SHALL respect existing seed rules (owner is never a buyer; ~1-in-N picks are guest checkouts)

#### Scenario: A fully-claimed multi-claim item is reachable

- **WHEN** a reviewer scans seeded items via `/items`
- **THEN** at least one item exists with `quantity_limit = 3` AND exactly 3 purchase rows attached

#### Scenario: An unlimited item with many buyers is reachable

- **WHEN** a reviewer scans seeded items
- **THEN** at least one item exists with `quantity_limit = null` AND at least 4 purchase rows attached

### Requirement: Idempotent and production-safe

Re-running the seed SHALL NOT duplicate rows, drift state, or affect any database where `NODE_ENV=production`.

- Purchase IDs SHALL follow a deterministic suffix scheme (`${itemId}-purchase-${n}`) so re-runs upsert in place
- Any legacy unsuffixed purchase IDs (`${itemId}-purchase`) from prior seed versions SHALL be cleaned up before new rows are inserted, so claim counts do not inflate across seed-version upgrades
- The script SHALL continue to refuse to run under `NODE_ENV=production`

#### Scenario: Re-running the seed yields stable counts

- **WHEN** `npm run db:seed:dev` runs twice in succession
- **THEN** the `purchases` row count for any given seeded item is identical after both runs

#### Scenario: Upgrading from prior seed version cleans legacy rows

- **WHEN** a dev DB previously seeded with the unsuffixed-ID scheme is re-seeded under the new script
- **THEN** no rows with ID matching `%-purchase` (without numeric suffix) remain on seeded items
