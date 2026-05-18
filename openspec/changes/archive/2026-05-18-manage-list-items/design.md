## Context

Today's "Add items" flow is one-directional: from a list, the owner can pick items to add but can't remove them. Removal lives in the inverse flow (item → multi-select of lists) via `updateItemLists` in [app/actions/items.ts:365](app/actions/items.ts:365), which uses an add+remove diff pattern that already works well. The list-side equivalent is the gap this change fills.

Relevant code:
- Entry points: [app/(main)/lists/ui/components/ListDetails.tsx:102](app/(main)/lists/ui/components/ListDetails.tsx:102), [app/(main)/lists/ui/components/ListActionsMenu.tsx:86](app/(main)/lists/ui/components/ListActionsMenu.tsx:86), [app/(main)/lists/ui/components/ListForm.tsx:100](app/(main)/lists/ui/components/ListForm.tsx:100), [app/(main)/items/ui/components/SortItems.tsx:43](app/(main)/items/ui/components/SortItems.tsx:43)
- New page: [app/(main)/lists/[id]/choose-items/page.tsx](app/(main)/lists/[id]/choose-items/page.tsx), [app/(main)/lists/[id]/choose-items/ChooseItemsForm.tsx](app/(main)/lists/[id]/choose-items/ChooseItemsForm.tsx) (replacing the old `add-items` folder)
- Existing add-only action: [app/actions/lists.ts:299](app/actions/lists.ts:299) (`addItemsToList`)
- Mirror-pattern (inverse direction): [app/actions/items.ts:365](app/actions/items.ts:365) (`updateItemLists`)
- DAL: [lib/dal.ts:149](lib/dal.ts:149) (`getItemsByUser`, defaults `filter: 'active'`)

## Goals / Non-Goals

**Goals:**
- A single page where an owner manages a list's item membership via add+remove diff in one save.
- Remove the existing additive-only `addItemsToList` once nothing references it.
- Keep the existing ownership + auth checks intact.
- Don't lose archived items that are currently on a list when the page is opened.

**Non-Goals:**
- Reordering items (handled by the existing sort flow / `updatePriority`).
- Creating items inline on the choose-items page (the "Create new item" CTA continues to navigate to `/items/new`).
- Drag-and-drop or any new ordering UI.
- Position preservation across remove → re-add (explicitly disclaimed; re-added items go to the bottom).
- DB schema changes.

## Decisions

### Decision 1: Single page with diff-on-save, not two tabs or inline edit
**Choice**: Keep a dedicated route (`/lists/[id]/choose-items`) with a unified checklist; one Save button computes and applies the add+remove diff.

**Why**: Mirrors the existing `updateItemLists` UX from the item form, so behavior is consistent across both directions of the list↔item relation. Least code churn, single round-trip on save, no new component state machine.

**Alternatives considered**:
- Two-tab page ("On list" / "Add"): more UI state, two distinct actions; doesn't add value when both are checkbox toggles in the same library.
- Inline edit mode on the list page itself: most integrated but touches the sort UI, the item card, and introduces a per-row remove button; out of proportion to the user need.

### Decision 2: New server action `setListItems` instead of extending `addItemsToList`
**Choice**: Add `setListItems(list_id, item_ids[])` to [app/actions/lists.ts](app/actions/lists.ts). Delete `addItemsToList` in the same change (no other callers after route rename).

**Why**: The action's semantics change from "append these" to "make the list contain exactly these" — a different contract. A new action with a new name avoids ambiguous behavior at call sites and lets us delete the old code cleanly.

### Decision 3: Re-added items get `MAX(position) + 65536`, no preservation
**Choice**: After deleting removed rows and before inserting added rows, recompute `basePosition = COALESCE(MAX(position) + 65536, 65536)` and assign positions `basePosition + i * 65536`.

**Why**: User explicitly asked for this. Implementation-wise this is also the simplest: we don't need to remember prior positions or sequence delete-vs-insert carefully. The existing `addItemsToList` uses the same MAX+65536 pattern (lines 355–370).

**Position is only mutated on Save.** Toggling a checkbox in the page does not write to the DB; only the diff computed at submit time does. So:
- Uncheck + recheck **before** clicking Save → no write, position preserved.
- Uncheck, click Save, later recheck and Save again → row was deleted, re-add lands at the bottom.

This is exactly the desired behavior: the Save button is the only destructive action, and only across-save remove → re-add resets position.

### Decision 4: Archived-but-on-list items appear, checked, with a badge
**Choice**: Fetch `getItemsByUser(user.id, { filter: 'all' })` and filter in the page to `active ∪ (archived ∩ current list_items)`. Render archived rows with a visible "archived" badge.

**Why**: If we excluded archived items entirely, a Save would silently remove any archived-but-on-list item from the list. That is destructive and surprising. Including them as checked, with a badge, makes the state visible and unchanging unless the owner explicitly unchecks.

**Alternative considered**: Pre-fetch only active items and union with the list's archived members in a second query — more code, no functional difference. The single `filter: 'all'` call is simpler and the result set is small (per-user library).

### Decision 5: Rename route and CSS classes, and label as "Choose items"
**Choice**: Rename `app/(main)/lists/[id]/add-items/` → `app/(main)/lists/[id]/choose-items/` and `add-items-*` CSS classes → `choose-items-*`. The owner-facing label is **Choose items** (not "Manage items" or "Add items"). No legacy redirect.

**Why the route + CSS rename**: All four inbound references are internal (`ListDetails`, `ListActionsMenu`, `ListForm`, `SortItems`). The old URL is unlikely to be bookmarked or shared externally (owner-only management page). Keeping the legacy folder as a redirect adds permanent dead code with no upside.

**Why "Choose items" over alternatives**:
- "Add items" under-promises: it doesn't suggest the page also removes.
- "Manage items" overlaps with the global **Items** nav (which means "your item library") and the empty-state body copy ("Pick from your item library") — together they push the wrong mental model that the button takes you to the library rather than operating on this list.
- "Choose items" pairs naturally with the checkbox UI (you're choosing what's on the list, including by un-choosing), is friendlier, and doesn't echo the global nav.

**Trade-off**: A stale bookmark to `/lists/[id]/add-items` or `/lists/[id]/manage-items` 404s. Considered acceptable (owner-only management page).

### Decision 6: Button "Save changes" is disabled when there are no changes
**Choice**: Compute `hasChanges = selected ≠ initialSelected` client-side; disable Save when false.

**Why**: Matches the spec scenario "No-op save" and avoids needless round-trips. Same pattern is used elsewhere in form components.

## Risks / Trade-offs

- **Risk**: Owner accidentally unchecks an item and saves, losing its position permanently → **Mitigation**: position loss is by design and disclosed in the toast message ("Added N, removed M"). Users can re-add immediately; only ordering is lost.
- **Risk**: An archived item currently on the list is unintentionally removed because the owner doesn't notice the archived badge → **Mitigation**: badge styling should be visually distinct; the item still appears in the same row layout as active items, so the owner can see and choose. Future enhancement could add a confirmation step on unchecking archived items, but out of scope.
- **Risk**: Large libraries (hundreds of items) make the page heavy → **Mitigation**: same risk as the prior add-items page; existing client-side search filter is preserved. Pagination not needed at current scale.
- **Risk**: Race condition where another tab modifies the list between page load and save → **Mitigation**: `setListItems` reads the current `list_items` server-side at apply time and computes the diff against the submitted selection, so a stale client-side view will still produce a correct final state.

## Migration Plan

- Single PR. No data migration. No feature flag.
- Deploy:
  1. Add new route, action, and form.
  2. Update the four inbound links.
  3. Delete the old `/add-items` folder and the `addItemsToList` action.
  4. Verify `pnpm tsc --noEmit` + `pnpm lint` pass.
- Rollback: revert the PR. No DB writes occur during this change.

## Open Questions

None — all shape questions resolved in exploration:
1. UI shape → unified checklist page.
2. Removal semantics → diff on save, no confirmation, no position preservation.
3. Entry-point label → "Choose items" (revised from "Manage items" during follow-up exploration; see Decision 5).
4. Archived-on-list items → included with badge.
