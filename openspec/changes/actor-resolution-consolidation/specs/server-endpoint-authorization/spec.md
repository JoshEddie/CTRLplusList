## ADDED Requirements

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

## MODIFIED Requirements

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
