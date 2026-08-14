# server-endpoint-authorization Specification

## Purpose

Authorization contract for every server-side write endpoint — the server actions under `lib/data/*.actions.ts` and the route handlers under `app/api/**` — fixing where the acting identity comes from (the session, resolved through one shared helper, never the request payload) and which writes may proceed without one (the enumerated guest paths). It also owns the ownership check a mutation must pass before touching a row, the authentication and per-user rate limiting that gate handlers spending paid third-party quota, and the cache-invalidation and deferred-`after()` rules that hang off the rejection path.

## Requirements
### Requirement: Server actions SHALL resolve the acting user from the session, not the request payload

Every Next.js server action exported from a `lib/data/*.actions.ts` module (the server-action home defined by `data-layer-organization`) that writes to a user-owned resource (rows whose schema includes a user-ownership foreign key — currently `lists`, `items`, `purchases`; for `purchases` the actor-bearing column is `claimed_by`, while `user_id` means "the purchaser") SHALL determine the acting user id by:

1. Calling `auth()` and rejecting (`{ success: false, error: 'Unauthorized' }`) if no session exists or `session.user.email` is absent, except where this requirement's "guest write paths" clause permits anonymous writes.
2. Resolving `users.id` from the session through the shared session-resolution helper, never by querying the `users` table at the call site — see the sibling requirement "Session-derived actor resolution SHALL route through the shared helper, and SHALL NOT be hand-rolled", which also governs route handlers.
3. Using the resolved `users.id` as the actor for any subsequent ownership check, insert ownership value, or audit field.

Server actions SHALL NOT accept a `user_id` (or `claimed_by`) field on their input payloads or Zod schemas. If a payload Zod schema previously declared such a field, that field SHALL be removed; clients SHALL NOT need to construct it. The `purchases.claimed_by` column is always the session-resolved actor (or NULL on the unauthenticated guest path) — never client-supplied.

A `purchased_by` target MAY be accepted on the `createPurchase` payload (stored into `purchases.user_id`, the purchaser column), but it is an attribution *target*, not the actor: the action SHALL re-verify server-side that the target is in the eligible attributed-purchaser pool defined by the `claim-attribution` capability (the list owner's mutual follows, excluding block edges with the claimer, excluding the owner) and reject ineligible targets before any insert. The no-client-`user_id` rule is preserved: the payload field is the distinctly-named, re-verified target, never the actor identity.

Guest write paths SHALL be enumerated in the action's spec by name. They are currently:

- `createPurchase` when a non-empty `guest_name` is provided — by an unauthenticated caller, OR by an authenticated caller recording a claim on behalf of a named non-user. On this path the stored row's `user_id` SHALL be NULL — the named third party is a free-text label — while `claimed_by` SHALL record the authenticated caller when one exists (NULL only for unauthenticated guests). Because a null resolved actor cannot distinguish "no session" from "session with no `users` row", this action SHALL determine session presence itself rather than inferring guest status from an unresolvable actor. For the unauthenticated case, subsequent self-service (recognition and removal) is scoped by the server-managed `guest_claims` cookie owned by `guest-claim-identity` — an httpOnly credential holding the browser's own purchase ids, which a caller could not have obtained for another party's claims; the cookie is ambient request state, never a payload field. Attributing a claim to a real user account is NOT a guest write path; it is the authenticated attributed-claim path governed by the `claim-attribution` capability's pool re-verification.
- `removePurchase` when invoked by an unauthenticated caller — authorized solely by the `guest_claims` cookie path defined in the `claim-attribution` removal matrix (all-NULL-identity row whose id the cookie lists). The former exact-`guest_name`-match authorization is retired and the payload carries no guest-identity field.
- `mintItemPlaceholder` (owned by `item-placeholder-art`) — an unauthenticated or authenticated viewer materializing an imageless item's placeholder art. The path is admissible without a session because the write carries no caller identity and no caller-supplied content: the payload is the item id alone, the inserted row is fully server-derived (art seeded by the item id), the action is idempotent (no insert when an active image already exists), and it SHALL be gated on the caller's authorization to view the item (`isItemViewable`), the same visibility gate the guest purchase path uses.

#### Scenario: Authenticated mutation uses session identity

- **WHEN** an authenticated user calls a server action that writes to a user-owned resource AND the request payload contains no actor-identity field
- **THEN** the action resolves `users.id` from the session through the shared helper, and uses that id for any ownership-bearing column

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

### Requirement: Session-derived actor resolution SHALL route through the shared helper, and SHALL NOT be hand-rolled

Every server-side endpoint that gates on caller identity — server actions exported from `lib/data/*.actions.ts`, their private helpers, and route handlers under `app/api/**` — SHALL obtain the acting `users.id` from the shared session-resolution helper. No endpoint SHALL reimplement the lookup by reading the session email and querying the `users` table itself.

This makes the resolution a single seam. It widens the surface governed by the sibling requirement "Server actions SHALL resolve the acting user from the session, not the request payload", which reaches only `lib/data/*.actions.ts` server actions: a route handler that decides what a caller may do based on their identity is a server endpoint under this capability, and SHALL be held to the same rule.

**Rejection shape.** The helper SHALL return a null actor for a caller it cannot resolve, without distinguishing the cause. Both causes — no session, and a session whose email matches no `users` row — SHALL produce the same rejection: `error: 'Unauthorized'` (or HTTP 401 for a route handler) with no database write. The human-readable `message` accompanying a rejection is NOT part of this contract and MAY be normalized across the two causes; only the `error` code, the HTTP status, and the absence of a write are guaranteed. One shape is exempt: an endpoint whose session-presence gate already rejects the no-session cause MAY let a stale session fall to a downstream ownership comparison that a null actor can never pass, rejecting with that check's own code — currently only `setListItems`, whose stale-session rejection is `error: 'Forbidden'`. The no-write guarantee is unaffected by the exemption.

**Guest write paths do not widen.** An endpoint whose behavior branches on whether a session is *present* — as distinct from whether an actor is *resolvable* — SHALL make that determination itself rather than inferring it from a null actor. A null actor SHALL NOT be read as "this caller is a guest" by any endpoint that is not already an enumerated guest write path for that input. The set of guest write paths is fixed by the sibling requirement and is unchanged by this one.

Enforcement is by specification and code review. No lint rule is required.

#### Scenario: Endpoint resolves the actor without querying the users table

- **WHEN** the source of any server action, action helper, or `app/api/**` route handler that gates on caller identity is inspected
- **THEN** it obtains the acting user id from the shared session-resolution helper, and contains no query matching a `users` row by the session's email

#### Scenario: Route handler gating on identity is governed

- **WHEN** a route handler under `app/api/**` uses the caller's identity to authorize the request or to key per-user state
- **THEN** it resolves that identity through the shared helper, and returns HTTP 401 with no side effect when the helper yields no actor

#### Scenario: Both unresolvable-actor causes reject identically

- **WHEN** a covered endpoint not exempted by the rejection-shape clause is invoked with no session, and separately with a session whose email matches no `users` row
- **THEN** both invocations return the same `error` code (`'Unauthorized'`, or HTTP 401 for a route handler) and neither performs a database write
- **AND** the two invocations are not required to return the same `message` text

#### Scenario: Ownership-subsumed rejection still writes nothing

- **WHEN** `setListItems` is invoked with a session whose email matches no `users` row
- **THEN** the null actor fails the ownership comparison, the action returns `error: 'Forbidden'`, and no database write occurs

#### Scenario: A stale session does not become a guest on an authenticated-only branch

- **WHEN** a caller holds a valid session whose email matches no `users` row, and invokes an endpoint whose authenticated branch would otherwise be taken for that input
- **THEN** the endpoint rejects rather than falling through to a guest write path, and no row is written with a null actor as a result

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

### Requirement: API route handlers consuming paid third-party quota SHALL require authentication

Any handler under `app/api/**/route.ts` that makes a request to a metered third-party provider (currently Zyte via `app/api/product-fetch/route.ts`) SHALL `await auth()` at the top of every method handler (`GET`, `POST`, etc.) and return `401 Unauthorized` with no body or a `{ error: 'Unauthorized' }` JSON body when no session exists.

This requirement does NOT apply to handlers whose only third-party calls are to free or pre-paid sources at fixed cost (e.g. health-check pingbacks, OAuth callbacks).

#### Scenario: Unauthenticated product-fetch request is rejected before provider call

- **WHEN** an unauthenticated client issues `POST /api/product-fetch`
- **THEN** the handler returns HTTP 401 and SHALL NOT call Zyte

#### Scenario: Authenticated product-fetch request proceeds

- **WHEN** a client with a valid session issues a well-formed `POST /api/product-fetch`
- **THEN** the handler resolves the session, applies the rate limit, and delegates to the provider seam

### Requirement: API route handlers consuming paid third-party quota SHALL apply per-user rate limiting

Any handler covered by the previous requirement SHALL enforce a per-user request budget. Implementation MAY be an in-memory token bucket keyed by `users.id` (acknowledging that this is per-process and degrades with multi-replica deploys); the bucket's capacity SHALL be tuned so a single user cannot exhaust the provider quota in less than a working hour. The budget SHALL be enforced over a fixed time window: once the window elapses, a user's spent budget SHALL reset so a previously-throttled user can issue requests again. The budget SHALL be isolated per user: one user reaching their limit SHALL NOT throttle a different authenticated user. When a user exceeds their budget the handler SHALL return HTTP 429 with a JSON body distinguishing the error from upstream failure shapes (e.g. `{ error: 'rate_limited' }`).

Additionally, request inputs that propagate to the upstream provider SHALL be validated and length-capped before spending quota (for product-fetch, the URL validation and size cap owned by `product-link-prefill`), rejecting with HTTP 400 when exceeded.

#### Scenario: User exceeds per-user budget

- **WHEN** an authenticated user issues more requests against `/api/product-fetch` than the configured budget within the bucket window
- **THEN** the handler returns HTTP 429 with `{ error: 'rate_limited' }` without calling the provider

#### Scenario: Budget window resets after its interval

- **WHEN** an authenticated user has exhausted their per-user budget and then issues a further request after the bucket window has elapsed
- **THEN** the budget is reset and the request proceeds and reaches the provider, rather than returning HTTP 429

#### Scenario: One user's exhaustion does not throttle another user

- **WHEN** authenticated user A has exhausted their per-user budget and authenticated user B issues their first request within the same window
- **THEN** user B's request proceeds and reaches the provider, because the budget is keyed per `users.id`

#### Scenario: Oversized or malformed input is rejected

- **WHEN** an authenticated user issues `POST /api/product-fetch` with an oversized or invalid URL
- **THEN** the handler returns HTTP 400 (`{ error: 'invalid_url' }`) and SHALL NOT call the provider or spend a rate-limit token

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

