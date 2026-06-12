## MODIFIED Requirements

### Requirement: createPurchase SHALL authenticate the claimer and forbid client-supplied user_id

The `createPurchase` server action's input payload SHALL be `{ item_id: string; guest_name: string | null }` — it SHALL NOT accept a `user_id` field. The action SHALL call `auth()` and:

- If a session exists, the action SHALL look up `users.id` via `session.user.email` and use that id as the purchase's `user_id`. Any `guest_name` field in the payload SHALL be ignored on this path.
- If no session exists, the action SHALL require a non-empty `guest_name` and SHALL set `purchases.user_id = NULL`. If `guest_name` is missing or empty, the action SHALL reject with `{ success: false, error: 'Missing identity' }`.

This SHALL apply uniformly regardless of how the item was reached (direct id, list page, search). The action SHALL additionally verify that the item belongs to a list the caller can view (using the same access predicate that gates `/lists/[id]` render); items on lists the caller cannot view SHALL be unclaimable, returning `{ success: false, error: 'Item not found' }` (deliberately indistinguishable from a missing item id).

The access predicate SHALL treat both `'unlisted'` and `'public'` lists as viewable by **any** caller — guest (no session) or authenticated, follower or not — subject only to the owner-block check (a list owned by a user who has blocked the caller is never viewable). A `'public'` list is therefore claimable by anyone who can reach its URL; the follow relationship governs feed discovery, not claim access. Only `'private'` lists (viewable solely by their owner) and blocked-owner lists are non-viewable. This is the `list-item-management` application of the access model owned by `list-visibility` ("a `public` list is visible to anyone with the URL").

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

#### Scenario: Guest claims an item on a public list

- **WHEN** an unauthenticated guest invokes `createPurchase({ item_id, guest_name: 'Aunt May' })` for an item that belongs only to a `'public'` list whose owner has not blocked anyone
- **THEN** the access predicate resolves the item as viewable and the action inserts `purchases` with `user_id = NULL` and `guest_name = 'Aunt May'` — it does NOT return `'Item not found'`

#### Scenario: Authenticated non-follower claims an item on a public list

- **WHEN** an authenticated user who does NOT follow the list owner invokes `createPurchase({ item_id })` for an item that belongs only to that owner's `'public'` list, and the owner has not blocked the caller
- **THEN** the access predicate resolves the item as viewable and the claim is inserted — viewability does NOT depend on a follow relationship

#### Scenario: Blocked caller cannot claim on a public list

- **WHEN** a caller invokes `createPurchase({ item_id })` for an item on a `'public'` list whose owner has blocked that caller
- **THEN** the access predicate resolves the item as non-viewable and the action returns `{ success: false, error: 'Item not found' }` with no `purchases` row inserted
