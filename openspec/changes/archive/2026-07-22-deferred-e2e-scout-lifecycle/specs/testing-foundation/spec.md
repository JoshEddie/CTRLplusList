## MODIFIED Requirements

### Requirement: Test suite SHALL exist and SHALL run as a pre-merge gate

The repository SHALL include an automated test suite executed via `npm run test:coverage` (vitest with coverage reporting) and `npm run test:e2e` (Playwright). Each command SHALL exit non-zero if any test fails, and the pre-merge gate SHALL block merge on a non-zero exit. The pre-merge gate SHALL consist of five required tasks executed independently: `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm run test:coverage`, and `npm run test:e2e`. The five gates SHALL be encoded as required tasks in `openspec/config.yaml`'s `tasks` rule, and every `tasks.md` written after this capability is established SHALL include the five-gate pre-merge section with separately-checkable items, minus any gate omitted under the doc-only exemption below. The `lint` gate SHALL run `eslint .` alone — spec-hygiene verification is deliberately not part of any pre-merge gate (owned by `spec-hygiene`).

When every file in a change's diff is one that cannot affect test outcomes — markdown docs, `.claude/**` skills/commands, `openspec/**`, and comment-only edits to any other file — the `test:coverage` and `test:e2e` gate tasks MAY be **omitted** from the section instead of run — never silently. An omitted gate SHALL carry no checklist item — a never-run gate is not a checkable task, and a permanently-unchecked item wedges `/landfall`'s all-tasks-checked gate — and the section's lead-in SHALL name the omitted gates and the doc-only rationale, so the omission stays visible. Any executable change SHALL void the exemption however small, including one to a file whose other edits qualify; the test is what the diff can affect, not which directory it sits in. CI on the `dev` push still runs the full battery, preserving defense in depth.

#### Scenario: Failing test blocks merge

- **WHEN** any test in the suite fails on a branch under review
- **THEN** `npm run test:coverage` or `npm run test:e2e` exits non-zero
- **AND** the pre-merge gate fails
- **AND** the five-gate pre-merge section of the change's `tasks.md` cannot be checked complete

#### Scenario: Pre-merge tasks are separately checkable

- **WHEN** a contributor writes a new `tasks.md` after the testing-foundation capability is established
- **THEN** the pre-merge section contains five discrete tasks (one per gate)
- **AND** partial failure (e.g., a test gate fails but lint passes) is visible in the checklist

#### Scenario: Doc-only change omits the test gates with a lead-in rationale

- **WHEN** a change's diff touches only files that cannot affect test outcomes (markdown docs, `.claude/**`, `openspec/**`, comment-only edits elsewhere) and its author omits the `test:coverage` and `test:e2e` items, naming them and the doc-only rationale in the section's lead-in
- **THEN** the pre-merge gate treats those two gates as satisfied and the section carries no unchecked item for them
- **AND** any executable change in the diff voids the exemption — the gates must run and carry their items
- **AND** a comment-only edit to `.github/workflows/ci.yml` does not void it, while a changed step in the same file does
