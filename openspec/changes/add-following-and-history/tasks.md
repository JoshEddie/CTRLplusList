## 1. Schema + migration

- [x] 1.1 In [db/schema.ts](db/schema.ts), ADD `visibility: text('visibility').notNull().default('private')` and `shared_at: timestamp('shared_at')` (nullable) to the `lists` table. **Keep** the existing `shared: boolean('shared').default(false).notNull()` column declaration — it stays dormant for the soak (see design Decision 4b) and is removed in the follow-up change.
- [x] 1.2 Add `last_seen_following_at: timestamp('last_seen_following_at')` (nullable) to the `users` table.
- [x] 1.3 Add new `list_visits` table: `user_id`, `list_id`, `last_visited_at` (notNull, defaultNow), `visit_count` (integer, notNull, default 1), `favorited_at` (timestamp, nullable). PK on `(user_id, list_id)`. Both FKs `onDelete: 'cascade'`.
- [x] 1.4 Add new `user_follows` table: `follower_id`, `followee_id`, `created_at` (notNull, defaultNow). PK on `(follower_id, followee_id)`. Both FKs `onDelete: 'cascade'`. CHECK: `follower_id <> followee_id`.
- [x] 1.5 Add new `user_blocks` table: `blocker_id`, `blocked_id`, `created_at` (notNull, defaultNow). PK on `(blocker_id, blocked_id)`. Both FKs `onDelete: 'cascade'`. CHECK: `blocker_id <> blocked_id`.
- [x] 1.6 **Keep** the `saved_lists` table definition in `db/schema.ts` for this change (it is intentionally dormant during the soak — see design Decision 4a). Do NOT remove `saved_listsRelations`; do NOT remove the `saved_lists: many(saved_lists)` reference from `usersRelations`. These are removed in the follow-up `archive-saved-lists` change.
- [x] 1.7 Update `usersRelations`, `listsRelations` to ADD relations for the new tables (`user_follows` outbound + inbound, `user_blocks` outbound + inbound, `list_visits`). Do not remove existing saved-lists relations.
- [x] 1.8 Generate Drizzle migration via `pnpm db:generate`. Hand-edit the generated migration to (a) interleave the data-copy steps below, and (b) **remove** any Drizzle-generated `DROP TABLE saved_lists` or `DROP COLUMN shared` statements. The migration must be fully additive at the schema level.
- [x] 1.9 In the migration, after adding `visibility` and `shared_at`: `UPDATE lists SET visibility = CASE WHEN shared THEN 'unlisted' ELSE 'private' END, shared_at = CASE WHEN shared THEN created_at ELSE NULL END`. The `shared` column is left in place.
- [x] 1.10 In the migration, after creating `list_visits`: `INSERT INTO list_visits (user_id, list_id, last_visited_at, visit_count, favorited_at) SELECT user_id, list_id, NOW(), 0, NOW() FROM saved_lists`. Do NOT drop `saved_lists` afterward.
- [x] 1.11 Add pre-flight assertions at the top of the migration (raises an error on inconsistency): no NULL `shared`, no duplicate `(user_id, list_id)` in `saved_lists`.
- [x] 1.12 Hand-author down-migration: drop `list_visits`, `user_follows`, `user_blocks`, `users.last_seen_following_at`; drop `visibility` and `shared_at` from `lists`. Do NOT touch `lists.shared` or `saved_lists` — they were never modified forward. Comment block at top documents the data loss on rollback (history, follows, blocks, and any bookmarks made during the soak; share-state changes are preserved on `lists.shared`).
- [x] 1.13 Run migration against a copy of prod data; verify (a) row counts match: `saved_lists.count == list_visits WHERE favorited_at IS NOT NULL.count`, (b) `saved_lists` is unchanged post-migration, (c) `lists.shared` is unchanged post-migration, (d) for every row, `visibility != 'private' == shared`.

## 2. DAL updates

- [x] 2.1 In [lib/dal.ts](lib/dal.ts:338), replace `eq(lists.shared, true)` with `inArray(lists.visibility, ['unlisted', 'public'])` in `getSharedListsByUser` (or rename to `getNonPrivateListsByUser`).
- [x] 2.2 Replace `getSavedListsByUser` and `getSavedStatus` ([lib/dal.ts:359](lib/dal.ts:359), [lib/dal.ts:387](lib/dal.ts:387)) with:
  - `getBookmarkedListsByUser(userId)` — `list_visits` WHERE `favorited_at IS NOT NULL` ORDER BY `favorited_at DESC`.
  - `getBookmarkStatus(userId, listId)` — boolean.
  - `getVisitHistoryByUser(userId, { limit, offset })` — `list_visits` ORDER BY `last_visited_at DESC`.
- [x] 2.3 Add new DAL functions:
  - `getFollowingByUser(userId)` — users this user follows.
  - `getFollowersOfUser(userId)` — users following this user.
  - `getBlockedByUser(userId)` — users this user has blocked.
  - `isFollowing(followerId, followeeId)` — boolean.
  - `isBlocked(blockerId, blockedId)` — boolean.
  - `getPublicListsByUser(userId, { limit, offset })` — `WHERE user_id = ? AND visibility = 'public' ORDER BY shared_at DESC`.
  - `getFollowingFeedUsers(userId)` — users the viewer follows, with `MAX(shared_at)` over their public lists and a `new_count` field (lists with `shared_at > viewer.last_seen_following_at`).
  - `getProfileForUser(userId, viewerId | null)` — name, image, public-list count; `isFollowing`, `isBlocked` flags if viewer is set.
- [x] 2.4 Update cache tags: `saved_lists` → `list_visits`; add `user_follows`, `user_blocks`. Reuse `lists` tag for visibility changes.

## 3. Server actions: list visibility

- [x] 3.1 In [app/actions/lists.ts](app/actions/lists.ts), replace `shareList(id, shared)` ([line 175](app/actions/lists.ts:175)) with `setListVisibility(id, visibility: 'private' | 'unlisted' | 'public')`.
- [x] 3.2 Validate input with zod (`z.enum(['private','unlisted','public'])`).
- [x] 3.3 Auth: must be authenticated; must be list owner.
- [x] 3.4 Read current `visibility` to determine transition and compute updates:
  - `private → unlisted | public`: set `shared_at = NOW()`.
  - `unlisted ↔ public`: do NOT touch `shared_at`.
  - `* → private`: set `shared_at = NULL`.
- [x] 3.5 **Dual-write to `lists.shared`** (see design Decision 4b): in the same UPDATE statement, set `shared = (visibility != 'private')`. This keeps main's view consistent for any writes made via dev's code path during the soak.
- [x] 3.6 `updateTag('lists')` on success.
- [x] 3.7 Return `ActionResponse` with a status message.

## 4. Server actions: visit history + bookmarks

- [x] 4.1 In `app/actions/lists.ts`, remove `saveList` ([line 233](app/actions/lists.ts:233)) and `unsaveList` ([line 264](app/actions/lists.ts:264)).
- [x] 4.2 Add `recordVisit(list_id)`:
  - Must be authenticated. If not, no-op (return success).
  - Read list; if viewer is owner OR list is `'private'`, no-op.
  - Upsert into `list_visits`: insert with `visit_count=1` if missing; otherwise increment `visit_count`, set `last_visited_at=NOW()`. Preserve `favorited_at`.
  - `updateTag('list_visits')`.
- [x] 4.3 Add `bookmarkList(list_id)`:
  - Must be authenticated; cannot bookmark own list (or allow it; decide during impl — leaning yes, allow, no harm).
  - Upsert into `list_visits` with `favorited_at = NOW()` (set/refresh).
  - `updateTag('list_visits')`.
- [x] 4.4 Add `unbookmarkList(list_id)`:
  - Must be authenticated.
  - Update the `list_visits` row to `favorited_at = NULL`. Do not delete the row (history persists).
  - `updateTag('list_visits')`.
- [x] 4.5 Add `clearVisitHistory({ includeBookmarked: boolean })`:
  - Must be authenticated.
  - If `includeBookmarked=false`: `DELETE FROM list_visits WHERE user_id=? AND favorited_at IS NULL`.
  - If `includeBookmarked=true`: `DELETE FROM list_visits WHERE user_id=?`.
  - `updateTag('list_visits')`.
- [x] 4.6 Add `removeVisit(list_id)` for per-row × on history page:
  - If row is bookmarked, do not delete (no-op or error). Otherwise delete.
  - `updateTag('list_visits')`.

## 5. Server actions: follows + blocks

- [x] 5.1 Create `app/actions/follows.ts`.
- [x] 5.2 `followUser(followee_id)`:
  - Must be authenticated. Cannot follow self. Cannot follow if `user_blocks(followee_id, viewer_id)` exists. Cannot follow if `user_blocks(viewer_id, followee_id)` exists.
  - Idempotent insert into `user_follows` (ON CONFLICT DO NOTHING).
  - `updateTag('user_follows')`.
- [x] 5.3 `unfollowUser(followee_id)`:
  - Must be authenticated.
  - Delete from `user_follows` where `follower_id=viewer AND followee_id=arg`.
  - `updateTag('user_follows')`.
- [x] 5.4 `removeFollower(follower_id)`:
  - Must be authenticated.
  - Delete from `user_follows` where `follower_id=arg AND followee_id=viewer`.
  - `updateTag('user_follows')`.
- [x] 5.5 `blockUser(blocked_id)`:
  - Must be authenticated. Cannot block self.
  - In a transaction: delete `user_follows` rows in both directions between viewer and target; upsert into `user_blocks (blocker_id=viewer, blocked_id=arg)`.
  - `updateTag('user_follows')`, `updateTag('user_blocks')`.
- [x] 5.6 `unblockUser(blocked_id)`:
  - Must be authenticated.
  - Delete from `user_blocks` where `blocker_id=viewer AND blocked_id=arg`.
  - `updateTag('user_blocks')`.
- [x] 5.7 `markFollowingSeen()`:
  - Called when the user visits `/following`.
  - `UPDATE users SET last_seen_following_at = NOW() WHERE id = viewer.id`.
  - `updateTag('user_follows')` (badge changes).

## 6. List page integration

- [x] 6.1 In `app/(main)/lists/[id]/page.tsx`, on server render: if viewer is authenticated AND list is not owned by viewer AND list is not `'private'`, invoke `recordVisit(list_id)` server-side (fire-and-forget pattern: do not block render; use a `void` call inside an `after`-like server hook or directly before returning).
- [x] 6.2 Replace the `<SaveButton>` and `<SaveContainer>` usage with new `<FollowButton owner={...} />` and `<BookmarkButton list_id={...} bookmarked={...} />` components, side-by-side.
- [x] 6.3 Hide the Follow button when viewer is the owner OR viewer is unauthenticated.
- [x] 6.4 Hide the Bookmark button when viewer is the owner. (Optional: allow self-bookmark — decide during impl; defaults to hidden.)

## 7. Visibility UI

- [x] 7.1 Create `app/(main)/lists/ui/components/VisibilityPicker.tsx`: two-option **Private / Shared** segmented toggle plus a **"Show in followers' feed"** checkbox (rendered only when Shared). Maps to `setListVisibility(id, 'private' | 'unlisted' | 'public')` per the rules in `specs/list-visibility/spec.md`.
- [x] 7.2 Replace `<ShareList>` usage in [ListDetails.tsx](app/(main)/lists/ui/components/ListDetails.tsx) (and any other usage site) with `<VisibilityPicker>`.
- [x] 7.3 Delete [ShareList.tsx](app/(main)/lists/ui/components/ShareList.tsx) and [ShareButton.tsx](app/(main)/lists/ui/components/ShareButton.tsx) (folded into the new picker).
- [x] 7.4 Update copy: explain each state in a tooltip or helper text ("Only you", "Anyone with link", "Anyone with link + appears in followers' feeds").
- [x] 7.5 Verify that the `ListPrivate` UI ([app/(main)/lists/ui/components/ListPrivate.tsx](app/(main)/lists/ui/components/ListPrivate.tsx)) handles the `'private'` state correctly (already does for `shared=false` equivalent).

## 8. Bookmark UI component

- [x] 8.1 Create `app/(main)/lists/ui/components/BookmarkButton.tsx`: icon+label button (`FaBookmark` from `react-icons/fa`), label "Bookmark" / "Bookmarked".
- [x] 8.2 Submits to `bookmarkList` / `unbookmarkList`. Optimistic update.
- [x] 8.3 Style as secondary button (subtle background, not primary color).

## 9. Follow UI components

- [x] 9.1 Create `app/(main)/users/ui/components/FollowButton.tsx`: full-width primary button labeled "Follow {name}" / "Following".
- [x] 9.2 Optimistic update; submits to `followUser` / `unfollowUser`.
- [x] 9.3 Create `app/(main)/users/ui/components/UserCard.tsx`: avatar (`image` or initials placeholder), name, "N new" badge if applicable, click navigates to `/u/[id]`.
- [x] 9.4 Create `app/(main)/users/ui/components/ProfileHeader.tsx`: avatar, name, public-list count, Follow/Following button (or "Edit profile" if own profile).

## 10. New pages

- [x] 10.1 `app/(main)/u/[id]/page.tsx`:
  - Fetch profile via `getProfileForUser(id, viewer?.id ?? null)`. 404 if user doesn't exist.
  - If `?follow=1` query param is present AND viewer is authenticated AND not following AND not blocked, show a prominent "Follow {name}" prompt above the lists.
  - Render `<ProfileHeader>` + grid of public lists (via `getPublicListsByUser`).
  - If `id === viewer.id`, render a Followers section below the lists (link to `/settings/connections`).
- [x] 10.2 `app/(main)/following/page.tsx`:
  - Require auth.
  - Server-side call to `markFollowingSeen()` on render (matches the visit-recording pattern).
  - Render the full grid of `<UserCard>` for `getFollowingFeedUsers(viewer.id)`.
- [x] 10.3 `app/(main)/lists/history/page.tsx`:
  - Require auth.
  - Fetch `getVisitHistoryByUser(viewer.id, { limit: 100 })`.
  - Render list cards in `last_visited_at DESC` order with 🔖 indicator on bookmarked rows. Per-row × button (disabled if bookmarked, tooltip explains).
  - Buttons: "Clear history" → opens confirm dialog with two options ("Clear non-bookmarked" / "Clear all").
- [x] 10.4 `app/(main)/lists/bookmarks/page.tsx`:
  - Require auth.
  - Fetch `getBookmarkedListsByUser(viewer.id)`.
  - Render list cards in `favorited_at DESC` order with a Bookmark toggle on each card.
- [x] 10.5 `app/(main)/settings/connections/page.tsx`:
  - Require auth.
  - Three sections: Following (unfollow), Followers (remove + block), Blocked (unblock).
  - Each section is a table/list of user rows.

## 11. Home page (digest)

- [x] 11.1 Rewrite [app/(main)/lists/page.tsx](app/(main)/lists/page.tsx) (or replace the file the home route resolves to) as a digest.
- [x] 11.2 Create `app/(main)/lists/ui/components/CollapsibleRail.tsx`: header with chevron toggle, "See all" link, child grid; reads/writes `localStorage` key `home.rail.<name>.open` on client.
- [x] 11.3 Render four rails: My Lists, Following, Bookmarks, Recently visited. Each: top 5, "See all" → respective full page.
- [x] 11.4 Delete [SavedLists.tsx](app/(main)/lists/ui/components/SavedLists.tsx) and [SaveButton.tsx](app/(main)/lists/ui/components/SaveButton.tsx) and [SaveContainer.tsx](app/(main)/lists/ui/components/SaveContainer.tsx) — superseded.
- [x] 11.5 Add a one-time migration toast on home: "Saved lists are now Bookmarks." Dismissal stored in `localStorage` key `home.bookmark-migration-toast.dismissed`.

## 12. CSS

- [x] 12.1 New stylesheet for digest + collapsible rails.
- [x] 12.2 New stylesheet for user cards and profile.
- [x] 12.3 New stylesheet for connections page.
- [x] 12.4 Remove `saved-lists`-related styles from `app/(main)/lists/ui/styles/list.css`.
- [x] 12.5 Add 🔖 corner-indicator style for list cards.

## 13. Cleanup (in-app references only; legacy schema stays)

- [x] 13.1 Remove `saveList`, `unsaveList`, `shareList` from `app/actions/lists.ts`. Verify no remaining callers. (The `saved_lists` Drizzle import in `app/actions/lists.ts` is removed along with these actions if nothing else references the schema object in that file.)
- [x] 13.2 Remove `getSavedListsByUser` and `getSavedStatus` from `lib/dal.ts`. Remove the `saved_lists` import there if no other references remain.
- [x] 13.3 Remove the `saved-lists` Suspense block from `app/(main)/lists/page.tsx` (handled by digest rewrite).
- [x] 13.4 Verify no app code outside `db/schema.ts` references `saved_lists`, `saveList`, or `unsaveList`. Grep: `grep -r "saved_lists\|saveList\|unsaveList" app lib --include="*.ts" --include="*.tsx"` should return no hits after this section.
- [x] 13.5 Verify no app code reads `lists.shared` (dev should only read `lists.visibility`). The `setListVisibility` action is the only write site for `shared` (dual-write per task 3.5). Grep: `grep -rn "lists.shared\b" app lib --include="*.ts" --include="*.tsx"` — should only show the dual-write in `setListVisibility`.
- [x] 13.6 The Drizzle `shared` column declaration in `db/schema.ts` and the `saved_lists` table declaration stay. Both are dormant and removed in the follow-up `archive-legacy-share` change.
- [x] 13.7 Run `pnpm tsc --noEmit` and `pnpm lint`; fix breakages.

## 14. Verification

- [ ] 14.1 Manual: log in as User A, open User B's `'public'` list → row appears in A's `/lists/history` with non-bookmarked styling.
- [ ] 14.2 Manual: refresh the list page → `visit_count` increments (verify in DB); single row in history.
- [ ] 14.3 Manual: click Bookmark on the list page → row gains 🔖 indicator in history and appears in `/lists/bookmarks`.
- [ ] 14.4 Manual: click Unbookmark → row remains in history with bookmark removed.
- [ ] 14.5 Manual: User A's own list, opened by User A → no visit row recorded; Follow + Bookmark buttons not shown.
- [ ] 14.6 Manual: set a list to Public, then to Unlisted → `shared_at` unchanged. Set Public → Private → Public: `shared_at` is the new transition time.
- [ ] 14.7 Manual: log in as User A, visit User B's `/u/[id]?follow=1` → follow prompt shown; click Follow → `user_follows` row inserted; redirect to profile with Following state.
- [ ] 14.8 Manual: User B creates a new `'public'` list → appears in A's Following rail with "1 new" badge.
- [ ] 14.9 Manual: User A visits `/following` → badge clears.
- [ ] 14.10 Manual: User A blocks User C → A's follow of C removed (if any); C's follow of A removed (if any); C cannot re-follow; C's `'public'` lists no longer appear in A's feed.
- [ ] 14.11 Manual: User C still has the URL to User A's `'unlisted'` list → can still load it (URL-level access intact).
- [ ] 14.12 Manual: each home-page rail collapses/expands; state persists across reload.
- [ ] 14.13 Manual: "Clear non-bookmarked" wipes history but preserves bookmarks; "Clear all" wipes both.
- [ ] 14.14 Manual: unauthenticated user views a `'public'` list → no visit recorded; CTAs not shown.
- [ ] 14.15 `pnpm tsc --noEmit` and `pnpm lint` clean.

## 15. Block hardening + connections identity polish

- [x] 15.1 Create `lib/listAccess.ts` exporting `guardListViewable<T extends { user_id: string }>(list, viewerId)`. Redirects to `/lists` if list is missing (or `/` for unauthenticated viewers hitting a missing list), and redirects to `/lists` if `isBlocked(list.user_id, viewerId)` returns true. Returns the narrowed non-null list.
- [x] 15.2 Refactor `app/(main)/lists/[id]/page.tsx` to call `guardListViewable` in place of the two inline `redirect()` checks. The list-existence check, the blocked-by-owner check, and the redirect target all live in the helper.
- [x] 15.3 In `app/(main)/u/[id]/ProfilePage.tsx`, add `if (profile.viewerIsBlocked) notFound();` immediately after the missing-profile check. Comment that this is the signed-in URL-gate (cover: "account doesn't exist").
- [x] 15.4 Revert the first-name-only trimming in `lib/auth.ts`'s `signIn` callback. Prefer `${given_name} ${family_name}` when both are present; fall back to `given_name` alone otherwise. Document that `firstNameOf()` continues to handle casual-display surfaces.
- [x] 15.5 In `app/(main)/settings/connections/ConnectionRow.tsx`, accept a `since` prop and render it as a sub-line under the name. Format short ("May 19, 2026"). Wire the date through from each section in `ConnectionsPage.tsx` (Following: `user_follows.created_at`; Followers: same; Blocked: `user_blocks.created_at`).
- [x] 15.6 In `app/(main)/users/ui/components/FollowButton.tsx`, render an inline `.follow-disclosure` note under the button when the viewer is not yet following. Hide it once `following === true`.
- [x] 15.7 CSS additions: `.connections-row-meta` / `.connections-row-since`, `.follow-button-wrap` / `.follow-disclosure`. Reuse existing tokens (`--muted-text-color`, `--background-color`).

## 16. Verification (block + identity)

- [ ] 16.1 Manual: signed-in User A blocks User B → B (signed in) opens a URL to one of A's lists → redirected to `/lists`, no list contents rendered.
- [ ] 16.2 Manual: same setup, B navigates to `/u/<A's id>` → 404.
- [ ] 16.3 Manual: same setup, B signs out → B's URL to A's `'unlisted'` list still renders normally.
- [ ] 16.4 Manual: A removes the block → B can re-load both the list page and A's profile without redirect/404.
- [ ] 16.5 Manual: a user signs in for the first time post-change; their `users.name` is the full name from Google (verify in DB or via their connections row).
- [ ] 16.6 Manual: an existing user with `name = "Josh"` (first-name-only) re-signs in → `name` updates to "Josh Eddie".
- [ ] 16.7 Manual: a user claims a purchased item → attribution still shows first name only.
- [ ] 16.8 Manual: connections page shows full name for users who have re-authed, plus a date sub-line under each row across all three sections.
- [ ] 16.9 Manual: Follow button on a list page renders the inline disclosure when not-following; disclosure disappears after clicking Follow.
- [ ] 16.10 `pnpm tsc --noEmit` and `pnpm lint` clean.
