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

Submitting the page SHALL invoke a server action that computes the diff between the user's current selection and the list's stored `list_items`, deletes rows for unchecked items, and inserts rows for newly checked items. The action SHALL be authorized to owners only and SHALL invalidate the `items` and `lists` cache tags on success. When the diff is non-empty, the action SHALL advance the list's `updated_at` (per `list-update-recency`); a no-op save SHALL leave `updated_at` unchanged.

#### Scenario: Mixed add and remove

- **WHEN** the owner unchecks two previously-checked items and checks three new items, then clicks **Save changes**
- **THEN** the two unchecked items' rows are deleted from `list_items` for this list, three new `list_items` rows are inserted for the newly checked items, and a success toast reports the counts
- **AND** the list's `updated_at` is set to the time of the save

#### Scenario: No-op save

- **WHEN** the owner clicks **Save changes** without changing the selection
- **THEN** the Save button is disabled (or the action is a no-op) and `list_items` is unchanged
- **AND** the list's `updated_at` is unchanged

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

A focused server action in `lib/data/listItems.actions.ts` (alongside `setListItems`) SHALL accept `(list_id, item_id)`, verify the authenticated session user owns the list before any write (same authorization shape as `setListItems`), and delete at most the single matching `list_items` row. Unauthorized or unauthenticated calls SHALL return a failure `ActionResponse` and perform no write. The operation is a single DELETE statement — no transaction is required under the neon-http driver constraint. A successful removal SHALL advance the list's `updated_at` (per `list-update-recency`).

#### Scenario: Non-owner cannot remove an item from someone else's list

- **WHEN** an authenticated user who does not own the list invokes the action directly with a valid (list_id, item_id) pair
- **THEN** the action returns a failure response and the `list_items` row is not deleted

#### Scenario: Successful removal revalidates cache tags

- **WHEN** the list owner invokes the action with an item currently on the list
- **THEN** the row is deleted, the action returns success, and `updateTag('items')` and `updateTag('lists')` are called
- **AND** the list's `updated_at` is set to the time of the removal

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

- If a session exists AND no non-empty `guest_name` is provided, the action SHALL look up `users.id` via `session.user.email` and use that id as the purchase's `user_id` (a self-claim), with `guest_name = NULL`.
- If a session exists AND a non-empty `guest_name` is provided, the action SHALL record a claim **on behalf of that named third party**: it SHALL set `purchases.user_id = NULL` and `purchases.guest_name = <trimmed name>`, so the stored claim belongs to the named person, not to the caller. The authenticated caller's looked-up `users.id` SHALL still be used to authorize the request (the viewability / owner-block gate below), so a blocked caller cannot claim via this path. No `user_id` is ever taken from the payload — the third party is a free-text name, never an account.
- If no session exists, the action SHALL require a non-empty `guest_name` and SHALL set `purchases.user_id = NULL`. If `guest_name` is missing or empty, the action SHALL reject with `{ success: false, error: 'Missing identity' }`.

This SHALL apply uniformly regardless of how the item was reached (direct id, list page, search). The action SHALL additionally verify that the item belongs to a list the caller can view (using the same access predicate that gates `/lists/[id]` render); items on lists the caller cannot view SHALL be unclaimable, returning `{ success: false, error: 'Item not found' }` (deliberately indistinguishable from a missing item id).

The access predicate SHALL treat both `'unlisted'` and `'public'` lists as viewable by **any** caller — guest (no session) or authenticated, follower or not — subject only to the owner-block check (a list owned by a user who has blocked the caller is never viewable). A `'public'` list is therefore claimable by anyone who can reach its URL; the follow relationship governs feed discovery, not claim access. Only `'private'` lists (viewable solely by their owner) and blocked-owner lists are non-viewable. This is the `list-item-management` application of the access model owned by `list-visibility` ("a `public` list is visible to anyone with the URL").

This requirement is the list-item-management-specific application of the cross-cutting contract in `server-endpoint-authorization`. The cross-cutting capability owns the "no client user_id" rule globally; this requirement enumerates `createPurchase` as a permitted guest write path — for an unauthenticated caller, AND for an authenticated caller recording a claim on behalf of a named third party — and binds its specific shape.

#### Scenario: Authenticated user self-claims using session identity

- **WHEN** an authenticated user invokes `createPurchase({ item_id, guest_name: null })`
- **THEN** the action looks up `users.id` from the session and inserts `purchases` with `user_id = session.user.id` and `guest_name = NULL`

#### Scenario: Authenticated user claims on behalf of a named other person

- **WHEN** an authenticated user invokes `createPurchase({ item_id, guest_name: 'Aunt May' })`
- **THEN** the action inserts `purchases` with `user_id = NULL` and `guest_name = 'Aunt May'` — the typed name is honored (not discarded), and the claim is attributed to the named third party rather than to the caller
- **AND** the request is still authorized using the caller's session identity, so a blocked caller is rejected with `{ success: false, error: 'Item not found' }`

#### Scenario: Unauthenticated guest claims an item

- **WHEN** an unauthenticated visitor invokes `createPurchase({ item_id, guest_name: 'Aunt May' })`
- **THEN** the action inserts `purchases` with `user_id = NULL` and `guest_name = 'Aunt May'`

#### Scenario: Forged user_id has no place to land

- **WHEN** a developer inspects the `createPurchase` Zod schema
- **THEN** no `user_id` field is declared; the payload type does not accept one

#### Scenario: Claim against a non-viewable item is rejected

- **WHEN** any caller (authenticated or not) invokes `createPurchase({ item_id })` where the item belongs to a list the caller cannot view (private list they do not own, or a list owned by a user who has blocked them)
- **THEN** the action returns `{ success: false, error: 'Item not found' }` and no `purchases` row is inserted

#### Scenario: Guest claims an item on a public list

- **WHEN** an unauthenticated guest invokes `createPurchase({ item_id, guest_name: 'Aunt May' })` for an item that belongs only to a `'public'` list whose owner has not blocked anyone
- **THEN** the access predicate resolves the item as viewable and the action inserts `purchases` with `user_id = NULL` and `guest_name = 'Aunt May'` — it does NOT return `'Item not found'`

#### Scenario: Authenticated non-follower claims an item on a public list

- **WHEN** an authenticated user who does NOT follow the list owner invokes `createPurchase({ item_id })` for an item that belongs only to that owner's `'public'` list, and the owner has not blocked the caller
- **THEN** the access predicate resolves the item as viewable and the claim is inserted — viewability does NOT depend on a follow relationship

#### Scenario: Blocked caller cannot claim on a public list

- **WHEN** a caller invokes `createPurchase({ item_id })` for an item on a `'public'` list whose owner has blocked that caller
- **THEN** the access predicate resolves the item as non-viewable and the action returns `{ success: false, error: 'Item not found' }` with no `purchases` row inserted

### Requirement: Purchase capacity SHALL be enforced atomically against concurrent callers

When an item has a non-null `quantity_limit`, `createPurchase` SHALL enforce the capacity to the strongest degree the `drizzle-orm/neon-http` driver permits. That driver provides **no interactive transactions and no `SELECT … FOR UPDATE`** (every query is an independent HTTP round-trip — see `db/index.ts` and `DATABASE.md`), so true cross-statement serialization of concurrent callers is not available. Enforcement therefore combines a best-effort application check with a database-level uniqueness backstop, and one residual race is an accepted limitation:

1. **Best-effort capacity check.** Before inserting, `createPurchase` SHALL count existing `purchases` rows for the item and, when `quantity_limit` is non-null and the count is `>= quantity_limit`, SHALL return `{ success: false, error: 'Fully claimed' }` without inserting. This fully enforces capacity for sequential (non-concurrent) callers.
2. **DB-level uniqueness for authenticated duplicates.** A partial unique index on `purchases (item_id, user_id) WHERE user_id IS NOT NULL` SHALL exist on the `purchases` table, so that a duplicate claim by the same authenticated user fails at the database layer (SQLSTATE `23505`) even when two requests race past the application-level duplicate check. On catching `23505`, the action SHALL return `{ success: false, error: 'Duplicate claim' }`.
3. **Accepted residual race.** Because the partial unique index constrains only `(item_id, user_id)` for non-NULL `user_id`, it does NOT serialize two *distinct* authenticated users or two guest (`user_id IS NULL`) claimants racing against the same limited item. Under true concurrency such callers MAY both pass the best-effort count and both insert, so the stored count MAY transiently exceed `quantity_limit`. This is an accepted limitation of the no-transactions driver constraint, documented at `lib/data/purchase.actions.ts`. Closing it would require a driver change (`neon-serverless` WebSocket Pool, declined without owner approval) or a schema-level capacity backstop; neither is in force today.

#### Scenario: Sequential claim against a full item is rejected

- **WHEN** an authenticated user invokes `createPurchase({ item_id })` against an item with `quantity_limit = 1` that already has one `purchases` row
- **THEN** the action returns `{ success: false, error: 'Fully claimed' }` and no new `purchases` row is inserted

#### Scenario: Same user duplicate claim trips the partial unique index

- **WHEN** authenticated user A submits `createPurchase({ item_id })` twice and the second insert reaches the database despite the application duplicate check (e.g. two invocations racing through distinct DB sessions)
- **THEN** the second insert violates the partial unique index `purchases (item_id, user_id) WHERE user_id IS NOT NULL` with SQLSTATE `23505`
- **AND** the action catches it and returns `{ success: false, error: 'Duplicate claim' }`
- **AND** exactly one `purchases` row exists for that `(item_id, user_id)` pair

#### Scenario: Concurrent distinct claimants on a limited item — residual race is accepted

- **WHEN** two distinct authenticated users (or two guests) invoke `createPurchase({ item_id })` truly concurrently against an item with `quantity_limit = 1` and no existing purchases
- **THEN** the partial unique index does NOT block either insert (the rows differ in `user_id`, or both have `user_id IS NULL`)
- **AND** the stored count MAY exceed `quantity_limit`
- **AND** this outcome is an accepted limitation of the `neon-http` no-transactions constraint, NOT a contract violation

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

### Requirement: Archive and Delete affordances on an item SHALL communicate distinct semantics

The item edit/detail surface and any inline item row affordance SHALL expose Archive and Delete as visually and copy-wise distinct actions whose user-visible semantics are unambiguous:

- **Archive** SHALL be presented as non-destructive: the item is hidden from the owner's `/items` (Active tab) and from the choose-items picker, but the item row, all `list_items` associations, all `item_stores` rows, and all `purchases` SHALL be preserved (`items.archived_at` is set to a timestamp; no rows are deleted). The archived item continues to appear on every list it is currently attached to — archive does NOT remove the item from shared list views. Archive is a one-click toggle with a toast confirmation; no modal dialog is presented.
- **Delete** SHALL be presented as destructive: the item row, all `list_items` associations, all `item_stores` rows, and all `purchases` rows for that item are removed via FK cascade. The affordance SHALL communicate this through (a) destructive visual styling (the `danger` button variant), AND (b) a confirmation dialog that names the consequence and irreversibility in plain language.

The two affordances SHALL NOT be visually identical or share helper copy that conflates their semantics. A user encountering both affordances for the first time SHALL be able to distinguish "this hides the item" from "this permanently destroys it" without reading source code or DB schema.

#### Scenario: Archive shows no confirmation dialog

- **WHEN** an authenticated user activates the Archive affordance on one of their items
- **THEN** the action is performed immediately, a success toast confirms the archival, and `items.archived_at` is set; no modal dialog is presented

#### Scenario: Archived item can be restored

- **WHEN** a user views an archived item and activates the Unarchive affordance
- **THEN** `items.archived_at` is cleared and the item reappears in `/items` Active tab and the choose-items picker; all preserved associations (lists, stores, purchases) remain intact

#### Scenario: Archive and Delete are visually distinct

- **WHEN** an item edit view renders both Archive and Delete affordances (Archive on the list row via item kebab; Delete on the edit form footer)
- **THEN** the Delete affordance uses the `danger` button variant and the Archive affordance does not

### Requirement: The Delete confirmation dialog SHALL nudge the user toward Archive without obstructing Delete

When an owner activates Delete on an item, the confirmation dialog SHALL surface Archive as a recoverable alternative AND preserve the original Delete affordance's tap target and visual prominence, so the user is informed of the alternative without bait-and-switch on the action they just chose.

The dialog SHALL use a single anchor metaphor — "history" — to convey what Archive preserves and Delete erases, in place of enumerating individual data consequences (claims, list memberships, store links). The copy SHALL NOT branch on claim count or claim ownership.

The dialog SHALL render three buttons when the item is active (not archived):

- **Cancel** — ghost variant, dismisses the dialog.
- **Archive instead** — primary variant, full-width above the Cancel | Delete row. Selecting it archives the item and dismisses the dialog.
- **Delete** — danger variant, in the bottom row alongside Cancel. Selecting it deletes the item permanently.

When the item is already archived, the dialog SHALL render only Cancel and Delete (no Archive instead — the alternative is no longer meaningful).

#### Scenario: Active item — confirmation dialog offers Archive as recoverable alternative

- **WHEN** an authenticated owner clicks Delete on the edit form for an active (non-archived) item
- **THEN** a confirmation dialog renders with:
  - Title: "Delete this item?"
  - Body: "Archive instead to keep its history. Deleting can't be undone."
  - Buttons: a full-width "Archive instead" (primary) above a Cancel | Delete row

#### Scenario: Active item — selecting "Archive instead" archives without deleting

- **WHEN** the user clicks "Archive instead" in the confirmation dialog
- **THEN** the item's `archived_at` is set, a success toast appears, the dialog dismisses, and no rows are deleted

#### Scenario: Already-archived item — confirmation dialog omits the Archive option

- **WHEN** an authenticated owner clicks Delete on the edit form for an item whose `archived_at` is set
- **THEN** a confirmation dialog renders with:
  - Title: "Delete this item permanently?"
  - Body: "This erases its history. Can't be undone."
  - Buttons: Cancel and Delete only (no "Archive instead")

#### Scenario: Copy uses "history" anchor, not claim/list enumeration

- **WHEN** the confirmation dialog renders for any item
- **THEN** the body copy SHALL use the word "history" to convey what Archive preserves and Delete erases, and SHALL NOT enumerate claim counts, list memberships, or store-link counts in the body

### Requirement: updatePriority SHALL reorder list items via fractional positions with rebalance on collision

The `updatePriority(item_id, target_id, listId)` server action SHALL move an item to the position of a target item within a single list, owner-only, using integer fractional indexing over the `list_items.position` column. New `list_items` rows SHALL be appended at `MAX(position) + 65536` (base spacing 65536). On a move, the new position SHALL be computed as the integer midpoint between the target's position and the neighboring row on the side the moved item is travelling from:

- Moving an item from a higher position toward a lower target: `new = floor((prevLowerNeighbor + targetPosition) / 2)`, or `floor(targetPosition / 2)` when the target is already the lowest row (no lower neighbor).
- Moving an item from a lower position toward a higher target: `new = floor((nextHigherNeighbor + targetPosition) / 2)`, or `targetPosition + 65536` when the target is already the highest row (no higher neighbor).

After applying the move, the action SHALL check the two highest positions on the list; when their difference is below a minimum gap of `0.001`, the action SHALL rebalance the entire list by rewriting every row's position to `(index + 1) * 65536` in ascending position order, restoring uniform spacing. The action SHALL invalidate the `items` cache tag on success.

Reorders are presentation-order changes, not list-content changes: neither a move nor a rebalance SHALL advance the list's `updated_at` (per `list-update-recency`).

The action SHALL guard inputs: a caller who is not the list owner SHALL receive an unauthorized response and no write SHALL occur; when either `item_id` or `target_id` is not a member of `listId`, the action SHALL return `{ success: false, error: 'Item or target not found on this list' }`; when the moved item already occupies the target's exact position, the action SHALL return `{ success: false, error: 'Item is already at the target position' }` and no write SHALL occur.

#### Scenario: Move computes the integer midpoint between target and neighbor

- **WHEN** the owner moves an item to sit next to a target that has a neighboring row on the travel side
- **THEN** the moved item's `list_items.position` is updated to the integer floor of the midpoint between the target's position and that neighbor's position
- **AND** the relative order of the other rows is unchanged

#### Scenario: Move to the front edge halves the target position

- **WHEN** the owner moves an item ahead of the current lowest-position row (the target has no lower neighbor)
- **THEN** the moved item's position is set to `floor(targetPosition / 2)`

#### Scenario: Move past the back edge adds base spacing

- **WHEN** the owner moves an item past the current highest-position row (the target has no higher neighbor)
- **THEN** the moved item's position is set to `targetPosition + 65536`

#### Scenario: Collision below min gap triggers full rebalance

- **WHEN** a move would leave the two highest positions on the list differing by less than `0.001`
- **THEN** every `list_items` row on the list is rewritten to `(index + 1) * 65536` in ascending order, restoring 65536 spacing
- **AND** the displayed order is preserved

#### Scenario: Reorder leaves updated_at unchanged

- **WHEN** the owner moves an item via `updatePriority`, including a move that triggers a full rebalance
- **THEN** the list's `updated_at` is unchanged

#### Scenario: Moving to the same position is a no-op

- **WHEN** the owner invokes `updatePriority` with an `item_id` whose position already equals the target's position
- **THEN** the action returns `{ success: false, error: 'Item is already at the target position' }` and no `list_items` row is updated

#### Scenario: Non-member item or target is rejected

- **WHEN** the owner invokes `updatePriority` where `item_id` or `target_id` is not a member of `listId`
- **THEN** the action returns `{ success: false, error: 'Item or target not found on this list' }` and no row is updated

#### Scenario: Non-owner reorder is rejected

- **WHEN** a user who does not own `listId` invokes `updatePriority`
- **THEN** the action returns an unauthorized response and no `list_items` row is updated

### Requirement: The purchase modal SHALL render the claim flow for the viewer's auth state and dispatch claims without a client-supplied user_id

The purchase/claim modal UI (`PurchaseFlowContainer` mounted by `Item.tsx` via `Modal`) SHALL select which claim flow it renders from the viewer's authentication state, and SHALL produce claim/un-claim dispatches that obey the identity contract owned by the `createPurchase` / `removePurchase` server-action requirements in this capability. Every variant opens with the modal header (item thumbnail, name, price, close affordance) and the store row (owned by `item-store-links`); below that:

- For an **unauthenticated** viewer, the modal SHALL render the guest flow: a "Your name" field and a "Claim as Guest" action disabled until the name is non-empty, with the sign-in affordance demoted to a footer line below the claim section — the store row SHALL never sit behind a sign-in step. The resulting `createPurchase` call SHALL carry `{ item_id, guest_name }` and SHALL NOT carry a `user_id`.
- For an **authenticated** viewer, the modal SHALL render the self-claim CTA plus the collapsed attributed-claim disclosure (anatomy owned by `claim-attribution`):
  - **claim for myself** — the primary CTA; the resulting `createPurchase` call SHALL carry `{ item_id, guest_name: null }` (identity resolved server-side from the session, recorded as a self-claim);
  - **attributed or guest-name claim** — reached by expanding the disclosure; confirming a free-text name produces a `createPurchase` call carrying `{ item_id, guest_name: <entered name> }`, and confirming a pool row produces the attributed-claim dispatch defined by `claim-attribution`'s eligibility contract.

  No branch SHALL carry a client-supplied `user_id`.
- For a viewer with a **removable claim**, the modal SHALL render the already-claimed state (store row + "Remove my claim", owned by `claim-attribution`). Un-claiming SHALL dispatch `removePurchase`; for a guest the dispatch SHALL carry the claim's `purchase_id` (never `(item_id, guest_name)` alone), and for an authenticated caller it SHALL carry the row reference for the session-authorized claim.

This requirement governs the **UI** that produces those payloads; the server-side enforcement of identity, capacity, and the partial-unique-index duplicate backstop is owned by this capability's `createPurchase` / `removePurchase` / capacity requirements (locked by the action-layer carve-out `test-list-item-management`). The no-client-`user_id` rule is the list-item-management-specific application of the cross-cutting `server-endpoint-authorization` contract; this requirement does not restate that cross-cutting SHALL, it binds the UI to it.

#### Scenario: Unauthenticated viewer claims as a guest

- **WHEN** an unauthenticated viewer opens the purchase modal on a claimable item, enters a display name, and confirms the claim
- **THEN** the modal calls `createPurchase` with `{ item_id, guest_name: <entered name> }` and no `user_id` field
- **AND** the modal also exposes a sign-in affordance below the claim section

#### Scenario: Guest sees store links without signing in

- **WHEN** an unauthenticated viewer opens the purchase modal on an item with valid stores
- **THEN** the store row renders above the guest-name field — no sign-in step gates it

#### Scenario: Unauthenticated viewer cannot claim with an empty guest name

- **WHEN** an unauthenticated viewer attempts to confirm a claim without entering a display name
- **THEN** the confirm affordance is disabled (or the claim is not dispatched) and no `createPurchase` call is made

#### Scenario: Authenticated viewer self-claims using session identity

- **WHEN** an authenticated viewer opens the purchase modal and activates the primary self-claim CTA
- **THEN** the modal calls `createPurchase` with `{ item_id, guest_name: null }` and no `user_id` field

#### Scenario: Authenticated viewer claims for a named non-user

- **WHEN** an authenticated viewer expands the disclosure, enters a name under "Someone not listed?", and confirms
- **THEN** the modal calls `createPurchase` with `{ item_id, guest_name: <entered name> }` and no `user_id` field
- **AND** the resulting claim is attributed to the named third party, not to the viewer

#### Scenario: Guest un-claim dispatches the purchase row id

- **WHEN** a guest revokes their own claim from the modal
- **THEN** the modal calls `removePurchase` carrying that claim's `purchase_id`, not `(item_id, guest_name)` alone

### Requirement: createPurchase SHALL return the inserted purchase row id and optimistic claim state SHALL use it

On success, `createPurchase` SHALL include the inserted `purchases` row's id in its return value (additive to the existing success shape). The client's optimistic claim state SHALL use that server-issued id for the appended row — it SHALL NOT fabricate a client-side id. Reconciliation between optimistic rows and server-refreshed rows SHALL key on the row id, so a claim is never rendered twice when the server snapshot arrives before or after the optimistic append. An unclaim dispatched immediately after a claim — before any server-driven re-render — SHALL therefore carry a real row id and succeed.

#### Scenario: Immediate unclaim after claim succeeds

- **WHEN** a viewer claims an item and, before any refresh, activates the claim's removal affordance
- **THEN** `removePurchase` receives the real inserted row id and the removal succeeds (no "Claim not found")

#### Scenario: Optimistic row does not duplicate against the server snapshot

- **WHEN** the server-driven re-render delivers the inserted row while an optimistic row with the same id is present
- **THEN** the claim renders exactly once

#### Scenario: Return shape is additive

- **WHEN** an existing caller reads only the previous success/error fields of `createPurchase`'s return value
- **THEN** it continues to work unchanged

### Requirement: The drag-reorder surface SHALL dispatch updatePriority with the resolved target and optimistically reorder

The list-items drag-reorder UI (`SortItems.tsx`, the capability's sole `@dnd-kit/core` + `@dnd-kit/sortable` consumer, mounted for the list owner via `SortItemsContainer`) SHALL, on a completed drag that lands the moved item on a different target row, (a) optimistically reorder the rendered list immediately via `arrayMove`, and (b) dispatch `updatePriority(item_id, target_id, listId)` where `item_id` is the dragged row and `target_id` is the row it was dropped onto. A drag that ends on the item's own position, or with no drop target, SHALL dispatch nothing and SHALL leave the rendered order unchanged.

This requirement governs the **UI's target resolution and dispatch payload**; the server-side fractional-position algorithm, rebalance-on-collision, and owner-only authorization for `updatePriority` are owned by this capability's `updatePriority` requirement (locked by the action-layer carve-out `test-list-item-management`).

#### Scenario: Dropping on a different row reorders and dispatches

- **WHEN** the owner drags a list item and drops it onto a different row
- **THEN** the rendered list reorders immediately (optimistic `arrayMove`)
- **AND** `updatePriority` is called with `(draggedItemId, targetRowId, listId)`

#### Scenario: Dropping on the same position is a no-op

- **WHEN** a drag ends with the moved item over its own position, or with no drop target
- **THEN** `updatePriority` is not called and the rendered order is unchanged

### Requirement: The image-search modal SHALL distinguish capacity errors from generic upstream failures in the UI

The item-form image-search modal (`ImageSearch.tsx`) SHALL request results from `GET /api/image-search` and SHALL surface a **temporarily-unavailable** state — distinct from a generic load failure — for the endpoint's capacity errors: the per-user rate-limit (HTTP 429) and the upstream provider quota (`{ error: 'quota_exceeded' }`). Both capacity shapes map to the same retryable "temporarily unavailable — paste an image URL instead" message; any other failure (a non-ok response, a network error, or a malformed body) SHALL surface a generic "failed to load — try again later" message. A transient capacity error SHALL NOT be presented as a generic permanent failure, and vice versa.

This requirement governs the **UI's consumption** of the endpoint; the endpoint's session gate and the 30-requests-per-minute token bucket are owned by `server-endpoint-authorization` (and exercised by the API-route carve-out `test-image-search-api`). The UI test mocks `fetch` at the boundary and asserts the rendered state per error shape; it does not assert the route's auth or bucket SHALLs. (Implementation note: the source intentionally collapses the 429 rate-limit and the `quota_exceeded` quota into one capacity state rather than two — this requirement binds the UI to that behaviour, not to a finer rate-limit-vs-quota split.)

#### Scenario: Rate-limited response shows the temporarily-unavailable state

- **WHEN** the image-search request resolves with HTTP 429
- **THEN** the modal surfaces the temporarily-unavailable state (retryable, advising the user to paste an image URL), distinct from the generic load-failure state

#### Scenario: Quota-exceeded response shows the same temporarily-unavailable state

- **WHEN** the image-search request resolves with `{ error: 'quota_exceeded' }`
- **THEN** the modal surfaces the same temporarily-unavailable state it shows for a rate-limit

#### Scenario: Other failures show a generic error

- **WHEN** the image-search request fails for any other reason (a non-ok response, a network error, or a malformed body)
- **THEN** the modal surfaces a generic load-failure state, not the temporarily-unavailable capacity state

### Requirement: DAL item reads SHALL sanitize purchase attribution by viewer role

The item reads (`getItemsByListId` and `getItemsByUser` in `lib/data/item.ts`; `getItemsByPurchased` in `lib/data/purchase.ts`) SHALL project each item's `purchases` through a role-aware sanitizer (`sanitizePurchases`, exported from `lib/data/purchase.ts`) before any row escapes the data-layer boundary, so that claim attribution never leaks beyond what the viewer is entitled to see. The sanitized projection SHALL expose, per purchase, only a stable `id`, a `by` tag (`'self'` or `'other'`), and a `firstName` — never a full name, email address, user id, or raw guest identity.

The projection SHALL obey these rules, keyed on whether the viewer owns the items and whether spoilers are explicitly enabled:

- **Owner without spoilers** — when the viewer owns the items and spoilers are NOT enabled, the read SHALL return an **empty** purchases array for every item, regardless of how many claims exist. An owner SHALL NOT be able to infer that, or by whom, their own items were claimed. (Owners cannot claim their own items, so every claim is gift-surprise information.)
- **Owner with spoilers** — when the viewer owns the items and spoilers ARE explicitly enabled, each claim SHALL be exposed as `{ by: 'other', firstName }` (the owner is never the claimer of their own items).
- **Non-owner viewer** — each claim SHALL be exposed as `{ by, firstName }` where `by` is `'self'` only when an authenticated `viewerId` matches the claim's `user_id`, and `'other'` otherwise.

`firstName` SHALL be derived as the first whitespace-delimited token of the claimer's stored name (falling back to the guest name), and SHALL be the literal `'Someone'` when that name is null, empty, or whitespace-only. The per-item `hasPurchases` flag (where exposed) SHALL reflect whether any claim exists **before** sanitization, so an owner-without-spoilers view can still indicate "claimed" without revealing the claimer.

#### Scenario: Owner without spoilers sees no claim attribution

- **WHEN** an item owner reads their own items (`getItemsByUser` / `getItemsByListId` with `isOwner` true) and spoilers are not enabled
- **THEN** every item's sanitized `purchases` array is empty
- **AND** no claimer first name, full name, email, or user id is present in the result
- **AND** `hasPurchases` (where exposed) still reflects that a claim exists

#### Scenario: Owner with spoilers sees first names tagged other

- **WHEN** an item owner reads their own items with spoilers explicitly enabled
- **THEN** each claim is exposed as `{ by: 'other', firstName }`
- **AND** `firstName` is the first token of the claimer's stored name, or `'Someone'` when that name is null/empty/whitespace-only

#### Scenario: Non-owner viewer sees self versus other first names only

- **WHEN** an authenticated non-owner reads items (`getItemsByListId` with a `viewerId`, or `getItemsByPurchased`)
- **THEN** a claim whose `user_id` equals the `viewerId` is tagged `{ by: 'self' }` and every other claim `{ by: 'other' }`
- **AND** only `firstName` is exposed for each claim — never a full name, email, user id, or raw guest identity

