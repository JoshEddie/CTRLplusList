# spec-review Delta

## MODIFIED Requirements

### Requirement: The consolidated report SHALL be persisted to the change directory

After emitting the consolidated report, the skill SHALL write it to `openspec/changes/<name>/review.md`, opening with the review family's shared machine-readable header (review type, target change, anchor sha, diff source, round number) as defined in the skill's bundled `reference/finding-format.md`. A repeat full review SHALL append a new round rather than overwriting prior rounds. When no related change was resolved (contract audit skipped), no report file is written and the skill SHALL say so. The persisted report is the contract consumed by `/recheck-review` (round appending) and `/landfall` (latest-verdict gate), and travels with the change directory at archive time.

#### Scenario: Report is written with the shared header
- **WHEN** `/spec-review` completes against resolved change `add-foo`
- **THEN** `openspec/changes/add-foo/review.md` exists, beginning with the shared header naming `spec-review`, the change, the anchor sha, the diff source, and the round

#### Scenario: Repeat review appends a round
- **WHEN** a full `/spec-review` runs again after an `outgrew recheck` escalation
- **THEN** the new report is appended to `review.md` as the next round, with earlier rounds unmodified

#### Scenario: No resolved change writes no file
- **WHEN** the user proceeds with no contract audit (no related change)
- **THEN** no `review.md` is written and the report notes the review was not persisted
