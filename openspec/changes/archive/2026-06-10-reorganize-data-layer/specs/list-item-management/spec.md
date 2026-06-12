# list-item-management — delta

Path re-pointing only: the item reads move from `lib/dal.ts` to `lib/data/item.ts` and `lib/data/purchase.ts`; the item actions from `app/actions/items.ts` to `lib/data/item.actions.ts` and `lib/data/purchase.actions.ts` (see `data-layer-organization`). No behavioral requirement changes.

## MODIFIED Requirements

### Requirement: DAL item reads SHALL sanitize purchase attribution by viewer role

The item reads (`getItemsByListId` and `getItemsByUser` in `lib/data/item.ts`; `getItemsByPurchased` in `lib/data/purchase.ts`) SHALL project each item's `purchases` through a role-aware sanitizer (`sanitizePurchases`, exported from `lib/data/purchase.ts`) before any row escapes the data-layer boundary, so that claim attribution never leaks beyond what the viewer is entitled to see. The sanitized projection SHALL expose, per purchase, only a stable `id`, a `by` tag (`'self'` or `'other'`), and a `firstName` — never a full name, email address, user id, or raw guest identity.

The projection SHALL obey these rules, keyed on whether the viewer owns the items and whether spoilers are explicitly enabled:

- **Owner without spoilers** — when the viewer owns the items and spoilers are NOT enabled, the read SHALL return an **empty** purchases array for every item, regardless of how many claims exist. An owner SHALL NOT be able to infer that, or by whom, their own items were claimed. (Owners cannot claim their own items, so every claim is gift-surprise information.)
- **Owner with spoilers** — when the viewer owns the items and spoilers ARE explicitly enabled, each claim SHALL be exposed as `{ by: 'other', firstName }` (the owner is never the claimer of their own items).
- **Non-owner viewer** — each claim SHALL be exposed as `{ by, firstName }` where `by` is `'self'` only when an authenticated `viewerId` matches the claim's `user_id`, and `'other'` otherwise.

`firstName` SHALL be derived as the first whitespace-delimited token of the claimer's stored name (falling back to the guest name), and SHALL be the literal `'Someone'` when that name is null, empty, or whitespace-only. The per-item `hasPurchases` flag (where exposed) SHALL reflect whether any claim exists **before** sanitization, so an owner-without-spoilers view can still indicate "claimed" without revealing the claimer.

#### Scenario: Owner without spoilers sees no claim attribution

- **WHEN** an item owner reads their own items (`getItemsByUser` / `getItemsByListId` with `isOwner` true) and spoilers are not enabled
- **THEN** every item's sanitized `purchases` array is empty
- **AND** no claimer first name, full name, email, or user id is present in the result
- **AND** `hasPurchases` (where exposed) still reflects that a claim exists

#### Scenario: Owner with spoilers sees first names tagged other

- **WHEN** an item owner reads their own items with spoilers explicitly enabled
- **THEN** each claim is exposed as `{ by: 'other', firstName }`
- **AND** `firstName` is the first token of the claimer's stored name, or `'Someone'` when that name is null/empty/whitespace-only

#### Scenario: Non-owner viewer sees self versus other first names only

- **WHEN** an authenticated non-owner reads items (`getItemsByListId` with a `viewerId`, or `getItemsByPurchased`)
- **THEN** a claim whose `user_id` equals the `viewerId` is tagged `{ by: 'self' }` and every other claim `{ by: 'other' }`
- **AND** only `firstName` is exposed for each claim — never a full name, email, user id, or raw guest identity

### Requirement: Purchase capacity SHALL be enforced atomically against concurrent callers

When an item has a non-null `quantity_limit`, `createPurchase` SHALL enforce the capacity to the strongest degree the `drizzle-orm/neon-http` driver permits. That driver provides **no interactive transactions and no `SELECT … FOR UPDATE`** (every query is an independent HTTP round-trip — see `db/index.ts` and `DATABASE.md`), so true cross-statement serialization of concurrent callers is not available. Enforcement therefore combines a best-effort application check with a database-level uniqueness backstop, and one residual race is an accepted limitation:

1. **Best-effort capacity check.** Before inserting, `createPurchase` SHALL count existing `purchases` rows for the item and, when `quantity_limit` is non-null and the count is `>= quantity_limit`, SHALL return `{ success: false, error: 'Fully claimed' }` without inserting. This fully enforces capacity for sequential (non-concurrent) callers.
2. **DB-level uniqueness for authenticated duplicates.** A partial unique index on `purchases (item_id, user_id) WHERE user_id IS NOT NULL` SHALL exist on the `purchases` table, so that a duplicate claim by the same authenticated user fails at the database layer (SQLSTATE `23505`) even when two requests race past the application-level duplicate check. On catching `23505`, the action SHALL return `{ success: false, error: 'Duplicate claim' }`.
3. **Accepted residual race.** Because the partial unique index constrains only `(item_id, user_id)` for non-NULL `user_id`, it does NOT serialize two *distinct* authenticated users or two guest (`user_id IS NULL`) claimants racing against the same limited item. Under true concurrency such callers MAY both pass the best-effort count and both insert, so the stored count MAY transiently exceed `quantity_limit`. This is an accepted limitation of the no-transactions driver constraint, documented at `lib/data/purchase.actions.ts`. Closing it would require a driver change (`neon-serverless` WebSocket Pool, declined without owner approval) or a schema-level capacity backstop; neither is in force today.

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
