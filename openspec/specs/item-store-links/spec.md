# item-store-links Specification

## Purpose

The `item-store-links` capability renders an item's buy options as a single-line store-chip row beneath the item. Valid stores (a non-empty name, a non-empty link, and a numeric price) are sorted ascending by price; the cheapest becomes the primary buy-link chip and sets the item's displayed price (`$X.XX`). When more than one valid store exists, a `+N` trigger opens a `<Menu>` popover listing every valid store (including the primary) with its name and price, each a `target="_blank"` anchor — openable by click or hover (with a grace period) and placed upward over the card by default, flipping below when there is insufficient room above. When an item has no valid store, the component falls back to rendering its claim/purchase `children` (or nothing), and activating any chip never bubbles its click to the enclosing card/row.
## Requirements
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
- Non-owner, claimed / fully-claimed: ABSORBED — the claimed-state element gets `grid-column: 3 / -1` so it spans the buy-pill, `+N`, and right-column slots as a single wide pill
- Owner with spoilers active (revealed claim): NOT ABSORBED — the spoiler pill occupies col 3 only (same slot the buy-pill would have), leaving col 4 (≥400px) or col 5 (<400px kebab) free for the owner's edit/archive actions. The wide-pill treatment would stomp on the owner-actions cells and obscure the edit affordance — the owner's primary intent at `/lists/[ownedId]?spoilers=on` is editing while seeing who claimed what, so the edit button SHALL remain visible.

#### Scenario: Owner sees edit + archive icons in col 5 at ≥400px

- **WHEN** the viewer owns the list and the item is unclaimed and viewport width is ≥400px
- **THEN** column 5 SHALL contain inline edit and archive icon buttons

#### Scenario: Non-owner sees Claim button in col 5

- **WHEN** the viewer does not own the list and no claim/spoiler state is active
- **THEN** column 5 SHALL contain a "Claim this gift" (or "Claim" at <600px) primary button

#### Scenario: Non-owner claimed state absorbs the buy-pill, +N, and right column into a wide pill

- **WHEN** the row's claim state is active for a non-owner viewer (you-claimed, fully-claimed by someone else, others-claimed-showing-purchased)
- **THEN** the `.claimed-state` (or equivalent) element SHALL apply `grid-column: 3 / -1` and render as a single wide pill spanning the buy-pill, `+N`, and right-column slots; the `<StoreLinks>` chip row SHALL NOT render (already gated by `showStores={!showPurchased && !showSpoilerInfo}`)

#### Scenario: Owner-spoiler pill sits in col 3 only and does NOT absorb the right column

- **WHEN** the viewer owns the list and `showSpoilerInfo` is true (item has claims and spoilers are revealed for the owner)
- **THEN** the `.purchased-banner--spoiler` element SHALL apply `grid-column: 3` (not `3 / -1`), occupying only the buy-pill cell on rows 1–2; col 4 SHALL remain available for `.item-owner-actions` (inline edit/archive icons) at ≥400px, and the kebab `.item-owner-actions-mobile` SHALL remain available at <400px. The spoiler pill SHALL NOT overlap or obscure the edit affordance.

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

### Requirement: At viewport widths below 600px the row layout SHALL reflow into a vertically-stacked horizontal-card

`.item-list .item-container` and `.sortable-item .item-container` at `<600px` SHALL apply a grid template that stacks content vertically rather than compressing horizontally. The shape SHALL be: image (col `img`, spans rows 1–2), title (col `content`, row 1), price (col `content`, row 2), description (col 1/-1, row 3, full-width), store-chip + action row (col 1/-1, row 4, full-width with buy-link + `+N` flush-left and viewer-aware right-actions flush-right). The leader-dot `::after` SHALL be suppressed at this breakpoint. The leading slot (col `leading`) is the same column used by drag handle / checkbox surfaces.

#### Scenario: Mobile row stacks vertically instead of cramming horizontally

- **WHEN** the viewport is `<600px` and a row is rendered
- **THEN** the title and price SHALL stack on rows 1 and 2 right of the image; the description SHALL render on row 3 spanning the full width; the buy-link / `+N` / actions SHALL render on row 4 spanning the full width

#### Scenario: Leader dots are suppressed at mobile

- **WHEN** the viewport is `<600px`
- **THEN** the `::after` leader-dot pseudo-element on `.item-price-row` SHALL NOT render (display: none); the price stands alone on its row without a dotted leader

#### Scenario: Owner-actions kebab still engages at <400px

- **WHEN** the viewport is `<400px` and the viewer is the owner
- **THEN** the inline edit/archive icons SHALL be hidden and the kebab `<Menu>` SHALL be visible in the action-row column, consistent with the existing Decision 9 kebab behavior

### Requirement: Choose-items SHALL adopt the shared row's visual treatment at mobile and render descriptions

`.choose-items-row` at `/lists/[id]/choose-items` SHALL NOT exist as a bespoke row implementation. The picker row SHALL render via the same `<Item />` component used by the items library, in `preview` mode, wrapped in a `<label>` that contributes a leading checkbox column (analog of how `.sortable-item` contributes a leading drag-handle column). The outer label and its checkbox SHALL render via `<CheckboxField>` from the `form-field-system` capability. The inner `<Item />` body SHALL inherit the shared row's complete anatomy:

- At `≥600px`: the shared row's outer grid (`52px 1fr auto auto auto / auto auto`) with image (col 1), name (col 2 row 1), price + leader dots (col 2 row 2), tall buy-link pill (col 3), `+N` popover trigger when extras present (col 4). The picker's right column (col 5) — normally owner-actions or claim CTA — SHALL be suppressed because (a) the picker's viewer is the item owner so the non-owner Claim CTA does not render, and (b) the existing `.preview .item-owner-actions { display: none; }` rule hides edit/archive icons on `<Item preview />` rows.
- At `<600px`: the shared row's mobile horizontal-card reflow (image upper-left spanning content rows, name row 1, price row 2, description row 3, store-chip + actions row 4). The picker's outer 2-col layout (checkbox + Item) collapses naturally into this reflow with the checkbox remaining in the leading position at the row's vertical center.
- At `<400px`: the shared row's owner-actions-kebab cell SHALL be suppressed on `<Item preview />` rows via a new `.preview .item-owner-actions-mobile { display: none; }` rule (companion to the existing `.preview .item-owner-actions` rule).

Buy-link chips inside the picker row SHALL render via the shared `<StoreLinks>` primitive (inherited through `<Item>`), not via a page-scoped `.choose-items-chip` rule. The primary buy-link SHALL render as a tall `<LinkButton>` pill; extra stores SHALL render via the `+N` `<Menu>` popover defined by this capability's other requirements. Buy-link chips SHALL remain live `<a target="_blank">` anchors in the picker (not suppressed via `pointer-events: none`) so the picker user can verify destination URLs without leaving the page.

The page-scoped state modifiers — `.choose-items-select.is-on` (currently-selected items, additive background-color tint via `var(--card-accent-background-color)`), `.choose-items-select.is-removing` (items being unchecked from the list, additive background-color tint via `var(--secondary-background-color)` plus strike-through on the rendered `.itemName` via the page-scoped rule `.choose-items-select.is-removing .itemName { text-decoration: line-through; }`), the "IN LIST" badge, and the "archived" badge — SHALL be retained as additive overlays that do not modify the shared row's grid template.

The description SHALL be rendered by `<Item />` itself (which already renders descriptions in the shared row's mobile row-3 slot and in the desktop row-3 footer line). No `.choose-items-description` page-scoped rule SHALL exist.

#### Scenario: Choose-items row consumes the shared row primitive

- **WHEN** a choose-items row renders at any breakpoint
- **THEN** the row's body SHALL be a `<Item />` component rendered with `preview` (producing `.item-container.preview` markup), and the row SHALL inherit the shared `.item-list .item-container` / `.sortable-item .item-container` CSS rules at the same selectors used by the items library; no `.choose-items-row` CSS rule SHALL exist

#### Scenario: Picker checkbox uses the form-field-system primitive

- **WHEN** a choose-items row renders
- **THEN** the checkbox SHALL be rendered via `<CheckboxField>` from `app/ui/components/field/CheckboxField.tsx` with `label={item.name}`; the label `<span>` SHALL be visually hidden via page-scoped CSS (sr-only pattern) because the item name is already rendered by `<Item />` and the accessible name is correctly carried by the `<CheckboxField>` label

#### Scenario: Owner-actions kebab is hidden on preview rows at <400px

- **WHEN** the viewport is `<400px` and a `<Item preview />` row renders
- **THEN** the `.item-owner-actions-mobile` kebab cell SHALL be hidden via `.preview .item-owner-actions-mobile { display: none; }`, matching the existing suppression of `.item-owner-actions` on preview rows

#### Scenario: Buy-link chips on picker rows are live anchors

- **WHEN** the picker row contains an item with one or more valid stores
- **THEN** the chips SHALL render via `<StoreLinks>` with the primary as a `<LinkButton>` tall pill and extras behind a `+N` popover trigger, and the anchors SHALL be interactive (not suppressed with `pointer-events: none`); clicking a chip SHALL open the store URL in a new tab without toggling the row's selection state

#### Scenario: Selection state modifiers apply additively to the outer label

- **WHEN** a row's selection state is `is-on` or `is-removing`
- **THEN** the modifier class SHALL be applied to the outer `.choose-items-select` element (the `<label>` wrapper), the row's background-color SHALL change additively via the modifier rule, and the `is-removing` state SHALL additionally apply `text-decoration: line-through` to the rendered `.itemName` inside the row via the page-scoped rule `.choose-items-select.is-removing .itemName`

#### Scenario: IN LIST and archived badges render as overlays

- **WHEN** an item is currently in the list (`wasIn && isSelected`) or is archived
- **THEN** the corresponding `.choose-items-in-badge` or `.choose-items-archived-badge` SHALL render as a sibling of `<Item />` inside the `.choose-items-select` label, positioned via CSS so it does not modify the shared row's grid template

#### Scenario: Description renders via Item, not via a page-scoped rule

- **WHEN** a choose-items row's item has a description
- **THEN** the description SHALL be rendered by `<Item />` (which already renders descriptions in its shared row CSS); no `.choose-items-description` page-scoped class or CSS rule SHALL exist

#### Scenario: No bespoke .choose-items-row CSS rule remains

- **WHEN** the repository's CSS is searched for `.choose-items-row`, `.choose-items-cb`, `.choose-items-thumb`, `.choose-items-thumb-empty`, `.choose-items-main`, `.choose-items-name`, `.choose-items-from`, `.choose-items-description`, `.choose-items-chips`, `.choose-items-chip`, `.choose-items-chip-static`, `.choose-items-right`, `.choose-items-price`, or `.choose-items-stores-count`
- **THEN** there SHALL be zero matches; the only retained `.choose-items-*` rules SHALL be the page-chrome rules (`.choose-items-list`, `.choose-items-list > li`, `.choose-items-pg-hd*`, `.choose-items-sticky-ft*`, `.choose-items-count*`, `.choose-items-undo`), the new `.choose-items-select*` wrapper rules, and the retained badges (`.choose-items-in-badge`, `.choose-items-archived-badge`)

### Requirement: Sortable owner row SHALL render buy-link chips for parity

`.sortable-item .storeLinks` SHALL remain visible at all viewports — matching the items-library row's chip-rendering behavior. Earlier scoping considered hiding these for sortable but the decision SHALL be to retain them for cross-surface parity.

#### Scenario: Sortable row shows buy-link chips

- **WHEN** an owner renders the sortable owner-edit view at `/lists/[id]`
- **THEN** each item row's `.storeLinks` chip row SHALL render (buy-link + `+N` if extras present), at both desktop and mobile breakpoints

### Requirement: The legacy in-row expand-collapse machinery SHALL be removed

All CSS, JSX, and state that implemented the previous expand-collapse behavior SHALL be deleted: the `is-expanded` class on `.storeLinks`; the `.storeLinks-link--extra` element and its `max-width: 0 ↔ natural` transition; the reciprocal `max-width: natural ↔ 0` rule on `.storeLinks-more` when expanded; the `prefers-reduced-motion: reduce` carve-out covering removed selectors; the `collapseBoundaryRef` prop on `StoreLinks` and its `cardRef` plumbing through `Item.tsx`; the `expanded`-gated `tabIndex` and `aria-hidden` toggling on extra chips.

#### Scenario: No expand-class transitions remain in CSS

- **WHEN** the repository's CSS is searched for `is-expanded`, `storeLinks-link--extra`, `:not(.is-expanded)`, or `.is-expanded`
- **THEN** there SHALL be zero matches outside this change's own removal commit

#### Scenario: StoreLinks component exposes no collapseBoundaryRef prop

- **WHEN** the `StoreLinks` component's prop types are inspected
- **THEN** there SHALL be no `collapseBoundaryRef` prop and no consumer of a card-level collapse boundary

### Requirement: A store SHALL be considered valid only when it has a name, a link, and a numeric price

`<StoreLinks>` SHALL treat a store as renderable only when it has a non-empty `name`, a non-empty `link`, and a `price` that coerces to a number (`Number(price)` is not `NaN`). Stores failing any of the three clauses SHALL be excluded from primary-buy-link selection, from the lowest-price computation, and from the `+N` popover. Only valid stores SHALL participate in the price-ascending sort.

#### Scenario: Store missing a name is excluded

- **WHEN** an item's `stores` array contains an entry with a falsy `name` (and other entries are valid)
- **THEN** that entry SHALL NOT appear as the primary buy-link, SHALL NOT appear in the `+N` popover, and SHALL NOT count toward the `+N` count

#### Scenario: Store missing a link is excluded

- **WHEN** an item's `stores` array contains an entry with a falsy `link`
- **THEN** that entry SHALL be excluded from the rendered primary chip and the popover

#### Scenario: Store with a non-numeric price is excluded

- **WHEN** an item's `stores` array contains an entry whose `price` does not coerce to a number (`Number(price)` is `NaN`)
- **THEN** that entry SHALL be excluded; no `$NaN` chip or popover row SHALL render

#### Scenario: Only valid stores are sorted and counted

- **WHEN** an item has a mix of valid and invalid store entries
- **THEN** the primary buy-link SHALL be the cheapest VALID store, the `.item-price` SHALL show that store's price, and the `+N` count SHALL equal the number of valid stores beyond the primary

### Requirement: With no valid store, StoreLinks SHALL render its children in an action-row wrapper or null

When an item has no valid store (no `lowestPrice`), `<StoreLinks>` SHALL NOT render the price row or any store chip. Instead it SHALL render its `children` wrapped in a single `<div className="item-action-row">`, or return `null` when no `children` are supplied. This preserves the claim/purchase affordance passed through by the parent for store-less items.

#### Scenario: Store-less item with children renders the action row

- **WHEN** `<StoreLinks>` receives an item with no valid store AND non-empty `children`
- **THEN** it SHALL render `<div className="item-action-row">` containing those `children`
- **AND** it SHALL NOT render `.item-price-row` or `.storeLinks`

#### Scenario: Store-less item without children renders nothing

- **WHEN** `<StoreLinks>` receives an item with no valid store AND no `children`
- **THEN** it SHALL render `null` (no `.item-action-row`, no `.item-price-row`, no `.storeLinks`)

### Requirement: Activating a buy-link or the +N trigger SHALL NOT propagate to the enclosing row

The primary buy-link `<LinkButton>` and the `+N` `<Button>` trigger SHALL each call `stopPropagation()` on their click event so that activating them does not bubble to the click handler of the enclosing card/row (which, depending on surface, selects the row, navigates, or toggles a picker checkbox). Toggling the `+N` popover SHALL still flip its open state; opening a buy-link SHALL still follow the anchor.

#### Scenario: Clicking the primary buy-link does not trigger the row handler

- **WHEN** `<StoreLinks>` is rendered inside an element with a click handler and the user clicks the primary buy-link
- **THEN** the enclosing element's click handler SHALL NOT fire

#### Scenario: Clicking the +N trigger does not trigger the row handler

- **WHEN** `<StoreLinks>` is rendered inside an element with a click handler and the user clicks the `+N` trigger
- **THEN** the enclosing element's click handler SHALL NOT fire
- **AND** the `+N` popover's open state SHALL toggle

