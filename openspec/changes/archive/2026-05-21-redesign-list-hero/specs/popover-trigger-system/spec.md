## MODIFIED Requirements

### Requirement: PopoverTrigger has no variant prop

The system SHALL NOT expose a `variant` prop on `<PopoverTrigger>`. Visual variants (primary/secondary/ghost-style families) are an explicit non-feature — the trigger has exactly one *control treatment*: bordered rectangle, optional left icon, label, optional right-side count badge, chevron indicator.

The system MAY expose a `tone` prop on `<PopoverTrigger>` for **surface adaptation** — the same dimension `<SegmentedControl tone="...">` already covers. `tone` SHALL be limited to `'light' | 'on-dark'`, default `'light'`. `tone` SHALL change only surface colors (background fill, border, text, focus-ring) — NOT geometry, padding, border-radius, chevron treatment, or the count-badge color contract. The `active` boolean continues to be the only modal styling change layered on top of `tone`.

#### Scenario: A developer attempts to pass a variant prop

- **WHEN** code references `<PopoverTrigger variant="primary" ...>`
- **THEN** the TypeScript type check fails (no `variant` prop in the type signature)

#### Scenario: tone="on-dark" renders translucent-white-on-dark treatment

- **WHEN** `<PopoverTrigger tone="on-dark" label="Shared · in feed" ...>` is rendered on a saturated dark surface
- **THEN** the rendered button has a translucent-white background, a light border, and light label/chevron colors — consistent with the visual language of `<Button variant="on-dark">` and `<SegmentedControl tone="on-dark">`

#### Scenario: tone="light" is the default and matches existing behavior

- **WHEN** `<PopoverTrigger label="Stores" ...>` is rendered without a `tone` prop
- **THEN** the rendered button has the existing form-input-shaped light-surface treatment, unchanged from the prior spec

#### Scenario: tone does not change geometry

- **WHEN** the same `<PopoverTrigger>` is rendered with `tone="light"` and then with `tone="on-dark"`
- **THEN** the rendered `min-height`, `padding`, `border-radius`, chevron position/size, and count-badge geometry are identical across both renders; only surface colors differ

## ADDED Requirements

### Requirement: List-detail hero status pill consumes PopoverTrigger tone="on-dark"

The system SHALL render the list-detail hero's visibility-summary status pill as a `<PopoverTrigger tone="on-dark" />`. The trigger SHALL include an icon slot occupied by a state-encoding glyph whose identity changes with the current visibility (`<FaLock />` for `'private'`, `<FaShareAlt />` for `'unlisted'`, `<FaUsers />` for `'public'`), a label derived from the current visibility, and a chevron indicating popover affordance.

#### Scenario: Status pill renders with state-encoded icon, label, and chevron

- **WHEN** the list hero status pill is rendered for a list with `visibility = 'public'`
- **THEN** the rendered element is a `<PopoverTrigger tone="on-dark">` containing (in order): a users/audience icon in the icon slot, the label text "Shared · in feed", and the chevron
