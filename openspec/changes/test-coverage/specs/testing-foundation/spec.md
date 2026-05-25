## ADDED Requirements

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

Test files SHALL be colocated with the source they test using the `<source>.test.<ext>` pattern (e.g., `Button.tsx` → `Button.test.tsx`). End-to-end tests SHALL live under a top-level `e2e/` directory. Shared fixtures SHALL live under `test/fixtures/`. Shared test helpers and custom matchers SHALL live under `test/helpers/`. Per-test-file fixtures or helpers that are not reused SHALL stay inline; only repeated patterns extract.

#### Scenario: Component test colocation

- **WHEN** a contributor adds tests for `app/ui/components/button/Button.tsx`
- **THEN** the tests live at `app/ui/components/button/Button.test.tsx`

#### Scenario: E2E test placement

- **WHEN** a contributor adds a Playwright test for the list-creation flow
- **THEN** the spec lives under `e2e/` (e.g., `e2e/list-creation.spec.ts`)
- **AND** it does NOT live colocated with any single source file

#### Scenario: Shared fixture extraction

- **WHEN** two or more test files would set up the same DB state, mock the same fetch boundary, or render the same composed component
- **THEN** the shared setup MUST extract to `test/fixtures/` or `test/helpers/`
- **AND** the duplicating test files import from the extracted location

### Requirement: Tests SHALL NOT call rate-limited external services

Tests SHALL mock the network boundary of any external service whose real provider imposes a quota, charges money per call, or requires interactive credentials. Known boundaries in this category at the time of writing: the `app/api/image-search` upstream provider, NextAuth Google OAuth, and any third-party service added later. The mocks SHALL replace the network call (e.g., `fetch` interception, MSW handlers, or framework-equivalent), NOT internal application modules. Internal modules — DAL functions, server actions, `lib/`, hooks — SHALL NOT be mocked when their dependencies are local; integration tests SHALL exercise them against the real test database.

#### Scenario: Image-search upstream is mocked

- **WHEN** a test exercises `GET /api/image-search`
- **THEN** the upstream image provider's network endpoint is intercepted at the `fetch` boundary
- **AND** the test asserts on the route's auth + rate-limit + response-shape behavior against the intercepted response
- **AND** no real call to the upstream provider occurs in CI or local runs

#### Scenario: NextAuth is not invoked against real Google

- **WHEN** a test requires an authenticated session
- **THEN** the test uses the existing `AUTH_BYPASS=true` mechanism or an equivalent fixture
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

### Requirement: Coverage SHALL be enforced per-file with class-specific floors

Coverage SHALL be measured and enforced per file, not as a layer or repo-wide aggregate. Per-file floors SHALL be:

| File class | Floor |
| --- | --- |
| Pure logic (`lib/*.ts` excluding `lib/dal.ts`; pure helpers like `buttonClasses.ts`) | 95% |
| Primitive components (files under `app/ui/components/<family>/`) | 90% |
| `lib/dal.ts` (per exported function) | 80% |
| Server actions (`app/actions/*.ts`, per exported function) | 80% |
| API routes (`app/api/**/route.ts`) | 80% |
| Page-scoped UI (`app/(main)/**/ui/`) | 60% |
| Page entries (`app/(main)/**/page.tsx`) | 60% |

Files excluded from coverage enforcement (informational only): `*.d.ts`; generated drizzle artifacts under `drizzle/`; `app/sw.ts`; `app/manifest.ts`; test files themselves; layout files without branching logic. Each test sub-proposal SHALL enforce coverage floors ONLY on files in its declared carve-out at archive time. A repo-wide coverage report SHALL be generated for visibility but SHALL NOT gate merge.

#### Scenario: Small helper cannot hide behind fat file

- **WHEN** a sub-proposal's carve-out includes both a 500-line component and a 30-line helper
- **THEN** coverage is computed per file
- **AND** the 30-line helper meeting its 90% floor is checked independently of the 500-line component meeting its 90% floor
- **AND** an aggregate average across the two does NOT satisfy the gate

#### Scenario: Sub-proposal owns only its files

- **WHEN** a sub-proposal validates coverage at archive time
- **THEN** it checks only files declared in its carve-out
- **AND** unrelated files at lower coverage do NOT block the sub-proposal's archival

#### Scenario: Excluded files do not gate

- **WHEN** `app/sw.ts` has zero unit coverage
- **THEN** no sub-proposal fails coverage validation on that file
- **AND** the file is reported as informationally excluded

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

The project SHALL enable `eslint-plugin-sonarjs` with the `sonarjs/cognitive-complexity` rule configured at threshold 15. The rule SHALL land at severity `warn` globally when the testing-foundation capability is established. Each test sub-proposal SHALL promote the rule to severity `error` for files in its carve-out via `overrides` in `eslint.config.mjs` at archive time. Per-line disables (`// eslint-disable-next-line sonarjs/cognitive-complexity`) are permitted ONLY with an accompanying comment naming the reason; bare disables SHALL be a lint error.

#### Scenario: New code triggers warn globally

- **WHEN** a function exceeds cognitive complexity 15 in any file
- **THEN** `npm run lint` emits a `sonarjs/cognitive-complexity` warning

#### Scenario: Carve-out promotes to error

- **WHEN** a sub-proposal archives with a carve-out covering files X, Y, Z
- **THEN** `eslint.config.mjs` overrides set `sonarjs/cognitive-complexity` to `error` for X, Y, Z
- **AND** any future commit raising complexity above 15 in those files fails lint

#### Scenario: Justified disable is permitted

- **WHEN** a function in a promoted file legitimately exceeds the threshold
- **THEN** a per-line disable comment naming the reason is accepted by lint
- **AND** a bare disable without reason fails lint

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
