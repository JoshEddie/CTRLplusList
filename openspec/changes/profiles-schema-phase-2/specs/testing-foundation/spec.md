## MODIFIED Requirements

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
- **AND** the test SHALL be rewritten to assert specific properties (e.g., `result.id` matches the expected pattern, `result.title` equals the input, the list appears in a follow-up `getListsByProfile` call) OR deleted
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
