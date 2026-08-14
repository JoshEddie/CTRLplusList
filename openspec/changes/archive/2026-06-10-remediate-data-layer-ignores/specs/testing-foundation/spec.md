# testing-foundation — delta

One concern: the universal-floor disposition requirement gains TESTING.md's ignore-validity criterion, which the active spec does not yet encode. The active requirement demands a *specific* rationale; it does not yet say which rationales are *valid*. This delta adds the criterion (external invariant only) and the two invalid classes this change's remediation sweep removes from `lib/data/` (rationales citing the function's own control flow; rationales citing in-repo callers). No other testing-foundation requirement changes.

## MODIFIED Requirements

### Requirement: Files SHALL meet the universal floor via tests or annotated excludes — never a lowered floor

A file matched by `coverage.include` and not excluded by `coverage.exclude` SHALL meet the universal floor (`lines: 98, statements: 98, branches: 95, functions: 100`). When a region of source is genuinely uncoverable (e.g., a defensive `throw` on an unreachable branch, an SSR-only fallback that cannot execute in jsdom, a `try/catch` whose `catch` block guards against a condition the runtime contract forbids), the disposition SHALL be exactly one of:

- **(a)** Write the test that exercises the region; OR
- **(b)** Mark the region with `/* v8 ignore next */` (or `/* v8 ignore start */ … /* v8 ignore stop */` for multi-line regions) and an immediately-preceding one-line comment naming the specific reason the region is uncoverable.

An ignore rationale SHALL be both specific AND valid. Valid means it cites an invariant established **outside** the function — framework lifecycle, platform, a third-party/DB contract (e.g., SQL `COALESCE` always yielding a row) — or a truly external error path that cannot be provoked from a test. Two rationale classes are categorically invalid:

- A rationale citing the function's **own earlier control flow** ("the guard above already decided this") describes a redundant guard. That is dead code, not unreachable code: the disposition is to delete the guard and let narrowing flow from the existing control flow — never to ignore it, and never to test it (its false branch is unreachable by construction).
- A rationale citing **in-repo callers** ("defense-in-depth; callers already verified the session") is not an external invariant — callers change, and an exported function is itself a public surface. The disposition is to test the guard directly through the export.

A rationale SHALL also be factually true under the runtime model: a branch labeled "unreachable" that a concurrent interleaving can reach (e.g., under the neon-http driver every query is a separate round-trip, so state checked in one round-trip can change before the next) is live behavior and SHALL be tested, not ignored.

Lowering the floor for a file (or class of files) SHALL NOT be an acceptable disposition. Adding a TODO, follow-up issue, or unaddressed note SHALL NOT be an acceptable disposition. The reviewer of any PR that introduces a `/* v8 ignore */` annotation SHALL verify the rationale comment is specific (names what makes the region uncoverable, not "for coverage") AND valid per the criterion above before approving.

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

#### Scenario: Ignore over a redundant guard rejected

- **WHEN** an ignore's rationale cites the same function's earlier control flow (e.g., "lists.length>0 guarantees listIds.length>0, so the empty branch is dead")
- **THEN** the guard and its ignore are deleted
- **AND** neither a test nor a reworded rationale is an acceptable alternative disposition

#### Scenario: In-repo-caller rationale rejected on an exported function

- **WHEN** an exported function's auth/ownership guard carries an ignore whose rationale is "defense-in-depth: callers already verified this before calling"
- **THEN** the ignore is removed and the guard is exercised by calling the export directly (e.g., with no session, or as a non-owner) and asserting the failure

#### Scenario: Factually wrong "unreachable" rationale is reclassified as live behavior

- **WHEN** an ignore claims a null-guard is unreachable because an earlier query confirmed existence, but the check and the guarded query are separate neon-http round-trips
- **THEN** the branch is treated as live race behavior: the ignore is removed and a test forces the interleaving (e.g., mocking the second query to return nothing once)

#### Scenario: External-invariant rationale remains valid

- **WHEN** an ignore's rationale cites a contract established outside the function, such as SQL `COALESCE` guaranteeing the query yields a row with a numeric value
- **THEN** the ignore is acceptable and is NOT swept by conformance remediation
