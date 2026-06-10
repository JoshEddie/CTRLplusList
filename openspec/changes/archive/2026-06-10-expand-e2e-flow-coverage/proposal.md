# Proposal: expand-e2e-flow-coverage

Tracking issue: [#125](https://github.com/JoshEddie/CTRLplusList/issues/125)

## Why

The Playwright suite pins the product's core spine (view → create list → populate → share → claim) but everything *managerial* is invisible to it: no spec ever creates an item, edits or deletes anything, follows anyone, or bookmarks a list. Measured against the post-#116 data layer, roughly 30 of 52 `lib/data/` exports have zero browser exercise, including 4 of the 6 `*.actions.ts` modules in whole or part. E2E is the only layer that exercises two failure classes nothing else can: the real `'use cache'` / `updateTag` write→revalidate→fresh-read loop (vitest mocks `next/cache` wholesale), and the `'use server'` boundary invoked from real client bundles in a production build. The gap became concrete verifying #116: the e2e suite was the only test layer that refactor didn't edit — the only independent oracle — and for these pipelines it had nothing to say. A runtime-only breakage there passes build, vitest, and Playwright all green.

Inherited constraints (active specs):

- `testing-foundation` — e2e specs live under `e2e/` (spec.md §placement); Playwright test names follow `<PageOrFlow>_<Action>_<ExpectedOutcome>`; tests assert observable behavior, not execution; the seed is a versioned fixture — seed edits are breaking changes to this suite; the rolled-in e2e execution model (`USE_PG_DRIVER` bypass, production build, two server processes, canonical seed) is the foundation's contract and is not redefined here.
- `e2e-critical-flows` — the existing required-flow list and its assertion bar ("rendered content, persisted state reflected on reload, or navigation — NOT mere execution"); the cross-process freshness rule (assert only own-server or seeded state).
- The flows being pinned are behaviorally owned by `following` (follow button in the byline sub-row, first-follow disclosure dialog), `visit-history` (bookmark sets `list_visits.favorited_at`, unbookmark preserves the visit row), `home-digest` (four rails: My Lists, Following, Bookmarks, Recently visited), and `list-item-management` (choose-items diff contract). The new e2e specs assert against those affordances as specified — they pin existing contracts, they do not change them.

## What Changes

- **New e2e flow spec: item CRUD** (`item-crud.auth.spec.ts`) — create an item through the New Item modal, assert it renders in the library, edit it, assert the change, archive it, delete it, assert it's gone. Covers `item.actions.ts` end-to-end plus `item.associations.ts`, and closes the library half of the `items` cache-tag loop.
- **New e2e flow spec: social graph** (`follow.auth.spec.ts`) — as the seeded viewer, follow a seeded not-yet-followed user, assert the Following page reflects it, unfollow, assert removal; block/unblock a no-relationship seeded user via `/settings/connections`. Covers `user.actions.ts` (minus sign-in/out) and pins the `user_follows` and `user_blocks` tag loops.
- **New e2e flow spec: bookmark & visit history** (`bookmark-history.auth.spec.ts`) — bookmark a seeded non-bookmarked list, assert it appears on `/lists/bookmarks` and the home Bookmarks rail, unbookmark, assert removal; assert a visited list surfaces on `/lists/history`. Covers `visit.actions.ts` bookmark paths and pins the `list_visits` tag loop.
- **New e2e spec: home rail content** (`home-rails.auth.spec.ts`) — one minimal content assertion per home rail. Each rail sits in its own `<Suspense>`, so today a crashed rail read still passes the home-page spec; this pins the four rail reads (`getListsByUser`, `getFollowingFeedUsers`, `getBookmarkedListsByUser`, `getVisitHistoryByUser`).
- **Hardening: list-lifecycle** — `list-lifecycle.auth.spec.ts` asserts URL + heading after "Add 1 item to list" but never that the added item renders on the list page; a silent no-op in `setListItems` currently passes. One assertion closes it.
- **State discipline** — mutating flows end at seed-equivalent state (follow→unfollow, bookmark→unbookmark, create→delete) so seed-as-fixture assertions in other specs stay valid within a run.
- Pure test addition — no production source changes beyond what spec-writing legitimately surfaces.

## Capabilities

### New Capabilities

- `e2e-management-flows`: e2e coverage of the managerial flows — item CRUD, social-graph (follow/unfollow/block/unblock), bookmark & visit history, and per-rail home content signal. Sibling of `e2e-critical-flows` and `e2e-pwa-offline` (same precedent: a flow-suite capability running under the `testing-foundation` harness, not a redefinition of it).

### Modified Capabilities

- `e2e-critical-flows`: the owner-lifecycle arc's add-items step is strengthened — the scenario SHALL require asserting the added item renders on the list page, not just URL + heading (closes the silent-no-op gap in `setListItems` coverage).

## Impact

- **Files added**: `e2e/item-crud.auth.spec.ts`, `e2e/follow.auth.spec.ts`, `e2e/bookmark-history.auth.spec.ts`, `e2e/home-rails.auth.spec.ts`; possibly small additions to `test/helpers/e2e/utils`.
- **Files modified**: `e2e/list-lifecycle.auth.spec.ts` (one assertion).
- **Cache-tag loops gaining real (unmocked) exercise**: `items` (library side), `user_follows`, `user_blocks`, `list_visits`.
- **Seed coupling**: the social and bookmark flows assert against seeded entities (`dev-test-viewer`'s friend graph and friend lists). No seed changes expected — flows select seed targets that already exist (a not-followed user, a non-bookmarked viewable list); any future seeded-entity rename must come with a review of these specs, same contract the claim specs already carry.
- **All flows are single-server** (`authenticated` project), so the cross-process freshness rule is naturally satisfied.
- **Out of scope**: the endpoint-exposure class (a read accidentally exported from a `*.actions.ts` module becoming a callable POST endpoint) is structurally untestable by e2e — lint-guard territory, separate issue if pursued.
