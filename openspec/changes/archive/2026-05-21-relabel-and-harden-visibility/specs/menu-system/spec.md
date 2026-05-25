## ADDED Requirements

### Requirement: MenuItemRadio renders a radio-tier menu row

The system SHALL provide a `<MenuItemRadio>` component at `app/ui/components/menu/MenuItemRadio.tsx` that renders a native `<button role="menuitemradio">` element with optional left-icon, a label, and a one-line description slot. `<MenuItemRadio>` MUST accept `checked: boolean`, `onSelect: () => void`, and the same icon prop as `<MenuItem>`, and SHALL render `aria-checked={checked}` on the button. When `checked` is true, the row SHALL render a trailing `✓` indicator (or equivalent visually-distinct selected mark) at the row's trailing edge.

`<MenuItemRadio>` SHALL be visually compatible with `<MenuItem>` and `<MenuLinkItem>` (matching row height, padding, icon alignment, hover treatment, focus-visible ring) and SHALL consume the same button-system focus tokens.

#### Scenario: MenuItemRadio renders a selectable radio row

- **WHEN** `<MenuItemRadio icon={<Icon/>} checked={false} onSelect={fn}>Label</MenuItemRadio>` is rendered inside `<Menu>`
- **THEN** the rendered element is a `<button type="button" role="menuitemradio" aria-checked="false">` containing the icon and label, and activating it invokes `fn`

#### Scenario: Checked MenuItemRadio shows trailing indicator

- **WHEN** `<MenuItemRadio checked={true}>Label</MenuItemRadio>` is rendered
- **THEN** the rendered element has `aria-checked="true"` and a visible trailing `✓` (or equivalent) indicator at the row's trailing edge

#### Scenario: MenuItemRadio with description renders supporting line

- **WHEN** `<MenuItemRadio icon={<Icon/>} checked={true} description="Anyone with the link can view">Label</MenuItemRadio>` is rendered
- **THEN** the row renders the description as a secondary text line beneath the label, visually subordinate, within the same row container

#### Scenario: MenuItemRadio is visually compatible with MenuItem

- **WHEN** `<MenuItem>` and `<MenuItemRadio>` (without description) are rendered with the same icon and label inside the same `<Menu>`
- **THEN** they produce visually compatible rows (same row height, padding, icon alignment, hover treatment) — only the trailing indicator (when checked) and the role / `aria-checked` semantics differ

## MODIFIED Requirements

### Requirement: Menu provides arrow-key navigation between items

The system SHALL provide keyboard navigation between `<MenuItem>`, `<MenuLinkItem>`, and `<MenuItemRadio>` rows when `<Menu>` is open. Arrow Down moves focus to the next item; Arrow Up moves focus to the previous; Home moves to the first; End moves to the last. Navigation MUST skip items with `aria-disabled="true"` and MUST wrap (Arrow Down from the last item moves to the first; Arrow Up from the first moves to the last). Navigation MUST target all three row primitives uniformly — implementations using a CSS selector for focusable rows SHALL use `[role^="menuitem"]` (or equivalent) so the selector matches `menuitem`, `menuitemradio`, and `menuitemcheckbox`.

#### Scenario: User navigates with arrow keys across mixed row types

- **WHEN** the menu is open with a mix of `<MenuItem>` and `<MenuItemRadio>` rows, and focus is on the first row, and the user presses Arrow Down
- **THEN** focus moves to the second row regardless of whether the second row is a `<MenuItem>` or `<MenuItemRadio>`

#### Scenario: Arrow key wraps at the end

- **WHEN** the menu is open and focus is on the last item, and the user presses Arrow Down
- **THEN** focus moves to the first item

#### Scenario: Home and End jump to extremes

- **WHEN** the menu is open and focus is in the middle, and the user presses Home (or End)
- **THEN** focus moves to the first (or last) item

#### Scenario: Navigation skips disabled items

- **WHEN** a menu item (of any row type) has `aria-disabled="true"` and the user navigates via arrow keys
- **THEN** focus skips that item — arrow keys move to the next/previous enabled item
