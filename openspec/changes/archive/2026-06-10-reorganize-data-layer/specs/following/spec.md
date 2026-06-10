# following — delta

Path re-pointing only: `firstNameOf()` moves from `lib/dal.ts` to `lib/data/purchase.ts` (beside its only consumer, the purchase sanitizer), and the follow-graph actions move from `app/actions/follows.ts` to `lib/data/user.actions.ts` (see `data-layer-organization`). No behavioral requirement changes.

## MODIFIED Requirements

### Requirement: Sign-in SHALL capture the user's full name from Google when available

The sign-in callback in `lib/auth.ts` SHALL store `${profile.given_name} ${profile.family_name}` in `users.name` when both fields are present on Google's OAuth profile. If only `given_name` is present, `users.name` SHALL fall back to the first name. Existing surfaces that prefer first-name-only (purchase attribution, etc.) SHALL continue to derive that via `firstNameOf()` in `lib/data/purchase.ts` — the storage change does not alter display in casual contexts.

The connections settings page SHALL display the stored `users.name` (full name when available) for each row alongside the follow/follower/block-since date, to help owners disambiguate between users who share a first name. Backfill is lazy: existing users retain their stored first-name-only value until they next sign in.

#### Scenario: Full name captured at sign-in

- **WHEN** a user signs in with Google and the profile includes `given_name = "Josh"` and `family_name = "Eddie"`
- **THEN** `users.name` is set to `"Josh Eddie"`

#### Scenario: Falls back to first name when no family_name

- **WHEN** Google's profile includes `given_name` but no `family_name`
- **THEN** `users.name` is set to the `given_name` alone

#### Scenario: Purchase attribution stays first-name-only

- **WHEN** a user with `name = "Josh Eddie"` claims an item
- **THEN** the claim is attributed to "Josh" (via `firstNameOf()`) in the item-display surfaces, unchanged

#### Scenario: Connections page shows the full stored name

- **WHEN** an owner views `/settings/connections` and a follower has `name = "Josh Eddie"`
- **THEN** the row renders "Josh Eddie", helping disambiguate from another Josh

#### Scenario: Pre-existing user lazy-backfills on next sign-in

- **WHEN** a user signed in before this change and currently has `name = "Josh"`
- **THEN** their `users.name` remains "Josh" until their next sign-in, at which point it updates to "Josh Eddie" (if Google returns `family_name`)

### Requirement: Follow-graph mutations SHALL NOT use interactive transactions

Server actions in `lib/data/user.actions.ts` (`followUser`, `unfollowUser`, `removeFollower`, `blockUser`, `unblockUser`) SHALL be implemented as one or more sequential single-statement calls against `db`. They SHALL NOT use `db.transaction(async (tx) => { … })`, SHALL NOT use `SELECT … FOR UPDATE`, and SHALL NOT use any pattern that assumes a multi-statement database session.

The same single-statement constraint SHALL apply to any inline server-component side-effect that mutates follow-graph or follow-graph-adjacent state (e.g. the inline `users.last_seen_following_at` update performed in `/following`'s `after()` callback). Replacing a previously-exported server action with an inline equivalent SHALL NOT relax this constraint.

This requirement reflects the project-wide constraint documented in `CLAUDE.md`: the DB layer uses `drizzle-orm/neon-http` over Neon's HTTP API, which does not support interactive transactions. Every query is its own HTTP round-trip on its own connection. Code that calls `db.transaction(...)` is broken — either throwing at runtime, or silently degrading to non-atomic execution depending on driver version.

When a follow-graph mutation needs to maintain a cross-statement invariant (e.g. "block-implies-no-follow"), the invariant SHALL be achieved through:

1. **Idempotent ordering** — perform the safer write first (e.g. for `blockUser`, insert the block row before deleting follow rows, so a partial failure leaves the user effectively-blocked rather than effectively-followed).
2. **DB-level constraints** — `ON CONFLICT DO NOTHING`, composite primary keys, partial unique indexes, or `CHECK` constraints — to backstop races at the database layer.
3. **Documented residual** — when neither of the above suffices, the residual race SHALL be commented inline at the call site (mirroring the pattern in `lib/data/purchase.actions.ts` `createPurchase`'s capacity-race comment).

#### Scenario: blockUser succeeds without invoking the driver's transaction API

- **WHEN** an authenticated user invokes `blockUser(otherUserId)`
- **THEN** the implementation issues sequential single-statement calls (`db.insert(user_blocks)…onConflictDoNothing()`, `db.delete(user_follows)` forward, `db.delete(user_follows)` reverse) and SHALL NOT call `db.transaction(...)` or `tx.*` on any code path

#### Scenario: Partial failure leaves the safer residual state

- **WHEN** `blockUser` issues the block-row insert successfully but a subsequent follow-row delete fails (e.g. network blip mid-sequence)
- **THEN** the residual database state contains the `user_blocks` row, the `followUser` predicate ("either-direction block prevents follow") correctly treats the relationship as blocked, and a retry of `blockUser` cleans up the leftover follow rows idempotently

#### Scenario: Source-of-truth tag invalidation runs after all writes succeed

- **WHEN** `blockUser` completes all three of its sequential statements without throwing
- **THEN** both `updateTag('user_follows')` and `updateTag('user_blocks')` are invoked exactly once each; if any statement throws, neither tag SHALL be invalidated on that invocation

#### Scenario: Inline last-seen-following update is a single-statement write

- **WHEN** `/following` renders and registers an `after()` callback that updates `users.last_seen_following_at` for the viewer
- **THEN** the callback issues exactly one `db.update(users).set({ last_seen_following_at: new Date() }).where(eq(users.id, viewerId))` statement followed by `updateTag('user_follows')`, with no call to `db.transaction(...)`, no `SELECT … FOR UPDATE`, and no `auth()`/`headers()`/`cookies()` call inside the callback
