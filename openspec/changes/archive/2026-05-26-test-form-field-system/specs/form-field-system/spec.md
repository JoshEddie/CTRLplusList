## ADDED Requirements

### Requirement: FormField SHALL enforce a single child and warn in development when the child is not a known field-type wrapper

The `<FormField>` component at `app/ui/components/field/FormField.tsx` SHALL invoke `React.Children.only(children)` on its `children` prop — passing zero or more than one child SHALL throw the standard React `Children.only` error. When the single child is a valid React element with a `displayName` that is NOT in the known set (`TextField`, `TextareaField`, `SelectField`, `DateField`, `DatalistField`, `PriceField`), and `process.env.NODE_ENV !== 'production'`, `<FormField>` SHALL call `console.error` with a message naming the unexpected child and directing callers to use a field-type wrapper. The check SHALL NOT fire in production builds, SHALL NOT fire when the child has no `displayName`, and SHALL NOT fire for any of the six known wrappers.

#### Scenario: Multiple children throws

- **WHEN** `<FormField><input /><input /></FormField>` is rendered
- **THEN** React's `Children.only` throws (the component does not return a valid element tree)

#### Scenario: Unknown displayName triggers dev warning

- **WHEN** a custom component with `displayName = 'MyField'` is rendered as `<FormField>`'s child under `NODE_ENV !== 'production'`
- **THEN** `console.error` is called once with a message containing the substring `<MyField>` AND the substring `field-type wrapper`

#### Scenario: Known displayName is silent

- **WHEN** `<FormField><TextField /></FormField>` (or any of the other five known wrappers) is rendered
- **THEN** `console.error` is NOT called for this reason

#### Scenario: Anonymous child (no displayName) is silent

- **WHEN** `<FormField><input /></FormField>` is rendered (the native `input` has no `displayName`)
- **THEN** `console.error` is NOT called for this reason (the `displayName && …` guard short-circuits)

### Requirement: PriceField SHALL use cents-as-integer parsing and an explicit isNegative toggle path

The `<PriceField>` component at `app/ui/components/field/PriceField.tsx` SHALL parse its input value by stripping all non-digit characters, parsing the resulting string as integer cents (with `''` parsing as `0`), and converting to dollars by dividing by 100. The result SHALL be passed to `onChange` as a JavaScript `number` (not a string). The displayed string SHALL be derived from `Math.abs(amount)` formatted to exactly two fraction digits via `Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })`, then prefixed with `'-'` when the internal `isNegative` state is true. `amount === null` SHALL render an empty display string. The `allowNegative` prop SHALL default to `false`. When `allowNegative` is `false`, the negative state SHALL always be cleared (any `-` in the input value SHALL be discarded). When `allowNegative` is `true` and the input value contains `-`, the component SHALL set the local `isNegative` state to `true` and pass a negative dollar value to `onChange`. When `allowNegative` is `true`, `isNegative` is already `true`, and the input's last character is `-` (the trailing-minus toggle pattern), the component SHALL clear `isNegative` and pass a positive dollar value to `onChange`. The dollar-sign icon SHALL render in the leading icon slot via `<FormField icon={DOLLAR_ICON} iconPosition="left">`; the `icon` prop SHALL NOT be exposed on `<PriceField>` itself. `inputMode` SHALL be `"numeric"` (not `"decimal"`).

#### Scenario: Digits-only input parses as cents

- **WHEN** the user enters input value `'1234'` into a `<PriceField>` with `allowNegative={false}`
- **THEN** `onChange` is called with the number `12.34`
- **AND** the displayed input value is `'12.34'`

#### Scenario: Empty input parses as zero

- **WHEN** the user enters input value `''` (or input with no digits, e.g. `'$'`)
- **THEN** `onChange` is called with the number `0`

#### Scenario: amount=null renders empty display

- **WHEN** `<PriceField amount={null} onChange={fn} />` is rendered
- **THEN** the input's displayed value is the empty string

#### Scenario: amount=12.34 displays as 12.34

- **WHEN** `<PriceField amount={12.34} onChange={fn} />` is rendered with `isNegative=false`
- **THEN** the input's displayed value is `'12.34'`

#### Scenario: allowNegative=false suppresses negatives

- **WHEN** input value `'-1234'` is entered into a `<PriceField allowNegative={false}>`
- **THEN** `onChange` is called with `12.34` (not `-12.34`) and the displayed value has no leading `-`

#### Scenario: allowNegative=true with '-' flips to negative

- **WHEN** input value `'1234-'` is entered into a `<PriceField allowNegative onChange={fn}>` starting with `isNegative=false`
- **THEN** `onChange` is called with `-12.34`
- **AND** the displayed value on the next render is `'-12.34'`

#### Scenario: allowNegative=true with trailing '-' on a negative clears the sign

- **WHEN** the user types another `-` (input value's last character is `-`) into a `<PriceField allowNegative>` whose internal `isNegative` is currently `true`
- **THEN** `isNegative` clears to `false`
- **AND** `onChange` is called with the positive dollar value

#### Scenario: Dollar icon is locked in the leading slot

- **WHEN** `<PriceField>` is rendered (with no `icon`-style prop available)
- **THEN** the rendered icon is the `FaDollarSign` glyph with `aria-hidden="true"`, in the leading slot of the wrapping `.form_field` div

### Requirement: SearchField trailing-slot SHALL be a three-branch runtime decision

The `<SearchField>` component at `app/ui/components/field/SearchField.tsx` SHALL select its trailing slot content via three mutually exclusive runtime branches, in priority order: (1) when `trailing` is a non-null, non-undefined ReactNode, the trailing slot SHALL render `trailing` and no clear button SHALL be rendered (even if `onClear` is also provided at runtime — although the discriminated-union prop type prevents callers from passing both, the runtime contract makes trailing wins); (2) when `trailing` is absent AND `onClear` is provided AND `value` is non-empty (`value !== undefined && value !== ''`), the trailing slot SHALL render an auto `<button type="button" class="search_field_clear" aria-label="Clear search">` whose `onClick` invokes `onClear`; (3) otherwise, no trailing element SHALL render AND the outer `.form_field.search_field` div SHALL receive an additional `no_trailing` class token. The outer div SHALL always carry the classes `form_field search_field` (in that order); the optional `className` prop SHALL be appended last.

#### Scenario: Trailing node wins over auto clear button

- **WHEN** a test bypasses TypeScript to render `<SearchField trailing={<span>X</span>} onClear={fn} value="abc" />`
- **THEN** the rendered trailing slot contains the `<span>X</span>` AND no `.search_field_clear` button is rendered

#### Scenario: onClear with non-empty value renders the clear button

- **WHEN** `<SearchField onClear={fn} value="abc" />` is rendered
- **THEN** the trailing slot contains a `<button type="button" aria-label="Clear search">` whose `onClick` is `fn`
- **AND** clicking it invokes `fn` once

#### Scenario: onClear with empty value renders nothing trailing

- **WHEN** `<SearchField onClear={fn} value="" />` is rendered
- **THEN** no `.search_field_clear` button is rendered AND the outer div has the `no_trailing` class

#### Scenario: onClear with undefined value renders nothing trailing

- **WHEN** `<SearchField onClear={fn} />` is rendered (no `value` prop)
- **THEN** no `.search_field_clear` button is rendered AND the outer div has the `no_trailing` class

#### Scenario: Neither trailing nor onClear

- **WHEN** `<SearchField value="abc" />` is rendered
- **THEN** no trailing element renders AND the outer div has the `no_trailing` class

#### Scenario: className is appended after the static class tokens

- **WHEN** `<SearchField className="my-extra" value="x" onClear={fn} />` is rendered
- **THEN** the outer div's className string is exactly `'form_field search_field my-extra'` (in that order; no `no_trailing` because the clear button rendered)
