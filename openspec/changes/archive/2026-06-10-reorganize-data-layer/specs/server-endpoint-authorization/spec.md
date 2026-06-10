# server-endpoint-authorization — delta

Path re-pointing only: server actions move from `app/actions/**` to the `lib/data/*.actions.ts` modules (see `data-layer-organization`). The authorization shape — session-resolved actor, ownership checks, no actor parameters — is unchanged.

## MODIFIED Requirements

### Requirement: Server actions SHALL resolve the acting user from the session, not the request payload

Every Next.js server action exported from a `lib/data/*.actions.ts` module (the server-action home defined by `data-layer-organization`) that writes to a user-owned resource (rows whose schema includes a `user_id` foreign key — currently `lists`, `items`, `purchases`) SHALL determine the acting user id by:

1. Calling `auth()` and rejecting (`{ success: false, error: 'Unauthorized' }`) if no session exists or `session.user.email` is absent, except where this requirement's "guest write paths" clause permits anonymous writes.
2. Looking up `users.id` from `users.email` against the database.
3. Using the looked-up `users.id` as the actor for any subsequent ownership check, insert `user_id` value, or audit field.

Server actions SHALL NOT accept a `user_id` field on their input payloads or Zod schemas. If a payload Zod schema previously declared `user_id`, that field SHALL be removed; clients SHALL NOT need to construct it.

Guest write paths (currently only `createPurchase` when a non-empty `guest_name` is provided — by an unauthenticated caller, OR by an authenticated caller recording a claim on behalf of a named third party) SHALL be enumerated in the action's spec by name and SHALL scope writes to a guest-identity field (`guest_name`) that the caller could not have guessed for a third party (e.g. `guest_name` paired with an out-of-band `purchase_id` for subsequent edits). On such a path the stored row's `user_id` SHALL be NULL — the named third party is a free-text label, never an account — so the "no client user_id" rule is preserved: an authenticated on-behalf caller is still authorized via their session, but the claim they record is attributed to the named guest, not to any user account.

#### Scenario: Authenticated mutation uses session identity

- **WHEN** an authenticated user calls a server action that writes to a user-owned resource AND the request payload contains no `user_id` field
- **THEN** the action calls `auth()`, looks up `users.id` via `session.user.email`, and uses that id for any ownership-bearing column

#### Scenario: Forged user_id in payload is impossible to express

- **WHEN** a developer inspects the Zod schema for any covered server action's input
- **THEN** no `user_id` field is declared on the schema; the field cannot be passed by the client without a type error

#### Scenario: Unauthenticated mutation is rejected unless explicitly guest-allowed

- **WHEN** an unauthenticated caller invokes a server action that writes to a user-owned resource AND that action is not listed in the guest write paths clause
- **THEN** the action returns `{ success: false, error: 'Unauthorized' }` without performing any database write

#### Scenario: Authenticated caller records a claim on behalf of a named third party

- **WHEN** an authenticated caller invokes the enumerated guest write path `createPurchase({ item_id, guest_name: '<name>' })` for an item it is authorized to view
- **THEN** the action authorizes the request using the caller's session identity, inserts a `purchases` row with `user_id = NULL` and `guest_name = '<name>'`, and no `user_id` is taken from the payload

### Requirement: Server actions SHALL verify resource ownership before update or delete

Every server action that updates or deletes a row in a user-owned table SHALL load the target row, compare its `user_id` to the session-resolved actor id, and reject with `{ success: false, error: 'Unauthorized' }` if they differ. The check SHALL occur before any `db.update` / `db.delete` call. This applies to `lists`, `items`, `purchases` (for owner-driven removal), and any future user-owned resource.

Actions whose target row already encodes the relationship in its where-clause (e.g. `eq(purchases.user_id, sessionUser.id)`) SHALL still load the row first when the action's success/error response semantics depend on whether the row existed, to distinguish "no such row" from "not your row".

Specific actions covered by this requirement (non-exhaustive — every future action that updates a user-owned row is automatically covered):

- `lib/data/list.actions.ts`: `updateList`, `deleteList`, `setListVisibility`.
- `lib/data/listItems.actions.ts`: `setListItems`, `updatePriority`.
- `lib/data/item.actions.ts`: `updateItem`, `archiveItem`, `deleteItem`.
- `lib/data/item.associations.ts`: `updateItemLists`, `updateItemStores` — internal helpers invoked by the item actions, not endpoints; their ownership checks are covered the same way.

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

### Requirement: Follow-graph mutation actions SHALL resolve the actor exclusively from the session and SHALL NOT accept an actor parameter

Every follow-graph server action in `lib/data/user.actions.ts` (`followUser`, `unfollowUser`, `removeFollower`, `blockUser`, `unblockUser`) SHALL resolve the acting user id by calling `auth()` and looking up `users.id` from `session.user.email` (via the shared `authedUserId` helper), and SHALL reject with `{ success: false, error: 'Unauthorized' }` when no session exists. These actions SHALL NOT accept the actor id as a function parameter; the only parameter is the *target* of the relationship (`followee_id`, `follower_id`, or `blocked_id`), never the actor.

The actor-bearing columns written or matched by these actions — `user_follows.follower_id`, `user_blocks.blocker_id`, and the viewer side of every where-clause — SHALL be the session-resolved actor id, not a value derived from the payload. This extends the cross-cutting actor-resolution rule (whose explicit file enumeration covers `list.actions.ts` and `item.actions.ts`) to the follow-graph mutations, which write to relationship tables (`user_follows`, `user_blocks`) rather than `user_id`-keyed owned rows.

Specifically, `removeFollower(follower_id)` SHALL delete ONLY the edge where the session actor is the **followee** — `(follower_id = follower_id, followee_id = sessionActor)`. A caller SHALL NOT be able to delete a follow edge they are not the followee of; the action accepts no `followee_id` parameter through which an arbitrary edge could be targeted. This closes the failure mode where a refactor accepting a `followee_id` argument would let any authenticated user sever follow relationships between two other users.

The behavioral semantics of these actions (self-follow / self-block rejection, both-direction block gating, follow idempotency, block-first deletion ordering) are owned by the `following` capability spec; this requirement owns only their authorization shape.

#### Scenario: Unauthenticated follow-graph mutation is rejected without a write

- **WHEN** an unauthenticated caller invokes any of `followUser`, `unfollowUser`, `removeFollower`, `blockUser`, or `unblockUser`
- **THEN** the action returns `{ success: false, error: 'Unauthorized' }` and performs no insert or delete on `user_follows` or `user_blocks`

#### Scenario: Actor id is resolved from the session, not the payload

- **WHEN** an authenticated user invokes `followUser(followeeId)`
- **THEN** the inserted `user_follows` row has `follower_id` equal to the session-resolved `users.id` (looked up from `session.user.email`), not any client-supplied value

#### Scenario: removeFollower can only sever an edge where the actor is the followee

- **WHEN** authenticated user A invokes `removeFollower(B)` where B follows A
- **THEN** the action deletes only the `(follower_id = B, followee_id = A)` edge, leaving any `(follower_id = B, followee_id = C)` edge between B and a third user C intact

#### Scenario: No follow-graph action accepts an actor parameter

- **WHEN** a developer inspects the signatures of `followUser`, `unfollowUser`, `removeFollower`, `blockUser`, and `unblockUser`
- **THEN** each accepts only the relationship target id (`followee_id` / `follower_id` / `blocked_id`); none accepts the actor id, so the actor cannot be spoofed by the caller
