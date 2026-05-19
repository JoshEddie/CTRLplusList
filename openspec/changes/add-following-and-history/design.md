## Context

Today the social/curation layer of the app rests on two primitives:

- `lists.shared: boolean` — a list is either private or "anyone with the link can view." Surfaced via the toggle in [ShareList.tsx](app/(main)/lists/ui/components/ShareList.tsx) and the `shareList` action ([app/actions/lists.ts:175](app/actions/lists.ts:175)).
- `saved_lists(user_id, list_id)` — per-list bookmark. Surfaced via [SaveButton.tsx](app/(main)/lists/ui/components/SaveButton.tsx), the `saveList` / `unsaveList` actions ([app/actions/lists.ts:233](app/actions/lists.ts:233), [app/actions/lists.ts:264](app/actions/lists.ts:264)), and the "Saved Lists" rail on the home page.

This works for a one-off "I want to remember this list" but fights the grain of an occasion-driven family app where the same person produces a fresh list every cycle. The redesign introduces a person-level relationship (follow) and reframes per-list bookmarks as **history + an explicit pin**.

The change is BREAKING at the schema level. There is no production deployment with external dependents, so an in-place migration with no compatibility shim is acceptable.

## Goals / Non-Goals

**Goals:**
- A user can follow another user once and automatically see that user's new public lists in their home-page feed.
- A user can bookmark any list they have access to, and bookmarks survive in history (no hide-on-bookmark surprise).
- Owners can choose between Private, Unlisted, and Public, with an explicit broadcast moment when going public.
- Owners can see and manage their followers, including remove + block.
- The home page becomes a glanceable digest, with deep links to full per-rail pages.

**Non-Goals:** see proposal.md "Non-goals".

## Decisions

### Decision 1: One bundled change, not three sequenced ones

**Choice**: Ship visibility states + visit history + follow users as a single change.

**Why**: The home page redesign is the integration point — sequencing the rails one at a time would force two intermediate UIs that are worse than today's. The schema changes (drop `saved_lists`, add `list_visits`, add `user_follows`, add `user_blocks`, change `lists.shared` → `lists.visibility`) are independently small and easily co-applied in one migration. Single-PR rollout is feasible at this scale.

**Trade-off**: A larger review surface. Mitigated by the four-capability split inside the change, so each capability's spec, tasks, and code paths can be reviewed independently.

### Decision 2: `visibility` enum stored as text, not a Postgres `enum` type

**Choice**: `lists.visibility text NOT NULL CHECK (visibility IN ('private','unlisted','public'))` with a Drizzle `text` column.

**Why**: Postgres enum types are awkward to extend (adding a value requires a migration with `ALTER TYPE`). Text + CHECK is just as fast at this volume and trivially extensible if a future state (e.g. `'family'`) is added. Matches the convention used elsewhere in the schema (no existing enum types).

### Decision 3: `shared_at` only updates on `private → non-private` transition

**Choice**: `shared_at` is set when a list first becomes `'unlisted'` or `'public'` and is **not** updated on subsequent transitions between `'unlisted'` and `'public'`.

**Why**: This is the "feed ordering" timestamp — "when did this list first enter circulation?" Toggling between unlisted and public is a privacy adjustment, not a re-broadcast. If we bumped `shared_at` on `unlisted → public`, an owner could spam followers by flipping the switch repeatedly. If we bumped it on `public → unlisted → public`, same issue.

If an owner explicitly wants a re-broadcast moment, they can flip to `'private'` (which clears `shared_at` to `NULL`) then back to `'public'` (which sets a fresh `shared_at`). This is intentional friction.

**Edge case**: `public → private` clears `shared_at` to NULL. Re-publishing later gets a fresh timestamp. Encoded as a CHECK or trigger? Application-level enforcement in `setListVisibility` — simpler, no Postgres-side complexity.

### Decision 4: Migrate `saved_lists` rows to bookmarks, not raw history

**Choice**: Each `saved_lists` row is copied to a `list_visits` row with `favorited_at = NOW()` (or row's original timestamp if we had one — we don't, so NOW() at migration time). `last_visited_at = NOW()`, `visit_count = 0`. The source `saved_lists` rows are left untouched.

**Why**: Existing saves are *explicit user intent* ("I want to keep this") — closer in meaning to bookmark than to "casually visited." Dumping them into raw history loses signal. Promoting to bookmarks preserves user intent.

**Trade-off**: `visit_count = 0` is a small lie (the user has presumably visited at least once to have saved). Acceptable because visit_count is internal and not surfaced.

### Decision 4a: `saved_lists` table is deferred-drop, not dropped in this change

**Choice**: After the data copy completes, `saved_lists` remains in the database as a dormant table. The app stops reading and writing it. A follow-up change (`archive-saved-lists`) drops it once the new flow is proven stable in production.

**Why**: Keeping the source table dormant gives a fast forensic path if something goes wrong with the new bookmark flow — the original saves data is still queryable. Dropping is irreversible; deferring is cheap. The cost is one extra orphan table in the schema for the soak period.

**No dual-write**: bookmarks made post-deploy do NOT propagate back to `saved_lists`. The dormant table is a read-only snapshot of pre-migration saves. If the code is rolled back, bookmarks made during the soak window are lost (small, bounded data loss). Implementing dual-write would add code in `bookmarkList`/`unbookmarkList` for marginal recovery value; not worth it.

**Drizzle schema**: keep the `saved_lists` table definition in `db/schema.ts` during the soak so the schema file accurately reflects the live DB. The `saved_listsRelations` object and the `saved_lists: many(...)` reference in `usersRelations` MAY remain as orphan code — they are unreferenced by app code but harmless. They are removed in the follow-up `archive-saved-lists` change.

**Same treatment for `lists.shared`** (see Decision 4b): the `shared` column is also kept dormant during the soak. The dev/main shared-database constraint forces this — dropping `shared` would crash main on every `lists` query (Drizzle's typed selects list every declared column).

### Decision 4b: `lists.shared` column is deferred-drop with one-way dual-write

**Choice**: The forward migration adds `visibility` and `shared_at` columns but leaves `lists.shared` in place. `setListVisibility` dual-writes `shared = (visibility != 'private')` alongside the new columns. Main's `shareList` action continues to write only `shared` for the duration of the soak. The follow-up change drops `shared` once main is on the new code.

**Why**: Main and dev share a database. Dropping `lists.shared` would crash main everywhere it queries the `lists` table, not just where it explicitly references the column — Drizzle's typed selects enumerate every declared column. Deferring the drop keeps main fully functional during the soak. The data-copy on forward migration (`visibility = 'unlisted' WHERE shared = true`) plus the dual-write going forward keeps dev's `visibility` view consistent for all writes performed via dev's code path.

**Drift during soak**:
- A write via dev's `setListVisibility` updates both `visibility` and `shared`. Both branches see the same state. ✓
- A write via main's `shareList(id, true)` updates `shared` only. Dev's `visibility` for that row is stale until someone re-saves via dev's UI.
- A write via main's `shareList(id, false)` similarly leaves dev's `visibility` stale.

Stale-on-dev rows are visually inconsistent but not corrupting: dev sees the list as `'private'` (or whatever visibility was last set via dev), main sees it as `shared = true`. No crashes. The window closes when the soak ends and main migrates to dev's code.

**No reverse trigger from `shared` to `visibility`**: we could add a Postgres trigger that updates `visibility` whenever `shared` changes, but it adds migration complexity (trigger creation + teardown) for marginal benefit. The soak is bounded; drift is bounded.

**Drizzle schema**: keep `shared: boolean` in `db/schema.ts` during the soak. Removing it from dev's schema file while the column still exists in the DB would make Drizzle's typed selects skip a real column — harmless for dev but a footgun if any code path expects to read it. Cleaner to leave it declared and let it become orphan field metadata once the dual-write is the only write site in dev code.

### Decision 5: Visit recording is server-side, on page render, idempotent

**Choice**: `app/(main)/lists/[id]/page.tsx` invokes a server action `recordVisit(list_id)` on render. The action upserts into `list_visits`:
- Insert if no row exists, with `visit_count = 1`, `last_visited_at = NOW()`.
- Update if a row exists, incrementing `visit_count` and setting `last_visited_at = NOW()`.

No debounce. Every page render counts as a visit.

**Why**:
- Server-side is reliable (no ad-blocker gap, no client-JS dependency).
- Idempotent on `(user_id, list_id)` so there's exactly one row per pair regardless of visit frequency — no spam in the history UI.
- Skipping debounce keeps the implementation tiny; `visit_count` is mildly inflated by quick re-renders but it's not surfaced.

**Skip conditions** (all must hold to record):
- Viewer is authenticated.
- Viewer is **not** the list owner.
- List visibility allows the viewer to see it (otherwise the page already 404s/redirects before render).

### Decision 6: Bookmarked lists remain in Recently visited

**Choice**: The Recently visited rail and the `/lists/history` page show **all** visited lists, including bookmarked ones. Bookmarked lists are marked with a 🔖 corner indicator on their card.

**Why**: Excluding bookmarked lists from history causes "where did my list go?" confusion — users see it disappear from one place and don't always find it in the other. Showing in both with a visible indicator is the dominant pattern (YouTube, Pocket, browser history) and matches user expectation. Per user feedback.

### Decision 7: Bookmark affordance is a labeled bookmark icon, not a star

**Choice**: The list-page secondary CTA is a button labeled **Bookmark** (with `🔖` / `FaBookmark` icon), toggling to **Bookmarked** when active.

**Why**:
- Star is ambiguous between "rate this" and "pin this."
- Reusing the word "save" causes muscle-memory confusion against the old behavior.
- Bookmark + bookmark icon is the universal "pin for later" convention (Twitter, browsers, Pocket).
- An icon-only star next to a primary Follow button doesn't make the action discoverable on its own; a labeled button does.

**Trade-off**: Two adjacent CTAs (Follow + Bookmark) take more horizontal space than today's single Save button. Acceptable; the row layout has space and the two actions are semantically distinct enough to warrant equal visual weight at the label level.

### Decision 8: Following rail shows users, with a "N new" badge for recency cue

**Choice**: The Following rail on the home page shows **user cards** (avatar + name), not list cards. Each card shows a small "N new" badge counting lists whose `shared_at > users.last_seen_following_at` for the current user.

**Why**: For a family app's volume (users likely follow <10 people, each producing a handful of lists per year), the user-centric view matches the mental model and stays compact. A flat list-feed shape is designed for high-volume social platforms and would look near-empty here.

The "N new" badge gives the recency cue without paying for a separate "What's new?" rail. The badge clears when the user visits `/following`, which updates `users.last_seen_following_at = NOW()`.

**Trade-off**: Adds a per-user column to `users` (`last_seen_following_at timestamp NULL`). One extra column is cheap; alternatives (a separate table, per-edge timestamps) are heavier for the same signal.

### Decision 9: Symmetric Followers UI; remove vs block are distinct

**Choice**:
- **Remove** deletes the `user_follows` row. The removed user can re-follow.
- **Block** deletes any existing `user_follows` rows in both directions AND inserts into `user_blocks`. The blocked user cannot follow again until unblocked.

**Why**: Two distinct severities give users proportionate tools. Remove handles "I changed my mind"; block handles "I don't want this person interacting."

### Decision 9a: Block gates URL access while signed in; signed-out access remains intact

**Choice**: When a blocked viewer is **signed in** and navigates to:
- the blocker's list page → redirect to `/lists` (same response as a deleted list)
- the blocker's profile page → `notFound()` (same response as a non-existent user)

When the blocked viewer is **signed out**, URL access is unchanged. Sign-out is the acknowledged seam — links are public to anyone who has them, and gating sign-out would break the "share by link" model.

The list-page redirect target is centralized in `lib/listAccess.ts`'s `guardListViewable` helper. Both the list-missing and viewer-blocked branches route through that one helper, so future changes to the response shape (e.g. to a dedicated 404 page that unifies deleted + blocked + private) edit one place.

**Why**:
- The original "blocks affect social graph only" stance left a felt gap: blocking someone did nothing while they were poking around your shared lists in the same browser tab they always use. Casual return-visiting was un-discouraged.
- The 404/redirect cover is borrowed from how Instagram and (historically) Facebook handle blocked content: make blocked resources indistinguishable from "doesn't exist." A blocked user sees a familiar end state, not a special "BLOCKED" treatment, so confrontation is muted.
- Parity with existing app idioms keeps the cover honest. Today, a deleted list redirects to `/lists`; a missing user 404s. Blocked = same response per surface = no special tell.
- Sign-out workaround is acknowledged, not solved. Block is **defense in depth, not a security boundary**. If a list truly needs to be hidden from a specific person, the universal recourse is setting it back to private or deleting it.

**Trade-off**: A blocked user who *does* piece together both surfaces ("their profile is gone AND their list is gone") will suspect. The cover holds at each surface individually but isn't airtight in combination. Acceptable — the friction this adds is real, and the alternative ("BLOCKED" text) is worse.

### Decision 9b: Block + connections-page identity polish (full name, follow date, follow disclosure)

**Choice**:
- Sign-in callback (`lib/auth.ts`) captures `${given_name} ${family_name}` when both are present, instead of trimming to first name only.
- Casual surfaces (purchase attribution, etc.) continue to derive first-name via `firstNameOf()` in `lib/dal.ts`. The storage change does **not** alter casual display.
- Connections page rows show the full stored name (helps the owner disambiguate "Josh from college" vs "Josh my cousin") plus a `since` date.
- The Follow button on list pages renders an inline disclosure note when the viewer is not yet following: *"Shares your name and profile picture with the owner."*

**Why**: Two problems on the connections page were entangled:
1. **Owner-side identity verification**: "Is this Josh-my-friend or Josh-some-stranger?" — image alone isn't enough when display name is just a first name.
2. **Follower-side disclosure surprise**: a follower might not realize that following exposes their name/picture to the owner.

The full-name storage solves (1) with no display change to casual surfaces — purchase attribution stays first-name-only via `firstNameOf()`. The inline disclosure under Follow solves (2) without a confirmation modal (modals add friction; this is a one-line note next to the action).

Backfill is lazy: existing users keep their stored first-name-only value until they next sign in. No migration is required, and the connections page is only partially-useful at first (showing first-name-only rows for users who haven't re-authed yet). That partial-usefulness is acceptable for a passive improvement.

**Rejected alternatives**:
- **Follow source** ("followed you via your Birthday 2026 list"): high-signal context, but degrades when the list is deleted. UX would be either "via a deleted list" (clunky) or silently dropping the context (loses signal). Not worth the schema add.
- **Mutual follows** ("also followed by Mom"): strong social proof, but cold-start problem makes it noise until the graph fills out. Easy to add later.
- **User-settable display name / bio**: respects follower agency, but most won't bother setting it. Theoretical benefit, practical ~0% adoption at family scale.
- **Owner-settable private label for each follower**: solves disambiguation permanently, but doesn't help the *first-recognition* moment. Could add later.
- **Email exposure**: rejected. Owners get the disambiguation benefit from name + image + date in this context; email would surprise followers and creates a privacy expectation problem.

**Reverses**: Decision implicitly reverses an earlier choice (in pre-OpenSpec code) to store first-name only. That earlier choice was downstream of a different problem — purchase attribution showing full names felt invasive. That problem is independently solved by `firstNameOf()` at the display layer; throwing away storage was overcorrection. Re-storage doesn't change any display surface that was previously first-name-only.

### Decision 10: Invite URL `/u/[id]?follow=1` for cold-start

**Choice**: A user can be followed via `/u/[id]?follow=1` even if they have zero public lists. The page renders the profile with a prominent follow prompt.

**Why**: Without this, a user is unfollowable until they post their first public list. Mom can pre-share her profile URL with family so the social graph is in place before she ships content. Matches the Substack/YouTube pattern of subscribable-empty channels.

### Decision 11: Collapsible rails persist in localStorage, keyed per-rail

**Choice**: Each rail (`my-lists`, `following`, `bookmarks`, `recently-visited`) reads/writes `home.rail.<name>.open` in `localStorage`. Default: open. No server persistence; no cross-device sync.

**Why**:
- This is a UI nicety, not user-content state. localStorage is the right surface for it.
- Cross-device sync would require a JSON column on `users` or a new prefs table — disproportionate cost.

**Trade-off**: A user on a new browser sees all rails open. Acceptable.

### Decision 12: Fully additive migration, simple down-migration

**Choice**: One Drizzle migration handles:
1. `ALTER TABLE lists ADD COLUMN visibility text NOT NULL DEFAULT 'private'`
2. `ALTER TABLE lists ADD COLUMN shared_at timestamp`
3. `UPDATE lists SET visibility = 'unlisted', shared_at = created_at WHERE shared = true`
4. `CREATE TABLE list_visits (...)`
5. `INSERT INTO list_visits SELECT user_id, list_id, NOW(), 0, NOW() FROM saved_lists`
6. `CREATE TABLE user_follows (...)`
7. `CREATE TABLE user_blocks (...)`
8. `ALTER TABLE users ADD COLUMN last_seen_following_at timestamp`

**No DROP statements.** `lists.shared` (Decision 4b) and `saved_lists` (Decision 4a) are both preserved. The migration is fully additive at the schema level, which means main continues to operate against the same database with zero code changes during the soak.

Down-migration:
- Drop `list_visits`, `user_follows`, `user_blocks`.
- Drop `users.last_seen_following_at`.
- Drop `lists.visibility` and `lists.shared_at`.
- `lists.shared` and `saved_lists` are untouched (they were never modified forward).

**Lossy**: history (non-bookmarked visits), follows, blocks, and any bookmarks made during the soak are destroyed on down. Post-rollback the app reads from `saved_lists` and `lists.shared` again — both still hold their pre-migration plus main-side-soak data. Documented in the migration file.

**Why**: Fully additive forward migrations are the safest schema change pattern. Main keeps working untouched. Dev gets the new columns and tables. Drops are intentionally pushed to a follow-up change that runs after main has migrated to the new code.

## Risks / Trade-offs

- **Risk**: Migration runs against production data and an edge case (`shared = NULL` rows? duplicate `saved_lists` rows?) corrupts state.
  **Mitigation**: Pre-flight assertion query in the migration: count rows, verify no NULL `shared`, no duplicate `(user_id, list_id)` in `saved_lists`. Abort migration on failure. Test against a copy of prod data before applying.

- **Risk**: A user who has many follows on a high-activity period sees a noisy "N new" badge they can't dismiss without visiting `/following`.
  **Mitigation**: The badge clears when they visit `/following` (which is the natural destination from clicking the badge). Acceptable.

- **Risk**: Visit recording on every render inflates `visit_count` artificially when a user opens multiple tabs / refreshes.
  **Mitigation**: `visit_count` is internal and not surfaced. If we later surface it, add a 5-minute debounce.

- **Risk**: Removing the existing `SavedLists` rail without warning surprises users who used the save flow heavily.
  **Mitigation**: Saves are copied to bookmarks (capability `visit-history`). The Bookmarks rail on the home page contains exactly what was in Saved Lists. A one-time toast on first home-page render after deploy explains the change: "Saved lists are now Bookmarks. Find them in the new Bookmarks section." Toast dismissal stored in `localStorage` (`home.bookmark-migration-toast.dismissed`).

- **Risk**: Deferred-drop leaves `saved_lists` and `lists.shared` indefinitely if the follow-up change is forgotten.
  **Mitigation**: The follow-up is named (`archive-legacy-share`) and called out in the migration plan and the proposal's Impact section. Keeping the Drizzle definitions in `db/schema.ts` (rather than removing them now) makes the dormant artifacts visible to anyone reading the schema, so they cannot be silently abandoned. If desired, the follow-up change can be pre-staged as an empty proposal directory now and filled in after soak.

- **Risk**: Drift during soak — a list shared/unshared via main is not reflected in dev's `visibility` column. Could cause user confusion if the same user toggles state from main, then views from dev.
  **Mitigation**: Bounded by the soak window. Each user fully migrates the next time they hit the visibility picker via dev's UI (`setListVisibility` rewrites both columns). Owners who use only one branch see consistent state always. Cross-branch usage by the same owner is the edge case; acceptable for a transitional period. Surface this in a release note for anyone testing across branches.

- **Risk**: An owner's profile URL is shareable but exposes their list of public lists to anyone with the URL. This is already the case (public lists are URL-public today), but the profile aggregates them.
  **Mitigation**: Acceptable — `'public'` lists are opted-in to broadcast by definition. Owners who want unlisted-only visibility leave their lists as `'unlisted'`; their profile will then show "no public lists."

- **Risk**: Migration sets `last_visited_at = NOW()` for every saved-list-promoted-to-bookmark, causing a one-time pile-up at the top of every user's history.
  **Mitigation**: Acceptable — at deploy time the migrated bookmarks legitimately are "the things you most recently expressed interest in." Users can clear or page past.

- **Risk**: Follow/block actions could be exploited to enumerate user existence by trying `/u/[id]` URLs.
  **Mitigation**: `/u/[id]` renders a 404 for users that don't exist; `/u/[id]?follow=1` does the same. No information leak beyond the existing user-id-in-URL model.

## Migration Plan

- Single PR. Single Drizzle migration. No feature flag.
- Pre-deploy:
  1. Run migration's pre-flight assertions against a prod snapshot in a staging environment.
  2. Verify row counts: `saved_lists.count == list_visits WHERE favorited_at IS NOT NULL.count` post-migration.
- Deploy steps:
  1. Apply schema migration (copies `saved_lists` → `list_visits` bookmarks; does NOT drop `saved_lists`).
  2. Deploy code (stops reading/writing `saved_lists`).
  3. Smoke test: home page renders, all four rails populate, visiting a list increments history, follow/unfollow works, sharing UI shows three states.
- Soak: leave `saved_lists` and `lists.shared` dormant in production for an agreed period (suggested: ≥2 weeks of normal usage, or until next release-branch cut, whichever is later). Monitor `list_visits` row growth and bookmark/unbookmark error rates. Main can keep deploying off its own branch unchanged during this window.
- Drift watch: during the soak, lists whose share state is changed via main's `shareList` will have stale `visibility` in dev's view. Acceptable; closes when main moves to the new code.
- Follow-up: a separate change (working name `archive-legacy-share`) drops the `saved_lists` table, drops `lists.shared`, and removes their Drizzle definitions. Out of scope for this change. Should land **after** main has been updated to read/write `visibility` (i.e. after dev's code has been merged into main and any independent main deploys have stopped).
- Rollback during soak: revert PR + run down-migration. `saved_lists` and `lists.shared` are still there with their soak-window data; main keeps working as if nothing happened. Bookmarks made during the soak are lost (no propagation back to `saved_lists`); pre-migration saves and any main-side saves made during the soak are intact. Documented as lossy on the new-data axis only.

## Open Questions

None currently — all shape questions resolved in exploration with the user (see proposal.md). Implementation may surface UI-layer details (exact button placement on small mobile, copy nuances) to settle during tasks.
