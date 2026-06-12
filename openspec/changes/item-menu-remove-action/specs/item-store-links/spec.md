## MODIFIED Requirements

### Requirement: The right column (col 5) SHALL be viewer-aware and SHALL be absorbed by a wide claimed pill when applicable

The right-most column of the row-view grid SHALL render different content per viewer state:

- Owner, no claim/spoiler state (all viewports): a kebab `<Menu>` trigger that opens the owner-actions menu (Edit, Archive when applicable, Remove from list in owned-list context — contents owned by the kebab requirement below). The former inline edit + archive icon pair is retired.
- Non-owner, unclaimed: a "Get this gift" primary button (full label at all viewports) that opens the purchase modal
- Non-owner, fully claimed by others: a disabled "✓ Fully claimed" pill in the same right-column cell as the other claim affordances (cols 3–4 are empty for a non-owner; spanning them would add their column gaps and misalign the pill); the card surface receives the muted/desaturated claimed treatment and the purchase modal SHALL NOT be openable from it
- Non-owner, viewer has a removable claim: an outline "Manage your claim" button that opens the purchase modal's already-claimed state (store row + remove-claim affordance); the price row shows the plain price with no metadata line

In row view, the right-column claim affordances ("Get this gift", "Manage your claim", the disabled "Fully claimed" pill) SHALL share a `min-width: 165px` floor so rows align across states.
- Owner with spoilers active (revealed claim): NOT ABSORBED — the spoiler pill occupies col 3 only (same slot the buy-pill would have), leaving the owner-actions kebab cell free at all viewports. The wide-pill treatment would stomp on the owner-actions cell and obscure the owner's actions — the owner's primary intent at `/lists/[ownedId]?spoilers=on` is editing while seeing who claimed what, so the kebab SHALL remain visible.

#### Scenario: Owner sees the kebab trigger in col 5 at all viewports

- **WHEN** the viewer owns the list and the item is unclaimed, at any viewport width
- **THEN** column 5 SHALL contain the kebab `<Menu>` trigger and SHALL NOT contain inline edit or archive icon buttons

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
- **THEN** the `.purchased-banner--spoiler` element SHALL apply `grid-column: 3` (not `3 / -1`), occupying only the buy-pill cell on rows 1–2; the kebab `.item-owner-actions-mobile` cell SHALL remain available at all viewports. The spoiler pill SHALL NOT overlap or obscure the kebab affordance.

#### Scenario: Footer banner is hidden in row view

- **WHEN** an item renders in row view (`.item-list` or `.sortable-item`)
- **THEN** the `.purchased-banner` / `.purchased-banner--mine` / `.purchased-banner--spoiler` footer SHALL be hidden via CSS (`display: none`). The same banners SHALL continue to render in grid view.

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

`.item-list .item-container` and `.sortable-item .item-container` at `<600px` SHALL apply a grid template that stacks content vertically rather than compressing horizontally. The shape SHALL be: image (col `img`, spans rows 1–2), title (col `content`, row 1), price (col `content`, row 2 — for a non-owner the store-metadata line joins the price on this row), description (col 1/-1, row 3, full-width), action row (col 1/-1, row 4, full-width). The action row's contents are viewer-aware: for the owner, buy-link + `+N` flush-left and the owner-actions kebab flush-right; for a non-owner, the "Get this gift" button (full label — the previous `<600px` "Claim" short form is retired). The leader-dot `::after` SHALL be suppressed at this breakpoint. The leading slot (col `leading`) is the same column used by drag handle / checkbox surfaces.

#### Scenario: Mobile row stacks vertically instead of cramming horizontally

- **WHEN** the viewport is `<600px` and a row is rendered
- **THEN** the title and price SHALL stack on rows 1 and 2 right of the image; the description SHALL render on row 3 spanning the full width; the viewer-aware action row SHALL render on row 4 spanning the full width

#### Scenario: Non-owner mobile row shows metadata and the full button label

- **WHEN** the viewport is `<600px` and a non-owner renders an unclaimed item with multiple stores
- **THEN** the store-metadata line SHALL render with the price (single line, `+N` truncation) and the action row SHALL contain the "Get this gift" button with its full label

#### Scenario: Leader dots are suppressed at mobile

- **WHEN** the viewport is `<600px`
- **THEN** the `::after` leader-dot pseudo-element on `.item-price-row` SHALL NOT render (display: none); the price stands alone on its row without a dotted leader

#### Scenario: Owner-actions kebab engages in the action row

- **WHEN** the viewport is `<600px` and the viewer is the owner
- **THEN** the kebab `<Menu>` SHALL be visible flush-right in the action-row column, consistent with the universal-kebab requirement

### Requirement: Choose-items SHALL adopt the shared row's visual treatment at mobile and render descriptions

`.choose-items-row` at `/lists/[id]/choose-items` SHALL NOT exist as a bespoke row implementation. The picker row SHALL render via the same `<Item />` component used by the items library, in `preview` mode, wrapped in a `<label>` that contributes a leading checkbox column (analog of how `.sortable-item` contributes a leading drag-handle column). The outer label and its checkbox SHALL render via `<CheckboxField>` from the `form-field-system` capability. The inner `<Item />` body SHALL inherit the shared row's complete anatomy:

- At `≥600px`: the shared row's outer grid (`52px 1fr auto auto auto / auto auto`) with image (col 1), name (col 2 row 1), price + leader dots (col 2 row 2), tall buy-link pill (col 3), `+N` popover trigger when extras present (col 4). The picker's right column (col 5) — normally owner-actions or claim CTA — SHALL be suppressed because (a) the picker's viewer is the item owner so the non-owner Claim CTA does not render, and (b) the `.preview .item-owner-actions-mobile { display: none; }` rule hides the owner-actions kebab on `<Item preview />` rows.
- At `<600px`: the shared row's mobile horizontal-card reflow (image upper-left spanning content rows, name row 1, price row 2, description row 3, store-chip + actions row 4). The picker's outer 2-col layout (checkbox + Item) collapses naturally into this reflow with the checkbox remaining in the leading position at the row's vertical center.
- At all widths: the owner-actions kebab cell SHALL be suppressed on `<Item preview />` rows via the `.preview .item-owner-actions-mobile { display: none; }` rule (the former companion `.preview .item-owner-actions` rule retires with the inline-icons cell).

Buy-link chips inside the picker row SHALL render via the shared `<StoreLinks>` primitive (inherited through `<Item>`), not via a page-scoped `.choose-items-chip` rule. The primary buy-link SHALL render as a tall `<LinkButton>` pill; extra stores SHALL render via the `+N` `<Menu>` popover defined by this capability's other requirements. Buy-link chips SHALL remain live `<a target="_blank">` anchors in the picker (not suppressed via `pointer-events: none`) so the picker user can verify destination URLs without leaving the page.

The page-scoped state modifiers — `.choose-items-select.is-on` (currently-selected items, additive background-color tint via `var(--card-accent-background-color)`), `.choose-items-select.is-removing` (items being unchecked from the list, additive background-color tint via `var(--secondary-background-color)` plus strike-through on the rendered `.itemName` via the page-scoped rule `.choose-items-select.is-removing .itemName { text-decoration: line-through; }`), the "IN LIST" badge, and the "archived" badge — SHALL be retained as additive overlays that do not modify the shared row's grid template.

The description SHALL be rendered by `<Item />` itself (which already renders descriptions in the shared row's mobile row-3 slot and in the desktop row-3 footer line). No `.choose-items-description` page-scoped rule SHALL exist.

#### Scenario: Choose-items row consumes the shared row primitive

- **WHEN** a choose-items row renders at any breakpoint
- **THEN** the row's body SHALL be a `<Item />` component rendered with `preview` (producing `.item-container.preview` markup), and the row SHALL inherit the shared `.item-list .item-container` / `.sortable-item .item-container` CSS rules at the same selectors used by the items library; no `.choose-items-row` CSS rule SHALL exist

#### Scenario: Picker checkbox uses the form-field-system primitive

- **WHEN** a choose-items row renders
- **THEN** the checkbox SHALL be rendered via `<CheckboxField>` from `app/ui/components/field/CheckboxField.tsx` with `label={item.name}`; the label `<span>` SHALL be visually hidden via page-scoped CSS (sr-only pattern) because the item name is already rendered by `<Item />` and the accessible name is correctly carried by the `<CheckboxField>` label

#### Scenario: Owner-actions kebab is hidden on preview rows at all widths

- **WHEN** a `<Item preview />` row renders at any viewport width
- **THEN** the `.item-owner-actions-mobile` kebab cell SHALL be hidden via `.preview .item-owner-actions-mobile { display: none; }`

#### Scenario: Buy-link chips on picker rows are live anchors

- **WHEN** the picker row contains an item with one or more valid stores
- **THEN** the chips SHALL render via `<StoreLinks>` with the primary as a `<LinkButton>` tall pill and extras behind a `+N` popover trigger, and the anchors SHALL be interactive (not suppressed with `pointer-events: none`); clicking a chip SHALL open the store URL in a new tab without toggling the row's selection state

#### Scenario: Selection state modifiers apply additively to the outer label

- **WHEN** a row's selection state is `is-on` or `is-removing`
- **THEN** the modifier class SHALL be applied to the outer `.choose-items-select` element (the `<label>` wrapper), the row's background-color SHALL change additively via the modifier rule, and the `is-removing` state SHALL additionally apply `text-decoration: line-through` to the rendered `.itemName` inside the row via the page-scoped rule `.choose-items-select.is-removing .itemName`

#### Scenario: IN LIST and archived badges render as overlays

- **WHEN** an item is currently in the list (`wasIn && isSelected`) or is archived
- **THEN** the corresponding `.choose-items-in-badge` or `.choose-items-archived-badge` SHALL render as a sibling of `<Item />` inside the `.choose-items-select` label, positioned via CSS so it does not modify the shared row's grid template
