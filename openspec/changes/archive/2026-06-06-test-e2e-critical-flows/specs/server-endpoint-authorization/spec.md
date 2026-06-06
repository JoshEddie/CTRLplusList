## MODIFIED Requirements

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
