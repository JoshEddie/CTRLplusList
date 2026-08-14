# incremental-spec-review delta

## MODIFIED Requirements

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
