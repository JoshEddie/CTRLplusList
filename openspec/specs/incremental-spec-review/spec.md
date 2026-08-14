# incremental-spec-review Specification

## Purpose

Governs `/incremental-spec-review`, the second-stage review lever for a fix delta that changed both code and spec artifacts atop an already-reviewed staged baseline. It applies full spec-review rigor to only the not-yet-reviewed delta — reusing spec-review's shared arena briefs and reply mechanics — so a fix too large for a recheck is verified without re-reviewing the whole change or collapsing the staged-reviewed vs unstaged-fix separation.
## Requirements
### Requirement: Second-stage review scoped to the not-yet-reviewed delta

The skill SHALL be invokable as `/incremental-spec-review [change-name]`, resolving the target change's persisted `openspec/changes/<name>/review.md` (no argument: resolve the single active change with a `review.md`; ask when ambiguous, per the review family's resolution convention). It SHALL be the review lever for a fix delta that changed **both** code and spec artifacts — the contract moved, so full rigor applies — while `/recheck-review` remains the lever when the delta changed only one side. It SHALL never require staging the fix delta: the staged tree remains the reviewed baseline and the unstaged working tree remains the fix delta throughout. A full `/spec-review` rerun SHALL occur only by explicit owner choice, never as this skill's escalation target.

#### Scenario: Mixed fix delta routes to incremental

- **WHEN** fixes on top of a reviewed staged baseline modify both implementation files and the change's spec artifacts
- **THEN** `/incremental-spec-review` is the applicable review, and the fix delta stays unstaged for its duration

#### Scenario: Single-sided fix delta is not this skill's scope

- **WHEN** the fix delta changed only code, or only spec artifacts
- **THEN** the skill states the delta is recheck-scoped and directs the owner to `/recheck-review` instead of running

### Requirement: Arena scopes derive from the report header

The skill SHALL read the target report's shared machine-readable header and derive its diff scopes from it: the **A Alignment** and **C Convention** agents SHALL review the unstaged-atop-staged fix delta (`git diff`), and the **B Boundary** and **T Testing** agents SHALL review the change's whole footprint from the header's anchor sha to the working tree (`git diff <anchor>`) — B because corpus-relative defects can be created by the combination of reviewed and unreviewed edits, T because scenario traceability is a whole-change property and a fix delta can silently orphan a scenario reviewed in an earlier round. Arena definitions are those of the `spec-review` capability's four-arena contract.

#### Scenario: A and C review only the fix delta

- **WHEN** the alignment and convention agents are spawned
- **THEN** each produces its diff with `git diff` (unstaged working tree) and reviews only that delta

#### Scenario: B reviews the whole footprint

- **WHEN** the boundary agent is spawned against a report whose header carries `anchor: <sha>`
- **THEN** it produces its diff with `git diff <sha>` — staged and unstaged combined — and reviews the change's whole footprint

#### Scenario: T reviews the whole footprint

- **WHEN** the testing agent is spawned against a report whose header carries `anchor: <sha>`
- **THEN** it produces its diff with `git diff <sha>` and re-derives the scenario↔test mapping across the change's whole footprint, so a fix delta that orphaned a previously-pinned scenario is caught

### Requirement: Fan-out reuses spec-review's shared briefs and reply mechanics

The skill SHALL spawn its four arena agents as parallel Agent-tool sub-agents pointed at the arena briefs bundled in the `spec-review` skill — a format-only file read, taking no runtime dependency on the `spec-review` skill itself — passing each agent its own diff command per the arena scopes. The JSON reply convention, single-retry, and abort-on-persistent-malformed behavior SHALL match the `spec-review` capability's fan-out contract, and interactive or orchestrator-judgment steps SHALL stay in the orchestrating session.

#### Scenario: Agents read the shared briefs

- **WHEN** the skill spawns its arena agents
- **THEN** each of the four is directed to the corresponding brief bundled under `.claude/skills/spec-review/`, with its own diff command, and no separate incremental-only brief copy exists

#### Scenario: Malformed replies follow the shared retry contract

- **WHEN** an arena agent's reply fails to parse or validate
- **THEN** the skill retries that agent exactly once via a follow-up message and aborts the review — persisting no round — if the reply is still malformed

### Requirement: The round subsumes recheck and persists append-only

The skill SHALL append `## Round <n> — incremental-spec-review (<date>)` to the target `review.md` — never rewriting prior rounds — containing: a prior-findings status table listing each finding from the latest round whose effective disposition is an open `Fix now` (by durable ID, status resolved / still open / superseded), the fresh arena findings tables, and exactly one round-vocabulary `**Verdict:**` line (`clear to land` / `findings remain`). Prior findings SHALL be read as amended by any `### Adjudications` subsection; re-dispositioned findings SHALL NOT be re-litigated. On a mixed round this skill subsumes `/recheck-review` — one round, one verdict, no separate recheck round.

#### Scenario: One round carries both the status table and fresh findings

- **WHEN** an incremental review runs against a report with two open `Fix now` findings and finds one new defect
- **THEN** the appended round lists both prior findings by ID with their status, adds the new finding in its arena table, and ends with a single verdict line

#### Scenario: Rounds are append-only and header round is bumped

- **WHEN** the round is persisted
- **THEN** prior rounds are unmodified and the header's `round:` is incremented

### Requirement: Adverse verdicts append a gate section to tasks.md

When the round's verdict is `findings remain`, the skill SHALL append an unchecked `## Gates — round <n>` section to the change's `tasks.md` with one item per open `Fix now` finding, referenced by durable ID. It SHALL never uncheck or edit a prior round's gate section. A clearing verdict appends no section.

#### Scenario: Adverse round writes its gate section

- **WHEN** the round's verdict is `findings remain` with open findings `A3` and `C5`
- **THEN** `tasks.md` gains `## Gates — round <n>` with one unchecked item for each of `A3` and `C5`, and prior gate sections are untouched

#### Scenario: Clearing round writes no gate section

- **WHEN** the round's verdict is `clear to land`
- **THEN** `tasks.md` is not modified

