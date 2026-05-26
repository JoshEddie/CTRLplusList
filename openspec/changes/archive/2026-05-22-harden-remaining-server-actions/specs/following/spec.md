## ADDED Requirements

### Requirement: Follow-graph mutations SHALL NOT use interactive transactions

Server actions in `app/actions/follows.ts` (`followUser`, `unfollowUser`, `removeFollower`, `blockUser`, `unblockUser`, `markFollowingSeen`) SHALL be implemented as one or more sequential single-statement calls against `db`. They SHALL NOT use `db.transaction(async (tx) => { … })`, SHALL NOT use `SELECT … FOR UPDATE`, and SHALL NOT use any pattern that assumes a multi-statement database session.

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
