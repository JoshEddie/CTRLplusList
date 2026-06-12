# segmented-control-system Specification

## Purpose

TBD - created by archiving change standardize-menus-and-controls. Update Purpose after archive.

## Requirements

### Requirement: SegmentedControl primitive provides a controlled radiogroup

The system SHALL provide a `<SegmentedControl>` component at `app/ui/components/segmented-control/SegmentedControl.tsx` that renders a container with `role="radiogroup"`. `<SegmentedControl>` MUST be controlled via `value` and `onChange(value)` props, and MUST accept a `tone: 'light' | 'on-dark'` prop selecting the surface context.

#### Scenario: SegmentedControl renders a radiogroup

- **WHEN** `<SegmentedControl value="grid" onChange={fn} aria-label="View toggle" tone="light">` is rendered with `<SegmentedOption>` children
- **THEN** the container element has `role="radiogroup"` and the provided `aria-label`

#### Scenario: SegmentedControl supports the two surface tones

- **WHEN** `<SegmentedControl tone="light">` is rendered on a light surface vs. `<SegmentedControl tone="on-dark">` on a saturated dark surface (purple hero)
- **THEN** the active-option fill and inactive-option text colors adapt to the surface so the active option has visible contrast in both contexts

### Requirement: SegmentedOption renders a radio option with aria-checked

The system SHALL provide a `<SegmentedOption>` component that renders a native `<button role="radio">` element. Each option MUST have `aria-checked` reflecting whether `value === options.value`, and the active option MUST be visually distinct.

#### Scenario: Active option is announced as checked

- **WHEN** `<SegmentedControl value="grid">` contains `<SegmentedOption value="grid">` and `<SegmentedOption value="list">`
- **THEN** the "grid" option has `aria-checked="true"` and the "list" option has `aria-checked="false"`

#### Scenario: Activating an inactive option fires onChange

- **WHEN** the user clicks (or activates via keyboard) an inactive option
- **THEN** `onChange` is called with that option's `value`

### Requirement: SegmentedControl uses roving tabindex per the radiogroup pattern

The system SHALL implement the WAI-ARIA radiogroup keyboard pattern: only the active option has `tabIndex={0}`; inactive options have `tabIndex={-1}`. Tab moves focus into the group (to the active option) and out of it (to the next focusable element), NOT between options.

#### Scenario: Tab enters and exits the group, not between options

- **WHEN** the user tabs into a segmented control with two options
- **THEN** focus lands on the active option (the one with `aria-checked="true"`); pressing Tab again moves focus to the next focusable element outside the group

### Requirement: Arrow keys both move focus and change selection

The system SHALL handle Arrow Left / Arrow Right (and Arrow Up / Arrow Down for vertical layouts, but the current callers are horizontal) by moving focus AND firing `onChange` to the new option's value. This matches the radiogroup convention where arrow keys are the selection mechanism, not just navigation.

#### Scenario: Arrow key changes the selection

- **WHEN** focus is on the active option and the user presses Arrow Right
- **THEN** focus moves to the next option AND `onChange` is called with that option's value (the previously-active option's `aria-checked` becomes `false`, the new option's becomes `true`)

#### Scenario: Arrow key wraps at the end

- **WHEN** focus is on the last option and the user presses Arrow Right
- **THEN** focus and selection move to the first option

### Requirement: SegmentedControl options consume the button system's focus and hover contract

The system SHALL ensure `<SegmentedOption>` uses the same `--btn-focus-ring-color` token and `:focus-visible` model as `<Button>`, and guards `:hover` with `@media (hover: hover)` to prevent sticky hover on touch devices.

#### Scenario: Keyboard user focuses an option

- **WHEN** the user reaches a segmented option via keyboard
- **THEN** a `:focus-visible` indicator appears that meets the same contrast contract as `<Button>` focus indicators, with the ring color adapting to `tone`

#### Scenario: Touch user taps an option

- **WHEN** the user taps an option on a touch-only device
- **THEN** no sticky hover state remains after the tap

### Requirement: VisibilityPicker and ItemsToolbar view-toggle migrate to the SegmentedControl primitive

The system SHALL migrate the Private/Shared toggle in `VisibilityPicker.tsx` to `<SegmentedControl tone="on-dark">`, and the grid/list view-toggle in `ItemsToolbar.tsx` to `<SegmentedControl tone="light">`. Both wrappers retain ownership of their state, server-action coordination (`VisibilityPicker`'s optimistic update + `setListVisibility`), and URL parameter sync (`ItemsToolbar`'s `updateParams`). The page-scoped CSS classes `.visibility-toggle`, `.visibility-option`, `.visibility-option-label`, `.view-toggle`, `.view-toggle-btn` MUST be deleted after migration.

#### Scenario: VisibilityPicker uses on-dark SegmentedControl

- **WHEN** `VisibilityPicker.tsx` is rendered after migration on the list hero
- **THEN** the Private/Shared toggle is a `<SegmentedControl tone="on-dark" value={isShared ? 'shared' : 'private'} onChange={...}>` containing two `<SegmentedOption>` elements (Private + lock icon, Shared + share icon)

#### Scenario: ItemsToolbar view-toggle uses light SegmentedControl

- **WHEN** `ItemsToolbar.tsx` is rendered after migration
- **THEN** the grid/list toggle is a `<SegmentedControl tone="light" value={view} onChange={...}>` containing two `<SegmentedOption>` elements (Grid view, List view). The previous `aria-pressed` model is replaced by `aria-checked` via the new primitive

#### Scenario: Legacy segmented-control CSS classes are removed

- **WHEN** the codebase is grepped for `.visibility-option`, `.view-toggle-btn`, or related classes after migration
- **THEN** no definitions remain

### Requirement: segmentedGroupClasses SHALL emit a tone class for every tone in fixed token order

The `segmentedGroupClasses` helper at `app/ui/components/segmented-control/segmentedClasses.ts` SHALL compose its returned string as `['segmented', `tone-${tone}`, extra].filter(Boolean).join(' ')`. The `tone-<value>` class SHALL ALWAYS be emitted — both `tone: 'light'` and `tone: 'on-dark'` SHALL produce a tone token (so `segmentedGroupClasses({ tone: 'light' })` returns `'segmented tone-light'`, NOT `'segmented'`). This distinguishes the segmented-control composer from `triggerClasses` (which only emits a tone class for the non-default `on-dark`), and the always-emit-tone behavior is load-bearing for the light-tone CSS selectors in `segmented-control.css`. The token order SHALL be fixed: (1) `'segmented'` always first; (2) `'tone-<value>'` second; (3) `extra` third IFF `extra` is truthy (empty-string and `undefined` `extra` values are filtered out by `.filter(Boolean)`).

#### Scenario: Light tone emits the tone-light class

- **WHEN** `segmentedGroupClasses({ tone: 'light' })` is called
- **THEN** the return value is the string `'segmented tone-light'` (exactly one space, in order)
- **AND** the return value is NOT `'segmented'` (the tone class is emitted even for the default-like `'light'` value)

#### Scenario: On-dark tone emits the tone-on-dark class

- **WHEN** `segmentedGroupClasses({ tone: 'on-dark' })` is called
- **THEN** the return value is the string `'segmented tone-on-dark'` (exactly one space, in order)

#### Scenario: Extra is appended last

- **WHEN** `segmentedGroupClasses({ tone: 'light', extra: 'foo' })` is called
- **THEN** the return value is the string `'segmented tone-light foo'` (order: base, tone, extra)
- **AND** `segmentedGroupClasses({ tone: 'on-dark', extra: 'bar' })` returns `'segmented tone-on-dark bar'`

#### Scenario: Falsy extra values are filtered

- **WHEN** `segmentedGroupClasses({ tone: 'light', extra: '' })` or `segmentedGroupClasses({ tone: 'on-dark', extra: undefined })` is called
- **THEN** the returned string contains no trailing empty-string segment (the falsy `extra` is removed by `.filter(Boolean)`)
- **AND** the return value is `'segmented tone-light'` or `'segmented tone-on-dark'` respectively (no trailing whitespace)

### Requirement: segmentedOptionClasses SHALL compose the option class string in fixed token order

The `segmentedOptionClasses` helper at `app/ui/components/segmented-control/segmentedClasses.ts` SHALL compose its returned string as `['segmented-option', active && 'active', extra].filter(Boolean).join(' ')`. The token order SHALL be: (1) `'segmented-option'` always first; (2) `'active'` second IFF the `active` argument is truthy; (3) `extra` third IFF `extra` is truthy (empty-string and `undefined` `extra` values are filtered out). The composition SHALL be the single source of class strings for `<SegmentedOption>`, and CSS selectors that combine these classes (e.g. `.segmented-option.active`) depend on the fixed order remaining stable across changes.

#### Scenario: Inactive option returns the base token

- **WHEN** `segmentedOptionClasses({ active: false })` is called
- **THEN** the return value is the string `'segmented-option'` (no leading or trailing whitespace, no `active` token, no extra token)

#### Scenario: Active option appends the active token

- **WHEN** `segmentedOptionClasses({ active: true })` is called
- **THEN** the return value is the string `'segmented-option active'` (exactly one space, in order)

#### Scenario: Extra is appended after active

- **WHEN** `segmentedOptionClasses({ active: true, extra: 'foo' })` is called
- **THEN** the return value is the string `'segmented-option active foo'` (order: base, active, extra)
- **AND** `segmentedOptionClasses({ active: false, extra: 'foo' })` returns `'segmented-option foo'`

#### Scenario: Falsy values are filtered

- **WHEN** `segmentedOptionClasses({ active: false, extra: '' })` or `segmentedOptionClasses({ active: false, extra: undefined })` is called
- **THEN** the returned string contains no `'active'` token and no empty-string segment (the falsy values are removed by `.filter(Boolean)`)
- **AND** the return value is `'segmented-option'` (no trailing whitespace)

### Requirement: useSegmentedContext SHALL throw a descriptive Error when used outside a SegmentedControl

The `useSegmentedContext()` hook exported from `app/ui/components/segmented-control/SegmentedControl.tsx` SHALL throw an Error with the exact message `'<SegmentedOption> must be rendered inside a <SegmentedControl>'` when invoked outside a `<SegmentedControl>` ancestor (i.e. when `useContext(SegmentedContext)` resolves to `null`). This is the developer-error safety net: a `<SegmentedOption>` rendered orphan would otherwise read `value: undefined` from a null context and silently no-op on click, hiding a real composition bug from end users. The descriptive error converts the silent runtime bug into a loud developer error at the first render attempt and SHALL surface the exact remediation ("render inside a <SegmentedControl>") in the message body.

#### Scenario: Orphan SegmentedOption throws on render

- **WHEN** `<SegmentedOption value="x">label</SegmentedOption>` is rendered without a `<SegmentedControl>` ancestor
- **THEN** an Error is thrown during render with the exact message `'<SegmentedOption> must be rendered inside a <SegmentedControl>'`

#### Scenario: SegmentedOption inside SegmentedControl does NOT throw

- **WHEN** `<SegmentedOption value="x">label</SegmentedOption>` is rendered as a child of `<SegmentedControl value="x" onChange={fn} tone="light" aria-label="g">`
- **THEN** rendering completes without error
- **AND** the option is rendered with `aria-checked="true"` (the context value is read successfully)

### Requirement: SegmentedControl keydown listener SHALL be scoped to the container element with [onChange] deps

The `<SegmentedControl>` component at `app/ui/components/segmented-control/SegmentedControl.tsx` SHALL attach its `keydown` event listener to the container `radiogroup` element (the rendered `<div role="radiogroup">`), NOT to `document` and NOT to `window`. The listener SHALL be registered in a `useEffect` whose deps array is `[onChange]` only — NOT `[]` (which would freeze the `onChange` closure and call a stale callback when the parent recreates the function) and NOT `[onChange, value]` (which would re-attach the listener on every selection, doubling event traffic when the parent re-renders frequently). The effect's cleanup function SHALL remove the same listener on unmount and on `onChange` identity change, preventing listener accumulation. Container scoping is the multi-control contract: multiple segmented controls coexisting on the same page (e.g. `VisibilityPicker` and `ItemsToolbar` view-toggle rendered concurrently) SHALL navigate independently, and arrow keys pressed when focus is anywhere else on the page (text input, scrollable region, other widget) SHALL NOT be intercepted by any segmented control's listener.

#### Scenario: Listener is attached to the container, not to document

- **WHEN** `<SegmentedControl value="a" onChange={fn} tone="light" aria-label="g">` is rendered with `<SegmentedOption>` children, and `Element.prototype.addEventListener` is spied
- **THEN** the spy is called with `'keydown'` against the rendered `<div role="radiogroup">` element (the container)
- **AND** `document.addEventListener` is NOT called with `'keydown'` for this component

#### Scenario: Keydown outside the container does NOT fire onChange

- **WHEN** `<SegmentedControl value="a" onChange={spy} tone="light" aria-label="g">` is rendered alongside a sibling `<button>` element, and an ArrowRight `keydown` is dispatched on the sibling (outside the radiogroup container)
- **THEN** `spy` is NOT invoked

#### Scenario: onChange identity change re-attaches the listener with the new callback

- **WHEN** `<SegmentedControl value="a" onChange={spyA} tone="light" aria-label="g">` is rendered, then rerendered with `onChange={spyB}` (a different function reference) while `value` is unchanged, and an ArrowRight `keydown` is then dispatched on the container
- **THEN** `spyB` is invoked exactly once with the next option's value
- **AND** `spyA` is NOT invoked after the rerender

#### Scenario: value change does NOT re-attach the listener

- **WHEN** `<SegmentedControl value="a" onChange={fn} tone="light" aria-label="g">` is rendered with a stable `onChange` reference, then rerendered with `value="b"` (and the same `onChange`), and `Element.prototype.addEventListener` is spied across both renders
- **THEN** the spy is called exactly once with `'keydown'` against the container element across the full lifecycle (the listener was attached at mount and NOT re-attached on the value change)
