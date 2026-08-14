# recheck-review Specification

## Purpose
Defines the lightweight verifier that closes the review loop: after a `/spec-review` or `/release-review` produces findings and fixes are made, `/recheck-review` verifies each open `Fix now` finding against just the fix delta — appending rounds to the persisted report instead of re-running a full multi-agent review — and escalates honestly when fixes outgrow a recheck.
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

The skill SHALL run as one inline pass — no sub-agents, no workflow fan-out, no review briefs. It SHALL read the latest round **as amended** by its `### Adjudications` subsection (per the reader rule in `reference/finding-format.md`): a finding's effective disposition is the one set by the latest `### Adjudications` entry for its ID, and re-dispositioned findings SHALL NOT be re-litigated. For each finding whose effective disposition is an open `Fix now` it SHALL classify: resolved (the delta addresses it), still open, or fix-introduced-new-issue (the delta creates a fresh defect, reported as a new finding). Findings whose effective disposition is `File issue` or `Drop` SHALL NOT be re-litigated. The appended round SHALL reference prior findings by their durable IDs.

#### Scenario: Each open finding gets a resolution status
- **WHEN** a recheck runs against a report with three findings whose effective disposition is open `Fix now`
- **THEN** the appended round lists each of the three, by ID, as resolved, still open, or superseded by a new finding introduced by the fix

#### Scenario: Adjudicated findings are read as amended
- **WHEN** the latest round's `**Verdict:**` line reads `findings remain` but its `### Adjudications` subsection re-dispositions the only open `Fix now` finding to `File issue`
- **THEN** the recheck treats that finding as `File issue`, does not re-litigate it, and resolves the round's effective verdict from the amended dispositions

#### Scenario: No fan-out is used
- **WHEN** `/recheck-review` executes
- **THEN** no sub-agents or workflow invocations occur; the pass runs in the orchestrating session

### Requirement: Recheck routing boundary

`/recheck-review` SHALL be the review lever only when the fix delta changed code OR spec artifacts — never both. When the delta changed both sides, the applicable review is `/incremental-spec-review`. Delta size SHALL NOT be a routing signal in either direction.

#### Scenario: Code-only fix delta is recheck-scoped

- **WHEN** the fix delta modifies implementation files but no spec artifacts
- **THEN** `/recheck-review` is the applicable review regardless of the delta's size

#### Scenario: Mixed fix delta routes out

- **WHEN** at invocation the fix delta is found to touch both code and spec artifacts
- **THEN** the skill directs the owner to `/incremental-spec-review` instead of verifying

### Requirement: Recheck SHALL append rounds and escalate when fixes outgrow it

Each recheck SHALL append a numbered round section to the target report (never rewriting prior rounds) with a verdict of exactly one of: `clear to land` (no `Fix now` findings remain open), `findings remain`, or `outgrew recheck`. The skill SHALL declare `outgrew recheck` — directing the owner to `/incremental-spec-review` — when the fix delta turns out to touch both code and spec artifacts; this is the sole escalation tell. The former tells (files outside the original review's diff, delta size rivaling the original) are retired and SHALL NOT trigger escalation. A full `/spec-review` rerun occurs only by explicit owner choice, never as this skill's escalation target.

For a change-review target, when the round's verdict is `findings remain` or `outgrew recheck`, the skill SHALL append an unchecked `## Gates — round <n>` section to the change's `tasks.md` with one item per open `Fix now` finding, referenced by durable ID; prior gate sections SHALL never be unchecked or edited, and a `clear to land` verdict appends no section.

#### Scenario: Clean round clears landing
- **WHEN** a recheck finds every open `Fix now` finding resolved and no new issues
- **THEN** it appends a round with verdict `clear to land`, satisfying `/landfall`'s review gate, and appends no gate section

#### Scenario: Mixed delta escalates to incremental
- **WHEN** mid-recheck the fix delta turns out to modify both code and spec artifacts
- **THEN** the round's verdict is `outgrew recheck` and the owner is directed to `/incremental-spec-review`

#### Scenario: Large single-sided delta does not escalate
- **WHEN** the fix delta rivals the original diff in size, or touches files outside it, but changed only one of code or spec artifacts
- **THEN** the recheck proceeds; no escalation fires on size or file spread

#### Scenario: Adverse round writes its gate section
- **WHEN** a recheck round against a change-review target ends `findings remain` with open findings `A2` and `C4`
- **THEN** the change's `tasks.md` gains an unchecked `## Gates — round <n>` section listing `A2` and `C4`

#### Scenario: Rounds are append-only
- **WHEN** a second recheck runs
- **THEN** round 2 is appended after round 1's content, which remains unmodified

