# store-filter Specification

## Purpose

The `store-filter` capability SHALL govern the behavior of the store filter popover in the items toolbar — specifically how the trigger reflects the selected-store count and toggles the panel, how the search field narrows the rendered store options, how the empty state appears, how each option checkbox reflects and toggles its store's selection, how the Clear/Done footer behaves, and how the panel dismisses. It SHALL apply wherever `StoreFilterPopover` mounts (today: inside `ItemsToolbar` on every page that renders `ItemsBrowser`).

This capability SHALL NOT govern: the layout of the items toolbar row (owned by `items-browser-chrome`), the trigger button surface (owned by `popover-trigger-system`), the search input / `CheckboxField` chrome (owned by `form-field-system`), the `Button` primitive used in the footer (owned by `button-system`), or the translation of `onToggle`/`onClear` calls into the `store` URL search param (owned by `items-browser-chrome`). A behavior listed in those primitive/sibling capabilities remains binding under their spec; this capability composes them.

## Requirements

### Requirement: Store filter trigger reflects the selected-store count and toggles the panel

The `StoreFilterPopover` SHALL render its trigger through the `PopoverTrigger` primitive with `label="Stores"` and `aria-haspopup="dialog"`. The trigger SHALL be marked `active` and SHALL display a `count` badge equal to `selectedStores.length` when one or more stores are selected, and SHALL display no badge and SHALL NOT be `active` when none are selected. Clicking the trigger SHALL toggle the panel between open and closed, and `aria-expanded` SHALL reflect that open state.

The visual surface, sizing, icon-rendering, and badge styling of the trigger are owned by `popover-trigger-system`; this requirement governs only the values `StoreFilterPopover` passes into it and the open/close toggle behavior.

#### Scenario: No stores selected — no badge, not active

- **WHEN** `StoreFilterPopover` renders with `selectedStores` empty
- **THEN** the trigger shows no count badge and is not in the `active` state

#### Scenario: Selected stores drive the count badge

- **WHEN** `StoreFilterPopover` renders with `selectedStores` of length 2
- **THEN** the trigger shows a count badge of `2` and is in the `active` state

#### Scenario: Clicking the trigger toggles the panel

- **WHEN** the user clicks the trigger while the panel is closed
- **THEN** the panel opens (a `role="dialog"` element labeled "Filter by store" is rendered) and `aria-expanded` becomes `true`
- **AND WHEN** the user clicks the trigger again
- **THEN** the panel closes and `aria-expanded` becomes `false`

### Requirement: The search field narrows the rendered store options case-insensitively

While the panel is open, typing into the search field SHALL narrow the rendered option list to the `storeOptions` whose name contains the query as a case-insensitive substring. The query SHALL be trimmed of leading and trailing whitespace before matching; an empty or whitespace-only query SHALL render all `storeOptions`. Narrowing SHALL affect only which options are rendered — it SHALL NOT alter `selectedStores` or call `onToggle`/`onClear`.

The search input's chrome and clear-affordance are owned by `form-field-system`; this requirement governs only how its value filters the option list.

#### Scenario: Empty query renders all options

- **WHEN** the panel is open and the search field is empty
- **THEN** every name in `storeOptions` is rendered as a checkbox option

#### Scenario: Query narrows options case-insensitively by substring

- **WHEN** `storeOptions` is `["Amazon", "Target", "Etsy"]` and the user types `"a"`
- **THEN** only `"Amazon"` and `"Target"` are rendered (case-insensitive substring match), and `"Etsy"` is not

#### Scenario: Whitespace-only query is treated as empty

- **WHEN** the user types only spaces into the search field
- **THEN** every name in `storeOptions` is rendered (the query is trimmed to empty)

### Requirement: An empty filtered result shows the empty state

When the search query narrows the option list to zero matches, the panel SHALL render the empty-state message `"No matching stores"` in place of options. The empty state SHALL appear only when the filtered list is empty; it SHALL NOT appear when at least one option matches, and it SHALL NOT appear merely because `selectedStores` is empty.

#### Scenario: No matches shows the empty state

- **WHEN** `storeOptions` is `["Amazon", "Target"]` and the user types `"zzz"`
- **THEN** the message "No matching stores" is rendered and no checkbox options are rendered

#### Scenario: A match suppresses the empty state

- **WHEN** the filtered list contains at least one option
- **THEN** the "No matching stores" message is not rendered

### Requirement: Each option checkbox reflects and toggles its store's selection

Each rendered option SHALL be a `CheckboxField` whose `label` is the store name and whose checked state SHALL be `true` exactly when that name is in `selectedStores`. Toggling an option's checkbox SHALL call `onToggle(name)` with that store's name. `StoreFilterPopover` SHALL NOT itself add or remove the name from `selectedStores` — it delegates the selection mutation to the parent via `onToggle`, and re-renders from the updated `selectedStores` prop.

The checkbox chrome is owned by `form-field-system`; the translation of `onToggle` calls into the `store` URL search param is owned by `items-browser-chrome`. This requirement governs only the checked-state mapping and the `onToggle` call.

#### Scenario: Checked state mirrors membership in selectedStores

- **WHEN** `storeOptions` is `["Amazon", "Target"]` and `selectedStores` is `["Amazon"]`
- **THEN** the "Amazon" checkbox is checked and the "Target" checkbox is unchecked

#### Scenario: Toggling an option calls onToggle with its name

- **WHEN** the user toggles the "Target" checkbox
- **THEN** `onToggle` is called once with `"Target"`
- **AND** `StoreFilterPopover` does not mutate `selectedStores` directly

### Requirement: The footer Clear button is gated on selection and Done only closes

The panel footer SHALL render a Clear button and a Done button. The Clear button SHALL be `disabled` when `selectedStores` is empty and enabled otherwise; clicking it while enabled SHALL call `onClear` and SHALL NOT close the panel. The Done button SHALL close the panel and SHALL NOT call `onClear` or `onToggle` (it does not mutate the selection). Both buttons are rendered through the `Button` primitive; this requirement governs only their enable-gating and click semantics.

#### Scenario: Clear is disabled when nothing is selected

- **WHEN** the panel is open and `selectedStores` is empty
- **THEN** the Clear button is `disabled`

#### Scenario: Clear calls onClear when stores are selected

- **WHEN** the panel is open, `selectedStores` is non-empty, and the user clicks Clear
- **THEN** `onClear` is called once and the panel remains open

#### Scenario: Done closes the panel without mutating selection

- **WHEN** the panel is open and the user clicks Done
- **THEN** the panel closes and neither `onClear` nor `onToggle` is called

### Requirement: The panel dismisses on outside click and Escape

While the panel is open, `StoreFilterPopover` SHALL close it on an outside click (a pointer interaction outside the popover root) and on the Escape key, via `usePopoverDismiss`. The dismiss listeners SHALL be active only while the panel is open. The dismiss mechanism itself is owned by `popover-trigger-system` (which governs `usePopoverDismiss`); this requirement governs only that `StoreFilterPopover` wires it to close the panel.

#### Scenario: Outside click closes an open panel

- **WHEN** the panel is open and the user clicks outside the popover root
- **THEN** the panel closes

#### Scenario: Escape closes an open panel

- **WHEN** the panel is open and the user presses Escape
- **THEN** the panel closes
