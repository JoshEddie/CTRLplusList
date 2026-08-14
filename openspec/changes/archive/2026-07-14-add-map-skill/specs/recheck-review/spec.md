# recheck-review Delta

## MODIFIED Requirements

### Requirement: Recheck SHALL append rounds and escalate when fixes outgrow it

Each recheck SHALL append a numbered round section to the target report (never rewriting prior rounds) with a verdict of exactly one of: `clear to land` (no `Fix now` findings remain open), `findings remain`, or `outgrew recheck`. The skill SHALL declare `outgrew recheck` — directing the owner to a full re-review — when the fix delta touches files outside the original review's diff or rivals the original diff in size, rather than stretching a recheck to cover unreviewed ground.

#### Scenario: Clean round clears landing
- **WHEN** a recheck finds every open `Fix now` finding resolved and no new issues
- **THEN** it appends a round with verdict `clear to land`, satisfying `/landfall`'s review gate

#### Scenario: Sprawling fixes escalate
- **WHEN** the fix delta modifies files the original review never covered
- **THEN** the round's verdict is `outgrew recheck` and the owner is directed to run the full review again
