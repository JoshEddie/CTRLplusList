## 1. Server action

- [x] 1.1 Add `removeListItem(list_id, item_id)` to `lib/data/listItems.actions.ts`: verify session user owns the list (same auth shape as `setListItems`), single DELETE of the matching `list_items` row, `updateTag('items')` + `updateTag('lists')`, failure `ActionResponse` on unauthenticated/unauthorized/missing-row inputs
- [x] 1.2 Unit tests for `removeListItem`: owner success (row deleted, tags bumped), non-owner rejected with no delete, unauthenticated rejected

## 2. Thread list context

- [x] 2.1 Add optional `listId` prop to `Item.tsx` and pass through to `OwnerActions`
- [x] 2.2 Pass `listId` from the owned-list page surfaces that render `Item` (list view and sortable owner edit view); confirm items library and archived view pass nothing

## 3. Universal kebab menu

- [x] 3.1 In `OwnerActions.tsx`, remove the `.item-owner-actions` inline block and `EditItemButton` usage; the kebab block becomes the sole render path at all viewports
- [x] 3.2 Delete `EditItemButton.tsx` (or absorb anything still needed) and remove dead imports
- [x] 3.3 Add "Remove from list" `tone="danger"` `<MenuItem>` (after Edit and Archive), rendered only when `listId` is present; wire to ConfirmDialog
- [x] 3.4 Add `ConfirmDialog` for removal — copy states the item is removed from this list only and stays in the library; on confirm call `removeListItem`, toast, refresh; Cancel/Escape/outside-click leaves state untouched
- [x] 3.5 Update `app/(main)/items/ui/styles/item.css`: drop the ≥400px/<400px owner-actions media-query split (~1291–1308), remove `.item-owner-actions` rules, decide grid-view treatment for the kebab (hover-reveal vs always visible) and re-point the opacity rules (~245–247)
- [x] 3.6 Verify preview suppression still holds via `.preview .item-owner-actions-mobile { display: none; }` (choose-items picker rows show no kebab); retire the now-dead `.preview .item-owner-actions` rule

## 4. Tests and sweep

- [x] 4.1 Component tests: kebab renders at all viewports with Edit / Archive / Remove ordering; Remove absent without `listId`, in archived view, and on preview rows
- [x] 4.2 Component test: confirm flow calls `removeListItem` and cancel does not
- [x] 4.3 Sweep unit/component/e2e suites for selectors or flows using the desktop edit pencil or `.item-owner-actions` and update them to the kebab path
- [x] 4.4 e2e: owner removes an item from a list via kebab → confirm → item gone from list, still present in `/items`

## 5. Pre-merge

- [x] 5.1 `npm run lint` — zero errors, zero warnings
- [x] 5.2 `npx tsc --noEmit` — zero errors
- [x] 5.3 `npm run build` — completes successfully
- [x] 5.4 `npm run test:coverage` — zero failing tests, coverage reported
- [x] 5.5 `npm run test:e2e` — zero failing tests
