## Why

Three pieces of debt accumulated during the `test-button-system` (3.1) carve-out are at risk of compounding as the remaining 33 `test-coverage` sub-proposals land:

1. **Spec drift on test file location.** `test-button-system` introduced a `__tests__/` directory convention (documented in `TESTING.md`) and placed its new tests there. But the in-flight `testing-foundation` spec delta in the active `test-coverage` change still mandates the older `<source>.test.<ext>` colocation pattern — line 22 reads "Test files SHALL be colocated… (e.g., `Button.tsx` → `Button.test.tsx`)" with a corresponding scenario at line 26–27. The next sub-proposal inherits a contradiction: TESTING.md says one thing, the spec another.
2. **Six pre-`__tests__/` files still sit alongside production siblings.** Authored before the convention was adopted: `lib/{visibility,listAccess,sqlstate}.test.ts`, `hooks/use-media-query.test.tsx`, `hooks/use-media-query.server.test.ts`, `app/ui/components/button/buttonClasses.test.ts`. Mechanical relocation; deferring grows linearly with every new test that lands.
3. **Per-file coverage thresholds vary by file with no shared discipline.** Today: pure libs at `95/95/95/80` (lines/statements/functions/branches), Button primitives at `90/90/90/90`, `use-media-query.ts` at `90/50/80/95`. The current `testing-foundation` spec rationalizes this as a tiered table by file class (95 pure / 90 primitive / 80 DAL+actions+routes / 60 page UI / 60 page entries) — but in practice the tiers function as backdoors. A 60% floor is barely a gate, and per-file numeric variation makes it impossible to read `vitest.config.ts` and answer "what is the bar." The sharpest gap: `functions` is below 100% everywhere, which means complete exported functions can ship without a single invoking test. Also surfaced mid-investigation: `lib/sqlstate.ts` has a test file but **no** per-file threshold entry — it's measured but not enforced today.

Inherited constraints surfaced by spec-grep:

- `testing-foundation` (active delta in `openspec/changes/test-coverage/specs/testing-foundation/spec.md`; archived deltas in `test-foundation`, `test-foundation-spike`, `test-pure-libs`, `test-button-system`) — runner choice (vitest 4.x), four-gate pre-merge (`lint` / `tsc --noEmit` / `build` / `test`), `__tests__/` colocation as decided by `test-button-system` but NOT YET reflected in the in-flight delta, the per-file coverage discipline (currently tiered, replaced here), the `<State>_<Behavior>` `it()` shape, the three-role `describe()` convention, four-audit obligation, assertion-substance bar, `sonarjs/cognitive-complexity` warn-globally / error-per-carve-out policy. Every other requirement applies verbatim.
- Cross-cutting design-system rules do NOT apply — this change touches no interactive surface, no server-side read, no cache tag.
- Parent `test-coverage` change owns the broader trajectory: this sub-proposal lands the housekeeping; it does NOT close any of the 3.x / 4.x / 5.x / 6.x carve-out checkboxes.

## What Changes

- **MODIFIED** `testing-foundation` spec (delta against the in-flight delta in `test-coverage`):
  - REPLACE the colocation Requirement and its scenarios so tests SHALL live in a `__tests__/` directory adjacent to the module they test, matching the convention `TESTING.md` already documents. Test-only helpers SHALL live in the same `__tests__/` directory.
  - REPLACE the tiered per-file coverage table with a **single universal floor** applying to every enumerated file regardless of class: `lines ≥ 98%, statements ≥ 98%, branches ≥ 95%, functions = 100%`. The tier table (95 pure / 90 primitive / 80 DAL+actions+routes / 60 page UI / 60 page entries) is REMOVED.
  - ADD Requirement: a file that cannot meet the floor SHALL have either (a) new tests written until it does, or (b) an explicit `/* v8 ignore … */` annotation with a one-line rationale comment for each uncoverable region. Lowering the floor for a file SHALL NOT be an acceptable disposition.
  - ADD Requirement: `vitest.config.ts` SHALL define a single `COVERAGE_FLOOR` constant; every per-file threshold entry SHALL reference it by identity. Per-file numeric variation SHALL NOT exist.
  - ADD note on enrollment trajectory: while the parent `test-coverage` change is in flight, the per-file threshold list in `vitest.config.ts` SHALL enumerate only files with landed tests (so untested files don't fail the gate they have no opportunity to pass). When `test-coverage` archives (its task 7.3 baseline), the enumeration deletes and the floor goes universal across `coverage.include`.

- **NEW** in `vitest.config.ts`:
  - Hoisted `COVERAGE_FLOOR` constant: `{ lines: 98, statements: 98, branches: 95, functions: 100 }`.
  - All seven enumerated entries reference the constant: `lib/visibility.ts`, `lib/listAccess.ts`, **`lib/sqlstate.ts`** (newly added — currently measured but not enforced), `hooks/use-media-query.ts`, `app/ui/components/button/buttonClasses.ts`, `app/ui/components/button/Button.tsx`, `app/ui/components/button/LinkButton.tsx`.

- **MOVED** test files into `__tests__/` directories with import-path fixes (`./X` → `../X`):
  - `lib/visibility.test.ts` → `lib/__tests__/visibility.test.ts`
  - `lib/listAccess.test.ts` → `lib/__tests__/listAccess.test.ts`
  - `lib/sqlstate.test.ts` → `lib/__tests__/sqlstate.test.ts`
  - `hooks/use-media-query.test.tsx` → `hooks/__tests__/use-media-query.test.tsx`
  - `hooks/use-media-query.server.test.ts` → `hooks/__tests__/use-media-query.server.test.ts`
  - `app/ui/components/button/buttonClasses.test.ts` → `app/ui/components/button/__tests__/buttonClasses.test.ts` (its existing import of `./__tests__/test-helpers` becomes `./test-helpers` since the test is now inside `__tests__/`).
  - LEFT ALONE: `test/helpers/{db,next-cache}.test.ts` (tests of test infrastructure; `test/` is a separate root-level helpers tree, not a production module needing a `__tests__/` sibling). Archived spike artifacts under `openspec/changes/archive/.../*.test.ts` are frozen and out of scope.

- **NEW** tests OR **NEW** `/* v8 ignore */` annotations as required to bring every enumerated file up to the new floor. Today's per-file numbers are below the new floor on every metric for every enumerated file (largest gap: `hooks/use-media-query.ts` at `functions: 80, branches: 50`). Each file is audited individually; the four-audit obligation from `testing-foundation` applies to any new tests written here. Disposition for each gap is recorded in `tasks.md`.

- **NO** changes to the test-substance bar, the `<State>_<Behavior>` naming shape, the `describe()` three-role convention, the four-audit obligation, the assertion-substance ESLint config, the mocking-boundary rules, the seed-as-fixture rules, or any other `testing-foundation` requirement not enumerated above.

- **NO** runtime behavior change. No production source files are touched except where a `/* v8 ignore … */` annotation is the chosen disposition for an uncoverable region (annotations are coverage-tool comments only; they do not affect runtime).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `testing-foundation`: see the detailed list under "What Changes" — colocation requirement, coverage-floor requirement, and two new requirements on floor-no-backdoor + COVERAGE_FLOOR constant. This capability is NOT YET promoted to `openspec/specs/testing-foundation/spec.md`; it lives as a delta inside the active `test-coverage` change. This change's delta therefore amends the in-flight delta, not a promoted spec. When `test-coverage` eventually archives, the two deltas consolidate.

## Impact

- **Modified config:** `vitest.config.ts` — hoist `COVERAGE_FLOOR`, replace seven per-file threshold blocks to reference it, add `lib/sqlstate.ts` entry. No coverage `include` / `exclude` changes.
- **Moved files:** six test files relocated into `__tests__/` directories. Relative imports updated. Production source unaffected (paths in `vitest.config.ts`'s `coverage.include` are by production path, not test path, so no config change needed for the move itself).
- **Modified source (test-driven only):** any production file that requires a `/* v8 ignore … */` annotation to legitimately meet the new floor (e.g., defensive `throw new Error('unreachable')` clauses, SSR fallback branches in `hooks/use-media-query.ts`). Each annotation carries a one-line rationale comment per the spec's no-backdoor requirement.
- **New tests:** zero, one, or many — driven by each file's gap-closure audit (recorded in `tasks.md`). Smallest realistic case: zero new tests, several `/* v8 ignore */` annotations. Largest: rewrites of `use-media-query.test.tsx` to cover the SSR-fallback and listener-cleanup paths currently at 80% / 50%.
- **Spec edits:** `openspec/changes/test-coverage/specs/testing-foundation/spec.md` is amended via this change's `specs/testing-foundation/spec.md` delta. The pattern matches how `test-button-system` and `test-pure-libs` amended the same in-flight delta — those edits are the precedent.
- **TESTING.md:** no changes — already describes the `__tests__/` convention; this change brings the spec into alignment with the doc, not the other way around.
- **CI:** the existing four-gate workflow runs unchanged. The `test` job runtime grows by any new tests added for gap closure (expected: seconds at this scale).
- **Dependencies:** none added.
- **Downstream:** every remaining `test-*` sub-proposal inherits the universal floor and the `__tests__/` convention. The shared `COVERAGE_FLOOR` constant means subsequent carve-outs add their files to the threshold list as one-liners; no per-file judgment call on what floor to use.
- **Risk:** medium. The biggest concrete risk is that `hooks/use-media-query.ts`'s SSR / cleanup paths are genuinely hard to exercise in jsdom — disposition may end up as `/* v8 ignore */` rather than new tests. That's an acceptable outcome under the spec's no-backdoor rule (the annotation is reviewable and visible forever), but it's a values check: if any reviewer feels the annotations are accumulating, that's signal to write the tests instead.
- **No runtime behavior change.**
