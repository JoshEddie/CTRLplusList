# Design: expand-e2e-flow-coverage

## Context

The e2e harness (testing-foundation) runs a production build behind `next start` against local Docker Postgres with the `USE_PG_DRIVER=1` auth bypass; flow suites (`e2e-critical-flows`, `e2e-pwa-offline`) layer on top of it. All four new spec files run in the `authenticated` project (seeded `dev-test-viewer` session, port 3100), so every write and assertion happens on one server — the cross-process freshness rule is satisfied by construction.

Two repo facts shape everything below:

- **The seed is a versioned fixture** (testing-foundation): specs assert against `scripts/seed-dev-users.ts` entities, and seed edits are breaking changes to the suite. This change adds **no seed edits** — every flow either builds its own state or selects a seed target that already has the needed shape.
- **`db:reset:dev` runs once per `test:e2e` invocation**, not between spec files, and Playwright runs files alphabetically with `workers: 1`. Any state a spec leaves behind is visible to later files in the same run (and to fast-iteration `npx playwright test` runs that skip the reset). State discipline is therefore a first-class design concern, not a footnote.

Verified mechanics the flows depend on:

- `blockUser` severs follow edges **in both directions** before inserting the block row ([user.actions.ts:123](lib/data/user.actions.ts)), and the Block affordance renders **only on Followers rows** at `/settings/connections` ([FollowersSection.tsx](app/(main)/settings/connections/FollowersSection.tsx)) — so a block target is always a follower, and unblocking does not restore the severed edge.
- The first-follow disclosure dialog fires only when the viewer has **zero** follows (`requireDisclosure={!hasAnyFollows}`, [FollowContainer.tsx:30](app/(main)/users/ui/components/FollowContainer.tsx)). The seeded viewer follows 6 users, so the dialog never appears in these flows.
- The items library has **Active / Archived tabs** (`?tab=archived`, [ItemsPage.tsx](app/(main)/items/ui/components/ItemsPage.tsx)); archiving moves an item between tabs — a clean observable for the archive step. Edit is reached via the card's Edit affordance → `/items/[id]`.
- Visits are recorded by an `after()` callback in the list hero ([ListHeroSection.tsx](app/(main)/lists/[id]/ListHeroSection.tsx)) — the write lands after the response streams, so history assertions must tolerate a beat of latency.
- Seeded visit/bookmark shape: every friend list except Kim's has a visit row (`daysAgo = idx`), alternating bookmarked/not (`idx % 2 === 0` bookmarked). Kim must keep **zero** `list_visits` rows (testing-foundation spike-audit invariant).

## Goals / Non-Goals

**Goals:**

- Give the managerial pipelines (item CRUD, social graph, bookmark/visit) real browser exercise through `'use server'` boundaries in a production build.
- Pin the four cache-tag write→revalidate→fresh-read loops vitest can only mock: `items` (library side), `user_follows`, `user_blocks`, `list_visits`.
- Pin the four home-rail reads that `<Suspense>` currently lets crash silently.
- Close the `setListItems` silent-no-op gap in `list-lifecycle.auth.spec.ts`.

**Non-Goals:**

- No production source changes (beyond what spec-writing legitimately surfaces as a real defect).
- No seed changes; no new fixture script.
- No guest-project specs — every new flow is owner/viewer-side and authenticated.
- No coverage of `clearVisitHistory` / `removeVisit` (see Decision 5) or `signInUser`/`signOutUser` (OAuth is out of e2e bounds per testing-foundation).
- Not the endpoint-exposure lint guard (separate issue per the proposal).

## Decisions

### 1. New sibling capability `e2e-management-flows`, not a bigger `e2e-critical-flows`

`e2e-pwa-offline` set the precedent: a flow-suite capability that runs **under** the foundation harness and does not redefine it. Mirroring that keeps `e2e-critical-flows` meaning what its name says — the product spine — instead of becoming a grab-bag list every new flow appends to. The only `e2e-critical-flows` delta is a MODIFIED requirement strengthening the existing add-items scenario (Decision 6), which genuinely belongs to that capability because the flow it hardens lives there.

*Rejected:* appending the three flows to the `e2e-critical-flows` required-flow list — blurs the capability's identity and makes its "dropping a flow fails the suite" clause cover flows of a different criticality class.

### 2. Four spec files, one flow each, all in the `authenticated` project

`item-crud.auth.spec.ts`, `follow.auth.spec.ts`, `bookmark-history.auth.spec.ts`, `home-rails.auth.spec.ts` — mirrors the existing one-flow-per-file convention (`list-lifecycle`, `signed-in-claim`, `owner-spoiler`). Test names follow `<PageOrFlow>_<Action>_<ExpectedOutcome>`; selectors drive real affordances by role/accessible name (the exact strings exist today: "New Item", "Create Item", "Update Item", "Archive item", "Delete this item?", "Follow {name}"/"Following", "Bookmark list"/"Remove bookmark", Connections rows' "Remove"/"Block"/"Unblock"). Desktop viewport affordances are used throughout (e.g. the `Archive item` icon button, not the mobile kebab).

### 3. Per-flow state strategy: build-own-state where possible, seed-targets chosen for restorability

Each flow ends at seed-equivalent state **unless structurally impossible**, in which case the residue is chosen to be invisible to every other spec and is documented in the spec file header:

- **Item CRUD — build-own-state, zero residue.** Create a per-run-unique item from `/items` ("New Item" modal) with a description and one store price (so the `item.associations.ts` sync paths execute), assert it renders in the Active tab → edit via the card's Edit affordance → `/items/[id]`, rename to a second per-run-unique name, "Update Item", assert the rename → "Archive item", assert it leaves Active and appears under the Archived tab → delete from the archived state, accept the "Delete this item permanently?" confirm, assert it is gone from both tabs. The arc ends with the item deleted — nothing to restore.
- **Follow/unfollow — `dev-friend-dave`, zero residue.** Dave has no follow edge with the viewer in either direction (seed comment marks dave/jack as the not-followed friends). Navigate to `/user/dev-friend-dave`, Follow, assert the button flips to "Following" and Dave appears on `/following`; Unfollow, assert removal. Ends at baseline. No disclosure dialog (viewer has 6 seeded follows — see Context).
- **Remove follower — `dev-friend-carol`, documented residue.** Carol follows the viewer one-way. From `/settings/connections` Followers section, "Remove" carol, assert the row disappears. The edge cannot be recreated from the viewer's UI (carol is the actor), so carol stays a non-follower for the rest of the run. Contained: no other spec (existing or new) asserts followers membership or counts — the home Following rail shows followees, not followers.
- **Block/unblock — `dev-friend-iris`, documented residue.** Iris follows the viewer one-way; Block (only reachable on her Followers row) severs that edge and adds the block; assert she appears in the Blocked section and leaves Followers; Unblock, assert she leaves Blocked — and stays out of Followers, which is itself the correct severance semantics worth asserting. Residue identical in kind to carol's, equally contained.
- **Bookmark/visit — `dev-list-alice-baby` ("Baby On The Way"), benign residue.** Alice is followed (list viewable), and at filtered-template index 1 the list is seeded **visited but not bookmarked**. Open it (bumps `last_visited_at` via `after()`), Bookmark, assert "Remove bookmark" state, presence on `/lists/bookmarks`, and presence on the home Bookmarks rail (a fresh `favorited_at` guarantees a top-5 slot); Unbookmark, assert removal from `/lists/bookmarks`. The visit bump also makes it the most-recent entry on `/lists/history` — that recency assertion is what proves the **new** visit write, since the seeded visit is a day old. Residue: a bumped `last_visited_at` — invisible to all other assertions. The spec must **not** touch Kim's list (zero-visits invariant).

*Rejected:* unfollow-then-refollow on an already-followed user (alice) — a mid-flow failure strands the seed in a drifted state that other specs (signed-in-claim's viewability of alice's list, home Following rail) actually depend on. Acting on no-edge/one-way-edge users bounds the blast radius to zero or to edges nothing else reads.

### 4. Home-rail assertions are region-scoped and order-independent

`home-rails.auth.spec.ts` scopes each assertion to its rail region (the rail's heading + its card row) and asserts the region contains at least one rendered card and not the rail's empty-state text. This pins exactly the failure class in scope — a rail read that crashes or silently returns nothing inside its own `<Suspense>` — without coupling to rail ordering, the 5-item cap, or names that earlier specs' writes can displace (lifecycle-created lists occupy My Lists top slots on fast-iteration reruns; the Following rail shows 5 of 6 followees by recency, so no single name is guaranteed).

*Rejected:* asserting specific seeded names per rail — stronger on paper, but it silently couples four assertions to seed ordering, the 5-cap, and alphabetical spec-file order; the goal here is crash/empty signal for `getListsByUser`, `getFollowingFeedUsers`, `getBookmarkedListsByUser`, `getVisitHistoryByUser`, not content ranking (that's vitest's job at the read layer).

### 5. `clearVisitHistory` and `removeVisit` stay uncovered, deliberately

Both are destructive to the seed fixture in ways no later spec can tolerate: clear-history wipes all 16 seeded visit rows (emptying the Recently Visited rail and `/lists/history` for the rest of the run); remove-visit deletes a seeded row that cannot be re-created without re-seeding. The `list_visits` tag loop — the thing only e2e can prove — is already pinned by bookmark/unbookmark/visit. Documented here so the gap reads as a decision, not an oversight; if coverage is ever wanted, it needs a build-own-state visit (a list created in-spec) rather than a seed target, and can ride any future change that adds one.

### 6. The `list-lifecycle` hardening asserts the chosen item's name on the list page

The choose-items step already knows which item it checked; capture that row's item name before saving, then — after the existing URL + heading assertions — assert that name renders on the list page. This is the minimal assertion that makes a silent no-op in `setListItems` fail, and it slots into the existing spec without restructuring it.

## Risks / Trade-offs

- **[Seed residue from Remove/Block]** carol and iris lose their follower edge for the remainder of a run → bounded by target choice (one-way followers nothing else asserts), restored by the per-run `db:reset:dev`, and called out in the spec-file header comment so a future spec author knows the Followers section is post-`follow.auth.spec` state.
- **[`after()` visit-write latency]** the history assertion races the post-response write → navigate to `/lists/history` only after the list page settles and rely on Playwright's auto-retrying `expect` (plus a single `page.reload()` fallback if flake appears in practice).
- **[Alphabetical file-order coupling]** `bookmark-history` and `follow` run before `home-rails` and `signed-in-claim` → every spec asserts only its own writes or seed state that the earlier specs are designed to restore (Decision 3); rail assertions are order-independent (Decision 4). No spec may assert another spec's leftovers.
- **[Affordance-string coupling]** the specs bind to accessible names owned by `following`, `visit-history`, `list-item-management`, `home-digest` surfaces → that is the point (e2e pins those contracts), and renames already carry a review-the-specs obligation under the seed-as-fixture/affordance conventions; the strings used were verified against current source, not guessed.
- **[Disclosure-dialog assumption]** if a future seed change zeroed the viewer's follows, the first-follow dialog would appear and `follow.auth.spec.ts` would fail → acceptable: that seed change is already a breaking change to the suite by contract, and the failure is loud and proximate.

## Open Questions

None blocking. Implementation may surface real production defects (that is the purpose); if one appears, fix-or-file is decided at apply time per the issue's "no production changes beyond what spec-writing legitimately surfaces".
