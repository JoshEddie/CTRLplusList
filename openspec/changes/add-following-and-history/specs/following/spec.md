## ADDED Requirements

### Requirement: Users SHALL follow and unfollow other users

An authenticated user SHALL be able to follow any other user via `followUser(user_id)` and unfollow via `unfollowUser(user_id)`. A follow relationship is represented by a row in `user_follows(follower_id, followee_id, created_at)`. A user SHALL NOT be able to follow themselves. A user SHALL NOT be able to follow another user if either party has blocked the other.

#### Scenario: Follow another user

- **WHEN** an authenticated user invokes `followUser(otherId)` for a user who has not blocked them
- **THEN** a `user_follows` row exists with `follower_id = viewer, followee_id = otherId`

#### Scenario: Follow is idempotent

- **WHEN** an authenticated user invokes `followUser(otherId)` while already following them
- **THEN** the action succeeds without inserting a duplicate row

#### Scenario: Cannot follow self

- **WHEN** an authenticated user invokes `followUser` with their own user id
- **THEN** the action returns an error and no row is inserted

#### Scenario: Cannot follow if blocked

- **WHEN** target user has blocked viewer (or vice versa)
- **THEN** `followUser` returns an error and no row is inserted

#### Scenario: Unfollow

- **WHEN** an authenticated user invokes `unfollowUser(otherId)`
- **THEN** the `user_follows` row `(viewer, otherId)` is removed; if no such row existed, the action is a no-op success

### Requirement: List pages SHALL expose a follow affordance for non-owner viewers

When an authenticated viewer who is not the list owner renders a list with `visibility != 'private'`, the list page SHALL display a Follow / Following button targeting the list's owner. The button SHALL be hidden when the viewer is the owner, when the viewer is unauthenticated, or when the viewer has blocked or been blocked by the owner.

#### Scenario: Follow button shown to non-owner

- **WHEN** an authenticated viewer (not the owner) loads a non-private list
- **THEN** a button labeled "Follow {owner-name}" is rendered prominently on the list page

#### Scenario: Following state shown after follow

- **WHEN** the viewer already follows the owner
- **THEN** the button label reads "Following" and clicking it unfollows

#### Scenario: Hidden for owner

- **WHEN** the list owner views their own list
- **THEN** no Follow button is rendered

#### Scenario: Hidden for unauthenticated

- **WHEN** an unauthenticated viewer loads a list
- **THEN** no Follow button is rendered

### Requirement: Profile pages SHALL exist at `/u/[id]` with an invite-URL follow prompt

The route `/u/[id]` SHALL render a public profile showing the user's name, image, and their `'public'` lists, plus a Follow / Following button for authenticated viewers. When the URL includes `?follow=1`, the page SHALL surface a prominent follow prompt above the list grid. A user SHALL be reachable via this URL even if they have zero public lists.

#### Scenario: Profile renders public lists

- **WHEN** any viewer loads `/u/[id]` for an existing user
- **THEN** the profile renders the user's name, image, and a grid of their `visibility = 'public'` lists

#### Scenario: Empty public lists state

- **WHEN** a profile is loaded for a user with no public lists
- **THEN** the page renders an empty-state message but the Follow button remains available to authenticated viewers

#### Scenario: Follow prompt from invite URL

- **WHEN** an authenticated viewer loads `/u/[id]?follow=1` and does not currently follow the target
- **THEN** a prominent follow prompt is shown above the list grid

#### Scenario: Unknown user 404

- **WHEN** any viewer loads `/u/[id]` for an id that does not exist
- **THEN** the page returns a 404 response

### Requirement: Owners SHALL view and manage their followers

The connections settings page (`/settings/connections`) SHALL show three sections: **Following** (with per-row unfollow), **Followers** (with per-row remove and per-row block), and **Blocked** (with per-row unblock). Each section SHALL be paginated or list-limited as needed.

#### Scenario: View following

- **WHEN** an authenticated user loads `/settings/connections`
- **THEN** the Following section lists each user the viewer follows, with an Unfollow button per row

#### Scenario: Remove a follower

- **WHEN** the viewer clicks Remove next to a follower
- **THEN** the `user_follows` row `(follower=that_user, followee=viewer)` is deleted; the user can re-follow

#### Scenario: Block a user

- **WHEN** the viewer clicks Block next to a user
- **THEN** any `user_follows` rows in either direction between the viewer and target are deleted, and a `user_blocks` row `(blocker=viewer, blocked=target)` is inserted

#### Scenario: Unblock a user

- **WHEN** the viewer clicks Unblock in the Blocked section
- **THEN** the `user_blocks` row is deleted; the user can attempt to follow again

### Requirement: Blocks SHALL affect the social graph only, not URL access

A block SHALL prevent follow actions in both directions and SHALL exclude the blocker's `'public'` lists from the blocked user's Following feed (and vice versa). A block SHALL NOT change per-list URL access; an `'unlisted'` or `'public'` list remains URL-accessible to anyone with the link, including a blocked user.

#### Scenario: Blocked user cannot follow

- **WHEN** user A blocks user B, and B attempts `followUser(A)`
- **THEN** the action returns an error and no `user_follows` row is created

#### Scenario: Blocked user no longer sees blocker in feed

- **WHEN** user A blocks user B, and B previously followed A
- **THEN** A no longer appears in B's Following feed (the prior `user_follows` row is deleted by the block action)

#### Scenario: URL access intact for unlisted lists

- **WHEN** user A blocks user B, and B has the URL to A's `'unlisted'` list
- **THEN** B can still load the URL and view the list

### Requirement: A `last_seen_following_at` per-user timestamp SHALL drive a "N new" badge

The `users` table SHALL have a `last_seen_following_at` nullable timestamp. When a user visits `/following`, the system SHALL update this column to `NOW()`. The Following rail on the home page SHALL render a "N new" badge on each user card where N is the count of that user's `'public'` lists with `shared_at > viewer.last_seen_following_at`.

#### Scenario: New list shows badge

- **WHEN** user B (followed by viewer A) publishes a new public list AND A has not visited `/following` since
- **THEN** A's home Following rail shows B's user card with a "1 new" badge

#### Scenario: Visiting /following clears badge

- **WHEN** A loads `/following`
- **THEN** `users.last_seen_following_at` is updated to NOW() and subsequent home renders show no "N new" badge for previously-counted lists

#### Scenario: Multiple new lists

- **WHEN** B publishes two public lists since A last visited `/following`
- **THEN** the badge on B's card reads "2 new"

#### Scenario: New follower's pre-existing lists

- **WHEN** A starts following B for the first time
- **THEN** A's `last_seen_following_at` is treated as the follow time for badge purposes (i.e. B's pre-existing public lists do NOT show as new). Implementation may achieve this by initializing `last_seen_following_at` to follow time if previously NULL, or by clamping the comparison to `MAX(last_seen_following_at, follow_created_at)`.
