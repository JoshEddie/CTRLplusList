# adjudicate-review Specification (delta)

## ADDED Requirements

### Requirement: A clearing adjudication deletes the pending gate section

When the adjudication's recomputed effective verdict clears the latest round (`clear to land`), the skill SHALL delete that round's pending `## Gates — round <n>` section from the change's `tasks.md` — a gate for findings that no longer block is dead weight and would wedge `/landfall`'s all-tasks-checked gate on a cleared round. The skill SHALL delete only the latest adverse round's pending section and SHALL NOT touch any prior round's gate section or any other `tasks.md` content. When the recomputed verdict does not clear the round, the gate section stands.

#### Scenario: Cleared round drops its gate section

- **WHEN** the adjudication re-dispositions every open `Fix now` finding of the latest round and writes `**Verdict:** clear to land`
- **THEN** that round's unchecked `## Gates — round <n>` section is deleted from `tasks.md`, with all other content untouched

#### Scenario: Non-clearing adjudication leaves the gate standing

- **WHEN** the adjudication changes some dispositions but open `Fix now` findings remain
- **THEN** the pending gate section is not deleted

### Requirement: Confirmed File-issue dispositions create the issue in-interview

When the owner confirms a finding's disposition as `File issue`, the interview SHALL ask the issue's type — a chunk into the change's open map (same-release commitment) or a standalone issue labeled `OFF THE MAP` — and the skill SHALL then create the issue via `gh issue create` (wiring it as a sub-issue of the map for the map case) and record the created issue's link in the Adjudications rationale for that finding. The skill SHALL NOT invoke `/anchor` or any map-skill mechanics for this creation. A confirmed `File issue` with no created issue SHALL NOT be recorded as settled.

#### Scenario: Owner picks the map, issue is wired under it

- **WHEN** the owner confirms `File issue` for finding `B2` and chooses the open map
- **THEN** the skill creates the issue, adds it as a sub-issue of that map, and the Adjudications rationale for `B2` carries the issue link

#### Scenario: Owner picks off the map

- **WHEN** the owner confirms `File issue` and chooses a standalone follow-up
- **THEN** the skill creates the issue labeled `OFF THE MAP` and records its link in the rationale

## MODIFIED Requirements

### Requirement: Concise re-grounding then a one-finding-at-a-time interview

For the latest round's findings, the skill SHALL re-ground each proposed disposition in the code the finding cites — a concise explore pass, including findings dispositioned `Drop` — treating the persisted dispositions as proposals to confirm or reopen, not as settled. It SHALL then interview the owner one finding, or one merge-group, at a time via `AskUserQuestion`, each question naming the finding ID(s) it covers (including merged findings, e.g. "A1+C3 are the same defect; this question covers both") with the re-grounded evidence and a recommended disposition. The skill SHALL NOT skip the interview or batch unrelated findings into a single question.

#### Scenario: Every disposition is re-grounded before the interview

- **WHEN** the latest round contains findings dispositioned `Fix now`, `File issue`, and `Drop`
- **THEN** the skill re-grounds each in its cited code — Drops included — before putting any question to the owner

#### Scenario: Questions name their finding IDs

- **WHEN** the skill puts a finding to the owner, including a merge of two findings
- **THEN** the question names the covered finding ID(s) and carries the re-grounded evidence and a recommended disposition
