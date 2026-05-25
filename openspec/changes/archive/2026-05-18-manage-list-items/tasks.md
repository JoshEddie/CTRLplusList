## 1. Server action

- [x] 1.1 In [app/actions/lists.ts](app/actions/lists.ts), add `setListItems(list_id: string, item_ids: string[]): Promise<ActionResponse>`. Reuse the auth + ownership pattern from `addItemsToList` (lines 304–331).
- [x] 1.2 Validate `item_ids` with `z.array(z.string().min(1))` (allow empty array — represents "remove everything").
- [x] 1.3 Query current `list_items` for this list; compute `toRemove = existing − incoming` and `toInsert = incoming − existing`.
- [x] 1.4 If `toRemove.length > 0`: `db.delete(list_items).where(and(eq(list_id, …), inArray(item_id, toRemove)))`.
- [x] 1.5 If `toInsert.length > 0`: recompute `basePosition = COALESCE(MAX(position) + 65536, 65536)` _after_ deletion, then insert each item at `basePosition + i * 65536`.
- [x] 1.6 Call `updateTag('items')` and `updateTag('lists')` on success.
- [x] 1.7 Return `{ success: true, message: "Added N, removed M" }` (or specialized message when N or M is 0; "No changes" when both are 0).

## 2. Route + page

- [x] 2.1 Create folder `app/(main)/lists/[id]/choose-items/`.
- [x] 2.2 Add `page.tsx` with auth, ownership redirect, and a redirect-to-`/lists/[id]` for non-owners.
- [x] 2.3 Fetch `getItemsByUser(user.id, { filter: 'all' })` and `db.select({ item_id }).from(list_items).where(eq(list_id, id))`.
- [x] 2.4 In the page, derive `displayItems = items.filter(i => !i.archived_at || currentListItemIds.has(i.id))` and `initialSelectedIds = Array.from(currentListItemIds)`.
- [x] 2.5 Read `?new=1` from searchParams and pass `isNew` to the form.
- [x] 2.6 Render `<ChooseItemsForm list_id list_name items initialSelectedIds isNew />`.
- [x] 2.7 Set `export const metadata = { title: 'Choose items' }`.

## 3. Client form

- [x] 3.1 Create `app/(main)/lists/[id]/choose-items/ChooseItemsForm.tsx`.
- [x] 3.2 Initialize `selected` state from `initialSelectedIds` (not empty).
- [x] 3.3 Compute `hasChanges` by comparing `selected` to `initialSelectedIds`; disable Save when false.
- [x] 3.4 Header: `Choose items for "<list_name>"`.
- [x] 3.5 Submit calls `setListItems(list_id, Array.from(selected))`; on success `router.push(`/lists/${list_id}`)` + `router.refresh()`.
- [x] 3.6 Save button label: `Save changes` (no count). Disabled when `!hasChanges` or submitting.
- [x] 3.7 Render an "archived" badge next to the item name when `item.archived_at` is set.
- [x] 3.8 Secondary action reads "Skip for now" when `isNew` is true; otherwise "Back to list".

## 4. Inbound link updates

- [x] 4.1 [app/(main)/lists/ui/components/ListDetails.tsx](<app/(main)/lists/ui/components/ListDetails.tsx>): change href to `/choose-items`, label to `Choose items`, swap `FaPlus` for `MdChecklist`.
- [x] 4.2 [app/(main)/lists/ui/components/ListActionsMenu.tsx](<app/(main)/lists/ui/components/ListActionsMenu.tsx>): same href + label + icon change.
- [x] 4.3 [app/(main)/lists/ui/components/ListForm.tsx](<app/(main)/lists/ui/components/ListForm.tsx>): change post-create redirect target to `/choose-items?new=1`.
- [x] 4.4 [app/(main)/items/ui/components/SortItems.tsx](<app/(main)/items/ui/components/SortItems.tsx>): update `EmptyListCTA` href to `/choose-items`; label "Choose items"; icon `MdChecklist`.

## 5. CSS

- [x] 5.1 Rename `add-items-*` classes to `choose-items-*` in `app/(main)/lists/ui/styles/list.css`.
- [x] 5.2 Add a `.choose-items-archived-badge` rule (small muted pill next to item name).

## 6. Cleanup

- [x] 6.1 Delete `app/(main)/lists/[id]/add-items/` folder.
- [x] 6.2 Delete `addItemsToList` from `app/actions/lists.ts`. Verify no remaining callers.
- [x] 6.3 Run `pnpm tsc --noEmit` and `pnpm lint`; fix any breakage. (tsc clean; lint has only pre-existing errors in `PriceFilterPopover`, `StoreFilterPopover`, `StoreLinks` — unrelated to this change.)

## 7. Verification

- [ ] 7.1 Manual: open an owned list, click **Choose items** (desktop) and mobile kebab; both land on `/lists/[id]/choose-items`.
- [ ] 7.2 Manual: confirm items already on the list are pre-checked.
- [ ] 7.3 Manual: uncheck 2 and check 3 new → Save changes; toast reads "Added 3, removed 2"; list page reflects the change; new rows are at the bottom.
- [ ] 7.4 Manual: remove an item, save, re-add it from choose-items → it lands at the bottom (no position preservation).
- [ ] 7.5 Manual: archive an item that is on a list; reopen choose-items → archived row appears, checked, with badge; saving without unchecking keeps it on the list.
- [ ] 7.6 Manual: create a new list → redirected to `/choose-items?new=1` with no selection; secondary button reads "Skip for now"; empty-library state still routes to `/items/new`.
- [ ] 7.7 Manual: open `/choose-items` via the persistent **Choose items** button (no `?new=1`) → secondary button reads "Back to list".
- [ ] 7.8 Manual: signed-in non-owner hitting `/lists/[id]/choose-items` redirects to `/lists/[id]`; signed-out visitor redirects to `/`.
- [ ] 7.9 Save with no changes → Save button is disabled; clicking has no effect.
- [x] 7.10 `pnpm tsc --noEmit` clean; `pnpm lint` clean. (tsc clean; lint pre-existing errors only.)
