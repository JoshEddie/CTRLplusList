## ADDED Requirements

### Requirement: Opening the popover moves keyboard focus into the Min input

When the `PriceFilterPopover` panel opens, the Min `PriceField` SHALL receive focus (it carries `autoFocus`); the Max input SHALL NOT be focused on open. This makes the panel immediately usable from the keyboard — a user who opens the popover can begin typing the lower bound without a manual tab or click. The trigger button surface and the dismiss behavior remain governed by `popover-trigger-system`; this requirement governs only which panel input is focused on open.

#### Scenario: Min input is focused when the panel opens

- **WHEN** the user opens the price filter popover
- **THEN** the rendered Min input is the active element (`document.activeElement`); the Max input is not focused

### Requirement: A bound that resolves to $0.00 is treated as an absent bound, not a zero filter

The `PriceFilterPopover` SHALL coalesce a Min or Max value that resolves to `$0.00` into an empty (absent) bound rather than committing `0` as a numeric bound. A value of zero in either field therefore behaves identically to clearing that field: the bound is omitted, no inverted-pair error is computed against it, and the committed `onApply` argument for that bound is the empty string. This prevents a meaningless `$0` lower bound (which would filter nothing useful) from being serialized to the URL, and keeps the empty-vs-zero ambiguity of the cents-as-integer `PriceField` (governed by `form-field-system`) from leaking into the filter contract.

#### Scenario: Entering a zero Min commits no lower bound

- **WHEN** the user enters a Max of `50` and a Min that resolves to `$0.00`, and the debounce timer fires
- **THEN** `onApply` is called with an empty Min and `max="50.00"`; no inverted-pair error is shown; the Min input renders empty rather than `0.00`

#### Scenario: A field reduced to zero clears that bound

- **WHEN** the Max input currently holds a non-zero value and the user edits it down so it resolves to `$0.00`
- **THEN** the Max bound becomes empty (the input renders empty); the next debounce fire commits only the remaining non-empty bound, with the Max argument empty
