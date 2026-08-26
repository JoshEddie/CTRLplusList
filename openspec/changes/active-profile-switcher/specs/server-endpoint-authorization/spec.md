## MODIFIED Requirements

### Requirement: Session-derived actor resolution SHALL route through the shared helper, and SHALL NOT be hand-rolled

Every server-side endpoint that gates on caller identity — server actions exported from `lib/data/*.actions.ts`, their private helpers, and route handlers under `app/api/**` — SHALL obtain the acting `users.id` from the shared session-resolution helper. No endpoint SHALL reimplement the lookup by reading the session email and querying the `users` table itself.

The seam SHALL additionally resolve **two named profiles**: the account's **self-profile**, and the **active profile** the request acts as, whose selection and re-verification are owned by `active-profile`. The seam SHALL NOT expose a single unqualified profile: an endpoint states which of the two it means, so that neither can be reached by default. Ownership columns and creation take the active profile; identity naming the human takes the self-profile, per `active-profile`'s division. Resolution SHALL be request-scoped so repeat calls within one request cost nothing.

This makes the resolution a single seam. It widens the surface governed by the sibling requirement "Server actions SHALL resolve the acting user from the session, not the request payload", which reaches only `lib/data/*.actions.ts` server actions: a route handler that decides what a caller may do based on their identity is a server endpoint under this capability, and SHALL be held to the same rule.

**Rejection shape.** The helper SHALL return a null actor for a caller it cannot resolve, without distinguishing the cause. Both causes — no session, and a session whose email matches no `users` row — SHALL produce the same rejection: `error: 'Unauthorized'` (or HTTP 401 for a route handler) with no database write. A caller who resolves to no account resolves to neither profile, and SHALL be rejected identically. The human-readable `message` accompanying a rejection is NOT part of this contract and MAY be normalized across the two causes; only the `error` code, the HTTP status, and the absence of a write are guaranteed. One shape is exempt: an endpoint whose session-presence gate already rejects the no-session cause MAY let a stale session fall to a downstream ownership comparison that a null actor can never pass, rejecting with that check's own code — currently only `setListItems`, whose stale-session rejection is `error: 'Forbidden'`. The no-write guarantee is unaffected by the exemption.

**Guest write paths do not widen.** An endpoint whose behavior branches on whether a session is *present* — as distinct from whether an actor is *resolvable* — SHALL make that determination itself rather than inferring it from a null actor. A null actor SHALL NOT be read as "this caller is a guest" by any endpoint that is not already an enumerated guest write path for that input. The set of guest write paths is fixed by the sibling requirement and is unchanged by this one.

Enforcement is by specification and code review. No lint rule is required.

#### Scenario: Endpoint resolves the actor without querying the users table

- **WHEN** the source of any server action, action helper, or `app/api/**` route handler that gates on caller identity is inspected
- **THEN** it obtains the acting user id from the shared session-resolution helper, and contains no query matching a `users` row by the session's email

#### Scenario: Endpoint resolves the acting profile from the same seam

- **WHEN** an endpoint needs the profile id to compare against an ownership column
- **THEN** it obtains the active profile from the shared resolution seam, and contains no call-site lookup of a profile from the account id

#### Scenario: An endpoint naming the human resolves the self-profile from the same seam

- **WHEN** an endpoint needs the profile that names the human rather than the profile being acted as
- **THEN** it obtains the self-profile from the shared resolution seam, and its choice of the self-profile over the active profile is explicit at the call site

#### Scenario: Repeat resolution within one request costs no extra query

- **WHEN** several server components or actions in the same request each resolve the acting identity
- **THEN** the underlying lookup runs once for that request

#### Scenario: Route handler gating on identity is governed

- **WHEN** a route handler under `app/api/**` uses the caller's identity to authorize the request or to key per-user state
- **THEN** it resolves that identity through the shared helper, and returns HTTP 401 with no side effect when the helper yields no actor

#### Scenario: Both unresolvable-actor causes reject identically

- **WHEN** a covered endpoint not exempted by the rejection-shape clause is invoked with no session, and separately with a session whose email matches no `users` row
- **THEN** both invocations return the same `error` code (`'Unauthorized'`, or HTTP 401 for a route handler) and neither performs a database write
- **AND** the two invocations are not required to return the same `message` text

#### Scenario: Ownership-subsumed rejection still writes nothing

- **WHEN** `setListItems` is invoked with a session whose email matches no `users` row
- **THEN** the null actor resolves to no profile, fails the ownership comparison, the action returns `error: 'Forbidden'`, and no database write occurs

#### Scenario: A stale session does not become a guest on an authenticated-only branch

- **WHEN** a caller holds a valid session whose email matches no `users` row, and invokes an endpoint whose authenticated branch would otherwise be taken for that input
- **THEN** the endpoint rejects rather than falling through to a guest write path, and no row is written with a null actor as a result

## ADDED Requirements

### Requirement: A profile-scoped write SHALL re-verify membership on the profile it acts as

Every write that creates or mutates content owned by a profile SHALL confirm, server-side, that the acting account holds an `owner`, `manager`, or `self` membership on the profile the request acts as, before any row is written. The check SHALL run against current membership rows at the time of the write, not against anything carried with the request.

The check SHALL be a single shared gate rather than re-implemented per endpoint, so that a write added later cannot omit it and so that the acted-as recording `active-profile` requires has one place to happen.

A failed check SHALL reject with `error: 'Forbidden'` and SHALL perform no database write.

Holding a membership SHALL NOT, by itself, authorize a write against a profile: it makes that profile *selectable* as the active profile. The ownership comparison a mutation must pass is unchanged — the row's owning profile against the profile the request acts as — so reaching another profile's content requires acting as it, and an account's other memberships SHALL NOT widen what the current request may touch.

#### Scenario: A write as a held profile passes the gate

- **WHEN** a viewer acting as a profile they hold an `owner` membership on creates content for it
- **THEN** the membership check passes and the row is written with that profile as owner

#### Scenario: A write as an unheld profile is rejected

- **WHEN** the active profile cannot be verified against a current membership at the moment of the write
- **THEN** the action returns `error: 'Forbidden'` and no database write occurs

#### Scenario: Another membership does not widen the current request

- **WHEN** a viewer who holds memberships on profiles A and B, acting as A, attempts to mutate a row owned by B
- **THEN** the ownership comparison fails and the action returns `error: 'Forbidden'`, notwithstanding their membership on B

#### Scenario: The gate is one shared path

- **WHEN** the profile-scoped write endpoints are inspected
- **THEN** each reaches its membership check through the same shared gate, and none re-implements the comparison locally
