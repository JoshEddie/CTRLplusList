# server-endpoint-authorization — delta

## MODIFIED Requirements

### Requirement: Server actions SHALL resolve the acting user from the session, not the request payload

Every Next.js server action exported from a `lib/data/*.actions.ts` module (the server-action home defined by `data-layer-organization`) that writes to a user-owned resource (rows whose schema includes a user-ownership foreign key — currently `lists`, `items`, `purchases`; for `purchases` the actor-bearing column is `claimed_by`, while `user_id` means "the purchaser") SHALL determine the acting user id by:

1. Calling `auth()` and rejecting (`{ success: false, error: 'Unauthorized' }`) if no session exists or `session.user.email` is absent, except where this requirement's "guest write paths" clause permits anonymous writes.
2. Looking up `users.id` from `users.email` against the database.
3. Using the looked-up `users.id` as the actor for any subsequent ownership check, insert ownership value, or audit field.

Server actions SHALL NOT accept a `user_id` (or `claimed_by`) field on their input payloads or Zod schemas. If a payload Zod schema previously declared such a field, that field SHALL be removed; clients SHALL NOT need to construct it. The `purchases.claimed_by` column is always the session-resolved actor (or NULL on the unauthenticated guest path) — never client-supplied.

A `purchased_by` target MAY be accepted on the `createPurchase` payload (stored into `purchases.user_id`, the purchaser column), but it is an attribution *target*, not the actor: the action SHALL re-verify server-side that the target is in the eligible attributed-purchaser pool defined by the `claim-attribution` capability (the list owner's mutual follows, excluding block edges with the claimer, excluding the owner) and reject ineligible targets before any insert. The no-client-`user_id` rule is preserved: the payload field is the distinctly-named, re-verified target, never the actor identity.

Guest write paths SHALL be enumerated in the action's spec by name. They are currently:

- `createPurchase` when a non-empty `guest_name` is provided — by an unauthenticated caller, OR by an authenticated caller recording a claim on behalf of a named non-user. On this path the stored row's `user_id` SHALL be NULL — the named third party is a free-text label — while `claimed_by` SHALL record the authenticated caller when one exists (NULL only for unauthenticated guests). For the unauthenticated case, subsequent self-service (recognition and removal) is scoped by the server-managed `guest_claims` cookie owned by `guest-claim-identity` — an httpOnly credential holding the browser's own purchase ids, which a caller could not have obtained for another party's claims; the cookie is ambient request state, never a payload field. Attributing a claim to a real user account is NOT a guest write path; it is the authenticated attributed-claim path governed by the `claim-attribution` capability's pool re-verification.
- `removePurchase` when invoked by an unauthenticated caller — authorized solely by the `guest_claims` cookie path defined in the `claim-attribution` removal matrix (all-NULL-identity row whose id the cookie lists). The former exact-`guest_name`-match authorization is retired and the payload carries no guest-identity field.
- `mintItemPlaceholder` (owned by `item-placeholder-art`) — an unauthenticated or authenticated viewer materializing an imageless item's placeholder art. The path is admissible without a session because the write carries no caller identity and no caller-supplied content: the payload is the item id alone, the inserted row is fully server-derived (art seeded by the item id), the action is idempotent (no insert when an active image already exists), and it SHALL be gated on the caller's authorization to view the item (`isItemViewable`), the same visibility gate the guest purchase path uses.

#### Scenario: Authenticated mutation uses session identity

- **WHEN** an authenticated user calls a server action that writes to a user-owned resource AND the request payload contains no actor-identity field
- **THEN** the action calls `auth()`, looks up `users.id` via `session.user.email`, and uses that id for any ownership-bearing column

#### Scenario: Forged user_id in payload is impossible to express

- **WHEN** a developer inspects the Zod schema for any covered server action's input
- **THEN** no `user_id` or `claimed_by` field is declared on the schema; the actor identity cannot be passed by the client without a type error

#### Scenario: Unauthenticated mutation is rejected unless explicitly guest-allowed

- **WHEN** an unauthenticated caller invokes a server action that writes to a user-owned resource AND that action is not listed in the guest write paths clause
- **THEN** the action returns `{ success: false, error: 'Unauthorized' }` without performing any database write

#### Scenario: Authenticated caller records a claim on behalf of a named third party

- **WHEN** an authenticated caller invokes the enumerated guest write path `createPurchase({ item_id, guest_name: '<name>' })` for an item it is authorized to view
- **THEN** the action authorizes the request using the caller's session identity, inserts a `purchases` row with `claimed_by` = the session-resolved caller, `user_id = NULL`, and `guest_name = '<name>'`, and no actor identity is taken from the payload

#### Scenario: Attributed purchaser target is re-verified, not trusted

- **WHEN** an authenticated caller invokes `createPurchase` with an attribution target outside the eligible attributed-purchaser pool
- **THEN** the action rejects without inserting a row, regardless of what the client picker displayed

#### Scenario: Guest removal authorizes from the cookie, never the payload

- **WHEN** an unauthenticated caller invokes `removePurchase` on an all-NULL-identity row
- **THEN** authorization derives from the request's `guest_claims` cookie alone; no payload field can assert guest identity, and a caller without the row's id in their cookie is rejected with no write

#### Scenario: Guest mint is view-gated and content-free

- **WHEN** an unauthenticated viewer invokes `mintItemPlaceholder` for an imageless item on a list they are authorized to view
- **THEN** the action inserts the server-derived placeholder row without requiring a session, and the same call against a list the viewer cannot see returns `{ success: false, error: 'Unauthorized' }` with no write

### Requirement: Server actions SHALL verify resource ownership before update or delete

Every server action that updates or deletes a row in a user-owned table SHALL load the target row, compare its ownership identity to the session-resolved actor id, and reject with `{ success: false, error: 'Unauthorized' }` if the actor holds no right to the row. The check SHALL occur before any `db.update` / `db.delete` call. This applies to `lists`, `items`, `purchases`, and any future user-owned resource.

For `lists` and `items`, the ownership identity is the row's `user_id` and the actor must equal it. For `purchases`, removal rights are the matrix defined by the `claim-attribution` capability: the actor must equal the row's `claimed_by`, OR the row's purchaser `user_id`, OR the `user_id` of the item the purchase targets (owner master unclaim); the unauthenticated path is the `guest_claims` cookie authorization (all-NULL-identity row whose id the cookie lists — the former guest-name-match path is retired). The purchase-removal check therefore SHALL load both the purchase row and its target item's owner before any delete.

Actions whose target row already encodes the relationship in its where-clause SHALL still load the row first when the action's success/error response semantics depend on whether the row existed, to distinguish "no such row" from "not your row".

Specific actions covered by this requirement (non-exhaustive — every future action that updates a user-owned row is automatically covered):

- `lib/data/list.actions.ts`: `updateList`, `deleteList`, `setListVisibility`.
- `lib/data/listItems.actions.ts`: `setListItems`, `updatePriority`.
- `lib/data/item.actions.ts`: `updateItem`, `archiveItem`, `deleteItem`.
- `lib/data/item.associations.ts`: `updateItemLists`, `updateItemStores` — internal helpers invoked by the item actions, not endpoints; their ownership checks are covered the same way.
- `lib/data/purchase.actions.ts`: `removePurchase` — authorized by the claim-attribution removal matrix above.

Actions in this list MUST NOT accept the actor id as a function parameter (e.g. `deleteItem(id, userId)`). The actor id is exclusively resolved from `auth()`. Existing call sites that pass an actor id SHALL be updated in lockstep with the signature change.

#### Scenario: Non-owner update is rejected

- **WHEN** authenticated user A invokes `updateList(idOwnedByUserB, …)`
- **THEN** the action returns `{ success: false, error: 'Unauthorized' }` and `lists` is unchanged

#### Scenario: Non-owner delete is rejected

- **WHEN** authenticated user A invokes `deleteList(idOwnedByUserB)` or `deleteItem(idOwnedByUserB)`
- **THEN** the action returns `{ success: false, error: 'Unauthorized' }` and the target row is unchanged

#### Scenario: Owner update succeeds

- **WHEN** authenticated user A invokes `updateList(idOwnedByUserA, validatedData)`
- **THEN** the action applies the partial update and returns `{ success: true, message: 'List updated successfully', id }`

#### Scenario: Non-owner item update is rejected

- **WHEN** authenticated user A invokes `updateItem({ id: itemIdOwnedByUserB, name: 'pwned' })`
- **THEN** the action returns `{ success: false, error: 'Unauthorized' }` and the target item row is unchanged

#### Scenario: Non-owner item list-association update is rejected

- **WHEN** authenticated user A invokes `updateItemLists([listIds…], itemIdOwnedByUserB)` OR `updateItemLists([listIdOwnedByUserB], itemIdOwnedByUserA)`
- **THEN** the action returns unauthorized and no rows in `list_items` are inserted or deleted

#### Scenario: Non-owner item store-association update is rejected

- **WHEN** authenticated user A invokes `updateItemStores([stores…], itemIdOwnedByUserB)`
- **THEN** the action returns unauthorized and no rows in `item_stores` are inserted, updated, or deleted

#### Scenario: Non-owner list reorder is rejected

- **WHEN** authenticated user A invokes `updatePriority(itemId, targetId, listIdOwnedByUserB)`
- **THEN** the action returns unauthorized and the existing `list_items.position` values on the target list are unchanged

#### Scenario: Caller-supplied actor id is impossible to spoof

- **WHEN** a developer inspects the signature of `deleteItem` (or any other covered action)
- **THEN** the signature accepts the resource id only; the actor id is not a function parameter and cannot be passed by the client

#### Scenario: Purchase removal by a rights-holder succeeds

- **WHEN** an authenticated user who is the purchase row's `claimed_by`, its purchaser `user_id`, or the owner of the item it targets invokes `removePurchase`
- **THEN** the action loads the purchase row and the item owner, confirms the right, and deletes the row

#### Scenario: Purchase removal by an unrelated user is rejected

- **WHEN** an authenticated user holding none of the three rights invokes `removePurchase` on an existing row
- **THEN** the action returns `{ success: false }` with no delete performed
