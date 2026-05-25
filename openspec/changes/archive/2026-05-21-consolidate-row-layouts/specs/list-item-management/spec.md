## ADDED Requirements

### Requirement: The choose-items page SHALL render rows via the shared item row primitive

Each selectable row on `/lists/[id]/choose-items` SHALL be composed of an outer `<label>` element (class `.choose-items-select`) wrapping (a) a `<CheckboxField>` from the `form-field-system` capability and (b) a `<Item />` from `app/(main)/items/ui/components/Item.tsx` rendered with the `preview` prop. The page SHALL NOT implement its own row-shape CSS, JSX, checkbox markup, thumbnail rendering, or buy-link chip markup; all of these SHALL be inherited from the shared row primitive owned by the `item-store-links` capability.

The outer `<label>` SHALL use `htmlFor` matching the `<CheckboxField>`'s input id so that clicking anywhere on the row body toggles the checkbox via the native label-input association. The `<CheckboxField>`'s own `<label>` (rendered internally by the primitive) SHALL retain the item name as its accessible label, with the visible label `<span>` hidden via the sr-only pattern.

Selection state SHALL be reflected on the outer `<label>` via the modifier classes `.is-on` (for items currently selected) and `.is-removing` (for items being unchecked from the list). State changes SHALL flow through the checkbox input's `onChange`, not through a row-level `onClick` handler. The page SHALL NOT use `e.stopPropagation()` to prevent click bubbling from interactive children — the new composition has distinct interactive semantics (label-click toggles selection; anchor-click inside a buy-link chip opens a store), eliminating the prior need for that pattern.

#### Scenario: Row body is rendered by <Item preview />

- **WHEN** a choose-items row renders for an item
- **THEN** the row's DOM contains a `<Item />` instance rendered with the `preview` prop (producing `.item-container.preview` on the inner card), and the row's class list, computed grid template, image size, name typography, price layout, and buy-link chip layout are identical to those of the same item rendered in the items library list view

#### Scenario: Checkbox is rendered by <CheckboxField>

- **WHEN** a choose-items row renders
- **THEN** the checkbox SHALL be a `<CheckboxField>` instance from `app/ui/components/field/CheckboxField.tsx`, the rendered DOM contains a `<input type="checkbox">` inside a `<label>`, and the input's accessible name is the item name

#### Scenario: Outer label uses htmlFor to enable click-anywhere toggle

- **WHEN** a choose-items row renders
- **THEN** the outer `<label class="choose-items-select">` SHALL set `htmlFor` to the inner checkbox input's `id`; clicking any non-interactive region of the row SHALL toggle the checkbox via the native label association

#### Scenario: Selection state flows through onChange, not onClick

- **WHEN** the user clicks a row to toggle its selection
- **THEN** the state update SHALL be triggered by the `<input type="checkbox">`'s `onChange` event; no `onClick` handler on the row body SHALL invoke `toggle(id)`; no `e.stopPropagation()` SHALL be present on any interactive child element to defend against bubbling

#### Scenario: Page behavior is unchanged

- **WHEN** the user interacts with the picker — applying search/sort/filter, checking/unchecking rows, navigating with the back button, viewing on mobile, clicking the empty-state CTA, clicking "Create new item", or submitting Save changes
- **THEN** every behavior governed by the other requirements in this capability (toolbar URL params, save diff, selection preservation across filter changes, returnTo plumbing, archived-badge rendering, post-create redirect, empty-state CTA target) SHALL produce identical results to the previous bespoke-row implementation
