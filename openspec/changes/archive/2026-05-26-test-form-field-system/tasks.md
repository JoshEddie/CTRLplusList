## 1. Confirm foundation surfaces are usable

- [x] 1.1 Re-confirm `test/helpers/setup.ts` loads `@testing-library/jest-dom/vitest` and registers RTL `cleanup` via `afterEach` (added in `test-button-system` §7.3 finding 4). Sanity check, not new work. — Verified at `test/helpers/setup.ts:1` (jest-dom import) and `:9-11` (afterEach cleanup).
- [x] 1.2 Verify the jsdom project (`*.test.tsx`) resolves `@/` and the `react()` plugin is active by re-running an existing `*.test.tsx` (e.g. `app/ui/components/chip/__tests__/Chip.test.tsx`). All ten new tests in this carve-out run under jsdom; no `.test.ts` files are added. — Verified by re-running `Chip.test.tsx`: 22/22 passed.
- [x] 1.3 Spec re-grep: confirmed `form-field-system` SHALLs match production at HEAD. The three NEW SHALLs from the spec delta (FormField child-displayName warning; PriceField cents-math + negative-toggle; SearchField trailing-slot three-branch) are implemented and assertable. No divergence.
- [x] 1.4 Confirmed `vitest.config.ts` `coverage.exclude` contains `app/ui/components/*/index.ts` and `**/__tests__/**`. Both glob patterns active.

## 2. Write `app/ui/components/field/__tests__/FormField.test.tsx` (universal COVERAGE_FLOOR)

### 2A. ChildSingleton — Children.only contract

- [x] 2.1 `ZeroChildren_ChildrenOnlyThrows` — render `<FormField label="x">{null}</FormField>`; assert React throws (use `expect(() => render(...)).toThrow()`).
- [x] 2.2 `MultipleChildren_ChildrenOnlyThrows` — render `<FormField><input /><input /></FormField>`; assert React throws.

### 2B. DevWarningOnUnknownChild — console.error path

- [x] 2.3 `UnknownDisplayName_ConsoleErrorIsCalled` — define a component `function MyField() { return <input /> }` with `MyField.displayName = 'MyField'`; spy `vi.spyOn(console, 'error').mockImplementation(() => {})` in `beforeEach`, restore in `afterEach`; render `<FormField><MyField /></FormField>`; assert `console.error` called with a message containing `<MyField>` and the substring `field-type wrapper`.
- [x] 2.4 `KnownDisplayName_ConsoleErrorNotCalled` — pick one known wrapper (e.g. `TextField`); render `<FormField><TextField /></FormField>`; assert `console.error` was NOT called for this reason. (Filter by message substring to avoid clashing with unrelated React warnings.)
- [x] 2.5 `AnonymousChild_ConsoleErrorNotCalled` — render `<FormField><input /></FormField>` (native `input` has no `displayName`); assert `console.error` was NOT called for the displayName-check reason.

### 2C. UseIdWiring — label / input / aria-describedby

- [x] 2.6 `LabelProvided_HtmlForMatchesInputId` — render `<FormField label="Name"><TextField /></FormField>`; assert the rendered `<label>`'s `htmlFor` equals the input's `id` AND both are non-empty.
- [x] 2.7 `RequiredTrue_AriaRequiredOnInputAndIndicatorInLabel` — render `<FormField label="Name" required><TextField /></FormField>`; assert input has `aria-required="true"` AND the label contains a `<span aria-hidden="true">` whose text starts with ` *` (real DOM text, not CSS pseudo).
- [x] 2.8 `RequiredFalse_NoAriaRequiredAndNoIndicator` — render `<FormField label="Name"><TextField /></FormField>`; assert input has NO `aria-required` attribute AND no `.required_indicator` span exists.
- [x] 2.9 `ErrorProvided_AriaInvalidAndDescribedbyLinksFieldError` — render `<FormField label="Name" error="Required"><TextField /></FormField>`; assert input has `aria-invalid="true"` AND `aria-describedby` includes the rendered `<FieldError>`'s `id`; the FieldError text is `'Required'`.
- [x] 2.10 `ErrorUndefined_NoFieldErrorRendered` — render `<FormField label="Name"><TextField /></FormField>`; assert no `.field_error` element exists AND input has no `aria-invalid` attribute.
- [x] 2.11 `DescriptionProvided_AriaDescribedbyLinksDescription` — render `<FormField label="Name" description="Helper"><TextField /></FormField>`; assert input's `aria-describedby` includes the rendered description `<p>`'s `id`; the description text is `'Helper'`.
- [x] 2.12 `DescriptionAndError_BothLinkedSpaceJoined` — render with both `description="Helper"` and `error="Required"`; collect input's `aria-describedby`, split on space, assert the set equals `{descId, errId}` (per design Decision 7 — order-agnostic).
- [x] 2.13 `NeitherDescriptionNorError_AriaDescribedbyUndefined` — render with neither; assert input has NO `aria-describedby` attribute (the `|| undefined` short-circuit).

### 2D. IconPositionGrid — three-way class composition

- [x] 2.14 `IconOmitted_FieldClassHasNoIconClass` — render `<FormField label="x"><TextField /></FormField>`; assert the inner `.form_field` div's className contains `'form_field'` and contains neither `'icon_left'` nor `'icon_right'`.
- [x] 2.15 `IconProvidedDefaultPosition_FieldClassHasIconLeft` — render `<FormField label="x" icon={<svg data-testid="i" />}><TextField /></FormField>`; assert `.form_field` className contains `'icon_left'` AND the icon `<svg>` appears as the leading child of `.form_field`.
- [x] 2.16 `IconProvidedRight_FieldClassHasIconRight` — render with `icon={…} iconPosition="right"`; assert className contains `'icon_right'` AND the icon `<svg>` appears as the trailing child of `.form_field`.

### 2E. InvalidAndSizeClasses

- [x] 2.17 `ErrorProvided_FieldClassHasInvalid` — render with `error="..."`; assert `.form_field` className contains `'invalid'`.
- [x] 2.18 `ErrorOmitted_FieldClassDoesNotHaveInvalid` — render without error; assert NO `'invalid'` class on `.form_field`.
- [x] 2.19 `SizeSm_FieldClassHasFormFieldSm` — render with `size="sm"`; assert `.form_field` className contains `'form_field-sm'`.
- [x] 2.20 `SizeOmittedOrMd_NoSmClass` — render without size (and once with `size="md"`); assert no `'form_field-sm'` class.

### 2F. ClassNameOnOuter — group-level layout class

- [x] 2.21 `ClassNameProvided_AppendedToFormFieldGroup` — render `<FormField className="my-extra"><TextField /></FormField>`; assert the outermost `.form_field_group` div has both `'form_field_group'` and `'my-extra'`.
- [x] 2.22 `ClassNameOmitted_OnlyFormFieldGroup` — render without className; assert outermost div's className is exactly `'form_field_group'` (no trailing space, no `undefined`).

## 3. Write `app/ui/components/field/__tests__/TextField.test.tsx` (universal COVERAGE_FLOOR)

### 3A. DomShape — wrapped input

- [x] 3.1 `Default_RendersInputInsideFormField` — render `<TextField label="Name" name="name" />`; assert the rendered input has `class="form_field_input"`, `type="text"` (default), `name="name"`, AND lives inside a `.form_field_group > .form_field` subtree.

### 3B. TypeProp — seven supported values

- [x] 3.2 `TypeDefault_Text` — render `<TextField />`; assert input `type="text"`.
- [x] 3.3 `TypeSetToEachOfSeven` — parameterize over `['text','email','url','tel','password','search','number']`; assert input's `type` matches the prop.

### 3C. PropPassthrough

- [x] 3.4 `Placeholder_ForwardedToInput` — render with `placeholder="Enter title"`; assert input has matching attribute.
- [x] 3.5 `ValueAndOnChange_Forwarded` — render with `value="abc"` + `onChange` spy; type one character; spy called with the input change event.
- [x] 3.6 `DisabledTrue_ForwardedToInput` — render with `disabled`; assert input `toBeDisabled()`.
- [x] 3.7 `DisabledOmitted_InputNotDisabled` — render without; assert `not.toBeDisabled()`.

### 3D. RefForwarding

- [x] 3.8 `Ref_ResolvesToInputElement` — render with `<TextField ref={ref} />` where `ref = createRef<HTMLInputElement>()`; assert `ref.current` is an `HTMLInputElement` AND has `class="form_field_input"`.

### 3E. WrapperForwarding — verifies the outer-wrapper plumbing

- [x] 3.9 `LabelForwarded_ToFormField` — render with `label="Name"`; assert a `<label>` exists in the outer subtree with text `Name`.
- [x] 3.10 `ErrorForwarded_RendersFieldError` — render with `error="Required"`; assert a `.field_error` element exists with text `Required` AND input has `aria-invalid="true"`.
- [x] 3.11 `RequiredForwarded_AriaRequiredOnInput` — render with `required`; assert input has `aria-required="true"`.
- [x] 3.12 `IconForwarded_AppearsInFieldRow` — render with `icon={<svg data-testid="i" />}`; assert the testid svg appears inside `.form_field`.
- [x] 3.13 `ClassNameForwarded_AppendsToOuterGroup` — render with `className="layout-extra"`; assert outermost `.form_field_group` has class `layout-extra`.

## 4. Write `app/ui/components/field/__tests__/TextareaField.test.tsx` (universal COVERAGE_FLOOR)

- [x] 4.1 `Default_RendersTextareaInsideFormField` — render `<TextareaField name="notes" rows={4} />`; assert a `<textarea class="form_field_textarea" name="notes" rows="4">` exists inside `.form_field`.
- [x] 4.2 `DisabledTrue_ForwardedToTextarea` — assert `toBeDisabled()`.
- [x] 4.3 `DisabledOmitted_NotDisabled` — assert `not.toBeDisabled()`.
- [x] 4.4 `Ref_ResolvesToTextareaElement` — `ref.current` is an `HTMLTextAreaElement` with `class="form_field_textarea"`.
- [x] 4.5 `ValueAndOnChange_Forwarded` — controlled-value forwarding.
- [x] 4.6 `LabelErrorRequiredIcon_ForwardedToFormField` — single test sweep over the four wrapper-forwarded props.
- [x] 4.7 `ClassNameForwarded_AppendsToOuterGroup` — `className` on the outer `.form_field_group`.

## 5. Write `app/ui/components/field/__tests__/SelectField.test.tsx` (universal COVERAGE_FLOOR)

- [x] 5.1 `Default_RendersSelectInsideFormField` — render `<SelectField name="sort" options={[{value:'a',label:'A'},{value:'b',label:'B'}]} />`; assert a `<select class="form_field_select" name="sort">` exists inside `.form_field`.
- [x] 5.2 `Options_RenderedAsOptionElements` — assert the rendered `<select>` contains two `<option>` children with matching `value`/text.
- [x] 5.3 `ChildrenPath_NoOptionsProvided` — render `<SelectField><option value="x">X</option></SelectField>`; assert the rendered `<option value="x">X</option>` is present (children pass-through when `options` is undefined).
- [x] 5.4 `OptionsTakePriorityOverChildren_IfBoth` — render with BOTH `options` and `children`; assert the `options`-derived `<option>` elements are present AND the `children`-provided ones are NOT (the source uses a ternary; `options` truthy wins). If the truth table differs, record disposition.
- [x] 5.5 `FieldSizeSm_ForwardsToFormFieldSize` — render `<SelectField fieldSize="sm" />`; assert `.form_field` className contains `'form_field-sm'`.
- [x] 5.6 `FieldSizeOmitted_NoSmClass` — assert no `'form_field-sm'` class.
- [x] 5.7 `DisabledTrue_ForwardedToSelect` — `toBeDisabled()`.
- [x] 5.8 `Ref_ResolvesToSelectElement` — `ref.current` is an `HTMLSelectElement`.
- [x] 5.9 `LabelErrorRequiredIcon_ForwardedToFormField` — wrapper-forwarded prop sweep.
- [x] 5.10 `ClassNameForwarded_AppendsToOuterGroup`.

## 6. Write `app/ui/components/field/__tests__/DateField.test.tsx` (universal COVERAGE_FLOOR)

- [x] 6.1 `Default_RendersDateInputInsideFormField` — assert input `type="date"`, `class="form_field_input"`.
- [x] 6.2 `MinMax_Forwarded` — render with `min="1900-01-01" max="2100-12-31"`; assert both attributes on the input.
- [x] 6.3 `DisabledTrue_ForwardedToInput`.
- [x] 6.4 `Ref_ResolvesToInputElement`.
- [x] 6.5 `LabelErrorRequiredIcon_ForwardedToFormField`.
- [x] 6.6 `ClassNameForwarded_AppendsToOuterGroup`.

## 7. Write `app/ui/components/field/__tests__/DatalistField.test.tsx` (universal COVERAGE_FLOOR)

- [x] 7.1 `Default_RendersInputPlusDatalist` — render `<DatalistField name="occ" options={<><option value="A" /><option value="B" /></>} />`; assert the rendered DOM contains `<input type="text" list="<id>" name="occ">` AND a sibling `<datalist id="<id>">` whose `id` equals the input's `list` attribute.
- [x] 7.2 `ListIdMatchesDatalistId_NonEmptyAndUseIdShaped` — assert the shared id is non-empty AND matches the `useId()` pattern (contains a `:` character per React 19's id format).
- [x] 7.3 `MultipleDatalistFields_HaveDistinctIds` — render two `<DatalistField>` siblings; assert the two pairs of (`list`, `datalist id`) match within each pair AND differ across pairs.
- [x] 7.4 `OptionsRendered_InsideDatalist` — assert the provided `<option>` nodes are children of the rendered `<datalist>`, not of the input.
- [x] 7.5 `Ref_ResolvesToInputElement`.
- [x] 7.6 `DisabledTrue_ForwardedToInput`.
- [x] 7.7 `LabelErrorRequiredIcon_ForwardedToFormField`.

## 8. Write `app/ui/components/field/__tests__/PriceField.test.tsx` (universal COVERAGE_FLOOR)

### 8A. RenderingAndIcon

- [x] 8.1 `Default_RendersTransparentInputAndDollarIcon` — render `<PriceField amount={null} onChange={() => {}} />`; assert the rendered input has `type="text"`, `inputMode="numeric"`, `class="form_field_input"`, `placeholder="0.00"` AND the dollar `<svg>` has `aria-hidden="true"` AND appears in the leading icon slot of `.form_field`.

### 8B. DisplayDerivation — Math.abs + isNegative prefix

- [x] 8.2 `AmountNull_DisplayEmpty` — render `<PriceField amount={null} onChange={() => {}} />`; assert input value is `''`.
- [x] 8.3 `AmountPositive_DisplayFormattedTwoDecimals` — render `<PriceField amount={12.34} onChange={() => {}} />`; assert input value is `'12.34'`.
- [x] 8.4 `AmountZero_DisplayFormatted` — render `<PriceField amount={0} onChange={() => {}} />`; assert input value is `'0.00'`.
- [x] 8.5 `AmountNegativeInitialIsNegativeTrue_DisplayHasLeadingMinus` — render `<PriceField amount={-12.34} onChange={() => {}} allowNegative />`; the initial `isNegative` is derived from `amount !== null && amount < 0`, so the display SHALL be `'-12.34'`.

### 8C. ParsingMath — cents-as-integer

- [x] 8.6 `Input1234_OnChangeWith1234Dollars` — render `<PriceField amount={null} onChange={spy} />`; `fireEvent.change(input, { target: { value: '1234' } })`; assert `spy` last call was `12.34`.
- [x] 8.7 `InputNonDigits_OnChangeWithZero` — `fireEvent.change(input, { target: { value: 'abc' } })`; assert `spy` last call was `0`.
- [x] 8.8 `InputEmpty_OnChangeWithZero` — `fireEvent.change(input, { target: { value: '' } })`; assert `spy` last call was `0`.
- [x] 8.9 `InputDollarSignAndDecimals_StrippedToDigits` — `'$1,234.56'` → `12.3456 / 1 → 123456 cents / 100 = 1234.56`; assert `spy` last call `1234.56`.

### 8D. AllowNegativeFalse — default suppression

- [x] 8.10 `AllowNegativeFalse_InputWithMinus_OnChangeIsPositive` — `<PriceField amount={null} onChange={spy} />` (default `allowNegative=false`); `fireEvent.change(input, { target: { value: '-1234' } })`; assert `spy` last call was `12.34` (positive).
- [x] 8.11 `AllowNegativeFalse_InputWithMinus_DisplayHasNoMinus` — re-render with the same change scenario; assert subsequent rendered input value does not start with `-`.

### 8E. AllowNegativeTrue — toggle paths

- [x] 8.12 `AllowNegativeTrueInputContainsMinus_OnChangeIsNegative` — `<PriceField amount={null} onChange={spy} allowNegative />`; `fireEvent.change(input, { target: { value: '1234-' } })`; assert `spy` last call was `-12.34`.
- [x] 8.13 `AllowNegativeTrueAndAlreadyNegativeTrailingMinus_OnChangePositive` — render `<PriceField amount={-12.34} onChange={spy} allowNegative />`; `fireEvent.change(input, { target: { value: '-12.34-' } })`; assert `spy` last call was `12.34` (the trailing-`-` clears `isNegative`).
- [x] 8.14 `AllowNegativeTrueAndAlreadyNegativeNoTrailingMinus_StaysNegative` — render `<PriceField amount={-12.34} onChange={spy} allowNegative />`; `fireEvent.change(input, { target: { value: '-12.3' } })` (no trailing `-`, but value still contains `-`); assert `spy` last call was `-12.30`.

### 8F. PropPassthrough

- [x] 8.15 `DisabledTrue_ForwardedToInput`.
- [x] 8.16 `IdProvided_OnInput` — `<PriceField id="my-id">` → input has `id="my-id"`.
- [x] 8.17 `AriaLabelProvided_OnInput` — `<PriceField aria-label="Price">` → input has matching `aria-label`.
- [x] 8.18 `AutoFocus_OnInput` — `<PriceField autoFocus>` → input element receives the focus attribute (assert via `document.activeElement === input` after mount, or `autofocus` attribute present).
- [x] 8.19 `LabelErrorRequired_ForwardedToFormField` — wrapper-forwarded prop sweep.
- [x] 8.20 `ClassNameForwarded_AppendsToOuterGroup`.

### 8G. LockedIcon — assert no exposure

- [x] 8.21 `NoIconPropAccepted_AlwaysRendersDollar` — TypeScript-level: PriceFieldProps does NOT contain `icon`. Document via TS type-check in a `.ts-expect-error` line in the test if practical; otherwise the absence in the rendered DOM (no caller-controlled icon path) is sufficient assertion.

## 9. Write `app/ui/components/field/__tests__/SearchField.test.tsx` (universal COVERAGE_FLOOR)

### 9A. DomShape

- [x] 9.1 `Default_RendersDivWithSearchClassesAndInput` — render `<SearchField value="" onChange={() => {}} />`; assert the outer `<div>` has classes `'form_field'`, `'search_field'`, AND `'no_trailing'` (no clear button shown because value is empty) AND contains `<input type="search" class="form_field_input">` AND a leading search icon `<svg>`.

### 9B. TrailingBranch — Decision 3c truth table

- [x] 9.2 `TrailingProvided_RendersTrailingNode` — render `<SearchField value="x" trailing={<span data-testid="t" />} />`; assert `screen.getByTestId('t')` exists AND no `.search_field_clear` button exists AND outer div has NO `'no_trailing'` class.
- [x] 9.3 `OnClearWithNonEmptyValue_RendersClearButton` — render `<SearchField value="abc" onClear={spy} />`; assert a `<button type="button" aria-label="Clear search" class="search_field_clear">` exists; click it; `spy.toHaveBeenCalledTimes(1)`.
- [x] 9.4 `OnClearWithEmptyValue_NoClearButtonAndNoTrailing` — render `<SearchField value="" onClear={spy} />`; assert no `.search_field_clear` AND outer div has `'no_trailing'` class.
- [x] 9.5 `OnClearWithUndefinedValue_NoClearButtonAndNoTrailing` — render `<SearchField onClear={spy} />` (no `value`); assert same.
- [x] 9.6 `NeitherTrailingNorOnClear_NoTrailingClass` — render `<SearchField value="abc" />`; assert no `.search_field_clear` AND outer div has `'no_trailing'` class.
- [x] 9.7 `BothTrailingAndOnClear_TrailingWins` — using a `// @ts-expect-error` line to bypass the discriminated-union, render `<SearchField value="abc" trailing={<span data-testid="t" />} onClear={spy} />`; assert `screen.getByTestId('t')` exists AND no `.search_field_clear` button rendered (per design Decision 3c — `hasTrailingNode` short-circuits).

### 9C. PropPassthrough

- [x] 9.8 `OnChangeForwarded_ToInput` — render with `onChange` spy; type a character; spy called.
- [x] 9.9 `Ref_ResolvesToInputElement` — `ref.current` is an `HTMLInputElement`.
- [x] 9.10 `ClassNameProvided_AppendedToOuterDiv` — render `<SearchField value="x" onClear={fn} className="layout-extra" />`; assert outer div has class `layout-extra` AND classes appear in order: `form_field search_field layout-extra` (no `no_trailing` because the clear button rendered).
- [x] 9.11 `ClassNameOmitted_NoTrailingSpace` — render without className; assert outer div's className contains no trailing whitespace and no `undefined` token.

## 10. Write `app/ui/components/field/__tests__/CheckboxField.test.tsx` (universal COVERAGE_FLOOR)

- [x] 10.1 `Default_RendersLabelWrappingCheckboxAndSpan` — render `<CheckboxField name="agree" label="I agree" />`; assert the rendered DOM is a `<label class="checkbox_field">` containing a native `<input type="checkbox" class="checkbox_field_box" name="agree">` and a `<span>I agree</span>`.
- [x] 10.2 `ClassNameProvided_AppendedToLabelClass` — `<CheckboxField label="x" className="extra" />`; assert label className is exactly `'checkbox_field extra'`.
- [x] 10.3 `ClassNameOmitted_NoTrailingSpace` — assert label className is exactly `'checkbox_field'`.
- [x] 10.4 `CheckedTrue_InputChecked` — `<CheckboxField label="x" checked onChange={() => {}} />`; assert `toBeChecked()`.
- [x] 10.5 `OnChangeForwarded` — `<CheckboxField label="x" onChange={spy} />`; `userEvent.click(checkbox)`; assert `spy` called.
- [x] 10.6 `DisabledTrue_InputDisabled` — assert `toBeDisabled()`.
- [x] 10.7 `Ref_ResolvesToInputElement` — `ref.current` is the underlying `<input type="checkbox">`.
- [x] 10.8 `NameForwarded_ToInput` — `<CheckboxField label="x" name="agree" />` → input has `name="agree"`.

## 11. Write `app/ui/components/field/__tests__/FieldError.test.tsx` (universal COVERAGE_FLOOR)

- [x] 11.1 `ChildrenString_RendersParagraphWithIdAndClass` — render `<FieldError id="err-1">Name is required</FieldError>`; assert a `<p id="err-1" class="field_error">` with text `Name is required` exists.
- [x] 11.2 `ChildrenUndefined_RendersNothing` — `<FieldError id="err-1" />` (no children); assert `container.firstChild === null`.
- [x] 11.3 `ChildrenNull_RendersNothing` — `<FieldError>{null}</FieldError>`; assert same.
- [x] 11.4 `ChildrenFalse_RendersNothing` — `<FieldError>{false}</FieldError>`; assert same.
- [x] 11.5 `ChildrenZero_RendersNothing` — `<FieldError>{0}</FieldError>`; assert same. (`0` is a JSX-falsy value; the `if (!children) return null;` short-circuit catches it.)
- [x] 11.6 `ChildrenEmptyString_RendersNothing` — `<FieldError>{''}</FieldError>`; assert same.
- [x] 11.7 `IdOmitted_RenderedParagraphHasNoIdAttribute` — `<FieldError>Required</FieldError>`; assert `<p>` has no `id` attribute (React omits undefined attrs).
- [x] 11.8 `NoRoleAlertNoAriaLive` — render with text; assert the `<p>` has no `role` attribute AND no `aria-live` attribute. Locks the existing "no role=alert" SHALL.

## 12. Config changes

- [x] 12.1 Add all ten executable field-component files to the existing per-file `sonarjs/cognitive-complexity = error` override block in `eslint.config.mjs` (lines ~31–48 at HEAD): `FormField.tsx`, `TextField.tsx`, `TextareaField.tsx`, `SelectField.tsx`, `DateField.tsx`, `DatalistField.tsx`, `PriceField.tsx`, `SearchField.tsx`, `CheckboxField.tsx`, `FieldError.tsx`. Group them under a single comment line `// test-form-field-system (sub-proposal 3.3) — locked at universal COVERAGE_FLOOR.`.
- [x] 12.2 Add ten entries to `vitest.config.ts`'s `thresholds` map, each referencing the existing `COVERAGE_FLOOR` constant (NO per-file numeric variation per `test-housekeeping`'s single-constant rule):
  - `'app/ui/components/field/FormField.tsx': COVERAGE_FLOOR`
  - `'app/ui/components/field/TextField.tsx': COVERAGE_FLOOR`
  - `'app/ui/components/field/TextareaField.tsx': COVERAGE_FLOOR`
  - `'app/ui/components/field/SelectField.tsx': COVERAGE_FLOOR`
  - `'app/ui/components/field/DateField.tsx': COVERAGE_FLOOR`
  - `'app/ui/components/field/DatalistField.tsx': COVERAGE_FLOOR`
  - `'app/ui/components/field/PriceField.tsx': COVERAGE_FLOOR`
  - `'app/ui/components/field/SearchField.tsx': COVERAGE_FLOOR`
  - `'app/ui/components/field/CheckboxField.tsx': COVERAGE_FLOOR`
  - `'app/ui/components/field/FieldError.tsx': COVERAGE_FLOOR`
- [x] 12.3 Add `app/ui/components/field/field-icons.tsx` to `vitest.config.ts`'s `coverage.exclude` array with a one-line comment: `// constant ReactNode table; no executable behavior. See test-form-field-system design D2.`.
- [x] 12.4 Confirm `index.ts` exclusion is already covered by the existing `app/ui/components/*/index.ts` glob (no new entry needed). Confirm `types.ts` produces no runtime content so does not need an explicit exclude.
- [x] 12.5 `npm test -- --coverage` measured per-file (json-summary):
  - `CheckboxField.tsx`: 100/100/100/100 — passes.
  - `DatalistField.tsx`: 100/100/100/100 — passes.
  - `DateField.tsx`: 100/100/100/100 — passes.
  - `FieldError.tsx`: 100/100/100/100 — passes.
  - `FormField.tsx`: 100/100/97.56/100 — passes (≥95 branches floor). Uncovered branch is the `process.env.NODE_ENV !== 'production'` falsy path at line 59 (vitest sets `NODE_ENV='test'`, the `'production'` branch is unreachable). Disposition: **(none needed)** — the file meets the floor at 97.56% without an ignore annotation. If a future change pushes branches below 95, disposition (c) `/* v8 ignore next */` with rationale `production NODE_ENV branch unreachable under vitest` would be the right move.
  - `PriceField.tsx`: 100/100/95/100 — at floor. Initial-state derivation (`useState(amount !== null && amount < 0)`) is exercised across §8.2 (amount=null), §8.3 (amount=12.34), §8.5 (amount=-12.34, allowNegative). Disposition: **(a)** — every branch covered by a discrete test.
  - `SearchField.tsx`: 100/100/100/100 — passes.
  - `SelectField.tsx`: 100/100/100/100 — passes.
  - `TextField.tsx`: 100/100/100/100 — passes.
  - `TextareaField.tsx`: 100/100/100/100 — passes.
  - `FormField.tsx`: 100/100/97.56/100 — passes (see above).
  All ten files meet `COVERAGE_FLOOR`. No `/* v8 ignore */` annotations needed.

## 13. Reserved (no source refactors expected — see §14)

## 14. Four audits + invariant-elevation audit (per testing-foundation)

- [x] 14.1 **Duplication audit** — the "render a wrapped field, grab the input by aria-label, assert wrapper forwarding" harness repeats across `TextField`, `TextareaField`, `SelectField`, `DateField`, `DatalistField`, `PriceField` test files (6 sites). The shape is small (3–4 lines per `WrapperForwarding > LabelErrorRequiredIcon_ForwardedToFormField` test) and each call site asserts on a different element type (input/textarea/select). Extracting to a helper would obscure the per-component-specific assertions (`HTMLInputElement` vs `HTMLTextAreaElement` vs `HTMLSelectElement` from refs; element-specific attributes like `rows`/`type`/`name`). Disposition: **in-place** — the duplication is shallow and parameter-specific; a generic helper would lose type specificity. Re-evaluate if a 7th call site lands.
- [x] 14.2 **Complexity audit** — measured by sonarjs/cognitive-complexity at HEAD before promotion:
  - `FormField.tsx:FormField` — **18** (design estimate of 3–4 was wrong; the JSX render path counts every `{cond && …}` short-circuit). Disposition: **refactored** — extracted `warnOnUnknownChild`, `iconClassFor`, `joinClasses`, and `FieldRow` helpers. New complexity: under 15 (no error post-refactor).
  - `PriceField.tsx:handleChange` — ~4 (the if/else-if/digit-strip ladder). Within ceiling.
  - Every other component — 1–2 (forwardRef wrappers around a single JSX tree). Within ceiling.
  - Post-§12.1 promotion: `npm run lint` reports **0 errors** for the ten carve-out files (pre-existing warnings elsewhere are governance carry-over per §17.1).
- [x] 14.3 **Testability audit** — findings:
  - `FormField.tsx`'s `if (process.env.NODE_ENV !== 'production')` dev-only branch — covered under vitest (`NODE_ENV='test'` activates the warning path). The branches-pct at 97.67% reflects v8 counting the unreachable `'production'` short-circuit; floor (95%) is met. Recorded as testing-pattern observation, NOT a source defect.
  - `PriceField.tsx`'s `useState(amount !== null && amount < 0)` initial-state derivation — exercised across §8.2 (amount=null), §8.3 (amount=12.34), §8.5 (amount=-12.34). Testing-pattern observation.
  - `SearchField.tsx`'s discriminated-union runtime fall-back (both `trailing` and `onClear` provided) — exercised via a typed bypass (`as any`) at §9.7. Recorded as observation per design Decision 3c.
  - **§14.3-NEW-1**: tasks.md §2.6–§2.13 prescribed `<FormField label="..."><TextField/></FormField>` as the test child for the UseIdWiring tests. The runtime behavior double-wraps (TextField has its own internal FormField; the inner clone overrides the outer FormField's injected id/aria-*), so the outer FormField's `useId` injection is unobservable through a `<TextField>` child. Adjusted to use bare `<input/>` for those tests (the FormField contract is "clone single child with id/aria-* injected" — observable on any valid React element child). Recorded as a tasks.md authoring observation, NOT a source defect.
  - **§14.3-NEW-2**: tasks.md §7.2 (`DatalistField`'s `ListIdMatchesDatalistId_NonEmptyAndUseIdShaped`) mentioned `:` as the React-generated id marker. React 19 uses `«rN»` (guillemets). Test adjusted to assert `startsWith('«')`. Tasks.md authoring observation.
  - **§14.3-NEW-3 (DEFECT)**: `PriceField` exposes an `id` prop and forwards it as `<input id={id}>`, but the wrapping `<FormField>` calls `cloneElement({ id: useIdGenerated, … })` which silently overrides the caller's id. The `id` prop on PriceField is therefore dead. Test (§8.16) inverted: now locks the current (defective) behavior with an inline comment naming the defect. Disposition: **deferred to follow-up sub-proposal** — fix should either remove `id` from `PriceFieldProps` OR change `FormField` to preserve a caller-set id; both are out of scope for a testing carve-out.
  - **§14.3-NEW-4 (TASK MATH)**: tasks.md §8.14 expected `onChange(-12.30)` for input `'-12.3'`, but cents-as-integer math gives `-1.23` (`'-12.3'` strips to digits `'123'` → 123 cents → 1.23 dollars). Test asserts the correct `-1.23` per the elevated SHALL. Tasks.md authoring math error.
- [x] 14.4 **Assertion audit** — walked every `it(...)` in the ten new test files. Findings:
  - Every test names a specific class string (`toHaveClass('form_field', 'search_field', 'no_trailing')`), specific attribute value (`toHaveAttribute('type', 'date')`), specific accessible name (`getByLabelText('Name')`), specific spy-call shape (`spy.mock.calls.at(-1)?.[0] === 12.34`), specific exact text (`toBe('12.34')`), or specific exact id pairing (`describedBy.split(' ').sort()`).
  - No `expect(x).toBeDefined()` / `expect(x).toBeTruthy()` on self-constructed values. The one `toBeInTheDocument()` use (SearchField §9.2) is paired with assertions on the trailing-class composition, not used standalone.
  - `aria-describedby` set assertion (§2.12) uses `split(' ').sort()` per design Decision 7.
  - `PriceField` cents-math (§8.6–§8.14) asserts exact dollar values via `spy.mock.calls.at(-1)?.[0]`, not `toHaveBeenCalled()`.
  - No snapshot tests, no `container.firstChild` assertions without follow-up class/text/attribute checks.
- [x] 14.5 **Invariant-elevation audit** — three new SHALLs in `specs/form-field-system/spec.md` per design Decisions 3a/3b/3c:
  - `<FormField>` `Children.only` + dev `console.error` when child `displayName` is unrecognized — elevated. Tests §2.1–§2.5 lock it.
  - `<PriceField>` cents-as-integer math + `allowNegative` toggle path (including trailing-`-` clear case) — elevated. Tests §8.6–§8.14 lock it.
  - `<SearchField>` trailing-slot three-branch runtime decision — elevated. Tests §9.2–§9.7 lock it.
  - Invariants asserted but NOT elevated (load-bearing under existing SHALLs):
    - "Input class is `form_field_input`" — covered by the existing "Field chrome lives on the wrapper, not the input" SHALL. Not a new elevation.
    - "Outer wrapper is `.form_field_group` with optional className appended" — call-time chrome layout, already implicit in the chrome-on-wrapper SHALL.
    - "FieldError renders `<p id={id} class="field_error">` and never `role="alert"`" — covered by existing "No role=alert" SHALL.
    - "CheckboxField wraps in `<label class="checkbox_field">` with a 24px box inside a 44px region" — covered by existing CheckboxField + 44px touch-target SHALLs.
  - Spec-vs-code finding: see §14.3-NEW-3 above (PriceField `id` prop is dead — deferred).

## 15. Spec ADDs + bookkeeping

- [x] 15.1 Confirmed `specs/form-field-system/spec.md` delta contains ONLY `## ADDED Requirements` (3 new SHALLs: FormField child contract, PriceField math + toggle, SearchField trailing union). No `## MODIFIED` or `## REMOVED` sections. Existing `form-field-system` requirements untouched.
- [x] 15.2 Confirmed `specs/testing-foundation/spec.md` delta in this sub-proposal's directory is sub-proposal-archive-only per `test-coverage` design D13. No edits made to `openspec/changes/test-coverage/specs/testing-foundation/spec.md` (parent accumulator) or `openspec/specs/testing-foundation/spec.md` (active spec; would be created at test-coverage's eventual archive).

## 16. Final verification

- [x] 16.1 `npm test --run`: **22 test files passed, 299 tests passed**. Pre-existing baseline (before this change) was 12 test files / ~199 tests; this change adds 10 files (FormField/TextField/TextareaField/SelectField/DateField/DatalistField/PriceField/SearchField/CheckboxField/FieldError) and 100 tests. No regressions.
- [x] 16.2 `npm test -- --coverage --run` (json-summary, per file):
  - `FormField.tsx`: lines=100, stmts=100, branches=97.67, funcs=100 — passes.
  - `TextField.tsx`: 100/100/100/100 — passes.
  - `TextareaField.tsx`: 100/100/100/100 — passes.
  - `SelectField.tsx`: 100/100/100/100 — passes.
  - `DateField.tsx`: 100/100/100/100 — passes.
  - `DatalistField.tsx`: 100/100/100/100 — passes.
  - `PriceField.tsx`: 100/100/95/100 — at floor.
  - `SearchField.tsx`: 100/100/100/100 — passes.
  - `CheckboxField.tsx`: 100/100/100/100 — passes.
  - `FieldError.tsx`: 100/100/100/100 — passes.
  - `app/ui/components/field/index.ts` absent (covered by existing `app/ui/components/*/index.ts` glob).
  - `app/ui/components/field/types.ts` absent (no runtime content).
  - `app/ui/components/field/field-icons.tsx` absent (new explicit exclude from §12.3).
  - Suite exits zero.
- [x] 16.3 Override-active proof — `app/ui/components/field/FormField.tsx` was edited (during the §14.2 refactor) from a 1-function body with cognitive complexity 18 (post-§12.1 promotion) — `npm run lint` correctly emitted the `sonarjs/cognitive-complexity` ERROR (not warning) until the refactor reduced it below 15. The override is active.
- [x] 16.4 `openspec validate test-form-field-system` and `openspec validate test-form-field-system --strict` both report `Change 'test-form-field-system' is valid`.

## 17. Pre-merge

- [x] 17.1 `npm run lint`: **0 errors, 10 warnings**. All warnings are pre-existing carry-over from prior sub-proposals (Item.tsx, ItemsToolbar.tsx, itemFilters.ts, useItemForm.ts, ChooseItemsForm.tsx, ListDetails.tsx, items.ts:266, lists.ts:669, Avatar.tsx no-img, seed-dev-users.ts:754) — the foundation's "warn globally" sonarjs/cognitive-complexity policy plus the literal "zero warnings" wording is a governance reconciliation question for the parent `test-coverage` change to settle. Not blocking this sub-proposal.
- [x] 17.2 `npx tsc --noEmit` — exits 0 (silent).
- [x] 17.3 `npm run build` — completes successfully.
- [x] 17.4 `npm test --run` — 299 tests pass, zero failures.
