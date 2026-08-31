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

### Requirement: ListActionsMenu and UserAvatarPopover compose their rows from the Menu primitive

`ListActionsMenu.tsx` and `UserAvatarPopover.tsx` SHALL build their dropdown internals from `<Menu>` / `<MenuItem>` / `<MenuLinkItem>`, and SHALL hold each wrapper's rows to the enumeration stated in its scenario below. The wrappers retain ownership of their trigger element, open/close state, and any modal coordination (e.g. the delete-confirmation modal in `ListActionsMenu`).

The avatar popover's rows fall into two groups. A leading **switch group** carries the profiles the viewer may act as, owned by `app-frame` and `active-profile`; the **navigation rows** that follow are the popover's destinations and its terminal sign-out action. The navigation rows SHALL be ordered identity-first — the profiles the account runs, then its social graph — with sign-out last. Each navigation row SHALL carry an icon visually distinct from its sibling **navigation** rows, so two of them are not told apart by their label alone at icon size.

The sibling-distinctness rule does not reach the switch group, and SHALL NOT be read as requiring one. A switch row's leading slot SHALL carry the profile's own avatar — its art where it has any, its initials on its accent otherwise, per `profiles-surface`'s slot — rather than an icon: the rows are told apart by the identity each names, which is what the viewer is choosing between, and a set of five invented icons would say less than the profiles' own faces. The two groups are therefore distinguishable from each other by slot content as well as by position.

#### Scenario: ListActionsMenu dropdown uses Menu primitive

- **WHEN** `ListActionsMenu.tsx` is rendered
- **THEN** its dropdown is a `<Menu>` containing `<MenuLinkItem>` (Choose items, Show/Hide spoilers, Preview/Exit preview) and `<MenuItem>` (Edit list, Delete list — with `tone="danger"` on Delete)

#### Scenario: UserAvatarPopover enumerates Altvatars, Connections, then Sign out

- **WHEN** `UserAvatarPopover.tsx` is rendered
- **THEN** its popover is a `<Menu>` containing the signed-in user header (page-scoped, not a MenuItem), then a `<MenuItem>` per offered switch row (the group governed by `app-frame`, absent for a viewer who runs only their self-profile), then `<MenuLinkItem>` (Altvatars, then Connections — in that order) and `<MenuItem>` (Sign out — wired to the existing sign-out server action)
- **AND** the Altvatars row links to `/altvatar`, carries an icon distinct from the Connections row's, and carries the viewer's profile count per `app-frame` whenever it is more than one

#### Scenario: A switch row is led by the profile's avatar, not an icon

- **WHEN** the popover renders a switch row for a profile
- **THEN** the row's leading slot holds that profile's avatar slot content — its art, or its initials on its accent — and no navigation icon

#### Scenario: Switch rows do not owe each other distinct icons

- **WHEN** the popover renders more than one switch row
- **THEN** the sibling-distinctness rule is satisfied across the navigation rows alone, and the switch rows are told apart by the profile each names

### Requirement: The profile card's management menu composes its rows from the Menu primitive

The `⋯` control on a profile card's accent band SHALL open a `<Menu>` whose rows are `<MenuLinkItem>` / `<MenuItem>`, with the card's client wrapper owning the trigger and the open/close state. The trigger SHALL be a `button-system` control in the `on-dark` variant — it sits on the accent band, which is the case that variant exists for — and SHALL carry an accessible name naming the profile, since a grid renders one trigger per card and "actions" alone would repeat.

The menu's rows are not all destinations. A row that navigates SHALL be a `<MenuLinkItem>`; a row that performs an action in place SHALL be a `<MenuItem>`. The switch row `profiles-surface` puts first is an action, not a destination — switching re-renders the Profiles page rather than leaving it — so the menu's first row SHALL NOT be required to be a link. The row to the profile's own space remains a `<MenuLinkItem>` wherever it appears in the order.

#### Scenario: The card menu is a Menu of link rows

- **WHEN** the `⋯` control is activated on the card of the profile the viewer is acting as, whose menu carries no switch row
- **THEN** a `<Menu>` opens containing a `<MenuLinkItem>` per management destination, the first of which links to that profile's space

#### Scenario: An action row may precede the destinations

- **WHEN** a profile card's `⋯` control is activated on a card the viewer is not acting as
- **THEN** the menu's first row is a `<MenuItem>` performing the switch, followed by a `<MenuLinkItem>` per management destination, the first of which links to that profile's space

#### Scenario: Each card's trigger is named for its own profile

- **WHEN** the Profiles page renders more than one card
- **THEN** each card's menu trigger carries an accessible name naming that card's profile

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

### Requirement: Menu SHALL ignore outside-click events that originate inside the configured anchor element

The `<Menu>` component at `app/ui/components/menu/Menu.tsx` SHALL treat a `mousedown` event whose `target` is contained by `anchorRef.current` as an internal interaction, NOT as an outside click — `onClose` SHALL NOT be invoked, and the anchor SHALL NOT be focused-back (since it is already the click target). This is the dismiss-then-reopen guard: without it, clicking the trigger that opened the menu would close the menu, and the trigger's own `onClick` would then re-open it, producing a flicker / no-op cycle. The existing outside-click dismissal SHALL continue to apply for clicks whose `target` is neither inside the popover container nor inside the anchor element.

#### Scenario: Click on anchor element while menu is open does NOT close the menu

- **WHEN** `<Menu open={true} onClose={spy} anchorRef={anchorRef}>` is rendered and the user clicks an element that is contained by `anchorRef.current`
- **THEN** `spy` is NOT invoked
- **AND** the menu's popover DOM remains in the document tree

#### Scenario: Click outside both the popover and the anchor closes the menu

- **WHEN** `<Menu open={true} onClose={spy} anchorRef={anchorRef}>` is rendered and the user clicks `document.body` (or any element neither contained by the popover nor by the anchor)
- **THEN** `spy` is invoked exactly once
- **AND** the anchor element receives focus (`anchorRef.current?.focus()` is called)

#### Scenario: Click inside the popover does NOT close the menu

- **WHEN** `<Menu open={true} onClose={spy}>` is rendered and the user clicks an element inside the popover (e.g., a non-interactive label inside a `<MenuItem>`)
- **THEN** `spy` is NOT invoked

### Requirement: Menu SHALL focus the first non-disabled item on open with `{ preventScroll: true }`

When `<Menu>` transitions from `open={false}` to `open={true}`, the component SHALL focus the first menu-item element matching `[role^="menuitem"]:not([aria-disabled="true"])` (the same selector used by arrow-key navigation, so MenuItem, MenuLinkItem, and MenuItemRadio are all candidates). The `focus()` call SHALL pass the option `{ preventScroll: true }` so that a menu opened offscreen (e.g., hover-opened upward when the trigger is near the top of a scrollable container) does NOT trigger the browser's default scroll-into-view behavior, which would shift the trigger out from under the cursor. When the menu has zero items, no focus call is made and the effect returns without action.

#### Scenario: First item receives focus with preventScroll on open

- **WHEN** `<Menu open={true}>` is rendered containing `<MenuItem>First</MenuItem>` followed by additional items, and `HTMLElement.prototype.focus` is spied
- **THEN** `focus` is called on the rendered `<button>` corresponding to "First"
- **AND** the call argument is the object `{ preventScroll: true }`

#### Scenario: First item is `aria-disabled` — focus moves to the first enabled item

- **WHEN** `<Menu open={true}>` is rendered containing `<MenuItem aria-disabled="true">Disabled</MenuItem>` followed by `<MenuItem>Enabled</MenuItem>`
- **THEN** `focus` is called on the "Enabled" button (the disabled item is skipped by the selector)
- **AND** the call argument is `{ preventScroll: true }`

#### Scenario: Empty menu does not call focus

- **WHEN** `<Menu open={true}>` is rendered with no children (zero menu items)
- **THEN** `HTMLElement.prototype.focus` is NOT called by the menu's initial-focus effect

### Requirement: MenuItemRadio SHALL invoke consumer `onClick` first and SHALL invoke `onSelect` only when the event's `defaultPrevented` remains false

The `<MenuItemRadio>` component at `app/ui/components/menu/MenuItemRadio.tsx` SHALL wire its rendered `<button>`'s `onClick` to a handler that first invokes the consumer's `onClick` prop (using optional-chaining — when the prop is omitted, the call is skipped without error) with the click event, then checks `event.defaultPrevented` AND invokes `onSelect` only if `defaultPrevented` is false. This gives consumers a cancellation hook: an `onClick` handler that calls `e.preventDefault()` SHALL suppress the `onSelect` callback. When no `onClick` prop is provided, the optional chain short-circuits, `defaultPrevented` remains false on the synthetic event, and `onSelect` SHALL be invoked exactly once per click.

#### Scenario: No onClick prop — onSelect is called

- **WHEN** `<MenuItemRadio checked={false} onSelect={selectSpy}>Label</MenuItemRadio>` is rendered (no `onClick` prop) and the user clicks the button
- **THEN** `selectSpy` is invoked exactly once

#### Scenario: onClick provided that does NOT prevent default — both run in order

- **WHEN** `<MenuItemRadio checked={false} onClick={clickSpy} onSelect={selectSpy}>Label</MenuItemRadio>` is rendered with `clickSpy` that does not call `e.preventDefault()` and the user clicks the button
- **THEN** `clickSpy` is invoked exactly once
- **AND** `selectSpy` is invoked exactly once
- **AND** `clickSpy` is invoked before `selectSpy` (verified via mock invocation order)

#### Scenario: onClick that prevents default suppresses onSelect

- **WHEN** `<MenuItemRadio checked={false} onClick={clickSpy} onSelect={selectSpy}>Label</MenuItemRadio>` is rendered with `clickSpy` that calls `e.preventDefault()` and the user clicks the button
- **THEN** `clickSpy` is invoked exactly once
- **AND** `selectSpy` is NOT invoked

### Requirement: `menuItemClasses({ tone, extra })` SHALL compose the wrapper class string in fixed token order

The `menuItemClasses` helper at `app/ui/components/menu/menuClasses.ts` SHALL compose its returned string as `['menu-item', tone === 'danger' && 'tone-danger', extra].filter(Boolean).join(' ')`. The token order SHALL be: (1) `'menu-item'` always first; (2) `'tone-danger'` second IFF `tone === 'danger'` (the `'default'` tone — including the omitted default — does NOT emit a tone token); (3) `extra` third IFF `extra` is truthy (empty-string and `undefined` `extra` values are filtered out). The composition SHALL be the single source of class strings for both `<MenuItem>` and `<MenuLinkItem>` — both row primitives SHALL produce identical class strings when given the same `tone` and `className` props.

#### Scenario: No arguments returns the base token

- **WHEN** `menuItemClasses()` (or `menuItemClasses({})`) is called
- **THEN** the return value is the string `'menu-item'` (no leading or trailing whitespace, no tone token, no extra token)

#### Scenario: Default tone does not emit a tone token

- **WHEN** `menuItemClasses({ tone: 'default' })` is called
- **THEN** the return value is the string `'menu-item'`

#### Scenario: Danger tone adds tone-danger after menu-item

- **WHEN** `menuItemClasses({ tone: 'danger' })` is called
- **THEN** the return value is the string `'menu-item tone-danger'` (exactly one space, in order)

#### Scenario: Extra is appended last

- **WHEN** `menuItemClasses({ tone: 'danger', extra: 'foo' })` is called
- **THEN** the return value is the string `'menu-item tone-danger foo'` (order: base, tone, extra)
- **AND** `menuItemClasses({ tone: 'default', extra: 'foo' })` returns `'menu-item foo'`

#### Scenario: Falsy extra is filtered

- **WHEN** `menuItemClasses({ extra: '' })` or `menuItemClasses({ extra: undefined })` is called
- **THEN** the return value is the string `'menu-item'` (the empty / undefined `extra` is filtered by `.filter(Boolean)`)

#### Scenario: MenuItem and MenuLinkItem produce identical class strings for identical props

- **WHEN** `<MenuItem tone="danger" className="foo">` and `<MenuLinkItem tone="danger" className="foo" href="/x">` are rendered
- **THEN** the rendered `<button>` and `<a>` carry identical class strings (`'menu-item tone-danger foo'`), confirming both row primitives flow through the shared `menuItemClasses` composer

### Requirement: Menu popover flips upward when it would overflow the bottom viewport edge

The `<Menu>` popover SHALL open below its trigger by default. On open, the menu SHALL measure whether its rendered height fits in the viewport space below the trigger; when it does not fit below and the space above the trigger can contain it, the menu SHALL open upward instead (anchored above the trigger with the same 6px gap), applied before first paint so no downward-positioned frame is visible. The flip decision is computed once per open. The existing `max-height: 80vh; overflow-y: auto` behavior SHALL be retained for the case where the menu fits on neither side. Flipping SHALL NOT alter the dismiss (Escape / outside click), open-focus, or keyboard-navigation contracts.

#### Scenario: Menu fits below the trigger

- **WHEN** the menu opens and the viewport space below the trigger is at least the menu's rendered height plus the gap
- **THEN** the menu opens below the trigger (default placement, no upward modifier applied)

#### Scenario: Menu would overflow the bottom viewport edge

- **WHEN** the menu opens with the trigger near the bottom of the viewport, such that the menu's rendered height does not fit below but does fit above
- **THEN** the menu opens upward, anchored above the trigger, and is fully within the viewport

#### Scenario: Menu fits on neither side

- **WHEN** the menu opens in a viewport where neither the space below nor above the trigger can contain the menu's full height
- **THEN** the menu remains bounded by `max-height: 80vh` and scrolls internally via `overflow-y: auto`

#### Scenario: Flipped menu keeps the dismiss and focus contracts

- **WHEN** the menu opens upward and the user presses Escape or clicks outside
- **THEN** `onClose` is called exactly as in the downward placement, and on open the first non-disabled item received focus with `{ preventScroll: true }`
