# recheck-review Specification (delta)

## ADDED Requirements

### Requirement: Recheck routing boundary

`/recheck-review` SHALL be the review lever only when the fix delta changed code OR spec artifacts — never both. When the delta changed both sides, the applicable review is `/incremental-spec-review`. Delta size SHALL NOT be a routing signal in either direction.

#### Scenario: Code-only fix delta is recheck-scoped

- **WHEN** the fix delta modifies implementation files but no spec artifacts
- **THEN** `/recheck-review` is the applicable review regardless of the delta's size

#### Scenario: Mixed fix delta routes out

- **WHEN** at invocation the fix delta is found to touch both code and spec artifacts
- **THEN** the skill directs the owner to `/incremental-spec-review` instead of verifying

## MODIFIED Requirements

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
