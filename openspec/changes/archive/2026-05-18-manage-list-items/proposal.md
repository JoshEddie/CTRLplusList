## Why

The current **Add items** button on a list owner's list page (`/lists/[id]/add-items`) is additive only — owners can add items from their library to a list but cannot remove them from the same flow. Removal is hidden inside the item-edit form's "lists" multi-select, which forces owners to navigate to a different page (per item) just to take something off a list. This asymmetry is awkward and slow when curating a list.

## What Changes

- **BREAKING**: Replace the `/lists/[id]/add-items` page with `/lists/[id]/choose-items`, a unified checklist where every active item in the owner's library is shown and items already on the list are pre-checked.
- Add a new server action `setListItems(list_id, item_ids[])` that computes and applies the add+remove diff against `list_items`. Position is **not** preserved across remove → re-add; re-added items are appended at the bottom (`MAX(position) + 65536`).
- Archived items that are _currently_ on the list still appear (checked, with an "archived" badge) so a Save doesn't silently remove them.
- The list-owner UI's **Add items** button becomes **Choose items** in both the desktop section ([app/(main)/lists/ui/components/ListDetails.tsx:102](<app/(main)/lists/ui/components/ListDetails.tsx:102>)) and the mobile kebab ([app/(main)/lists/ui/components/ListActionsMenu.tsx:86](<app/(main)/lists/ui/components/ListActionsMenu.tsx:86>)). The icon swaps from `FaPlus` to `MdChecklist`. ("Choose" was selected over "Manage" because it is friendlier, matches the checkbox UI metaphor, and avoids echoing the global "Items" nav.)
- The list-creation flow ([app/(main)/lists/ui/components/ListForm.tsx:100](<app/(main)/lists/ui/components/ListForm.tsx:100>)) redirects to `/choose-items?new=1`; when the `new=1` flag is present the secondary button reads **Skip for now** instead of **Back to list**.
- The empty-list CTA in `SortItems` ([app/(main)/items/ui/components/SortItems.tsx:43](<app/(main)/items/ui/components/SortItems.tsx:43>)) routes to the new route with label **Choose items**.
- Remove the now-unused `addItemsToList` action ([app/actions/lists.ts:299](app/actions/lists.ts:299)) once `setListItems` is the only caller path.

## Capabilities

### New Capabilities

- `list-item-management`: Owner-facing flow for adding and removing items on a list in a single diff-style operation, including handling of archived items that remain on the list.

### Modified Capabilities

<!-- None: no prior specs exist in this OpenSpec repo. -->

## Impact

- **Routes**: New `app/(main)/lists/[id]/choose-items/page.tsx`. The old `app/(main)/lists/[id]/add-items/` folder is removed.
- **Server actions** (`app/actions/lists.ts`): adds `setListItems`; removes `addItemsToList`.
- **Components**: `AddItemsForm.tsx` → `ChooseItemsForm.tsx`, adapted to pre-checked state, archived-badge rendering, and diff submit. `ListDetails`, `ListActionsMenu`, `ListForm`, `SortItems` updated for label/icon/href.
- **DAL**: `getItemsByUser` ([lib/dal.ts:149](lib/dal.ts:149)) is called with `{ filter: 'all' }` and the choose-items page filters the result to `active ∪ (archived ∩ on-list)`.
- **Cache tags**: continues to invalidate `items` and `lists` (unchanged semantics).
- **CSS**: `add-items-*` classes renamed to `choose-items-*` in `app/(main)/lists/ui/styles/list.css`; adds a small archived-badge style.
- No DB schema changes.
- No external API or dependency changes.
