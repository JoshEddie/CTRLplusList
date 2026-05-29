## MODIFIED Requirements

### Requirement: The gradient nav SHALL show the brand lockup, primary nav, and viewer avatar

The gradient nav SHALL render at 60px height on desktop and 54px on mobile. On desktop it SHALL contain three regions: the **CTRL+list** brand lockup at left, a row of primary nav pills (Home / Lists / Items / Purchased) at center, and the viewer's avatar circle at right. On mobile (≤700px, matching the actual `app-frame.css` `@media (max-width: 700px)` selector) the primary nav pills SHALL collapse behind a toggle button — the gradient nav's default mobile chrome SHALL be the brand lockup, the toggle button, and the avatar circle (three elements). The toggle button SHALL reveal the pill row as a vertical popover anchored below the toggle when activated.

#### Scenario: Desktop nav renders all four pills

- **WHEN** the viewer is on a desktop viewport above 700px wide
- **THEN** the gradient nav shows the brand lockup at left, Home / Lists / Items / Purchased pills in the center, and the avatar circle at right

#### Scenario: Mobile nav collapses pills behind a toggle

- **WHEN** the viewport is 700px wide or narrower
- **THEN** the gradient nav shows the brand lockup, a toggle button (closed state: `LuMenu` icon, `aria-label="Open menu"`, `aria-expanded="false"`), and the avatar circle
- **AND** the four primary nav pills are NOT visible in the gradient bar
- **AND WHEN** the toggle is activated (clicked / Enter / Space)
- **THEN** the toggle's `aria-expanded` flips to `"true"`, its `aria-label` flips to `"Close menu"`, its icon flips to `LuX`
- **AND** the four primary nav pills render as a vertical menu anchored below the toggle

#### Scenario: Avatar shows viewer initials

- **WHEN** an authenticated user with a known name loads any `(main)/` page
- **THEN** the avatar circle renders the first letter of their first and last name (e.g. "JE" for Josh Eddie)

## ADDED Requirements

### Requirement: The mobile AppNav menu SHALL auto-close on route change, outside pointer-down, and Escape

When the mobile AppNav toggle menu is open (the `.app-nav-wrap` element has `data-open="true"`), the menu SHALL close — transition to `data-open="false"`, restore the `LuMenu` icon, restore `aria-expanded="false"`, restore `aria-label="Open menu"` — on any of three triggers: (a) the `pathname` returned by `usePathname()` changes (route navigation); (b) a `mousedown` event fires on an element outside the `.app-nav-wrap` container; (c) a `keydown` event fires with `key === 'Escape'` anywhere in the document. The outside-pointer and Escape listeners SHALL be attached to `document` only while the menu is open, and SHALL be removed when the menu closes or the component unmounts. A `mousedown` inside the `.app-nav-wrap` container (on the toggle button or on any pill within the menu) SHALL NOT close the menu — the source's `wrapRef.current.contains(e.target)` guard preserves clicks within the menu surface.

#### Scenario: Route change closes the menu

- **WHEN** the menu is open and `usePathname()` returns a new path (route navigation occurred)
- **THEN** the menu transitions to closed (`data-open="false"`, toggle restored to `LuMenu` + `"Open menu"`)

#### Scenario: Outside mousedown closes the menu

- **WHEN** the menu is open and a `mousedown` event fires on an element that is NOT a descendant of `.app-nav-wrap`
- **THEN** the menu transitions to closed

#### Scenario: Escape keydown closes the menu

- **WHEN** the menu is open and a `keydown` event with `key === 'Escape'` fires on `document`
- **THEN** the menu transitions to closed

#### Scenario: Inside mousedown does NOT close the menu

- **WHEN** the menu is open and a `mousedown` event fires on the toggle button or on a pill inside `.app-nav-wrap`
- **THEN** the menu remains open (`data-open="true"` is preserved)

#### Scenario: Listeners are scoped to open state

- **WHEN** the menu is closed
- **THEN** no `mousedown` or `keydown` listener for the dismissal contract is attached to `document`
- **AND WHEN** the menu transitions to open
- **THEN** both listeners attach to `document`
- **AND WHEN** the menu transitions to closed (via any trigger) OR the component unmounts
- **THEN** both listeners detach from `document`

### Requirement: The Lists nav pill SHALL NOT activate on `/lists/bookmarks` or `/lists/history`

The active-pill prefix rule for the Lists destination (`pathname === '/lists' || pathname.startsWith('/lists/')`) SHALL be carved with an explicit exclusion set containing exactly `/lists/bookmarks` and `/lists/history`. These two routes belong to the `list-collections` capability (they are the bookmark and visit-history peer collections) and have their own page-level sub-nav as the canonical "where am I?" signal — activating the Lists pill on those routes would falsely suggest the viewer is in their owned-lists view. When `pathname` matches one of the two exact strings in the exclusion set, the Lists pill SHALL render in the inactive state, and no other pill in the four primary destinations SHALL render active. New peer routes added under `/lists/` SHALL be added to the exclusion set by the same edit that adds the route, unless the new route's page intent is to behave AS a list-detail view.

#### Scenario: Bookmarks route does not activate Lists pill

- **WHEN** the viewer is on `/lists/bookmarks`
- **THEN** the Lists pill renders inactive (no `app-nav-item--active` class, no `aria-current="page"`)
- **AND** no other primary nav pill renders active (Home, Items, Purchased all inactive)

#### Scenario: History route does not activate Lists pill

- **WHEN** the viewer is on `/lists/history`
- **THEN** the Lists pill renders inactive
- **AND** no other primary nav pill renders active

#### Scenario: List detail route still activates Lists pill

- **WHEN** the viewer is on `/lists/abc123` (a list detail page, NOT in the peer-exclusion set)
- **THEN** the Lists pill renders active
- **AND** the prefix rule applies normally — the exclusion set does not affect non-listed paths

### Requirement: useKeyboardOffset SHALL surface the soft-keyboard inset as `--keyboard-offset` on `:root`

The `useKeyboardOffset(enabled)` hook at `app/ui/hooks/useKeyboardOffset.ts` SHALL set the CSS custom property `--keyboard-offset` on `document.documentElement` (NOT on `document.body`, NOT on any consumer-passed element) while the hook is enabled and `window.visualViewport` is available. The value SHALL be a `px`-suffixed string computed as `${Math.max(0, window.innerHeight - vv.height - vv.offsetTop)}px` (the `Math.max(0, ...)` clamp prevents a negative offset when `vv.offsetTop` exceeds the difference, e.g. when the page scrolls and the browser address bar collapses). The hook SHALL register `'resize'` and `'scroll'` listeners on `window.visualViewport` to recompute on viewport changes. Multiple rapid viewport events SHALL be coalesced through `requestAnimationFrame` so the property updates at most once per animation frame — when a viewport event fires while a RAF is already pending (`rafId !== null`), no additional RAF SHALL be scheduled. On disable (`enabled` transitions to `false`) and on unmount, the hook SHALL (a) cancel any pending RAF via `cancelAnimationFrame`, (b) remove the `'resize'` and `'scroll'` listeners from `visualViewport`, and (c) remove the `--keyboard-offset` property from `document.documentElement` so consumers see the fallback value from `var(--keyboard-offset, 0px)` in CSS. When `enabled === false`, when `typeof window === 'undefined'` (SSR), or when `window.visualViewport === undefined`, the hook SHALL NOT install any listener and SHALL NOT set the CSS property.

#### Scenario: Enabled with viewport sets the property on :root

- **WHEN** `useKeyboardOffset(true)` is called and `window.visualViewport` is available
- **THEN** after the scheduled `requestAnimationFrame` tick, `document.documentElement.style.getPropertyValue('--keyboard-offset')` returns a `px`-suffixed string equal to `${Math.max(0, window.innerHeight - vv.height - vv.offsetTop)}px`
- **AND** `document.body.style.getPropertyValue('--keyboard-offset')` returns `''` (the property is NOT set on body)

#### Scenario: Viewport event triggers RAF-coalesced update

- **WHEN** the hook is enabled and a viewport `'resize'` event fires
- **THEN** exactly one `requestAnimationFrame` is scheduled
- **AND WHEN** a second `'resize'` event fires BEFORE the RAF tick completes
- **THEN** no second `requestAnimationFrame` is scheduled (the `rafId !== null` guard short-circuits)
- **AND** on the next RAF tick, `--keyboard-offset` updates to the recomputed value exactly once

#### Scenario: Disable cancels pending RAF and removes the property

- **WHEN** the hook is enabled with a RAF in flight, then `enabled` transitions to `false` (parent rerender)
- **THEN** `cancelAnimationFrame` is called with the captured RAF id
- **AND** both viewport listeners (`'resize'` and `'scroll'`) are removed
- **AND** `document.documentElement.style.getPropertyValue('--keyboard-offset')` returns `''`

#### Scenario: Unmount cleans up

- **WHEN** the consumer component unmounts while the hook is enabled
- **THEN** any pending RAF is cancelled
- **AND** both viewport listeners are removed
- **AND** the `--keyboard-offset` property is removed from `document.documentElement`

#### Scenario: Missing-viewport short-circuit

- **WHEN** `useKeyboardOffset(true)` is called in an environment where `window.visualViewport === undefined`
- **THEN** no listener is registered on `window.visualViewport`
- **AND** no `requestAnimationFrame` is scheduled
- **AND** `--keyboard-offset` is not set on `document.documentElement`

#### Scenario: Disabled short-circuit

- **WHEN** `useKeyboardOffset(false)` is called
- **THEN** no listener is registered
- **AND** no `requestAnimationFrame` is scheduled
- **AND** `--keyboard-offset` is not set on `document.documentElement`
