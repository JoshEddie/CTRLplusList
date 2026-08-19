## MODIFIED Requirements

### Requirement: Purchase capacity SHALL be enforced atomically against concurrent callers

When an item has a non-null `quantity_limit`, `createPurchase` SHALL enforce the capacity to the strongest degree the `drizzle-orm/neon-http` driver permits. That driver provides **no interactive transactions and no `SELECT … FOR UPDATE`** (every query is an independent HTTP round-trip — see `db/index.ts` and `DATABASE.md`), so true cross-statement serialization of concurrent callers is not available. Enforcement therefore combines a best-effort application check with a database-level uniqueness backstop, and one residual race is an accepted limitation:

1. **Best-effort capacity check.** Before inserting, `createPurchase` SHALL count existing `purchases` rows for the item and, when `quantity_limit` is non-null and the count is `>= quantity_limit`, SHALL return `{ success: false, error: 'Fully claimed' }` without inserting. This fully enforces capacity for sequential (non-concurrent) callers.
2. **DB-level uniqueness for authenticated duplicates.** A partial unique index on `purchases (item_id, profile_id) WHERE profile_id IS NOT NULL` SHALL exist on the `purchases` table, so that a duplicate claim naming the same purchaser profile fails at the database layer (SQLSTATE `23505`) even when two requests race past the application-level duplicate check. On catching `23505`, the action SHALL return `{ success: false, error: 'Duplicate claim' }`.
3. **Accepted residual race.** Because the partial unique index constrains only `(item_id, profile_id)` for non-NULL `profile_id`, it does NOT serialize two *distinct* purchaser profiles or two guest (`profile_id IS NULL`) claimants racing against the same limited item. Under true concurrency such callers MAY both pass the best-effort count and both insert, so the stored count MAY transiently exceed `quantity_limit`. This is an accepted limitation of the no-transactions driver constraint, documented at `lib/data/purchase.actions.ts`. Closing it would require a driver change (`neon-serverless` WebSocket Pool, declined without owner approval) or a schema-level capacity backstop; neither is in force today.

#### Scenario: Sequential claim against a full item is rejected

- **WHEN** an authenticated user invokes `createPurchase({ item_id })` against an item with `quantity_limit = 1` that already has one `purchases` row
- **THEN** the action returns `{ success: false, error: 'Fully claimed' }` and no new `purchases` row is inserted

#### Scenario: Same user duplicate claim trips the partial unique index

- **WHEN** authenticated user A submits `createPurchase({ item_id })` twice and the second insert reaches the database despite the application duplicate check (e.g. two invocations racing through distinct DB sessions)
- **THEN** the second insert violates the partial unique index `purchases (item_id, profile_id) WHERE profile_id IS NOT NULL` with SQLSTATE `23505`
- **AND** the action catches it and returns `{ success: false, error: 'Duplicate claim' }`
- **AND** exactly one `purchases` row exists for that `(item_id, profile_id)` pair

#### Scenario: Concurrent distinct claimants on a limited item — residual race is accepted

- **WHEN** two distinct authenticated users (or two guests) invoke `createPurchase({ item_id })` truly concurrently against an item with `quantity_limit = 1` and no existing purchases
- **THEN** the partial unique index does NOT block either insert (the rows differ in `profile_id`, or both have `profile_id IS NULL`)
- **AND** the stored count MAY exceed `quantity_limit`
- **AND** this outcome is an accepted limitation of the `neon-http` no-transactions constraint, NOT a contract violation

### Requirement: removePurchase for guest callers SHALL require the purchase row id

`removePurchase` SHALL accept an input payload of `{ purchase_id: string }` (preferred) OR — for backwards compatibility with the legacy item-scoped flow — `{ item_id: string; guest_name?: string | null }` for authenticated callers only.

For an unauthenticated guest caller, the action SHALL require `purchase_id` and SHALL load that row to verify `purchases.profile_id IS NULL` AND `purchases.guest_name = payload.guest_name`. If either check fails, the action SHALL return `{ success: false, error: 'Not your claim' }` without deleting any row. The action SHALL NOT permit guest deletion by `(item_id, guest_name)` alone.

For an authenticated caller, the action SHALL resolve the profile the request acts as and SHALL only delete rows where `purchases.profile_id` equals it. Guest_name SHALL be ignored on this path.

#### Scenario: Two guests with the same display name cannot revoke each other

- **WHEN** guest "Mom" (browser A) has claimed item X, and a different guest also typing "Mom" (browser B) invokes `removePurchase({ item_id: X, guest_name: 'Mom' })` without a `purchase_id`
- **THEN** the action returns `{ success: false, error: 'Missing identity' }` and the original guest's claim is unchanged

#### Scenario: Guest revokes their own claim with the purchase row id

- **WHEN** the guest who created a claim invokes `removePurchase({ purchase_id })` with the purchase row id surfaced by the UI for their own claim, and supplies the matching `guest_name`
- **THEN** the action deletes that row and returns `{ success: true }`

#### Scenario: Authenticated user revokes their own claim

- **WHEN** authenticated user A invokes `removePurchase({ item_id })` for an item they have claimed
- **THEN** the action deletes the row where `purchases.profile_id` is A's self-profile and `purchases.item_id = item_id`, and returns `{ success: true }`
