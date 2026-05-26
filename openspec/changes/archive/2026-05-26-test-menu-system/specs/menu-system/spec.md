## ADDED Requirements

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
