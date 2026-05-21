## ADDED Requirements

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
