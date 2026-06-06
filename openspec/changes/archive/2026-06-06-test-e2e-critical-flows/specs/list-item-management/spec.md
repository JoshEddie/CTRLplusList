## MODIFIED Requirements

### Requirement: createPurchase SHALL authenticate the claimer and forbid client-supplied user_id

The `createPurchase` server action's input payload SHALL be `{ item_id: string; guest_name: string | null }` — it SHALL NOT accept a `user_id` field. The action SHALL call `auth()` and:

- If a session exists AND no non-empty `guest_name` is provided, the action SHALL look up `users.id` via `session.user.email` and use that id as the purchase's `user_id` (a self-claim), with `guest_name = NULL`.
- If a session exists AND a non-empty `guest_name` is provided, the action SHALL record a claim **on behalf of that named third party**: it SHALL set `purchases.user_id = NULL` and `purchases.guest_name = <trimmed name>`, so the stored claim belongs to the named person, not to the caller. The authenticated caller's looked-up `users.id` SHALL still be used to authorize the request (the viewability / owner-block gate below), so a blocked caller cannot claim via this path. No `user_id` is ever taken from the payload — the third party is a free-text name, never an account.
- If no session exists, the action SHALL require a non-empty `guest_name` and SHALL set `purchases.user_id = NULL`. If `guest_name` is missing or empty, the action SHALL reject with `{ success: false, error: 'Missing identity' }`.

This SHALL apply uniformly regardless of how the item was reached (direct id, list page, search). The action SHALL additionally verify that the item belongs to a list the caller can view (using the same access predicate that gates `/lists/[id]` render); items on lists the caller cannot view SHALL be unclaimable, returning `{ success: false, error: 'Item not found' }` (deliberately indistinguishable from a missing item id).

The access predicate SHALL treat both `'unlisted'` and `'public'` lists as viewable by **any** caller — guest (no session) or authenticated, follower or not — subject only to the owner-block check (a list owned by a user who has blocked the caller is never viewable). A `'public'` list is therefore claimable by anyone who can reach its URL; the follow relationship governs feed discovery, not claim access. Only `'private'` lists (viewable solely by their owner) and blocked-owner lists are non-viewable. This is the `list-item-management` application of the access model owned by `list-visibility` ("a `public` list is visible to anyone with the URL").

This requirement is the list-item-management-specific application of the cross-cutting contract in `server-endpoint-authorization`. The cross-cutting capability owns the "no client user_id" rule globally; this requirement enumerates `createPurchase` as a permitted guest write path — for an unauthenticated caller, AND for an authenticated caller recording a claim on behalf of a named third party — and binds its specific shape.

#### Scenario: Authenticated user self-claims using session identity

- **WHEN** an authenticated user invokes `createPurchase({ item_id, guest_name: null })`
- **THEN** the action looks up `users.id` from the session and inserts `purchases` with `user_id = session.user.id` and `guest_name = NULL`

#### Scenario: Authenticated user claims on behalf of a named other person

- **WHEN** an authenticated user invokes `createPurchase({ item_id, guest_name: 'Aunt May' })`
- **THEN** the action inserts `purchases` with `user_id = NULL` and `guest_name = 'Aunt May'` — the typed name is honored (not discarded), and the claim is attributed to the named third party rather than to the caller
- **AND** the request is still authorized using the caller's session identity, so a blocked caller is rejected with `{ success: false, error: 'Item not found' }`

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

### Requirement: The purchase modal SHALL render the claim flow for the viewer's auth state and dispatch claims without a client-supplied user_id

The purchase/claim modal UI (`PurchaseFlowContainer` mounted by `Item.tsx` via `Modal`) SHALL select which claim flow it renders from the viewer's authentication state, and SHALL produce claim/un-claim dispatches that obey the identity contract owned by the `createPurchase` / `removePurchase` server-action requirements in this capability:

- For an **unauthenticated** viewer, the modal SHALL render a guest flow that captures a non-empty display name before claiming and SHALL expose a sign-in affordance; the resulting `createPurchase` call SHALL carry `{ item_id, guest_name }` and SHALL NOT carry a `user_id`.
- For an **authenticated** viewer, the modal SHALL render a self-vs-other branch:
  - **claim for myself** — the resulting `createPurchase` call SHALL carry `{ item_id, guest_name: null }` (identity resolved server-side from the session, recorded as a self-claim);
  - **mark bought for someone else** — the modal SHALL capture a non-empty purchaser name, and the resulting `createPurchase` call SHALL carry `{ item_id, guest_name: <entered name> }`, recording a claim attributed to that named third party.

  Neither branch SHALL carry a `user_id`.
- Un-claiming SHALL dispatch `removePurchase`; for a guest the dispatch SHALL carry the claim's `purchase_id` (never `(item_id, guest_name)` alone), and for an authenticated caller it SHALL carry the item reference for the session-owned row.

This requirement governs the **UI** that produces those payloads; the server-side enforcement of identity, capacity, and the partial-unique-index duplicate backstop is owned by this capability's `createPurchase` / `removePurchase` / capacity requirements (locked by the action-layer carve-out `test-list-item-management`). The no-client-`user_id` rule is the list-item-management-specific application of the cross-cutting `server-endpoint-authorization` contract; this requirement does not restate that cross-cutting SHALL, it binds the UI to it.

#### Scenario: Unauthenticated viewer claims as a guest

- **WHEN** an unauthenticated viewer opens the purchase modal on a claimable item, enters a display name, and confirms the claim
- **THEN** the modal calls `createPurchase` with `{ item_id, guest_name: <entered name> }` and no `user_id` field
- **AND** the modal also exposes a sign-in affordance

#### Scenario: Unauthenticated viewer cannot claim with an empty guest name

- **WHEN** an unauthenticated viewer attempts to confirm a claim without entering a display name
- **THEN** the confirm affordance is disabled (or the claim is not dispatched) and no `createPurchase` call is made

#### Scenario: Authenticated viewer self-claims using session identity

- **WHEN** an authenticated viewer opens the purchase modal and confirms a claim for themselves
- **THEN** the modal calls `createPurchase` with `{ item_id, guest_name: null }` and no `user_id` field

#### Scenario: Authenticated viewer marks an item bought for someone else

- **WHEN** an authenticated viewer opens the purchase modal, chooses "Someone else", enters a purchaser name, and confirms
- **THEN** the modal calls `createPurchase` with `{ item_id, guest_name: <entered name> }` and no `user_id` field
- **AND** the resulting claim is attributed to the named third party (displayed as "Claimed by <name>"), not to the viewer

#### Scenario: Guest un-claim dispatches the purchase row id

- **WHEN** a guest revokes their own claim from the modal
- **THEN** the modal calls `removePurchase` carrying that claim's `purchase_id`, not `(item_id, guest_name)` alone
