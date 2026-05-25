## MODIFIED Requirements

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
