# server-endpoint-authorization (delta)

## MODIFIED Requirements

### Requirement: Server actions SHALL resolve the acting user from the session, not the request payload

Every Next.js server action exported from a `lib/data/*.actions.ts` module (the server-action home defined by `data-layer-organization`) that writes to a user-owned resource (rows whose schema includes a user-ownership foreign key — currently `lists`, `items`, `purchases`; for `purchases` the actor-bearing column is `claimed_by`, while `user_id` means "the purchaser") SHALL determine the acting user id by:

1. Calling `auth()` and rejecting (`{ success: false, error: 'Unauthorized' }`) if no session exists or `session.user.email` is absent, except where this requirement's "guest write paths" clause permits anonymous writes.
2. Looking up `users.id` from `users.email` against the database.
3. Using the looked-up `users.id` as the actor for any subsequent ownership check, insert ownership value, or audit field.

Server actions SHALL NOT accept a `user_id` (or `claimed_by`) field on their input payloads or Zod schemas. If a payload Zod schema previously declared such a field, that field SHALL be removed; clients SHALL NOT need to construct it. The `purchases.claimed_by` column is always the session-resolved actor (or NULL on the unauthenticated guest path) — never client-supplied.

A `purchased_by` target MAY be accepted on the `createPurchase` payload (stored into `purchases.user_id`, the purchaser column), but it is an attribution *target*, not the actor: the action SHALL re-verify server-side that the target is in the eligible attributed-purchaser pool defined by the `claim-attribution` capability (the list owner's mutual follows, excluding block edges with the claimer, excluding the owner) and reject ineligible targets before any insert. The no-client-`user_id` rule is preserved: the payload field is the distinctly-named, re-verified target, never the actor identity.

Guest write paths SHALL be enumerated in the action's spec by name. They are currently:

- `createPurchase` when a non-empty `guest_name` is provided — by an unauthenticated caller, OR by an authenticated caller recording a claim on behalf of a named non-user. This path SHALL scope writes to a guest-identity field (`guest_name`) that the caller could not have guessed for a third party (e.g. `guest_name` paired with an out-of-band `purchase_id` for subsequent edits). On this path the stored row's `user_id` SHALL be NULL — the named third party is a free-text label — while `claimed_by` SHALL record the authenticated caller when one exists (NULL only for unauthenticated guests). Attributing a claim to a real user account is NOT a guest write path; it is the authenticated attributed-claim path governed by the `claim-attribution` capability's pool re-verification.
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

#### Scenario: Guest mint is view-gated and content-free

- **WHEN** an unauthenticated viewer invokes `mintItemPlaceholder` for an imageless item on a list they are authorized to view
- **THEN** the action inserts the server-derived placeholder row without requiring a session, and the same call against a list the viewer cannot see returns `{ success: false, error: 'Unauthorized' }` with no write
