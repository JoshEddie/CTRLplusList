# home-digest Specification

## Purpose
TBD - created by archiving change add-following-and-history. Update Purpose after archive.
## Requirements
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

The **My Lists** rail SHALL show the viewer's owned lists ordered by `updated_at DESC`, limited to 5, with a **See all** link to `/lists` (the dedicated My Lists full page). The rail header SHALL NOT include a New list affordance — the **+ New List** CTA SHALL live on the `/lists` page's `<Header>`, not on the home rail.

#### Scenario: Owned lists shown newest-first

- **WHEN** an authenticated user with 10 owned lists loads `/`
- **THEN** the My Lists rail shows the 5 most-recently-updated lists with **See all** linking to `/lists`

#### Scenario: New list CTA is not on the home rail

- **WHEN** the home page renders the My Lists rail
- **THEN** the rail header contains the rail title, chevron, and "See all →" link only — no "+ New list" affordance

#### Scenario: New list CTA lives on /lists

- **WHEN** the user navigates to `/lists`
- **THEN** the page's `<Header>` contains a "+ New List" button linking to `/lists/new`

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

### Requirement: Rails SHALL render as horizontal-scrolling rows of fixed-width cards

Each rail's body SHALL render as a single horizontal-scrolling row (`overflow-x: auto`) of cards with fixed widths per breakpoint, NOT as a wrapping grid. Card width SHALL be 236px on standard desktop (≤1700px outer container), 260px on wide desktop (>1700px outer container), and 190px on mobile (when content padding is in compact mode).

#### Scenario: Rail body is a horizontal row

- **WHEN** a rail with multiple cards renders on any breakpoint
- **THEN** the cards lay out in a single row that scrolls horizontally when their total width exceeds the available container width

#### Scenario: Card width adapts to outer container

- **WHEN** the white-card frame's inner content area is at standard width (≤1700px)
- **THEN** rail cards render at 236px wide

- **WHEN** the white-card frame's inner content area is wide (>1700px)
- **THEN** rail cards render at 260px wide

- **WHEN** the viewport is mobile (compact mode)
- **THEN** rail cards render at 190px wide

#### Scenario: No row wrapping

- **WHEN** a rail contains 5 cards on a viewport that can fit only 3 at the configured card width
- **THEN** cards remain on a single row and the trailing cards are reached by horizontal scroll (no wrap to a second row)

### Requirement: Home rail cards SHALL render name, optional subtitle, occasion chip, and date

A rail card SHALL render the list name in Crimson Pro 300, an optional subtitle below the name when present, and a meta row at the bottom containing the occasion chip on the left and the date on the right. Text colors SHALL resolve from `--heading-text-color` (name), `--subtitle-text-color`, `--meta-text-color` (chip), and `--date-text-color`.

#### Scenario: Card renders all four slots

- **WHEN** a list with name "Christmas List 2025", subtitle "Brandy Family", occasion "Christmas", and date "Dec 25, 2025" is rendered as a rail card
- **THEN** the card shows the name in Crimson Pro, the subtitle below it, and a meta row with the occasion chip on the left and date on the right

#### Scenario: Card hides empty slots

- **WHEN** a list has no subtitle
- **THEN** the card renders without a subtitle line (the meta row sits directly below the name)

#### Scenario: Occasion chip is neutral

- **WHEN** any card with an occasion is rendered
- **THEN** the chip uses neutral colors (`--meta-text-color` text on `--secondary-background-color` chip background) regardless of which occasion type it represents

### Requirement: Rail card hover SHALL change appearance without translating

On pointer hover or keyboard focus, a rail card SHALL change its background color, border color, and shadow only. The card SHALL NOT translate, scale, or otherwise change its bounding box.

#### Scenario: Hover updates appearance, not position

- **WHEN** the user hovers a rail card
- **THEN** the card's background resolves to `--card-hover-background-color`, its border to `--card-border-hover-color`, and its shadow to `--card-shadow-hover`; the card's top/left position is unchanged

#### Scenario: Hover does not clip in scroll container

- **WHEN** the user hovers any card in a rail
- **THEN** no part of the card is clipped against the rail's `overflow-x` boundary (because no translation occurs)

### Requirement: Rails SHALL render a trailing "see more" tile when more entries exist

When a rail's underlying dataset contains more than 5 entries, the rail body SHALL render a trailing tile after the 5 shown items linking to the rail's `seeAllHref`. The tile SHALL match the dimensions and overall shape of the regular rail cards (same width per breakpoint, same border-radius, same border style — no dashed border), differentiated only by a faint brand-tinted background and centered "+N more →" copy where N is the remainder count (total minus 5). When the dataset contains 5 or fewer entries, the tile SHALL NOT render.

#### Scenario: Tile renders with remainder count when more exist

- **WHEN** the My Lists rail's underlying dataset contains 17 lists
- **THEN** the rail body renders the 5 most-recent lists followed by a trailing tile that reads "+12 more →" and links to `/lists`

#### Scenario: Tile is absent when 5 or fewer entries

- **WHEN** a rail's underlying dataset contains 5 or fewer entries
- **THEN** the rail body renders only the cards for those entries — no trailing "more" tile

#### Scenario: Tile matches rail card dimensions

- **WHEN** the trailing tile renders alongside regular cards in any rail
- **THEN** the tile occupies the same width slot as a regular card at the active breakpoint (236px / 260px / 190px) and shares the same border-radius and solid border style — no dashed border

#### Scenario: Tile is brand-tinted

- **WHEN** the trailing tile renders
- **THEN** the tile's background is a faint brand-tinted surface (visibly distinct from `--light-color` but quiet enough to feel like a sibling card) and the "+N more →" text uses `--primary-color`

