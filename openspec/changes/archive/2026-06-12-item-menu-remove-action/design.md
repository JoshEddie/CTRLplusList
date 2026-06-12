# Design — item-menu-remove-action

## Context

Owner actions on an item card are split today: `OwnerActions.tsx` renders `.item-owner-actions` (hover-revealed pencil `EditItemButton` + archive icon, ≥400px) and `.item-owner-actions-mobile` (kebab `<Menu>` with Edit + Archive, <400px), switched by a media query in `app/(main)/items/ui/styles/item.css` (~lines 1291–1308; hover-reveal ~245–247). Removing an item from a list is only possible via the choose-items checklist (`setListItems` in `lib/data/listItems.actions.ts`, which diffs and deletes/inserts `list_items` rows). `Item.tsx` has no knowledge of which list it's rendered in. Issue #131's overflow fix already hardened the `<Menu>` collision behavior, so the kebab is safe to use everywhere.

## Goals / Non-Goals

**Goals:**
- One owner-actions affordance (kebab menu) at every viewport, in both grid and row views.
- Direct, confirmed "Remove from list" from the item card when viewing an owned list.
- Server action with the same ownership authorization and cache-tag semantics as `setListItems`.

**Non-Goals:**
- No changes to the choose-items bulk flow, the Menu/ConfirmDialog primitives, or the Archive/Delete semantics.
- No remove affordance for non-owners or in the items library.
- No DB schema or position-reindexing changes (deleting a row leaves the fractional positions of the others valid).

## Decisions

### 1. Kebab everywhere instead of adding Remove to both affordance sets

Replacing the desktop pencil/archive icons with the kebab (the issue's stated goal) keeps one menu to maintain and one place users learn. Alternative — keep desktop icons and add a third "remove" icon — rejected: icon rows scale poorly, and the split is exactly what caused the #131-style confusion. This revises binding layout SHALLs in `item-store-links` (col-5 owner states, <400px collapse requirement, preview suppression) — delta spec included rather than silently overridden. `EditItemButton.tsx` and the `.item-owner-actions` block are deleted; the `.item-owner-actions-mobile` class name is kept (renaming it would churn several spec selectors for no behavior gain — can be renamed in a later cleanup change if desired).

### 2. Thread `list_id` as an optional prop, not derive from pathname

`OwnerActions` already receives `pathname`; parsing `/lists/[id]` from it would be fragile (choose-items shares the prefix, future routes too) and would not prove the viewer owns *the list* (owning the item ≠ owning the list). Instead the list page — which already knows it is rendering the owner view — passes `listId` down `Item` → `OwnerActions`. Entry renders only when `listId` is present. Server action re-verifies ownership regardless.

### 3. New `removeListItem(list_id, item_id)` action rather than reusing `setListItems`

Calling `setListItems` with "all current ids minus one" from the card would require the card to know the full list membership (it doesn't) and would race with concurrent edits. A focused single-DELETE action is simpler, atomic by itself (no transaction needed under neon-http), and lives beside `setListItems` in `listItems.actions.ts` per `data-layer-organization`. It revalidates `updateTag('items')` and `updateTag('lists')`, matching `setListItems`.

### 4. ConfirmDialog without a tertiary action

The action is recoverable (re-add via choose-items) but surprising enough to confirm — copy: removed *from this list*, stays in your library. The `tertiary` slot (used by Delete→"Archive instead") is not needed; there's no softer alternative to offer. Alternative — no dialog + undo toast — rejected: the codebase has no undo-toast pattern, and ConfirmDialog is the established primitive.

### 5. Menu order and tone

Edit, Archive/Unarchive, Remove from list — destructive-last with `tone="danger"`, consistent with the menu-system danger tone and the Delete button's danger variant convention.

## Risks / Trade-offs

- [Desktop users lose one-click edit pencil (now two clicks via kebab)] → Acceptable per issue owner's explicit goal; menu opens on a single click with Edit first.
- [Grid-view hover-reveal CSS (`opacity` transition) currently targets `.item-owner-actions`] → Re-point hover-reveal to the kebab trigger or make it always visible; verify in both grid and row views during apply.
- [Spec churn: four `item-store-links` requirements modified] → Full-content MODIFIED blocks included so archive-time merge is lossless.
- [e2e/unit tests referencing `EditItemButton` / inline icons break] → Expected; tasks include sweeping `e2e/` and component tests for the pencil selector.

## Open Questions

- None blocking. (If grid view should keep actions hover-hidden vs. always-visible kebab is a polish call to make during apply/preview.)
