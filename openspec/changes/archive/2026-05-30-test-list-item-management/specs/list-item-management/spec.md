## MODIFIED Requirements

### Requirement: Purchase capacity SHALL be enforced atomically against concurrent callers

When an item has a non-null `quantity_limit`, `createPurchase` SHALL enforce the capacity to the strongest degree the `drizzle-orm/neon-http` driver permits. That driver provides **no interactive transactions and no `SELECT … FOR UPDATE`** (every query is an independent HTTP round-trip — see `db/index.ts` and `DATABASE.md`), so true cross-statement serialization of concurrent callers is not available. Enforcement therefore combines a best-effort application check with a database-level uniqueness backstop, and one residual race is an accepted limitation:

1. **Best-effort capacity check.** Before inserting, `createPurchase` SHALL count existing `purchases` rows for the item and, when `quantity_limit` is non-null and the count is `>= quantity_limit`, SHALL return `{ success: false, error: 'Fully claimed' }` without inserting. This fully enforces capacity for sequential (non-concurrent) callers.
2. **DB-level uniqueness for authenticated duplicates.** A partial unique index on `purchases (item_id, user_id) WHERE user_id IS NOT NULL` SHALL exist on the `purchases` table, so that a duplicate claim by the same authenticated user fails at the database layer (SQLSTATE `23505`) even when two requests race past the application-level duplicate check. On catching `23505`, the action SHALL return `{ success: false, error: 'Duplicate claim' }`.
3. **Accepted residual race.** Because the partial unique index constrains only `(item_id, user_id)` for non-NULL `user_id`, it does NOT serialize two *distinct* authenticated users or two guest (`user_id IS NULL`) claimants racing against the same limited item. Under true concurrency such callers MAY both pass the best-effort count and both insert, so the stored count MAY transiently exceed `quantity_limit`. This is an accepted limitation of the no-transactions driver constraint, documented at `app/actions/items.ts`. Closing it would require a driver change (`neon-serverless` WebSocket Pool, declined without owner approval) or a schema-level capacity backstop; neither is in force today.

#### Scenario: Sequential claim against a full item is rejected

- **WHEN** an authenticated user invokes `createPurchase({ item_id })` against an item with `quantity_limit = 1` that already has one `purchases` row
- **THEN** the action returns `{ success: false, error: 'Fully claimed' }` and no new `purchases` row is inserted

#### Scenario: Same user duplicate claim trips the partial unique index

- **WHEN** authenticated user A submits `createPurchase({ item_id })` twice and the second insert reaches the database despite the application duplicate check (e.g. two invocations racing through distinct DB sessions)
- **THEN** the second insert violates the partial unique index `purchases (item_id, user_id) WHERE user_id IS NOT NULL` with SQLSTATE `23505`
- **AND** the action catches it and returns `{ success: false, error: 'Duplicate claim' }`
- **AND** exactly one `purchases` row exists for that `(item_id, user_id)` pair

#### Scenario: Concurrent distinct claimants on a limited item — residual race is accepted

- **WHEN** two distinct authenticated users (or two guests) invoke `createPurchase({ item_id })` truly concurrently against an item with `quantity_limit = 1` and no existing purchases
- **THEN** the partial unique index does NOT block either insert (the rows differ in `user_id`, or both have `user_id IS NULL`)
- **AND** the stored count MAY exceed `quantity_limit`
- **AND** this outcome is an accepted limitation of the `neon-http` no-transactions constraint, NOT a contract violation

## ADDED Requirements

### Requirement: updatePriority SHALL reorder list items via fractional positions with rebalance on collision

The `updatePriority(item_id, target_id, listId)` server action SHALL move an item to the position of a target item within a single list, owner-only, using integer fractional indexing over the `list_items.position` column. New `list_items` rows SHALL be appended at `MAX(position) + 65536` (base spacing 65536). On a move, the new position SHALL be computed as the integer midpoint between the target's position and the neighboring row on the side the moved item is travelling from:

- Moving an item from a higher position toward a lower target: `new = floor((prevLowerNeighbor + targetPosition) / 2)`, or `floor(targetPosition / 2)` when the target is already the lowest row (no lower neighbor).
- Moving an item from a lower position toward a higher target: `new = floor((nextHigherNeighbor + targetPosition) / 2)`, or `targetPosition + 65536` when the target is already the highest row (no higher neighbor).

After applying the move, the action SHALL check the two highest positions on the list; when their difference is below a minimum gap of `0.001`, the action SHALL rebalance the entire list by rewriting every row's position to `(index + 1) * 65536` in ascending position order, restoring uniform spacing. The action SHALL invalidate the `items` cache tag on success.

The action SHALL guard inputs: a caller who is not the list owner SHALL receive an unauthorized response and no write SHALL occur; when either `item_id` or `target_id` is not a member of `listId`, the action SHALL return `{ success: false, error: 'Item or target not found on this list' }`; when the moved item already occupies the target's exact position, the action SHALL return `{ success: false, error: 'Item is already at the target position' }` and no write SHALL occur.

#### Scenario: Move computes the integer midpoint between target and neighbor

- **WHEN** the owner moves an item to sit next to a target that has a neighboring row on the travel side
- **THEN** the moved item's `list_items.position` is updated to the integer floor of the midpoint between the target's position and that neighbor's position
- **AND** the relative order of the other rows is unchanged

#### Scenario: Move to the front edge halves the target position

- **WHEN** the owner moves an item ahead of the current lowest-position row (the target has no lower neighbor)
- **THEN** the moved item's position is set to `floor(targetPosition / 2)`

#### Scenario: Move past the back edge adds base spacing

- **WHEN** the owner moves an item past the current highest-position row (the target has no higher neighbor)
- **THEN** the moved item's position is set to `targetPosition + 65536`

#### Scenario: Collision below min gap triggers full rebalance

- **WHEN** a move would leave the two highest positions on the list differing by less than `0.001`
- **THEN** every `list_items` row on the list is rewritten to `(index + 1) * 65536` in ascending order, restoring 65536 spacing
- **AND** the displayed order is preserved

#### Scenario: Moving to the same position is a no-op

- **WHEN** the owner invokes `updatePriority` with an `item_id` whose position already equals the target's position
- **THEN** the action returns `{ success: false, error: 'Item is already at the target position' }` and no `list_items` row is updated

#### Scenario: Non-member item or target is rejected

- **WHEN** the owner invokes `updatePriority` where `item_id` or `target_id` is not a member of `listId`
- **THEN** the action returns `{ success: false, error: 'Item or target not found on this list' }` and no row is updated

#### Scenario: Non-owner reorder is rejected

- **WHEN** a user who does not own `listId` invokes `updatePriority`
- **THEN** the action returns an unauthorized response and no `list_items` row is updated
