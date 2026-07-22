## ADDED Requirements

### Requirement: An adverse promotion adds a gate line for every promoted Fix now

The mirror of the clearing case. When the adjudication **promotes** a finding to an open `Fix now` (from `Drop` or `File issue`), the skill SHALL ensure that finding owes exactly one gate item in the latest round's `## Gates — round <n>` section of the change's `tasks.md`, ahead of the verification gates. When the round carries **no** pending gate section (its own verdict cleared it, so the review never wrote one), the skill SHALL append the section per the gate-section shape in `.claude/skills/spec-review/reference/finding-format.md` — one item per open `Fix now` finding by durable ID plus the full pre-merge gate set restated, as the next numbered section. When the round **already** carries a pending gate section, the skill SHALL insert one gate line per newly-promoted finding into that section's finding block and renumber the section so the verification-gate lines keep their fixed order after every finding item. Without the gate line the invalidated pre-merge gates stay checked and `/landfall`'s all-tasks-checked gate never re-runs them after the promoted fix lands. The skill SHALL touch only the latest round's section.

#### Scenario: Promotion into a round that cleared its own verdict

- **WHEN** the adjudication promotes `C3` from `Drop` to open `Fix now` in a round whose own verdict cleared it, so `tasks.md` carries no gate section for that round
- **THEN** a numbered `## Gates — round <n>` section is appended carrying `C3` plus the restated pre-merge gates

#### Scenario: Promotion into a round that already has a gate section

- **WHEN** the adjudication promotes `B2` to open `Fix now` in a round whose gate section already reads `N.1 fix A1 / N.2 lint / N.3 tsc …`
- **THEN** no second section is created; the section becomes `N.1 fix A1 / N.2 fix B2 / N.3 lint / N.4 tsc …`, with the verification gates still last

### Requirement: A demotion checks off and annotates the finding's gate line

When the adjudication **demotes** a finding out of open `Fix now` (to `Drop` or `File issue`) and the recomputed verdict leaves the round adverse, the skill SHALL check off that finding's existing gate line in the latest round's `## Gates — round <n>` section **in place** and SHALL annotate it with a trailing `— _italic note_` on the item line naming the disposition change and pointing at the round's `### Adjudications` — `dropped at adjudication` for a `Drop`, `filed #<N>` for a confirmed `File issue`, carrying the issue number created in-interview. The skill SHALL NOT delete the line: it stays as the visible record that the finding existed and how it left the open set. Without the check, the fix session faces an item with no work behind it and `/landfall`'s all-tasks-checked gate blocks on a finding that no longer blocks. The skill SHALL touch only the latest round's section, only lines for findings this adjudication demoted, and SHALL NOT renumber (the item count is unchanged).

#### Scenario: Dropped finding's gate line is checked and annotated

- **WHEN** the adjudication re-dispositions `C6` from `Fix now` to `Drop` while other open `Fix now` findings remain
- **THEN** `C6`'s gate line is checked off in place with a trailing italic note naming the drop and pointing at the round's Adjudications, and no line is deleted or renumbered

#### Scenario: Filed finding carries its issue number

- **WHEN** the adjudication re-dispositions `A4` from `Fix now` to a confirmed `File issue` and the issue is created in-interview
- **THEN** `A4`'s gate line is checked off with a trailing italic note carrying `filed #<N>`
