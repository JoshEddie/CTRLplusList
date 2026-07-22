# trunk-workflow Delta

## MODIFIED Requirements

### Requirement: /set-sail SHALL gate the apply stage and wrap opsx:apply

`/set-sail` SHALL be the only route into implementing a change: it gates on one-change-mid-apply, flips the issue to `UNDER SAIL`, states the mid-voyage disciplines, and delegates the task loop to `/opsx:apply`.

#### Scenario: Mid-apply change blocks a second voyage
- **WHEN** `/set-sail` runs while an active change in `openspec/changes/` has unchecked `tasks.md` items alongside uncommitted code changes
- **THEN** the skill stops before touching anything, naming the mid-apply change

#### Scenario: Implemented change under review does not block
- **WHEN** `/set-sail` runs while the tree holds only a fully-implemented change awaiting review or landing plus the new change's artifacts
- **THEN** the skill proceeds, flips the new issue `CHARTED` → `UNDER SAIL`, and enters apply

#### Scenario: Under sail is the single occupied-tree beacon
- **WHEN** `/set-sail` flips the issue to `UNDER SAIL`
- **THEN** that label is the board's only "the tree is occupied" signal

#### Scenario: Discipline defers discovery routing to the definition layer
- **WHEN** `/set-sail` states the mid-voyage disciplines at the start of a voyage
- **THEN** it states that a discovery is never folded into the active change, that charting onto an open map runs through `/anchor` (whose charter move is owned by `anchor-and-run-aground`), and that a mirage stops work and fires `/run-aground` (owned by `anchor-and-run-aground`) — without mandating `OFF THE MAP` as the only route or restating the charter criteria

#### Scenario: Embark flips no label
- **WHEN** `/embark` produces proposal artifacts
- **THEN** no label is flipped — proposal artifacts are tree state, authoritatively recorded by the change directory
