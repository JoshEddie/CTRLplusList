## MODIFIED Requirements

### Requirement: List owners SHALL set visibility via a three-item radio menu

The list visibility UI SHALL present a popover triggered by a single visibility pill containing exactly three radio-style menu items, one per enum value. The UI labels SHALL be **Just me** (→ `'private'`), **Private** (→ `'unlisted'`), and **Shared** (→ `'public'`). Each menu row SHALL render an icon, the label, and a one-line description; the currently-selected row SHALL render a trailing `✓` indicator and SHALL have `aria-checked="true"`. Selecting a row invokes `setListVisibility(id, visibility)` with the value the row maps to. Only the list owner SHALL be authorized to change visibility.

The trigger pill SHALL display the currently-selected row's label verbatim (no qualifier suffix) alongside an icon (`🔒` for `'private'`, `🔗` for `'unlisted'`, `👥` for `'public'`). The pill's `aria-label` SHALL include the row's description for assistive-technology disambiguation.

#### Scenario: Owner sees three radio menu items

- **WHEN** an authenticated owner opens the visibility popover for their list
- **THEN** a menu renders with exactly three radio items in order — Just me, Private, Shared — and the item matching the current `visibility` value has `aria-checked="true"` and a trailing `✓` indicator

#### Scenario: Each row carries icon, label, and description

- **WHEN** the visibility menu is rendered
- **THEN** the Just me row shows `🔒 Just me` with description "Only I can see this list"; the Private row shows `🔗 Private` with description "Anyone with the link can view"; the Shared row shows `👥 Shared` with description "Visible to your followers"

#### Scenario: Selecting Just me sets private

- **WHEN** the owner activates the Just me row
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

## ADDED Requirements

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
