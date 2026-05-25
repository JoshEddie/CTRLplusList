## Context

Today the form layer has four parallel partial systems and three error patterns, mirroring the button drift `standardize-buttons` just collapsed (see proposal.md for the full audit). The original implementation of this change shipped a `Field`-orchestrator + `TextInput`/`Textarea`/`Select`/`Checkbox` primitive set where the **child input owned its chrome via the `.field-control` class** and accepted `className` passthrough. The first page-scoped decorator (`.items-search` wrapping the search input) immediately had to write `.items-search .field-control { border: none; background: transparent; padding: 0; min-height: 0; box-shadow: none; outline: none }` to make its layout work — defeating the "one visual contract" pillar from the outside. Four visual chromes emerged within the first sweep (search input gray, sort/purchases selects white-with-dark-border, popover triggers gray pill, form text inputs white). The bug is structural, not cosmetic: any primitive whose chrome lives on the child is subvertable by any wrapper.

This revision adopts the chrome-owner pattern from the reference implementation at `/Users/josheddie/Documents/Coding/Websites/budget_eddiefamily/budget_eddiefamily/app/components/FormField/`. The pattern, distilled:

```
┌─────────────────────────────────────────────────────────────────┐
│  <FormField label icon iconPosition error required>             │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  <div class="form_field">                                 │  │
│  │    background, border, padding, focus-within, min-height  │  │
│  │    grid-template-columns: auto 1fr   (icon-left, default) │  │
│  │                          │ 1fr auto  (icon-right)         │  │
│  │                          │ 1fr       (no icon)            │  │
│  │                                                           │  │
│  │    ┌───────┐  ┌─────────────────────────────────────────┐ │  │
│  │    │ icon  │  │  <input class="form_field_input">       │ │  │
│  │    │       │  │    background: transparent              │ │  │
│  │    │       │  │    border: none                         │ │  │
│  │    │       │  │    height: 100%; width: 100%            │ │  │
│  │    │       │  │  → INHERITS chrome from parent          │ │  │
│  │    └───────┘  └─────────────────────────────────────────┘ │  │
│  │  </div>                                                   │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

The child has no chrome of its own. There is nowhere to drift to.

The list app's visual context is simpler than the budget app's: every input sits on a white surface. No multi-surface palette is needed (the only candidate dark surface, the list hero, hosts checkboxes via page-scoped color overrides on the standard `<CheckboxField>` — the second on-dark surface, if it ever arrives, triggers a sibling primitive, not a `data-surface` mechanism).

## Goals / Non-Goals

**Goals:**

- WCAG 2.5.8 / 1.4.11 / 1.4.3 / 2.4.11 / 3.3.1 / 1.3.1 / 4.1.2 conformance at AA for every form-field call site.
- One field system: every text input, textarea, select, and checkbox shares one chrome (border, background, padding, focus, min-height, font-size).
- **Deviation shouldn't be possible.** The chrome owner is a single `<FormField>` wrapper; children have no chrome of their own; `className` cannot be forwarded to underlying inputs.
- Decorations (icons, prefix/suffix glyphs, clear buttons) live **inside** the wrapper via grid slots, never via page-scoped decorator wrappers.
- Specialized layouts (search with trailing clear) are sibling primitives, not modifiers on a single primitive.
- `<FormField>` owns the `useId` orchestration for label/input/description/error association — no caller hand-wires `htmlFor` or `aria-describedby`.
- One canonical error pattern (`<FieldError>`); the tooltip-as-error implementation is deleted.
- Required state is a single mechanism; the literal `*` in label text and the `::after { content: 'Required' }` pseudo are both removed.
- Native `<select>` is wrapped for visual consistency; the open-state is delegated to UA.
- All call sites migrated within this change — no parallel-system drift allowed to persist.

**Non-Goals:**

- Multi-surface palette (`data-surface="main" | "overlay" | "dark"`). Every field in this app sits on white. If a future on-dark surface arrives, it gets a sibling primitive — not a switch on the existing primitive.
- An `sm` size opt-out. The 44px floor applies universally. If a layout breaks at 44px (items-toolbar filter sheet, popover internals), the answer is to fix the layout, not the floor. The previous proposal's `sm` size was an opening for drift.
- Building a custom-styled `<select>` open menu (combobox/listbox primitive). Native is right for this app's scale.
- `<DateField>` UX standardization beyond the field-token treatment — the `<input type="date">` picker chrome stays UA.
- `<RadioGroup>` / `<Radio>` primitives — no current call site.
- `<Switch>` / `<Slider>` / `<FileField>` primitives — defer to when real call sites surface.
- A `<NumberStepper>` primitive — `ReorderInputGroup`'s two-button stepper is the only candidate, used in one place; the inner input migrates to `<TextField type="number">`, the stepper layout stays page-scoped.
- Re-engineering react-select's internal accessibility. If the fallback path keeps `<FormSelect>`, we keep its current behavior.
- Bumping `--neutral-border-color` globally. The token has 6+ consumers outside forms (including a `background-color` use in `image-search.css`). We introduce `--field-border-color` as a sibling instead.
- Re-using the prior implementation's `app/ui/components/field/` directory. It is deleted in full and rewritten — the wrong primitive shape is the artifact being replaced.

## Decisions

### Decision 1: `<FormField>` is the chrome owner; primitives are transparent passthroughs

```
<FormField
  label="Name"
  required
  error={errors.name}
  icon={FIELD_ICONS.name}    // optional, defaults to no icon
  iconPosition="left"         // default; pass "right" to flip
>
  <input class="form_field_input" ... />   {/* transparent, fills grid cell */}
</FormField>
```

`<FormField>` renders `<div class="form_field">` with grid-based chrome — border, background, min-height, padding, focus-within ring all live on this div. The grid template switches via class:

- `.form_field` (default): `grid-template-columns: 1fr` — no icon
- `.form_field.icon_left`: `grid-template-columns: auto 1fr`
- `.form_field.icon_right`: `grid-template-columns: 1fr auto`

Child inputs (`<input class="form_field_input">`, `<textarea class="form_field_textarea">`, `<select class="form_field_select">`) declare `background: transparent; border: none; height: 100%; width: 100%; outline: none` and inherit every visual property from the parent.

The wrapping `<FormField>` is **internal** — callers use the field-type wrappers (`<TextField>`, `<TextareaField>`, etc.), which render the right child element class and forward chrome-owner props to `<FormField>`. The wrapper is not exported from the public index.

Alternative considered: keep the prior `Field`-orchestrator pattern with chrome on the child via `.field-control`. Rejected — that pattern enables exactly the bug this revision exists to fix. Any wrapper around such a primitive must strip the child's chrome from outside, which means the chrome's source-of-truth lives in CSS that any caller can override. The chrome-owner pattern moves the source-of-truth to a single CSS class on the wrapper, which no child can subvert.

Alternative considered: a fully polymorphic `<FormField as="input" | "select" | "textarea">`. Rejected — leaks attribute typing across HTML element types and produces worse type errors than thin per-element wrappers.

### Decision 2: Decorations live inside the wrapper via grid slots; `icon` + `iconPosition` are first-class props

The wrapper's grid template absorbs the icon. The icon prop accepts any `ReactNode`:

```
<TextField icon={FIELD_ICONS.search} type="search" ... />
                  → renders: [search-icon][input] in a 2-col grid
<TextField icon={FIELD_ICONS.link} iconPosition="right" type="url" ... />
                  → renders: [input][link-icon] in a 2-col grid
```

When `icon` is undefined, the grid collapses to `1fr` (the input fills the row).

For layouts richer than icon-+-input (icon-+-input-+-trailing-clear), see Decision 6 — those are sibling primitives, not `<FormField>` modifiers.

The `iconPosition` default is `'left'` because that's the conventional placement for label/affordance icons (search glass, edit pencil, calendar). The `'right'` position serves trailing affordances like the `%` suffix in `<NumericField type="percent">`.

Alternative considered: separate `leadingIcon` + `trailingIcon` props. Rejected — only one icon makes sense per `<FormField>` instance (text + 1 icon in a 2-col grid). The 3-col case is `<SearchField>`'s territory. A single `icon` + `iconPosition` is simpler and forces callers to think about which side carries semantic meaning.

Alternative considered: a `before` / `after` slot pair. Rejected — semantically equivalent to `icon` + `iconPosition` but encourages multi-slot stuffing that pushes toward a 3-col grid by accident.

### Decision 3: No `className` passthrough to underlying inputs

Field-type wrappers omit `className` from the spread input props:

```typescript
type TextFieldProps = FieldWrapperProps &
  Omit<ComponentPropsWithRef<'input'>, 'className' | 'disabled' | 'type'>;
```

TypeScript prevents the call site from ever passing `className` to the underlying `<input>`. The only `className` accepted is on the wrapping `<FormField>` div — and it's strictly for layout positioning by the parent (`flex: 1` inside a parent flex row, `grid-column: span 2` inside a parent grid). Documentation on the prop says so explicitly.

This is the structural enforcement of "deviation shouldn't be possible." Without it, the chrome-owner pattern is decorative — any caller can re-introduce per-input style by spreading className. With it, the chrome lives in exactly one place: `form-field.css`.

Alternative considered: accept `className` on inputs but explicitly document "do not use for chrome." Rejected — documentation isn't enforcement, and the first contributor with a layout pressure will use the escape hatch.

Alternative considered: accept `className` on inputs but post-process to strip chrome-related properties. Rejected — runtime gymnastics, impossible to know what's "chrome-related" without a heuristic that will be wrong eventually.

### Decision 4: `<PriceField>` uses cents-as-integer math with formatted-string display (copied from budget app's `NumericField`)

`<PriceField>` is the single price-input primitive. Mechanism, copied directly from `budget_eddiefamily/app/components/FormField/NumericField.tsx`:

```typescript
const handleChange = (value: string) => {
  // Strip non-digits; treat remaining digits as integer cents
  const digits = value.replace(/\D/g, '');
  const cents = Number(digits || '0');
  // Convert to dollars via /100 (decimal placement is automatic)
  const next = cents / 100;
  setAmount(next);
};

const formatted = amount === null ? '' : formatNumber(amount);
```

The input uses `inputMode="numeric"` (not `"decimal"`) — the budget app comment notes that `inputMode="decimal"` is buggy across mobile browsers. The user types digits; the input formats the displayed string with the decimal in the correct position. No fractional state, no decimal-point cursor management bugs.

The `$` icon is locked to the left position (US currency convention). Callers cannot override the icon. The pattern admits a `type="percent"` variant later (`%` icon, right position) when a percent field call site appears — none today.

`<PriceField>` props:

```typescript
interface PriceFieldProps {
  amount: number | null; // dollars (e.g. 12.34)
  onChange: (value: number) => void;
  label?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  allowNegative?: boolean; // default false; budget app supports leading "-"
  id?: string;
  'aria-label'?: string;
}
```

Note: `<PriceField>` does NOT accept `value` (string) or `onChange(e: ChangeEvent)`. It owns the formatting layer. Callers pass dollars-as-number, receive dollars-as-number on change.

This replaces `StoreInput`'s `.if-price-wrap` + `.if-dollar` + `.if-price-in` hand-rolled prefix layout AND `PriceFilterPopover`'s min/max inputs (which today pass raw strings around via `setLocalMin` / `setLocalMax`). The popover wires `<PriceField amount={…} onChange={…}>` to the same query-param state but converted via `parseFloat` at the boundary.

Alternative considered: a general-purpose `<NumericField type="money" | "percent">`. Rejected — none of the current call sites need percent, and the two-type union is harder to read than a single-purpose `<PriceField>`. Add `<PercentField>` as a sibling when a real call site appears.

Alternative considered: keep `<TextField type="number" icon={DollarIcon}>` and let callers manage the price formatting. Rejected — the cents-as-integer formatting is the whole value-add; it has to live in the primitive.

### Decision 5: Field-type wrappers are thin shells over `<FormField>`

Every field-type wrapper does one thing: render the right child element with the right `form_field_*` class, forwarding chrome-owner props to `<FormField>`:

```typescript
export function TextField({
  label, icon, iconPosition, error, required, disabled,
  type = 'text',
  ...inputProps   // omits className, disabled, type
}: TextFieldProps) {
  return (
    <FormField label={label} icon={icon} iconPosition={iconPosition}
               error={error} required={required} disabled={disabled}>
      <input type={type} class="form_field_input" disabled={disabled}
             {...inputProps} />
    </FormField>
  );
}
```

The wrappers are mechanically identical except for the child element + class. They exist to provide typed prop surfaces (e.g. `<TextField type="email">` versus `<DateField>` — no `type` prop) and to inject the right child class without callers having to.

`<TextareaField>` swaps in `<textarea class="form_field_textarea">`. `<SelectField>` swaps in `<select class="form_field_select">` and renders a chevron in the trailing icon slot. `<DateField>` swaps in `<input type="date">`. `<DatalistField>` swaps in `<input type="text" list={useId()}>` plus a sibling `<datalist>`. `<PriceField>` swaps in `<input type="text" inputMode="numeric">` with the cents formatting layer wrapping `onChange`.

Alternative considered: a single `<Field>` that takes a `kind` prop (`'text' | 'select' | 'textarea' | …`). Rejected — wider prop surface, worse types per kind, no real ergonomic win over typed wrappers.

### Decision 6: `<SearchField>` is a sibling primitive (3-col grid), not a `<FormField>` modifier

`<SearchField>` has a different grid: `auto 1fr auto` (search icon + input + clear button). Cramming this into `<FormField>` would mean a third prop (`trailing` or `clearButton`) that only applies to one variant, plus a grid-template that switches between 2-col and 3-col based on props — variant-conditional layout in a primitive that's supposed to be uniform.

Instead, `<SearchField>` is its own component:

```typescript
<SearchField
  value={searchInput}
  onChange={(e) => setSearchInput(e.target.value)}
  onClear={() => setSearchInput('')}
  placeholder="Search items..."
  aria-label="Search items"
/>
```

`<SearchField>` renders `<div class="form_field search_field">`. Its CSS reuses `.form_field` for chrome (border, background, focus-within) and adds `.search_field { grid-template-columns: auto 1fr auto }` for the layout. The search icon is locked (not configurable — it's a search field, the icon is a magnifying glass). The clear button is auto-rendered when `value` is non-empty AND `onClear` is provided. A discriminated-union variant lets callers swap the trailing slot for a count badge instead of a clear button:

```typescript
type SearchFieldVariant =
  | { onClear?: () => void; trailing?: never }
  | { onClear?: never; trailing?: ReactNode };
```

Alternative considered: `<FormField>` with a `trailing` slot. Rejected — opens the door to "what if I want leading + value + 2 trailing things?" The slot pile grows unbounded. Sibling primitives with explicit grid templates stay honest.

### Decision 7: `<CheckboxField>` is a separate primitive (no `<FormField>` involvement)

A checkbox doesn't fit the field-row grid (label above an input row). The checkbox layout is "[box][label]" inline, with the entire label as the click target. `<CheckboxField>` handles this directly:

```typescript
<CheckboxField
  label="Show in followers' feed"
  checked={inFeed}
  onChange={(e) => setInFeed(e.target.checked)}
/>
```

It renders a `<label class="checkbox_field">` wrapping `<input type="checkbox" class="checkbox_field_box">` + `<span>{label}</span>`. The label wrapper has `min-height: 44px` and padding so the whole row is the touch target (2.5.8 satisfied via label-as-hit-area). The box itself is 24×24 with custom CSS check mark on `:checked`.

Standalone use only — `<CheckboxField label>` is the always-public API. Inside `<FormField>`, a checkbox doesn't make sense (the FormField's label slot is for the field label; the checkbox has its own label-as-click-target).

Alternative considered: include the checkbox in `<FormField>` as a "type". Rejected — the layouts genuinely don't match (label-above vs. label-right, click-target-the-input vs. click-target-the-label-row).

### Decision 8: Token-first; `--field-*` tokens live in `global.css`, chrome CSS lives in `app/ui/components/field/form-field.css`

Tokens in `global.css`:

```css
--field-min-height: 44px;
--field-padding-y: 8px;
--field-padding-x: 12px;
--field-radius: 8px;
--field-font-size: 16px; /* iOS no-auto-zoom threshold */
--field-label-font-size: 14px; /* up from 12px — WCAG-friendly */

--field-border-color: #737373; /* ≥3:1 vs #fff — WCAG 1.4.11 */
--field-border-color-hover: #4b5563;
--field-border-color-focus: var(--primary-color);
--field-border-color-error: #c81e1e;
--field-focus-ring-color: rgba(115, 36, 206, 0.35);
--field-focus-ring-width: 3px;
--field-error-color: #c81e1e; /* ≥4.5:1 vs #fff — WCAG 1.4.3 */
--field-placeholder-color: var(--muted-text-color); /* ~4.83:1 */
```

Chrome CSS in `app/ui/components/field/form-field.css`:

```css
.form_field {
  display: grid;
  grid-template-columns: 1fr; /* default: no icon */
  align-items: center;
  background: transparent;
  border: 1px solid var(--field-border-color);
  border-radius: var(--field-radius);
  min-height: var(--field-min-height);
  padding: 0 var(--field-padding-x);
  font-size: var(--field-font-size);
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}
.form_field.icon_left {
  grid-template-columns: auto 1fr;
  gap: 8px;
}
.form_field.icon_right {
  grid-template-columns: 1fr auto;
  gap: 8px;
}

.form_field .form_field_input,
.form_field .form_field_select,
.form_field .form_field_textarea {
  background: transparent;
  border: none;
  height: 100%;
  width: 100%;
  outline: none;
  color: inherit;
  font: inherit;
  padding: 0;
}

.form_field:focus-within {
  border-color: var(--field-border-color-focus);
  box-shadow: 0 0 0 var(--field-focus-ring-width) var(--field-focus-ring-color);
}
```

The `:focus-within` on the wrapper handles the focus ring uniformly — when the input gains focus, the wrapper shows the ring. No per-input focus styling needed.

We do **not** bump `--neutral-border-color`. That token has 6+ non-form consumers (avatar borders, image-search backgrounds). The new `--field-border-color` is a sibling.

### Decision 9: `:focus-visible` is not used at the input level; `:focus-within` on the wrapper handles it

Because the wrapper owns the focus ring (Decision 8), the input's `:focus` triggers `:focus-within` on the wrapper. We don't distinguish `:focus-visible` here for two reasons: (1) the ring is on a parent div, not the input itself, and `:focus-within` doesn't have a `:focus-visible-within` analog (yet); (2) showing the ring on mouse-click in a form field is acceptable UX — unlike buttons where it looks like a bug, in a form field the ring confirms "you've activated this input."

If `:focus-visible` discipline matters here later, the migration is one declaration: `.form_field:has(:focus-visible) { ... }` replacing the `:focus-within` block.

### Decision 10: No size variant; the 44px floor applies universally

The previous proposal allowed `size="sm"` for dense contexts. The first implementation showed that `sm` immediately becomes the contributor's escape valve from any layout pressure — and the toolbar that justified `sm` was itself a layout that needed redesign, not capitulation.

This revision removes the size variant. Every `<FormField>` renders at 44px min-height. If a layout breaks:

- For the items-toolbar (wide horizontal row): the answer is to redesign the toolbar's grid for 44px tall cells.
- For in-popover dense filter inputs: the popover is allowed to scroll; the inputs stack vertically.
- For the items-toolbar filter sheet on mobile: it already overflows-y-auto.

The only documented exemption from the 44px floor is the `<CheckboxField>` box itself (24×24) — but the wrapping label gives a 44×44 hit area.

If a real call site emerges that genuinely cannot accommodate 44px (e.g. a future inline-data-table cell editor where the row is constrained by data density), the answer is a new sibling primitive (`<InlineTextField>` or similar) with explicit documentation of the spacing exception, NOT a `size` prop that any caller can reach for.

### Decision 11: Single white surface; no `data-surface` palette

The list app's forms all sit on white surfaces (form-shell modal, list-form modal, item-form modal, items-toolbar filter sheet, store-filter popover, price-filter popover, purchase-modal). The only candidate dark surface is the list-hero translucent-purple region — and the only field-shaped element there is the in-feed visibility checkbox, which is already handled by page-scoped CSS overrides on `<CheckboxField>` (re-coloring the box border, fill, and checkmark for the on-dark context).

The proposal explicitly avoids a `data-surface="main" | "overlay" | "dark"` mechanism. Reasoning:

- It's complexity for one use case (the hero checkbox).
- Page-scoped overrides for a single odd-context element are appropriate; building primitive-level surface switching for one consumer is overengineering.
- If a second on-dark surface appears (e.g., a hypothetical inline-edit on the hero itself), that's the moment to introduce a sibling primitive (`<OnDarkTextField>`) or — only then — widen the primitive with `data-surface`.

This decision can be revisited; it's not a permanent rule. But the default is "one surface" and the burden of proof for adding more is on the second use case, not the first.

### Decision 12: `<FormField>` owns label/error/required/description orchestration via `useId`

`<FormField>` generates a `useId()` and derives `inputId`, `descriptionId` (if `description`), `errorId` (if `error`). It renders:

```jsx
<label htmlFor={inputId} class="form_field_label">{label}{required && asterisk}</label>
<div class="form_field" ...>
  {/* icon slot if iconPosition === 'left' */}
  {/* child input — cloned with id=inputId, aria-describedby=descriptionId+errorId,
       aria-invalid=!!error, aria-required=!!required */}
  {/* icon slot if iconPosition === 'right' */}
</div>
{description && <p id={descriptionId}>{description}</p>}
{error && <FieldError id={errorId}>{error}</FieldError>}
```

The child is injected with the ARIA props via `React.cloneElement`. Field-type wrappers pass a single child of a known type (their inner `<input>`/`<select>`/`<textarea>`), so the `cloneElement` injection is safe.

Required indicator: a real DOM text node `" *"` inside a `<span aria-hidden="true">` adjacent to the label text. Not a CSS pseudo-element. AT users hear "required" via `aria-required`; sighted users see the asterisk.

`<FieldError>`: renders `<p class="field_error">{children}</p>`. No `role="alert"` (the original implementation added it; that was wrong — `aria-describedby` handles announcement on focus, and `role="alert"` re-announces on every render which is hostile during typing).

Alternative considered: skip `<FormField>`'s orchestration and require callers to wire ARIA manually. Rejected — that's the current bug. The whole point of the primitive is callers can't get it wrong.

### Decision 13: Centralize field icons in `field-icons.tsx`

Following the budget app pattern:

```typescript
export const FIELD_ICONS = {
  name: <MdTextFields aria-hidden="true" />,
  date: <FaCalendarDays aria-hidden="true" />,
  link: <FaLink aria-hidden="true" />,
  email: <FaEnvelope aria-hidden="true" />,
  search: <LuSearch aria-hidden="true" />,
  // …
} as const;
```

Callers use `icon={FIELD_ICONS.link}` rather than importing `<FaLink />` per-call-site. The `icon` prop still accepts any `ReactNode` — `FIELD_ICONS` is a convenience registry, not a constraint.

This isn't an enforced pattern; it's a convention. Useful so the icon for "name fields" can be swapped in one place if design picks a different glyph later.

### Decision 14: Delete the prior implementation's `field/` directory in full

The prior implementation left:

- `app/ui/components/field/Field.tsx` (orchestrator)
- `app/ui/components/field/TextInput.tsx`, `Textarea.tsx`, `Select.tsx`, `Checkbox.tsx` (primitives with chrome on child)
- `app/ui/components/field/FieldError.tsx` (with `role="alert"`)
- `app/ui/components/field/fieldClasses.ts`
- `app/ui/components/field/types.ts`
- `app/ui/components/field/field.css` (chrome on `.field-control` class targeting the child)
- Call-site migrations in ~22 files using `<Field>` + `<TextInput>` etc.

All of it is wrong-pattern. We delete the entire `field/` directory and rebuild from scratch with the new primitives. Call sites get re-migrated to the new wrappers in the same sweep.

This is a larger diff than "patch the existing primitives." It's also the only honest path — the prior primitives' APIs are incompatible with the new architecture (their orchestrator passes `id` to children expecting them to forward it; the new wrappers don't expose `id`/`className` to callers at all).

Alternative considered: patch the existing primitives in place (rename `<TextInput>` → `<TextField>`, move chrome to wrapper, remove `className`). Rejected — the diff is roughly the same size and the resulting code is a halfway state that's harder to reason about than a clean rewrite. The prior implementation has had 0 production users; nothing is lost by replacing it wholesale.

### Decision 15: `<FormSelect>` deletion path (default) — migrate occasion picker to `<DatalistField>`

Same call as the prior proposal: delete `<FormSelect>` + `<SelectWrapper>` + `select.css`. Migrate `ListForm`'s occasion picker to `<DatalistField options={occasionOptions} />` where `occasionOptions` is `<option value="Birthday" />` × 6.

Verification step: manual test in Chrome AND Safari that typing a custom occasion + selecting from suggestions both work. Safari's `<datalist>` UX is weaker than Chrome's; if it's unusable, the fallback is keeping `<FormSelect>` and reskinning its CSS to consume `--field-*` tokens.

## Risks / Trade-offs

- **[44px floor breaks dense layouts]** → Items toolbar, in-popover filters, reorder-input stepper. No `sm` escape valve in this revision. **Mitigation**: redesign the layout (e.g., items-toolbar accepts taller cells, or the toolbar grid rearranges to give each cell more horizontal room and accept fewer-elements-per-row at mid-widths). If a layout genuinely cannot be made to work at 44px, raise it to the user before introducing an `sm` size that re-enables drift.
- **[Cloning children with cloneElement is mildly magical]** → The internal `<FormField>` injects `id`, `aria-describedby`, `aria-invalid`, `aria-required` onto its single child via `React.cloneElement`. Callers using the field-type wrappers never see this — the wrappers pass a known child type. The risk is direct `<FormField>` consumption (which we discourage by not exporting it from the index). **Mitigation**: keep `<FormField>` internal; if a field-kind without a wrapper is needed later, build the wrapper first.
- **[`<PriceField>`'s state shape differs from raw input]** → Callers pass `amount: number | null` and `onChange: (value: number) => void`, not `value: string` / `onChange: ChangeEvent`. Migration of `PriceFilterPopover` needs to convert at the query-param boundary (parseFloat in, toFixed(2) out). **Mitigation**: documented in the migration tasks; the conversion is 2 lines per call site.
- **[Border-color bump is a site-wide visual change]** → Every form input on every page changes border color simultaneously. Defensible (the current color fails contrast). **Mitigation**: PR description includes before/after screenshots, calls out the WCAG 1.4.11 driver.
- **[Deleting prior `field/` directory + Form.tsx is a big diff]** → ~22 files touch this change. **Mitigation**: commits by call-site family; run `tsc --noEmit` between sweeps so type errors surface incrementally.
- **[Native `<SelectField>` constrains the open-state styling]** → If a future design demands a styled-open menu, that's a fresh primitive (combobox/listbox). **Mitigation**: documented Non-Goal; revisit when needed.
- **[Safari `<datalist>` UX may differ from Chrome]** → Decision 15's deletion path depends on acceptable Safari behavior. **Mitigation**: manual test before merge; fallback to reskinned `<FormSelect>` if needed.
- **[On-dark surfaces require page-scoped overrides]** → The list-hero visibility checkbox is the only such case today; it overrides `<CheckboxField>` colors via `.list-hero-side .checkbox_field { … }` selectors. If a second on-dark field appears, the right answer is a sibling primitive — not widening the primitive with surfaces. **Mitigation**: code review catches the second case before it ships as another set of overrides.
- **[`role="alert"` removal changes screen-reader behavior]** → The prior implementation added `role="alert"` to `<FieldError>`. Removing it means errors no longer interrupt during typing. This is the correct behavior (the proposal originally specified `aria-describedby`-driven announcement on focus, not interruption), but anyone testing with NVDA/JAWS will hear a difference. **Mitigation**: documented; the change is more accessible, not less.

## Migration Plan

No data migration. CSS + components + ~22 call-site files + deletion of the prior `field/` directory.

Suggested commit sequence:

1. Add `--field-*` tokens to `global.css`.
2. **Delete the prior `app/ui/components/field/` directory entirely** (`Field.tsx`, `TextInput.tsx`, `Textarea.tsx`, `Select.tsx`, `Checkbox.tsx`, `FieldError.tsx`, `fieldClasses.ts`, `types.ts`, `field.css`, `index.ts`). The build will break — that's fine; the next step rebuilds.
3. Build the new `app/ui/components/field/`: `types.ts`, `FormField.tsx` (chrome owner), `TextField.tsx`, `TextareaField.tsx`, `SelectField.tsx`, `DateField.tsx`, `DatalistField.tsx`, `PriceField.tsx`, `SearchField.tsx`, `CheckboxField.tsx`, `FieldError.tsx`, `field-icons.tsx`, `index.ts`, `form-field.css`, `search-field.css`.
4. Re-migrate every call site to the new wrappers. Order by file family (list-form, item-form, popovers, toolbar, purchase modal, pagination, lists/items pages).
5. Delete obsolete: `Form.tsx`, `FormSelect.tsx`, `SelectWrapper.tsx`, `select.css`, `form.css` (whatever remains after the prior sweep). Delete all `.items-search*` chrome rules, all page-scoped input classes, all on-hero checkbox override CSS (re-add the surviving on-dark overrides under `.list-hero-side .checkbox_field`).
6. Visual review across every form route under `AUTH_BYPASS=true`. Check 44px floor on every field; check focus ring on Tab; check error states; check label association.
7. `tsc --noEmit`; `npm run lint`; `npm run build`.

## Open Questions

- **Layout response to 44px in the items-toolbar**: at desktop widths, the current toolbar has 6 controls in one row (search + 3 selects + 2 popover triggers + view-toggle). At 44px each they may not fit. Options: drop view-toggle to its own row, drop sort/purchases into the filter sheet on mid-widths, accept 2-row layout. Decided during slice-and-sweep visual review.
- **Safari `<datalist>` quality for the occasion picker** — verified during migration. If unusable, switch to reskinned `<FormSelect>`.
- **`<PriceField>` `formatNumber` helper** — the budget app imports `formatNumber` from `@/lib/utils`. This app doesn't have it. Either copy the implementation or write a one-liner inline (`new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)`).
- **Required-asterisk color** — `var(--field-error-color)` is loud; `var(--muted-text-color)` is quiet. Pick during the slice. Default to error-color (visible signal).
- **`<FormField>` `description` slot placement** — above the input (between label and input) or below the input (between input and error)? Default to above; trivial to adjust.
- **`ImageUrlInput` thumbnail placement** — beside the input (3-col grid via a sibling primitive?) or below (separate block)? Default to below — the thumbnail is a preview affordance, not a slot of the input itself. If beside is required, a `<TextField trailing={thumb}>` slot doesn't fit the chrome-owner pattern (the trailing slot is a sibling concern → `<SearchField>` is the precedent → a `<TextFieldWithPreview>` sibling).
- **`FIELD_ICONS` initial set** — `name`, `link`, `date`, `email`, `search` are obvious. `price`? `store`? `quantity`? Start with the minimum and add as call sites demand.
