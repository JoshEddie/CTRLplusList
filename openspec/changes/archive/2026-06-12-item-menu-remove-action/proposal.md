# Item kebab menu everywhere + Remove from list

GitHub issue: [#138](https://github.com/JoshEddie/CTRLplusList/issues/138)

## Why

Removing an item from a list currently requires the **Choose items** checklist flow — owners staring at an item on their list have no direct "remove" affordance, and the natural place they look (the edit icon / kebab menu) doesn't offer it. The split affordance also confuses: desktop shows hover pencil + archive icons while mobile (<400px) shows a kebab whose menu holds only Edit (+ Archive), so sparse it read as a rendering bug ([#131](https://github.com/JoshEddie/CTRLplusList/issues/131)).

Inherited constraints found in active specs:

- `list-item-management/spec.md` — Edit-icon return-to scenarios (lines ~188–193) reference "the Edit icon on an item"; the Archive/Delete distinction requirement references "Archive on the list row via item kebab". Choose-items remains the bulk add/remove flow and is untouched.
- `item-store-links/spec.md` — multiple SHALLs pin the current viewport split: `.item-owner-actions` (inline edit/archive icons) occupies col 4 at ≥400px and `.item-owner-actions-mobile` (kebab) at <400px, including spoiler-banner grid behavior and `<Item preview />` suppression rules for both classes. Making the kebab universal changes these layout contracts.
- `menu-system/spec.md` — Menu/MenuItem/MenuLinkItem primitives (keyboard nav, collision flip) are consumed as-is; the new entry uses the existing `tone="danger"` MenuItem. No primitive change.
- `confirm-dialog-system` — the existing `ConfirmDialog` (with optional `tertiary` alternative-action) is reused as-is for the remove confirmation.

## What Changes

- The item-card owner kebab menu becomes the single owner-actions affordance at **all** viewports, replacing the desktop hover pencil (`EditItemButton`) and inline archive icon. Menu contents: Edit, Archive/Unarchive (when applicable), and the new Remove from list.
- New **Remove from list** menu entry (`tone="danger"`), shown only when the item is rendered in the context of a list the viewer owns (list page / list-scoped views). Not shown in the items library, archived view, or `<Item preview />` rows.
- Activating Remove from list opens a `ConfirmDialog`; confirming unlinks the item from that list (deletes the `list_items` row — the item itself is untouched and remains in the owner's library) and revalidates the `items` and `lists` cache tags (same tags `setListItems` bumps).
- List context (`list_id`) is threaded from list pages into `Item` → `OwnerActions`; absent context disables the entry.
- A focused server action for single-item unlink is added in `lib/data/listItems.actions.ts` (alongside `setListItems`), with the same list-ownership authorization check.
- CSS: the ≥400px/<400px display split for `.item-owner-actions` / `.item-owner-actions-mobile` collapses to one always-visible kebab cell; dependent grid rules in `item.css` are updated.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `list-item-management`: owner actions on an item card SHALL be presented via the kebab menu at all viewports (Edit-icon scenarios reworded to the menu's Edit entry); new requirement — owners SHALL be able to remove an item from a list directly from the item card's kebab menu, with confirmation, without affecting the item itself; new single-item unlink server action with ownership authorization and `items`/`lists` tag revalidation.
- `item-store-links`: layout SHALLs that allocate col 4 to `.item-owner-actions` inline icons at ≥400px and the kebab only at <400px are revised — the kebab cell is the sole owner-actions cell at all widths; preview-row suppression collapses to the single kebab class.

## Impact

- `app/(main)/items/ui/components/OwnerActions.tsx` — kebab becomes universal; new Remove entry + ConfirmDialog.
- `app/(main)/items/ui/components/EditItemButton.tsx` — removed (or absorbed); desktop pencil gone.
- `app/(main)/items/ui/components/Item.tsx` / `ItemCard` callers on list pages — thread `list_id` (+ list-owner flag) down to `OwnerActions`.
- `app/(main)/items/ui/styles/item.css` — owner-actions media-query split (~lines 1291–1308) and hover-reveal rules (~245–247) reworked.
- `lib/data/listItems.actions.ts` — new `removeListItem(list_id, item_id)` server action; `updateTag('items')` + `updateTag('lists')`.
- Tests: unit coverage for the new action's auth + unlink semantics; component coverage for menu contents per context; e2e specs touching the desktop edit pencil will need updating.
- No schema change; no transaction needed (single DELETE).
