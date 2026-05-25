## Why

Today the only way to stay connected to another user's lists is to manually save each list one at a time (`saved_lists`). For a family/occasion-driven app where the _same_ person produces a fresh list every cycle (Grandma's wishlist every birthday, Sis's Christmas list every December), this fights the grain of the data: you re-save the same person's lists year after year. The user-facing primitive should be **follow a person**, not **bookmark a list**.

Two adjacent shifts make this much cleaner if done together:

- **Visibility needs more than a boolean.** Today `lists.shared: bool` conflates "anyone with a link can view" and "I want to broadcast this." A follower feed needs a third state ("public") that explicitly opts a list into other people's feeds, distinct from "unlisted" (link-only). Without this, follow would either spam followers with every shared list or require an awkward second opt-in.
- **`saved_lists` should become visit history.** The YouTube model fits better: log every authenticated visit to a list you don't own, plus an explicit **Bookmark** affordance for pinning. The current save-a-list action carries two jobs (remember this, signal I care about this owner); follow takes the second job, history+bookmark takes the first.

Doing all three at once keeps the home page coherent — otherwise we'd ship the rails out of order and have to redesign twice.

## What Changes

### 1. List visibility: `shared:bool` → `visibility:enum`

- **Schema (additive)**: Add `lists.visibility text NOT NULL DEFAULT 'private'` (one of `'private' | 'unlisted' | 'public'`) and `lists.shared_at timestamp` (nullable; set when a list first becomes non-private). The legacy `lists.shared boolean` column is **NOT dropped** in this change. It remains in place during the soak and is dropped in a follow-up change once the new flow is proven stable. This keeps main (which still reads/writes `shared`) fully functional alongside dev (which reads/writes `visibility`).
- Migration: `shared=false` → `visibility='private'`; `shared=true` → `visibility='unlisted'` (conservative — no retroactive broadcast). `shared_at` backfills to `created_at` for migrated `'unlisted'` rows. The `shared` column is unchanged by the forward migration.
- Dual-write during soak: `setListVisibility` writes both `visibility` and the derived `shared = (visibility != 'private')`. Main's `shareList` action continues to write only `shared` — its writes do not propagate to dev's view (acceptable soft divergence; see design Risks).
- List edit / sharing UI: a two-state **Private / Shared** segmented toggle plus a **"Show in followers' feed"** checkbox (visible only when Shared) replacing the existing `ShareList` boolean toggle ([app/(main)/lists/ui/components/ShareList.tsx](<app/(main)/lists/ui/components/ShareList.tsx>)). The two-toggle UI maps to the 3-value `visibility` enum: Private → `'private'`, Shared+unchecked → `'unlisted'`, Shared+checked → `'public'`. The 3-state enum is preserved as the storage model because it's the smallest expressive set; flattening to 2 states would lose the "share by link without broadcasting" use case.
- Server action: `shareList(id, shared:bool)` ([app/actions/lists.ts:175](app/actions/lists.ts:175)) is replaced by `setListVisibility(id, visibility)` in dev code; the action on main is unchanged for the duration of the soak.

### 2. Visit history + bookmarks (replaces `saved_lists`)

- **Schema**: Add `list_visits(user_id, list_id, last_visited_at, visit_count, favorited_at)` with PK `(user_id, list_id)`. `favorited_at` is the "bookmarked" state — `IS NOT NULL` means bookmarked. `saved_lists` is **NOT dropped** in this change; it remains in place as a dormant table during a soak period and is dropped in a follow-up change (`archive-saved-lists`) once the new flow has proven stable in production.
- Migration: every row in `saved_lists` is copied to `list_visits` with `favorited_at = NOW()` (existing saves are promoted to bookmarks). `last_visited_at = NOW()`, `visit_count = 0` (no fake visit history invented). The source `saved_lists` rows are left untouched.
- App code stops reading and writing `saved_lists` entirely — the table is silently abandoned. There is no dual-write back to `saved_lists` for new bookmarks.
- Visit recording: on render of `app/(main)/lists/[id]/page.tsx`, the server upserts a `list_visits` row for the authenticated viewer **iff** they are not the list owner and the list is accessible to them. Implemented as a server-side action invoked from the page; no client beacon.
- Bookmark action: server actions `bookmarkList(list_id)` and `unbookmarkList(list_id)` toggle `favorited_at`.
- List page CTAs: the current `SaveButton` ([app/(main)/lists/ui/components/SaveButton.tsx](<app/(main)/lists/ui/components/SaveButton.tsx>)) is replaced by **two** affordances side-by-side:
  - **`[+ Follow <owner-name>]`** — primary full-width button (see capability 3).
  - **`[🔖 Bookmark]`** — secondary icon+label button, toggles bookmark state.
- New full pages:
  - `/lists/history` — full visit history, newest first, with 🔖 indicator on bookmarked rows. Per-row remove (×) and a "Clear history" / "Clear non-bookmarked" action.
  - `/lists/bookmarks` — full bookmarks list, newest bookmark first.

### 3. Follow users

- **NEW schema**: `user_follows(follower_id, followee_id, created_at)` PK on both ids; `user_blocks(blocker_id, blocked_id, created_at)` PK on both ids.
- Server actions: `followUser(user_id)`, `unfollowUser(user_id)`, `removeFollower(follower_id)`, `blockUser(user_id)`, `unblockUser(user_id)`.
- Authorization rules:
  - Cannot follow yourself; cannot follow a user who has blocked you.
  - `blockUser` deletes any existing follow rows in both directions and prevents new follows.
  - Blocked users no longer appear in each other's feeds. URL-level access to `'unlisted'` lists is unaffected (visibility is per-list, not per-relationship).
- Entry points (no user search):
  - **Follow button** on any list page where `visibility !== 'private'` and viewer is not the owner.
  - **Invite URL**: `/u/[id]?follow=1` renders the owner's profile and surfaces a follow prompt. Lets a user be followed before they have any public lists.
- New page: `/u/[id]` — public profile. Shows owner's name, image, and their `visibility = 'public'` lists. Follow/unfollow button. If `id === current user`, also shows a Followers section with remove + block per row.
- Connections settings page at `/settings/connections` — lists Following (with unfollow), Followers (with remove + block), and Blocked (with unblock). Symmetric UI to the profile page Followers section.

### 4. Home page: digest with collapsible rails

- The home page becomes a digest: each rail shows the **5 most recent** items with a **See all** link to a dedicated page.
- Rails (top to bottom): **My Lists** → **Following** → **Bookmarks** → **Recently visited**.
- Each rail is collapsible. Open/closed state persists in `localStorage` per browser, keyed `home.rail.<name>.open`. Default: open.
- **Following** rail shows user cards (not list cards), sorted by their `MAX(shared_at)` across public lists (most recently active first). Card shows avatar, name, and a small "N new" badge counting lists whose `shared_at > viewer.last_seen_following_at` (a per-user timestamp updated when they visit `/following`).
- **Bookmarks** rail shows bookmarked list cards.
- **Recently visited** rail shows all visited lists, ordered by `last_visited_at DESC`. Bookmarked lists are **not excluded** — they appear here too, with a 🔖 corner indicator. (Avoids "where did my list go?" confusion.)
- New full pages already covered: `/following`, `/lists/bookmarks`, `/lists/history`.

## Capabilities

### New Capabilities

- **`list-visibility`** — Three-state visibility model, sharing UI, and `setListVisibility` semantics including `shared_at` handling.
- **`visit-history`** — Automatic visit recording on render, bookmark toggle, history and bookmarks pages, and the bookmark-survives-in-history rule.
- **`following`** — Follow/unfollow/block/remove-follower actions, public profile, invite-URL flow, connections page, and feed-visibility rules.
- **`home-digest`** — Digest-format home page with four collapsible rails, per-rail "See all" deep links, and the localStorage-persisted collapse state.

### Modified Capabilities

- **`list-item-management`** — Unchanged in scope, but the existing requirement that references `lists.shared` (none currently) is unaffected. Listed only for completeness; no spec delta required here.

## Impact

### Schema

- New column `lists.visibility text NOT NULL DEFAULT 'private'`, new column `lists.shared_at timestamp` (nullable).
- `lists.shared boolean` column is **NOT dropped** in this change. It stays dormant during the soak so main (still on the old code) keeps functioning against the shared database. Dev's `setListVisibility` dual-writes a derived `shared` value to keep main's reads sensible; main's `shareList` writes only `shared`. Drop happens in the follow-up change.
- New table `list_visits`.
- New tables `user_follows`, `user_blocks`.
- `saved_lists` table is **NOT dropped** in this change. Data is copied into `list_visits` and dev's app stops referencing `saved_lists`. Main's save/unsave flow continues to read/write `saved_lists` unchanged. Drop happens in the follow-up change.
- Single Drizzle migration applies all schema + data-copy steps in order. The migration is **fully additive** at the schema level — no columns or tables are dropped — so main continues to operate against the same database without code changes.
- Down-migration drops the new tables (`list_visits`, `user_follows`, `user_blocks`), the `last_seen_following_at` column, and the `visibility` + `shared_at` columns. `lists.shared` and `saved_lists` are untouched by down-migration because they were never modified going forward.

### Routes

- New: `/lists/history`, `/lists/bookmarks`, `/following`, `/u/[id]`, `/settings/connections`.
- Modified: `/` (now a digest), `/lists/[id]` (CTAs replaced; visit upsert on render).

### Server actions (`app/actions/`)

- New: `setListVisibility`, `bookmarkList`, `unbookmarkList`, `recordVisit`, `followUser`, `unfollowUser`, `removeFollower`, `blockUser`, `unblockUser`.
- Removed: `saveList`, `unsaveList`, `shareList` (replaced by `setListVisibility`).

### Components

- New: `VisibilityPicker`, `BookmarkButton`, `FollowButton`, `UserCard`, `ProfileHeader`, `FollowersTable`, `CollapsibleRail`.
- Removed: `SaveButton`, `SaveContainer`, `SavedLists`, `ShareList` (replaced by the visibility picker), `ShareButton` (folded into the new sharing UI).

### Cache tags

- New: `user_follows`, `user_blocks`, `list_visits` (replaces `saved_lists`).
- The `lists` tag continues to invalidate on visibility changes.

### CSS

- New stylesheets for the digest layout, collapsible rails, user cards, profile page, and connections page.
- Remove `saved-lists` styles.

### Dependencies

- No new runtime dependencies.
- Drizzle migration depends only on existing tooling.

## Non-goals

- **Notifications** (push, email, in-app inbox). Pull-only feed for v1.
- **User search.** Discovery happens via shared list pages and owner-distributed invite URLs only.
- **Owner-visible view counts** ("47 people viewed this list"). `visit_count` is recorded but not surfaced.
- **Private follows.** Following is symmetric and visible to the followee.
- **History auto-pruning.** Manual clear only; no scheduled deletion.
- **Per-rail server-persisted collapse state.** `localStorage` only — collapse state does not sync across devices.
- **Favorite-user tier** ("starred follows"). Re-evaluate if usage data shows users following 30+ people.
