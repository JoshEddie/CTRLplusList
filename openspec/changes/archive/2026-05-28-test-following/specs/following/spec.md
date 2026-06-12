## ADDED Requirements

### Requirement: The `user_follows` composite primary key SHALL be the de-duplication backstop for concurrent follow writes

A follow relationship is uniquely identified by the pair `(follower_id, followee_id)`. The `user_follows` table SHALL enforce this uniqueness with a composite primary key on `(follower_id, followee_id)` (`db/schema.ts`), and `followUser` SHALL insert via `onConflictDoNothing()` so that a duplicate follow — whether from a double click, an optimistic-UI retry, or two concurrent requests racing the follow/unfollow toggle — resolves to a single row with no error and no second row.

This requirement names the actual mechanism that makes "Follow is idempotent" safe under concurrency. The neon-http driver provides no interactive transactions and no `SELECT … FOR UPDATE` (see "Follow-graph mutations SHALL NOT use interactive transactions"), so the composite primary key — NOT a partial unique index — is the database-layer guarantee against duplicate follow rows. Any migration that drops or weakens this primary key SHALL be treated as removing a load-bearing concurrency backstop.

#### Scenario: Duplicate followUser inserts no second row

- **WHEN** an authenticated viewer invokes `followUser(targetId)` twice for the same target (the second call before or after the first commits)
- **THEN** exactly one `user_follows(follower_id = viewer, followee_id = target)` row exists
- **AND** neither call returns an error attributable to a uniqueness violation (the `onConflictDoNothing()` clause absorbs the conflict)

#### Scenario: Composite primary key rejects a raw duplicate insert

- **WHEN** a second `INSERT INTO user_follows` with the same `(follower_id, followee_id)` pair is attempted WITHOUT the `onConflictDoNothing()` clause
- **THEN** the database raises a unique-violation error (SQLSTATE 23505) from the composite primary key

#### Scenario: Follow / unfollow toggle race converges to a single definite state

- **WHEN** a `followUser(targetId)` and a concurrent retry of the same `followUser(targetId)` both execute
- **THEN** the row set contains at most one matching `user_follows` row, and a subsequent `unfollowUser(targetId)` removes it, leaving zero rows
