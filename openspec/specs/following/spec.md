# following Specification

## Purpose

TBD - created by archiving change colocate-follow-with-owner-name. Update Purpose after archive.

## Requirements

### Requirement: List pages SHALL expose a follow affordance for non-owner viewers, colocated with the linked owner name

When an authenticated viewer who is not the list owner renders a list with `visibility != 'private'`, the list-detail hero SHALL display a Follow / Following button targeting the list's owner. The button SHALL be a full-size button satisfying WCAG 2.5.5 (44×44 CSS px touch target). The button SHALL be rendered in a byline sub-row of the list hero adjacent to the owner's name (which itself SHALL be rendered as a link to `/user/{owner_id}` on this surface), and SHALL NOT be rendered in the list-hero action row alongside list-actions such as Share and Bookmark. The button SHALL be hidden when the viewer is the owner, when the viewer is unauthenticated, or when the viewer has blocked or been blocked by the owner.

#### Scenario: Follow button colocated with linked owner name

- **WHEN** an authenticated viewer (not the owner) loads a non-private list
- **THEN** the list hero renders a byline sub-row containing the owner's name as a link to `/user/{owner_id}` and a full-size button labeled "Follow {owner-name}" adjacent to it
- **AND** the list-hero action row contains only list-actions (Share, Bookmark) — no Follow button

#### Scenario: Following state shown after follow

- **WHEN** the viewer already follows the owner
- **THEN** the button label reads "Following" and clicking it unfollows (no dialog gating on unfollow)

#### Scenario: Owner name linkified only on list-detail hero

- **WHEN** the owner's name appears on a list-detail hero
- **THEN** it renders as a link to `/user/{owner_id}`

- **WHEN** the owner's name appears on other surfaces (list cards, bookmark rails, feed entries)
- **THEN** the name's existing presentation is unchanged by this requirement (linkification on those surfaces is out of scope)

#### Scenario: Hidden for owner

- **WHEN** the list owner views their own list
- **THEN** no Follow button is rendered in the byline sub-row

#### Scenario: Hidden for unauthenticated

- **WHEN** an unauthenticated viewer loads a list
- **THEN** no Follow button is rendered

### Requirement: First follow by a viewer SHALL surface a disclosure dialog

When an authenticated viewer with zero existing follow relationships (i.e., no row in `user_follows` where `follower_id` is the viewer) attempts to follow another user, the UI SHALL surface a modal confirmation dialog stating what is shared by following ("Following someone shares your name and profile picture with them.") and offering Cancel / Follow actions. On Confirm, the follow SHALL proceed (a `user_follows` row is inserted unless blocked). On Cancel, no follow SHALL occur. Once the viewer has at least one row in `user_follows` with `follower_id = viewer`, the dialog SHALL NOT appear on any subsequent follow action — the viewer's own follow graph is the source of truth for "have they been past first follow before?" No separate acknowledgement field is stored.

The dialog SHALL replace the previously-specified inline disclosure note rendered under the Follow button. The Follow button itself SHALL NOT render an inline disclosure on any surface.

The system MAY re-surface the dialog if the viewer unfollows every user they follow and then attempts a new follow — the derived signal returns to zero in that case. This is an accepted trade-off; the system SHALL NOT add storage to suppress it.

#### Scenario: First-time follow surfaces dialog

- **WHEN** an authenticated viewer with zero rows in `user_follows` (where `follower_id` is the viewer) clicks Follow on any user
- **THEN** a modal dialog appears with the disclosure text and Cancel / Follow buttons
- **AND** no `user_follows` row is inserted yet

#### Scenario: Confirm proceeds with follow

- **WHEN** the viewer clicks Follow inside the dialog
- **THEN** the follow proceeds (a `user_follows` row is inserted unless blocked)
- **AND** the dialog closes

#### Scenario: Cancel aborts the follow

- **WHEN** the viewer clicks Cancel (or presses ESC) inside the dialog
- **THEN** the dialog closes
- **AND** no `user_follows` row is inserted

#### Scenario: Subsequent follows skip the dialog

- **WHEN** an authenticated viewer with at least one row in `user_follows` (where `follower_id` is the viewer) clicks Follow on any other user
- **THEN** no dialog appears
- **AND** the follow proceeds immediately

#### Scenario: Unfollow never gates on the dialog

- **WHEN** an authenticated viewer clicks Following to unfollow another user
- **THEN** the unfollow proceeds immediately with no dialog, regardless of the viewer's follow count

#### Scenario: Existing followers automatically skip the dialog

- **WHEN** a viewer who already follows other users (pre-existing from before this change) clicks Follow on a new user
- **THEN** no dialog appears — the derived signal evaluates to "past first follow"
- **AND** the follow proceeds immediately

#### Scenario: Re-prompt after unfollowing everyone (accepted edge case)

- **WHEN** a viewer who has previously followed users unfollows every user they follow, and then later clicks Follow on a new user
- **THEN** the dialog re-appears, because the derived "first follow?" signal is again zero
- **AND** confirming proceeds with the follow as in the first-follow case

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

### Requirement: Blocks SHALL gate URL access for signed-in blocked viewers; signed-out access is unchanged

A block SHALL prevent follow actions in both directions and SHALL exclude the blocker's `'public'` lists from the blocked user's Following feed (and vice versa). When the blocked user is **signed in** AND attempts to load the blocker's list page or profile page, the system SHALL respond as if the resource were unavailable, using the existing app idioms (list page redirects to `/lists`, the same response a deleted list produces, via the shared `guardListViewable` helper; profile page returns a not-found response). When the blocked user is **signed out**, URL access is unchanged — the page renders normally. This signed-out seam is acknowledged: deleting the list or setting it to `'private'` is the only universal recourse.

#### Scenario: Blocked user cannot follow

- **WHEN** user A blocks user B, and B attempts `followUser(A)`
- **THEN** the action returns an error and no `user_follows` row is created

#### Scenario: Blocked user no longer sees blocker in feed

- **WHEN** user A blocks user B, and B previously followed A
- **THEN** A no longer appears in B's Following feed (the prior `user_follows` row is deleted by the block action)

#### Scenario: Signed-in blocked user redirected from list page

- **WHEN** user A has blocked user B, and B (signed in) navigates to a list owned by A
- **THEN** the system redirects to `/lists` (the same response shape used for a deleted list), without rendering the list contents

#### Scenario: Signed-in blocked user 404s on profile page

- **WHEN** user A has blocked user B, and B (signed in) navigates to `/u/<A's id>`
- **THEN** the system returns a not-found response (the same response shape used for a non-existent user)

#### Scenario: Signed-out access intact for unlisted/public lists

- **WHEN** user A has blocked user B, and B (signed out) navigates to A's `'unlisted'` or `'public'` list URL
- **THEN** the page renders normally — block gating applies only to signed-in viewers

#### Scenario: Shared `guardListViewable` helper centralizes the redirect target

- **WHEN** the list-page render checks fail (list missing OR viewer blocked by owner)
- **THEN** both conditions flow through `lib/listAccess.ts`'s `guardListViewable` helper and exit via the same `redirect('/lists')` call, so future changes to the response shape (e.g. to a 404 page) edit one place

### Requirement: Sign-in SHALL capture the user's full name from Google when available

The sign-in callback in `lib/auth.ts` SHALL store `${profile.given_name} ${profile.family_name}` in `users.name` when both fields are present on Google's OAuth profile. If only `given_name` is present, `users.name` SHALL fall back to the first name. Existing surfaces that prefer first-name-only (purchase attribution, etc.) SHALL continue to derive that via `firstNameOf()` in `lib/dal.ts` — the storage change does not alter display in casual contexts.

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

### Requirement: Connections page SHALL show a "since" date for each relationship

Each row on `/settings/connections` (Following, Followers, Blocked) SHALL display the relationship's `created_at` formatted as a short date (e.g. "May 19, 2026"), used by the owner as a time anchor when disambiguating users.

#### Scenario: Following row shows follow date

- **WHEN** the connections page renders a row for a followee with `user_follows.created_at = 2026-05-19`
- **THEN** the row shows "May 19, 2026" as a sub-line beneath the name

#### Scenario: Followers row shows follow date

- **WHEN** the connections page renders a row for a follower
- **THEN** the row shows the `created_at` of the `user_follows` row that targets the viewer

#### Scenario: Blocked row shows block date

- **WHEN** the connections page renders a row for a blocked user
- **THEN** the row shows the `created_at` of the `user_blocks` row

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
