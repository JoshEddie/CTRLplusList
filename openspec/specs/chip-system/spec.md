# chip-system Specification

## Purpose
TBD - created by archiving change test-chip-system. Update Purpose after archive.
## Requirements
### Requirement: Removable chips share the button focus/touch contract via `<Chip>` primitive

The system SHALL provide a `<Chip>` primitive at `app/ui/components/chip/Chip.tsx` for label + remove-× affordances (selected-item chips, active-filter chips). `<Chip>` is a separate component, not a `<Button>` variant — its rendered DOM contains two interactive concerns (a label container and a remove-button child), and conflating those with a single-button styling primitive would violate the orthogonality of variant-as-visual in `button-system`. `<Chip>` MUST consume the same `--btn-*` token surface used by the button system so its focus indicator, hover-on-touch guard, and minimum touch target contract match the rest of the design system.

#### Scenario: Active-filter chip renders in the items toolbar

- **WHEN** the items toolbar has active filters and renders chips for them
- **THEN** each chip is rendered as `<Chip onRemove={c.onClear}>{c.label}</Chip>`; clicking the × removes the filter; the remove-button has `aria-label="Remove {label}"`

#### Scenario: Selected-list chip renders in the item-form list picker

- **WHEN** the item form's list picker has selected lists
- **THEN** each selected list is rendered as a `<Chip onRemove={() => remove(s.value)}>{s.label}</Chip>`; the page-scoped `.if-lp-chip` class is no longer referenced

#### Scenario: Chip's focus and touch contract matches buttons

- **WHEN** a keyboard user tabs to the × of any chip
- **THEN** a focus indicator appears that meets the same WCAG 1.4.11 contrast contract as `<Button>` focus indicators, sized via the same `--btn-xs-*` token surface

#### Scenario: Legacy chip class definitions are removed

- **WHEN** the codebase is grepped for `.items-toolbar-chip` or `.if-lp-chip` in CSS files after migration
- **THEN** no definitions remain; the `<Chip>` primitive owns the chip visual surface

### Requirement: Chip DOM SHALL be a non-interactive wrapper with a `<button>` child for removal

The `<Chip>` primitive SHALL render its outer element as a non-interactive `<span class="chip ...">`, with the wrapper containing exactly two semantic parts in order: (1) the chip body content (the `children` prop, rendered as the wrapper's leading content), and (2) a single interactive `<button class="chip-remove">` child carrying the remove action. The wrapper SHALL NOT be a `<button>`, an `<a>`, or any other interactive element. Two interactive concerns inside one chip MUST resolve to two distinct elements: the non-interactive label container and the interactive remove-button child.

#### Scenario: Chip renders a span wrapping a button

- **WHEN** `<Chip onRemove={fn}>Foo</Chip>` is rendered
- **THEN** the outer element is a `<span>` with the `chip` class
- **AND** its last child is a `<button>` with the `chip-remove` class and `type="button"`
- **AND** no other interactive element exists in the chip's subtree

#### Scenario: Chip is not itself interactive

- **WHEN** a screen reader navigates over a chip
- **THEN** the chip wrapper is not announced as a button, link, or other interactive control
- **AND** only the remove-× is reachable as an interactive element

### Requirement: Chip wrapper class composition flows through `chipClasses({ extra })`

The `<Chip>` primitive SHALL delegate its wrapper-class composition to a shared `chipClasses` function exported from `app/ui/components/chip/chipClasses.ts`. The function SHALL accept an optional `{ extra?: string }` argument and SHALL return a space-joined class string with `'chip'` as the first token and `extra` (when truthy) appended. Empty-string or `undefined` `extra` values SHALL be filtered out — the wrapper SHALL NOT carry a trailing space, `undefined` token, or empty-string token. Call sites that need additional wrapper classes SHALL pass `className` to `<Chip>`, which `<Chip>` forwards to `chipClasses` as `extra`.

#### Scenario: chipClasses with no arguments

- **WHEN** `chipClasses()` is called
- **THEN** it returns the string `'chip'` (no leading or trailing whitespace, no tokens added)

#### Scenario: chipClasses with an extra token

- **WHEN** `chipClasses({ extra: 'foo' })` is called
- **THEN** it returns the string `'chip foo'` (exactly one space, in order)

#### Scenario: chipClasses with a falsy extra

- **WHEN** `chipClasses({ extra: '' })` or `chipClasses({ extra: undefined })` is called
- **THEN** it returns the string `'chip'` (the falsy `extra` is filtered before join)

#### Scenario: className prop propagates to wrapper

- **WHEN** `<Chip className="custom-token" onRemove={fn}>Foo</Chip>` is rendered
- **THEN** the rendered `<span>` carries the class string `'chip custom-token'`

### Requirement: Remove button derives an accessible name from `removeLabel` or children

The `<Chip>` primitive SHALL set the remove `<button>`'s `aria-label` according to the rule `removeLabel ?? (typeof children === 'string' ? \`Remove ${children}\` : 'Remove')`. The three derivation paths SHALL behave as follows: (1) when `removeLabel` is provided, the remove button's `aria-label` equals `removeLabel` and overrides the children-based default; (2) when `removeLabel` is omitted AND `children` is a string, the `aria-label` is the literal string `Remove ${children}` (with a single space and the children value verbatim); (3) when `removeLabel` is omitted AND `children` is NOT a string (e.g. a React element), the `aria-label` is the literal string `'Remove'`. The fallback string `'Remove'` ensures the remove button always carries an accessible name even when the chip's visible content cannot be safely stringified.

#### Scenario: Chip with string children and no removeLabel

- **WHEN** `<Chip onRemove={fn}>Tag A</Chip>` is rendered
- **THEN** the remove `<button>` has `aria-label="Remove Tag A"`

#### Scenario: Chip with element children and no removeLabel

- **WHEN** `<Chip onRemove={fn}><span>Tag A</span></Chip>` is rendered
- **THEN** the remove `<button>` has `aria-label="Remove"` (the fallback; element children are not stringified into the label)

#### Scenario: Chip with removeLabel override

- **WHEN** `<Chip onRemove={fn} removeLabel="Clear filter">Tag A</Chip>` is rendered
- **THEN** the remove `<button>` has `aria-label="Clear filter"` (the override wins over the default)

#### Scenario: Chip with removeLabel override and element children

- **WHEN** `<Chip onRemove={fn} removeLabel="Clear"><Icon /></Chip>` is rendered
- **THEN** the remove `<button>` has `aria-label="Clear"` (the override wins over the element-children fallback too)

### Requirement: Remove button type is `"button"` and click stops propagation before invoking `onRemove`

The remove `<button>` inside `<Chip>` SHALL carry an explicit `type="button"` attribute so that a `<Chip>` rendered inside a `<form>` SHALL NOT submit the form when the × is clicked. The click handler SHALL call `e.stopPropagation()` before invoking the consumer's `onRemove` callback so that the chip's × click does NOT bubble to a parent click handler — this enables chips to live inside clickable container regions (e.g., chip rows where the row itself is also a click target) without the × inadvertently triggering the row.

#### Scenario: Chip in a form does not submit on remove

- **WHEN** `<Chip onRemove={fn}>Foo</Chip>` is rendered inside a `<form onSubmit={submitSpy}>` and its × is clicked
- **THEN** `fn` is invoked exactly once
- **AND** `submitSpy` is NOT invoked

#### Scenario: Chip × click does not bubble to parent

- **WHEN** `<Chip onRemove={fn}>Foo</Chip>` is rendered inside a `<div onClick={parentSpy}>` and its × is clicked
- **THEN** `fn` is invoked exactly once
- **AND** `parentSpy` is NOT invoked

### Requirement: `disabled` prop disables the remove button via native HTML

The `<Chip>` primitive SHALL forward its `disabled` prop directly to the remove `<button>`'s `disabled` attribute. When `disabled={true}`, the rendered `<button>` SHALL be in the HTML disabled state and SHALL NOT dispatch click events — the consumer's `onRemove` callback SHALL NOT be invoked when a disabled chip's × is clicked. When `disabled={false}` or `disabled` is omitted, the rendered `<button>` SHALL NOT be disabled.

#### Scenario: Disabled chip × click does not invoke onRemove

- **WHEN** `<Chip disabled onRemove={fn}>Foo</Chip>` is rendered and its × is clicked
- **THEN** the rendered `<button>` carries the `disabled` attribute
- **AND** `fn` is NOT invoked (HTML native click-suppression on disabled buttons)
- **AND** the remove button's `aria-label` is unchanged from the non-disabled case

#### Scenario: Non-disabled chip × click invokes onRemove

- **WHEN** `<Chip onRemove={fn}>Foo</Chip>` (no `disabled`) is rendered and its × is clicked
- **THEN** the rendered `<button>` does NOT carry the `disabled` attribute
- **AND** `fn` is invoked exactly once

