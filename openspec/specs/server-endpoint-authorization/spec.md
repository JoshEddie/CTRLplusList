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

Any handler covered by the previous requirement SHALL enforce a per-user request budget. Implementation MAY be an in-memory token bucket keyed by `users.id` (acknowledging that this is per-process and degrades with multi-replica deploys); the bucket's capacity SHALL be tuned so a single user cannot exhaust the provider quota in less than a working hour. The budget SHALL be enforced over a fixed time window: once the window elapses, a user's spent budget SHALL reset so a previously-throttled user can issue requests again. The budget SHALL be isolated per user: one user reaching their limit SHALL NOT throttle a different authenticated user. When a user exceeds their budget the handler SHALL return HTTP 429 with a JSON body distinguishing the error from upstream quota exhaustion (e.g. `{ error: 'rate_limited' }` vs the existing `{ error: 'quota_exceeded' }`).

Additionally, query-string inputs that propagate to the upstream provider SHALL be length-capped (`?q=` ≤ 200 characters for image-search) and reject with HTTP 400 when exceeded.

#### Scenario: User exceeds per-user budget

- **WHEN** an authenticated user issues more requests against `/api/image-search` than the configured budget within the bucket window
- **THEN** the handler returns HTTP 429 with `{ error: 'rate_limited' }` without calling the provider

#### Scenario: Budget window resets after its interval

- **WHEN** an authenticated user has exhausted their per-user budget and then issues a further request after the bucket window has elapsed
- **THEN** the budget is reset and the request proceeds (HTTP 200) and reaches the provider, rather than returning HTTP 429

#### Scenario: One user's exhaustion does not throttle another user

- **WHEN** authenticated user A has exhausted their per-user budget and authenticated user B issues their first request within the same window
- **THEN** user B's request proceeds (HTTP 200) and reaches the provider, because the budget is keyed per `users.id`

#### Scenario: Oversized query is rejected

- **WHEN** an authenticated user issues `GET /api/image-search?q=<201-char-string>`
- **THEN** the handler returns HTTP 400 with a query-length error and SHALL NOT call the provider

### Requirement: Authorization rejections SHALL NOT invalidate caches

When a server action returns an unauthorized error (the request was rejected before any database write), the action SHALL NOT call `updateTag`, `revalidateTag`, or `revalidatePath`. Cache invalidation belongs only on the success path. This prevents an unauthorized caller from being able to force cache evictions as a denial-of-freshness side channel.

#### Scenario: Unauthorized createList does not bust the lists tag

- **WHEN** a `createList` call returns `{ success: false, error: 'Unauthorized' }` because the session is missing
- **THEN** the action SHALL NOT have called `updateTag('lists')` during that invocation

### Requirement: Server-side side-effects deferred via `after()` SHALL NOT depend on request-scoped APIs

Any side-effect registered with `import { after } from 'next/server'` and invoked from a server component, route handler, or server action SHALL NOT, on any code path executed *inside* the `after()` callback, call `headers()`, `cookies()`, the zero-argument `auth()` overload, or any other API that reads from the in-flight request. Next 16 disallows these calls inside `after()` callbacks because the request lifecycle has ended before the callback runs; the calls throw at runtime with `Route … used 'headers()' inside 'after()'`.

Any identity, session, or request-context value required by the deferred work SHALL be resolved by the caller *before* the `after()` registration and captured by closure into the callback. Implementations SHALL capture the resolved value to a named local (e.g. `const viewerId = user.id;`) on the line preceding the `after()` registration to make the request-context boundary visually explicit. Inside the callback, code SHALL reference that captured local — not any helper that would re-derive identity from request state.

This requirement is a sibling of the existing rule that the actor id is exclusively resolved from `auth()`: that rule governs the *synchronous* portion of a server action where `auth()` is callable; this rule governs the *deferred* portion where `auth()` is not. Together they imply that a server action whose only call site is inside an `after()` callback and which writes a row belonging to the actor SHOULD be inlined at that call site rather than exposed as a `'use server'` export. The `'use server'` boundary makes the action network-callable; if it cannot self-authorize via `auth()` (because it would be called from `after()`) and cannot accept the actor id as a parameter (because doing so for ownership-bearing writes is forbidden by the ownership-verification requirement), the only safe shape is inline server-component code that closes over a pre-validated viewer id.

#### Scenario: `headers()` inside `after()` throws

- **WHEN** a server component registers `after(() => actionThatCallsAuth())` where `actionThatCallsAuth` internally calls `auth()` (which reads `headers()`)
- **THEN** Next 16 throws `Route … used 'headers()' inside 'after()'. This is not supported.` at runtime when the callback fires, and the deferred work does not complete

#### Scenario: Deferred work uses a captured viewer id without calling `auth()`

- **WHEN** a server component has already resolved the viewer via `await auth()` → `getUserIdByEmail(...)` earlier in render, captures the resulting id to a local before the `after()` boundary, and references only that local inside the callback
- **THEN** the `after()` callback runs without invoking `headers()`, `cookies()`, or zero-arg `auth()`, and the deferred DB write completes against the captured id

#### Scenario: Single-call-site server-only side-effect is inlined rather than exposed as an action

- **WHEN** a server-side bookkeeping side-effect (e.g. recording a self-targeted visit row, updating a self-targeted "last seen" timestamp) has exactly one internal call site that is inside an `after()` callback, AND the side-effect writes only rows whose `user_id` equals the actor
- **THEN** the side-effect SHALL be implemented as inline server-component code inside the `after()` callback (closing over a pre-validated viewer id) and SHALL NOT be exported as a `'use server'` action. Exporting it as an action would either require calling `auth()` inside `after()` (forbidden) or accepting the actor id as a parameter (forbidden for ownership-bearing writes by the existing ownership-verification requirement)

#### Scenario: Deferred cache invalidation is permitted

- **WHEN** the deferred work inside an `after()` callback performs a DB write and follows it with `updateTag(...)` or `revalidateTag(...)`
- **THEN** the tag invalidation SHALL run inside the same `after()` callback (this is the supported pattern for cache invalidation that cannot run during render), provided no request-scoped API is invoked on the path to the tag call

### Requirement: Follow-graph mutation actions SHALL resolve the actor exclusively from the session and SHALL NOT accept an actor parameter

Every server action under `app/actions/follows.ts` that writes to the follow graph (`followUser`, `unfollowUser`, `removeFollower`, `blockUser`, `unblockUser`) SHALL resolve the acting user id by calling `auth()` and looking up `users.id` from `session.user.email` (via the shared `authedUserId` helper), and SHALL reject with `{ success: false, error: 'Unauthorized' }` when no session exists. These actions SHALL NOT accept the actor id as a function parameter; the only parameter is the *target* of the relationship (`followee_id`, `follower_id`, or `blocked_id`), never the actor.

The actor-bearing columns written or matched by these actions — `user_follows.follower_id`, `user_blocks.blocker_id`, and the viewer side of every where-clause — SHALL be the session-resolved actor id, not a value derived from the payload. This extends the cross-cutting actor-resolution rule (whose explicit file enumeration covers `lists.ts` and `items.ts`) to the follow-graph mutations, which write to relationship tables (`user_follows`, `user_blocks`) rather than `user_id`-keyed owned rows.

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

