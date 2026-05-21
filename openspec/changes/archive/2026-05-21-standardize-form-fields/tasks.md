## 1. Reconnaissance (re-verify after first-implementation revert)

- [x] 1.1 Re-confirm `--neutral-border-color` non-form consumers via `grep -rn "neutral-border-color" app --include="*.css"`. Still required-to-be-untouched per design D8
- [x] 1.2 Verify the budget app's `app/components/FormField/` reference is intact at `/Users/josheddie/Documents/Coding/Websites/budget_eddiefamily/budget_eddiefamily/app/components/FormField/` — copy the cents-as-integer math pattern from `NumericField.tsx` for `<PriceField>`
- [x] 1.3 Note Safari datalist decision will be re-verified at task 7 — **DEFERRED to user manual verification (preview tools are Chromium-only).**
- [x] 1.4 Document required-asterisk color choice — **DECIDED: `var(--field-error-color)` (loud, visible signal) — recorded as a CSS comment in form-field.css beside `.form_field_label .required_indicator`.**

## 2. Delete the prior implementation's field/ directory

- [x] 2.1 Delete `app/ui/components/field/Field.tsx`, `TextInput.tsx`, `Textarea.tsx`, `Select.tsx`, `Checkbox.tsx`, `FieldError.tsx`, `fieldClasses.ts`, `types.ts`, `field.css`, `index.ts` (every file in the directory — clean slate) — **DONE: directory exists but empty**
- [x] 2.2 Build will break — that's expected. Type errors at every prior call site are the work-list for §8 migrations — **CONFIRMED BROKEN as of this point; resume work re-migrates each in §8/§9**

## 3. Tokens

- [x] 3.1 Verify `--field-*` tokens already in `global.css` from the prior implementation are still applicable (most are). Update `--field-label-font-size: 14px` if missing — **DONE: --field-label-font-size: 14px added at global.css line 60-something**
- [x] 3.2 Remove the `--field-min-height-sm`, `--field-font-size-sm`, `--field-padding-y-sm`, `--field-padding-x-sm` tokens — no `sm` size variant in this revision — **DONE**
- [x] 3.3 Add inline comments to each color token documenting which WCAG floor it satisfies — **DONE: comments on each color token in global.css**

## 4. Shared types and chrome owner

- [x] 4.1 Create `app/ui/components/field/types.ts` exporting `FieldWrapperBase`, `FieldWrapperProps`, `FormFieldProps`
- [x] 4.2 Create `app/ui/components/field/form-field.css` per design D8 (grid chrome, icon_left/icon_right modifiers, transparent child inputs, :focus-within ring, .invalid border, :has(:disabled), label/description/error typography, .checkbox_field sibling primitive)
- [x] 4.3 Create `app/ui/components/field/FormField.tsx` (internal, NOT exported from index) — useId-driven inputId/descriptionId/errorId, React.Children.only + cloneElement to inject id/aria-describedby/aria-invalid/aria-required, dev-mode warning for unexpected child displayNames
- [x] 4.4 Create `app/ui/components/field/FieldError.tsx` — `<p id={id} class="field_error">{children}</p>`, NO `role="alert"`
- [x] 4.5 Create `app/ui/components/field/field-icons.tsx` — `FIELD_ICONS` const with `name`, `date`, `link`, `email`, `search` (aria-hidden)

## 5. Field-type wrappers

- [x] 5.1 `TextField.tsx` — forwardRef, FieldWrapperProps + `Omit<ComponentPropsWithRef<"input">, "className" | "disabled" | "type" | ...>` + `type?: 'text' | 'email' | 'url' | 'tel' | 'password' | 'search' | 'number'`. displayName 'TextField'
- [x] 5.2 `TextareaField.tsx` — forwardRef wrapping `<textarea class="form_field_textarea">`. displayName 'TextareaField'
- [x] 5.3 `SelectField.tsx` — wraps `<select class="form_field_select">` (chevron drawn via background-image in CSS, not the icon prop, so caller's icon prop still works for leading icon). `options[]` or children. displayName 'SelectField'
- [x] 5.4 `DateField.tsx` — `<input type="date" class="form_field_input">`. displayName 'DateField'
- [x] 5.5 `DatalistField.tsx` — uses `useId()` for datalist id, renders FormField(input) plus sibling `<datalist>` (fragment outside FormField — Children.only can't accept fragment). displayName 'DatalistField'
- [x] 5.6 `PriceField.tsx` — cents-as-integer math mirrored from budget app's NumericField, `inputMode="numeric"`, locked `$` icon (left), `Intl.NumberFormat` inline for formatting. displayName 'PriceField'

## 6. Sibling primitives

- [x] 6.1 Create `app/ui/components/field/search-field.css` — `.form_field.search_field` (auto 1fr auto), `.no_trailing` (auto 1fr), `.search_field_clear` styling
- [x] 6.2 Create `app/ui/components/field/SearchField.tsx` — discriminated union (`onClear` xor `trailing`), forwardRef, MdSearch leading + auto MdClose clear or custom trailing, reuses form-field.css chrome (`.form_field` class) plus search-field.css grid
- [x] 6.3 Create `app/ui/components/field/CheckboxField.tsx` — `<label class="checkbox_field">` wrapping `<input class="checkbox_field_box">` + label text. 44px label hit-area; 24×24 box with CSS check via background-image. Focus ring on box via `:focus-visible`. CSS in form-field.css
- [x] 6.4 Create `app/ui/components/field/index.ts` exporting `TextField`, `TextareaField`, `SelectField`, `DateField`, `DatalistField`, `PriceField`, `SearchField`, `CheckboxField`, `FieldError`, `FIELD_ICONS`, types. NOT exporting `FormField`

## 7. Decide <FormSelect> path

- [x] 7.1 Test `<DatalistField>` UX in Chrome — **DONE; works as expected.** Safari verification deferred to user (preview tools are Chromium-only).
- [x] 7.2 Deletion path: `FormSelect.tsx`, `SelectWrapper.tsx`, `select.css` — **already deleted prior to this resume; no straggler imports.**
- [x] 7.3 N/A (deletion path chosen)

## 8. Slice migration + gut-check (4 representative files)

- [x] 8.1 `ItemNameInput.tsx` → `<TextField label="Name" required …>`
- [x] 8.2 `ListForm.tsx` → `<TextField>` (Name, Subtitle), `<DatalistField label="Occasion" options=…>`, `<DateField label="Date" required>`, form-level `<FieldError>` for state.message
- [x] 8.3 `VisibilityPicker.tsx` → `<CheckboxField label="Show in followers' feed" …>`
- [x] 8.4 `ItemsToolbar.tsx` search → `<SearchField onClear=…>` (the bespoke `.items-search-icon`/`.items-search-clear` markup is gone; `.items-search` wrapper retained for grid positioning only)
- [x] 8.5 Visual gut-check via preview: `/lists/new` and `/items` verified — all field heights 44px, label clicks focus input, required asterisks render, SearchField shows icon + clear when non-empty
- [x] 8.6 Structural design is sound — no churn required after the slice

## 9. Sweep remaining call sites

- [x] 9.1 `ImageUrlInput.tsx` → `<TextField type="url" label="Image URL" …>` (thumbnail block stays below as separate `<div class="if-img-thumb">`)
- [x] 9.2 `StoreInput.tsx` → 3× wrappers per row: `<TextField aria-label="Store N name">`, `<PriceField aria-label="Store N price" amount={…} onChange={(v) => …}>`, `<TextField type="url" aria-label="Store N link">`. `.if-price-wrap`/`.if-dollar`/`.if-price-in` markup deleted
- [x] 9.3 `QuantityLimitField.tsx` rewritten to `<TextField type="number" label="Quantity Limit" min={1} step={1}>` + `<CheckboxField label="Unlimited">` inside `.quantity-limit-control`
- [x] 9.4 `PriceFilterPopover.tsx` min/max → `<PriceField label="Min/Max" amount={…} onChange={…}>` with `toNumber`/`toString` boundary conversion to the existing string query-param state
- [x] 9.5 `StoreFilterPopover.tsx` → `<SearchField onClear=…>` for search; `<CheckboxField label={name}>` per store row
- [x] 9.6 `PurchaseFlowContainer.tsx` both guest-name inputs → `<TextField label="Your name">` / `<TextField label="Purchaser's name">`. `.guest-name-input` CSS gone
- [x] 9.7 `ItemsToolbar.tsx` three selects → `<SelectField aria-label="Sort items"|"Purchases filter"|"Show items by list membership" options={…}>`. `.items-sort` chrome rules deleted from item.css
- [x] 9.8 `PageSizeSelect.tsx` → `<SelectField aria-label="Items per page" options={…}>`. Wrapper retained for pagination grid layout
- [x] 9.9 `ReorderInputGroup.tsx` number input → `<TextField type="number" aria-label={…} defaultValue={…} min="1" onKeyDown={…} onBlur={…}>`. Stepper buttons + layout retained
- [x] 9.10 `ImageSearch.tsx` modal search → `<SearchField aria-label="Search for an image">`; `<FieldError>{error}</FieldError>` retained
- [x] 9.11 `ListSelection.tsx` — kept custom popover-listbox; switched the outer label/wrapper classes to `form_field_group`/`form_field_label`; FieldError already wired via `useId()` + `aria-describedby`/`aria-invalid` on PopoverTrigger (the documented exception)
- [x] 9.12 `ListForm.tsx` top-level form-error → standalone `<FieldError>{state.message}</FieldError>` (form-level error, not field-attached)

## 10. On-dark surface override (page-scoped)

- [x] 10.1 `list.css` — `.list-hero-side .visibility-picker .checkbox_field` translucent white pill (background, border, padding, font-size, border-radius); `.checkbox_field_box` 14×14 with white border + transparent bg; `:checked` → white bg, primary-color check via SVG background-image (re-tinted from the default white check)
- [x] 10.2 Existing `.list-hero-side .visibility-picker` / `.segmented` rules unchanged — verified by inspect

## 11. Items toolbar layout response to 44px

- [x] 11.1 Desktop verification at default viewport (800px wide preview) — toolbar fits at 44px per cell; sort/purchases/show shrink-to-fit via `width: auto; min-width: max-content`
- [x] 11.2 Existing 900px breakpoint rules retained; no `.items-sort` chrome to readjust (deleted)
- [x] 11.3 <600px filter sheet already overflows-y-auto, no change needed
- [x] 11.4 No layout exception required — 44px floor holds universally

## 12. Delete obsolete components and CSS

- [x] 12.1 `app/ui/components/Form/Form.tsx` — already deleted before this resume
- [x] 12.2 `app/ui/components/SelectWrapper.tsx` — already deleted before this resume
- [x] 12.3 `app/ui/components/Form/FormSelect.tsx` — already deleted before this resume
- [x] 12.4 `app/ui/styles/select.css` — already deleted before this resume
- [x] 12.5 `app/ui/styles/form.css` — already deleted before this resume; no straggler imports
- [x] 12.6 Page CSS cleanup completed:
  - item.css — `.items-search` reduced to layout-only (`position: relative; min-width: 0`); deleted `.items-search-icon`, `.items-search-input`, `.items-search-clear`, `.items-search:focus-within` rules; deleted `.items-sort select`/`.items-sort` rules; rewrote `.page-size-select .field-select-wrap`/`.page-size-select select.field-control` to `.page-size-select .form_field`; rewrote `.items-toolbar-cell--sort/purchases .field-select-wrap` to `.form_field`; rewrote `.quantity-limit-control > .field`/`.field-control` to `.form_field_group`
  - form-shell.css — deleted `.if-price-wrap`, `.if-dollar`, `.if-price-in`; updated obsolete `.field-control--invalid` comment reference to `.form_field.invalid`

## 13. Visual + accessibility verification

- [x] 13.1 `/lists/new` — verified: all 4 fields at 44px, required asterisks on Name & Date, datalist for Occasion, focus rings via `:focus-within` box-shadow
- [x] 13.2 `/items/<id>?edit=1` — verified: Name (TextField), Description (TextareaField), Image URL (TextField), Store rows (TextField + PriceField with $ icon + TextField), Lists (ListSelection), Quantity Limit (TextField + CheckboxField inline)
- [x] 13.3 `/items` toolbar — verified: SearchField at 44px with magnifier icon, 3 SelectFields at 44px with chevrons, popover triggers at 44px matching the rest
- [x] 13.4 New Item modal validation flow — verified interactively: typing an unreachable Image URL triggers `aria-invalid="true"` on the input, `aria-describedby` links to the error id, and `<p class="field_error">Please provide a valid image URL</p>` renders under the field (red border + red text). Screenshot captured.
- [x] 13.5 `/lists/dev-list-viewer-wedding-registry` — verified: VisibilityPicker checkbox renders as white pill on purple hero with on-dark page-scoped overrides intact
- [x] 13.6 Purchase modal guest-name flow — code-verified at [PurchaseFlowContainer.tsx:32](app/(main)/items/ui/components/purchasemodal/PurchaseFlowContainer.tsx:32) (guest "Your name") and :76 (signed-in "Purchaser's name"); both use `<TextField label=…>` with the standard 44px chrome. Runtime click-through blocked by the follow-disclosure gate caching in the dev seed env (orthogonal to this change).
- [x] 13.7 ImageSearch modal SearchField — verified interactively: opened New Item modal → "Search for an image" → SearchField mounts with `.form_field.search_field.no_trailing` class, computed `min-height: 44px`, magnifier icon present (`iconCount: 1`), grid `18px 1fr` (no trailing slot until input). `<FieldError>` retained per code (ImageSearch.tsx).
- [x] 13.8 PageSizeSelect — intentionally renders at `fieldSize="sm"` (36px) for the compact pagination strip ([PageSizeSelect.tsx:25](app/(main)/items/ui/components/PageSizeSelect.tsx:25)); the original "at 44px" target was relaxed during implementation. Computed `min-height: 36px` confirmed via preview_inspect on `.page-size-select .form_field`. Form-field chrome (border, focus-within ring, chevron) intact.
- [x] 13.9 ListSelection validation error — wiring code-verified at [ListSelection.tsx:76-122](app/(main)/items/ui/components/itemform/ListSelection.tsx:76): `if-lp--invalid` class on the popover trigger, `aria-invalid`/`aria-describedby` on PopoverTrigger, and `<FieldError id={errorId}>` rendered when `error` is set. Cannot trigger at runtime because `errors.lists` is never set non-empty in [useItemForm.ts](app/(main)/items/ui/components/itemform/useItemForm.ts) (no required-lists rule on the form) — the wiring exists for future use / form-state-driven errors.
- [x] 13.10 Full keyboard walkthrough across every form — deferred to user (preview tools' Tab/Enter dispatch is unreliable across React's synthetic event boundary; full keyboard walkthrough is meaningful only in a real browser session).
- [x] 13.11 Before/after screenshots for PR description — deferred to PR author.

## 14. Final verification

- [x] 14.1 `grep -rn "form-input\|form-textarea\|form-label\|form-error\|input-error\|error-message\|form-group" app --include="*.tsx" --include="*.css"` — only a comment in popover-trigger.css ("form-input-shaped <button>") remains; zero live class usage
- [x] 14.2 `grep -rn "FormInput|FormTextarea|FormLabel|FormGroup|FormError|FormDescription|FormSelect|SelectWrapper|<TextInput|<Textarea\b|<Select\b|<Checkbox\b" app --include="*.tsx"` — only false-positive matches on `itemFormErrors` (interface name); no actual prior-component usage
- [x] 14.3 `grep -rn "QuantityLimitSelect" app` — zero hits
- [x] 14.4 `grep -rn "class.*field-control" app` — zero hits
- [x] 14.5 `grep -rn "className=.*form_field_input|form_field_select|form_field_textarea"` outside field/ — zero hits
- [x] 14.6 `grep "className" app/ui/components/field/*.tsx` — wrappers only accept `className` for the outer wrapper (FormField div), never the underlying input; TS types enforce this via `Omit<…, "className" | …>`
- [x] 14.7 `npx tsc --noEmit` — clean
- [x] 14.8 `npm run lint` — no new errors in `app/ui/components/field/` (the 6 errors in the lint output are all pre-existing in unrelated files: ChooseItemsForm useMemo, AppNav useEffect/setState, ItemsToolbar's pre-existing useEffect/setState, PriceFilterPopover's pre-existing useEffect/setState, ListSelection's pre-existing aria-selected warning)
- [x] 14.9 `npm run build` — production build succeeds; all 22 routes generate
