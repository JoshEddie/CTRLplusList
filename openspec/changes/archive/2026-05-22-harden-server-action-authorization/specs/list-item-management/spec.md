## ADDED Requirements

### Requirement: createPurchase SHALL authenticate the claimer and forbid client-supplied user_id

The `createPurchase` server action's input payload SHALL be `{ item_id: string; guest_name: string | null }` — it SHALL NOT accept a `user_id` field. The action SHALL call `auth()` and:

- If a session exists, the action SHALL look up `users.id` via `session.user.email` and use that id as the purchase's `user_id`. Any `guest_name` field in the payload SHALL be ignored on this path.
- If no session exists, the action SHALL require a non-empty `guest_name` and SHALL set `purchases.user_id = NULL`. If `guest_name` is missing or empty, the action SHALL reject with `{ success: false, error: 'Missing identity' }`.

This SHALL apply uniformly regardless of how the item was reached (direct id, list page, search). The action SHALL additionally verify that the item belongs to a list the caller can view (using the same access predicate that gates `/lists/[id]` render); items on lists the caller cannot view SHALL be unclaimable, returning `{ success: false, error: 'Item not found' }` (deliberately indistinguishable from a missing item id).

This requirement is the list-item-management-specific application of the cross-cutting contract in `server-endpoint-authorization`. The cross-cutting capability owns the "no client user_id" rule globally; this requirement enumerates `createPurchase` as a permitted guest write path and binds its specific shape.

#### Scenario: Authenticated user claims an item using session identity

- **WHEN** an authenticated user invokes `createPurchase({ item_id, guest_name: 'ignored' })`
- **THEN** the action looks up `users.id` from the session, inserts `purchases` with `user_id = session.user.id` and `guest_name = NULL`, and the `guest_name` field from the payload is discarded

#### Scenario: Unauthenticated guest claims an item

- **WHEN** an unauthenticated visitor invokes `createPurchase({ item_id, guest_name: 'Aunt May' })`
- **THEN** the action inserts `purchases` with `user_id = NULL` and `guest_name = 'Aunt May'`

#### Scenario: Forged user_id has no place to land

- **WHEN** a developer inspects the `createPurchase` Zod schema
- **THEN** no `user_id` field is declared; the payload type does not accept one

#### Scenario: Claim against a non-viewable item is rejected

- **WHEN** any caller (authenticated or not) invokes `createPurchase({ item_id })` where the item belongs to a list the caller cannot view (private list they do not own, or a list owned by a user who has blocked them)
- **THEN** the action returns `{ success: false, error: 'Item not found' }` and no `purchases` row is inserted

### Requirement: Purchase capacity SHALL be enforced atomically against concurrent callers

When an item has a non-null `quantity_limit`, `createPurchase` SHALL guarantee that the number of `purchases` rows for that item never exceeds `quantity_limit`, regardless of concurrent calls. The implementation SHALL combine two enforcement layers:

1. **Transactional row lock.** The existence check, capacity count, and insert SHALL execute inside a single database transaction. Inside the transaction, the item row SHALL be locked with `SELECT … FOR UPDATE` so that concurrent `createPurchase` calls against the same item serialize.
2. **DB-level uniqueness for authenticated duplicates.** A partial unique index on `purchases (item_id, user_id) WHERE user_id IS NOT NULL` SHALL exist on the `purchases` table, so that a duplicate claim by the same authenticated user fails at the database layer even if the application-level check is bypassed.

When the capacity check inside the transaction reveals the item is now full, the action SHALL return `{ success: false, error: 'Fully claimed' }`. When the duplicate-claim unique index trips, the action SHALL return `{ success: false, error: 'Duplicate claim' }`.

#### Scenario: Two concurrent claims on a quantity_limit=1 item

- **WHEN** two distinct authenticated users invoke `createPurchase({ item_id })` simultaneously against an item with `quantity_limit = 1` and no existing purchases
- **THEN** exactly one call returns `{ success: true }` and the other returns `{ success: false, error: 'Fully claimed' }`; the `purchases` table contains exactly one row for that item

#### Scenario: Same user submits duplicate claims racing through different replicas

- **WHEN** authenticated user A submits `createPurchase({ item_id })` twice in quick succession through two distinct server-action invocations
- **THEN** exactly one row is inserted; the duplicate hits the partial unique index and the second invocation returns `{ success: false, error: 'Duplicate claim' }`

### Requirement: removePurchase for guest callers SHALL require the purchase row id

`removePurchase` SHALL accept an input payload of `{ purchase_id: string }` (preferred) OR — for backwards compatibility with the legacy item-scoped flow — `{ item_id: string; guest_name?: string | null }` for authenticated callers only.

For an unauthenticated guest caller, the action SHALL require `purchase_id` and SHALL load that row to verify `purchases.user_id IS NULL` AND `purchases.guest_name = payload.guest_name`. If either check fails, the action SHALL return `{ success: false, error: 'Not your claim' }` without deleting any row. The action SHALL NOT permit guest deletion by `(item_id, guest_name)` alone.

For an authenticated caller, the action SHALL look up `users.id` from the session and SHALL only delete rows where `purchases.user_id = sessionUser.id`. Guest_name SHALL be ignored on this path.

#### Scenario: Two guests with the same display name cannot revoke each other

- **WHEN** guest "Mom" (browser A) has claimed item X, and a different guest also typing "Mom" (browser B) invokes `removePurchase({ item_id: X, guest_name: 'Mom' })` without a `purchase_id`
- **THEN** the action returns `{ success: false, error: 'Missing identity' }` and the original guest's claim is unchanged

#### Scenario: Guest revokes their own claim with the purchase row id

- **WHEN** the guest who created a claim invokes `removePurchase({ purchase_id })` with the purchase row id surfaced by the UI for their own claim, and supplies the matching `guest_name`
- **THEN** the action deletes that row and returns `{ success: true }`

#### Scenario: Authenticated user revokes their own claim

- **WHEN** authenticated user A invokes `removePurchase({ item_id })` for an item they have claimed
- **THEN** the action deletes the row where `purchases.user_id = A.id AND purchases.item_id = item_id` and returns `{ success: true }`
