## MODIFIED Requirements

### Requirement: Purchase capacity SHALL be enforced atomically against concurrent callers

When an item has a non-null `quantity_limit`, `createPurchase` SHALL bound the number of `purchases` rows for that item using two enforcement layers that are compatible with the `drizzle-orm/neon-http` driver's no-interactive-transactions constraint (see DATABASE.md; the driver supports neither `db.transaction(...)` nor `SELECT … FOR UPDATE`):

1. **In-app pre-insert check.** Before inserting, the action SHALL load the existing `purchases` rows for the item and reject when (a) the caller has already claimed it (`{ success: false, error: 'Duplicate claim' }`), or (b) the row count has reached `quantity_limit` (`{ success: false, error: 'Fully claimed' }`). This check is best-effort: because each statement is its own HTTP round-trip with no row lock, it does NOT serialize concurrent callers.
2. **DB-level uniqueness for authenticated duplicates.** A partial unique index on `purchases (item_id, user_id) WHERE user_id IS NOT NULL` SHALL exist on the `purchases` table, so that a duplicate claim by the same authenticated user fails at the database layer even when two requests race past the in-app check on distinct connections. When this index trips, `createPurchase` SHALL catch the Postgres unique-violation (`23505`, via `lib/sqlstate`) and return `{ success: false, error: 'Duplicate claim' }`.

**Accepted residual.** Because there is no row lock, two *distinct* callers racing on a limited item — two different authenticated users, or two guest claims (`user_id IS NULL`, which the partial index does not constrain) — can both pass the in-app capacity count and both insert, transiently overshooting `quantity_limit`. This race is NOT closed at the DB layer and is accepted as a known limitation under the no-transactions driver constraint, consistent with the project-wide rule that cross-statement atomicity is backstopped by constraints or accepted as residual. Closing it would require `SELECT … FOR UPDATE` (a transaction) or a switch to `neon-serverless` / WebSocket Pool, neither of which is permitted without owner approval.

#### Scenario: Same user submits duplicate claims racing through different connections

- **WHEN** authenticated user A submits `createPurchase({ item_id })` twice in quick succession through two distinct server-action invocations against an item A has not yet claimed
- **THEN** exactly one row is inserted; the second invocation either fails the in-app duplicate check OR trips the partial unique index, and in both cases returns `{ success: false, error: 'Duplicate claim' }`

#### Scenario: In-app capacity check rejects a claim once the limit is reached

- **WHEN** an item has `quantity_limit = 1` with one existing purchase, and a different caller invokes `createPurchase({ item_id })`
- **THEN** the in-app check observes the row count has reached the limit and returns `{ success: false, error: 'Fully claimed' }` without inserting

#### Scenario: Capacity overshoot by distinct concurrent callers is accepted residual

- **WHEN** two distinct callers (two authenticated users, or two guests) invoke `createPurchase({ item_id })` simultaneously against an item with `quantity_limit = 1` and no existing purchases, and both pass the in-app capacity count before either insert commits
- **THEN** both inserts MAY succeed (the partial unique index does not constrain distinct `user_id` values, nor `NULL` guest rows), transiently exceeding `quantity_limit`; this residual race is accepted under the no-transactions driver constraint and is NOT treated as a defect
