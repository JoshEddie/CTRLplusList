## ADDED Requirements

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
