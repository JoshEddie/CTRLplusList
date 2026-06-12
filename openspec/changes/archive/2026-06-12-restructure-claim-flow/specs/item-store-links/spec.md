# item-store-links — delta for restructure-claim-flow

## ADDED Requirements

### Requirement: Store links SHALL render as direct navigation only for the item owner

On viewer-facing surfaces (grid card and row view at `/lists/[id]` when the viewer is not the item owner), no store link SHALL render as a direct navigation affordance. Instead, store names SHALL render as an inert metadata line in the price row: the price followed by up to two store names separated by `·`, with remaining valid stores collapsed to a `+N` count (e.g. `$35.50 · Amazon · Target +1`). When two names do not fit the available line width, the line SHALL drop to one named store and grow the count (`Crate & Barrel · Williams Sonoma +1` becomes `Crate & Barrel +2`), restoring the second name when width allows again. The metadata line SHALL be muted text with no border, hover state, external-link icon, or tap affordance — the card body is inert and the "Get this gift" button is the sole modal-opening affordance. Store names SHALL come only from valid stores (per the existing validity requirement) in price-ascending order, so the named stores are the cheapest. The metadata line SHALL render only in the unclaimed state — the fully-claimed and viewer-claimed card treatments replace it (see the modified right-column requirement).

Owner-facing surfaces (items library row view, sortable owner edit, choose-items picker, and the owner's own rendering of their list) SHALL continue to render the existing `.storeLinks` chip row (primary buy-link + `+N` popover) — there is no claim-leak problem when the viewer owns the item — EXCEPT in the spoiler-enabled (reveal-purchases) view: there the claim affordance / spoiler state replaces the chip row on every item, and the owner reaches store links through the purchase modal's store row like any other viewer.

#### Scenario: Non-owner card renders store names as inert metadata

- **WHEN** a non-owner views an unclaimed item with valid stores Amazon ($35.50), Target ($38.00), Etsy ($41.00)
- **THEN** the price row SHALL read `$35.50 · Amazon · Target +1`, no element of it SHALL be an anchor or button, and no `.storeLinks` chip row SHALL render

#### Scenario: Metadata taps do nothing

- **WHEN** a non-owner taps the store-name metadata text on an unclaimed item card
- **THEN** nothing SHALL happen — no store URL is navigated to and the purchase modal does not open; only the "Get this gift" button opens the modal

#### Scenario: Single-store item names only that store

- **WHEN** a non-owner views an unclaimed item with exactly one valid store
- **THEN** the metadata line SHALL read `{price} · {store}` with no `+N` suffix

#### Scenario: Owner surfaces keep direct buy links

- **WHEN** the item owner views the items library, the sortable owner edit view, or the choose-items picker with spoilers disabled
- **THEN** the `.storeLinks` chip row SHALL render with the primary buy-link as a live `target="_blank"` anchor and the `+N` popover per this capability's existing requirements

#### Scenario: Owner spoiler view hides the chip row

- **WHEN** the item owner views their items with spoilers (reveal purchases) enabled
- **THEN** no `.storeLinks` chip row SHALL render — claimable items show the claim affordance (whose modal carries the store row) and claimed items show the spoiler state

#### Scenario: Scan parity is preserved

- **WHEN** a non-owner skims a list of items in grid or row view
- **THEN** every unclaimed item's cheapest store names SHALL be readable in its price row without opening anything — the same store-name information the chip row carried before

### Requirement: The purchase modal store row SHALL be the non-owner's sole direct store navigation

The purchase modal SHALL open with a store row directly below its header in every viewer variant (signed-in friend, guest, owner, already-claimed). The store row SHALL render the cheapest valid store as a `<LinkButton target="_blank" rel="noreferrer">` carrying the buy-link chip treatment (the `storeLinks-link` colors — visually subordinate to the claim CTA) and, when more than one valid store exists, a `+N stores` trigger opening a `<Menu>` containing one `<MenuLinkItem>` per valid store (including the primary) with name and `$X.XX` price, sorted price-ascending — the same content contract as the card popover. The trigger SHALL support the same hover-open with collapse grace as the card popover, in addition to click/tap. While the store menu is open, Escape SHALL close the menu (per the `<Menu>` contract) and SHALL NOT close the modal. When an item has no valid store, the store row SHALL render nothing and the claim sections SHALL render unaffected.

#### Scenario: Store row renders in every modal variant

- **WHEN** the purchase modal opens for any viewer (friend, guest, owner with spoilers on or off, viewer with an existing claim) on an item with at least one valid store
- **THEN** the store row SHALL render below the modal header with the cheapest store as a buy-link-styled `<LinkButton>` opening in a new tab

#### Scenario: +N stores menu lists all valid stores

- **WHEN** the modal store row's `+N stores` trigger is activated on an item with M valid stores
- **THEN** a `<Menu>` SHALL open containing exactly M `<MenuLinkItem>` rows with name and price, price-ascending, each `target="_blank" rel="noreferrer"`

#### Scenario: Escape closes the store menu, not the modal

- **WHEN** the store menu is open inside the modal and the user presses Escape
- **THEN** the menu SHALL close, focus SHALL return to the `+N stores` trigger, and the modal SHALL remain open

#### Scenario: Store-less item renders claim sections without a store row

- **WHEN** the purchase modal opens on an item with no valid store
- **THEN** no store row or store menu SHALL render and the viewer-appropriate claim section SHALL render normally

## MODIFIED Requirements

### Requirement: The store-links row SHALL render in a single line at all times

The chip row on every surface where it renders (owner-facing surfaces — items library row view, sortable owner edit, choose-items picker, and the owner's own rendering of their list; see the viewer-scoping requirement) SHALL be exactly one line tall. The card's height SHALL be invariant to the number of stores attached to the item and invariant to whether the extra-stores popover is open or closed. Cards in the same `.item-grid` row SHALL NOT change height when a neighboring card's popover opens. On non-owner viewer surfaces the chip row does not render at all; the store-metadata line there SHALL likewise be a single line (`+N` truncation, no wrapping).

#### Scenario: Single-store item renders one full-width primary chip

- **WHEN** an item with exactly one valid store is rendered on an owner-facing surface
- **THEN** `.storeLinks` SHALL set `grid-template-columns: 1fr` (or equivalent) so the primary buy-link chip stretches to fill the row width, and no `+N` trigger SHALL be rendered

#### Scenario: Multi-store item renders primary chip plus +N trigger

- **WHEN** an item with two or more valid stores is rendered on an owner-facing surface
- **THEN** `.storeLinks` SHALL set `grid-template-columns: 1fr auto` (or equivalent) so the primary buy-link chip stretches to fill the remaining width and the `+N` trigger sizes to its content

#### Scenario: Card height does not change when popover opens

- **WHEN** the user opens the extras popover on any card in a grid row
- **THEN** that card's rendered height SHALL be identical to its height when the popover is closed, and every other card in the same grid row SHALL retain its height

#### Scenario: Metadata line never wraps

- **WHEN** a non-owner views an unclaimed item with five valid stores at any viewport width
- **THEN** the store-metadata line SHALL render on a single line using the `+N` truncation (at most two named stores, dropping to one when two don't fit), with no second-line wrapping

### Requirement: The row layout (list view and sortable owner edit) SHALL render the new compact two-row anatomy at ≥600px

`.item-list .item-container` and `.sortable-item .item-container` SHALL use an outer grid with template `52px 1fr auto auto auto / auto auto`. Inner children (`.item`, `.item-info`) SHALL participate in the outer grid via `display: contents`. The visual anatomy SHALL be viewer-aware:

- **Owner viewer:** image (col 1, spans both rows) — name (col 2, row 1) — price + leader dots (col 2, row 2) — tall buy-link pill (col 3, spans both rows) — `+N` popover trigger when extras present (col 4, spans both rows) — owner actions (col 5, spans both rows).
- **Non-owner viewer:** image (col 1, spans both rows) — name (col 2, row 1) — price + store-metadata line (col 2, row 2, replacing the leader-dot treatment with the inert metadata text) — no buy-link pill or `+N` trigger (cols 3–4 empty/collapsed) — "Get this gift" button (col 5, spans both rows).

#### Scenario: Image is square and spans both content rows

- **WHEN** an item card renders in row view at ≥600px
- **THEN** the image SHALL render at 52×52 px, positioned at grid column 1 spanning both content rows

#### Scenario: Name renders on top with price row below

- **WHEN** an item card renders in row view at ≥600px
- **THEN** the item name SHALL render in column 2 row 1 (single-line, ellipsis-truncated) and the price row SHALL render in column 2 row 2 — with leader dots connecting to the tall pill for the owner, or the store-metadata line for a non-owner

#### Scenario: Tall buy-link pill spans both content rows for the owner

- **WHEN** the item owner renders an unclaimed item in row view at ≥600px
- **THEN** the primary `<LinkButton>` SHALL apply page-scoped overrides for `min-height: 64px`, `max-width: 180px`, and `align-self: stretch` so it visually spans both rows of content. The override is documented as a page-scoped exception in `store-links.css` and does not affect the `<LinkButton>` primitive's contract.

#### Scenario: Non-owner row carries no direct store navigation

- **WHEN** a non-owner renders an unclaimed item in row view at ≥600px
- **THEN** no buy-link pill or `+N` trigger SHALL render; the "Get this gift" button SHALL occupy the right column and the store names SHALL appear only in the metadata line

### Requirement: The right column (col 5) SHALL be viewer-aware and SHALL be absorbed by a wide claimed pill when applicable

The right-most column of the row-view grid SHALL render different content per viewer state:

- Owner, no claim/spoiler state, viewport ≥400px: edit + archive icons
- Owner, no claim/spoiler state, viewport <400px: a kebab `<Menu>` trigger that opens a menu with Edit + Archive items
- Non-owner, unclaimed: a "Get this gift" primary button (full label at all viewports) that opens the purchase modal
- Non-owner, fully claimed by others: a disabled "✓ Fully claimed" pill in the same right-column cell as the other claim affordances (cols 3–4 are empty for a non-owner; spanning them would add their column gaps and misalign the pill); the card surface receives the muted/desaturated claimed treatment and the purchase modal SHALL NOT be openable from it
- Non-owner, viewer has a removable claim: an outline "Manage your claim" button that opens the purchase modal's already-claimed state (store row + remove-claim affordance); the price row shows the plain price with no metadata line

In row view, the right-column claim affordances ("Get this gift", "Manage your claim", the disabled "Fully claimed" pill) SHALL share a `min-width: 165px` floor so rows align across states.
- Owner with spoilers active (revealed claim): NOT ABSORBED — the spoiler pill occupies col 3 only (same slot the buy-pill would have), leaving col 4 (≥400px) or col 5 (<400px kebab) free for the owner's edit/archive actions. The wide-pill treatment would stomp on the owner-actions cells and obscure the edit affordance — the owner's primary intent at `/lists/[ownedId]?spoilers=on` is editing while seeing who claimed what, so the edit button SHALL remain visible.

#### Scenario: Owner sees edit + archive icons in col 5 at ≥400px

- **WHEN** the viewer owns the list and the item is unclaimed and viewport width is ≥400px
- **THEN** column 5 SHALL contain inline edit and archive icon buttons

#### Scenario: Non-owner sees the Get this gift button in col 5

- **WHEN** the viewer does not own the list and no claim/spoiler state is active
- **THEN** column 5 SHALL contain a "Get this gift" primary button that opens the `?purchaseItem=<id>` purchase modal

#### Scenario: Fully-claimed state absorbs the right columns as a disabled wide pill

- **WHEN** the item is fully claimed by someone other than the viewer
- **THEN** a disabled "✓ Fully claimed" pill SHALL render in the right-column cell aligned with the other claim affordances (shared `min-width: 165px` floor), the card SHALL receive the muted claimed treatment, and activating the pill SHALL NOT open the purchase modal

#### Scenario: Viewer-claimed state offers Manage your claim

- **WHEN** the viewer has a removable claim on the item (their own claim, or one they recorded for someone else)
- **THEN** the card SHALL render an outline "Manage your claim" button, and activating the button SHALL open the purchase modal in its already-claimed state

#### Scenario: Owner-spoiler pill sits in col 3 only and does NOT absorb the right column

- **WHEN** the viewer owns the list and `showSpoilerInfo` is true (item has claims and spoilers are revealed for the owner)
- **THEN** the `.purchased-banner--spoiler` element SHALL apply `grid-column: 3` (not `3 / -1`), occupying only the buy-pill cell on rows 1–2; col 4 SHALL remain available for `.item-owner-actions` (inline edit/archive icons) at ≥400px, and the kebab `.item-owner-actions-mobile` SHALL remain available at <400px. The spoiler pill SHALL NOT overlap or obscure the edit affordance.

#### Scenario: Footer banner is hidden in row view

- **WHEN** an item renders in row view (`.item-list` or `.sortable-item`)
- **THEN** the `.purchased-banner` / `.purchased-banner--mine` / `.purchased-banner--spoiler` footer SHALL be hidden via CSS (`display: none`). The same banners SHALL continue to render in grid view.

### Requirement: At viewport widths below 600px the row layout SHALL reflow into a vertically-stacked horizontal-card

`.item-list .item-container` and `.sortable-item .item-container` at `<600px` SHALL apply a grid template that stacks content vertically rather than compressing horizontally. The shape SHALL be: image (col `img`, spans rows 1–2), title (col `content`, row 1), price (col `content`, row 2 — for a non-owner the store-metadata line joins the price on this row), description (col 1/-1, row 3, full-width), action row (col 1/-1, row 4, full-width). The action row's contents are viewer-aware: for the owner, buy-link + `+N` flush-left and owner actions flush-right (unchanged); for a non-owner, the "Get this gift" button (full label — the previous `<600px` "Claim" short form is retired). The leader-dot `::after` SHALL be suppressed at this breakpoint. The leading slot (col `leading`) is the same column used by drag handle / checkbox surfaces.

#### Scenario: Mobile row stacks vertically instead of cramming horizontally

- **WHEN** the viewport is `<600px` and a row is rendered
- **THEN** the title and price SHALL stack on rows 1 and 2 right of the image; the description SHALL render on row 3 spanning the full width; the viewer-aware action row SHALL render on row 4 spanning the full width

#### Scenario: Non-owner mobile row shows metadata and the full button label

- **WHEN** the viewport is `<600px` and a non-owner renders an unclaimed item with multiple stores
- **THEN** the store-metadata line SHALL render with the price (single line, `+N` truncation) and the action row SHALL contain the "Get this gift" button with its full label

#### Scenario: Leader dots are suppressed at mobile

- **WHEN** the viewport is `<600px`
- **THEN** the `::after` leader-dot pseudo-element on `.item-price-row` SHALL NOT render (display: none); the price stands alone on its row without a dotted leader

#### Scenario: Owner-actions kebab still engages at <400px

- **WHEN** the viewport is `<400px` and the viewer is the owner
- **THEN** the inline edit/archive icons SHALL be hidden and the kebab `<Menu>` SHALL be visible in the action-row column, consistent with the existing Decision 9 kebab behavior

### Requirement: With no valid store, StoreLinks SHALL render nothing

When an item has no valid store (no `lowestPrice`), `<StoreLinks>` SHALL NOT render the price row or any store chip and SHALL return `null`. The claim/purchase affordance is no longer passed through `<StoreLinks>` as `children` — the card's action button ("Get this gift" / claim states) renders independently of store presence, so store-less items keep their claim affordance without `<StoreLinks>` mediating it.

#### Scenario: Store-less item renders no store UI

- **WHEN** `<StoreLinks>` receives an item with no valid store
- **THEN** it SHALL render `null` (no `.item-action-row`, no `.item-price-row`, no `.storeLinks`)

#### Scenario: Store-less item still offers the claim affordance

- **WHEN** a non-owner views an unclaimed item that has no valid store
- **THEN** the "Get this gift" button SHALL render and open the purchase modal (whose store row renders nothing), independent of `<StoreLinks>`

## REMOVED Requirements

### Requirement: With no valid store, StoreLinks SHALL render its children in an action-row wrapper or null

**Reason**: Superseded by "With no valid store, StoreLinks SHALL render nothing". The claim button is no longer composed as `<StoreLinks>` children — the card action button renders independently, so the children/action-row passthrough contract has no remaining consumer.
**Migration**: Card surfaces render their action button (e.g. "Get this gift") as a sibling of `<StoreLinks>`, not as its children; `<StoreLinks>` with no valid store returns `null`.
