## MODIFIED Requirements

### Requirement: The right column (col 5) SHALL be viewer-aware and SHALL be absorbed by a wide claimed pill when applicable

The right-most region of the row-view grid SHALL host the `ItemActions` block — which actions render per viewer/claim state is owned by `item-actions`, replacing the former per-state right-column enumeration ("Get this gift", "Manage your claim", the disabled "✓ Fully claimed" pill, and their `min-width` floor). The owner-actions kebab SHALL keep its own final-column cell at all viewports (kebab contents owned by the kebab requirement). Two row-view rules survive unchanged:

- Claim pill rendered on an owner-side row (a claim revealed at tier `claims` or above, per `spoiler-visibility`): the pill occupies col 3 only (`grid-column: 3`, never `3 / -1`), leaving the owner-actions kebab cell free at all viewports — an owner-side viewer who has raised their claim visibility is there to edit while seeing what has been claimed, so the kebab SHALL remain visible.
- The `.purchased-banner` / `.purchased-banner--mine` / `.purchased-banner--spoiler` footer banners SHALL be hidden in row view (`display: none`) and SHALL continue to render in grid view.

The pill's render predicate SHALL key on the resolved tier rather than on ownership plus a spoiler parameter: it renders where the item carries claims the viewer's resolved tier discloses, which at `surprise` and `progress` is never and from `claims` upward is whenever claims exist.

#### Scenario: Owner-spoiler pill sits in col 3 only and does NOT absorb the right column

- **WHEN** an owner-side viewer's resolved tier is `claims` or above and the item carries claims, so the claim pill renders
- **THEN** the `.purchased-banner--spoiler` element SHALL apply `grid-column: 3` (not `3 / -1`), and the kebab cell SHALL remain available and unobscured at all viewports

#### Scenario: No pill renders under full protection

- **WHEN** an owner-side viewer's resolved tier is `surprise` or `progress` and the item carries claims by other parties
- **THEN** no claim pill renders, and the row is indistinguishable from one carrying no claims

#### Scenario: Footer banner is hidden in row view

- **WHEN** an item renders in row view (`.item-list` or `.sortable-item`)
- **THEN** the `.purchased-banner` family SHALL be hidden via CSS (`display: none`) while continuing to render in grid view

#### Scenario: Right region renders the matrix-decided actions

- **WHEN** a non-owner renders an unclaimed item in row view
- **THEN** the right region SHALL contain the `ItemActions` block for that state (per `item-actions`) and no state-specific affordance SHALL be branched outside it

### Requirement: At viewport widths below 600px the row layout SHALL reflow into a vertically-stacked horizontal-card

`.item-list .item-container` and `.sortable-item .item-container` at `<600px` SHALL apply a grid template that stacks content vertically rather than compressing horizontally. The shape SHALL be: image (col `img`, spans rows 1–2), title (col `content` spanning to the card's right edge — `grid-column: 2 / -1` — row 1), price line (same `2 / -1` span, row 2), description (col 1/-1, row 3, full-width), action row (row 4). The trailing grid column SHALL NOT reserve width on rows 1–2.

The action row SHALL host the `ItemActions` block (contents owned by `item-actions`), spanning the full action row for a non-owner. For an owner-side viewer, the block (or the claim pill when it renders) SHALL span `grid-column: 1 / 3` and the owner-actions kebab SHALL occupy the trailing column (col 3) exclusively — no action-row occupant SHALL overlap or obscure the kebab. The leader-dot `::after` SHALL be suppressed at this breakpoint.

#### Scenario: Mobile row stacks vertically instead of cramming horizontally

- **WHEN** the viewport is `<600px` and a row is rendered
- **THEN** the title and price line SHALL stack on rows 1 and 2 right of the image, each spanning to the card's right edge; the description SHALL render on row 3 spanning the full width; the `ItemActions` action row SHALL render on row 4

#### Scenario: Non-owner mobile actions span the action row

- **WHEN** the viewport is `<600px` and a non-owner renders a claimable item
- **THEN** the `ItemActions` block SHALL span and stretch the full action row

#### Scenario: Owner-actions kebab stays clear at mobile

- **WHEN** the viewport is `<600px` and the viewer is the owner
- **THEN** the kebab SHALL be visible and operable in the trailing action-row column and SHALL NOT be overlapped by the `ItemActions` block or the claim pill
