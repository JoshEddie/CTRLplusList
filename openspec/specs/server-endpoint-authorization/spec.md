# server-endpoint-authorization Specification

## Purpose
TBD - created by archiving change harden-server-action-authorization. Update Purpose after archive.
## Requirements
### Requirement: Server actions SHALL resolve the acting user from the session, not the request payload

Every Next.js server action under `app/actions/**` that writes to a user-owned resource (rows whose schema includes a `user_id` foreign key — currently `lists`, `items`, `purchases`) SHALL determine the acting user id by:

1. Calling `auth()` and rejecting (`{ success: false, error: 'Unauthorized' }`) if no session exists or `session.user.email` is absent, except where this requirement's "guest write paths" clause permits anonymous writes.
2. Looking up `users.id` from `users.email` against the database.
3. Using the looked-up `users.id` as the actor for any subsequent ownership check, insert `user_id` value, or audit field.

Server actions SHALL NOT accept a `user_id` field on their input payloads or Zod schemas. If a payload Zod schema previously declared `user_id`, that field SHALL be removed; clients SHALL NOT need to construct it.

Guest write paths (currently only `createPurchase` when the caller is unauthenticated AND `guest_name` is provided) SHALL be enumerated in the action's spec by name and SHALL scope writes to a guest-identity field that the caller could not have guessed for a third party (e.g. `guest_name` paired with an out-of-band `purchase_id` for subsequent edits).

#### Scenario: Authenticated mutation uses session identity

- **WHEN** an authenticated user calls a server action that writes to a user-owned resource AND the request payload contains no `user_id` field
- **THEN** the action calls `auth()`, looks up `users.id` via `session.user.email`, and uses that id for any ownership-bearing column

#### Scenario: Forged user_id in payload is impossible to express

- **WHEN** a developer inspects the Zod schema for any covered server action's input
- **THEN** no `user_id` field is declared on the schema; the field cannot be passed by the client without a type error

#### Scenario: Unauthenticated mutation is rejected unless explicitly guest-allowed

- **WHEN** an unauthenticated caller invokes a server action that writes to a user-owned resource AND that action is not listed in the guest write paths clause
- **THEN** the action returns `{ success: false, error: 'Unauthorized' }` without performing any database write

### Requirement: Server actions SHALL verify resource ownership before update or delete

Every server action that updates or deletes a row in a user-owned table SHALL load the target row, compare its `user_id` to the session-resolved actor id, and reject with `{ success: false, error: 'Unauthorized' }` if they differ. The check SHALL occur before any `db.update` / `db.delete` call. This applies to `lists`, `items`, `purchases` (for owner-driven removal), and any future user-owned resource.

Actions whose target row already encodes the relationship in its where-clause (e.g. `eq(purchases.user_id, sessionUser.id)`) SHALL still load the row first when the action's success/error response semantics depend on whether the row existed, to distinguish "no such row" from "not your row".

Specific actions covered by this requirement (non-exhaustive — every future action that updates a user-owned row is automatically covered):

- `app/actions/lists.ts`: `updateList`, `deleteList`, `setListVisibility`, `setListItems`, `updatePriority`.
- `app/actions/items.ts`: `updateItem`, `updateItemLists`, `updateItemStores`, `archiveItem`, `deleteItem`.

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

### Requirement: API route handlers consuming paid third-party quota SHALL require authentication

Any handler under `app/api/**/route.ts` that makes a request to a metered third-party provider (currently SerpAPI and Serper via `app/api/image-search/route.ts`) SHALL `await auth()` at the top of every method handler (`GET`, `POST`, etc.) and return `401 Unauthorized` with no body or a `{ error: 'Unauthorized' }` JSON body when no session exists.

This requirement does NOT apply to handlers whose only third-party calls are to free or pre-paid sources at fixed cost (e.g. health-check pingbacks, OAuth callbacks).

#### Scenario: Unauthenticated image-search request is rejected before provider call

- **WHEN** an unauthenticated client issues `GET /api/image-search?q=foo`
- **THEN** the handler returns HTTP 401 and SHALL NOT call SerpAPI or Serper

#### Scenario: Authenticated image-search request proceeds

- **WHEN** a client with a valid session issues `GET /api/image-search?q=foo`
- **THEN** the handler resolves the session, applies the rate limit, and delegates to the provider chain

### Requirement: API route handlers consuming paid third-party quota SHALL apply per-user rate limiting

Any handler covered by the previous requirement SHALL enforce a per-user request budget. Implementation MAY be an in-memory token bucket keyed by `users.id` (acknowledging that this is per-process and degrades with multi-replica deploys); the bucket's capacity SHALL be tuned so a single user cannot exhaust the provider quota in less than a working hour. When a user exceeds their budget the handler SHALL return HTTP 429 with a JSON body distinguishing the error from upstream quota exhaustion (e.g. `{ error: 'rate_limited' }` vs the existing `{ error: 'quota_exceeded' }`).

Additionally, query-string inputs that propagate to the upstream provider SHALL be length-capped (`?q=` ≤ 200 characters for image-search) and reject with HTTP 400 when exceeded.

#### Scenario: User exceeds per-user budget

- **WHEN** an authenticated user issues more requests against `/api/image-search` than the configured budget within the bucket window
- **THEN** the handler returns HTTP 429 with `{ error: 'rate_limited' }` without calling the provider

#### Scenario: Oversized query is rejected

- **WHEN** an authenticated user issues `GET /api/image-search?q=<201-char-string>`
- **THEN** the handler returns HTTP 400 with a query-length error and SHALL NOT call the provider

### Requirement: Authorization rejections SHALL NOT invalidate caches

When a server action returns an unauthorized error (the request was rejected before any database write), the action SHALL NOT call `updateTag`, `revalidateTag`, or `revalidatePath`. Cache invalidation belongs only on the success path. This prevents an unauthorized caller from being able to force cache evictions as a denial-of-freshness side channel.

#### Scenario: Unauthorized createList does not bust the lists tag

- **WHEN** a `createList` call returns `{ success: false, error: 'Unauthorized' }` because the session is missing
- **THEN** the action SHALL NOT have called `updateTag('lists')` during that invocation

