## MODIFIED Requirements

### Requirement: At viewport widths below 600px the row layout SHALL reflow into a vertically-stacked horizontal-card

`.item-list .item-container` and `.sortable-item .item-container` at `<600px` SHALL apply a grid template that stacks content vertically rather than compressing horizontally. The shape SHALL be: image (col `img`, spans rows 1–2), title (col `content` spanning to the card's right edge — `grid-column: 2 / -1` — row 1), price (same `2 / -1` span, row 2 — for a non-owner the store-metadata line joins the price on this row), description (col 1/-1, row 3, full-width), action row (row 4). The trailing grid column SHALL NOT reserve width on rows 1–2: title and price span across it, so the action row's contents alone determine its width.

The action row's contents are viewer-aware:

- **Non-owner:** the claim affordance ("Get this gift" with its full label — the previous `<600px` "Claim" short form is retired — or "Manage your claim") SHALL span the full action row (`grid-column: 1 / -1`) and stretch to the full row width. This stretch is page-scoped cell placement at `<600px` only; it does not alter the button primitive's dimension contract.
- **Owner:** left content (buy-link + `+N` trigger, or the claim button when one renders on an owned row, or the spoiler pill) SHALL span `grid-column: 1 / 3`; the owner-actions kebab SHALL occupy the trailing column (col 3) exclusively. No action-row occupant SHALL overlap or obscure the kebab.

The leader-dot `::after` SHALL be suppressed at this breakpoint. The leading slot (col `leading`) is the same column used by drag handle / checkbox surfaces.

#### Scenario: Mobile row stacks vertically instead of cramming horizontally

- **WHEN** the viewport is `<600px` and a row is rendered
- **THEN** the title and price SHALL stack on rows 1 and 2 right of the image, each spanning to the card's right edge with no reserved trailing-column width; the description SHALL render on row 3 spanning the full width; the viewer-aware action row SHALL render on row 4

#### Scenario: Non-owner mobile row shows metadata and a full-width claim button

- **WHEN** the viewport is `<600px` and a non-owner renders an unclaimed item with multiple stores
- **THEN** the store-metadata line SHALL render with the price (single line, `+N` truncation) and the "Get this gift" button SHALL render with its full label, spanning and stretching the full action row

#### Scenario: Leader dots are suppressed at mobile

- **WHEN** the viewport is `<600px`
- **THEN** the `::after` leader-dot pseudo-element on `.item-price-row` SHALL NOT render (display: none); the price stands alone on its row without a dotted leader

#### Scenario: Owner-actions kebab engages in the action row

- **WHEN** the viewport is `<600px` and the viewer is the owner
- **THEN** the kebab `<Menu>` SHALL be visible flush-right in the action-row trailing column, consistent with the universal-kebab requirement, and SHALL NOT be overlapped by any other action-row occupant

#### Scenario: Owner spoiler pill leaves the kebab cell free at mobile

- **WHEN** the viewport is `<600px`, the viewer owns the list, and `showSpoilerInfo` is true for an item with claims
- **THEN** the `.purchased-banner--spoiler` element SHALL span `grid-column: 1 / 3` on the action row, and the kebab SHALL remain visible and operable in the trailing column

### Requirement: The right column (col 5) SHALL be viewer-aware and SHALL be absorbed by a wide claimed pill when applicable

The right-most column of the row-view grid SHALL render different content per viewer state:

- Owner, no claim/spoiler state (all viewports): a kebab `<Menu>` trigger that opens the owner-actions menu (Edit, Archive when applicable, Remove from list in owned-list context — contents owned by the kebab requirement below). The former inline edit + archive icon pair is retired.
- Non-owner, unclaimed: a "Get this gift" primary button (full label at all viewports) that opens the purchase modal
- Non-owner, fully claimed by others: a disabled "✓ Fully claimed" pill in the same right-column cell as the other claim affordances (cols 3–4 are empty for a non-owner; spanning them would add their column gaps and misalign the pill); the card surface receives the muted/desaturated claimed treatment and the purchase modal SHALL NOT be openable from it
- Non-owner, viewer has a removable claim: an outline "Manage your claim" button that opens the purchase modal's already-claimed state (store row + remove-claim affordance); the price row shows the plain price with no metadata line

In row view at ≥600px, the right-column claim affordances ("Get this gift", "Manage your claim", the disabled "Fully claimed" pill) SHALL share a `min-width: 165px` floor so rows align across states. The floor SHALL NOT apply at `<600px`, where the mobile horizontal-card requirement gives claim affordances the full action row instead.
- Owner with spoilers active (revealed claim): NOT ABSORBED — the spoiler pill occupies col 3 only (same slot the buy-pill would have), leaving the owner-actions kebab cell free at all viewports. The wide-pill treatment would stomp on the owner-actions cell and obscure the owner's actions — the owner's primary intent at `/lists/[ownedId]?spoilers=on` is editing while seeing who claimed what, so the kebab SHALL remain visible.

#### Scenario: Owner sees the kebab trigger in col 5 at all viewports

- **WHEN** the viewer owns the list and the item is unclaimed, at any viewport width
- **THEN** column 5 SHALL contain the kebab `<Menu>` trigger and SHALL NOT contain inline edit or archive icon buttons

#### Scenario: Non-owner sees the Get this gift button in col 5

- **WHEN** the viewer does not own the list and no claim/spoiler state is active
- **THEN** column 5 SHALL contain a "Get this gift" primary button that opens the `?purchaseItem=<id>` purchase modal

#### Scenario: Fully-claimed state absorbs the right columns as a disabled wide pill

- **WHEN** the item is fully claimed by someone other than the viewer
- **THEN** a disabled "✓ Fully claimed" pill SHALL render in the right-column cell aligned with the other claim affordances (shared `min-width: 165px` floor at ≥600px), the card SHALL receive the muted claimed treatment, and activating the pill SHALL NOT open the purchase modal

#### Scenario: Viewer-claimed state offers Manage your claim

- **WHEN** the viewer has a removable claim on the item (their own claim, or one they recorded for someone else)
- **THEN** the card SHALL render an outline "Manage your claim" button, and activating the button SHALL open the purchase modal in its already-claimed state

#### Scenario: Owner-spoiler pill sits in col 3 only and does NOT absorb the right column

- **WHEN** the viewer owns the list and `showSpoilerInfo` is true (item has claims and spoilers are revealed for the owner)
- **THEN** the `.purchased-banner--spoiler` element SHALL apply `grid-column: 3` (not `3 / -1`), occupying only the buy-pill cell on rows 1–2; the kebab `.item-owner-actions-mobile` cell SHALL remain available at all viewports. The spoiler pill SHALL NOT overlap or obscure the kebab affordance.

#### Scenario: Claim-affordance width floor is scoped to ≥600px

- **WHEN** the viewport is `<600px`
- **THEN** the `min-width: 165px` floor SHALL NOT apply to `.claim-cta-btn`, `.manage-claim-btn`, or the claimed pill — their width is governed by the mobile horizontal-card action-row spans

#### Scenario: Footer banner is hidden in row view

- **WHEN** an item renders in row view (`.item-list` or `.sortable-item`)
- **THEN** the `.purchased-banner` / `.purchased-banner--mine` / `.purchased-banner--spoiler` footer SHALL be hidden via CSS (`display: none`). The same banners SHALL continue to render in grid view.
