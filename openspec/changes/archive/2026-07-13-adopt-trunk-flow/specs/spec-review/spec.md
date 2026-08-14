# spec-review Delta

## MODIFIED Requirements

### Requirement: Invocation and scope resolution

The skill SHALL be invokable as `/spec-review` with an optional argument that is a change name, a PR reference, or a diff source. When invoked with no argument, the skill SHALL review the staged diff (`git diff --staged`) — the trunk workflow's pre-commit review scope — regardless of the current branch. Branch work is reviewed via an explicit PR reference or ref range.

#### Scenario: No argument defaults to the staged diff
- **WHEN** a user runs `/spec-review` with no argument
- **THEN** the skill uses `git diff --staged` as the review scope, on any branch

#### Scenario: Branch review requires an explicit scope
- **WHEN** a user wants to review a feature branch against `dev`
- **THEN** they pass an explicit scope (the PR reference or a ref range such as `dev...HEAD`); no argument does not imply it

#### Scenario: Explicit PR reference
- **WHEN** a user runs `/spec-review <PR>` with a pull-request reference
- **THEN** the skill fetches that PR's diff via `gh` and uses it as the review scope

#### Scenario: Explicit change name
- **WHEN** a user runs `/spec-review <change-name>` naming an active OpenSpec change
- **THEN** the skill uses that change as the contract-audit target without attempting auto-detection

## ADDED Requirements

### Requirement: The consolidated report SHALL be persisted to the change directory

After emitting the consolidated report, the skill SHALL write it to `openspec/changes/<name>/review.md`, opening with the review family's shared machine-readable header (review type, target change, anchor sha, diff source, round number) as defined in the skill's bundled `reference/finding-format.md`. A repeat full review SHALL append a new round rather than overwriting prior rounds. When no related change was resolved (contract audit skipped), no report file is written and the skill SHALL say so. The persisted report is the contract consumed by `/recheck-review` (round appending) and `/land-change` (latest-verdict gate), and travels with the change directory at archive time.

#### Scenario: Report is written with the shared header
- **WHEN** `/spec-review` completes against resolved change `add-foo`
- **THEN** `openspec/changes/add-foo/review.md` exists, beginning with the shared header naming `spec-review`, the change, the anchor sha, the diff source, and the round

#### Scenario: Repeat review appends a round
- **WHEN** a full `/spec-review` runs again after an `outgrew recheck` escalation
- **THEN** the new report is appended to `review.md` as the next round, with earlier rounds unmodified

#### Scenario: No resolved change writes no file
- **WHEN** the user proceeds with no contract audit (no related change)
- **THEN** no `review.md` is written and the report notes the review was not persisted
