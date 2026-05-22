# menu-system Specification

## Purpose

TBD - created by archiving change standardize-menus-and-controls. Update Purpose after archive.

## Requirements

### Requirement: Menu primitive provides controlled popover container

The system SHALL provide a `<Menu>` component at `app/ui/components/menu/Menu.tsx` that renders a popover container with `role="menu"`. `<Menu>` MUST be controlled via `open: boolean` and `onClose: () => void` props. The trigger (the button that opens the menu) is NOT owned by `<Menu>` — the calling wrapper renders its own trigger with `aria-haspopup="menu"` and `aria-expanded={open}` wired to the same state.

#### Scenario: Menu renders only when open

- **WHEN** `<Menu open={false} onClose={fn}>` is rendered
- **THEN** no popover DOM is produced (the container is not in the document tree)

#### Scenario: Menu renders with role=menu when open

- **WHEN** `<Menu open={true} onClose={fn} aria-label="List actions">` is rendered with `<MenuItem>` / `<MenuLinkItem>` children
- **THEN** a container element with `role="menu"` and the provided `aria-label` is rendered, containing the children

#### Scenario: Menu closes on Escape

- **WHEN** the menu is open and the user presses Escape
- **THEN** `onClose` is called and focus returns to the trigger element

#### Scenario: Menu closes on outside click

- **WHEN** the menu is open and the user clicks outside the menu container
- **THEN** `onClose` is called

### Requirement: MenuItem renders a button-tier menu row

The system SHALL provide a `<MenuItem>` component that renders a native `<button role="menuitem">` element with optional left-icon and `tone: 'default' | 'danger'`. `<MenuItem>` MUST accept all standard `onClick`-style props and forward them to the rendered `<button>`.

#### Scenario: MenuItem renders an action row

- **WHEN** `<MenuItem icon={<Icon/>} onClick={fn}>Delete list</MenuItem>` is rendered inside `<Menu>`
- **THEN** the rendered element is a `<button type="button" role="menuitem">` with the icon and label, and clicking it invokes `fn`

#### Scenario: MenuItem with danger tone styles distinctly

- **WHEN** `<MenuItem tone="danger" onClick={fn}>Delete</MenuItem>` is rendered
- **THEN** the rendered element has a visually distinct danger treatment (typically a red/destructive color) without changing its `role="menuitem"` semantics

### Requirement: MenuLinkItem renders a navigation-tier menu row

The system SHALL provide a `<MenuLinkItem>` component that renders a Next `<Link role="menuitem">` element with the same icon and tone API as `<MenuItem>`. `<MenuLinkItem>` MUST accept `href` and forward it to the underlying `<Link>` for client-side navigation.

#### Scenario: MenuLinkItem navigates on click

- **WHEN** `<MenuLinkItem href="/lists/123/choose-items" icon={<Icon/>}>Choose items</MenuLinkItem>` is rendered inside `<Menu>` and the user activates it
- **THEN** the rendered element is a Next `<Link role="menuitem">` and activation navigates to the href via client-side routing

#### Scenario: MenuLinkItem and MenuItem are visually identical

- **WHEN** both `<MenuItem>` and `<MenuLinkItem>` are rendered with the same icon, label, and tone
- **THEN** they produce visually identical rows (height, padding, hover treatment, icon alignment) — only the element type and navigation behavior differ

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

### Requirement: Menu items consume the button system's focus and hover contract

The system SHALL ensure `<MenuItem>` and `<MenuLinkItem>` reuse the `--btn-focus-ring-color` token and `:focus-visible` model established by `button-system`, and guard `:hover` rules with `@media (hover: hover)` per `button-system`'s sticky-hover decision.

#### Scenario: Keyboard user tabs/arrows to a menu item

- **WHEN** the user reaches a menu item via keyboard
- **THEN** a `:focus-visible` indicator appears with the same contrast contract as `<Button>` focus indicators

#### Scenario: Touch user taps a menu item

- **WHEN** the user taps a menu item on a touch-only device
- **THEN** no sticky hover state remains after the tap (the `:hover` rule is guarded by `@media (hover: hover)`)

### Requirement: Menu can be triggered by any element with correct ARIA wiring

The system SHALL allow callers to use any element as the menu's trigger. The trigger MUST set `aria-haspopup="menu"` and `aria-expanded={open}` matching the `<Menu>`'s `open` prop, and MUST be referenced via an `anchorRef` passed to `<Menu>` if positioning depends on the trigger's location.

#### Scenario: Caller uses a Button as the trigger

- **WHEN** a wrapper renders `<Button variant="on-dark" aria-haspopup="menu" aria-expanded={open} onClick={...}>` alongside `<Menu open={open} onClose={...} anchorRef={ref}>`
- **THEN** the menu opens on button activation; `aria-expanded` reflects the open state; the menu positions itself relative to the anchor

#### Scenario: Caller uses an avatar image as the trigger

- **WHEN** a wrapper renders `<button className="avatar-container" aria-haspopup="menu" aria-expanded={open}>` alongside `<Menu open={open} ...>`
- **THEN** the same contract applies — the menu does not care what element type the trigger is, only that the ARIA wiring is correct

### Requirement: ListActionsMenu and UserAvatarPopover migrate to the Menu primitive

The system SHALL migrate `ListActionsMenu.tsx` and `UserAvatarPopover.tsx` to use `<Menu>` / `<MenuItem>` / `<MenuLinkItem>` for their dropdown internals. The wrappers retain ownership of their trigger element, open/close state, and any modal coordination (e.g. delete-confirmation modal in `ListActionsMenu`). The page-scoped CSS classes `.menu-item`, `.menu-item-danger`, `.menu-dropdown`, `.avatar-popover-item`, `.avatar-popover`, `.avatar-popover-divider`, `.avatar-popover-form`, `.avatar-popover-item-button` MUST be deleted after migration.

#### Scenario: ListActionsMenu dropdown uses Menu primitive

- **WHEN** `ListActionsMenu.tsx` is rendered after migration
- **THEN** its dropdown is a `<Menu>` containing `<MenuLinkItem>` (Choose items, Show/Hide spoilers, Preview/Exit preview) and `<MenuItem>` (Edit list, Delete list — with `tone="danger"` on Delete)

#### Scenario: UserAvatarPopover uses Menu primitive

- **WHEN** `UserAvatarPopover.tsx` is rendered after migration
- **THEN** its popover is a `<Menu>` containing the signed-in user header (page-scoped, not a MenuItem) plus `<MenuLinkItem>` (Connections) and `<MenuItem>` (Sign out — wired to the existing sign-out server action)

#### Scenario: Legacy menu CSS classes are removed

- **WHEN** the codebase is grepped for `.menu-item`, `.avatar-popover-item`, or related classes after migration
- **THEN** no definitions remain (excluding the documented `.menu-trigger` exemption from `standardize-buttons`)

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
