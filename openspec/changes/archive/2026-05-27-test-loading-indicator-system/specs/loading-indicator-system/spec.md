## ADDED Requirements

### Requirement: LoadingIndicator SHALL compose its outer class as `loading-indicator loading-indicator--<size>` in fixed token order

The `<LoadingIndicator>` primitive at `app/ui/components/LoadingIndicator.tsx` SHALL render its outer `<div>` with a `className` containing exactly two tokens, in fixed order: (1) the base token `'loading-indicator'` first; (2) the variant token `'loading-indicator--<size>'` second, where `<size>` is the literal string value of the `size` prop (`'inline'`, `'rail'`, `'form'`, or `'page'`). The variant token SHALL use the double-hyphen BEM modifier convention (`loading-indicator--inline`), NOT a single-hyphen suffix (`loading-indicator-inline`). The primitive SHALL NOT accept or forward any `className` / `tone` / `extra` prop; no third token is permitted in the outer class string. This composition is load-bearing for `loading-indicator.css`: the base `.loading-indicator` selector applies the shared flex layout (`display: flex; align-items: center; justify-content: center; width: 100%`); the variant selectors `.loading-indicator--inline`, `.loading-indicator--rail`, `.loading-indicator--form`, `.loading-indicator--page` apply the per-variant `min-height`; and the compound selectors `.loading-indicator--<size> .loading-indicator__spinner` apply the per-variant spinner diameter. Dropping the base class, merging the tokens into a single hyphen-joined class, or reordering the tokens would silently break one or more of these CSS contracts.

#### Scenario: Inline size composes the inline variant class

- **WHEN** `<LoadingIndicator size="inline" />` is rendered
- **THEN** the outer `<div>`'s `className` is the exact string `'loading-indicator loading-indicator--inline'` (exactly one space between the two tokens, no leading or trailing whitespace, no third token)

#### Scenario: Rail size composes the rail variant class

- **WHEN** `<LoadingIndicator size="rail" />` is rendered
- **THEN** the outer `<div>`'s `className` is the exact string `'loading-indicator loading-indicator--rail'`

#### Scenario: Form size composes the form variant class

- **WHEN** `<LoadingIndicator size="form" />` is rendered
- **THEN** the outer `<div>`'s `className` is the exact string `'loading-indicator loading-indicator--form'`

#### Scenario: Page size composes the page variant class

- **WHEN** `<LoadingIndicator size="page" />` is rendered
- **THEN** the outer `<div>`'s `className` is the exact string `'loading-indicator loading-indicator--page'`

#### Scenario: No className prop is accepted

- **WHEN** the `LoadingIndicatorProps` type is inspected
- **THEN** it declares exactly one property: `size: 'inline' | 'rail' | 'form' | 'page'`
- **AND** no `className`, `tone`, `extra`, or other token-extending prop is declared
- **AND** the outer `<div>`'s rendered `className` never contains a third token regardless of how the component is invoked

### Requirement: LoadingIndicator SHALL render exactly two `<span>` children in fixed order with exact element types, classes, and label text

The `<LoadingIndicator>` primitive at `app/ui/components/LoadingIndicator.tsx` SHALL render an outer `<div>` element (tag name exactly `DIV`) containing exactly two child elements, both `<span>` (tag name exactly `SPAN`), in fixed order:

1. **First child — the spinner.** A self-closing `<span className="loading-indicator__spinner" aria-hidden="true" />` with no text content. The `className` SHALL be exactly `'loading-indicator__spinner'`. The `aria-hidden` attribute SHALL be the exact string value `"true"` (not the bare-attribute form, not `"false"`, not `""`). The spinner SHALL have no rendered text content.
2. **Second child — the visually-hidden label.** A `<span className="sr-only">Loading…</span>` with the exact text content `'Loading…'`. The `className` SHALL be exactly `'sr-only'`. The text content SHALL contain the U+2026 HORIZONTAL ELLIPSIS character (a single Unicode code point `…`), NOT three ASCII full-stop characters (`...`).

The element types and the child order are load-bearing: `loading-indicator.css` uses the descendant selector `.loading-indicator__spinner` on the spinner span; the screen-reader announcement on the parent `role="status"` region relies on the sr-only label being the only readable text inside the region; the child order matches the visual reading order in browsers that read DOM order rather than flex visual order.

#### Scenario: Outer element is a DIV containing exactly two child SPANs

- **WHEN** `<LoadingIndicator size="rail" />` is rendered
- **THEN** the outer element returned by `getByRole('status')` has `tagName === 'DIV'`
- **AND** it contains exactly two child elements
- **AND** both children have `tagName === 'SPAN'`

#### Scenario: First child is the spinner span with the correct class, aria-hidden, and no text

- **WHEN** `<LoadingIndicator size="rail" />` is rendered
- **THEN** the first child of the outer `<div>` has `className === 'loading-indicator__spinner'`
- **AND** its `getAttribute('aria-hidden')` returns exactly `'true'` (the string, not the bare-attribute form)
- **AND** its `textContent` is the empty string

#### Scenario: Second child is the sr-only label with the exact ellipsis-character text

- **WHEN** `<LoadingIndicator size="rail" />` is rendered
- **THEN** the second child of the outer `<div>` has `className === 'sr-only'`
- **AND** its `textContent` is the exact string `'Loading…'` (containing the U+2026 horizontal ellipsis character as a single code point, NOT three ASCII full-stop characters)
