## MODIFIED Requirements

### Requirement: Follow-graph mutations SHALL NOT use interactive transactions

Server actions in `app/actions/follows.ts` (`followUser`, `unfollowUser`, `removeFollower`, `blockUser`, `unblockUser`) SHALL be implemented as one or more sequential single-statement calls against `db`. They SHALL NOT use `db.transaction(async (tx) => { … })`, SHALL NOT use `SELECT … FOR UPDATE`, and SHALL NOT use any pattern that assumes a multi-statement database session.

The same single-statement constraint SHALL apply to any inline server-component side-effect that mutates follow-graph or follow-graph-adjacent state (e.g. the inline `users.last_seen_following_at` update performed in `/following`'s `after()` callback). Replacing a previously-exported server action with an inline equivalent SHALL NOT relax this constraint.

This requirement reflects the project-wide constraint documented in `CLAUDE.md`: the DB layer uses `drizzle-orm/neon-http` over Neon's HTTP API, which does not support interactive transactions. Every query is its own HTTP round-trip on its own connection. Code that calls `db.transaction(...)` is broken — either throwing at runtime, or silently degrading to non-atomic execution depending on driver version.

When a follow-graph mutation needs to maintain a cross-statement invariant (e.g. "block-implies-no-follow"), the invariant SHALL be achieved through:

1. **Idempotent ordering** — perform the safer write first (e.g. for `blockUser`, insert the block row before deleting follow rows, so a partial failure leaves the user effectively-blocked rather than effectively-followed).
2. **DB-level constraints** — `ON CONFLICT DO NOTHING`, composite primary keys, partial unique indexes, or `CHECK` constraints — to backstop races at the database layer.
3. **Documented residual** — when neither of the above suffices, the residual race SHALL be commented inline at the call site (mirroring the pattern in `app/actions/items.ts` `createPurchase`'s capacity-race comment).

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

## REMOVED Requirements

### Requirement: `markFollowingSeen` server action

**Reason:** The `markFollowingSeen` server action in `app/actions/follows.ts` is removed. It had a single internal call site (`after(() => markFollowingSeen())` in `app/(main)/following/FollowingPage.tsx`) and self-authorized via `auth()` → `headers()` inside the `after()` callback, which Next 16 disallows. The behavior (updating `users.last_seen_following_at` to `NOW()` when the viewer renders `/following`) is unchanged; it is now performed by an inline `db.update(...)` inside the same `after()` callback, closing over the viewer id resolved earlier in render.

**Migration:** Any future code that needs to update `users.last_seen_following_at` from a server component SHALL inline the single-statement `db.update(users).set({ last_seen_following_at: new Date() }).where(eq(users.id, viewerId))` against a session-validated viewer id captured before the `after()` boundary, rather than reintroducing a `'use server'` wrapper that re-derives auth.

Note: this REMOVED entry deletes the *name* `markFollowingSeen` from the enumeration in the "Follow-graph mutations SHALL NOT use interactive transactions" requirement (modified above). The behavioral requirement that drives the timestamp update — `A 'last_seen_following_at' per-user timestamp SHALL drive a "N new" badge` in this same spec — is untouched: rendering `/following` still updates the column to `NOW()`.
