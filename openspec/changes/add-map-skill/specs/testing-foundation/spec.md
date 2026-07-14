# testing-foundation Delta

## MODIFIED Requirements

### Requirement: Test suite SHALL exist and SHALL run as a pre-merge gate

The repository SHALL include an automated test suite executed via `npm run test:coverage` (vitest with coverage reporting) and `npm run test:e2e` (Playwright). Each command SHALL exit non-zero if any test fails, and the pre-merge gate SHALL block merge on a non-zero exit. The pre-merge gate SHALL consist of five required tasks executed independently: `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm run test:coverage`, and `npm run test:e2e`. The five gates SHALL be encoded as required tasks in `openspec/config.yaml`'s `tasks` rule, and every `tasks.md` written after this capability is established SHALL include the five-gate pre-merge section with separately-checkable items. The `lint` gate SHALL run `eslint .` alone — spec-hygiene verification is deliberately not part of any pre-merge gate (owned by `spec-hygiene`).

When every file in a change's diff is one that cannot affect test outcomes — markdown docs, `.claude/**` skills/commands, `openspec/**`, and comment-only edits to any other file — the `test:coverage` and `test:e2e` gate tasks MAY be satisfied by marking them skipped with an explicit doc-only rationale on the task line instead of running them — never silently. Any executable change SHALL void the exemption however small, including one to a file whose other edits qualify; the test is what the diff can affect, not which directory it sits in. CI on the `dev` push still runs the full battery, preserving defense in depth. The exemption changes how the two test-gate tasks may be satisfied, not whether they appear in `tasks.md`.

#### Scenario: Failing test blocks merge

- **WHEN** any test in the suite fails on a branch under review
- **THEN** `npm run test:coverage` or `npm run test:e2e` exits non-zero
- **AND** the pre-merge gate fails
- **AND** the five-gate pre-merge section of the change's `tasks.md` cannot be checked complete

#### Scenario: Pre-merge tasks are separately checkable

- **WHEN** a contributor writes a new `tasks.md` after the testing-foundation capability is established
- **THEN** the pre-merge section contains five discrete tasks (one per gate)
- **AND** partial failure (e.g., a test gate fails but lint passes) is visible in the checklist

#### Scenario: Doc-only change skips the test gates with a rationale

- **WHEN** a change's diff touches only files that cannot affect test outcomes (markdown docs, `.claude/**`, `openspec/**`, comment-only edits elsewhere) and its author marks the `test:coverage` and `test:e2e` tasks skipped with a doc-only rationale
- **THEN** the pre-merge gate treats those two tasks as satisfied
- **AND** any executable change in the diff voids the exemption — the gates must run
- **AND** a comment-only edit to `.github/workflows/ci.yml` does not void it, while a changed step in the same file does
