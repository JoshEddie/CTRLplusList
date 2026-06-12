# testing-foundation Specification

## Purpose

Govern the repository's test suite as a system: the pre-merge gate, runner and
layout conventions, fixture and mocking boundaries, the universal per-file
coverage floor, the cognitive-complexity gate, test-substance and naming bars,
the per-carve-out audit obligation, the data-layer integration harness, and
the e2e execution model. Created by archiving change `enforce-test-title-lint`;
completed at the `test-coverage` program's close-out, when the Tier-1
foundation rules accumulated across its sub-proposals (per that change's
design D13) rolled up here. Carve-out bookkeeping (which slice was tested
when) lives only in the archived sub-proposals.

## Requirements

### Requirement: Test suite SHALL exist and SHALL run as a pre-merge gate

The repository SHALL include an automated test suite executed via `npm test`. The `test` command SHALL exit non-zero if any test fails, and the pre-merge gate SHALL block merge on a non-zero exit. The pre-merge gate SHALL consist of four required tasks executed independently: `lint`, `tsc --noEmit`, `build`, and `test`. The `test` gate SHALL be encoded as a required task alongside the existing three in `openspec/config.yaml`'s `tasks` rule, and every `tasks.md` written after this capability is established SHALL include the four-gate pre-merge section with separately-checkable items.

#### Scenario: Failing test blocks merge

- **WHEN** any test in the suite fails on a branch under review
- **THEN** `npm test` exits non-zero
- **AND** the pre-merge gate fails
- **AND** the four-gate pre-merge section of the change's `tasks.md` cannot be checked complete

#### Scenario: Pre-merge tasks are separately checkable

- **WHEN** a contributor writes a new `tasks.md` after the testing-foundation capability is established
- **THEN** the pre-merge section contains four discrete tasks (one per gate)
- **AND** partial failure (e.g., test fails but lint passes) is visible in the checklist

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

- **WHEN** the same helper is needed by tests inside two different `__tests__/` directories (e.g., a DB fixture used by both `lib/__tests__/visibility.test.ts` and `lib/data/__tests__/list.actions.test.ts`)
- **THEN** the helper extracts to `test/helpers/` (or `test/fixtures/` for fixture data) and both tests import from the extracted location

#### Scenario: E2E test placement

- **WHEN** a contributor adds a Playwright test for the list-creation flow
- **THEN** the spec lives under `e2e/` (e.g., `e2e/list-creation.spec.ts`)
- **AND** it does NOT live under any `__tests__/` directory

### Requirement: Tests SHALL NOT call rate-limited external services

Tests SHALL mock the network boundary of any external service whose real provider imposes a quota, charges money per call, or requires interactive credentials. Known boundaries in this category at the time of writing: the `app/api/image-search` upstream provider, NextAuth Google OAuth, and any third-party service added later. The mocks SHALL replace the network call (e.g., `fetch` interception, MSW handlers, or framework-equivalent), NOT internal application modules. Internal modules — DAL functions, server actions, `lib/`, hooks — SHALL NOT be mocked when their dependencies are local; integration tests SHALL exercise them against the real test database.

#### Scenario: Image-search upstream is mocked

- **WHEN** a test exercises `GET /api/image-search`
- **THEN** the upstream image provider's network endpoint is intercepted at the `fetch` boundary
- **AND** the test asserts on the route's auth + rate-limit + response-shape behavior against the intercepted response
- **AND** no real call to the upstream provider occurs in CI or local runs

#### Scenario: NextAuth is not invoked against real Google

- **WHEN** a test requires an authenticated session
- **THEN** the test uses the local-mode auth bypass (`USE_PG_DRIVER=1`, with the `BYPASS_SESSION_USER` identity selector — see the e2e execution-model requirements below) or an equivalent fixture
- **AND** no OAuth handshake to a real Google endpoint occurs

#### Scenario: DAL functions are not mocked from action tests

- **WHEN** a server-action test exercises a mutation that calls a DAL read
- **THEN** the test runs against the real test database (per the DB-under-test choice)
- **AND** the DAL function is NOT mocked or stubbed

### Requirement: Seed-as-fixture for E2E SHALL be versioned and audited for negative cases

`scripts/seed-dev-users.ts` SHALL serve as the canonical E2E fixture. E2E tests MAY assert against the seeded entities. Changes to the seed SHALL be treated as breaking changes to the E2E suite — the seed file SHALL carry a header comment after the testing-foundation capability is established noting that any edit MUST be accompanied by review of E2E specs that depend on the affected entities. Before the testing-foundation capability is established, an audit SHALL determine whether the seed covers negative cases required by E2E (lists owned by other users that `dev-test-viewer` SHOULD NOT see, etc.) and either (a) extend `seed-dev-users.ts` with the missing cases, or (b) add a parallel `scripts/seed-e2e-fixtures.ts` for cases that would pollute dev UX.

#### Scenario: Seed change requires E2E review

- **WHEN** a contributor modifies `scripts/seed-dev-users.ts` after the testing-foundation capability is established
- **THEN** the change description identifies which E2E specs depend on the modified entities
- **AND** those specs are reviewed for required updates as part of the same change

#### Scenario: Negative-case audit deliverable

- **WHEN** the `test-foundation-spike` sub-proposal completes
- **THEN** its deliverables include a written audit identifying any visibility/authorization negative case not currently reachable from the seed
- **AND** for each missing case, the audit specifies the disposition: extend `seed-dev-users.ts` OR add `seed-e2e-fixtures.ts` OR accept-with-rationale

### Requirement: Coverage SHALL be enforced per-file with a single universal floor

Coverage SHALL be measured and enforced per file, not as a layer or repo-wide aggregate. There SHALL be exactly one floor applying to every enumerated file regardless of file class:

| Metric | Floor |
| --- | --- |
| Lines | 98% |
| Statements | 98% |
| Branches | 95% |
| Functions | **100% (non-negotiable)** |

The `functions: 100%` floor is non-negotiable: an uninvoked exported function is a real test gap, not slop. Dead code SHALL be deleted, not protected by a lower floor.

Files excluded from coverage enforcement (informational only): `*.d.ts`; generated drizzle artifacts under `drizzle/`; `app/sw.ts`; test files themselves and their `__tests__/` siblings (matched by `**/__tests__/**`); barrel `index.ts` re-exports of zero runtime behavior (matched by `app/**/index.ts` — scoped to `app/`, NOT a global `**/index.ts`, which would silently exclude `db/index.ts` and other top-level index modules that carry runtime; every `index.ts` under `app/` is by convention a pure re-export, and the review bar is that it stays one); type-only `**/types.ts`; layout files without branching logic; constant-data modules holding only literal data with no executable behavior (`app/ui/components/field/field-icons.tsx`, `app/changelog/releases.ts`); the NextAuth framework barrel `app/api/auth/[...nextauth]/route.ts` (matched by `app/api/auth/*/route.ts` — a pure re-export of NextAuth's handlers whose behavior is covered via `lib/auth.ts` tests). The app scope of the index-barrel exclude is invariant: a global `**/index.ts` exclude SHALL NOT be introduced.

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

#### Scenario: Index-barrel exclude is app-scoped

- **WHEN** a contributor proposes adding `**/index.ts` to `coverage.exclude`
- **THEN** the proposal is rejected
- **AND** the only acceptable index-barrel exclude is `app/**/index.ts` (app-side `index.ts` files are zero-runtime re-export barrels by convention)
- **AND** `db/index.ts` (which carries Drizzle init) is NOT excluded

### Requirement: Files SHALL meet the universal floor via tests or annotated excludes — never a lowered floor

A file matched by `coverage.include` and not excluded by `coverage.exclude` SHALL meet the universal floor (`lines: 98, statements: 98, branches: 95, functions: 100`). When a region of source is genuinely uncoverable (e.g., a defensive `throw` on an unreachable branch, an SSR-only fallback that cannot execute in jsdom, a `try/catch` whose `catch` block guards against a condition the runtime contract forbids), the disposition SHALL be exactly one of:

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

`vitest.config.ts` SHALL define exactly one coverage-floor object — `const COVERAGE_FLOOR = { lines: 98, statements: 98, branches: 95, functions: 100 } as const;` — at module scope. `test.coverage.thresholds` SHALL apply this constant universally by spreading it alongside `perFile: true` (`thresholds: { perFile: true, ...COVERAGE_FLOOR }`); per-file threshold entries SHALL NOT exist. Per-file numeric variation SHALL NOT exist: a contributor reading the config SHALL be able to answer "what is the bar" in one read.

If a future need arises to vary thresholds by file (e.g., a file class with a documented exception), the variation SHALL be introduced as a SECOND named constant with a comment naming the exception's rationale — never as inline numeric overrides scattered across the threshold list.

#### Scenario: Single source of truth

- **WHEN** a contributor reads `vitest.config.ts`
- **THEN** exactly one `COVERAGE_FLOOR` (or named-variant) constant is visible at module scope
- **AND** the `thresholds` block reads as `{ perFile: true, ...COVERAGE_FLOOR }` with no per-file entries

#### Scenario: Inline numeric override rejected

- **WHEN** a PR introduces a per-file entry like `'lib/foo.ts': { lines: 95, statements: 95, branches: 80, functions: 90 }`
- **THEN** the PR is rejected at review
- **AND** the contributor either (a) writes the tests/annotations needed to use `COVERAGE_FLOOR` or (b) introduces a named-exception constant with a rationale comment

#### Scenario: Adding a new tested file requires no config edit

- **WHEN** a future change lands tests for `lib/data/list.actions.ts`
- **THEN** no `vitest.config.ts` edit is needed — the universal floor already gates the file via `coverage.include`
- **AND** the contributor makes no judgment call on threshold values

### Requirement: Tests SHALL assert observable behavior, not execution

Every test SHALL contain at least one assertion that constrains the production code's observable behavior — a specific return value, rendered output, thrown error, network call shape, or persisted state change that would differ if the production code were subtly wrong. Tests SHALL NOT consist solely of any of the following ("execution-only" patterns):

- **Tautological assertions** — assertions that hold for any input, e.g. `expect(true).toBe(true)`, `expect(arr.length).toBeGreaterThanOrEqual(0)`, comparisons of a value against itself, `expect(x).toBeDefined()` / `expect(x).toBeTruthy()` as the only assertion on a value the test itself constructed.
- **Execute-for-coverage calls** — invoking production code without any `expect(...)` on the result, error, or side effect, written purely to lift the coverage number.
- **Snapshot-only tests** where the snapshot is the sole assertion AND the snapshot was machine-generated rather than authored against a known-correct shape.

The `test-foundation` sub-proposal SHALL enable ESLint rules that mechanically catch the most common forms: at minimum `vitest/expect-expect` (or runner-equivalent — forbids tests with no `expect`), `vitest/valid-expect`, and `vitest/no-standalone-expect`. A project-specific rule configuration SHALL additionally flag the tautology shortlist above (`.length` compared against `0` with `toBeGreaterThanOrEqual` / `toBeGreaterThan(-1)`, `toBe(true)` / `toBe(false)` against a literal of the same value, lone `toBeDefined()` / `toBeTruthy()` on a value constructed inside the test body). When the runner is not vitest, the equivalent plugin (`eslint-plugin-jest`, `eslint-plugin-jest-extended`, etc.) SHALL be substituted.

The rule SHALL land at severity `error` in `test-foundation` so the pre-merge `lint` gate enforces it from day one — there is no warn-then-promote ramp for this rule because no pre-existing tests need grandfathering.

#### Scenario: Test with no assertions fails lint

- **WHEN** a test body calls production code but contains no `expect(...)` call
- **THEN** `npm run lint` reports an `expect-expect` (or runner-equivalent) error
- **AND** the pre-merge `lint` gate fails

#### Scenario: Tautological length assertion fails lint

- **WHEN** a test asserts `expect(result.length).toBeGreaterThanOrEqual(0)` as the only assertion on `result`
- **THEN** lint reports the tautology
- **AND** the test SHALL be rewritten to assert the expected length, contents, or another observable property — or deleted if the behavior is already covered elsewhere

#### Scenario: Substantive coverage-driven test is accepted

- **WHEN** a test calls a function to exercise an uncovered branch AND asserts on its return value, thrown error, rendered output, or persisted state change
- **THEN** the test passes lint
- **AND** counts toward the per-file coverage floor

#### Scenario: Authored snapshot is accepted, machine-generated snapshot-only is not

- **WHEN** a snapshot test is the only assertion AND the snapshot file was written by running the test once and accepting whatever came out
- **THEN** the audit (see four-audits requirement) flags the test for rewrite to assert specific properties
- **AND WHEN** a snapshot is paired with at least one other assertion on the specific properties under test, OR the snapshot was hand-authored against a known-correct shape with a comment naming the contract being locked
- **THEN** the test is accepted

### Requirement: Cognitive complexity SHALL be capped at 15 per function

The project SHALL enable `eslint-plugin-sonarjs` with the `sonarjs/cognitive-complexity` rule configured at threshold 15 and severity `error`, applied globally. (Rollout history: the rule landed at `warn` globally when the capability was established, and each test sub-proposal promoted its carve-out's files to `error` via per-file `overrides` at archive time; the governing `test-coverage` change's close-out universalized the gate and removed the per-file overrides as redundant.) Per-line disables (`// eslint-disable-next-line sonarjs/cognitive-complexity`) are permitted ONLY with an accompanying comment naming the reason; bare disables SHALL be a lint error.

#### Scenario: Over-threshold function fails lint

- **WHEN** a function exceeds cognitive complexity 15 in any file
- **THEN** `npm run lint` reports a `sonarjs/cognitive-complexity` error (not a warning)
- **AND** the pre-merge `lint` gate fails

#### Scenario: Justified disable is permitted

- **WHEN** a function legitimately exceeds the threshold
- **THEN** a per-line disable comment naming the reason is accepted by lint
- **AND** a bare disable without reason fails lint

### Requirement: File size SHALL be lint-enforced as three bands

Production source files SHALL be held to the repo-wide size bands, enforced in `eslint.config.mjs`. Both rules count **lines of code** — comments and blank lines are free (`sonarjs/max-lines` counts code lines natively; the core rule is configured with `skipBlankLines`/`skipComments` to match, so the two thresholds measure the same thing):

- **Red — over 400 lines is an error.** Core `max-lines` configured at `['error', { max: 400, skipBlankLines: true, skipComments: true }]`. A red file blocks merge; the only disposition is decomposition (for data-layer modules, by table cohesion per `data-layer-organization`) — never an `eslint-disable`.
- **Yellow — 300–400 lines is a warning.** `sonarjs/max-lines` configured at `['warn', { maximum: 300 }]`. Yellow is advisory: pull easy wins where a clean extraction exists; a cohesive file MAY remain yellow indefinitely.
- **Green — under 300 lines.** The goal; no diagnostics.

Scope: the rules SHALL apply to production source (`app/**`, `lib/**`, `hooks/**`, `db/**`) and SHALL NOT apply to test files (`**/*.test.*`, `**/__tests__/**`, `test/**`, `e2e/**`), `scripts/**`, or data-literal modules already carved out of coverage (e.g. `app/changelog/releases.ts`). Test-file size remains governed by this capability's structural conventions (one lane per source module), not a line count.

Gate interaction: the pre-merge "zero warnings" lint bar SHALL be read as zero warnings **outside the yellow band** — yellow size advisories are the single deliberate warning class and do not block merge. Per-file or per-line `eslint-disable` for either size rule SHALL NOT be added.

#### Scenario: Red file blocks at lint

- **WHEN** a production source file reaches 401+ lines
- **THEN** `npm run lint` reports a `max-lines` error and pre-merge fails until the file is decomposed

#### Scenario: Yellow file warns without blocking

- **WHEN** a production source file sits between 300 and 400 lines
- **THEN** lint emits a `sonarjs/max-lines` warning, visible in lint output, and merge is not blocked

#### Scenario: Test files are exempt

- **WHEN** a `__tests__/` suite or e2e spec exceeds 500 lines
- **THEN** neither size rule fires; test structure is governed by the one-lane-per-source-module convention, not a line count

#### Scenario: No escape hatches

- **WHEN** a PR adds an `eslint-disable` (file- or line-level) for `max-lines` or `sonarjs/max-lines`
- **THEN** the PR is rejected at review; the disposition is decomposition (red) or accepting the visible warning (yellow)

### Requirement: Each test sub-proposal SHALL perform four audits and dispose of every finding

Each test sub-proposal SHALL include in its `tasks.md` an audit section, performed and recorded BEFORE the coverage-validation task, covering four audits:

1. **Duplication audit** (on the carve-out source) — duplicated logic in source, duplicated test setup, duplicated fixtures within or near the carve-out.
2. **Complexity audit** (on the carve-out source) — functions in the carve-out at or above cognitive complexity 15.
3. **Testability audit** (on the carve-out source) — code that resisted testing (wide mocking surface, unreachable branches, side-effect entanglement, hidden global state).
4. **Assertion audit** (on the new test files) — every new test file SHALL be reviewed against the "Tests SHALL assert observable behavior, not execution" requirement. For each test, the audit SHALL record in one sentence the observable behavior under test (return value, rendered output, thrown error, persisted state, network call shape). Tests that exist only to lift coverage, assert tautologies, or smoke-execute a function without checking its result SHALL be rewritten to assert observable behavior OR deleted (if the behavior is genuinely covered by another test in the carve-out). Lint-rule coverage of the tautology shortlist does NOT eliminate this audit — the reviewer SHALL also catch substance failures the rules miss (e.g., asserting on an irrelevant property, asserting on a value the mock just returned, missing the actual contract).

Every finding from any of the four audits SHALL be disposed of in exactly one of two ways: **(a) fixed in-place within the sub-proposal**, with the new tests proving behavior preservation; OR **(b) deferred as a new sub-proposal added to the governing `test-coverage` change's `tasks.md`** (applies to audits 1–3 only — assertion-audit findings SHALL always be fixed in-place, since they concern the sub-proposal's own newly-written tests). Deferring a finding as a TODO comment, follow-up issue, or unaddressed note SHALL NOT be an acceptable disposition.

#### Scenario: Assertion audit catches a substance failure the linter missed

- **WHEN** the assertion audit reviews a test that calls `createList(...)` and then asserts only `expect(result).toBeTruthy()`
- **THEN** the audit records the test as failing the substance bar (asserting on a value the production code constructed, with no constraint on its shape)
- **AND** the test SHALL be rewritten to assert specific properties (e.g., `result.id` matches the expected pattern, `result.title` equals the input, the list appears in a follow-up `getListsByUser` call) OR deleted
- **AND** the audit task records the disposition

#### Scenario: Duplication found and fixed in-place

- **WHEN** the audit finds two functions with copy-pasted logic in the carve-out
- **THEN** the sub-proposal extracts the shared logic and updates callers
- **AND** the new tests cover the extracted location
- **AND** the audit task records "fixed in-place" with the commit/file reference

#### Scenario: Architectural refactor exceeds carve-out

- **WHEN** the audit finds a structural problem spanning files outside the carve-out
- **THEN** the sub-proposal adds a new sibling sub-proposal entry to `test-coverage/tasks.md`
- **AND** the audit task records "deferred" with a link to the new entry
- **AND** the finding is NOT addressed in the current sub-proposal

#### Scenario: TODO comment is not acceptable

- **WHEN** an audit finding has not been fixed in-place AND no new sub-proposal entry has been added
- **THEN** the sub-proposal fails its audit task
- **AND** SHALL NOT proceed to coverage validation

### Requirement: Sub-proposals SHALL refactor code in their carve-out as needed for testability

Test sub-proposals SHALL have authority to refactor code within their declared carve-out when the refactor improves testability and the new tests prove behavior preservation. Refactors that span files outside the carve-out (cross-file dependencies, architectural changes, schema changes) SHALL NOT be performed in the test sub-proposal; they SHALL be deferred per the audit obligation. A sub-proposal's title MAY be renamed to indicate substantial refactor scope (e.g., `test-and-refactor-<family>`) without changing its carve-out boundary.

#### Scenario: Single-file refactor inside carve-out

- **WHEN** a function in the carve-out is too entangled to test
- **THEN** the sub-proposal refactors the function within the same file
- **AND** the new tests prove the refactored function preserves the original behavior

#### Scenario: Cross-file refactor exceeds carve-out

- **WHEN** the audit identifies an entanglement that requires moving code between files
- **THEN** the sub-proposal does NOT perform the cross-file refactor
- **AND** a new sibling sub-proposal is added to `test-coverage/tasks.md`

### Requirement: Sub-proposals SHALL elevate non-trivial invariants to capability-spec SHALLs

Each test sub-proposal SHALL examine the invariants its tests enforce. An invariant SHALL be added as a `### Requirement: ...` SHALL to the relevant capability spec if and only if all three of the following hold:

(a) the invariant is non-obvious from the component name, function signature, or type;
(b) the invariant would survive a reasonable reimplementation of the carve-out;
(c) the invariant protects against a real failure mode — privacy leak, data loss, accessibility regression, or contract break for callers.

Invariants that fail any of (a), (b), (c) SHALL remain tested but SHALL NOT be added to the spec. The sub-proposal's `tasks.md` SHALL record both elevated and non-elevated invariants with one-line rationale per non-elevation.

#### Scenario: Non-obvious privacy invariant is elevated

- **WHEN** a test enforces that the DAL filters out lists with `visibility = 'private'` for non-owner viewers
- **THEN** the sub-proposal adds a SHALL to the `list-visibility` spec encoding this invariant
- **AND** the audit task records the elevation

#### Scenario: Trivial rendering assertion is not elevated

- **WHEN** a test asserts that `<Button>` renders a `<button>` element
- **THEN** the sub-proposal does NOT add this as a SHALL to the `button-system` spec
- **AND** the audit task records non-elevation with rationale ("derivable from name/type")

### Requirement: Drift-correcting spec deltas SHALL reach canonical via the standard archive-time rollup

When a test sub-proposal's tests enforce a source behavior that contradicts an existing capability spec (spec drift), the correction SHALL be authored in the sub-proposal's own `changes/<name>/specs/<capability>/spec.md` delta — which is the source of truth and the artifact reviewers read during the change — and SHALL reach the active `openspec/specs/<capability>/spec.md` through the standard OpenSpec archive-time rollup, NOT by an apply-time write to the active spec ahead of archive. This is the single ratified convention for the program (per `test-coverage` design D13 and §7.11): it matches the OpenSpec tooling default, the `test-app-frame` precedent (commit `c2f3e19`), and the majority of sub-proposals, and it avoids the error-prone "Sync anyway vs Archive now" operator branch that an early apply-time write forces at archive. `test-visit-history`'s apply-time write (its §9.1) is recorded as a one-off divergence the program does NOT adopt going forward. Tier classification: **Tier 1** — this is a cross-cutting authoring convention, not carve-out bookkeeping.

#### Scenario: A drift correction is deferred to archive-time rollup

- **WHEN** a sub-proposal discovers the active spec contradicts shipped source the new tests lock, and authors the corrected requirement in its `changes/<name>/specs/<capability>/spec.md`
- **THEN** the active `openspec/specs/<capability>/spec.md` is NOT edited during apply
- **AND** the correction lands in the active spec only when the sub-proposal archives, via the standard rollup
- **AND** `openspec validate <capability> --strict` passes against the sub-proposal's delta

#### Scenario: Close-out reconciliation patches assigned to already-archived sub-proposals

- **WHEN** a drift item is owned by a sub-proposal that has already archived without correcting it (so no in-flight `changes/<name>/specs/` delta exists to carry it), and the governing `test-coverage` change applies the fix as a close-out patch
- **THEN** the governing change MAY edit the active capability spec directly as a close-out reconciliation, recording the edit in its `tasks.md`
- **AND** this direct edit is the close-out exception, not a license for in-flight sub-proposals to write canonical at apply-time

### Requirement: Foundation work SHALL be split into a spike and an implementation phase

The first test sub-proposal SHALL be `test-foundation-spike`. Its deliverables SHALL include: (1) a written comparison of DB-under-test options (pglite, testcontainers, Neon branch) on speed, fidelity to `drizzle-orm/neon-http`, CI cost, and local-dev ergonomics; (2) a working proof-of-concept against one DAL function and one server action demonstrating the recommended approach; (3) the seed-fixture negative-case audit per the seed-as-fixture requirement; (4) the CI provider choice. The second sub-proposal SHALL be `test-foundation`, which lands the chosen runner, fixtures, helpers, CI configuration, the seed extension or parallel fixture, the `sonarjs` plugin at `warn`, the `npm test` script, and the `openspec/config.yaml` `tasks` rule edit. No other test sub-proposal SHALL begin implementation work until `test-foundation` archives, except that drafting MAY proceed in parallel.

#### Scenario: Spike output blocks foundation

- **WHEN** the `test-foundation` sub-proposal is being drafted
- **THEN** it consumes the spike's deliverables as inputs
- **AND** it does NOT proceed to implementation if any spike deliverable is missing

#### Scenario: Sub-proposals wait on foundation

- **WHEN** a `test-<carve-out>` sub-proposal other than the spike or foundation is being applied
- **THEN** `test-foundation` is already archived
- **AND** the runner, fixtures, helpers, CI, and complexity rule are in place

### Requirement: Governing change SHALL track sub-proposal completion

The `test-coverage` change's `tasks.md` SHALL list each planned test sub-proposal as a top-level checkbox. A sub-proposal's checkbox SHALL be checked when, and only when, that sub-proposal archives via `openspec archive`. The `test-coverage` change SHALL itself archive only after all listed sub-proposals are archived. New sub-proposals discovered mid-flight (per the audit deferral rule or per scope-growth of an existing sub-proposal) SHALL be added as new top-level checkboxes; their addition is the canonical record of the scope change.

#### Scenario: Sub-proposal archive flips the checkbox

- **WHEN** `openspec archive test-button-system` succeeds
- **THEN** the corresponding checkbox in `openspec/changes/test-coverage/tasks.md` is marked complete in a follow-up commit

#### Scenario: Governing change waits on all sub-proposals

- **WHEN** the operator attempts to archive `test-coverage` with any sub-proposal checkbox unchecked
- **THEN** the operator confirms the unchecked items are intentional non-goals (and removes them from `tasks.md` with rationale) OR completes them before archiving

#### Scenario: Deferred finding becomes a new checkbox

- **WHEN** a sub-proposal's audit defers an architectural refactor
- **THEN** a new checkbox is added to `test-coverage/tasks.md` describing the deferred sub-proposal
- **AND** the originating sub-proposal's audit task links to the new checkbox by name

### Requirement: Vitest test names SHALL follow `<StateUnderTest>_<ExpectedBehavior>` shape

Every Vitest `it(...)` / `test(...)` name SHALL have a **single underscore** marking the one state│behavior boundary: the state under test (input, scenario, or condition) on the left, the expected observable behavior (return value, thrown error, rendered output, persisted state change, or side effect) on the right. The **state SHALL be a single PascalCase token** — compound state is NOT expressed in the `it()` name but hoisted into nested `describe(...)` blocks (see the describe-structure requirement), even when used once. The **behavior SHALL be one PascalCase token, or several dash-joined PascalCase facets** when one trigger produces multiple observable effects (e.g. `ClickFollow_CallsFollowUser-ToastSuccess-RouterRefresh`); such single-trigger compounds SHALL NOT be split into separate tests (splitting would only duplicate setup). The unit being tested SHALL NOT appear in the `it()` name — it is carried by the enclosing `describe(...)`. Tokens are PascalCase with words concatenated (e.g. `InputPrivate`, `ReturnsOwner`, `RedirectsToLists`); literal identifiers from production code (enum values, exported constants, type names, CSS class strings) MAY appear in their native casing within a token (e.g. `ReturnsOWNER`). Parameterized / matrix tests MAY interpolate the parameter into any token, and printf placeholders (`%s`, `%#`) are permitted for `it.each`, as long as the result still parses on the single boundary underscore. This shape's mechanically-checkable subset is **lint-enforced at `error`** (see the separate enforcement requirement); the dash is the behavior-facet joiner in `it`/`test` only.

The following name templates SHALL fail review as vacuous:

- `should <X>` / `should work` / `should work correctly`
- `<X> correctly` / `<X> properly` / `<X> as expected`
- `renders` (without naming what is rendered or asserted)
- `works` / `basic <X>` / `<X> basics`
- Any name that does not constrain a specific observable property

**Precision principle:** the structured shape SHALL NOT be used to launder imprecise naming. Both tokens MUST be as specific as the test's assertions. The behavior token SHALL name the specific error class or message text when the assertion is `.toThrow(...)`, the specific return value or shape when the assertion is `.toEqual(...)` / `.toBe(...)`, the specific rendered text or DOM property when the assertion is on the render tree, etc. Bare `Throws` (when the assertion matches a specific message), bare `Returns` / `ReturnsError` (when the assertion matches a specific value), and bare `Renders` (when the assertion matches specific output) SHALL fail review as the structured equivalent of vacuous prose. The state token is held to the same standard: opaque labels like `Garbage`, `Bad`, `Invalid` without an accompanying detail clause SHALL fail review; precise alternatives name what makes the input distinctive (`UnknownInput`, `EmptyString`, `NegativeNumber`, `DateMissingDayComponent`).

This naming rule is complementary to — not a substitute for — the "Tests SHALL assert observable behavior, not execution" requirement: a substantively-asserting test with a vacuous name still fails the naming bar, and a vacuously-asserting test with a structured name still fails the substance bar.

#### Scenario: Two-part shape parses on a single underscore

- **WHEN** a contributor writes `it('InputPrivate_ReturnsOWNER', ...)`
- **THEN** the name has exactly one underscore separating the state token (`InputPrivate`) from the behavior token (`ReturnsOWNER`)
- **AND** the name passes the naming bar

#### Scenario: Literal identifier preserves native casing

- **WHEN** a test asserts the production code returns the `OWNER` enum constant
- **THEN** the name MAY appear as `InputPrivate_ReturnsOWNER` (preserving the enum's native casing)
- **AND** the name passes review

#### Scenario: Parameterized name interpolates the parameter

- **WHEN** a `for (const variant of VARIANTS)` loop generates names like `it(\`Variant${cap(variant)}DefaultSize_ReturnsBtn${cap(variant)}\`, ...)`
- **THEN** the resulting strings (`VariantPrimaryDefaultSize_ReturnsBtnPrimary`, `VariantGhostDefaultSize_ReturnsBtnGhost`, ...) each parse as `<State>_<Behavior>`
- **AND** each name passes review

#### Scenario: Vague template fails review

- **WHEN** a contributor writes `it('should work correctly', ...)`, `it('renders properly', ...)`, or `it('basic navigation', ...)`
- **THEN** the assertion audit (see the four-audits requirement) flags the test for renaming
- **AND** the test SHALL be renamed to the `<State>_<Behavior>` shape before the sub-proposal archives

#### Scenario: Structured-but-imprecise name fails review

- **WHEN** a test asserts `expect(() => fromDb('garbage')).toThrow(/Unknown list visibility value/)` AND is named `InputGarbage_Throws`
- **THEN** the assertion audit flags both tokens for imprecision: `Garbage` is an opaque label that does not name the input's distinguishing property, and `Throws` is a bare behavior token that does not name the asserted error message
- **AND** the test SHALL be renamed to something like `UnknownInput_ThrowsUnknownVisibilityValueError` (precise state token + precise behavior token matching the assertion's `.toThrow` pattern)
- **AND WHEN** a test asserts `expect(render).toHaveTextContent('Add item')` AND is named `EmptyList_Renders`
- **THEN** the audit flags `Renders` as a bare behavior token and the test SHALL be renamed to e.g. `EmptyList_RendersAddItemCallToAction`

#### Scenario: Substance and naming bars are independent

- **WHEN** a test is named `InputPrivate_ReturnsOWNER` but its only assertion is `expect(result).toBeTruthy()`
- **THEN** the substance bar fails (per the observable-behavior requirement) regardless of the structured name
- **AND WHEN** a test asserts a specific return value but is named `should decode private correctly`
- **THEN** the naming bar fails regardless of the substantive assertion

### Requirement: Vitest describe blocks SHALL follow a three-role naming convention

Vitest `describe(...)` blocks play exactly three roles, each with its own naming rule. A given describe block SHALL be exactly one of these roles, and its name SHALL conform to the rule for that role:

1. **Module describe** (outermost, optional) — names the module, component, or file under test in its **natural source casing**, matching how the file/module is named in code: `'visibility'`, `'buttonClasses'`, `'NumericInput'`, `'listAccess'`.
2. **Function describe** — names a specific exported function or method in its **native identifier casing**, matching how the function is named in code: `'fromDb'`, `'guardListViewable'`, `'visibilityDbValues'`. A function describe MAY appear directly at the top level (collapsing the module layer) when the file covers a single exported function.
3. **Scenario-family describe** — groups cases by an input or output condition with a **single PascalCase tag**: `'LegacyDbStrings'`, `'UnknownInputs'`, `'WhitespaceContract'`, `'VariantSizeMatrix'`, `'FalsyExtra'`. The tag SHALL contain no spaces, punctuation, or special characters. Underscores MAY separate genuinely distinct concepts (e.g. `'SSR_NoWindow'`) but a single tag is preferred. The tag SHALL name what UNIFIES the grouped cases — the precision principle from the `it()` naming rule extends here. Opaque labels like `'Misc'`, `'Various'`, `'Other'`, or bare `'EdgeCases'` (without naming which edges) SHALL fail review.

Additionally:

- Inner describes (function or scenario-family) SHALL NOT repeat the outer module name (no `describe('utils > formatCurrency', ...)`, no `describe('utils', () => describe('utilsFormatCurrency', ...))`).
- A test file covering a single exported function MAY collapse to a single top-level `describe(<functionName>, ...)` without an outer module describe.
- Scenario-family describes are NOT subject to the no-repeat rule because they do not name the unit.
- Multiple scenario-family describes MAY nest under a function describe (e.g. `describe('fromDb', () => { describe('LegacyDbStrings', ...); describe('UnknownInputs', ...); })`).

#### Scenario: Three-layer nesting follows role rules

- **WHEN** a contributor tests `lib/visibility.ts` which exports `fromDb` and `visibilityDbValues`, and `fromDb` has natural case clusters
- **THEN** the file uses `describe('visibility', () => { describe('fromDb', () => { describe('LegacyDbStrings', ...); describe('UnknownInputs', ...); }); describe('visibilityDbValues', ...); })`
- **AND** the module layer (`'visibility'`) uses natural source casing
- **AND** the function layer (`'fromDb'`, `'visibilityDbValues'`) uses native identifier casing
- **AND** the scenario-family layer (`'LegacyDbStrings'`, `'UnknownInputs'`) uses single PascalCase tags
- **AND** no inner describe repeats `'visibility'`

#### Scenario: Single-function file MAY collapse the outer describe

- **WHEN** a test file covers a single exported function (e.g. `buttonClasses.ts` exporting only `buttonClasses`)
- **THEN** the file MAY use a single top-level `describe('buttonClasses', () => { describe('VariantSizeMatrix', ...); describe('FalsyExtra', ...); })` without an outer file-level describe
- **AND** the structure passes review

#### Scenario: Prose scenario-family describe fails review

- **WHEN** a contributor writes `describe('variant × size matrix', ...)`, `describe('legacy DB strings', ...)`, or `describe('whitespace contract', ...)`
- **THEN** the audit flags the describe name for containing spaces, special characters, or non-PascalCase casing
- **AND** the describe SHALL be renamed to a single PascalCase tag (e.g. `'VariantSizeMatrix'`, `'LegacyDbStrings'`, `'WhitespaceContract'`)

#### Scenario: Vacuous scenario-family describe fails review

- **WHEN** a contributor writes `describe('Misc', ...)`, `describe('Various', ...)`, `describe('Other', ...)`, or bare `describe('EdgeCases', ...)` without naming the specific edge
- **THEN** the audit flags the describe as failing the precision principle (does not name what unifies the grouped cases)
- **AND** the describe SHALL be renamed to a tag that names the unifying property (`'FalsyExtra'`, `'EmptyArray'`, `'MaxLengthString'`, etc.) or its cases SHALL be flattened into the parent describe

### Requirement: Playwright test names SHALL follow `<PageOrFlow>_<Action>_<ExpectedOutcome>` shape

Every Playwright `test(...)` name SHALL consist of exactly three PascalCase parts separated by single underscores: the page or user flow under test, the action performed, and the expected observable outcome. Playwright tests SHALL NOT rely on `describe(...)` to carry the page/flow context — the three-part name SHALL be self-contained because Playwright failure output and HTML reports surface the test name without consistent describe-path nesting. Examples that pass: `Dashboard_NavigateToCurrentMonth_ShowsBudgetGroups`, `ListPage_AddItem_AppearsInList`, `SignIn_BypassEnabled_RendersProtectedPage`. Examples that fail: `should sign in`, `basic navigation works`, `list creation`.

#### Scenario: Three-part shape parses on two underscores

- **WHEN** a contributor writes `test('ListPage_AddItem_AppearsInList', ...)`
- **THEN** the name has exactly two underscores separating page (`ListPage`), action (`AddItem`), and outcome (`AppearsInList`)
- **AND** the name passes review

#### Scenario: E2E vague template fails review

- **WHEN** a contributor writes `test('should sign in', ...)` or `test('basic navigation works', ...)`
- **THEN** the assertion audit flags the test for renaming
- **AND** the test SHALL be renamed to the three-part shape before the sub-proposal archives

#### Scenario: Playwright names do not rely on describe context

- **WHEN** a Playwright spec groups tests under `test.describe('list creation', ...)`
- **THEN** each `test(...)` name inside SHALL still be a complete three-part `<PageOrFlow>_<Action>_<ExpectedOutcome>` string
- **AND** removing the surrounding describe SHALL NOT make any test name ambiguous

### Requirement: Vitest title-shape convention SHALL be sharpened and mechanically enforced at lint error severity

The mechanically-checkable subset of the Vitest title-shape convention SHALL be enforced by an ESLint rule that fails the pre-merge `lint` gate, NOT by manual review alone. Enforcement SHALL be configured via `eslint-plugin-vitest`'s `vitest/valid-title` rule in the `**/*.test.{ts,tsx}` block of `eslint.config.mjs`, at severity `error`. The convention is sharpened so the **single underscore is the one state│behavior boundary**, and the enforced subset SHALL be:

1. **`it()` / `test()` titles** SHALL match the shape `<State>_<Behavior>(-<Behavior>)*`:
   - **exactly one underscore**, separating the state from the behavior;
   - the **state** is a **single PascalCase token** — compound state is NOT expressible in the `it()` name and SHALL be carried by nested `describe` blocks (even when used once);
   - the **behavior** is one PascalCase token, or several **dash-joined** PascalCase facets for a legitimate compound (ordered effects, or facets of one atomic contract);
   - printf placeholders (`%s`, `%d`, `%#`, etc.) are permitted so `it.each` titles conform.

   A title with no underscore (a fused token), a second underscore (compound state), prose (whitespace), or a lowercase-leading token SHALL fail lint.

2. **`describe()` titles** SHALL contain no whitespace and no punctuation or special characters — only identifier/tag characters (`[A-Za-z0-9_$]`). Dash is NOT permitted in `describe` titles (it is the behavior-facet joiner in `it`/`test` only).

Compound behavior SHALL NOT be mechanically discouraged. The effects of a single trigger (e.g. `ClickFollow_CallsFollowUser-ToastSuccess-RouterRefresh`) share one execution and cannot be split into separate tests without duplicating setup, so a dash-joined behavior of any length is structurally valid. There SHALL be no lint rule keyed on dash count.

The following parts of the convention SHALL remain a manual review bar (assertion audit + AI-authoring instructions + review), because a static pattern cannot judge them and the lint rule SHALL NOT be relied upon to catch them:

- **Token role.** A regex cannot tell whether a token is a state or a behavior, so `<State>_<State>` and `<Behavior>_<Behavior>` are mechanically indistinguishable from a valid `<State>_<Behavior>` and SHALL NOT be caught by lint. Whether the left token is genuinely a state remains manual.
- **Conflation (atomicity).** A test SHALL cover one trigger and assert all of that trigger's effects together. A title that spans multiple distinct triggers (actions) SHALL be split into separate tests; one that asserts several effects of a single trigger SHALL NOT. This discriminator is the number of triggers, not the number of dashes, and is a manual judgment.
- The **precision principle** — whether each token is as specific as the test's assertions (bare `Returns` / `Renders`, opaque state tokens like `Garbage` / `Invalid`).
- The **describe role distinction** — module vs function vs scenario-family, and tag precision for scenario families.
- **Playwright** `<PageOrFlow>_<Action>_<ExpectedOutcome>` names, which run under a separate runner not covered by the vitest plugin.

A green `lint` run therefore SHALL be read as "the title shape is structurally valid", NOT as "the title is well-named or well-scoped".

#### Scenario: Single-token it() title fails lint

- **WHEN** a contributor writes `it('RendersMainContainerWrappingFollowingPage', ...)` (a fused token, no underscore)
- **THEN** `npm run lint` reports a `vitest/valid-title` error and the pre-merge `lint` gate fails
- **AND** the test SHALL be renamed to `<State>_<Behavior>` (e.g. `FollowingPage_RendersMainContainerWrapper`) before merge

#### Scenario: Conforming it() and it.each titles pass lint

- **WHEN** a test is named `it('InputPrivate_ReturnsOWNER', ...)` or `it.each(TEXT_TYPES)('TypeSetTo_%s', ...)`
- **THEN** `vitest/valid-title` accepts both — the first parses as `<State>_<Behavior>` on a single underscore, and the second's `%s` placeholder is permitted

#### Scenario: Compound-state it() title fails lint and is hoisted to a describe

- **WHEN** a contributor writes `it('NonPurchase_WithSetter_IconRendered', ...)` (two underscores — `NonPurchase` and `WithSetter` are both state)
- **THEN** `npm run lint` reports a `vitest/valid-title` error (a second underscore is not allowed)
- **AND** the state SHALL be hoisted into nested `describe` blocks, leaving a single-token-state `it()` (e.g. `describe('NonPurchase') > describe('WithSetter') > it('IconRendered_...')`), even if the compound is used only once

#### Scenario: Single-trigger compound behavior uses dashes and passes lint

- **WHEN** a test asserts several effects of one trigger, e.g. `it('ClickFollow_CallsFollowUser-ToastSuccess-RouterRefresh', ...)`
- **THEN** `vitest/valid-title` accepts it — one underscore (the boundary) and a dash-joined behavior of any length
- **AND** it SHALL NOT be flagged or split: the effects share one execution, so splitting would only duplicate setup. Splitting is required only when a title spans multiple distinct triggers, which is a manual judgment

#### Scenario: Expression-bearing parameterized title is not falsely flagged

- **WHEN** a parameterized test uses a template literal with an interpolated expression, e.g. `` it(`Variant${cap(variant)}DefaultSize_RendersBtn${cap(variant)}`, ...) ``
- **THEN** `vitest/valid-title` skips the dynamic title rather than reporting an error

#### Scenario: Prose describe title fails lint

- **WHEN** a contributor writes `describe('legacy DB strings', ...)` or `describe('variant × size matrix', ...)`
- **THEN** `npm run lint` reports a `vitest/valid-title` error for the whitespace/punctuation
- **AND** the describe SHALL be renamed to an identifier/tag form (`'LegacyDbStrings'`, `'VariantSizeMatrix'`) before merge

#### Scenario: Legitimate module and function describes pass lint

- **WHEN** a test file uses `describe('buttonClasses', () => { ... })` (module, camelCase) or `describe('fromDb', () => { ... })` (function, native casing)
- **THEN** neither is flagged by `vitest/valid-title` — both are identifier-form with no whitespace or punctuation

#### Scenario: Role-confused but structurally-valid name is not caught by lint

- **WHEN** a test is named `it('NonPurchase_WithSetter', ...)` — one underscore, but BOTH tokens are state (role confusion)
- **THEN** `vitest/valid-title` accepts it — a regex cannot judge token role
- **AND** the role error remains a manual / AI-authoring / review finding; the green lint result SHALL NOT be treated as evidence the name is correctly a `<State>_<Behavior>` pair

#### Scenario: Structurally-valid but imprecise name still requires manual review

- **WHEN** a test is named `it('Input_Returns', ...)` — structurally valid but both tokens vague
- **THEN** `vitest/valid-title` accepts it (the lint rule enforces shape, not precision)
- **AND** the precision principle remains a manual assertion-audit finding

### Requirement: DAL reads and server actions SHALL be integration-tested against a migrated pglite instance via a shared harness

Data-layer reads (`lib/data/*.ts`) and server actions (`lib/data/*.actions.ts`) SHALL be tested under the **node** vitest project against a real migrated database, not against mocked query builders. Tier classification: **Tier 1** (per `test-coverage` design D13) — this requirement is a cross-cutting data-layer test contract, not carve-out bookkeeping, and was first established by the `test-following` sub-proposal (4.2).

Data-layer reads (`lib/data/*.ts`) and server actions (`lib/data/*.actions.ts`) run under the **node** vitest project (`*.test.ts`) against a real, migrated in-process Postgres provided by `bootPglite()` (`test/helpers/db.ts`), NOT against mocked query builders. The test SHALL:

1. Boot a fresh migrated pglite instance per test (isolating rows, not just files) and module-mock `@/db` so the module-under-test's `import { db } from '@/db'` resolves to that instance.
2. Apply `mockNextCache()` (`test/helpers/next-cache.ts`) so the `'use cache'` directive's `cacheTag(...)` calls are no-ops and `updateTag` / `revalidateTag` are spies whose calls can be asserted.
3. Mock `@/lib/auth`'s `auth()` to control the viewer session — this is the NextAuth network boundary the foundation already permits mocking.

Tests SHALL assert observable database state (rows present / absent / counted) and the cache-tag side effects (`updateTag` called on the success path, NOT called on early-return or error paths), per the assertion-substance bar. A module whose static `@/db` import cannot be cleanly swapped MAY introduce a minimal `getDb()` indirection in the source as a testability refactor (per the refactor-authority requirement) rather than lowering the coverage floor.

#### Scenario: A server action is tested against pglite with cache-tag assertions

- **WHEN** a server-action test boots pglite, mocks `@/db` to it, mocks `auth()` to a viewer session, and invokes the action
- **THEN** the test asserts the resulting row state in pglite AND asserts the `updateTag(...)` spy was called exactly on the success path and not on the unauthorized / validation-failure / DB-error paths
- **AND** the test does NOT mock the Drizzle query builder

#### Scenario: A `'use cache'` DAL read runs under the node project

- **WHEN** a DAL read carrying the `'use cache'` directive is invoked from a node-project test after `mockNextCache()`
- **THEN** the function body executes against pglite, `cacheTag(...)` is a no-op, and the returned rows are asserted against the seeded fixture

#### Scenario: Downstream data-layer carve-outs inherit the harness

- **WHEN** a later data-layer sub-proposal (e.g. home-digest, list-item-management, list-visibility, server-endpoint-authorization, visit-history, user-actions) tests a DAL read or server action
- **THEN** it uses this pglite + `mockNextCache()` + auth-boundary-mock pattern rather than re-deriving a data-layer test strategy

### Requirement: PGlite test database SHALL be booted at most once per test file, with per-test isolation via a shared schema-derived reset helper

Every `*.test.ts` DB-integration test file SHALL boot the PGlite instance via `test/helpers/db.ts#bootPglite` at most once per file (in a `beforeAll` hook), and SHALL NOT call `bootPglite` inside an `it()` / `test()` body or inside a per-test `beforeEach`. Per-test isolation SHALL be achieved by resetting table rows between tests, NOT by re-booting and re-migrating.

The row reset SHALL be performed by a single shared helper exported from `test/helpers/db.ts` (e.g. `resetDb`) that issues one `TRUNCATE … RESTART IDENTITY CASCADE` over the database. The set of tables truncated SHALL be derived from the drizzle schema at `db/schema.ts` — iterating the schema module's exports and selecting drizzle table objects (via `is(value, PgTable)`), resolving each name with `getTableName` — and SHALL NOT be a hand-maintained SQL table-name literal. A table newly added to `db/schema.ts` SHALL therefore be reset automatically without editing the helper.

Test files that mutate rows SHALL call this shared reset helper (and `vi.restoreAllMocks()` where they install per-test `db` spies) in `beforeEach` before reseeding, so that no row or spy leaks from one test into the next now that the database instance is shared across a file's tests. Files that only seed read-only fixtures once and never mutate MAY seed in `beforeAll` and skip the reset.

This requirement completes the existing "extract the connection-swap + seed glue to `test/helpers/`" expectation into a binding boot-frequency contract; it does not change the migration-replay logic of `bootPglite` itself — only how often callers invoke it.

#### Scenario: Reset helper leaves all schema tables empty

- **WHEN** a test seeds rows into multiple tables and a subsequent `beforeEach` calls the shared `resetDb` helper
- **THEN** selecting from every table defined in `db/schema.ts` returns zero rows
- **AND** the truncation set was derived from the schema (not a hardcoded table-name list), so a table absent from any prior hand-rolled `TRUNCATE` literal is also emptied

#### Scenario: No DB-integration test file boots PGlite per test

- **WHEN** the repository's `*.test.ts` files are inspected
- **THEN** no `bootPglite()` call appears inside an `it()` / `test()` body or inside a `beforeEach` hook
- **AND** every file that uses `bootPglite` calls it from a `beforeAll` hook exactly once

#### Scenario: Converted file stays green under the full parallel suite, not just in isolation

- **WHEN** a file converted from per-test boot to per-file boot + `resetDb` runs as part of the full `pool: 'forks'` node suite
- **THEN** every test passes with no cross-test row or mock leakage
- **AND** the per-test boot-timeout flake described in issue #97 no longer occurs

#### Scenario: TRUNCATE literal is de-duplicated

- **WHEN** the relocated action suites under `lib/data/__tests__/` (`item.actions.test.ts`, `purchase.actions.test.ts`, `list.actions.test.ts`, `listItems.actions.test.ts`, `visit.actions.test.ts`) are inspected after this change
- **THEN** none contains a hand-rolled `TRUNCATE TABLE …` SQL literal
- **AND** all reset rows between tests by calling the shared schema-derived reset helper from `test/helpers/db.ts`

<!-- Rolled in from sub-proposal 6.0 `test-e2e-foundation` (Tier 1 per design
     D13): the e2e execution model. The six requirements below are the
     elevated invariants. -->

### Requirement: E2E and bypassed local dev SHALL run against a local Postgres via the `USE_PG_DRIVER` driver-switch

The application's DB connection (`db/index.ts`) SHALL select its Drizzle driver from the `USE_PG_DRIVER` environment variable: when `USE_PG_DRIVER === '1'` it SHALL use `drizzle-orm/postgres-js` against `DATABASE_URL`; otherwise it SHALL use the production `drizzle-orm/neon-http` driver unchanged. So that repeated runs never consume the metered live Neon branch, the e2e harness and bypassed local development SHALL set `USE_PG_DRIVER=1` and point `DATABASE_URL` at a local Postgres (a Docker container). The exported `db` SHALL remain typed as the neon-http database type so that transaction APIs unavailable in production do not typecheck against it.

Local mode SHALL be entered through dedicated npm scripts (e.g. `dev:local`, and the e2e run) that set `USE_PG_DRIVER=1` and the localhost `DATABASE_URL` **together**, so a developer never hand-sets those variables. The plain scripts (`dev`, and any non-local path) SHALL remain on the production driver + real auth. The localhost `DATABASE_URL` SHALL have a single source of truth shared by the scripts, `docker-compose.e2e.yml`, and `e2e/helpers/constants.ts` rather than being repeated as drifting literals. The localhost boot guard below is therefore a defense-in-depth backstop against misconfiguration, not a step in the normal workflow.

#### Scenario: Flag on selects postgres-js against the local DB

- **WHEN** the app boots with `USE_PG_DRIVER=1` and `DATABASE_URL` pointing at a localhost Postgres
- **THEN** queries execute against that local Postgres via the postgres-js driver
- **AND** no request is made to the Neon HTTP endpoint

#### Scenario: Flag unset preserves the production driver

- **WHEN** the app boots with `USE_PG_DRIVER` unset (the deployed configuration)
- **THEN** the DB connection uses `drizzle-orm/neon-http` exactly as before this change
- **AND** no postgres-js connection is opened

#### Scenario: Local mode is entered through a dedicated script, not hand-set env

- **WHEN** a developer runs the local-mode npm script (e.g. `dev:local`, or the e2e run)
- **THEN** the script sets both `USE_PG_DRIVER=1` and the localhost `DATABASE_URL` together
- **AND** the app boots in local mode without the developer setting either variable manually

#### Scenario: Non-localhost DATABASE_URL under the flag refuses to boot (backstop)

- **WHEN** `USE_PG_DRIVER=1` is set but `DATABASE_URL` does not point at localhost / `127.0.0.1`
- **THEN** the app throws at startup and refuses to boot
- **AND** no query is issued against the non-local database

### Requirement: Auth bypass SHALL be governed by `USE_PG_DRIVER`, with session identity selected independently

Real Google OAuth and the existence of a session are separate concerns. Whether auth is **bypassed** (real OAuth off, sessions synthesized) SHALL be governed by `USE_PG_DRIVER === '1'` — the same flag that selects the local DB — and SHALL NOT depend on `NODE_ENV` (so a production build via `next start` can still run bypassed locally). The previous `AUTH_BYPASS` flag and the `NODE_ENV !== 'production'` condition SHALL be removed. **Which** session a zero-argument `auth()` returns SHALL be chosen by a separate identity selector (a seeded user id, or the literal value meaning "no session"); the selector SHALL accept any seeded user id rather than being fixed to one identity. When the selector is unset the default identity SHALL be the seeded test viewer (`dev-test-viewer`), preserving the prior preview behavior. The production safety guarantee SHALL be the `USE_PG_DRIVER` localhost boot guard (above), NOT a `NODE_ENV` check. Route-handler / middleware `auth(req, ctx)` overloads SHALL continue to pass through to real NextAuth. This complements — and does not restate — the existing "NextAuth is not invoked against real Google" requirement, which remains the owner of the no-real-OAuth constraint.

#### Scenario: Bypass active, identity unset, yields the default viewer session

- **WHEN** a server component calls zero-argument `auth()` with `USE_PG_DRIVER=1` and the identity selector unset
- **THEN** the returned session is the synthesized `dev-test-viewer` session
- **AND** no Google OAuth handshake occurs

#### Scenario: Bypass active, identity set to guest, yields no session

- **WHEN** a server component calls zero-argument `auth()` with `USE_PG_DRIVER=1` and the identity selector set to the guest value
- **THEN** `auth()` resolves to `null` (a logged-out request)

#### Scenario: Identity selector is not fixed to a single user

- **WHEN** the identity selector names a seeded user id other than the default
- **THEN** the synthesized session represents that user id
- **AND** the harness does not require code changes to support an additional seeded identity

#### Scenario: Deployed configuration keeps real auth

- **WHEN** the app runs with `USE_PG_DRIVER` unset
- **THEN** zero-argument `auth()` delegates to real NextAuth and the bypass is inert
- **AND** this holds regardless of any other environment variable

### Requirement: E2E SHALL execute against a production build, not the dev server

The e2e harness SHALL run the application as a production build served by `next start`, NOT by `next dev`, so that the `'use cache'` directive and `revalidateTag` / `updateTag` invalidation layer are genuinely exercised. The production bundle SHALL be built once per suite run and reused across the harness's server modes rather than rebuilt per mode.

#### Scenario: Harness serves a production build

- **WHEN** the e2e suite starts its application server(s)
- **THEN** each server runs a `next start` production build (not `next dev`)

#### Scenario: Tag revalidation is observable after a same-server write

- **WHEN** an e2e flow performs a mutation that calls `revalidateTag(...)` and then reloads a page reading the affected tag **on the same server**
- **THEN** the reload reflects the mutation
- **AND** the suite does not rely on `next dev`'s cache behavior to make this true

### Requirement: The harness SHALL provide bypassed and unauthenticated server modes as separate processes

Because the bypass is process-wide (no per-request seam), an authenticated viewer and a logged-out guest SHALL be served by **separate** server processes, exposed as separate Playwright projects sharing one local Docker DB: an authenticated mode (identity = a seeded user) and a guest mode (no session). The harness SHALL be structured so that an additional server mode for a different seeded identity can be added as configuration. Each server process holds its own in-memory cache/tag store, so cross-process freshness is NOT guaranteed; specs consuming this harness SHALL assert only state their own server produced or that the seed established, and SHALL NOT depend on a write made on one server being observed on the other.

#### Scenario: Guest mode reaches a public list with no session

- **WHEN** a spec assigned to the guest project opens a public ("Shared") list by URL
- **THEN** the page renders for the unauthenticated caller
- **AND** no session is present

#### Scenario: Authenticated mode renders a protected page with no sign-in step

- **WHEN** a spec assigned to the authenticated project opens a protected page
- **THEN** the page renders as the seeded identity without any sign-in interaction

#### Scenario: Cross-process observation is not assumed

- **WHEN** a spec writes state on the guest server
- **THEN** it SHALL NOT assert that write is visible on the authenticated server (or vice versa)
- **AND** any owner/observer assertion uses seeded state or same-server state instead

### Requirement: The local e2e database SHALL be schema-applied by `drizzle-kit push` and populated by the canonical seed-as-fixture

The Docker e2e database SHALL receive its schema via `drizzle-kit push` (schema derived directly from `db/schema.ts`, no migration replay), and SHALL be populated by invoking the canonical seed (`scripts/seed-dev-users.ts`) through the same `USE_PG_DRIVER` path (`USE_PG_DRIVER=1 DATABASE_URL=<local> ...`) so the seed reaches the local DB via the one driver-switch. Before the e2e suite runs, the database SHALL be reset to the canonical fixture — `db:reset:dev`, which cascade-wipes seeded-owned rows then reseeds — so every run starts from a byte-identical known state regardless of any prior run's writes on a persisted database. The shared bring-up (`setup-e2e-db.sh`) SHALL apply schema only and SHALL NOT itself reset: the data-state step belongs to each caller, so `dev:local` seeds without wiping (preserving UI-created rows; reset there stays the explicit `db:reset:dev` opt-in) while `test:e2e` resets. The container's credentials SHALL be committed, non-secret, localhost-bound test values.

#### Scenario: Schema applied from source via push

- **WHEN** the e2e database is prepared
- **THEN** its schema is applied with `drizzle-kit push` from `db/schema.ts`
- **AND** the run does not depend on replaying the committed migration files

#### Scenario: Seed reaches the local DB through the driver-switch

- **WHEN** the seed is invoked with `USE_PG_DRIVER=1` and `DATABASE_URL` pointing at the local container
- **THEN** the seeded fixture rows are written to the local Postgres
- **AND** no separate test-only DB client is required to seed it

#### Scenario: The e2e suite starts from a deterministic reset

- **WHEN** the e2e run is prepared (`test:e2e`)
- **THEN** the database is reset to the canonical fixture (cascade wipe + reseed) before any spec executes
- **AND** the starting state does not depend on rows written by a prior run on a persisted database

#### Scenario: Local dev bring-up preserves UI-created rows

- **WHEN** `dev:local` brings up the local database
- **THEN** it seeds the canonical fixture without wiping
- **AND** rows a developer created through the UI survive the restart (reset stays the explicit `db:reset:dev` opt-in)

### Requirement: CI SHALL run e2e in a fork-safe per-PR tier and a secret-bearing pre-promote migration tier

Continuous integration SHALL run the Playwright e2e suite in two tiers: (1) a **per-PR** job that stands up a local Postgres sidecar, applies schema via `drizzle-kit push`, resets to the canonical fixture (cascade wipe + reseed), and runs the suite using only committed non-secret test credentials — so it runs on fork pull requests; and (2) a **pre-promote** job on trusted branches that creates an **ephemeral branch of the production Neon project** (copy-on-write — production data and schema are never mutated, and the branch is deleted afterward), runs `drizzle-kit migrate` against that branch, then resets and re-seeds the canonical test fixture onto it and exercises a representative set of DAL reads through the **production `neon-http` driver** (`USE_PG_DRIVER` unset). Branching production rather than a from-scratch database is deliberate: it validates the pending migrations against production's *actual* applied-migration state and schema, catching a migration production is missing or hand-applied drift that a clean database cannot surface; seeding test data first ensures CI never reads real users' production data. This tier is the sole CI guard for migration-replay correctness against the real schema and for production-driver (`neon-http`) divergence. It validates migration *replay* via `drizzle-kit migrate`; it SHALL NOT be construed as validating the production migration-apply mechanism itself (e.g. a manual SQL run against production), which uses a different apply path and is outside this capability's scope. It requires a Neon API secret and SHALL be skipped where that secret is unavailable (e.g. fork PRs). Once the per-PR tier exists, the descriptive note in `openspec/config.yaml` and this capability stating "CI does not currently run Playwright" SHALL be corrected.

#### Scenario: Per-PR e2e runs without secrets

- **WHEN** a pull request (including one from a fork) triggers CI
- **THEN** the per-PR e2e job runs the suite against a sidecar Postgres using only committed non-secret credentials
- **AND** it does not require any repository secret

#### Scenario: Pre-promote gate validates migrations against the production schema

- **WHEN** a push targets a promotion branch (e.g. `dev` or a `release-*.*.x` release branch) with the Neon API secret available
- **THEN** CI creates an ephemeral branch of the production Neon project, runs `drizzle-kit migrate` against it, then re-seeds the test fixture and reads through the `neon-http` driver, and deletes the branch
- **AND** a migration that fails to replay against the production schema, or a read that fails through the production driver, fails the gate
- **AND** production data and schema are never mutated

#### Scenario: Pre-promote gate is skipped without the secret

- **WHEN** CI runs in a context lacking the Neon API secret (e.g. a fork PR)
- **THEN** the pre-promote migration gate is skipped rather than failing
- **AND** the per-PR e2e tier still runs
