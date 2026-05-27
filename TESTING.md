# Testing notes

Read this file before adding, modifying, or reviewing any test in this repo.

## Test quality bar

Any test you add MUST assert observable behavior — what the production code returns, renders, throws, persists, or sends over the network. Coverage is not enough; "did the line execute" is not the bar. The bar is "would this test fail if the production code were subtly wrong."

**Do not write:**

- **Execute-for-coverage tests** — calling a function with no `expect(...)` on the result, error, or side effect, written purely to lift the coverage number.
- **Tautological assertions** — assertions that hold for any input: `expect(arr.length).toBeGreaterThanOrEqual(0)`, `expect(true).toBe(true)`, comparisons of a value against itself, lone `expect(x).toBeDefined()` / `expect(x).toBeTruthy()` on a value the test itself constructed.
- **Vague assertions on values your test built** — asserting `expect(result).toBeTruthy()` on something you just created with `createList(...)` proves nothing about `createList`.
- **Assertions on values your mocks just returned** — round-tripping a mock's return value through production code and asserting on it tests the mock, not the production code.
- **Snapshot-only tests against machine-generated snapshots** — if the snapshot is the only assertion AND you authored it by running the test once and accepting whatever came out, you've locked in current behavior without verifying it's correct behavior.

**Do write** assertions that constrain specific properties: exact return values, expected error messages or types, exact rendered text or structure, specific DB rows after a mutation, specific `fetch` call arguments, specific persisted state.

**If you can't write a substantive assertion, the test belongs deleted, not weakened.** A coverage gap is more honest than a tautological green check — the gap shows up in the coverage report; the false-pass hides forever.

This rule applies to every test in the repo. ESLint enforces the mechanical parts where configured (`vitest/expect-expect`, tautology shortlist); the rest is a manual review bar. The normative statement and the per-sub-proposal assertion audit it pairs with live in the `testing-foundation` capability spec — check `openspec list` for its current location (active in `openspec/changes/test-coverage/specs/testing-foundation/spec.md` until archived, then under `openspec/specs/testing-foundation/spec.md`).

## Coverage ignore annotations require a rationale

Every `/* v8 ignore */` annotation (including `/* v8 ignore next */`, `/* v8 ignore next N */`, `/* v8 ignore start */ … /* v8 ignore stop */`, and the file-level `/* v8 ignore file */`) MUST carry an inline rationale on the same line, after a `--` separator, explaining WHY the region is uncoverable or intentionally excluded. A bare `/* v8 ignore next */` is not acceptable.

The rationale MUST name the specific branch or region being ignored AND the reason it cannot be exercised by a test — e.g. "defensive null-ref guard, unreachable in test env", "platform-specific branch only reached on Windows", "third-party error path we cannot trigger from userspace". Vague rationales like "coverage workaround" or "not testable" are not acceptable; the reader should be able to judge whether the exclusion is still justified after a future refactor.

```ts
// ✅ Good — names the specific branch and why it's unreachable
/* v8 ignore next -- defensive null-ref guard; localRef.current is always populated by the time useEffect runs under React 19 + jsdom. */
if (!container) return;

// ❌ Bad — no rationale
/* v8 ignore next */
if (!container) return;

// ❌ Bad — vague rationale that won't survive a future refactor
/* v8 ignore next -- coverage workaround */
if (!container) return;
```

When a coverage gap surfaces, the preference order is (a) write a test, (b) refactor the source to eliminate the awkward branch, (c) `/* v8 ignore */` with a rationale. Option (c) is the last resort — and the rationale is what keeps it from drifting into a silent escape hatch.

## Test file location

Test files MUST live in a `__tests__/` directory colocated with the module they test — NOT alongside it. The colocation requirement from `testing-foundation` stands (tests stay next to the code they exercise), but the `__tests__/` folder keeps source directory listings focused on production files and groups multiple tests for the same module without polluting the parent directory.

```
app/ui/components/button/
├── Button.tsx
├── LinkButton.tsx
├── buttonClasses.ts
├── types.ts
├── index.ts
└── __tests__/
    ├── Button.test.tsx
    ├── LinkButton.test.tsx
    ├── buttonClasses.test.ts
    └── test-helpers.ts        ← test-only helpers go here too
```

Test-only fixtures and helpers (anything imported only by `*.test.*` files) SHOULD live inside the same `__tests__/` directory as the tests that use them. They MUST be added to `vitest.config.ts`'s `coverage.exclude` so they don't pollute the coverage report.

Vitest's default include globs (`**/*.test.ts`, `**/*.test.tsx`) and the project's coverage `include` (`['lib/**', 'app/**', 'hooks/**']`) match `__tests__/` paths automatically — no config change is needed to adopt this layout for a new test.

```ts
// ✅ Good — test in __tests__/ imports the production module via `../`
// app/ui/components/button/__tests__/Button.test.tsx
import { Button } from '../Button';

// ❌ Bad — test sitting alongside the module
// app/ui/components/button/Button.test.tsx
```

The normative statement lives in the `testing-foundation` capability spec alongside the colocation rule.

## Test naming convention

Test names MUST be self-documenting and structurally consistent — failures should read like spec lines, with a predictable shape per test type. The naming bar and the substance bar (above) are independent: a structured name does not excuse a vacuous assertion, and a substantive assertion does not excuse a vague name.

**Precision principle:** both halves of a name MUST be as specific as the test's assertions. If the test asserts a specific error message or class, the behavior token names that error — bare `Throws` is vague. If the test asserts a specific return value, the behavior token names that value — bare `Returns` or `ReturnsError` is vague. If the test asserts on rendered text, the behavior token names what is rendered — bare `Renders` is vague. The same precision rule applies to the state half: if the test exercises a specific input, the state token names what makes that input distinctive (`UnknownInput`, `EmptyArray`, `NullList`) — not opaque labels like `Garbage`, `Bad`, or `Invalid` without saying invalid-how.

### Vitest (unit, component, integration)

**Shape:** `<StateUnderTest>_<ExpectedBehavior>` — two PascalCase tokens separated by a single underscore. The unit under test is carried by the enclosing `describe(...)`, NOT repeated in the `it()` name.

Literal identifiers from production code (enum values, exported constants, type names, CSS class strings) MAY appear in their native casing within a token. Parameterized tests MAY interpolate the parameter into either part as long as the resulting string still parses as `<State>_<Behavior>` on a single underscore.

```ts
// ✅ Good — unit test (utility function)
describe('fromDb', () => {
  it('InputPrivate_ReturnsOWNER', ...)
  it('InputUnlisted_ReturnsLINK', ...)
  it('UnknownInput_ThrowsUnknownVisibilityValueError', ...)
});

// ✅ Good — component / helper test
describe('buttonClasses', () => {
  it('PrimaryDefaultSize_ReturnsBtnPrimary', ...)
  it('PrimarySizeSm_ReturnsBtnPrimaryBtnSm', ...)
  it('ExtraEmpty_ElidesNoTrailingSpace', ...)
});

// ✅ Good — DAL / action test
describe('guardListViewable', () => {
  it('NullListAuthedViewer_RedirectsToLists', ...)
  it('OwnerBlockedViewer_RedirectsToLists', ...)
});

// ✅ Good — parameterized
for (const variant of VARIANTS) {
  it(`Variant${cap(variant)}DefaultSize_ReturnsBtn${cap(variant)}`, ...)
}

// ❌ Bad — vacuous templates
it('should work correctly', ...)
it('renders properly with default props', ...)
it('basic navigation', ...)
it('decodes private correctly', ...) // unstructured prose

// ❌ Bad — structured but imprecise (violates precision principle)
it('InputGarbage_Throws', ...)              // what does "Garbage" mean? Throws what?
it('BadInput_ThrowsError', ...)             // bad how? ThrowsError adds nothing over Throws
it('PrimaryVariant_Renders', ...)           // renders what?
it('InvalidDate_ReturnsError', ...)         // invalid how? ReturnsError is vague
// ✅ Same tests, precise:
it('UnknownInput_ThrowsUnknownVisibilityValueError', ...)
it('EmptyString_ThrowsUnknownVisibilityValueError', ...)
it('PrimaryVariant_RendersBtnPrimaryClass', ...)
it('DateMissingDayComponent_ThrowsZodValidationError', ...)
```

### Vitest describe blocks

Describe blocks play three distinct roles, each with its own naming rule:

- **Module describe** (outermost, optional) — the module, component, or file under test, in its **natural source casing**: `'visibility'`, `'buttonClasses'`, `'NumericInput'`, `'listAccess'`. Use whatever the file/module is named in code.
- **Function describe** (names a specific exported function or method) — the function's **native identifier casing**: `'fromDb'`, `'guardListViewable'`, `'visibilityDbValues'`. Use whatever the function is named in code.
- **Scenario-family describe** (groups cases by input or output condition) — a **single PascalCase tag** with no spaces, punctuation, or special characters: `'LegacyDbStrings'`, `'UnknownInputs'`, `'WhitespaceContract'`, `'VariantSizeMatrix'`, `'FalsyExtra'`. Underscores MAY separate genuinely distinct concepts (`'SSR_NoWindow'`) but prefer a single tag. The tag MUST name what UNIFIES the group — the precision principle extends here.

Additional rules:

- **Do NOT repeat** the outer module name inside an inner describe (no `describe('utils > formatCurrency', ...)`, no nested `describe('utils', () => describe('utilsFormatCurrency', ...))`).
- A test file exporting a single function MAY collapse to a single top-level `describe(<functionName>, ...)` without an outer module describe.
- Scenario-family describes are NOT subject to the no-repeat rule because they do not name the unit.

```ts
// ✅ Good — three layers, each in its own role
describe('visibility', () => {
  describe('fromDb', () => {
    describe('LegacyDbStrings', () => {
      it('InputPrivate_ReturnsOWNER', ...)
      it('InputUnlisted_ReturnsLINK', ...)
    });
    describe('UnknownInputs', () => {
      it('UnknownInput_ThrowsUnknownVisibilityValueError', ...)
      it('EmptyString_ThrowsUnknownVisibilityValueError', ...)
    });
  });
});

// ✅ Good — single-function file collapses the module layer
describe('buttonClasses', () => {
  describe('VariantSizeMatrix', () => { ... });
  describe('FalsyExtra', () => { ... });
  describe('WhitespaceContract', () => { ... });
});

// ❌ Bad — prose scenario family
describe('variant × size matrix', () => { ... })   // special chars, spaces
describe('legacy DB strings', () => { ... })       // spaces, mixed case
describe('whitespace contract', () => { ... })     // spaces

// ❌ Bad — vacuous scenario family (precision principle)
describe('Misc', () => { ... })          // unifies what?
describe('Various', () => { ... })       // unifies what?
describe('Other', () => { ... })         // unifies what?
describe('EdgeCases', () => { ... })     // which edges? Use FalsyExtra,
                                         //   EmptyArray, MaxLengthString, etc.
```

### Playwright (E2E)

**Shape:** `<PageOrFlow>_<Action>_<ExpectedOutcome>` — three PascalCase tokens separated by single underscores. Playwright names SHALL be self-contained because failure output and HTML reports surface the test name without consistent describe-path nesting; removing a surrounding `test.describe` SHALL NOT make any test name ambiguous.

```ts
// ✅ Good
test('Dashboard_NavigateToCurrentMonth_ShowsBudgetGroups', ...)
test('ListPage_AddItem_AppearsInList', ...)
test('SignIn_BypassEnabled_RendersProtectedPage', ...)

// ❌ Bad
test('should sign in', ...)
test('basic navigation works', ...)
test('list creation', ...)
```

The normative statement of the naming convention lives in the `testing-foundation` capability spec (same location as the substance bar above).
