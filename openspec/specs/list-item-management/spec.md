# list-item-management Specification

## Purpose

TBD - created by archiving change manage-list-items. Update Purpose after archive.
## Requirements
### Requirement: List owners SHALL access a unified choose-items page from a list

A list owner viewing their own list SHALL see a **Choose items** affordance (button on desktop, kebab menu entry on mobile) that routes to `/lists/[id]/choose-items`. Non-owners SHALL NOT see this affordance, and direct navigation to the route as a non-owner SHALL redirect to `/lists/[id]`.

#### Scenario: Owner sees Choose items affordance

- **WHEN** an authenticated user views a list they own
- **THEN** the list page displays a **Choose items** button in the desktop "Manage" section and a "Choose items" entry in the mobile kebab menu, both linking to `/lists/[id]/choose-items`

#### Scenario: Non-owner cannot access the page

- **WHEN** an authenticated user who does not own the list navigates directly to `/lists/[id]/choose-items`
- **THEN** the system redirects to `/lists/[id]`

#### Scenario: Unauthenticated user cannot access the page

- **WHEN** an unauthenticated visitor navigates directly to `/lists/[id]/choose-items`
- **THEN** the system redirects to `/`

### Requirement: The choose-items page SHALL show the owner's library with current list membership pre-checked

The page SHALL render every active item in the owner's library plus any archived items currently on the list, each as a selectable row. Rows whose item is currently in `list_items` for this list SHALL be pre-checked. Archived items that appear because they are on the list SHALL display an "archived" indicator. The set of rows the page loads SHALL be unchanged by toolbar URL params; the toolbar's search, sort, and filter controls narrow and reorder the rendered subset client-side.

#### Scenario: Items on the list are pre-checked

- **WHEN** the owner opens the choose-items page for a list containing items A and B (both active)
- **THEN** rows for items A and B are rendered checked, and all other active items in the owner's library are rendered unchecked

#### Scenario: Archived item on the list is shown with badge

- **WHEN** the owner opens the choose-items page for a list that contains an archived item C
- **THEN** the row for item C is rendered, checked, with a visible "archived" indicator

#### Scenario: Archived item not on the list is hidden

- **WHEN** the owner has an archived item D that is NOT on any version of this list
- **THEN** item D does NOT appear on the choose-items page

#### Scenario: Empty library

- **WHEN** the owner has no items in their library
- **THEN** the page renders an empty state directing them to create items, and no save action is available

### Requirement: Saving SHALL apply the add+remove diff against list_items in a single action

Submitting the page SHALL invoke a server action that computes the diff between the user's current selection and the list's stored `list_items`, deletes rows for unchecked items, and inserts rows for newly checked items. The action SHALL be authorized to owners only and SHALL invalidate the `items` and `lists` cache tags on success.

#### Scenario: Mixed add and remove

- **WHEN** the owner unchecks two previously-checked items and checks three new items, then clicks **Save changes**
- **THEN** the two unchecked items' rows are deleted from `list_items` for this list, three new `list_items` rows are inserted for the newly checked items, and a success toast reports the counts

#### Scenario: No-op save

- **WHEN** the owner clicks **Save changes** without changing the selection
- **THEN** the Save button is disabled (or the action is a no-op) and `list_items` is unchanged

#### Scenario: Non-owner submission is rejected

- **WHEN** a request to set list items is made by a user who is not the list owner
- **THEN** the action returns an unauthorized response and `list_items` is unchanged

### Requirement: Re-added items SHALL NOT preserve prior position

When an item is removed and later re-added (in the same save or a subsequent save), its `position` SHALL be assigned as if it were a brand-new addition, placing it at the bottom of the list (`MAX(position) + 65536`). Prior position values are not retained.

#### Scenario: Remove then re-add lands at bottom

- **WHEN** the owner removes item X from a list (saving the change), then later adds item X back via choose-items
- **THEN** item X is inserted with `position = MAX(position) + 65536` over remaining rows, placing it last in default ordering

#### Scenario: Same-save remove and re-add

- **WHEN** the owner toggles item Y off and back on within a single page session, then clicks **Save changes**
- **THEN** the diff is empty for item Y and no database write occurs for that item

### Requirement: List creation and empty-list CTAs SHALL route to choose-items

The post-create redirect after creating a new list and the empty-state CTA shown on a list with no items SHALL navigate to `/lists/[id]/choose-items` (not the legacy add-items route). The post-create redirect SHALL include a `new=1` query parameter so the page can render an appropriate "Skip for now" secondary action; on subsequent visits the secondary action SHALL read "Back to list".

#### Scenario: Post-create redirect

- **WHEN** the owner creates a new list via the list form
- **THEN** the form redirects to `/lists/[id]/choose-items?new=1` for the new list, and the page renders "Skip for now" as the secondary action

#### Scenario: Subsequent visit

- **WHEN** the owner opens the choose-items page from the persistent **Choose items** button (no `new=1` query param)
- **THEN** the page renders "Back to list" as the secondary action

#### Scenario: Empty-list CTA

- **WHEN** the owner views their own list that has zero items
- **THEN** the empty-state CTA links to `/lists/[id]/choose-items`

### Requirement: The choose-items page SHALL render a filter/sort toolbar driven by URL params

The choose-items page SHALL render a toolbar containing: a search input, a sort dropdown, a "Show" dropdown for list-status filtering, a store filter popover, and a price filter popover. All toolbar state SHALL be reflected in URL query parameters (`q`, `sort`, `show`, `store` (repeatable), `price_min`, `price_max`) so that back/forward navigation and direct links preserve the user's view. When no toolbar URL params are present, the page SHALL render with default state (no search text, sort by newest, show all items, no store filter, no price filter), matching the page's pre-toolbar behavior.

#### Scenario: Toolbar renders on the choose-items page

- **WHEN** the owner navigates to `/lists/[id]/choose-items`
- **THEN** the page renders a toolbar with search, sort, show, stores, and price controls above the items list

#### Scenario: Search filters the rendered list by name

- **WHEN** the owner types text into the toolbar search input
- **THEN** after a short debounce the URL is updated with `?q=<text>` and the rendered list shows only items whose name contains the text (case-insensitive)

#### Scenario: Sort reorders the rendered list

- **WHEN** the owner selects a sort option other than the default
- **THEN** the URL is updated with `?sort=<key>` and the rendered list is re-ordered accordingly; selecting the default sort removes the param from the URL

#### Scenario: Sort options match the items page

- **WHEN** the owner opens the sort dropdown
- **THEN** the options are: Newest, Oldest, Name A–Z, Name Z–A, Store A–Z, Store Z–A, Price low to high, Price high to low

#### Scenario: Show filter narrows by list status — Only on the list

- **WHEN** the owner selects `Show: Only on the list`
- **THEN** the URL is updated with `?show=on` and the rendered list shows only items whose saved state is currently on this list (i.e. members of `initialSelectedIds`)

#### Scenario: Show filter narrows by list status — Only not on the list

- **WHEN** the owner selects `Show: Only not on the list`
- **THEN** the URL is updated with `?show=off` and the rendered list shows only items not currently on this list

#### Scenario: Show filter — All

- **WHEN** the owner selects `Show: All` (the default)
- **THEN** the `show` param is removed from the URL and the rendered list shows all items that the page would otherwise render (active items in the library plus archived items currently on the list)

#### Scenario: Store filter narrows the rendered list

- **WHEN** the owner opens the stores popover and selects one or more stores
- **THEN** the URL is updated with one repeated `store=<name>` param per selection and the rendered list shows only items whose stores include at least one of the selected names

#### Scenario: Price filter narrows the rendered list

- **WHEN** the owner sets a minimum and/or maximum price and applies the filter
- **THEN** the URL is updated with `price_min` and/or `price_max` and the rendered list shows only items whose price falls within the range

#### Scenario: Toolbar state survives back/forward navigation

- **WHEN** the owner applies search/sort/show/store/price filters, navigates away, then returns via the browser back button
- **THEN** the toolbar controls and the rendered list reflect the previously applied state read from the URL

#### Scenario: Default state with no URL params

- **WHEN** the owner navigates to `/lists/[id]/choose-items` with no toolbar URL params
- **THEN** the search is empty, sort is Newest, show is All, no stores or prices are filtered, and the rendered list matches the page's pre-toolbar default behavior

### Requirement: Filter and sort SHALL be derived from URL params client-side and SHALL NOT affect server-side data loading

The choose-items page SHALL continue to load the owner's full library on the server (active items plus archived items currently on the list). The toolbar's filter and sort SHALL be applied client-side over that already-loaded array. Server actions and the underlying DAL functions SHALL NOT be modified by this change.

#### Scenario: Server load is unchanged by toolbar URL params

- **WHEN** the page is requested with any combination of `q`, `sort`, `show`, `store`, `price_min`, or `price_max` URL params
- **THEN** the server-side `getItemsByUser` call uses the same arguments it does today and returns the same set of items; only the client-side rendered subset and order change

#### Scenario: Selection state is preserved across filter changes

- **WHEN** the owner checks items under one filter setting and then changes the `show`, `store`, `price`, sort, or search controls
- **THEN** the in-progress selection (the set of checkboxes that are checked) is preserved unchanged; only which items are visible may change

#### Scenario: Show filter keys off saved membership, not pending selection

- **WHEN** the owner unchecks a currently-saved item under `Show: All`, then switches to `Show: Only on the list`
- **THEN** the just-unchecked item is still rendered (because saved membership has not changed), and its checkbox reflects the pending unchecked state

### Requirement: Item edit, create, and delete flows SHALL preserve the caller's navigation context

When a user enters the item edit (`/items/[id]`) or item create (`/items/new`) page from a context with URL state (such as `/items` with sort/filter/page params, or `/lists/[id]`), the system SHALL carry the source URL through the form interaction as a `returnTo` query parameter, and SHALL route the user back to that exact URL (path + search) on completion of any of: Back, Update success, Create success, Cancel, or Delete success.

The `returnTo` value SHALL be validated as a same-origin relative path before use. A valid `returnTo` SHALL begin with a single `/`, SHALL NOT begin with `//`, SHALL NOT contain `://`, and SHALL NOT contain backslashes. Invalid or absent `returnTo` SHALL fall back to `/items`.

#### Scenario: Edit from filtered items page preserves filters on Update

- **WHEN** an owner viewing `/items?sort=price_desc&store=Amazon&page=2` clicks the Edit icon on an item, makes a change, and clicks Update
- **THEN** after the success toast, the user is routed to `/items?sort=price_desc&store=Amazon&page=2` (not bare `/items`) and sees the same filtered/sorted/paginated view they came from

#### Scenario: Edit from list page returns to the list

- **WHEN** an owner viewing `/lists/[id]` clicks the Edit icon on a list item and clicks Update (or Back, or Cancel)
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

### Requirement: The choose-items page SHALL render rows via the shared item row primitive

Each selectable row on `/lists/[id]/choose-items` SHALL be composed of an outer `<label>` element (class `.choose-items-select`) wrapping (a) a `<CheckboxField>` from the `form-field-system` capability and (b) a `<Item />` from `app/(main)/items/ui/components/Item.tsx` rendered with the `preview` prop. The page SHALL NOT implement its own row-shape CSS, JSX, checkbox markup, thumbnail rendering, or buy-link chip markup; all of these SHALL be inherited from the shared row primitive owned by the `item-store-links` capability.

The outer `<label>` SHALL use `htmlFor` matching the `<CheckboxField>`'s input id so that clicking anywhere on the row body toggles the checkbox via the native label-input association. The `<CheckboxField>`'s own `<label>` (rendered internally by the primitive) SHALL retain the item name as its accessible label, with the visible label `<span>` hidden via the sr-only pattern.

Selection state SHALL be reflected on the outer `<label>` via the modifier classes `.is-on` (for items currently selected) and `.is-removing` (for items being unchecked from the list). State changes SHALL flow through the checkbox input's `onChange`, not through a row-level `onClick` handler. The page SHALL NOT use `e.stopPropagation()` to prevent click bubbling from interactive children — the new composition has distinct interactive semantics (label-click toggles selection; anchor-click inside a buy-link chip opens a store), eliminating the prior need for that pattern.

#### Scenario: Row body is rendered by <Item preview />

- **WHEN** a choose-items row renders for an item
- **THEN** the row's DOM contains a `<Item />` instance rendered with the `preview` prop (producing `.item-container.preview` on the inner card), and the row's class list, computed grid template, image size, name typography, price layout, and buy-link chip layout are identical to those of the same item rendered in the items library list view

#### Scenario: Checkbox is rendered by <CheckboxField>

- **WHEN** a choose-items row renders
- **THEN** the checkbox SHALL be a `<CheckboxField>` instance from `app/ui/components/field/CheckboxField.tsx`, the rendered DOM contains a `<input type="checkbox">` inside a `<label>`, and the input's accessible name is the item name

#### Scenario: Outer label uses htmlFor to enable click-anywhere toggle

- **WHEN** a choose-items row renders
- **THEN** the outer `<label class="choose-items-select">` SHALL set `htmlFor` to the inner checkbox input's `id`; clicking any non-interactive region of the row SHALL toggle the checkbox via the native label association

#### Scenario: Selection state flows through onChange, not onClick

- **WHEN** the user clicks a row to toggle its selection
- **THEN** the state update SHALL be triggered by the `<input type="checkbox">`'s `onChange` event; no `onClick` handler on the row body SHALL invoke `toggle(id)`; no `e.stopPropagation()` SHALL be present on any interactive child element to defend against bubbling

#### Scenario: Page behavior is unchanged

- **WHEN** the user interacts with the picker — applying search/sort/filter, checking/unchecking rows, navigating with the back button, viewing on mobile, clicking the empty-state CTA, clicking "Create new item", or submitting Save changes
- **THEN** every behavior governed by the other requirements in this capability (toolbar URL params, save diff, selection preservation across filter changes, returnTo plumbing, archived-badge rendering, post-create redirect, empty-state CTA target) SHALL produce identical results to the previous bespoke-row implementation

### Requirement: createPurchase SHALL authenticate the claimer and forbid client-supplied user_id

The `createPurchase` server action's input payload SHALL be `{ item_id: string; guest_name: string | null }` — it SHALL NOT accept a `user_id` field. The action SHALL call `auth()` and:

- If a session exists, the action SHALL look up `users.id` via `session.user.email` and use that id as the purchase's `user_id`. Any `guest_name` field in the payload SHALL be ignored on this path.
- If no session exists, the action SHALL require a non-empty `guest_name` and SHALL set `purchases.user_id = NULL`. If `guest_name` is missing or empty, the action SHALL reject with `{ success: false, error: 'Missing identity' }`.

This SHALL apply uniformly regardless of how the item was reached (direct id, list page, search). The action SHALL additionally verify that the item belongs to a list the caller can view (using the same access predicate that gates `/lists/[id]` render); items on lists the caller cannot view SHALL be unclaimable, returning `{ success: false, error: 'Item not found' }` (deliberately indistinguishable from a missing item id).

This requirement is the list-item-management-specific application of the cross-cutting contract in `server-endpoint-authorization`. The cross-cutting capability owns the "no client user_id" rule globally; this requirement enumerates `createPurchase` as a permitted guest write path and binds its specific shape.

#### Scenario: Authenticated user claims an item using session identity

- **WHEN** an authenticated user invokes `createPurchase({ item_id, guest_name: 'ignored' })`
- **THEN** the action looks up `users.id` from the session, inserts `purchases` with `user_id = session.user.id` and `guest_name = NULL`, and the `guest_name` field from the payload is discarded

#### Scenario: Unauthenticated guest claims an item

- **WHEN** an unauthenticated visitor invokes `createPurchase({ item_id, guest_name: 'Aunt May' })`
- **THEN** the action inserts `purchases` with `user_id = NULL` and `guest_name = 'Aunt May'`

#### Scenario: Forged user_id has no place to land

- **WHEN** a developer inspects the `createPurchase` Zod schema
- **THEN** no `user_id` field is declared; the payload type does not accept one

#### Scenario: Claim against a non-viewable item is rejected

- **WHEN** any caller (authenticated or not) invokes `createPurchase({ item_id })` where the item belongs to a list the caller cannot view (private list they do not own, or a list owned by a user who has blocked them)
- **THEN** the action returns `{ success: false, error: 'Item not found' }` and no `purchases` row is inserted

### Requirement: Purchase capacity SHALL be enforced atomically against concurrent callers

When an item has a non-null `quantity_limit`, `createPurchase` SHALL guarantee that the number of `purchases` rows for that item never exceeds `quantity_limit`, regardless of concurrent calls. The implementation SHALL combine two enforcement layers:

1. **Transactional row lock.** The existence check, capacity count, and insert SHALL execute inside a single database transaction. Inside the transaction, the item row SHALL be locked with `SELECT … FOR UPDATE` so that concurrent `createPurchase` calls against the same item serialize.
2. **DB-level uniqueness for authenticated duplicates.** A partial unique index on `purchases (item_id, user_id) WHERE user_id IS NOT NULL` SHALL exist on the `purchases` table, so that a duplicate claim by the same authenticated user fails at the database layer even if the application-level check is bypassed.

When the capacity check inside the transaction reveals the item is now full, the action SHALL return `{ success: false, error: 'Fully claimed' }`. When the duplicate-claim unique index trips, the action SHALL return `{ success: false, error: 'Duplicate claim' }`.

#### Scenario: Two concurrent claims on a quantity_limit=1 item

- **WHEN** two distinct authenticated users invoke `createPurchase({ item_id })` simultaneously against an item with `quantity_limit = 1` and no existing purchases
- **THEN** exactly one call returns `{ success: true }` and the other returns `{ success: false, error: 'Fully claimed' }`; the `purchases` table contains exactly one row for that item

#### Scenario: Same user submits duplicate claims racing through different replicas

- **WHEN** authenticated user A submits `createPurchase({ item_id })` twice in quick succession through two distinct server-action invocations
- **THEN** exactly one row is inserted; the duplicate hits the partial unique index and the second invocation returns `{ success: false, error: 'Duplicate claim' }`

### Requirement: removePurchase for guest callers SHALL require the purchase row id

`removePurchase` SHALL accept an input payload of `{ purchase_id: string }` (preferred) OR — for backwards compatibility with the legacy item-scoped flow — `{ item_id: string; guest_name?: string | null }` for authenticated callers only.

For an unauthenticated guest caller, the action SHALL require `purchase_id` and SHALL load that row to verify `purchases.user_id IS NULL` AND `purchases.guest_name = payload.guest_name`. If either check fails, the action SHALL return `{ success: false, error: 'Not your claim' }` without deleting any row. The action SHALL NOT permit guest deletion by `(item_id, guest_name)` alone.

For an authenticated caller, the action SHALL look up `users.id` from the session and SHALL only delete rows where `purchases.user_id = sessionUser.id`. Guest_name SHALL be ignored on this path.

#### Scenario: Two guests with the same display name cannot revoke each other

- **WHEN** guest "Mom" (browser A) has claimed item X, and a different guest also typing "Mom" (browser B) invokes `removePurchase({ item_id: X, guest_name: 'Mom' })` without a `purchase_id`
- **THEN** the action returns `{ success: false, error: 'Missing identity' }` and the original guest's claim is unchanged

#### Scenario: Guest revokes their own claim with the purchase row id

- **WHEN** the guest who created a claim invokes `removePurchase({ purchase_id })` with the purchase row id surfaced by the UI for their own claim, and supplies the matching `guest_name`
- **THEN** the action deletes that row and returns `{ success: true }`

#### Scenario: Authenticated user revokes their own claim

- **WHEN** authenticated user A invokes `removePurchase({ item_id })` for an item they have claimed
- **THEN** the action deletes the row where `purchases.user_id = A.id AND purchases.item_id = item_id` and returns `{ success: true }`

