## MODIFIED Requirements

### Requirement: The items library page SHALL render only for an authenticated, resolvable viewer

The `/items` route SHALL resolve the viewer from the authenticated session's email via the data-access layer, and SHALL `redirect('/')` when there is no session email or the email resolves to no user. The library-mode `ItemsContainer` (invoked without a `listId`) SHALL apply the same guard before reading the viewer's items.

A resolvable viewer resolves to both an account and the profile their request acts as; a caller who resolves to no account resolves to no profile and takes the same redirect. The library's read is scoped by that profile, per the sibling requirement governing `ItemsContainer`.

This is a page-level React Server Component guard. It is complementary to — and does not overlap with — `server-endpoint-authorization`, which owns the authorization of server actions (`lib/data/*.actions.ts`) and API route handlers (`app/api/**`); page-RSC redirect guards are owned by this capability.

#### Scenario: No session email redirects to the landing page

- **WHEN** the `/items` route renders with a session that has no email (or no session)
- **THEN** it redirects to `/` and does not read or render any items

#### Scenario: Session email that resolves to no user redirects to the landing page

- **WHEN** the `/items` route renders with a session email that resolves to no user row
- **THEN** it redirects to `/`

#### Scenario: Library-mode ItemsContainer guards the same way

- **WHEN** `ItemsContainer` is invoked without a `listId` and the viewer is unauthenticated or unresolvable
- **THEN** it redirects to `/` rather than reading items

### Requirement: ItemsContainer SHALL route between list-scoped and library reads by the presence of listId

`ItemsContainer` SHALL, when given a `listId`, read items via the list-scoped read honoring the forwarded viewer, owner, and spoiler flags, and render the list-mode browser; when given no `listId`, it SHALL read the items owned by the **viewer's profile** — matching each item's owning profile against the profile the viewer's request acts as — and render the library view. The unauthenticated redirect guard SHALL apply only to the no-`listId` branch — a list-scoped read SHALL proceed for an unauthenticated viewer (with no viewer identity), leaving list visibility to the list-scoped read itself.

#### Scenario: A listId selects the list-scoped read and list-mode browser

- **WHEN** `ItemsContainer` is invoked with a `listId` plus owner / viewer / spoiler flags
- **THEN** it reads items scoped to that list with those flags and renders the list-mode browser

#### Scenario: No listId selects the viewer's items and the library view

- **WHEN** `ItemsContainer` is invoked without a `listId` for a resolved viewer
- **THEN** it reads the items whose owning profile is the profile the viewer's request acts as, and renders the library view

#### Scenario: The list branch does not redirect an unauthenticated viewer

- **WHEN** `ItemsContainer` is invoked with a `listId` but no authenticated viewer
- **THEN** it does not redirect and performs the list-scoped read with no viewer identity
