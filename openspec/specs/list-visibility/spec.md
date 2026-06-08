# list-visibility Specification

## Purpose

TBD - created by archiving change add-following-and-history. Update Purpose after archive.

## Requirements

### Requirement: Lists SHALL have a three-state visibility model

Every list SHALL have a `visibility` value of exactly one of `'private'`, `'unlisted'`, or `'public'`, persisted in `lists.visibility`. A `private` list is visible only to its owner. An `unlisted` list is visible to anyone with the URL but does NOT appear in any feed. A `public` list is visible to anyone with the URL AND appears in the feeds of users who follow the owner.

#### Scenario: Private list inaccessible to non-owners

- **WHEN** a non-owner (authenticated or not) navigates to `/lists/[id]` for a list with `visibility = 'private'`
- **THEN** the system renders the private-list interstitial (existing behavior) and does NOT expose the list's contents

#### Scenario: Unlisted list accessible by URL only

- **WHEN** a non-owner navigates to `/lists/[id]` for a list with `visibility = 'unlisted'`
- **THEN** the list renders normally for the viewer, and the list does NOT appear in any follower feed regardless of follow relationships

#### Scenario: Public list accessible by URL and in follower feeds

- **WHEN** a list has `visibility = 'public'` and the owner has at least one follower
- **THEN** the list is URL-accessible to anyone AND the list is included in each follower's Following feed sources

### Requirement: `shared_at` SHALL only update on the `private → non-private` transition

`lists.shared_at` is a nullable timestamp representing when the list first entered circulation. It SHALL be set to `NOW()` only when `visibility` transitions from `'private'` to `'unlisted'` or `'public'`. It SHALL NOT update on transitions between `'unlisted'` and `'public'`. It SHALL be set to `NULL` on any transition back to `'private'`.

#### Scenario: First share sets shared_at

- **WHEN** an owner changes a list from `'private'` to `'unlisted'` (or `'public'`)
- **THEN** `lists.shared_at` is set to the current time

#### Scenario: Toggling between unlisted and public does not reset shared_at

- **WHEN** an owner changes a list from `'unlisted'` to `'public'` (or vice versa)
- **THEN** `lists.shared_at` retains its prior value

#### Scenario: Returning to private clears shared_at

- **WHEN** an owner changes a list from `'unlisted'` or `'public'` back to `'private'`
- **THEN** `lists.shared_at` is set to NULL

#### Scenario: Re-sharing after private gets a fresh shared_at

- **WHEN** an owner cycles `'public' → 'private' → 'public'`
- **THEN** the second `'public'` state has a fresh `shared_at` equal to the current time, not the original value

### Requirement: List owners SHALL set visibility via a three-item radio menu

The list visibility UI SHALL present a popover triggered by a single visibility pill containing exactly three radio-style menu items, one per enum value. The UI labels SHALL be **Hidden** (→ `'private'`), **Private** (→ `'unlisted'`), and **Shared** (→ `'public'`). Each menu row SHALL render an icon, the label, and a one-line description; the currently-selected row SHALL render a trailing `✓` indicator and SHALL have `aria-checked="true"`. Selecting a row invokes `setListVisibility(id, visibility)` with the value the row maps to. Only the list owner SHALL be authorized to change visibility.

The row descriptions SHALL be: **Hidden** — "Only you can see this list"; **Private** — "Only people with the link can view"; **Shared** — "Anyone with the link — plus your followers see it in their feed". The Shared description SHALL frame follower visibility as an addition to link access, not a restriction, so it cannot be read as followers-only.

The trigger pill SHALL display the currently-selected row's label verbatim (no qualifier suffix) alongside an icon (`🔒` for `'private'`, `🔗` for `'unlisted'`, `👥` for `'public'`). The pill's `aria-label` SHALL include the row's description for assistive-technology disambiguation.

#### Scenario: Owner sees three radio menu items

- **WHEN** an authenticated owner opens the visibility popover for their list
- **THEN** a menu renders with exactly three radio items in order — Hidden, Private, Shared — and the item matching the current `visibility` value has `aria-checked="true"` and a trailing `✓` indicator

#### Scenario: Each row carries icon, label, and description

- **WHEN** the visibility menu is rendered
- **THEN** the Hidden row shows `🔒 Hidden` with description "Only you can see this list"; the Private row shows `🔗 Private` with description "Only people with the link can view"; the Shared row shows `👥 Shared` with description "Anyone with the link — plus your followers see it in their feed"

#### Scenario: Selecting Hidden sets private

- **WHEN** the owner activates the Hidden row
- **THEN** `setListVisibility(id, 'private')` is invoked

#### Scenario: Selecting Private sets unlisted

- **WHEN** the owner activates the Private row
- **THEN** `setListVisibility(id, 'unlisted')` is invoked

#### Scenario: Selecting Shared sets public

- **WHEN** the owner activates the Shared row
- **THEN** `setListVisibility(id, 'public')` is invoked

#### Scenario: Trigger pill label matches selected row

- **WHEN** the list's current `visibility` is `'unlisted'`
- **THEN** the visibility pill renders the icon `🔗` and the label `Private` (no `·`-qualifier)

#### Scenario: Re-selecting the current row is a no-op

- **WHEN** the owner activates the row whose value already matches the list's current `visibility`
- **THEN** no `setListVisibility` call is made (the picker treats it as a no-op, consistent with the existing `apply` early-return in `VisibilityPicker.tsx`)

#### Scenario: Non-owner submission is rejected

- **WHEN** a `setListVisibility` request is made by a non-owner
- **THEN** the action returns an unauthorized response and `lists.visibility` is unchanged

### Requirement: Migration SHALL preserve existing share state without retroactive broadcast

The migration adding `lists.visibility` SHALL map `shared = false` to `'private'` and `shared = true` to `'unlisted'`. It SHALL NOT promote any existing list to `'public'` automatically. `shared_at` SHALL backfill to `created_at` for migrated `'unlisted'` lists and remain NULL for migrated `'private'` lists. The `lists.shared` column SHALL NOT be modified or dropped by this migration; it remains in place during the soak and is dropped by a follow-up change.

#### Scenario: Existing shared list becomes unlisted

- **WHEN** the migration runs against a list with `shared = true, created_at = T`
- **THEN** the row's new state is `visibility = 'unlisted', shared_at = T, shared = true` (the `shared` value is unchanged)

#### Scenario: Existing private list stays private

- **WHEN** the migration runs against a list with `shared = false`
- **THEN** the row's new state is `visibility = 'private', shared_at = NULL, shared = false` (the `shared` value is unchanged)

#### Scenario: `lists.shared` column is preserved

- **WHEN** the migration completes
- **THEN** the `lists.shared` column still exists and every row's `shared` value matches its pre-migration value

### Requirement: `setListVisibility` SHALL dual-write to the legacy `shared` column

For the duration of the soak, `setListVisibility` SHALL update both `visibility` and `lists.shared` in the same statement. The `shared` write is derived: `shared = (visibility != 'private')`. This ensures that any list whose visibility is changed via dev's code path is visible to main's reads with consistent semantics. Dev code SHALL NOT read from `lists.shared`; the dual-write exists solely for main's compatibility.

#### Scenario: Public via dev sets shared to true

- **WHEN** dev's `setListVisibility(id, 'public')` runs against a list previously `private`
- **THEN** the row's new state has `visibility = 'public'` AND `shared = true`

#### Scenario: Unlisted via dev sets shared to true

- **WHEN** dev's `setListVisibility(id, 'unlisted')` runs against a list previously `private`
- **THEN** the row's new state has `visibility = 'unlisted'` AND `shared = true`

#### Scenario: Private via dev sets shared to false

- **WHEN** dev's `setListVisibility(id, 'private')` runs against a list previously `public` or `unlisted`
- **THEN** the row's new state has `visibility = 'private'` AND `shared = false`

#### Scenario: Dev does not read `lists.shared`

- **WHEN** an automated grep is run across `app/` and `lib/` for `lists.shared`
- **THEN** the only matches are inside `setListVisibility`'s UPDATE statement; no reads exist elsewhere in dev code

### Requirement: All list pages SHALL be marked noindex and non-public lists SHALL NOT leak names in metadata to non-owners

The list detail route at `/lists/[id]` SHALL emit a `<meta name="robots" content="noindex, nofollow">` directive (via Next.js `Metadata.robots`) for **every** list, regardless of `visibility`. The product has no stranger-discoverability mode: `'public'` (Shared) broadcasts to followers, `'unlisted'` (Private) is link-only, and `'private'` (Just me) is owner-only — none of these states are intended to be findable via web search.

Additionally, when a list with `visibility !== 'public'` is requested and the requester is not the list owner, the route's `generateMetadata` SHALL return a generic title (`"List"` or equivalent constant) and SHALL omit the `openGraph` and `twitter` metadata blocks entirely, so the list's `name` and other identifying details do not appear in the served HTML head (mitigating leaks via link unfurlers / crawler-pinging services that may not honor `noindex`). Owners viewing their own list SHALL receive the full metadata regardless of visibility, so their own social shares card-up correctly. `'public'` (Shared) lists serve full metadata to all viewers — the owner has deliberately broadcast it — but the page is still noindex.

The visibility check inside `generateMetadata` SHALL use the same `auth()` and `getList(id)` paths as the page render, and SHALL fail closed: if the visibility cannot be resolved (e.g. list not found, fetch error), generic metadata is returned with the noindex directive.

#### Scenario: Private list serves noindex to all viewers

- **WHEN** any request (authenticated or anonymous) hits `/lists/[id]` for a list with `visibility = 'private'`
- **THEN** the response's HTML head includes `<meta name="robots" content="noindex, nofollow">` (or the equivalent Next-emitted form)

#### Scenario: Unlisted list serves noindex to all viewers

- **WHEN** any request hits `/lists/[id]` for a list with `visibility = 'unlisted'`
- **THEN** the response's HTML head includes `<meta name="robots" content="noindex, nofollow">`

#### Scenario: Public list also serves noindex

- **WHEN** any request hits `/lists/[id]` for a list with `visibility = 'public'`
- **THEN** the response's HTML head includes `<meta name="robots" content="noindex, nofollow">` — `'public'` (Shared) broadcasts to followers within the app, not to the open web, so the page is not indexable

#### Scenario: Non-owner of private list gets generic metadata

- **WHEN** a non-owner (authenticated or anonymous) requests `/lists/[id]` for a list with `visibility = 'private'`
- **THEN** the served `<title>` is the generic constant (e.g. `"List | ctrl+list"`) and no `og:title` / `og:image` / `twitter:title` fields containing the list's `name` are emitted

#### Scenario: Non-owner of unlisted list gets generic metadata

- **WHEN** a non-owner requests `/lists/[id]` for a list with `visibility = 'unlisted'`
- **THEN** the served `<title>` is the generic constant and no `og:title` / `og:image` / `twitter:title` fields containing the list's `name` are emitted

#### Scenario: Owner viewing own non-public list gets full metadata

- **WHEN** the list owner is authenticated and requests their own list with `visibility = 'private'` or `'unlisted'`
- **THEN** the served `<title>` and OG / Twitter blocks contain the full list name and preview image (matching today's behavior for that owner), and the response still includes the `noindex` robots directive

#### Scenario: Public list serves full metadata to all viewers

- **WHEN** any request hits `/lists/[id]` for a list with `visibility = 'public'`
- **THEN** the served `<title>` and OG / Twitter blocks contain the full list name and preview image regardless of viewer identity (the owner has deliberately broadcast it; link unfurlers will card-up correctly), and the response still includes the `noindex` robots directive

#### Scenario: List not found returns generic metadata

- **WHEN** a request hits `/lists/[id]` for an id that does not resolve to a list (or `getList` throws)
- **THEN** `generateMetadata` returns the generic title with `robots: { index: false, follow: false }` and no OG / Twitter blocks

### Requirement: `setListVisibility` SHALL fail-closed re-validate the visibility argument before any DB access

`setListVisibility(id, visibility)` SHALL validate `visibility` against the canonical `VISIBILITY_VALUES` enum (via `VisibilitySchema.safeParse`) and, on a value outside that enum, SHALL return `{ success: false, error: 'Validation' }` **before** reading the target list and **before** issuing any UPDATE. The re-validation SHALL occur even though the function's TypeScript parameter is typed `ListVisibility`, because as a `'use server'` action the argument crosses the network boundary from an untrusted client where the static type is erased. A rejected value SHALL leave the target row's `visibility`, `shared`, and `shared_at` columns entirely unchanged, and SHALL NOT trigger `updateTag('lists')`.

#### Scenario: Out-of-enum value is rejected before any write

- **WHEN** an authenticated owner calls `setListVisibility(id, v)` where `v` is not one of `'private' | 'unlisted' | 'public'` (e.g. `'owner'`, `'admin'`, or `''`)
- **THEN** the action returns `{ success: false, error: 'Validation' }`
- **AND** the target list's `visibility`, `shared`, and `shared_at` are identical to their pre-call values
- **AND** `updateTag('lists')` is not called

#### Scenario: Validation precedes the ownership/existence lookup

- **WHEN** `setListVisibility` is called with an out-of-enum `visibility` value, regardless of whether `id` refers to a real list or whether the caller owns it
- **THEN** the action returns the `'Validation'` error without the outcome depending on the list's existence or ownership (validation fails closed first)

### Requirement: `VisibilityPicker` SHALL apply visibility optimistically and roll back on failure

When the list owner selects a visibility row, `VisibilityPicker` SHALL advance its local trigger state to the selected value immediately (optimistic update), close the menu, and invoke `setListVisibility(listId, next)` inside a React transition. The optimistic update guarantees the trigger pill never displays a visibility the owner did not just choose while the request is in flight.

On a **failed** result (`{ success: false }`), the picker SHALL roll the trigger state back to the value it held before the selection and surface `toast.error(result.message)`. It SHALL NOT call `router.refresh()` on the failure path — a failed change leaves the persisted visibility unchanged, so the on-screen pill SHALL be restored to match, never left showing the un-applied value.

On a **successful** result (`{ success: true }`), the picker SHALL surface the selected row's success toast (`rowFor(next).toast` — e.g. "Shared — your followers can now find it" for the Shared row) and call `router.refresh()` to revalidate the page against the new visibility.

While a change is pending, the menu rows SHALL be disabled so a second selection cannot race the in-flight transition. (Re-selecting the row whose value already matches the current visibility is a no-op, owned by the existing three-item-radio-menu requirement; this requirement governs only the apply/rollback path for an actual change.)

#### Scenario: Successful apply keeps the optimistic value and refreshes

- **WHEN** the owner selects a different visibility row and `setListVisibility` returns `{ success: true }`
- **THEN** `setListVisibility(listId, next)` is invoked with the selected row's value
- **AND** the trigger pill shows the selected row's label
- **AND** the selected row's success toast is shown and `router.refresh()` is called

#### Scenario: Failed apply rolls the pill back and toasts the error

- **WHEN** the owner selects a different visibility row and `setListVisibility` returns `{ success: false, message }`
- **THEN** the trigger pill is restored to the visibility it showed before the selection
- **AND** `toast.error(message)` is shown
- **AND** `router.refresh()` is NOT called

#### Scenario: A pending change disables the menu rows

- **WHEN** a visibility change is in flight (the transition has not resolved)
- **THEN** the menu rows are disabled
