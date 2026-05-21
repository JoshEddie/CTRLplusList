# form-field-system Specification

## Purpose
TBD - created by archiving change standardize-form-fields. Update Purpose after archive.
## Requirements
### Requirement: Form-field tokens drive every field primitive's visual contract

The system SHALL define a `--field-*` token surface in `global.css` that the single chrome-owning wrapper consumes for sizing, color, border, focus ring, error treatment, and label typography. The token surface MUST include at minimum: `--field-min-height` (44px), `--field-padding-y`, `--field-padding-x`, `--field-radius`, `--field-font-size`, `--field-label-font-size` (14px), `--field-border-color`, `--field-border-color-hover`, `--field-border-color-focus`, `--field-border-color-error`, `--field-focus-ring-color`, `--field-focus-ring-width`, `--field-error-color`, `--field-placeholder-color`. The existing `--neutral-border-color` token MUST NOT be modified by this change (it has non-form consumers).

#### Scenario: Wrapper chrome consumes shared tokens
- **WHEN** the rendered CSS for `<FormField>` (the chrome-owning wrapper) is inspected
- **THEN** its border, height, padding, focus ring, and font-size come from `--field-*` tokens (no hardcoded pixel values for these properties)

#### Scenario: Token bump propagates to every field
- **WHEN** the value of `--field-border-color` is changed in `global.css`
- **THEN** every text input, textarea, native-select wrapper, datalist input, search field, price field, and checkbox on every page reflects the new border color without per-component edits

#### Scenario: --neutral-border-color is untouched
- **WHEN** the change lands
- **THEN** the value of `--neutral-border-color` in `global.css` is identical to its pre-change value, and non-form consumers (avatar borders, image-search backgrounds, etc.) render unchanged

### Requirement: All field primitives meet WCAG 2.5.8 touch target floor

The system SHALL render every text input, textarea, native-select wrapper, datalist input, search field, price field, and checkbox-plus-label region at a minimum 44×44 CSS-pixel touch target. The visible checkbox box MAY be smaller (24×24 is conventional), but the surrounding `<label>` region MUST extend the touch target to 44×44 via padding/min-height. There MUST NOT be a size variant (`sm`, `xs`, etc.) that opts out of the 44px floor — if a layout cannot accommodate 44px, the layout MUST be redesigned, not the floor compromised.

#### Scenario: TextField meets 44px floor
- **WHEN** `<TextField name="name" />` is rendered
- **THEN** the rendered `<div class="form_field">` wrapper has `min-height: 44px` (or matches `--field-min-height` if the token has been adjusted)

#### Scenario: SelectField meets 44px floor
- **WHEN** `<SelectField name="sort" options={...} />` is rendered
- **THEN** the rendered `<div class="form_field">` wrapper has `min-height: 44px`

#### Scenario: SearchField meets 44px floor
- **WHEN** `<SearchField value={…} />` is rendered
- **THEN** the rendered `<div class="form_field search_field">` has `min-height: 44px`

#### Scenario: CheckboxField extends touch target to 44px via label
- **WHEN** `<CheckboxField name="agree" label="I agree" />` is rendered
- **THEN** the wrapping `<label>` has a clickable region at least 44×44 in size (verified by the label's computed `min-height` and padding), even though the visible checkbox box is 24×24

#### Scenario: No size prop exists on field components
- **WHEN** any field-type wrapper is inspected (`<TextField>`, `<SelectField>`, etc.)
- **THEN** the component does not accept a `size` prop; field height is fixed via the token

### Requirement: Field chrome lives on the wrapper, not the input

The system SHALL render every field's visual chrome (border, background, padding, focus ring) on the wrapping `<div class="form_field">` element. The underlying form-control elements (`<input>`, `<select>`, `<textarea>`) MUST render with `background: transparent`, `border: none`, `height: 100%`, `width: 100%`, `outline: none`, and inherit visual properties from the wrapper. No CSS rule outside `app/ui/components/field/form-field.css` may set `background`, `border`, `padding`, or `box-shadow` on `.form_field_input`, `.form_field_select`, or `.form_field_textarea`.

#### Scenario: Input has no chrome of its own
- **WHEN** the computed styles of `<input class="form_field_input">` are inspected
- **THEN** `background-color` is transparent, `border-width` is 0, `outline-width` is 0, and visual chrome comes from the wrapping `.form_field` div

#### Scenario: Wrapper owns the focus ring
- **WHEN** a user focuses an input inside `<FormField>`
- **THEN** the focus ring appears on the wrapping `.form_field` div via `:focus-within`, not on the input itself

#### Scenario: No page CSS strips child chrome
- **WHEN** the codebase is grepped for selectors like `.form_field_input { border: none }` outside `form-field.css`
- **THEN** no matches exist — chrome stripping is impossible because the input has no chrome to strip

### Requirement: Field primitives meet WCAG 1.4.11 border contrast floor

The system SHALL render the default-state border of every field primitive at a color reaching ≥3:1 contrast against the field's white background. The error-state border MUST also reach ≥3:1 against the background AND be visually distinguishable from the default (different hue, not just thicker).

#### Scenario: Default border meets 3:1 against white
- **WHEN** a field is rendered against the standard white surface
- **THEN** the computed `border-color` value, measured against `#ffffff`, is ≥3:1 (verifiable with a contrast measurement tool)

#### Scenario: Error border is visually distinct and meets 3:1
- **WHEN** a field is rendered with `<FormField error="...">` (or any wrapper passing `error`)
- **THEN** the computed border color is ≥3:1 against the background AND is a distinct hue from the default border color

### Requirement: Field primitives use a `:focus-within` ring meeting WCAG 2.4.11

The system SHALL render a visible focus indicator on the wrapping `<div class="form_field">` when any child input receives focus. The indicator MUST be at least 2px thick and reach ≥3:1 contrast against the surrounding background. The implementation SHOULD use `box-shadow` on the wrapper (not `outline` on the input) so the ring color and thickness are tokenizable and don't require the input to manage its own outline.

#### Scenario: Focus shows the ring on the wrapper
- **WHEN** the user tabs to any input inside a field component
- **THEN** a visible focus indicator appears on the wrapping `.form_field` div (≥2px thick, ≥3:1 contrast against adjacent background)

#### Scenario: Same ring across every field primitive
- **WHEN** any of `<TextField>`, `<TextareaField>`, `<SelectField>`, `<DateField>`, `<DatalistField>`, `<PriceField>`, `<SearchField>` receives focus
- **THEN** the same `:focus-within` ring treatment is applied (sourced from `--field-focus-ring-color` and `--field-focus-ring-width` via the shared chrome CSS)

### Requirement: Error text meets WCAG 1.4.3 normal-text contrast floor

The system SHALL render `<FieldError>` text at a color reaching ≥4.5:1 contrast against the surrounding white background.

#### Scenario: FieldError text passes 4.5:1
- **WHEN** `<FieldError>{error}</FieldError>` is rendered
- **THEN** the computed text color (from `--field-error-color`) is ≥4.5:1 against `#ffffff`

#### Scenario: Error color is distinct from default body text
- **WHEN** `<FieldError>` is rendered next to surrounding non-error text
- **THEN** the error color is visually distinguishable (red-family or similarly conventional) and reaches the contrast floor independently — color is not the sole indicator (the error position relative to the field also signals errorhood)

### Requirement: FormField is the chrome owner and orchestrates label/error/ARIA wiring

The system SHALL provide a `<FormField>` component at `app/ui/components/field/FormField.tsx` that owns the visual chrome and the `useId`-generated id/aria-describedby/aria-invalid/aria-required wiring. `<FormField>` MUST render a `<label htmlFor={inputId}>` for the field label, a `<div class="form_field">` containing the icon (if any) and the child input, an optional `<p>` description, and a `<FieldError>` when an error is present. `<FormField>` MUST inject `id`, `aria-describedby`, `aria-invalid`, and `aria-required` onto its single field-element child via `React.cloneElement`. `<FormField>` MUST NOT be exported from the public field index — callers use the field-type wrappers.

#### Scenario: FormField wires label htmlFor to input id automatically
- **WHEN** `<TextField label="Name" name="name" />` is rendered (via `<FormField>` internally)
- **THEN** the rendered `<label>`'s `htmlFor` attribute equals the rendered `<input>`'s `id` attribute (both derived from a single `useId` call)

#### Scenario: FormField sets aria-required when required
- **WHEN** `<TextField label="Name" required />` is rendered
- **THEN** the rendered `<input>` has `aria-required="true"` AND the rendered `<label>` displays a visible required indicator (real DOM text inside `<span aria-hidden="true">`, not a CSS pseudo-element)

#### Scenario: FormField links error via aria-describedby
- **WHEN** `<TextField label="Name" error="Name is required" />` is rendered
- **THEN** the rendered `<input>` has `aria-invalid="true"` AND its `aria-describedby` attribute includes the `id` of the rendered `<FieldError>` element

#### Scenario: FormField links description via aria-describedby
- **WHEN** `<TextField label="Name" description="Visible to anyone you share with" />` is rendered
- **THEN** the rendered `<input>`'s `aria-describedby` attribute includes the `id` of the rendered description element

#### Scenario: FormField with both description and error links both
- **WHEN** a field has both description and error
- **THEN** the rendered `<input>`'s `aria-describedby` attribute contains both ids (space-separated)

#### Scenario: FormField is not exported publicly
- **WHEN** `app/ui/components/field/index.ts` is read
- **THEN** `FormField` is not in the export list (only the field-type wrappers, `FieldError`, `FIELD_ICONS`, and types are exported)

### Requirement: Field icon prop with iconPosition (left default, right opt-in)

The system SHALL accept an `icon: ReactNode` and `iconPosition: 'left' | 'right'` prop on `<FormField>` and on every field-type wrapper that forwards it. The default position MUST be `'left'`. When an icon is provided, the `<div class="form_field">` wrapper MUST switch grid templates accordingly (`auto 1fr` for left, `1fr auto` for right, `1fr` for no icon). The icon MUST be rendered inside the wrapper as a sibling to the input, not via a page-scoped decorator wrapping the field.

#### Scenario: Default icon position is left
- **WHEN** `<TextField icon={FIELD_ICONS.name} />` is rendered without specifying iconPosition
- **THEN** the wrapping `.form_field` has `grid-template-columns: auto 1fr` and the icon renders before the input

#### Scenario: iconPosition=right flips the grid
- **WHEN** `<TextField icon={FIELD_ICONS.link} iconPosition="right" />` is rendered
- **THEN** the wrapping `.form_field` has `grid-template-columns: 1fr auto` and the icon renders after the input

#### Scenario: No icon collapses grid to single column
- **WHEN** `<TextField />` is rendered without an icon
- **THEN** the wrapping `.form_field` has `grid-template-columns: 1fr` (input fills the row)

### Requirement: Field-type wrappers do not accept className for the input

The system SHALL provide field-type wrappers (`<TextField>`, `<TextareaField>`, `<SelectField>`, `<DateField>`, `<DatalistField>`, `<PriceField>`) that forward HTML attributes to their underlying input/select/textarea element with `className` omitted from the prop type. The TypeScript type for each wrapper's input-attribute pass-through MUST be `Omit<ComponentPropsWithRef<element>, "className" | "disabled" | "type">` (or equivalent — the `className` exclusion is non-negotiable; `disabled` and `type` are handled by the wrapper itself). A separate `className` prop MAY be accepted on the wrapper for layout positioning of the outer `<FormField>` div, but it MUST be documented as for layout only — never chrome.

#### Scenario: TextField rejects className on input
- **WHEN** a caller writes `<TextField className="my-styles" />` and the build is type-checked
- **THEN** if `className` reaches the underlying input, TypeScript surfaces an error (because the input-spread props omit className)

#### Scenario: Wrapper className positions the outer div only
- **WHEN** `<SelectField className="flex-1" />` is rendered
- **THEN** the `flex-1` class is applied to the outer `.form_field` `<div>`, not to the `<select>`, AND the documentation for the `className` prop says so

### Requirement: TextField renders a transparent native input

The system SHALL provide a `<TextField>` component at `app/ui/components/field/TextField.tsx` that renders a native `<input class="form_field_input">` inside `<FormField>`. The input MUST render with no chrome of its own (the parent owns chrome). `<TextField>` MUST support `type` values `text`, `email`, `url`, `tel`, `password`, `search`, `number`.

#### Scenario: TextField renders a transparent input
- **WHEN** `<TextField type="text" name="title" placeholder="Enter title" />` is rendered
- **THEN** the rendered element is a native `<input type="text" name="title" placeholder="Enter title" class="form_field_input">` inside `<FormField>`, and the input's computed `background` is transparent and `border-width` is 0

#### Scenario: TextField forwards refs
- **WHEN** `<TextField ref={ref} />` is rendered
- **THEN** `ref.current` points at the underlying `<input>` element

### Requirement: TextareaField renders a transparent native textarea

The system SHALL provide a `<TextareaField>` component that renders a native `<textarea class="form_field_textarea">` inside `<FormField>`. The textarea MUST render with no chrome of its own. When a textarea child is present, the icon slot (if any) MUST top-align to avoid drifting with line height.

#### Scenario: TextareaField renders a transparent textarea
- **WHEN** `<TextareaField name="notes" rows={4} />` is rendered
- **THEN** the rendered element is a native `<textarea name="notes" rows={4} class="form_field_textarea">` inside `<FormField>` with transparent chrome

### Requirement: SelectField wraps a native select with a chevron indicator

The system SHALL provide a `<SelectField>` component that wraps a native `<select class="form_field_select">` inside `<FormField>` with a chevron indicator rendered in the trailing icon slot. The native `<select>` MUST use `appearance: none` to defer chrome to the parent. The opened state MUST delegate to the user agent (no custom-rendered menu). `<SelectField>` MUST accept either `options: { value, label }[]` OR `children` containing `<option>` elements.

#### Scenario: SelectField renders a native select with chevron
- **WHEN** `<SelectField name="sort" options={[{value:'asc',label:'Ascending'},{value:'desc',label:'Descending'}]} />` is rendered
- **THEN** the rendered DOM is a `<select name="sort" class="form_field_select">` with `<option>` children matching the options array, plus a chevron `<svg>` rendered in the trailing icon slot

#### Scenario: SelectField open behavior is native
- **WHEN** the user interacts with `<SelectField>` on a mobile device
- **THEN** the native OS picker (iOS drum-roll / Android list dialog) appears — no custom-rendered menu

### Requirement: DateField wraps a native date input

The system SHALL provide a `<DateField>` component that wraps `<input type="date">` inside `<FormField>` with the standard field chrome. The date-picker chrome (calendar popup) MUST remain UA-provided.

#### Scenario: DateField renders a native date input
- **WHEN** `<DateField label="Date" min="1900-01-01" />` is rendered
- **THEN** the rendered element is `<input type="date" class="form_field_input" min="1900-01-01">` inside `<FormField>`

### Requirement: DatalistField provides text input with suggestion list

The system SHALL provide a `<DatalistField>` component that renders `<input type="text" list={generatedId}>` inside `<FormField>` plus a sibling `<datalist id={generatedId}>` containing caller-provided `<option>` nodes. Users MUST be able to type custom values; the options serve as suggestions, not constraints. The `list` id MUST be generated via `useId()` to avoid collision when multiple datalists render on the same page.

#### Scenario: DatalistField renders input + datalist
- **WHEN** `<DatalistField name="occasion" options={<><option value="Birthday" /><option value="Wedding" /></>} />` is rendered
- **THEN** the rendered DOM contains `<input type="text" list="<id>" name="occasion">` and a sibling `<datalist id="<id>">` with the option children

#### Scenario: User types a custom value
- **WHEN** the user types a value not present in the options
- **THEN** the input accepts and forwards the typed value (no validation rejection)

### Requirement: PriceField uses cents-as-integer math with formatted display

The system SHALL provide a `<PriceField>` component that renders an `<input type="text" inputMode="numeric">` inside `<FormField>` with a locked `$` icon in the leading position. The input MUST manage formatting internally: digits-only string input is parsed as integer cents, divided by 100 for the dollar value passed to `onChange`, and formatted back to the display string. The `inputMode` MUST be `"numeric"` (not `"decimal"`) because `"decimal"` is buggy across mobile browsers. The `$` icon MUST NOT be overridable.

#### Scenario: PriceField formats input as currency
- **WHEN** the user types "1234" into a `<PriceField>`
- **THEN** the input displays "12.34" and `onChange` is called with the dollar value `12.34`

#### Scenario: PriceField passes dollars-as-number
- **WHEN** `<PriceField amount={12.34} onChange={fn} />` is rendered
- **THEN** the displayed value is "12.34" and `fn` is called with a `number` (not a string) on each input

#### Scenario: PriceField icon is locked
- **WHEN** `<PriceField>` is rendered with any icon prop attempt
- **THEN** the rendered icon is the dollar-sign glyph; the component does not accept an `icon` prop

### Requirement: SearchField is a sibling primitive with 3-column grid

The system SHALL provide a `<SearchField>` component at `app/ui/components/field/SearchField.tsx` that is NOT a `<FormField>` wrapper. `<SearchField>` MUST render `<div class="form_field search_field">` with a 3-column grid (`auto 1fr auto`) containing a locked search icon, the input, and a trailing slot. The trailing slot MUST be either an auto-rendered clear `<button>` (when `value` is non-empty AND `onClear` is provided) OR a caller-provided `trailing` ReactNode — never both, enforced via a discriminated-union type. `<SearchField>` MUST reuse the `.form_field` chrome CSS for border, background, and focus-within behavior.

#### Scenario: SearchField with onClear auto-renders the clear button
- **WHEN** `<SearchField value="test" onClear={fn} />` is rendered
- **THEN** a `<button aria-label="Clear search">×</button>` appears in the trailing slot; clicking it calls `fn`

#### Scenario: SearchField with empty value hides clear button
- **WHEN** `<SearchField value="" onClear={fn} />` is rendered
- **THEN** no clear button is rendered (the trailing slot collapses)

#### Scenario: SearchField with trailing slot replaces clear button
- **WHEN** `<SearchField value="test" trailing={<CountBadge n={4} />} />` is rendered
- **THEN** the trailing slot contains the CountBadge, AND TypeScript prevents passing both `onClear` and `trailing` simultaneously

#### Scenario: SearchField reuses form_field chrome
- **WHEN** a `<SearchField>` and a sibling `<TextField>` are rendered with focus on each in turn
- **THEN** both show the same border, background, and focus ring — the chrome is identical because `.search_field` extends `.form_field` for chrome and only overrides the grid template

### Requirement: CheckboxField is a separate primitive (no FormField wrapper)

The system SHALL provide a `<CheckboxField>` component at `app/ui/components/field/CheckboxField.tsx` that wraps native `<input type="checkbox">` in a `<label>` containing the box + label text. The label wrapper MUST have a clickable region at least 44×44 to satisfy 2.5.8. The visible box MUST be at least 24×24 with a focus ring on the box. `<CheckboxField>` MUST always render its own `<label>` (the standalone API is the always-public API; checkboxes do not nest inside `<FormField>`).

#### Scenario: CheckboxField renders box + label inside a 44px label
- **WHEN** `<CheckboxField name="agree" label="I agree" />` is rendered
- **THEN** the rendered DOM is a `<label>` (computed `min-height` ≥ 44px) containing a native `<input type="checkbox" name="agree">` + a custom-styled 24×24 box element + the text "I agree"

#### Scenario: CheckboxField focus ring is on the box
- **WHEN** a keyboard user tabs to a `<CheckboxField>`
- **THEN** the visible focus indicator appears on the box element (not the wrapping label), matching the field focus-ring contract

#### Scenario: CheckboxField keyboard toggle is native
- **WHEN** a `<CheckboxField>` is focused and the user presses Space
- **THEN** the checkbox toggles its checked state (native checkbox behavior)

### Requirement: FieldError is the single canonical error display, no role=alert

The system SHALL provide a `<FieldError>` component at `app/ui/components/field/FieldError.tsx` that renders a `<p class="field_error">{children}</p>`. `<FieldError>` MUST receive an `id` from `<FormField>` (or accept one via prop) so it can be linked via `aria-describedby`. `<FieldError>` MUST NOT use `role="alert"` (or any other live-region role) — error announcement is handled by the input's `aria-describedby` association on focus, not by interruption. When no error is provided, no element is rendered.

#### Scenario: FieldError renders persistent inline text
- **WHEN** `<FieldError id="x">Name is required</FieldError>` is rendered
- **THEN** the rendered element is a `<p id="x" class="field_error">` containing the literal text "Name is required", with no hover/focus required to reveal it

#### Scenario: FieldError text contrast passes 4.5:1
- **WHEN** `<FieldError>` is rendered
- **THEN** its computed color reaches ≥4.5:1 against the surrounding background

#### Scenario: FieldError is not rendered when error is empty
- **WHEN** `<TextField error={undefined} />` is rendered
- **THEN** no `<FieldError>` element is produced in the DOM tree

#### Scenario: FieldError has no role=alert
- **WHEN** `<FieldError>` is inspected
- **THEN** the rendered element has no `role="alert"`, no `role="status"`, and no `aria-live` attribute

### Requirement: Tooltip-as-error pattern is removed

The system SHALL NOT use a tooltip, popover, or any hover/focus-gated UI to convey field error text. The previous `<FormError>` component (which rendered an `<LuInfo>` icon inside `<TooltipWrapper>` and showed the error on hover) MUST be removed from the codebase along with all of its call sites.

#### Scenario: FormError component is removed
- **WHEN** the codebase is grepped for `FormError` after migration
- **THEN** no `import { FormError }` or `<FormError>` usages remain (excluding archived openspec history)

### Requirement: Required state uses a single mechanism

The system SHALL express field required-ness through the `required` prop on `<FormField>` (and the field-type wrappers that forward it). The `required` prop MUST set `aria-required="true"` on the underlying input AND render a visible required indicator inside the rendered `<label>` as real DOM text wrapped in `<span aria-hidden="true">` (not a CSS `::after` pseudo-element with `content`). The previous patterns — literal `*` characters in label text, and the `.required::after { content: 'Required' }` CSS rule — MUST be removed.

#### Scenario: Required prop sets aria-required and renders visible indicator
- **WHEN** `<TextField label="Name" required />` is rendered
- **THEN** the rendered `<input>` has `aria-required="true"` AND the rendered `<label>` contains a visible required indicator (real DOM text such as " *" inside `<span aria-hidden="true">`)

#### Scenario: Pseudo-element required indicator is removed from CSS
- **WHEN** the project's CSS is grepped for `.required::after`
- **THEN** no rule defines required-indicator text via `content:`

#### Scenario: Literal asterisks in label markup are removed
- **WHEN** any migrated field renders a label that was previously a literal `*` in markup (e.g., `<FormLabel>Name*</FormLabel>` in `ItemNameInput`)
- **THEN** the migrated label text contains no literal `*` character; the required state is expressed only through the `required` prop

### Requirement: Placeholder color meets WCAG 1.4.3; placeholders are never the only label

The system SHALL render placeholder text at a color reaching ≥4.5:1 against the field background. Placeholder text MUST NOT be the sole label for any field; every field MUST have either a visible label via `<FormField label>` (or its field-type-wrapper forward) OR an `aria-label` describing its purpose.

#### Scenario: Placeholder contrast passes 4.5:1
- **WHEN** a field with a placeholder is rendered
- **THEN** the computed placeholder color (from `--field-placeholder-color`) is ≥4.5:1 against the field background

#### Scenario: Every field has a label or aria-label
- **WHEN** any field component is rendered after migration
- **THEN** it has either a visible label via the wrapper's `label` prop OR a non-empty `aria-label` attribute

### Requirement: Centralized FIELD_ICONS registry

The system SHALL provide a `FIELD_ICONS` constant exported from `app/ui/components/field/field-icons.tsx` containing pre-built icon ReactNodes for recurring field kinds (`name`, `date`, `link`, `email`, `search` at minimum). The constant MUST be optional — the `icon` prop on field components still accepts any `ReactNode`. Each icon in `FIELD_ICONS` MUST include `aria-hidden="true"` so it is not announced by screen readers.

#### Scenario: FIELD_ICONS is exported and usable
- **WHEN** a caller writes `<TextField icon={FIELD_ICONS.name} />`
- **THEN** the field renders with the canonical name icon, marked `aria-hidden="true"`

#### Scenario: Custom icon still works
- **WHEN** a caller writes `<TextField icon={<MyCustomIcon />} />`
- **THEN** the field accepts the custom node and renders it in the icon slot

### Requirement: All form-field call sites are migrated to the new wrappers

The system SHALL migrate every existing `<input>`, `<textarea>`, `<select>`, and `<input type="checkbox">` call site to the new field wrappers within this change. After migration, the following components and styles MUST be deleted: `app/ui/components/Form/Form.tsx` (the entire file); `app/ui/components/Form/FormSelect.tsx` (deletion path per Decision 15); `app/ui/components/SelectWrapper.tsx`; `app/ui/styles/select.css`; the prior implementation's `app/ui/components/field/` directory in full; the `.form-input` / `.form-textarea` / `.form-label` / `.form-input-error` / `.input-error` / `.form-error` / `.form-group` / `.required::after` rules in `form.css`; every page-scoped input-shaped class (`.items-search-input`, `.items-search` wrapper chrome, `.store-filter-search`, `.guest-name-input`, `.position-input` border/font, `.if-price-wrap` + `.if-dollar` + `.if-price-in`, `.page-size-select select`, `.items-sort` chrome, `.input-tooltip`, every `.error-message` instance).

#### Scenario: No call site uses className="form-input" directly
- **WHEN** the codebase is grepped for `className=.*form-input` or `className=.*form-textarea` after migration
- **THEN** no matches remain

#### Scenario: Form.tsx and prior field/ directory are deleted
- **WHEN** `app/ui/components/Form/Form.tsx` is checked after migration
- **THEN** the file does not exist; the prior implementation's `app/ui/components/field/` `TextInput.tsx`, `Textarea.tsx`, `Select.tsx`, `Checkbox.tsx`, `Field.tsx`, `fieldClasses.ts` are all replaced by the new files

#### Scenario: Native select call sites use SelectField
- **WHEN** `PageSizeSelect`, `ItemsToolbar` (sort/purchases/show), and `QuantityLimitField` are rendered after migration
- **THEN** each contains a `<SelectField>` (not a bare `<select>` element)

#### Scenario: Search inputs use SearchField
- **WHEN** the items-toolbar search, store-filter popover search, and image-search modal search are rendered after migration
- **THEN** each is a `<SearchField>` (not a `<TextField type="search">` with page-scoped icon/clear overlays)

#### Scenario: Price inputs use PriceField
- **WHEN** `StoreInput` price column and `PriceFilterPopover` min/max are rendered after migration
- **THEN** each is a `<PriceField>` (not a `<TextField type="number">` with a $ prefix overlay)

### Requirement: FormSelect deletion path with datalist verification

The system SHALL delete `app/ui/components/Form/FormSelect.tsx`, `app/ui/components/SelectWrapper.tsx`, and `app/ui/styles/select.css` AND migrate the single `<FormSelect>` caller (`ListForm`'s occasion picker) to `<DatalistField options={…}>` containing the six common occasions, PROVIDED that manual testing in Chrome and Safari confirms acceptable `<datalist>` UX. If Safari `<datalist>` UX is unacceptable, the system MAY instead reskin `<FormSelect>` to consume `--field-*` tokens and keep the file.

#### Scenario: FormSelect is deleted (preferred path)
- **WHEN** datalist UX is verified acceptable in Chrome AND Safari
- **THEN** `FormSelect.tsx`, `SelectWrapper.tsx`, and `select.css` are removed; `ListForm`'s occasion picker is `<DatalistField name="occasion" options={…} />`

#### Scenario: FormSelect is kept reskinned (fallback path)
- **WHEN** datalist UX is verified unacceptable in Safari
- **THEN** `FormSelect.tsx`, `SelectWrapper.tsx`, and `select.css` remain, but `select.css` is rewritten to consume `--field-*` tokens

### Requirement: QuantityLimitSelect is renamed to QuantityLimitField

The system SHALL rename `app/(main)/items/ui/components/itemform/QuantityLimitSelect.tsx` to `QuantityLimitField.tsx`. All imports MUST be updated. The component MUST use `<TextField type="number">` + `<CheckboxField label="Unlimited">` internally.

#### Scenario: Rename is complete
- **WHEN** the codebase is grepped for `QuantityLimitSelect` after migration
- **THEN** no matches remain

