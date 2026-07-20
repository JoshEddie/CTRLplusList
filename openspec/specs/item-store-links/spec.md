# item-store-links Specification

## Purpose

The `item-store-links` capability renders an item's buy options as a single-line store-chip row beneath the item. Valid stores (a non-empty name, a non-empty link, and a numeric price) are sorted ascending by price; the cheapest becomes the primary buy-link chip and sets the item's displayed price (`$X.XX`). When more than one valid store exists, a `+N` trigger opens a `<Menu>` popover listing every valid store (including the primary) with its name and price, each a `target="_blank"` anchor — openable by click or hover (with a grace period) and placed upward over the card by default, flipping below when there is insufficient room above. When an item has no valid store, the component falls back to rendering its claim/purchase `children` (or nothing), and activating any chip never bubbles its click to the enclosing card/row.
## Requirements
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

### Requirement: Mobile narrow row view SHALL collapse owner actions into a kebab `<Menu>` at <400px

Owner actions on an item card/row SHALL render as a single kebab `<Menu>` at ALL viewport widths — the former ≥400px inline edit + archive icon pair (`.item-owner-actions`) is retired, and the `<400px` media-query split collapses. The kebab SHALL be a `<Button variant="ghost" size="sm">` with `aria-haspopup="menu"` and `aria-expanded` wiring, opening a `<Menu>` (from the `menu-system` capability) containing, in order: one Edit `<MenuLinkItem>`, one Archive/Unarchive `<MenuItem>` (when `showArchiveAction` is true), and one Remove from list `tone="danger"` `<MenuItem>` (only in owned-list context — semantics owned by the `list-item-management` capability). Delete SHALL NOT appear in this menu — Archive preserves other users' claim history and is the recommended path for owners winding down lists.

#### Scenario: Kebab is the sole owner-actions affordance at every viewport

- **WHEN** the row or grid view renders at any viewport width and the viewer is the owner
- **THEN** the `.item-owner-actions-mobile` kebab trigger SHALL be visible and no `.item-owner-actions` inline edit/archive icons SHALL render

#### Scenario: Kebab menu contains Edit, Archive, and contextual Remove from list only

- **WHEN** the kebab is opened
- **THEN** the menu SHALL contain exactly an Edit menu-link-item linking to the item-edit page, (when `showArchiveAction` is true) an Archive menu-item that toggles the item's archived state, and (only in owned-list context) a Remove from list danger menu-item. No Delete affordance SHALL appear here.

#### Scenario: Kebab menu uses `<Menu>` primitive contract

- **WHEN** the kebab menu opens
- **THEN** it SHALL behave according to the `menu-system` capability — outside-click and Escape dismiss, arrow-key navigation between items, focus return to the kebab trigger on close

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

### Requirement: Store rows SHALL carry optional fetched-price provenance

The `item_stores` table SHALL carry three nullable columns: `price_fetched_at` (timestamp — when the stored price was captured by an automated product fetch), `canonical_url` (text — the canonical product URL or vendor key, e.g. an ASIN-bearing URL, for future dedupe), and `currency` (text). Manually entered store rows SHALL leave all three null. These fields SHALL be optional passthroughs in the store create/update path and SHALL NOT participate in the store-validity rule (a store remains valid solely on name + link + numeric price).

#### Scenario: Manual store rows have null provenance

- **WHEN** a user creates or edits a store row by hand
- **THEN** `price_fetched_at`, `canonical_url`, and `currency` SHALL persist as null

#### Scenario: Provenance does not affect validity

- **WHEN** a store row has name, link, and numeric price but null provenance columns
- **THEN** it SHALL be a valid store for every rendering and sorting rule in this capability

### Requirement: Fetched prices SHALL display their capture date to the owner

Where a store row's price is displayed on owner-facing editing surfaces (the item form's store rows), a store whose `price_fetched_at` is non-null SHALL render a muted "price as of {date}" annotation using the capture date. Stores with null `price_fetched_at` SHALL render no annotation. Viewer-facing price displays (cards, metadata lines, purchase modal) are unchanged by this requirement.

#### Scenario: Fetched price shows capture date in the form

- **WHEN** the owner edits an item whose store row has `price_fetched_at` set
- **THEN** the store row SHALL render a muted "price as of {date}" annotation

#### Scenario: Manual price shows no annotation

- **WHEN** the owner edits an item whose store row has null `price_fetched_at`
- **THEN** no "price as of" annotation SHALL render

### Requirement: The price line SHALL name the primary store as inert metadata

Wherever an item card or row displays its price, the line SHALL render the primary store's price as muted, inert text: no anchor, no button, no external-link icon, no tap affordance, and never wrapping to a second line. For a complete (FULL) store the line SHALL read `$X.XX · {store name}`; for a PRICED (linkless) store it SHALL read `$X.XX` alone — no `·` separator and no name fragment. The line SHALL render whenever the item has a valid store (FULL ∪ PRICED), uniformly across claim states — store navigation is carried exclusively by the `View item ↗` action owned by `item-actions`, so the metadata line never doubles as navigation. When no valid store exists (BARE, or only invalid legacy rows), no price line SHALL render.

#### Scenario: Price line names the single store

- **WHEN** any viewer renders an item whose complete store is Crate & Barrel at $19.99
- **THEN** the price line SHALL read `$19.99 · Crate & Barrel`, no element of it SHALL be interactive, and it SHALL render on one line

#### Scenario: PRICED item shows a bare price

- **WHEN** any viewer renders an item whose valid store is PRICED at $25.00
- **THEN** the price line SHALL read `$25.00` with no `·` separator, no store name, and no interactive element

#### Scenario: No valid store, no price line

- **WHEN** an item has no valid store (no rows, or only legacy rows failing the validity predicates)
- **THEN** no price line SHALL render

### Requirement: Items SHALL be capped at a single store on create and update

The create and update paths SHALL accept a single scalar store: `createItem`/`updateItem` SHALL take one nullable `store` object — no array SHALL appear in the submitted payload, the zod contract, or the action signature — and SHALL accept exactly the tri-state model, mirroring the client-side gate so the actions cannot persist what the UI forbids: an absent or all-empty store (BARE) SHALL persist zero rows, a PRICED store SHALL persist one `{ name: '', link: '', price }` row with null provenance, and a FULL store SHALL persist as today. A store failing the validity predicates — name without link, link without name, link without a good price, or a malformed non-empty price — SHALL be rejected with a validation failure. The internal positional store-sync invocation is unchanged (BARE passes an empty array), so syncing still removes rows beyond the submitted set, collapsing legacy multi-store items on first edit-save — including to zero rows for a BARE save. The `item_stores` schema is unchanged — the cap is input-side only. Existing multi-store items SHALL render their DAL-selected scalar `store` everywhere; their extra rows are dormant and excluded from every display surface. The edit path SHALL seed from the DAL scalar (whose selection rule already falls back to the first row when none is valid, so legacy incomplete rows surface for repair) and SHALL submit at most one store. No migration SHALL be run for untouched items.

#### Scenario: Store-less item saves

- **WHEN** a create or update submission carries no store (or a store whose name, link, and price are all empty)
- **THEN** the action SHALL succeed and persist zero `item_stores` rows for the item

#### Scenario: PRICED submission persists a linkless row

- **WHEN** an update submission carries `{ name: '', link: '', price: '25.00' }`
- **THEN** the action SHALL succeed and persist exactly one row with empty name/link, the price, and null provenance

#### Scenario: Name-without-link payload is rejected

- **WHEN** a create or update submission carries a store with a non-empty name and an empty link
- **THEN** the action SHALL reject with a validation failure

#### Scenario: Linked store still requires all three fields

- **WHEN** a create or update submission carries a store with a non-empty link missing its name or a valid price
- **THEN** the action SHALL reject with a validation failure

#### Scenario: Edit-save collapses legacy extras through the scalar path

- **WHEN** the owner edits a legacy multi-store item and saves the single seeded store
- **THEN** the action SHALL wrap the scalar for the positional sync internally and rows beyond the first SHALL be deleted

### Requirement: Primary-store selection SHALL happen once at the DAL read boundary

Every item read SHALL flatten the fetched `item_stores` rows to a single scalar `store: ItemStoreTable | null` via one shared pure selection helper co-located with the validity predicates: the lowest-priced **valid** store (FULL ∪ PRICED, per the shared predicates), else the first fetched row (so legacy incomplete rows stay reachable for repair), else `null`. The selection SHALL be a pure mapping over already-fetched rows (compatible with `'use cache'` reads — no request-scope inputs). No UI surface SHALL receive a store array or re-run primary-store selection; the retired UI-side selection helpers (`lowestPricedStore`, `sortedValidStores`) SHALL NOT be reintroduced. Because the scalar may carry an invalid row, display surfaces SHALL gate store-derived rendering on the shared predicates — the price line on validity, store link targets and store-gated actions on completeness — preserving the rendered outcomes of the previous complete-only selection for legacy rows.

#### Scenario: Reads return the cheapest valid store as the scalar

- **WHEN** an item's fetched rows contain two complete stores at $30 and $12 and one invalid row
- **THEN** every item read SHALL return the $12 store as `store`, and no consumer SHALL see the other rows

#### Scenario: PRICED row participates in selection

- **WHEN** an item's fetched rows contain only a PRICED row (`link` exactly `''`, good price)
- **THEN** `store` SHALL be that row and the price line SHALL render its bare price

#### Scenario: Only invalid rows — first row travels for repair, displays render nothing

- **WHEN** an item's fetched rows contain only invalid stores
- **THEN** `store` SHALL be the first fetched row, the edit path SHALL seed from it, and no price line, `View item ↗`, or other store-gated display SHALL render

#### Scenario: No rows — null store

- **WHEN** an item has no `item_stores` rows
- **THEN** `store` SHALL be `null` and every store-gated surface SHALL render its store-less state

### Requirement: Store validity SHALL be tri-state — FULL, PRICED, or absent

Two shared pure predicates SHALL live in one home (`lib/storeValidity.ts`), consumed by every surface — the DAL boundary's primary-store selection, display gating, the deck's tier rows, and the server actions' create/update validation — so validity cannot drift between surfaces:

- **Complete (FULL)** — `storeComplete`: non-empty `name`, a `link` accepted by `isValidProductUrl`, and a `price` whose tier is `good` per `priceTier`/`PRICE_PATTERN` (optional `$`, integer or up to two decimals). The sole gate for navigation surfaces (`View item ↗`, `Buy & Claim ↗`, the purchase modal store row).
- **Valid (FULL ∪ PRICED)** — a row is PRICED only when `link` is exactly `''`, `name` trims to `''`, and the price tier is `good`. Valid rows participate in primary-store selection and the price line. Requiring `link === ''` (not merely "invalid") keeps legacy dormant rows with broken non-empty links excluded — they SHALL NOT resurrect.

Name and link SHALL couple symmetrically: a non-empty name requires a valid link, a non-empty link requires a non-empty name (and a good price). Rows failing both predicates SHALL be excluded from selection (beyond the first-row repair fallback), the price line, and every store-gated action.

#### Scenario: PRICED row is valid but not navigable

- **WHEN** an item's only row is `{ name: '', link: '', price: '25.00' }`
- **THEN** the row SHALL be selected as the scalar `store`, the price line SHALL render, and no `View item ↗`, `Buy & Claim ↗`, or purchase-modal store row SHALL render

#### Scenario: Legacy invalid-link row stays excluded

- **WHEN** an item's fetched rows contain an entry with a good price and a non-empty `link` that fails `isValidProductUrl`
- **THEN** that entry SHALL NOT be valid — excluded from selection (beyond repair fallback) and every display

#### Scenario: Name without link is invalid

- **WHEN** a row carries a non-empty `name`, an empty `link`, and a good price
- **THEN** the row SHALL be neither complete nor valid

#### Scenario: One predicate pair everywhere

- **WHEN** the DAL selection helper, a display surface's gate, the deck's store/price rows, and the server action classify the same store value
- **THEN** all SHALL consume the same shared predicate helpers and agree on its state

