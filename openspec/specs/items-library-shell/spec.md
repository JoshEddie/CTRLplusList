# items-library-shell Specification

## Purpose

TBD - created by syncing change test-items-library-shell. Update Purpose after sync.

## Requirements

### Requirement: The items library page SHALL render only for an authenticated, resolvable viewer

The `/items` route SHALL resolve the viewer from the authenticated session's email via the data-access layer, and SHALL `redirect('/')` when there is no session email or the email resolves to no user. The library-mode `ItemsContainer` (invoked without a `listId`) SHALL apply the same guard before reading the viewer's items.

This is a page-level React Server Component guard. It is complementary to — and does not overlap with — `server-endpoint-authorization`, which owns the authorization of server actions (`app/actions/**`) and API route handlers (`app/api/**`); page-RSC redirect guards are owned by this capability.

#### Scenario: No session email redirects to the landing page

- **WHEN** the `/items` route renders with a session that has no email (or no session)
- **THEN** it redirects to `/` and does not read or render the viewer's items

#### Scenario: Session email that resolves to no user redirects to the landing page

- **WHEN** the `/items` route renders with a session email that resolves to no user row
- **THEN** it redirects to `/`

#### Scenario: Library-mode ItemsContainer guards the same way

- **WHEN** `ItemsContainer` is invoked without a `listId` and the viewer is unauthenticated or unresolvable
- **THEN** it redirects to `/` rather than reading items

### Requirement: The reveal-purchases URL parameter SHALL control spoiler disclosure for the library read

The `/items` route SHALL treat the `purchases` search parameter value `reveal` or `only` as a request to reveal purchase spoilers, passing `showSpoilers = true` into the items read; any other value, or an absent parameter, SHALL keep spoilers hidden (`showSpoilers = false`).

#### Scenario: reveal and only reveal spoilers

- **WHEN** the URL contains `?purchases=reveal` or `?purchases=only`
- **THEN** the active and archived item reads are performed with `showSpoilers = true`

#### Scenario: Any other or absent value hides spoilers

- **WHEN** the `purchases` parameter is absent or holds any value other than `reveal` / `only` (for example `hide` or `none`)
- **THEN** the item reads are performed with `showSpoilers = false`

### Requirement: The server shell SHALL seed the initial page size from the items_page_size cookie with the same normalization as the client writer

The items-library server shell SHALL read the `items_page_size` cookie and use its value as the initial page size only when it is one of the allowed options `{12, 24, 48, 96}`; any other value — absent, non-numeric, or off-list — SHALL normalize to `DEFAULT_PAGE_SIZE` (24).

This is the server READ half of the cross-request page-size contract whose client WRITE half (cookie name, attributes, and option set) is owned by `items-browser-chrome`. The cookie name and the allowed option set are the contract; a divergence on either side would silently reset the viewer's page-size preference on every navigation.

#### Scenario: A valid option seeds the initial page size

- **WHEN** the `items_page_size` cookie holds `48`
- **THEN** the initial page size forwarded to the items view is `48`

#### Scenario: An off-list or unparseable value normalizes to the default

- **WHEN** the `items_page_size` cookie is absent, non-numeric, or holds a value not in `{12, 24, 48, 96}`
- **THEN** the initial page size forwarded to the items view is `DEFAULT_PAGE_SIZE` (24)

### Requirement: The library SHALL load active and archived items independently and partition them by the tab parameter

The `/items` route SHALL load the viewer's active and archived item sets independently. The library tab shell SHALL show the set matching the `tab` parameter (`archived` selects the archived set; any other value or an absent parameter selects the active set), SHALL label each tab control with the count of its own set, and SHALL render the tab-appropriate empty state: the active tab's empty state offers the new-item affordance, while the archived tab's empty state is its own distinct message and does NOT offer the new-item affordance. Switching tabs SHALL remove the `page` parameter from the URL and SHALL navigate via a history-replacing navigation.

#### Scenario: The tab parameter selects the visible set

- **WHEN** the URL contains `?tab=archived`
- **THEN** the archived set is shown; **and WHEN** `tab` is `active` or absent, the active set is shown

#### Scenario: Each tab is labelled with its own count

- **WHEN** the library renders with N active items and M archived items
- **THEN** the active tab control shows the active count N and the archived tab control shows the archived count M, with the active tab's `aria-selected` reflecting the current tab

#### Scenario: Empty states differ by tab

- **WHEN** the active tab has no items
- **THEN** the active-tab empty state renders and offers the new-item affordance
- **AND WHEN** the archived tab has no items
- **THEN** the archived-tab empty state renders its own distinct message without a new-item affordance

#### Scenario: Switching tabs resets the page and replaces history

- **WHEN** the viewer switches from one tab to the other
- **THEN** the navigation removes the `page` parameter and replaces the history entry (it does not push a new one)

### Requirement: ItemsContainer SHALL route between list-scoped and library reads by the presence of listId

`ItemsContainer` SHALL, when given a `listId`, read items via the list-scoped read honoring the forwarded viewer, owner, and spoiler flags, and render the list-mode browser; when given no `listId`, it SHALL read the viewer's items and render the library view. The unauthenticated redirect guard SHALL apply only to the no-`listId` branch — a list-scoped read SHALL proceed for an unauthenticated viewer (with no viewer id), leaving list visibility to the list-scoped read itself.

#### Scenario: A listId selects the list-scoped read and list-mode browser

- **WHEN** `ItemsContainer` is invoked with a `listId` plus owner / viewer / spoiler flags
- **THEN** it reads items scoped to that list with those flags and renders the list-mode browser

#### Scenario: No listId selects the viewer's items and the library view

- **WHEN** `ItemsContainer` is invoked without a `listId` for a resolved viewer
- **THEN** it reads the viewer's items and renders the library view

#### Scenario: The list branch does not redirect an unauthenticated viewer

- **WHEN** `ItemsContainer` is invoked with a `listId` but no authenticated viewer
- **THEN** it does not redirect and performs the list-scoped read with no viewer id
