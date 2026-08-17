## MODIFIED Requirements

### Requirement: Users SHALL follow and unfollow other users

An authenticated user SHALL be able to follow any other profile via `followUser(profile_id)` and unfollow via `unfollowUser(profile_id)`. A follow relationship is represented by a row in `user_follows(follower_id, followee_profile_id, created_at)`: the follower is an account and the followee is a profile. A follow edge therefore runs from a human to a profile, and a profile is never a follower.

A user SHALL NOT be able to follow their own profile — the guard compares the acting account's profile id against the target profile id, which is the direct translation of the former account-id self-comparison rather than a widening of it. A user SHALL NOT be able to follow a profile if either party has blocked the other.

#### Scenario: Follow another user

- **WHEN** an authenticated user invokes `followUser(otherProfileId)` for a profile that has not blocked them
- **THEN** a `user_follows` row exists with `follower_id` = the viewer's account and `followee_profile_id` = `otherProfileId`

#### Scenario: Follow is idempotent

- **WHEN** an authenticated user invokes `followUser(otherProfileId)` while already following that profile
- **THEN** the action succeeds without inserting a duplicate row

#### Scenario: Cannot follow self

- **WHEN** an authenticated user invokes `followUser` with their own profile id
- **THEN** the action returns an error and no row is inserted

#### Scenario: Cannot follow if blocked

- **WHEN** the target profile has blocked the viewer's profile (or vice versa)
- **THEN** `followUser` returns an error and no row is inserted

#### Scenario: Unfollow

- **WHEN** an authenticated user invokes `unfollowUser(otherProfileId)`
- **THEN** the `user_follows` row `(viewer's account, otherProfileId)` is removed; if no such row existed, the action is a no-op success

### Requirement: Profile pages SHALL exist at `/u/[id]` with an invite-URL follow prompt

The profile route SHALL live at `/user/[id]`, whose `[id]` segment is a **profile id**. It SHALL render a public profile showing the profile's name, image, and its `'public'` lists, plus a Follow / Following button for authenticated viewers. When the URL includes `?follow=1`, the page SHALL surface a prominent follow prompt above the list grid. A profile SHALL be reachable via this URL even if it has zero public lists.

The path carries a profile id because follow edges target profiles and this route must address what the graph points at. The word "user" in the path is unaffected by the change — the user/profile distinction is internal, and this requirement's own name retains the earlier `/u/[id]` label without normative force.

#### Scenario: Profile renders public lists

- **WHEN** any viewer loads `/user/[id]` for an existing profile
- **THEN** the profile renders the profile's name, image, and a grid of its `visibility = 'public'` lists

#### Scenario: Empty public lists state

- **WHEN** the route is loaded for a profile with no public lists
- **THEN** the page renders an empty-state message but the Follow button remains available to authenticated viewers

#### Scenario: Follow prompt from invite URL

- **WHEN** an authenticated viewer loads `/user/[id]?follow=1` and does not currently follow the target profile
- **THEN** a prominent follow prompt is shown above the list grid

#### Scenario: Unknown user 404

- **WHEN** any viewer loads `/user/[id]` for an id that does not resolve to a profile
- **THEN** the page returns a 404 response

#### Scenario: Inbound links carry a profile id

- **WHEN** a connection row, a user card, or a list's owner byline links to the profile route
- **THEN** the href's id segment is a profile id, not an account id

### Requirement: List pages SHALL expose a follow affordance for non-owner viewers, colocated with the linked owner name

When an authenticated viewer who is not the list owner renders a list with `visibility != 'private'`, the list-detail hero SHALL display a Follow / Following button targeting the list's **owning profile**. The button SHALL be a full-size button satisfying WCAG 2.5.5 (44×44 CSS px touch target). The button SHALL be rendered in a byline sub-row of the list hero adjacent to the owner's name (which itself SHALL be rendered as a link to `/user/{owning profile id}` on this surface), and SHALL NOT be rendered in the list-hero action row alongside list-actions such as Share and Bookmark. The button SHALL be hidden when the viewer's profile is the list's owning profile, when the viewer is unauthenticated, or when the viewer's profile has blocked or been blocked by the owning profile.

#### Scenario: Follow button colocated with linked owner name

- **WHEN** an authenticated viewer (not the owner) loads a non-private list
- **THEN** the list hero renders a byline sub-row containing the owner's name as a link to `/user/{owning profile id}` and a full-size button labeled "Follow {owner-name}" adjacent to it
- **AND** the list-hero action row contains only list-actions (Share, Bookmark) — no Follow button

#### Scenario: Following state shown after follow

- **WHEN** the viewer already follows the owning profile
- **THEN** the button label reads "Following" and clicking it unfollows (no dialog gating on unfollow)

#### Scenario: Owner name linkified only on list-detail hero

- **WHEN** the owner's name appears on a list-detail hero
- **THEN** it renders as a link to `/user/{owning profile id}`

- **WHEN** the owner's name appears on other surfaces (list cards, bookmark rails, feed entries)
- **THEN** the name's existing presentation is unchanged by this requirement (linkification on those surfaces is out of scope)

#### Scenario: Hidden for owner

- **WHEN** the account whose profile owns the list views that list
- **THEN** no Follow button is rendered in the byline sub-row

#### Scenario: Hidden for unauthenticated

- **WHEN** an unauthenticated viewer loads a list
- **THEN** no Follow button is rendered

### Requirement: Owners SHALL view and manage their followers

The connections settings page (`/settings/connections`) SHALL show three sections: **Following** (with per-row unfollow), **Followers** (with per-row remove and per-row block), and **Blocked** (with per-row unblock). Each section SHALL be paginated or list-limited as needed.

A block is recorded as a single `user_blocks` row whose blocker and blocked are both **profiles**. Blocking SHALL create exactly one row — the acting account's profile against the target profile — and SHALL NOT materialize additional rows for any other profile either party runs. A cascade across the profiles an account owns requires an account owning more than one profile, which no surface creates in this phase; it belongs to the change that makes that case real.

#### Scenario: View following

- **WHEN** an authenticated user loads `/settings/connections`
- **THEN** the Following section lists each profile the viewer follows, with an Unfollow button per row

#### Scenario: Remove a follower

- **WHEN** the viewer clicks Remove next to a follower
- **THEN** the `user_follows` row `(follower = that account, followee = the viewer's profile)` is deleted; the follower can re-follow

#### Scenario: Block a user

- **WHEN** the viewer clicks Block next to a user
- **THEN** any `user_follows` rows between the two parties in either direction are deleted, and a `user_blocks` row `(blocker = the viewer's profile, blocked = the target's profile)` is inserted

#### Scenario: Block inserts exactly one row

- **WHEN** the viewer blocks a target
- **THEN** exactly one `user_blocks` row is inserted, regardless of how many profiles either party runs

#### Scenario: Unblock a user

- **WHEN** the viewer clicks Unblock in the Blocked section
- **THEN** the `user_blocks` row is deleted; the target can attempt to follow again

### Requirement: Blocks SHALL gate URL access for signed-in blocked viewers; signed-out access is unchanged

A block SHALL prevent follow actions in both directions and SHALL exclude the blocker's `'public'` lists from the blocked party's Following feed (and vice versa). Every gate compares the viewer's profile against the counterparty profile named on the `user_blocks` row. When the blocked party is **signed in** AND attempts to load the blocker's list page or profile page, the system SHALL respond as if the resource were unavailable, using the existing app idioms (list page redirects to `/lists`, the same response a deleted list produces, via the shared `guardListViewable` helper; profile page returns a not-found response). When the blocked party is **signed out**, URL access is unchanged — the page renders normally. This signed-out seam is acknowledged: deleting the list or setting it to `'private'` is the only universal recourse.

A block names profiles, so a party who could run more than one profile could evade it by acting as a fresh one. That case is unreachable in this phase, because no surface creates a second profile; the model question it raises is owned elsewhere and is not answered here.

#### Scenario: Blocked user cannot follow

- **WHEN** profile A's account blocks profile B, and B's account attempts `followUser(A)`
- **THEN** the action returns an error and no `user_follows` row is created

#### Scenario: Blocked user no longer sees blocker in feed

- **WHEN** profile A's account blocks profile B, and B's account previously followed A
- **THEN** A no longer appears in B's Following feed (the prior `user_follows` row is deleted by the block action)

#### Scenario: Signed-in blocked user redirected from list page

- **WHEN** profile A's account has blocked profile B, and B's account (signed in) navigates to a list whose owning profile is A
- **THEN** the system redirects to `/lists` (the same response shape used for a deleted list), without rendering the list contents

#### Scenario: Signed-in blocked user 404s on profile page

- **WHEN** profile A's account has blocked profile B, and B's account (signed in) navigates to `/user/<A's profile id>`
- **THEN** the system returns a not-found response (the same response shape used for a non-existent profile)

#### Scenario: Signed-out access intact for unlisted/public lists

- **WHEN** profile A's account has blocked profile B, and B (signed out) navigates to A's `'unlisted'` or `'public'` list URL
- **THEN** the page renders normally — block gating applies only to signed-in viewers

#### Scenario: Shared `guardListViewable` helper centralizes the redirect target

- **WHEN** the list-page render checks fail (list missing OR viewer blocked by the owning profile)
- **THEN** both conditions flow through `lib/listAccess.ts`'s `guardListViewable` helper and exit via the same `redirect('/lists')` call, so future changes to the response shape (e.g. to a 404 page) edit one place

### Requirement: The `user_follows` composite primary key SHALL be the de-duplication backstop for concurrent follow writes

A follow relationship is uniquely identified by the pair `(follower_id, followee_profile_id)` — an account and the profile it follows. The `user_follows` table SHALL enforce this uniqueness with a composite primary key on that pair (`db/schema.ts`), and `followUser` SHALL insert via `onConflictDoNothing()` so that a duplicate follow — whether from a double click, an optimistic-UI retry, or two concurrent requests racing the follow/unfollow toggle — resolves to a single row with no error and no second row.

This requirement names the actual mechanism that makes "Follow is idempotent" safe under concurrency. The neon-http driver provides no interactive transactions and no `SELECT … FOR UPDATE` (see "Follow-graph mutations SHALL NOT use interactive transactions"), so the composite primary key — NOT a partial unique index — is the database-layer guarantee against duplicate follow rows. The key is recreated over the profile-valued followee column by the migration that introduces it; that recreation carries the guarantee forward rather than removing it. Any migration that drops or weakens this primary key without replacing it in the same migration SHALL be treated as removing a load-bearing concurrency backstop.

#### Scenario: Duplicate followUser inserts no second row

- **WHEN** an authenticated viewer invokes `followUser(targetProfileId)` twice for the same target (the second call before or after the first commits)
- **THEN** exactly one `user_follows(follower_id = viewer's account, followee_profile_id = target)` row exists
- **AND** neither call returns an error attributable to a uniqueness violation (the `onConflictDoNothing()` clause absorbs the conflict)

#### Scenario: Composite primary key rejects a raw duplicate insert

- **WHEN** a second `INSERT INTO user_follows` with the same `(follower_id, followee_profile_id)` pair is attempted WITHOUT the `onConflictDoNothing()` clause
- **THEN** the database raises a unique-violation error (SQLSTATE 23505) from the composite primary key

#### Scenario: Follow / unfollow toggle race converges to a single definite state

- **WHEN** a `followUser(targetProfileId)` and a concurrent retry of the same `followUser(targetProfileId)` both execute
- **THEN** the row set contains at most one matching `user_follows` row, and a subsequent `unfollowUser(targetProfileId)` removes it, leaving zero rows

### Requirement: Follow-graph mutations SHALL NOT use interactive transactions

Server actions `followUser`, `unfollowUser`, `blockUser`, and `unblockUser` in `lib/data/profile.actions.ts`, and `removeFollower` in `lib/data/user.actions.ts`, SHALL be implemented as one or more sequential single-statement calls against `db`. They SHALL NOT use `db.transaction(async (tx) => { … })`, SHALL NOT use `SELECT … FOR UPDATE`, and SHALL NOT use any pattern that assumes a multi-statement database session.

The same single-statement constraint SHALL apply to any inline server-component side-effect that mutates follow-graph or follow-graph-adjacent state (e.g. the inline `users.last_seen_following_at` update performed in `/following`'s `after()` callback). Replacing a previously-exported server action with an inline equivalent SHALL NOT relax this constraint.

This requirement reflects the project-wide constraint documented in `CLAUDE.md`: the DB layer uses `drizzle-orm/neon-http` over Neon's HTTP API, which does not support interactive transactions. Every query is its own HTTP round-trip on its own connection. Code that calls `db.transaction(...)` is broken — either throwing at runtime, or silently degrading to non-atomic execution depending on driver version.

When a follow-graph mutation needs to maintain a cross-statement invariant (e.g. "block-implies-no-follow"), the invariant SHALL be achieved through:

1. **Idempotent ordering** — perform the safer write first (e.g. for `blockUser`, insert the block row before deleting follow rows, so a partial failure leaves the user effectively-blocked rather than effectively-followed). Because each statement is its own round-trip, a read the mutation needs only later SHALL NOT be issued ahead of the safer write.
2. **DB-level constraints** — `ON CONFLICT DO NOTHING`, composite primary keys, partial unique indexes, or `CHECK` constraints — to backstop races at the database layer.
3. **Documented residual** — when neither of the above suffices, the residual race SHALL be commented inline at the call site (mirroring the pattern in `lib/data/purchase.actions.ts` `createPurchase`'s capacity-race comment).

#### Scenario: blockUser succeeds without invoking the driver's transaction API

- **WHEN** an authenticated user invokes `blockUser(targetProfileId)`
- **THEN** the implementation issues sequential single-statement calls (`db.insert(user_blocks)…onConflictDoNothing()`, `db.delete(user_follows)` forward, the `profiles` lookup resolving the blocked profile's account, `db.delete(user_follows)` reverse) and SHALL NOT call `db.transaction(...)` or `tx.*` on any code path

#### Scenario: The block row is the mutation's first database statement

- **WHEN** `blockUser` runs to completion
- **THEN** the `user_blocks` insert is the first database statement of the mutation, ahead of both follow-edge deletes and ahead of the `profiles` lookup whose result only the reverse delete reads; the actor resolution the action opens with (`authedIdentity()`, itself two reads) is not part of the mutation and necessarily precedes it

#### Scenario: Partial failure leaves the safer residual state

- **WHEN** `blockUser` issues the block-row insert successfully but a subsequent follow-row delete fails (e.g. network blip mid-sequence)
- **THEN** the residual database state contains the `user_blocks` row, the `followUser` predicate ("either-direction block prevents follow") correctly treats the relationship as blocked, and a retry of `blockUser` cleans up the leftover follow rows idempotently

#### Scenario: Source-of-truth tag invalidation runs after all writes succeed

- **WHEN** `blockUser` completes all of its sequential statements without throwing
- **THEN** both `updateTag('user_follows')` and `updateTag('user_blocks')` are invoked exactly once each; if any statement throws, neither tag SHALL be invalidated on that invocation

#### Scenario: Inline last-seen-following update is a single-statement write

- **WHEN** `/following` renders and registers an `after()` callback that updates `users.last_seen_following_at` for the viewer
- **THEN** the callback issues exactly one `db.update(users).set({ last_seen_following_at: new Date() }).where(eq(users.id, viewerId))` statement followed by `updateTag('user_follows')`, with no call to `db.transaction(...)`, no `SELECT … FOR UPDATE`, and no `auth()`/`headers()`/`cookies()` call inside the callback
