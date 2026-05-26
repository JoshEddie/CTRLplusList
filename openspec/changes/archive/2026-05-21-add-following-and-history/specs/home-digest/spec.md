## ADDED Requirements

### Requirement: Home page SHALL render four collapsible rails as a digest

The home page (`/`) SHALL render four rails in the following order: **My Lists**, **Following**, **Bookmarks**, **Recently visited**. Each rail SHALL show at most the 5 most-recent entries and SHALL include a **See all** link to a dedicated full-results page. Each rail SHALL be collapsible via a chevron toggle in the rail header.

#### Scenario: Rails render in order

- **WHEN** an authenticated user loads `/`
- **THEN** the page renders, in this order, the My Lists, Following, Bookmarks, and Recently visited rails

#### Scenario: Each rail caps at 5 entries

- **WHEN** a rail's underlying data set contains more than 5 entries
- **THEN** only the top 5 (per the rail's sort order) are rendered, and a **See all** link appears in the rail header

#### Scenario: Collapse toggle

- **WHEN** the user clicks the chevron in a rail header
- **THEN** the rail's body hides (or shows) and a `localStorage` value `home.rail.<name>.open` is set to the new state

#### Scenario: Collapse state persists across reload

- **WHEN** the user collapses a rail and reloads the page
- **THEN** the rail renders in its collapsed state on next render based on `localStorage`

#### Scenario: Default state is open

- **WHEN** no `localStorage` value exists for a rail
- **THEN** the rail renders open

### Requirement: My Lists rail SHALL show the user's most recent owned lists

The **My Lists** rail SHALL show the viewer's owned lists ordered by `updated_at DESC`, limited to 5, with a **See all** link to `/lists` (the existing full-list page). The rail header SHALL include a **New list** affordance routing to `/lists/new`.

#### Scenario: Owned lists shown newest-first

- **WHEN** an authenticated user with 10 owned lists loads `/`
- **THEN** the My Lists rail shows the 5 most-recently-updated lists with **See all** linking to `/lists`

### Requirement: Following rail SHALL show user cards sorted by recency of their latest public list

The **Following** rail SHALL show user cards (avatar + name) for users the viewer follows, sorted by `MAX(shared_at)` over each followee's `'public'` lists in descending order. Users with no `'public'` lists are sorted last by name. Each card SHALL show a "N new" badge if N > 0 (per the `last_seen_following_at` rule in the `following` capability). The card SHALL link to `/u/[id]`. A **See all** link in the rail header SHALL route to `/following`.

#### Scenario: Active followee sorted first

- **WHEN** viewer follows users A and B; A's most recent public list has `shared_at = T1`, B's has `shared_at = T2 < T1`
- **THEN** A's card precedes B's in the Following rail

#### Scenario: Followee with no public lists

- **WHEN** viewer follows user C who has no `'public'` lists
- **THEN** C's card appears in the rail (sorted after followees with public lists) with no "N new" badge

#### Scenario: See all link

- **WHEN** the user clicks See all on the Following rail
- **THEN** the user navigates to `/following`

### Requirement: Bookmarks rail SHALL show bookmarked lists newest-first

The **Bookmarks** rail SHALL show list cards for lists in the viewer's `list_visits` where `favorited_at IS NOT NULL`, ordered by `favorited_at DESC`, limited to 5. A **See all** link in the rail header SHALL route to `/lists/bookmarks`.

#### Scenario: Bookmarked lists shown newest-first

- **WHEN** an authenticated user has 7 bookmarks
- **THEN** the Bookmarks rail shows the 5 most-recently-bookmarked lists with See all → `/lists/bookmarks`

#### Scenario: Empty Bookmarks rail

- **WHEN** the user has no bookmarks
- **THEN** the rail renders an empty-state message (and remains collapsible)

### Requirement: Recently visited rail SHALL include bookmarked lists with a visible indicator

The **Recently visited** rail SHALL show list cards for the viewer's `list_visits` ordered by `last_visited_at DESC`, limited to 5. Bookmarked lists SHALL NOT be excluded; they SHALL render with a visible 🔖 indicator on the card. A **See all** link in the rail header SHALL route to `/lists/history`.

#### Scenario: Bookmarked list also appears in Recently visited

- **WHEN** a user bookmarks a list and it is also among their 5 most-recently-visited lists
- **THEN** the list appears in BOTH the Bookmarks rail AND the Recently visited rail; the latter renders the 🔖 indicator on the card

#### Scenario: Order independent of bookmark state

- **WHEN** two visit rows exist, one bookmarked at `T1` and visited at `T2 < T1`, the other non-bookmarked and visited at `T3 > T2`
- **THEN** the non-bookmarked list precedes the bookmarked list in the Recently visited rail (sort is purely by `last_visited_at`)

### Requirement: A one-time migration toast SHALL explain the bookmark rename

After the schema migration replacing `saved_lists` with `list_visits`, the home page SHALL render a one-time dismissible toast informing users that "Saved lists are now Bookmarks" and pointing to the Bookmarks rail. Dismissal SHALL be stored in `localStorage` key `home.bookmark-migration-toast.dismissed`.

#### Scenario: First-render shows toast

- **WHEN** an authenticated user loads `/` for the first time after the migration deploy
- **THEN** a toast renders explaining the rename

#### Scenario: Dismissed toast does not return

- **WHEN** the user dismisses the toast
- **THEN** subsequent home renders do not show it; the `localStorage` flag is set

#### Scenario: Users without any saved lists also see the toast at most once

- **WHEN** a user without prior saved lists loads `/` for the first time after deploy
- **THEN** the same toast renders once and follows the same dismissal rules (acceptable trade-off; the toast is generic enough to be informative for new users too)
