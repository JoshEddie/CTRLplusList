## MODIFIED Requirements

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

## ADDED Requirements

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
