# item-store-links Delta

## ADDED Requirements

### Requirement: The price line SHALL name the primary store as inert metadata

Wherever an item card or row displays its price, the line SHALL read `$X.XX · {store name}` — the primary (single) complete store's price and name — rendered as muted, inert text: no anchor, no button, no external-link icon, no tap affordance, and never wrapping to a second line. The line SHALL render whenever the item has a complete store, uniformly across claim states — store navigation is carried exclusively by the `View item ↗` action owned by `item-actions`, so the metadata line never doubles as navigation. When no complete store exists, no price line SHALL render.

#### Scenario: Price line names the single store

- **WHEN** any viewer renders an item whose complete store is Crate & Barrel at $19.99
- **THEN** the price line SHALL read `$19.99 · Crate & Barrel`, no element of it SHALL be interactive, and it SHALL render on one line

#### Scenario: No complete store, no price line

- **WHEN** an item has no complete store (including legacy rows failing the validity predicate)
- **THEN** no price line SHALL render

### Requirement: Items SHALL be capped at a single store on create and update

The create and update paths SHALL accept at most one store: `createItem`/`updateItem` SHALL reject payloads carrying more than one store row or whose single store fails the validity predicate, mirroring the client-side gate so the actions cannot persist what the UI forbids. The `item_stores` schema is unchanged — the cap is input-side only. Existing multi-store items SHALL render their primary (lowest-priced complete) store everywhere; their extra rows are dormant and excluded from every display surface. The edit path SHALL seed from the primary store (falling back to the first row when none is complete, so legacy incomplete rows surface for repair) and SHALL submit exactly one store — the existing positional store sync then removes rows beyond it, collapsing a legacy multi-store item to its single store on first edit-save. No migration SHALL be run for untouched items.

#### Scenario: Multi-store payload is rejected

- **WHEN** a create or update submission carries two store rows
- **THEN** the action SHALL reject with a validation failure and persist nothing

#### Scenario: Incomplete store payload is rejected

- **WHEN** a create or update submission carries one store missing its name, link, or a valid price
- **THEN** the action SHALL reject with a validation failure

#### Scenario: Legacy multi-store item renders its primary

- **WHEN** an item with three stored rows (two complete) renders on any surface
- **THEN** the cheapest complete store SHALL be the displayed price/name and `View item ↗` target, and the other rows SHALL be invisible

#### Scenario: Edit-save collapses a legacy multi-store item

- **WHEN** the owner edits an item holding three store rows and saves
- **THEN** the form SHALL have been seeded from the primary store, exactly one store row SHALL be submitted, and the item SHALL hold exactly one store row afterward

## MODIFIED Requirements

### Requirement: A store SHALL be considered valid only when it has a name, a link, and a numeric price

A store SHALL be complete (valid) only when it has a non-empty `name`, a `link` accepted by `isValidProductUrl`, and a `price` whose tier is `good` per the deck's `priceTier`/`PRICE_PATTERN` (optional `$`, integer or up to two decimals). This predicate SHALL live in one shared pure helper consumed by every surface — display filtering and primary-store selection, the deck's tier rows, and the server actions' create/update validation — replacing the retired `isValidStore` (whose looser `Number(price)` check could disagree with the deck). Stores failing the predicate SHALL be excluded from primary-store selection, the price line, and the `View item ↗` target.

#### Scenario: Store missing a name is excluded

- **WHEN** an item's `stores` array contains an entry with a falsy `name` (and another entry is complete)
- **THEN** that entry SHALL NOT be the primary store and SHALL NOT appear in any price or store display

#### Scenario: Store with an invalid link is excluded

- **WHEN** an item's `stores` array contains an entry whose `link` fails `isValidProductUrl`
- **THEN** that entry SHALL be excluded from primary-store selection and display

#### Scenario: Store with a non-good price tier is excluded

- **WHEN** an item's `stores` array contains an entry whose `price` fails `PRICE_PATTERN` (e.g. `1e5` or empty)
- **THEN** that entry SHALL be excluded — including values the retired `Number()` check would have accepted

#### Scenario: One predicate everywhere

- **WHEN** the deck's store/price rows, a card's display filtering, and the server action validate the same store value
- **THEN** all three SHALL consume the same shared predicate helper and agree on its completeness

### Requirement: The purchase modal store row SHALL be the non-owner's sole direct store navigation

The purchase modal SHALL open with a store row directly below its header in every viewer variant (signed-in friend, guest, owner, already-claimed) whenever the item has a complete store. The store row SHALL render the primary store as a `<LinkButton target="_blank" rel="noreferrer">` carrying the buy-link chip treatment (the `storeLinks-link` colors — visually subordinate to the claim CTA). It SHALL NOT render a `+N stores` trigger or store menu — items carry a single store, and legacy dormant rows are excluded by the validity predicate. The row is a convenience for the claim flow, not the sole navigation: the card's `View item ↗` (owned by `item-actions`) is reachable in every state. When an item has no complete store, the store row SHALL render nothing and the claim sections SHALL render unaffected.

#### Scenario: Store row renders in every modal variant

- **WHEN** the purchase modal opens for any viewer on an item with a complete store
- **THEN** the store row SHALL render below the modal header with the primary store as a buy-link-styled `<LinkButton>` opening in a new tab, and no `+N stores` trigger SHALL render

#### Scenario: Store-less item renders claim sections without a store row

- **WHEN** the purchase modal opens on an item with no complete store
- **THEN** no store row SHALL render and the viewer-appropriate claim section SHALL render normally

### Requirement: The card container SHALL NOT clip its children with `overflow: hidden`

`.item-container` SHALL NOT set `overflow: hidden`. The rounded-corner visual SHALL be preserved by applying corner radii to the leaf surfaces that touch the card boundary: `.item-image-container` SHALL apply `border-top-left-radius` and `border-top-right-radius`; `.purchased-banner` SHALL apply `border-bottom-left-radius` and `border-bottom-right-radius`.

#### Scenario: Image follows the card's top corner radius

- **WHEN** any item card is rendered
- **THEN** the image's top corners SHALL be visually rounded to match the card's `border-radius`

#### Scenario: Purchased banner follows the card's bottom corner radius

- **WHEN** an item is rendered with a visible purchased-banner footer
- **THEN** the banner's bottom corners SHALL be visually rounded to match the card's `border-radius`

### Requirement: The row layout (list view and sortable owner edit) SHALL render the new compact two-row anatomy at ≥600px

`.item-list .item-container` and `.sortable-item .item-container` SHALL keep the compact two-row anatomy at ≥600px: image (52×52 px, column 1, spanning both content rows) — name (column 2, row 1, single-line, ellipsis-truncated) — price line (column 2, row 2, per the price-line requirement). The trailing region SHALL host the `ItemActions` block (contents owned by `item-actions`) and, for the owner, the owner-actions kebab in the final column per the kebab requirement. The buy-link tall pill and `+N` trigger columns are retired with the chip row. Inner children (`.item`, `.item-info`) MAY participate via `display: contents` as today.

#### Scenario: Image is square and spans both content rows

- **WHEN** an item card renders in row view at ≥600px
- **THEN** the image SHALL render at 52×52 px, positioned at grid column 1 spanning both content rows

#### Scenario: Name renders on top with the price line below

- **WHEN** an item card renders in row view at ≥600px
- **THEN** the item name SHALL render in column 2 row 1 and the price line (`$X.XX · Store`) SHALL render in column 2 row 2

#### Scenario: Trailing region hosts ItemActions and the kebab

- **WHEN** an item renders in row view at ≥600px
- **THEN** the row's trailing region SHALL contain the `ItemActions` block for the viewer's state, the owner-actions kebab SHALL remain in its own final-column cell for the owner, and no buy-link pill or `+N` trigger SHALL render

### Requirement: At viewport widths below 600px the row layout SHALL reflow into a vertically-stacked horizontal-card

`.item-list .item-container` and `.sortable-item .item-container` at `<600px` SHALL apply a grid template that stacks content vertically rather than compressing horizontally. The shape SHALL be: image (col `img`, spans rows 1–2), title (col `content` spanning to the card's right edge — `grid-column: 2 / -1` — row 1), price line (same `2 / -1` span, row 2), description (col 1/-1, row 3, full-width), action row (row 4). The trailing grid column SHALL NOT reserve width on rows 1–2.

The action row SHALL host the `ItemActions` block (contents owned by `item-actions`), spanning the full action row for a non-owner. For the owner, the block (or the spoiler pill when it renders) SHALL span `grid-column: 1 / 3` and the owner-actions kebab SHALL occupy the trailing column (col 3) exclusively — no action-row occupant SHALL overlap or obscure the kebab. The leader-dot `::after` SHALL be suppressed at this breakpoint.

#### Scenario: Mobile row stacks vertically instead of cramming horizontally

- **WHEN** the viewport is `<600px` and a row is rendered
- **THEN** the title and price line SHALL stack on rows 1 and 2 right of the image, each spanning to the card's right edge; the description SHALL render on row 3 spanning the full width; the `ItemActions` action row SHALL render on row 4

#### Scenario: Non-owner mobile actions span the action row

- **WHEN** the viewport is `<600px` and a non-owner renders a claimable item
- **THEN** the `ItemActions` block SHALL span and stretch the full action row

#### Scenario: Owner-actions kebab stays clear at mobile

- **WHEN** the viewport is `<600px` and the viewer is the owner
- **THEN** the kebab SHALL be visible and operable in the trailing action-row column and SHALL NOT be overlapped by the `ItemActions` block or the spoiler pill

### Requirement: The right column (col 5) SHALL be viewer-aware and SHALL be absorbed by a wide claimed pill when applicable

The right-most region of the row-view grid SHALL host the `ItemActions` block — which actions render per viewer/claim state is owned by `item-actions`, replacing the former per-state right-column enumeration ("Get this gift", "Manage your claim", the disabled "✓ Fully claimed" pill, and their `min-width` floor). The owner-actions kebab SHALL keep its own final-column cell at all viewports (kebab contents owned by the kebab requirement). Two row-view rules survive unchanged:

- Owner with spoilers active (revealed claim): the spoiler pill occupies col 3 only (`grid-column: 3`, never `3 / -1`), leaving the owner-actions kebab cell free at all viewports — the owner's primary intent at `/lists/[ownedId]?spoilers=on` is editing while seeing who claimed what, so the kebab SHALL remain visible.
- The `.purchased-banner` / `.purchased-banner--mine` / `.purchased-banner--spoiler` footer banners SHALL be hidden in row view (`display: none`) and SHALL continue to render in grid view.

#### Scenario: Owner-spoiler pill sits in col 3 only and does NOT absorb the right column

- **WHEN** the viewer owns the list and `showSpoilerInfo` is true (item has claims and spoilers are revealed for the owner)
- **THEN** the `.purchased-banner--spoiler` element SHALL apply `grid-column: 3` (not `3 / -1`), and the kebab cell SHALL remain available and unobscured at all viewports

#### Scenario: Footer banner is hidden in row view

- **WHEN** an item renders in row view (`.item-list` or `.sortable-item`)
- **THEN** the `.purchased-banner` family SHALL be hidden via CSS (`display: none`) while continuing to render in grid view

#### Scenario: Right region renders the matrix-decided actions

- **WHEN** a non-owner renders an unclaimed item in row view
- **THEN** the right region SHALL contain the `ItemActions` block for that state (per `item-actions`) and no state-specific affordance SHALL be branched outside it

### Requirement: Choose-items SHALL adopt the shared row's visual treatment at mobile and render descriptions

`.choose-items-row` at `/lists/[id]/choose-items` SHALL NOT exist as a bespoke row implementation. The picker row SHALL render via the same `<Item />` component used by the items library, in `preview` mode, wrapped in a `<label>` that contributes a leading checkbox column. The outer label and its checkbox SHALL render via `<CheckboxField>` from the `form-field-system` capability. The inner `<Item />` body SHALL inherit the shared row's complete anatomy at each breakpoint (the ≥600px two-row grid and the `<600px` horizontal-card reflow per this capability's row requirements), with the action area rendered by `ItemActions` in view-only mode (owned by `item-actions`): a live `View item ↗` anchor when a complete store exists, so the picker user can verify destination URLs without leaving the page. The owner-actions kebab cell SHALL be suppressed on `<Item preview />` rows via the `.preview .item-owner-actions-mobile { display: none; }` rule.

The page-scoped state modifiers — `.choose-items-select.is-on`, `.choose-items-select.is-removing` (with its `.itemName` strike-through), the "IN LIST" badge, and the "archived" badge — SHALL be retained as additive overlays that do not modify the shared row's grid template. The description SHALL be rendered by `<Item />` itself; no `.choose-items-description` page-scoped rule SHALL exist.

#### Scenario: Choose-items row consumes the shared row primitive

- **WHEN** a choose-items row renders at any breakpoint
- **THEN** the row's body SHALL be a `<Item />` component rendered with `preview`, inheriting the shared `.item-list .item-container` / `.sortable-item .item-container` CSS rules, and no `.choose-items-row` CSS rule SHALL exist

#### Scenario: Picker rows carry a live View item anchor

- **WHEN** the picker row contains an item with a complete store
- **THEN** the action area SHALL be `ItemActions` view-only rendering a live `View item ↗` anchor; activating it SHALL open the store URL in a new tab without toggling the row's selection state

#### Scenario: Selection state modifiers apply additively to the outer label

- **WHEN** a row's selection state is `is-on` or `is-removing`
- **THEN** the modifier class SHALL be applied to the outer `.choose-items-select` element, the row's background-color SHALL change additively, and `is-removing` SHALL apply `text-decoration: line-through` to the rendered `.itemName`

## REMOVED Requirements

### Requirement: Store links SHALL render as direct navigation only for the item owner

**Reason**: The viewer-role split (owner chip row vs non-owner inert metadata) is dissolved: `View item ↗` (owned by `item-actions`) gives every viewer direct store navigation in every claim state, and the metadata line's multi-name `+N` truncation logic is moot under the single-store cap.

**Migration**: The inert price line is respecified by this change's "price line" requirement; the action set per viewer state is owned by `item-actions`' state matrix.

### Requirement: The store-links row SHALL render in a single line at all times

**Reason**: The `.storeLinks` chip row is retired with the `StoreLinks` component; no chip row renders on any surface.

**Migration**: Card-height invariance concerns disappear with the popover; the single-line price-line rule lives in the new price-line requirement.

### Requirement: The +N trigger SHALL open a `<Menu>` popover containing all stores with their prices

**Reason**: Items carry a single store; there are no extra stores to list. The `+N` menu is retired on every surface (card and modal).

**Migration**: None — the primary store is the only store; navigation is `View item ↗` (`item-actions`).

### Requirement: Hover-open SHALL be available on devices that support hover

**Reason**: The behavior existed for the `+N` store popovers, which are retired.

**Migration**: None. The generic `useHoverOpenMenu` helper remains available to other menus but is no longer required here.

### Requirement: With no valid store, StoreLinks SHALL render nothing

**Reason**: `StoreLinks` is deleted.

**Migration**: The no-complete-store card behavior (claim affordance without store actions) is owned by `item-actions` (store-less matrix row); the no-price-line rule lives in the new price-line requirement.

### Requirement: Activating a buy-link or the +N trigger SHALL NOT propagate to the enclosing row

**Reason**: The buy-link chips and `+N` trigger are retired.

**Migration**: The equivalent non-propagation rule for `View item ↗` is owned by `item-actions`.

### Requirement: Sortable owner row SHALL render buy-link chips for parity

**Reason**: Buy-link chips are retired everywhere; parity is preserved through the shared row rendering `ItemActions` instead.

**Migration**: Sortable rows inherit the row-anatomy requirements' `ItemActions` trailing region like every other row surface.

### Requirement: The legacy in-row expand-collapse machinery SHALL be removed

**Reason**: Historical cleanup contract policing internals of the `StoreLinks` component, which this change deletes outright — the machinery cannot exist without its host.

**Migration**: None; the component's deletion subsumes the removal assertions.
