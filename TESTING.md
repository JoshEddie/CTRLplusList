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

## Shared setup belongs in a fixture, not duplicated or merged away

When sibling tests need the *same* Arrange (identical seed, mocks, render), hoist it into the enclosing `describe`'s `beforeEach`. Do NOT copy the setup inline into each test, and do NOT collapse distinct triggers into one multi-assert test just to write the setup once. Both shortcuts are wrong, in opposite directions:

- **Duplicated inline setup** violates DRY (see [CLAUDE.md](CLAUDE.md)) — the same seed pasted into N bodies drifts and rots.
- **Merging the triggers** violates one-test = one-trigger (see *Test naming convention → Vitest*) and forfeits failure isolation: the first failed `expect` aborts the test, so a regression in the first trigger hides whether the rest still hold.

A `beforeEach` resolves both: setup is written once, each trigger stays its own test (granular spec-line name, independent pass/fail), and the shared world is named at the top of the block. A test's identity is its Act + Assert, not its Arrange — shared Arrange is a fixture concern, never a reason to fuse two triggers.

Use `beforeEach`, not `beforeAll`, for any state a test reads as fresh — DB rows especially. This repo's DB tests reset the database in a file-level `beforeEach`, so a `beforeAll` seed is wiped before the first test runs; more broadly, `beforeAll` couples tests through shared mutable state and leaks one test's writes into the next. Reserve `beforeAll` for immutable, expensive-to-build resources (a booted in-memory DB, a compiled bundle).

```ts
// ❌ Duplicated Arrange across siblings
it('UserFollows_ReturnsTrue', async () => {
  await seedUsers(db, [{ id: 'alice' }, { id: 'bob' }]);
  await seedFollow(db, 'alice', 'bob');
  expect(await isFollowing({ userId: 'alice', followeeId: 'bob' })).toBe(true);
});
it('UserDoesNotFollowBack_ReturnsFalse', async () => {
  await seedUsers(db, [{ id: 'alice' }, { id: 'bob' }]); // same Arrange, copied
  await seedFollow(db, 'alice', 'bob');
  expect(await isFollowing({ userId: 'bob', followeeId: 'alice' })).toBe(false);
});

// ✅ One fixture; distinct triggers stay distinct tests
describe('isFollowing', () => {
  beforeEach(async () => {
    await seedUsers(db, [{ id: 'alice' }, { id: 'bob' }, { id: 'carol' }]);
    await seedFollow(db, 'alice', 'bob');
  });
  it('UserFollows_ReturnsTrue', async () =>
    expect(await isFollowing({ userId: 'alice', followeeId: 'bob' })).toBe(true));
  it('UserDoesNotFollowBack_ReturnsFalse', async () =>
    expect(await isFollowing({ userId: 'bob', followeeId: 'alice' })).toBe(false));
});
```

Threshold: this is CLAUDE.md's duplication judgment (weight · drift · count), and it governs both placements — a `beforeEach` when the sharers live in one file, a colocated `__tests__/test-helpers.tsx` when they span files. A single shared line can stay inline; extract when the Arrange is non-trivial, when three-plus tests key off it, or when it would **drift silently**. Fixtures lean toward extract earlier than ordinary code: a stale fixture doesn't fail, it makes a test pass while quietly exercising the wrong thing — so a typed, multi-field factory reused even twice is usually worth one home. (A typed factory is partly self-policing — TypeScript breaks every copy when the *shape* changes — but **value** drift, a changed default, is silent and uncaught: that's the hazard.)

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

### A small source change often beats an ignore — even when the code is good

Option (b) does not require the branch to be *bad*. The trap is good production code that is merely expensive to reach: an LRU cap that only evicts after N entries, a retry that only fires after a timeout, a guard keyed off a hardcoded constant. Reaching for `/* v8 ignore */` here pulls working code out of the regression net precisely where a future edit could silently break it.

Before ignoring, ask whether a small change makes the code reachable from a test **without changing what production does**. Turning a hardcoded constant into a config value — read from env, defaulting to the same number — is the canonical move: the test sets it low and exercises the branch in a few calls, while production keeps the original default.

```ts
// ❌ Reflexive ignore — the eviction is good code, just costly to reach (needs 500 entries)
const CACHE_MAX_ENTRIES = 500;
/* v8 ignore next 3 -- eviction needs 500 cached entries, unreachable in a test */
if (cache.size >= CACHE_MAX_ENTRIES) {
  /* evict oldest */
}

// ✅ Make the bound a real config knob; the test sets it to 2 and drives eviction in 3 calls
const CACHE_MAX_ENTRIES = Number(process.env.CACHE_MAX_ENTRIES) || 500;
if (cache.size >= CACHE_MAX_ENTRIES) {
  /* evict oldest */
}
```

The seam must be a **genuine** config or behavior surface, not a test-only backdoor. A tunable cache bound is a real ops knob and behaves identically whether prod or a test sets it; `if (process.env.NODE_ENV === 'test') skipAuth()` is a forbidden backdoor (see the no-backdoor rule). If the only seam you could add would be a test-only branch, don't add it — fall through to (c).

Reserve `/* v8 ignore */` for code that is genuinely unreachable (a defensive guard whose condition turns on an invariant established *outside* the function — framework lifecycle, platform, a third-party/DB contract — the compiler can't prove) or truly external (a third-party error path you cannot provoke). "Hard to set up" is a signal to push harder on (a) or (b), not a reason for (c).

An ignore over a **redundant guard** is never valid (b), not (c). A redundant guard re-tests a condition the function's own earlier control flow already decided — an upstream guard or branch that already excluded the case (see `Redundant guards` in [CLAUDE.md](CLAUDE.md)). It is dead code, not unreachable code: the fix is to remove it and let any narrowing flow from the existing control flow, never to ignore it. **Tell:** a rationale that cites the function's own earlier code ("the guard above already redirects…") is describing a redundant guard. Contrast the legitimate defensive guard above, whose invariant is external and so can never name a local cause.

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

Test-only fixtures and helpers (anything imported only by `*.test.*` files) SHOULD live inside the same `__tests__/` directory as the tests that use them. Kept there, the `**/__tests__/**` and `**/*.test.*` entries already in `vitest.config.ts`'s `coverage.exclude` keep them out of the coverage report automatically — no per-file exclude entry is needed. A helper placed *outside* a `__tests__/` directory MUST be excluded explicitly.

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

**Shape:** `<State>_<Behavior>(-<Behavior>)*` — a **single underscore** marks the one state│behavior boundary.

- **State = a single PascalCase token.** Compound state is NOT written in the `it()` name; hoist it into nested `describe(...)` blocks (even if used once). The unit under test is likewise carried by the describe, not repeated in the `it()`.
- **Behavior = one PascalCase token, or several dash-joined facets** when a single trigger produces multiple observable effects. Order facets primary → secondary; trailing side-effects (toast, refresh, log) come last: `CallsFollowUser-ToastSuccess-RouterRefresh`.
- Literal identifiers from production code (enum values, constants, type names, CSS class strings) MAY keep native casing within a token (`ReturnsOWNER`). Parameterized tests MAY interpolate the parameter, and `it.each` printf placeholders (`%s`, `%#`) are allowed, as long as the result still parses on the boundary underscore.

**Lint-enforced vs. manual bar.** `eslint-plugin-vitest`'s `vitest/valid-title` (at `error`, in the `**/*.test.{ts,tsx}` block of `eslint.config.mjs`) enforces the mechanical *shape*: the single boundary underscore, single-token state, dash-joined PascalCase behavior facets, no prose, and identifier-form describe titles. A green lint means "structurally valid", NOT "well-named". A regex cannot judge the rest — these stay a manual / review bar:

- **Token role** — a pattern can't tell a State from a Behavior, so `State_State` (two states — should be a `describe`) and `Behavior_Behavior` pass lint. Keep the left token a genuine state.
- **Precision** (see the precision principle above).
- **One test = one trigger.** Assert all of a single trigger's effects together (dash-joined); a single-trigger compound is NOT split — splitting only duplicates setup. Split only when a title would span multiple distinct triggers (actions). The discriminator is the number of triggers, not the number of dashes.

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

// ✅ Good — single trigger, multiple effects: dash-joined, side-effects last
it('ClickFollow_OptimisticFlip-CallsFollowUser-ToastSuccess-RouterRefresh', ...)

// ✅ Good — compound state hoisted into describes, single-token state in it()
describe('NonPurchase', () => {
  describe('WithSetter', () => {
    it('Click_InvokesSetterWithTrue', ...)
    it('Render_ShowsPrimaryButton', ...)
  });
});

// ❌ Bad — compound state in the it() name (second underscore) → use describes
it('NonPurchase_WithSetter_InvokesSetterWithTrue', ...)
// ❌ Bad — role confusion: both tokens are state (passes lint, fails review)
it('NonPurchase_WithSetter', ...)
// ❌ Bad — single-trigger effects split into separate tests (duplicates setup)
it('ClickFollow_CallsFollowUser', ...)
it('ClickFollow_ToastSuccess', ...)   // same click — assert together, dash-joined

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
- Describe titles are **lint-enforced** to contain no whitespace or punctuation (identifier/tag form, `[A-Za-z0-9_$]`). The dash is the behavior-facet joiner in `it`/`test` names only — it is not allowed in describe titles. Role correctness (module vs function vs scenario-family) and tag precision remain a manual bar.

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
