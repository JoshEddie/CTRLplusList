## MODIFIED Requirements

### Requirement: Test files SHALL colocate with source under a consistent layout

Test files SHALL be colocated with the source they test, but SHALL live inside a `__tests__/` directory adjacent to the source module — NOT alongside it. The colocation principle (tests stay next to the code they exercise) is preserved; the `__tests__/` folder keeps source-directory listings focused on production files and groups multiple tests for the same module without polluting the parent directory. The file-naming pattern remains `<source>.test.<ext>` (e.g., `Button.tsx` → `__tests__/Button.test.tsx`).

End-to-end tests SHALL live under a top-level `e2e/` directory. Cross-module shared fixtures SHALL live under `test/fixtures/`. Cross-module shared helpers and custom matchers SHALL live under `test/helpers/`. Test-only helpers used by tests within a single `__tests__/` directory SHALL live inside that same `__tests__/` directory (e.g., `app/ui/components/button/__tests__/test-helpers.ts`); they SHALL NOT be hoisted to `test/helpers/` unless a second `__tests__/` directory begins importing them. Per-test-file fixtures or helpers that are not reused SHALL stay inline; only repeated patterns extract.

Test-only files inside `__tests__/` directories (including local `test-helpers.*` modules) SHALL NOT appear in coverage reports — `vitest.config.ts`'s `coverage.exclude` SHALL contain a `**/__tests__/**` glob that covers them.

#### Scenario: Component test colocation under __tests__/

- **WHEN** a contributor adds tests for `app/ui/components/button/Button.tsx`
- **THEN** the tests live at `app/ui/components/button/__tests__/Button.test.tsx`
- **AND** the test imports the production module via a parent-relative specifier (`import { Button } from '../Button'`)

#### Scenario: Hook test colocation under __tests__/

- **WHEN** a contributor adds tests for `hooks/use-media-query.ts`
- **THEN** the tests live at `hooks/__tests__/use-media-query.test.tsx`
- **AND** server-side variants live at `hooks/__tests__/use-media-query.server.test.ts`

#### Scenario: Local test helper colocation

- **WHEN** two test files inside `app/ui/components/button/__tests__/` need the same render helper
- **THEN** the helper lives at `app/ui/components/button/__tests__/test-helpers.ts`
- **AND** both tests import it via `import { ... } from './test-helpers'`
- **AND** the helper is NOT reported in coverage (matched by `**/__tests__/**` exclude)

#### Scenario: Cross-module helper extraction

- **WHEN** the same helper is needed by tests inside two different `__tests__/` directories (e.g., a DB fixture used by both `lib/__tests__/visibility.test.ts` and `app/actions/__tests__/lists.test.ts`)
- **THEN** the helper extracts to `test/helpers/` (or `test/fixtures/` for fixture data) and both tests import from the extracted location

#### Scenario: E2E test placement

- **WHEN** a contributor adds a Playwright test for the list-creation flow
- **THEN** the spec lives under `e2e/` (e.g., `e2e/list-creation.spec.ts`)
- **AND** it does NOT live under any `__tests__/` directory

### Requirement: Coverage SHALL be enforced per-file with a single universal floor

Coverage SHALL be measured and enforced per file, not as a layer or repo-wide aggregate. There SHALL be exactly one floor applying to every enumerated file regardless of file class:

| Metric | Floor |
| --- | --- |
| Lines | 98% |
| Statements | 98% |
| Branches | 95% |
| Functions | **100% (non-negotiable)** |

The `functions: 100%` floor is non-negotiable: an uninvoked exported function is a real test gap, not slop. Dead code SHALL be deleted, not protected by a lower floor.

Files excluded from coverage enforcement (informational only): `*.d.ts`; generated drizzle artifacts under `drizzle/`; `app/sw.ts`; `app/manifest.ts`; test files themselves and their `__tests__/` siblings (matched by `**/__tests__/**`); barrel `index.ts` re-exports of zero runtime behavior (matched by `app/ui/components/*/index.ts` — NOT a global `**/index.ts`, which would silently exclude `db/index.ts` and other top-level index modules that carry runtime); type-only `**/types.ts`; layout files without branching logic. The narrow scope of the index-barrel exclude is invariant: a `**/index.ts` exclude SHALL NOT be introduced.

While the parent `test-coverage` change is in flight, the per-file threshold list in `vitest.config.ts` MAY enumerate only files with landed tests (so files in untested carve-outs do not fail the gate they have no opportunity to pass). When the parent `test-coverage` change archives, the per-file enumeration SHALL be removed and the floor SHALL apply universally across `coverage.include` — at that point, every file in `coverage.include` (subject to `coverage.exclude`) is gated against the universal floor.

Each test sub-proposal SHALL enforce the coverage floor on every file in its declared carve-out at archive time. A repo-wide coverage report SHALL be generated for visibility but SHALL NOT gate merge until the parent `test-coverage` change archives.

#### Scenario: Functions floor is non-negotiable

- **WHEN** a sub-proposal's carve-out includes a file with an exported helper that has no invoking test
- **THEN** the file's `functions` coverage metric is below 100%
- **AND** the pre-merge `test` gate fails
- **AND** the disposition is to write the missing test OR delete the unreachable function — NOT to lower the floor

#### Scenario: Small helper cannot hide behind fat file

- **WHEN** a sub-proposal's carve-out includes both a 500-line component and a 30-line helper
- **THEN** coverage is computed per file
- **AND** the 30-line helper meeting the floor is checked independently of the 500-line component meeting the floor
- **AND** an aggregate average across the two does NOT satisfy the gate

#### Scenario: Per-file enumeration during test-coverage flight

- **WHEN** the parent `test-coverage` change is in flight (not yet archived) and a contributor adds the file `app/(main)/lists/page.tsx` to production without writing tests for it yet
- **THEN** the file does NOT appear in `vitest.config.ts`'s per-file threshold enumeration
- **AND** the pre-merge `test` gate does NOT fail on that file
- **AND** the file's coverage gap is captured in the parent change's task list awaiting its carve-out sub-proposal

#### Scenario: Enumeration deletes at test-coverage archive

- **WHEN** the parent `test-coverage` change archives via its task 7.3 baseline
- **THEN** the per-file enumeration in `vitest.config.ts` is removed
- **AND** the universal floor applies to every file matched by `coverage.include` and not excluded by `coverage.exclude`

#### Scenario: Index-barrel exclude is narrow

- **WHEN** a contributor proposes adding `**/index.ts` to `coverage.exclude`
- **THEN** the proposal is rejected
- **AND** the only acceptable index-barrel exclude is `app/ui/components/*/index.ts` (zero-runtime re-exports under the primitive-family convention)
- **AND** `db/index.ts` (which carries Drizzle init) is NOT excluded

## ADDED Requirements

### Requirement: Files SHALL meet the universal floor via tests or annotated excludes — never a lowered floor

A file enumerated in `vitest.config.ts`'s per-file thresholds SHALL meet the universal floor (`lines: 98, statements: 98, branches: 95, functions: 100`). When a region of source is genuinely uncoverable (e.g., a defensive `throw` on an unreachable branch, an SSR-only fallback that cannot execute in jsdom, a `try/catch` whose `catch` block guards against a condition the runtime contract forbids), the disposition SHALL be exactly one of:

- **(a)** Write the test that exercises the region; OR
- **(b)** Mark the region with `/* v8 ignore next */` (or `/* v8 ignore start */ … /* v8 ignore stop */` for multi-line regions) and an immediately-preceding one-line comment naming the specific reason the region is uncoverable.

Lowering the floor for a file (or class of files) SHALL NOT be an acceptable disposition. Adding a TODO, follow-up issue, or unaddressed note SHALL NOT be an acceptable disposition. The reviewer of any PR that introduces a `/* v8 ignore */` annotation SHALL verify the rationale comment is specific (names what makes the region uncoverable, not "for coverage") before approving.

#### Scenario: Test-first disposition

- **WHEN** a file is at 97% statements coverage because one error-path branch is not yet exercised
- **THEN** the disposition is to write the test exercising that branch
- **AND** the floor is NOT lowered to 97% to accommodate the gap

#### Scenario: Annotated exclude with rationale

- **WHEN** a file contains a `throw new Error('unreachable: TS exhaustiveness has narrowed all cases')` that cannot be reached at runtime without violating the function's typed contract
- **THEN** the line is preceded by a one-line comment naming the typed-contract guarantee
- **AND** the line carries `/* v8 ignore next */`
- **AND** the file's coverage report shows the line as ignored, not counted against the floor

#### Scenario: Floor-lowering rejected

- **WHEN** a sub-proposal proposes lowering a file's `branches` floor from 95 to 90 to accommodate an uncovered branch
- **THEN** the proposal is rejected at review
- **AND** the disposition options are (a) write the test or (b) annotate with `/* v8 ignore */` + rationale

#### Scenario: Vague rationale rejected

- **WHEN** a PR introduces `/* v8 ignore next */` with a preceding comment of "// coverage" or "// can't test"
- **THEN** the reviewer requests a specific rationale (what runtime contract, what branch, why unreachable)
- **AND** the PR is not approved until the comment names the specific reason

### Requirement: Per-file thresholds SHALL reference a single shared COVERAGE_FLOOR constant

`vitest.config.ts` SHALL define exactly one coverage-floor object — `const COVERAGE_FLOOR = { lines: 98, statements: 98, branches: 95, functions: 100 } as const;` — at module scope. Every per-file entry in `test.coverage.thresholds` SHALL reference this constant by identity (the object reference, not a copy). Per-file numeric variation SHALL NOT exist: a contributor reading the config SHALL be able to answer "what is the bar" in one read.

If a future need arises to vary thresholds by file (e.g., a file class with a documented exception), the variation SHALL be introduced as a SECOND named constant with a comment naming the exception's rationale — never as inline numeric overrides scattered across the threshold list.

#### Scenario: Single source of truth

- **WHEN** a contributor reads `vitest.config.ts`
- **THEN** exactly one `COVERAGE_FLOOR` (or named-variant) constant is visible at module scope
- **AND** every per-file threshold entry reads as `'<path>': COVERAGE_FLOOR,`

#### Scenario: Inline numeric override rejected

- **WHEN** a PR introduces a per-file entry like `'lib/foo.ts': { lines: 95, statements: 95, branches: 80, functions: 90 }`
- **THEN** the PR is rejected at review
- **AND** the contributor either (a) writes the tests/annotations needed to use `COVERAGE_FLOOR` or (b) introduces a named-exception constant with a rationale comment

#### Scenario: Adding a new tested file

- **WHEN** a future sub-proposal lands tests for `app/actions/lists.ts`
- **THEN** the sub-proposal adds exactly one line to `vitest.config.ts`: `'app/actions/lists.ts': COVERAGE_FLOOR,`
- **AND** the contributor makes no judgment call on threshold values
