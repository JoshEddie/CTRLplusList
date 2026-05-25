## ADDED Requirements

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
