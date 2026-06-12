## ADDED Requirements

### Requirement: TooltipWrapper SHALL render a tooltip-container div wrapping its children

The `<TooltipWrapper>` primitive at `app/ui/components/TooltipWrapper.tsx` SHALL render an outer `<div>` whose `className` is exactly the string `"tooltip-container"` when no `className` prop (or an empty/falsy `className`) is provided, OR exactly the string `"tooltip-container <className>"` (base token + single space + prop value) when a truthy `className` is provided. No trailing whitespace is emitted in either case. The children prop SHALL render as the first child of the wrapper, BEFORE the conditional tooltip span. The class string composition is exact-string-stable across the prop surface.

#### Scenario: No className renders wrapper with base class only

- **WHEN** `<TooltipWrapper>child</TooltipWrapper>` is rendered with no `className` prop
- **THEN** the outer div's `className` is exactly the string `"tooltip-container"` (no trailing whitespace)

#### Scenario: With className appended after a single space

- **WHEN** `<TooltipWrapper className="foo">child</TooltipWrapper>` is rendered
- **THEN** the outer div's `className` is exactly the string `"tooltip-container foo"`

#### Scenario: Empty-string className behaves like undefined

- **WHEN** `<TooltipWrapper className="">child</TooltipWrapper>` is rendered
- **THEN** the outer div's `className` is exactly the string `"tooltip-container"` (the falsy-guard collapses `''` to the no-prop case — no trailing space)

#### Scenario: Children render inside the wrapper

- **WHEN** `<TooltipWrapper><span data-testid="x">child</span></TooltipWrapper>` is rendered
- **THEN** the `data-testid="x"` element is a descendant of the wrapper div

### Requirement: TooltipWrapper SHALL render the tooltip span only when showTooltip is truthy

The `<TooltipWrapper>` primitive SHALL render a `<span class="tooltip">` inside the wrapper IFF the `showTooltip` prop is truthy. The `showTooltip` prop SHALL default to `true` when not provided (so the tooltip span renders by default). The tooltip span's text content SHALL be the `tooltip` prop value, OR empty when the `tooltip` prop is undefined. The tooltip span SHALL be the LAST child of the wrapper (rendered after the children prop).

#### Scenario: showTooltip default is true

- **WHEN** `<TooltipWrapper tooltip="hi">child</TooltipWrapper>` is rendered with no `showTooltip` prop
- **THEN** a `<span class="tooltip">` is present inside the wrapper with text content `"hi"`

#### Scenario: showTooltip false suppresses the span

- **WHEN** `<TooltipWrapper tooltip="hi" showTooltip={false}>child</TooltipWrapper>` is rendered
- **THEN** no element with class `tooltip` is present in the rendered output

#### Scenario: showTooltip true with tooltip text renders text inside span

- **WHEN** `<TooltipWrapper tooltip="Available after the gift is opened" showTooltip={true}>child</TooltipWrapper>` is rendered
- **THEN** the `<span class="tooltip">` text content is exactly `"Available after the gift is opened"`

#### Scenario: showTooltip true with no tooltip prop renders empty span

- **WHEN** `<TooltipWrapper showTooltip={true}>child</TooltipWrapper>` is rendered (no `tooltip` prop)
- **THEN** a `<span class="tooltip">` is present
- **AND** the span's text content is the empty string (no children rendered inside it)

### Requirement: TooltipWrapper SHALL NOT serve as the carrier for form-field error text

The `<TooltipWrapper>` primitive is scoped to decorative / informational hover hints (e.g. claim-button availability gating in `ModalButtons`). It SHALL NOT be used to convey form-field error messages — `form-field-system` explicitly excludes hover/focus-gated UI for error text (cross-link to `form-field-system/spec.md`'s requirement that removed the `<FormError>` component). Field errors are rendered through `<FieldError>` inline, not through `<TooltipWrapper>`. This exclusion is a family-scope boundary; no test in `tooltip-system` re-asserts it (the binding requirement lives in `form-field-system`), but documenting it here prevents `<TooltipWrapper>` from being re-introduced as an error-text vehicle by a contributor unfamiliar with the prior removal.

#### Scenario: Form-field error text does not flow through TooltipWrapper

- **WHEN** the codebase is grepped for `<TooltipWrapper` near `<FieldError`, `error`, `validation`, or similar identifiers inside `app/ui/components/field/` or any field-level error context
- **THEN** no such combination exists (the `form-field-system` exclusion governs)
- **AND** any future change that introduces such a combination is rejected as a `form-field-system` violation
