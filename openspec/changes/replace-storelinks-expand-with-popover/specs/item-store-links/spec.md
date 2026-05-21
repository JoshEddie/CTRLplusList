## ADDED Requirements

### Requirement: The store-links row SHALL render in a single line at all times

The chip row on every item card SHALL be exactly one line tall. The card's height SHALL be invariant to the number of stores attached to the item and invariant to whether the extra-stores popover is open or closed. Cards in the same `.item-grid` row SHALL NOT change height when a neighboring card's popover opens.

#### Scenario: Single-store item renders one full-width primary chip

- **WHEN** an item with exactly one valid store is rendered
- **THEN** `.storeLinks` SHALL set `grid-template-columns: 1fr` (or equivalent) so the primary buy-link chip stretches to fill the row width, and no `+N` trigger SHALL be rendered

#### Scenario: Multi-store item renders primary chip plus +N trigger

- **WHEN** an item with two or more valid stores is rendered
- **THEN** `.storeLinks` SHALL set `grid-template-columns: 1fr auto` (or equivalent) so the primary buy-link chip stretches to fill the remaining width and the `+N` trigger sizes to its content

#### Scenario: Card height does not change when popover opens

- **WHEN** the user opens the extras popover on any card in a grid row
- **THEN** that card's rendered height SHALL be identical to its height when the popover is closed, and every other card in the same grid row SHALL retain its height

#### Scenario: Card height does not change with store count differences across a row

- **WHEN** a grid row contains a single-store card, a 2-store card, and a 5-store card
- **THEN** all three cards SHALL render at the same height with no second-line wrapping in any chip row

### Requirement: The +N trigger SHALL open a `<Menu>` popover containing all stores with their prices

The `+N` trigger SHALL be a `<Button variant="ghost" size="sm">` styled with the `.storeLinks-more` page-scoped class. Activating it (via click, Enter, or Space) SHALL open a `<Menu>` from the `menu-system` capability, anchored to the trigger, containing one `<MenuLinkItem>` per **valid store on the item — including the primary**. Stores SHALL be sorted by price ascending (cheapest first). Each `<MenuLinkItem>` SHALL link to the store's URL with `target="_blank"` and `rel="noreferrer"`, and SHALL render the store's price alongside its name. The popover SHALL open **upward** over the card body (`bottom: calc(100% + 6px)`), not downward into the next grid row.

#### Scenario: Click opens the popover

- **WHEN** the user clicks the `+N` trigger
- **THEN** the popover SHALL open, the trigger's `aria-expanded` SHALL become `true`, and focus management SHALL follow the `<Menu>` primitive's contract

#### Scenario: Keyboard activation opens the popover

- **WHEN** the `+N` trigger is focused and the user presses Enter or Space
- **THEN** the popover SHALL open with the same behavior as a click

#### Scenario: All stores appear with prices, sorted ascending

- **WHEN** the popover is open for an item with M valid stores total (including the primary)
- **THEN** the popover SHALL contain exactly M `<MenuLinkItem>` rows, each row SHALL display the store's name and its price (formatted as `$X.XX`), and rows SHALL be ordered by price ascending — the same store that appears as the row's primary buy-link SHALL appear first in the popover

#### Scenario: Popover opens upward when there is room above

- **WHEN** the popover opens and the available space above the trigger inside the nearest scroll-clipping ancestor is enough to fit the panel
- **THEN** the panel SHALL be positioned above the trigger (`bottom: calc(100% + 6px)`), overlaying the card body, not below the trigger where it would extend into the next grid row

#### Scenario: Popover flips below for top-row items with insufficient room above

- **WHEN** the popover opens and the available space above the trigger is less than the estimated panel height AND less than the available space below
- **THEN** the panel SHALL flip to open below the trigger (default `top: calc(100% + 6px)` from the `<Menu>` primitive) so the popover content remains visible — applicable especially to top-row items in the list view where the trigger is near the top of the scroll container

#### Scenario: Opening the popover does not auto-scroll the page

- **WHEN** the popover opens via hover or click
- **THEN** the browser SHALL NOT scroll the page to bring the focused first menu item into view, even if the item is partially or fully outside the viewport; the `<Menu>` primitive's focus call SHALL use `{ preventScroll: true }` so the trigger stays under the user's cursor

#### Scenario: Outside-click closes the popover

- **WHEN** the popover is open and the user clicks anywhere outside the trigger or panel
- **THEN** the popover SHALL close via the `<Menu>` primitive's built-in dismiss handler

#### Scenario: Escape key closes the popover

- **WHEN** the popover is open and the user presses Escape
- **THEN** the popover SHALL close and focus SHALL return to the `+N` trigger

### Requirement: Hover-open SHALL be available on devices that support hover

On pointing devices that support hover (desktop, laptop with mouse/trackpad), the popover SHALL open when the cursor enters the `+N` trigger and SHALL close after the cursor leaves the trigger-or-panel boundary for a configurable grace period (default: 220ms). This behavior is layered on top of `<Menu>`'s click-to-open default. The hover boundary SHALL be the **anchor wrapper** (`.storeLinks-more-anchor`) — a single DOM element containing both the trigger Button and the `<Menu>` panel as descendants — so that mouseenter / mouseleave handlers attached to the wrapper fire as the union of trigger + panel, not separately.

#### Scenario: Hover opens the popover

- **WHEN** the user hovers the `+N` trigger on a hover-capable device
- **THEN** the popover SHALL open without requiring a click

#### Scenario: Hover-out closes after grace period

- **WHEN** the popover is open and the cursor leaves both the trigger and the panel
- **THEN** the popover SHALL schedule a close after 220ms; if the cursor re-enters the trigger or panel before the timer fires, the close SHALL be canceled

#### Scenario: Cursor transit from trigger to panel keeps popover open

- **WHEN** the cursor moves from the `+N` trigger across the 6px gap into the menu panel
- **THEN** the popover SHALL remain open; mouseleave from the trigger SHALL schedule a close but mouseenter on the panel (a descendant of the anchor wrapper) SHALL cancel that scheduled close before it fires

#### Scenario: Touch device falls back to click-only

- **WHEN** the user is on a touch device (no hover capability)
- **THEN** hover-open SHALL not fire (no `onMouseEnter` reliably available); the click-toggle behavior SHALL remain functional

### Requirement: The card container SHALL NOT clip its children with `overflow: hidden`

`.item-container` SHALL NOT set `overflow: hidden`. The rounded-corner visual SHALL be preserved by applying corner radii to the leaf surfaces that touch the card boundary: `.item-image-container` SHALL apply `border-top-left-radius` and `border-top-right-radius`; `.purchased-banner` SHALL apply `border-bottom-left-radius` and `border-bottom-right-radius`.

#### Scenario: Image follows the card's top corner radius

- **WHEN** any item card is rendered
- **THEN** the image's top corners SHALL be visually rounded to match the card's `border-radius`

#### Scenario: Purchased banner follows the card's bottom corner radius

- **WHEN** an item is rendered with a visible purchased-banner footer
- **THEN** the banner's bottom corners SHALL be visually rounded to match the card's `border-radius`

#### Scenario: Popover panel can extend outside the card boundary

- **WHEN** the popover opens on any card and its panel extends beyond the card's bottom edge
- **THEN** the panel SHALL render fully visible (subject to viewport edge-flip, owned by `<Menu>`), not clipped by the card

### Requirement: The row layout (list view and sortable owner edit) SHALL render the new compact two-row anatomy at ≥600px

`.item-list .item-container` and `.sortable-item .item-container` SHALL use an outer grid with template `52px 1fr auto auto auto / auto auto`. Inner children (`.item`, `.item-info`) SHALL participate in the outer grid via `display: contents`. The visual anatomy SHALL be: image (col 1, spans both rows) — name (col 2, row 1) — price + leader dots (col 2, row 2) — tall buy-link pill (col 3, spans both rows) — `+N` popover trigger when extras present (col 4, spans both rows) — viewer-aware right column (col 5, spans both rows).

#### Scenario: Image is square and spans both content rows

- **WHEN** an item card renders in row view at ≥600px
- **THEN** the image SHALL render at 52×52 px, positioned at grid column 1 spanning both content rows

#### Scenario: Name renders on top with price+leader dots below

- **WHEN** an item card renders in row view at ≥600px
- **THEN** the item name SHALL render in column 2 row 1 (single-line, ellipsis-truncated) and the price + leader-dot row SHALL render in column 2 row 2

#### Scenario: Leader dots fill horizontal space between price and tall pill

- **WHEN** the price+leader-dots row renders at ≥600px
- **THEN** a dotted border-bottom on a flex-grow pseudo-element SHALL fill the horizontal space between the price text and the tall pill column, visually connecting them

#### Scenario: Tall buy-link pill spans both content rows

- **WHEN** an unclaimed item without spoiler/claim state renders in row view at ≥600px
- **THEN** the primary `<LinkButton>` SHALL apply page-scoped overrides for `min-height: 64px`, `max-width: 180px`, and `align-self: stretch` so it visually spans both rows of content. The override is documented as a page-scoped exception in `store-links.css` and does not affect the `<LinkButton>` primitive's contract.

### Requirement: The right column (col 5) SHALL be viewer-aware and SHALL be absorbed by a wide claimed pill when applicable

The right-most column of the row-view grid SHALL render different content per viewer state:

- Owner, no claim/spoiler state, viewport ≥400px: edit + archive icons
- Owner, no claim/spoiler state, viewport <400px: a kebab `<Menu>` trigger that opens a menu with Edit + Archive items
- Non-owner, unclaimed: a "Claim this gift" (or shortened "Claim" at <600px) button
- Anyone, claimed / fully-claimed / owner-spoiler: ABSORBED — the claimed-state element gets `grid-column: 3 / -1` so it spans the buy-pill, `+N`, and right-column slots as a single wide pill

#### Scenario: Owner sees edit + archive icons in col 5 at ≥400px

- **WHEN** the viewer owns the list and the item is unclaimed and viewport width is ≥400px
- **THEN** column 5 SHALL contain inline edit and archive icon buttons

#### Scenario: Non-owner sees Claim button in col 5

- **WHEN** the viewer does not own the list and no claim/spoiler state is active
- **THEN** column 5 SHALL contain a "Claim this gift" (or "Claim" at <600px) primary button

#### Scenario: Claimed state absorbs the buy-pill, +N, and right column into a wide pill

- **WHEN** the row's claim or spoiler state is active (you-claimed, fully-claimed, others-claimed-showing-purchased, or owner-with-spoilers)
- **THEN** the `.claimed-state` (or equivalent) element SHALL apply `grid-column: 3 / -1` and render as a single wide pill spanning the buy-pill, `+N`, and right-column slots; the `<StoreLinks>` chip row SHALL NOT render (already gated by `showStores={!showPurchased && !showSpoilerInfo}`)

#### Scenario: Wide pill carries the claimer name(s)

- **WHEN** the item is fully claimed by someone other than the viewer
- **THEN** the wide pill SHALL display the claim summary (e.g. "Claimed by Dave" or "Claimed by Alice, Bob") instead of the bare "Fully claimed" label, combining state and attribution in one indicator

#### Scenario: Footer banner is hidden in row view

- **WHEN** an item renders in row view (`.item-list` or `.sortable-item`)
- **THEN** the `.purchased-banner` / `.purchased-banner--mine` / `.purchased-banner--spoiler` footer SHALL be hidden via CSS (`display: none`). The same banners SHALL continue to render in grid view.

### Requirement: Mobile narrow row view SHALL collapse owner actions into a kebab `<Menu>` at <400px

When the row view renders at viewport width <400px and the viewer is the owner, the inline edit + archive icons SHALL be hidden and a kebab trigger SHALL be shown in their place. The kebab SHALL be a `<Button variant="ghost" size="sm">` with `aria-haspopup="menu"` and `aria-expanded` wiring, opening a `<Menu>` (from the `menu-system` capability) containing one Edit `<MenuLinkItem>` and one Archive `<MenuItem>` (when `showArchiveAction` is true). Delete SHALL NOT appear in this menu — Archive preserves other users' claim history and is the recommended path for owners winding down lists.

#### Scenario: Kebab replaces icons at <400px

- **WHEN** the row view renders at viewport width <400px and the viewer is the owner
- **THEN** the `.item-owner-actions` inline icons SHALL be `display: none` and the `.item-owner-actions-mobile` kebab trigger SHALL be `display: flex`

#### Scenario: Kebab menu contains Edit and Archive only

- **WHEN** the kebab is opened
- **THEN** the menu SHALL contain exactly an Edit menu-link-item linking to the item-edit page, and (when `showArchiveAction` is true) an Archive menu-item that toggles the item's archived state. No Delete affordance SHALL appear here.

#### Scenario: Kebab menu uses `<Menu>` primitive contract

- **WHEN** the kebab menu opens
- **THEN** it SHALL behave according to the `menu-system` capability — outside-click and Escape dismiss, arrow-key navigation between items, focus return to the kebab trigger on close

### Requirement: The legacy in-row expand-collapse machinery SHALL be removed

All CSS, JSX, and state that implemented the previous expand-collapse behavior SHALL be deleted: the `is-expanded` class on `.storeLinks`; the `.storeLinks-link--extra` element and its `max-width: 0 ↔ natural` transition; the reciprocal `max-width: natural ↔ 0` rule on `.storeLinks-more` when expanded; the `prefers-reduced-motion: reduce` carve-out covering removed selectors; the `collapseBoundaryRef` prop on `StoreLinks` and its `cardRef` plumbing through `Item.tsx`; the `expanded`-gated `tabIndex` and `aria-hidden` toggling on extra chips.

#### Scenario: No expand-class transitions remain in CSS

- **WHEN** the repository's CSS is searched for `is-expanded`, `storeLinks-link--extra`, `:not(.is-expanded)`, or `.is-expanded`
- **THEN** there SHALL be zero matches outside this change's own removal commit

#### Scenario: StoreLinks component exposes no collapseBoundaryRef prop

- **WHEN** the `StoreLinks` component's prop types are inspected
- **THEN** there SHALL be no `collapseBoundaryRef` prop and no consumer of a card-level collapse boundary
