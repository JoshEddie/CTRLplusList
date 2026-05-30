## Context

Sub-proposal 3.3 of the `test-coverage` initiative. The `testing-foundation` capability is established and hardened by `test-housekeeping`: `__tests__/` colocation is the convention, the universal per-file floor is `lines:98 / statements:98 / branches:95 / functions:100` referenced from a single `COVERAGE_FLOOR` constant in `vitest.config.ts`, the no-backdoor disposition rule is in effect, and `test-button-system` (3.1) + `test-chip-system` (3.2) proved the foundation works against primitive families. This is the third primitive carve-out — the form-field family — and the largest yet (ten executable component files).

Unlike `test-chip-system`, this carve-out elevates against an **already-existing** spec (`form-field-system`, created by archiving `standardize-form-fields`). No new capability spec is created. The spec edits here are ADDITIVE: three new requirements that lock call-time invariants the source enforces today but the spec does not state explicitly.

Carve-out (per parent `test-coverage` tasks.md §3.3):

| File | LOC | Char | Tested how |
|---|---|---|---|
| `app/ui/components/field/FormField.tsx` | 120 | Chrome owner; `useId`-driven id wiring; `Children.only` + `cloneElement` to inject `id`/`aria-describedby`/`aria-invalid`/`aria-required` on the single field-element child; dev-only `console.error` when child's `displayName` is unrecognized; icon-position grid switching; required-indicator real-DOM rendering | jsdom + RTL render + spy on `console.error` |
| `app/ui/components/field/TextField.tsx` | 68 | `forwardRef`; spreads `Omit<ComponentPropsWithRef<'input'>, 'className' \| 'disabled' \| 'type' \| 'id' \| 'aria-*'>` onto a `<input class="form_field_input">` inside `<FormField>`; `type` default `'text'`, accepts the seven listed values | jsdom + RTL |
| `app/ui/components/field/TextareaField.tsx` | 55 | `forwardRef`; same shape over `<textarea class="form_field_textarea">` | jsdom + RTL |
| `app/ui/components/field/SelectField.tsx` | 75 | `forwardRef`; `options[]` map OR `children` pass-through; `fieldSize` forwards to `<FormField size>` | jsdom + RTL |
| `app/ui/components/field/DateField.tsx` | 56 | `forwardRef`; `<input type="date">` inside `<FormField>` | jsdom + RTL |
| `app/ui/components/field/DatalistField.tsx` | 69 | `forwardRef`; `useId()` generates the `list` id shared with the sibling `<datalist>` | jsdom + RTL |
| `app/ui/components/field/PriceField.tsx` | 94 | `useState` for `isNegative`; `handleChange` parses digits-only → integer cents → dollars; toggles `isNegative` per `allowNegative` rules; `display` derived from `Math.abs(amount)` + leading `-` when negative | jsdom + RTL + `userEvent.type` on the input |
| `app/ui/components/field/SearchField.tsx` | 70 | `forwardRef`; three-branch trailing slot: `trailing` ReactNode OR auto clear button OR nothing + `no_trailing` class | jsdom + RTL |
| `app/ui/components/field/CheckboxField.tsx` | 26 | `forwardRef`; `<label class="checkbox_field">` wrapping native `<input type="checkbox">` + `<span>` label | jsdom + RTL |
| `app/ui/components/field/FieldError.tsx` | 15 | Returns `null` for falsy children; otherwise `<p id={id} class="field_error">{children}</p>`; no `role="alert"` | jsdom + RTL |
| `app/ui/components/field/field-icons.tsx` | 10 | Module-scope literal table `{ name, date, link, email, search }` of pre-built `aria-hidden` icon nodes | Excluded — see Decision 2 |
| `app/ui/components/field/types.ts` | 24 | Type-only | Excluded by zero-runtime-content |
| `app/ui/components/field/index.ts` | 15 | Re-exports | Excluded by existing `app/ui/components/*/index.ts` glob |

Coverage floor: universal `COVERAGE_FLOOR` per `test-housekeeping` (98 / 98 / 95 / 100). Per-file thresholds are added by-name in `vitest.config.ts`, referencing the constant.

Bound by:
- `testing-foundation` — `__tests__/` colocation, universal `COVERAGE_FLOOR`, no-backdoor rule, four-gate pre-merge, four-audit + invariant-elevation obligations, assertion-substance bar, complexity ≤ 15, `<State>_<Behavior>` shape, three-role `describe()`, observable-behavior-over-execution.
- `form-field-system` (active) — owns every existing field SHALL. This sub-proposal ADDS three SHALLs (Decisions 3a/3b/3c below). No requirements are removed; no behavior is changed.

## Goals / Non-Goals

**Goals:**

- Land ten colocated jsdom test files (one per executable component) at the universal `COVERAGE_FLOOR`.
- Exercise every observable branch of every file — no execute-for-coverage renders, no tautological assertions, no snapshot-only tests.
- Promote `sonarjs/cognitive-complexity` from `warn` to `error` for all ten files via `eslint.config.mjs` per-file overrides.
- Add three call-time SHALLs to the `form-field-system` spec (FormField child-displayName warning; PriceField cents-math + negative-toggle path; SearchField trailing-union three-branch decision).
- Complete the four-audit obligation (duplication / complexity / testability on source; assertion audit on the new tests) AND the invariant-elevation audit, recording dispositions in `tasks.md`.

**Non-Goals:**

- No source refactors anticipated. Every branch in every file is observable from rendered DOM, callback shape, or `console.error` invocation. If an audit finding requires source change, it's recorded in `tasks.md` with disposition.
- No coverage of `index.ts` (excluded by the existing `app/ui/components/*/index.ts` glob), `types.ts` (no runtime content), or `field-icons.tsx` (constant data table; see Decision 2).
- No new size variant, no new sibling primitive, no new field kind.
- No e2e. Component-level integration belongs to capability-flow sub-proposals (4.5, 4.9, 4.11, etc.).
- No real network call. `PriceField`'s `Intl.NumberFormat` is the only environmental dep and is universally available in jsdom.
- No DOM-snapshot tests. Every assertion names a specific attribute, class string, accessible name, callback shape, or rendered text content.
- No test for `FIELD_ICONS` shape. The constant is the source; asserting its keys equal the source is a tautology.
- No real Next router needed — field primitives render native form elements, never `<Link>`. No `next/link` mock needed.

## Decisions

### Decision 1: One `.test.tsx` per executable component file; no `.test.ts`; no per-component test sub-directory.

The carve-out has ten executable files, all `.tsx` (no pure-string helpers like `chipClasses.ts` / `buttonClasses.ts`). Every executable file renders JSX or returns React children, so every test belongs in the jsdom project. Each test file is colocated as `app/ui/components/field/__tests__/<Component>.test.tsx` per the `test-housekeeping` `__tests__/` convention.

**Alternatives considered:**

- *One mega `form-field.test.tsx` covering all ten components.* Rejected — destroys the per-source-file coverage attribution that v8 produces from per-test-file imports, and degrades failure output (one giant failing file vs. one specific component file). Also violates the assertion-audit's preference for narrow `describe()` scopes.
- *Per-component subdirectory `app/ui/components/field/<Component>/Component.tsx` + `__tests__/`.* Rejected — would require moving every source file. The carve-out is "test the family," not "restructure the family". Source restructure is out of scope per "no source refactors expected".
- *Split heavy components (`PriceField`, `FormField`) into multiple test files (`PriceField.math.test.tsx`, `PriceField.render.test.tsx`).* Rejected — the file-per-source convention is clearer; if any single test file grows beyond ~30 cases, revisit at that point as a §7.3 testability finding.

### Decision 2: Exclude `field-icons.tsx` from coverage as a constant data table; do NOT write a test for it.

`field-icons.tsx` is a module-scope literal of pre-built React nodes:

```tsx
export const FIELD_ICONS = {
  name: <MdTextFields aria-hidden="true" />,
  date: <FaCalendarDays aria-hidden="true" />,
  link: <FaLink aria-hidden="true" />,
  email: <FaEnvelope aria-hidden="true" />,
  search: <MdSearch aria-hidden="true" />,
} as const;
```

There is no executable function and no branch. The only conceivable "behavior" assertions are:

- `expect(Object.keys(FIELD_ICONS)).toEqual(['name', 'date', 'link', 'email', 'search'])` — tautological against the source; locks an arbitrary ordering with no contract value.
- `expect(render(FIELD_ICONS.name).querySelector('svg')).toHaveAttribute('aria-hidden', 'true')` — asserts a per-icon prop already supplied at the literal call site; effectively asserts the source IS the source.

Neither passes the assertion-substance bar from `testing-foundation`. The right disposition is to exclude the file from the coverage report.

The exclusion is added as a new entry in `vitest.config.ts`'s `coverage.exclude`:

```ts
'app/ui/components/field/field-icons.tsx', // constant data table; see test-form-field-system design D2
```

A one-line comment names this decision so future readers do not "fix" the missing test.

**Alternatives considered:**

- *Write a single tautological "every key resolves to a React element" smoke test.* Rejected — the assertion-substance bar in `testing-foundation` exists precisely to disallow this. A smoke test that cannot fail except by deletion of the source provides no regression value.
- *Inline the icons into their call sites (no exported constant).* Rejected — out of scope for a testing carve-out. The constant exists per the `form-field-system` "Centralized FIELD_ICONS registry" requirement.

### Decision 3: ADD three call-time SHALLs to `form-field-system` that the new tests lock against.

The invariant-elevation audit (per `testing-foundation`) gates each invariant the tests assert against three-part criteria (non-obvious / survives reimplementation / protects real failure mode). Three invariants pass the gate and are not yet stated in the spec.

#### Decision 3a: `<FormField>` enforces `Children.only` and warns in development when the child's `displayName` is unrecognized.

The source at HEAD:

```tsx
const KNOWN_CHILD_DISPLAY_NAMES = new Set([
  'TextField', 'TextareaField', 'SelectField', 'DateField', 'DatalistField', 'PriceField',
]);

const child = Children.only(children);
if (isValidElement(child)) {
  if (process.env.NODE_ENV !== 'production') {
    const displayName = (child.type as { displayName?: string }).displayName;
    if (displayName && !KNOWN_CHILD_DISPLAY_NAMES.has(displayName)) {
      console.error(
        `<FormField> received unexpected child <${displayName}>. Use a field-type wrapper (TextField, SelectField, etc.).`
      );
    }
  }
  …
}
```

The contract is: `<FormField>` accepts exactly one child; in development, an unrecognized child surfaces a `console.error`. This is non-obvious (the existing spec doesn't say `FormField` checks its child), survives reimplementation (any rewrite that drops the check would silently accept any child), and protects a real failure mode (callers who wrap a bare `<input>` instead of a `<TextField>` lose the `disabled`/`type` mapping the wrappers provide). Elevated.

The test path uses a `vi.spyOn(console, 'error')` harness in `beforeEach`/`afterEach`; vitest sets `NODE_ENV='test'` by default, which is `!== 'production'` and activates the warning branch. Three scenarios: (a) unrecognized displayName → spy called with the expected message; (b) recognized displayName (e.g. `TextField`) → spy not called; (c) child with no `displayName` (e.g. an inline `<input>`) → spy not called (the `if (displayName && …)` short-circuits).

The `Children.only` part is exercised by passing zero children (should throw) and multiple children (should throw). React's `Children.only` is the mechanism; the test asserts the observable.

#### Decision 3b: `<PriceField>` cents-as-integer math + `allowNegative` toggle path.

The source at HEAD:

```tsx
const handleChange = (value: string) => {
  let negative = false;
  if (!allowNegative || (isNegative && value[value.length - 1] === '-')) {
    setIsNegative(false);
  } else if (allowNegative && value.includes('-')) {
    negative = true;
    setIsNegative(true);
  }
  const digits = value.replace(/\D/g, '');
  const cents = Number(digits || '0');
  const next = ((negative ? -1 : 1) * cents) / 100;
  onChange(next);
};

const formatted = amount === null ? '' : PRICE_FORMATTER.format(Math.abs(amount));
const display = isNegative ? `-${formatted}` : formatted;
```

The contract: input is parsed as digits-only integer cents; `allowNegative=false` (default) suppresses negatives; `allowNegative=true` flips `isNegative` when a `-` appears in input; a trailing `-` on a value that is already negative clears `isNegative` (toggle off). The display string is `Math.abs(amount)` formatted, prefixed with `-` if `isNegative` is true. The existing spec's "PriceField formats input as currency" scenario states the formatting part but leaves the toggle path implicit. Elevated.

The test path uses `fireEvent.change(input, { target: { value: '...' } })` or `userEvent.type(input, '...')` and asserts `onChange.toHaveBeenCalledWith(<dollar number>)` + `input.value` on the next render.

#### Decision 3c: `<SearchField>` trailing-slot three-branch decision (runtime contract, not just type contract).

The source at HEAD:

```tsx
const hasTrailingNode = trailing !== undefined && trailing !== null;
const hasClearButton = onClear !== undefined && value !== undefined && value !== '';
const showTrailing = hasTrailingNode || hasClearButton;
…
const classes = [..., !showTrailing && 'no_trailing', className].filter(Boolean).join(' ');
…
{hasTrailingNode && trailing}
{!hasTrailingNode && hasClearButton && (
  <button type="button" className="search_field_clear" onClick={onClear} aria-label="Clear search">
    <MdClose aria-hidden="true" />
  </button>
)}
```

The contract: three mutually exclusive branches at render time. The discriminated union in the prop type prevents passing both `onClear` and `trailing` at the call site, but the *runtime* behavior is "if `trailing` is a non-null node, use it; else if `onClear` exists AND value is non-empty, auto-render the clear button; else render nothing AND add `no_trailing` to the outer div". The existing spec describes only two of the three branches (the trailing-replaces-clear branch is implicit). Elevated.

The test path covers the truth table: trailing-only, onClear+nonempty-value, onClear+empty-value, onClear+undefined-value, no-onClear+no-trailing, both-trailing-and-onClear (runtime should pick trailing).

**Alternatives considered:**

- *Defer 3a/3b/3c to a follow-up sub-proposal `harden-form-field-spec`.* Rejected — the invariant-elevation audit IS part of this sub-proposal per `testing-foundation`. Deferring breaks the audit obligation.
- *Add only 3a and 3b; leave 3c implicit.* Rejected — 3c is the cleanest example of a discriminated-union runtime contract that the tests assert in three branches. Locking it in the spec is the smallest possible drift between source and spec.

### Decision 4: `userEvent.type` is the canonical interaction for inputs; `fireEvent.change` is acceptable only for `<select>` and for `<PriceField>`'s mid-typing assertions where character-by-character ordering matters.

`testing-foundation`'s "observable behavior over execution" rule prefers user-facing event sequences. `userEvent.type` simulates real keyboard events (keydown / keypress / input / keyup) and is the default. The exceptions:

- `<select>` — `userEvent.selectOptions(select, value)` is the right API.
- `<PriceField>` — when asserting the `'1234'` → `'12.34'` transform, `userEvent.type(input, '1234')` produces four `handleChange` calls (one per character), each with a different `value` argument. To assert the FINAL onChange call value, the test reads the last `mock.calls` entry. To assert the cents-math without mid-typing noise, `fireEvent.change(input, { target: { value: '1234' } })` is acceptable — it dispatches a single change event with the final string. Both are documented patterns; the test uses whichever matches the assertion scope.

### Decision 5: Coverage gaps surface via the no-backdoor preference order; the per-file floor is not relaxed.

Per `test-housekeeping`'s no-backdoor rule. Each branch v8 flags as uncovered has three dispositions in order of preference:

- **(a) Write a test.** Default.
- **(b) Refactor the source** (within the carve-out) to remove the awkward branch.
- **(c) `/* v8 ignore next */` annotation with a one-line rationale comment** for the specific uncoverable region.

Lowering the per-file floor (option (d) from the old policy) is NO LONGER acceptable. Each disposition (and which option was chosen) SHALL be recorded in `tasks.md`.

Expected attention points:

- `FormField.tsx` — the `displayName && !KNOWN_CHILD_DISPLAY_NAMES.has(displayName)` short-circuit has three branches v8 may count (displayName missing; displayName present and known; displayName present and unknown). All three are covered by Decision 3a's three scenarios.
- `FormField.tsx` — the icon-position computed-class ternary nest (`hasIcon ? (iconPosition === 'right' ? 'icon_right' : 'icon_left') : ''`) is three observable cases (no icon; icon left; icon right). Covered.
- `PriceField.tsx` — `handleChange`'s `if/else if` ladder. Cases: `!allowNegative` (`-` suppressed); `allowNegative + value has '-'` (flip to negative); `allowNegative + isNegative + trailing '-'` (clear negative); `allowNegative + no '-' + isNegative` (stay negative). Plus the `digits || '0'` fallback when `value` is non-digits only. Each is a discrete `<State>_<Behavior>` test.
- `SearchField.tsx` — the truth table from Decision 3c. Six discrete cases enumerated.
- `FieldError.tsx` — the falsy-children branch. Five cases: `undefined`, `null`, `false`, `0`, `''`. v8 may collapse some; tests assert each explicitly.
- `CheckboxField.tsx` — the `className` filter (`className` provided / omitted) — two cases.

No surprise branches anticipated. If v8 flags anything unexpected, the disposition path is recorded per the no-backdoor rule.

### Decision 6: A shared `__tests__/test-helpers.tsx` is allowed if duplication crosses three or more test files; otherwise inline.

Anticipated duplication patterns:

- "Render a single field-wrapper component and grab the input by role" — applies to `TextField`, `TextareaField`, `DateField`, `DatalistField` (4 files). Extraction threshold (≥3 uses) met.
- "Spy on `console.error` for FormField warnings" — single use site (`FormField.test.tsx`). Stay inline.
- "Render PriceField and type digits" — single use site. Stay inline.

If extracted, `test-helpers.tsx` lives at `app/ui/components/field/__tests__/test-helpers.tsx` and is excluded from coverage via the existing `**/__tests__/**` glob in `vitest.config.ts`'s `coverage.exclude`. The §7.1 audit records the chosen disposition.

### Decision 7: `aria-describedby` join order is asserted as space-separated tokens, not as a specific concatenated string.

The source: `[descriptionId, errorId].filter(Boolean).join(' ') || undefined`. Both ids are derived from a single `useId()` call (`${reactId}-description`, `${reactId}-error`). The order is "description first, error second" by source convention. The test asserts:

```ts
const describedBy = input.getAttribute('aria-describedby');
expect(describedBy?.split(' ').sort()).toEqual([descId, errId].sort());
```

This locks the contract — both ids present, both reachable — without locking an arbitrary join order that screen readers do not care about (per WAI-ARIA, `aria-describedby` is an unordered list of IDREFs). If a future change reorders the join for any reason, the test still passes. If a future change drops one of the ids, the test fails by name.

**Alternative considered:** `expect(describedBy).toBe(\`${descId} ${errId}\`)` (exact string). Rejected — over-locks the order. The accessibility contract is "both ids are present"; the spec scenario reads "contains both ids (space-separated)", which permits either order.

## Risks / Trade-offs

- **Ten new test files is the largest single-PR test increment under the foundation.** Risk: review fatigue. → Mitigation: each file mirrors a single source file with parallel structure (DomShape / PropsForwarding / DisabledPassthrough / RefForwarding sections), making per-file review tractable. The §7 audits give the reviewer a structured place to focus.
- **`PriceField` carries the most behavior per LOC of any carve-out file (`useState` + 5-branch `handleChange` + abs-formatting display).** Risk: an off-by-one in the cents math goes unnoticed. → Mitigation: Decision 3b elevates the math to a SHALL; the tests assert specific dollar values for specific digit inputs (`'1234'` → `12.34`; `'1'` → `0.01`; `''` → `0`; `'0'` → `0`).
- **`FormField`'s dev-only `console.error` is gated on `process.env.NODE_ENV !== 'production'`.** Risk: the test passes under jsdom (vitest sets `NODE_ENV='test'`) but the production build path is uncovered. → Mitigation: this is the same trade-off React itself uses (most React invariant warnings are dev-only). The spec phrases it as "SHALL warn in development", aligning the test scope. A separate test (or `/* v8 ignore next */` on the unreachable-in-test `'production'` branch) handles the uncovered case if v8 flags it. Disposition recorded in §4.4.
- **`<datalist>` rendering varies by browser; the test verifies DOM shape only, not the autocomplete popup.** Accepted: `form-field-system`'s existing scenario "User types a custom value" describes the contract as "the input accepts and forwards the typed value (no validation rejection)". The test asserts that contract via `onChange` shape, not the popup chrome.
- **`SearchField`'s `trailing` + `onClear` discriminated union is enforced by TypeScript at the call site, but the runtime test must construct the both-provided case via type-coercion (e.g., `as any`) to verify the runtime precedence.** This is a controlled bypass of the type system to lock the runtime contract. Decision 3c documents this as intentional; the test names the case `BothProvided_TrailingWins` so a future change that flips precedence fails by name.
- **`FIELD_ICONS` exclusion (Decision 2) is the first per-file `coverage.exclude` entry in the field family.** Risk: a future field-icons.tsx that grows past a constant table escapes coverage by inheriting the exclusion. → Mitigation: the exclude entry's one-line comment ("constant data table; see test-form-field-system design D2") signals intent. If the file grows runtime behavior, the next sub-proposal touching the file removes the exclude and writes the test.
- **Cognitive-complexity promotion locks the ceiling at 15 for ten files.** Measured complexity at HEAD is 1–4 per file. The ceiling is comfortably out of reach for the current shapes. → Accepted: same trade-off as prior carve-outs; the override has near-zero ongoing cost and locks the ceiling for future edits. `PriceField.handleChange` (the most complex function) is ~4 today; the gap to 15 is the buffer for benign future tweaks.
- **The active `form-field-system` spec lacks a clear "Purpose" paragraph (it's "TBD" from the archive moment).** This sub-proposal does NOT amend the Purpose — Purpose-rewrite is a docs concern out of scope here. Recorded as an observation; a future micro-change can fill it in.
