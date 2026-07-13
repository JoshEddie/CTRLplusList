# recheck-review Specification

## Purpose
TBD - created by archiving change adopt-trunk-flow. Update Purpose after archive.
## Requirements
### Requirement: Recheck SHALL be driven by the persisted report header

`/recheck-review` SHALL locate its target report — `openspec/changes/<name>/review.md` for a spec-review target or `openspec/reviews/<version>.md` for a release-review target — and SHALL compute the fix delta from the report's header rather than from per-type logic branches: for a `spec-review` report the delta is the unstaged working-tree diff on top of the reviewed staged baseline; for a `release-review` report the delta is `git diff <anchor>..dev` using the header's anchor sha. Invoked with no argument, the skill SHALL auto-select when exactly one report has unresolved `Fix now` findings and SHALL ask the owner to choose otherwise.

#### Scenario: Spec-review recheck uses the unstaged delta
- **WHEN** `/recheck-review` targets a report whose header reads `review: spec-review`
- **THEN** the verification delta is the current unstaged diff

#### Scenario: Release-review recheck uses the anchor
- **WHEN** the target header reads `review: release-review` with `anchor: <sha>`
- **THEN** the verification delta is `git diff <sha>..dev`

#### Scenario: Ambiguous target prompts
- **WHEN** more than one persisted report has open `Fix now` findings and no argument names one
- **THEN** the skill asks the owner which report to recheck instead of guessing

### Requirement: Recheck SHALL verify findings inline in a single pass

The skill SHALL run as one inline pass — no sub-agents, no workflow fan-out, no review briefs. For each open `Fix now` finding in the latest round it SHALL classify: resolved (the delta addresses it), still open, or fix-introduced-new-issue (the delta creates a fresh defect, reported as a new finding). Findings dispositioned `File issue` or `Drop` SHALL NOT be re-litigated.

#### Scenario: Each open finding gets a resolution status
- **WHEN** a recheck runs against a report with three open `Fix now` findings
- **THEN** the appended round lists each of the three as resolved, still open, or superseded by a new finding introduced by the fix

#### Scenario: No fan-out is used
- **WHEN** `/recheck-review` executes
- **THEN** no sub-agents or workflow invocations occur; the pass runs in the orchestrating session

### Requirement: Recheck SHALL append rounds and escalate when fixes outgrow it

Each recheck SHALL append a numbered round section to the target report (never rewriting prior rounds) with a verdict of exactly one of: `clear to land` (no `Fix now` findings remain open), `findings remain`, or `outgrew recheck`. The skill SHALL declare `outgrew recheck` — directing the owner to a full re-review — when the fix delta touches files outside the original review's diff or rivals the original diff in size, rather than stretching a recheck to cover unreviewed ground.

#### Scenario: Clean round clears landing
- **WHEN** a recheck finds every open `Fix now` finding resolved and no new issues
- **THEN** it appends a round with verdict `clear to land`, satisfying `/land-change`'s review gate

#### Scenario: Sprawling fixes escalate
- **WHEN** the fix delta modifies files the original review never covered
- **THEN** the round's verdict is `outgrew recheck` and the owner is directed to run the full review again

#### Scenario: Rounds are append-only
- **WHEN** a second recheck runs
- **THEN** round 2 is appended after round 1's content, which remains unmodified

