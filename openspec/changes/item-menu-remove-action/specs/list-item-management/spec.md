## ADDED Requirements

### Requirement: Owners SHALL be able to remove an item from a list directly from the item kebab menu

When an item row/card renders in the context of a list the viewer owns (the `/lists/[id]` owner view and other list-scoped owner surfaces), the item's kebab menu SHALL contain a **Remove from list** entry rendered as a `tone="danger"` `<MenuItem>` (per the `menu-system` capability). The entry SHALL NOT render when no owned-list context exists — the items library (`/items`), the archived view, and `<Item preview />` rows.

Activating the entry SHALL open a `ConfirmDialog` (per the `confirm-dialog-system` capability) whose copy makes clear the item is removed from this list only and remains in the owner's library. Confirming SHALL delete the single `list_items(list_id, item_id)` association row — the `items` row, its `item_stores`, and its `purchases` SHALL be untouched — and SHALL revalidate the `items` and `lists` cache tags (the same tags `setListItems` revalidates) so list views reflect the removal without a manual refresh.

The choose-items page remains the bulk add/remove flow; this entry is a single-item shortcut, not a replacement.

#### Scenario: Remove entry appears only in owned-list context

- **WHEN** an owner views their own list page and opens an item's kebab menu
- **THEN** the menu contains a "Remove from list" `tone="danger"` entry; the same item's kebab menu opened from `/items` contains no such entry

#### Scenario: Confirming removes only the association

- **WHEN** the owner activates Remove from list and confirms in the dialog
- **THEN** the `list_items` row for that (list, item) pair is deleted, the item disappears from the list view, the item still exists in the owner's `/items` library with its stores and any purchases intact, and the `items` and `lists` cache tags are revalidated

#### Scenario: Cancelling leaves the list unchanged

- **WHEN** the owner activates Remove from list and dismisses the dialog (Cancel, Escape, or outside click)
- **THEN** no mutation occurs and the item remains on the list

### Requirement: removeListItem SHALL authorize list ownership server-side

A focused server action in `lib/data/listItems.actions.ts` (alongside `setListItems`) SHALL accept `(list_id, item_id)`, verify the authenticated session user owns the list before any write (same authorization shape as `setListItems`), and delete at most the single matching `list_items` row. Unauthorized or unauthenticated calls SHALL return a failure `ActionResponse` and perform no write. The operation is a single DELETE statement — no transaction is required under the neon-http driver constraint.

#### Scenario: Non-owner cannot remove an item from someone else's list

- **WHEN** an authenticated user who does not own the list invokes the action directly with a valid (list_id, item_id) pair
- **THEN** the action returns a failure response and the `list_items` row is not deleted

#### Scenario: Successful removal revalidates cache tags

- **WHEN** the list owner invokes the action with an item currently on the list
- **THEN** the row is deleted, the action returns success, and `updateTag('items')` and `updateTag('lists')` are called

## MODIFIED Requirements

### Requirement: Item edit, create, and delete flows SHALL preserve the caller's navigation context

When a user enters the item edit (`/items/[id]`) or item create (`/items/new`) page from a context with URL state (such as `/items` with sort/filter/page params, or `/lists/[id]`), the system SHALL carry the source URL through the form interaction as a `returnTo` query parameter, and SHALL route the user back to that exact URL (path + search) on completion of any of: Back, Update success, Create success, Cancel, or Delete success.

The `returnTo` value SHALL be validated as a same-origin relative path before use. A valid `returnTo` SHALL begin with a single `/`, SHALL NOT begin with `//`, SHALL NOT contain `://`, and SHALL NOT contain backslashes. Invalid or absent `returnTo` SHALL fall back to `/items`.

#### Scenario: Edit from filtered items page preserves filters on Update

- **WHEN** an owner viewing `/items?sort=price_desc&store=Amazon&page=2` activates the Edit entry in an item's kebab menu, makes a change, and clicks Update
- **THEN** after the success toast, the user is routed to `/items?sort=price_desc&store=Amazon&page=2` (not bare `/items`) and sees the same filtered/sorted/paginated view they came from

#### Scenario: Edit from list page returns to the list

- **WHEN** an owner viewing `/lists/[id]` activates the Edit entry in a list item's kebab menu and clicks Update (or Back, or Cancel)
- **THEN** the user is routed to `/lists/[id]` (with any URL params preserved), not to `/items`

#### Scenario: Delete from edit page honors returnTo

- **WHEN** the user reaches `/items/[id]?returnTo=%2Flists%2Fabc` and confirms Delete
- **THEN** after the success toast, the user is routed to `/lists/abc`, and the deleted item is absent from that view

#### Scenario: Create from items page returns to the same filtered view

- **WHEN** a user on `/items?q=hat` clicks "Create new item", fills out the form, and clicks Create
- **THEN** the user is routed back to `/items?q=hat`, and the newly created item (if matching the filter) is visible

#### Scenario: Create from choose-items page returns to that page

- **WHEN** a user on `/lists/[id]/choose-items?show=off` clicks the "Create new item" CTA, fills out the form, and clicks Create
- **THEN** the user is routed back to `/lists/[id]/choose-items?show=off`, with the new item available for selection

#### Scenario: Direct deep-link to edit page falls back to /items

- **WHEN** a user navigates directly to `/items/[id]` with no `returnTo` query param (e.g., from a bookmark or external link) and clicks Update
- **THEN** the user is routed to `/items` (existing default behavior is preserved)

#### Scenario: Malicious returnTo is rejected

- **WHEN** a user is sent a link to `/items/[id]?returnTo=//evil.com/phish` (or any value that fails same-origin validation: starts with `//`, contains `://`, contains `\`, or does not start with `/`)
- **THEN** the system SHALL treat `returnTo` as absent and route to `/items` on completion, with no error surfaced to the user
