# form-field-system Delta

## MODIFIED Requirements

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
- **THEN** the value of `--neutral-border-color` in `global.css` is identical to its pre-change value, and non-form consumers (avatar borders, etc.) render unchanged

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

- **WHEN** the items-toolbar search and the store-filter popover search are rendered after migration
- **THEN** each is a `<SearchField>` (not a `<TextField type="search">` with page-scoped icon/clear overlays)

#### Scenario: Price inputs use PriceField

- **WHEN** `StoreInput` price column and `PriceFilterPopover` min/max are rendered after migration
- **THEN** each is a `<PriceField>` (not a `<TextField type="number">` with a $ prefix overlay)
