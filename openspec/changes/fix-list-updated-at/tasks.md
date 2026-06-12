## 1. Touch helper

- [x] 1.1 Create the internal `touchLists(listIds: string[])` helper in a non-`'use server'` data-layer module (per design D1; single `UPDATE lists SET updated_at WHERE id IN (...)`, no-op on empty array)
- [x] 1.2 Unit tests: bumps exactly the given ids, leaves others untouched, empty array issues no query

## 2. Detail edits (`updateList`)

- [x] 2.1 Widen the ownership-check fetch in `lib/data/list.actions.ts` to select `name, subtitle, occasion, date`
- [x] 2.2 Add the dirty comparison (value equality for `date` via `getTime()`; normalized `subtitle`; omitted fields treated as unchanged) — when clean, return success with no `UPDATE`
- [x] 2.3 When dirty, include `updated_at: new Date()` in the write
- [x] 2.4 Unit tests: no-op payload issues no write and returns success; same-instant `Date` is clean; changed field bumps `updated_at`; partial payload compares only supplied fields

## 3. Membership changes

- [x] 3.1 `setListItems` (`lib/data/listItems.actions.ts`): call `touchLists([list_id])` after a non-empty diff (existing "No changes" early return untouched)
- [x] 3.2 `updateItemLists` (`lib/data/item.associations.ts`): touch only the lists actually gaining or losing the item (inserted set + `listIdsToDelete`)
- [x] 3.3 `deleteItem` (`lib/data/item.actions.ts`): capture the item's `list_items` memberships before the delete, then touch those lists after the delete succeeds
- [x] 3.4 Add `updateTag('lists')` to `updateItemLists`-driven paths and `deleteItem` (design D5)
- [x] 3.5 Confirm no bump is added to `updatePriority`, `updateItem`, `archiveItem`, `setListVisibility` (exclusions per spec)
- [x] 3.6 Unit tests: each membership path bumps the right lists and only those; reorder/rebalance, item field edit, archive, visibility, and purchase paths leave `updated_at` unchanged

## 4. Client pristine check (`ListForm`)

- [x] 4.1 Snapshot serialized field values at form open (edit mode only); on submit, compare and skip `updateList` when pristine, proceeding through the success path (modal close/refresh or page navigation)
- [x] 4.2 Component tests: pristine submit does not invoke `updateList` and still closes/navigates; dirty submit invokes it as before; create mode unaffected

## 5. Pre-merge

- [x] 5.1 `npm run lint` — zero errors, zero warnings (2 pre-existing yellow file-size advisories on untouched files, the tolerated class)
- [x] 5.2 `npx tsc --noEmit` — zero errors
- [x] 5.3 `npm run build` — completes successfully
- [x] 5.4 `npm run test:coverage` — zero failing tests (2267 passed), coverage reported
- [x] 5.5 `npm run test:e2e` — zero failing tests (33 passed; one unrelated claim-attribution timeout on the first run did not reproduce in isolation or on the full re-run)
