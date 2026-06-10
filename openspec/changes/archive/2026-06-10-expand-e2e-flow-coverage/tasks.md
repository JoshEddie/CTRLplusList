# Tasks: expand-e2e-flow-coverage

## 1. Harden existing specs

- [x] 1.1 In `e2e/list-lifecycle.auth.spec.ts`, capture the checked item's name on the choose-items step and, after the existing URL + heading assertions, assert that name renders on the list page (closes the `setListItems` silent-no-op gap; satisfies the MODIFIED `e2e-critical-flows` scenario)
- [x] 1.2 Run `list-lifecycle.auth.spec.ts` in isolation against the local DB (`npx playwright test list-lifecycle.auth.spec.ts`) and confirm it passes

## 2. Item CRUD flow (`e2e/item-crud.auth.spec.ts`)

- [x] 2.1 Create spec: from `/items`, open the "New Item" modal, fill a per-run-unique name, a description, and one store price (exercises `item.associations.ts`), submit "Create Item", and assert the item card renders in the Active tab
- [x] 2.2 Edit step: open the item's Edit affordance (`/items/[id]`), rename to a second per-run-unique name, submit "Update Item", and assert the renamed card renders in the library
- [x] 2.3 Archive step: use the "Archive item" affordance and assert the item leaves the Active tab and appears under the Archived tab (`?tab=archived`)
- [x] 2.4 Delete step: from the archived item, trigger Delete, accept the "Delete this item permanently?" confirmation, and assert the item is gone from both tabs (flow ends at zero residue)
- [x] 2.5 Run the spec in isolation and confirm it passes twice in a row without a DB reset (proves per-run-unique naming + zero residue)

## 3. Social-graph flow (`e2e/follow.auth.spec.ts`)

- [x] 3.1 Follow/unfollow test: navigate to `/user/dev-friend-dave`, click Follow, assert the affordance flips to "Following" and Dave Example appears on `/following`; click again to unfollow and assert removal (ends at seed baseline; no disclosure dialog — viewer has 6 seeded follows)
- [x] 3.2 Remove-follower test: on `/settings/connections`, "Remove" `dev-friend-carol` from the Followers section and assert her row disappears
- [x] 3.3 Block/unblock test: on `/settings/connections`, "Block" `dev-friend-iris` from her Followers row; assert she appears in the Blocked section and leaves Followers; "Unblock" and assert she leaves Blocked and remains out of Followers
- [x] 3.4 Document the contained residue in the spec-file header comment: after this spec, carol and iris are no longer followers of the viewer for the remainder of the run (one-way edges nothing else asserts; restored by `db:reset:dev`)
- [x] 3.5 Run the spec in isolation and confirm it passes; confirm `follow.auth.spec.ts` + `home-rails.auth.spec.ts` pass together in one run (rail assertions are unaffected by the residue)

## 4. Bookmark & visit-history flow (`e2e/bookmark-history.auth.spec.ts`)

- [x] 4.1 Bookmark test: open `/lists/dev-list-alice-baby` ("Baby On The Way" — seeded visited-not-bookmarked, owner followed), click "Bookmark list", assert the affordance flips to "Remove bookmark", and assert the list appears on `/lists/bookmarks` and within the home Bookmarks rail region
- [x] 4.2 Unbookmark: click "Remove bookmark" and assert the list no longer appears on `/lists/bookmarks`
- [x] 4.3 Visit-history test: after opening the list, assert `/lists/history` shows it as the most recent entry (the seeded visit is a day old, so recency proves the in-run `after()` write; rely on auto-retrying `expect`, add a single reload fallback only if flake appears)
- [x] 4.4 Confirm the spec never navigates to Kim's list (preserves the zero-`list_visits` seed invariant) and note the benign residue (bumped `last_visited_at`) in the spec-file header
- [x] 4.5 Run the spec in isolation and confirm it passes twice in a row without a DB reset

## 5. Home-rail signal (`e2e/home-rails.auth.spec.ts`)

- [x] 5.1 Create spec: load `/` as the seeded viewer and, for each rail (My Lists, Following, Bookmarks, Recently visited), scope to the rail's region and assert it contains at least one rendered card and not the rail's empty-state text — no name- or order-dependent assertions
- [x] 5.2 Run the spec in isolation and confirm it passes; then run the full `authenticated` project and confirm it still passes after the other specs' writes

## 6. Review pass

- [x] 6.1 Assertion audit: for each new test, record in one sentence (PR description or review notes) the observable behavior it locks in; rewrite any test that only proves execution
- [x] 6.2 Verify all test names follow `<PageOrFlow>_<Action>_<ExpectedOutcome>` and read accurately against what each test asserts
- [x] 6.3 Verify no new spec asserts another spec's leftover state and all selectors drive affordances by role/accessible name per existing convention
- [x] 6.4 Confirm no production source changed; if spec-writing surfaced a real defect, file it (or fix it in a separate commit with its own rationale) rather than absorbing silent scope

## 7. Pre-merge

- [x] 7.1 `npm run lint` — zero errors, zero warnings
- [x] 7.2 `npx tsc --noEmit` — zero errors
- [x] 7.3 `npm run build` — completes successfully
- [x] 7.4 `npm run test:coverage` — zero failing tests, coverage reported
- [x] 7.5 `npm run test:e2e` — zero failing tests (full two-project run from a fresh `db:reset:dev`)
