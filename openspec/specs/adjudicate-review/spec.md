# adjudicate-review Specification

## Purpose
Defines `/adjudicate-review`: a fresh-session, file-driven owner adjudication pass over a persisted `review.md`. It re-grounds each finding's proposed disposition in the cited code, interviews the owner one finding (or merge-group) at a time, and appends a `### Adjudications` subsection — the durable substrate that carries owner decisions into the report so `/recheck-review` and `/landfall` read the round as amended. It also owns the shared effective-findings / effective-verdict reader rule those skills consume.
## Requirements
### Requirement: File-driven adjudication over a persisted review.md

The skill SHALL be invokable as `/adjudicate-review <change>` and SHALL take the change's persisted `openspec/changes/<name>/review.md` as its **only** input, deriving no state from any prior review chat. It SHALL run in a fresh session and consume the shared machine-readable header and round structure defined in `.claude/skills/spec-review/reference/finding-format.md`. Invoked with no argument, it SHALL resolve the single active change with a `review.md`, asking the owner to choose when more than one qualifies.

#### Scenario: Adjudication reads only the persisted report
- **WHEN** `/adjudicate-review add-foo` runs in a session that never produced the review
- **THEN** the skill bases its work solely on `openspec/changes/add-foo/review.md`, requiring no chat context from the originating review

#### Scenario: No argument resolves the target
- **WHEN** `/adjudicate-review` runs with no argument and exactly one active change has a `review.md` with findings
- **THEN** the skill selects that change; when more than one qualifies it asks the owner to choose rather than guessing

### Requirement: Concise re-grounding then a one-finding-at-a-time interview

For the latest round's findings, the skill SHALL re-ground each proposed disposition in the code the finding cites — including findings dispositioned `Drop` — by explicitly invoking the `/opsx:explore` skill: "explore" here names that skill, not a loose reading pass, and the invocation is required. It SHALL treat the persisted dispositions as proposals to confirm or reopen, not as settled. It SHALL then interview the owner one finding, or one merge-group, at a time via `AskUserQuestion`, each question naming the finding ID(s) it covers (including merged findings, e.g. "A1+C3 are the same defect; this question covers both") with the re-grounded evidence and a recommended disposition. The skill SHALL NOT skip the interview or batch unrelated findings into a single question.

#### Scenario: Re-grounding invokes the explore skill
- **WHEN** the skill re-grounds the latest round's findings before the interview
- **THEN** it does so by explicitly invoking `/opsx:explore`, following each finding's citation into the cited code under that skill

#### Scenario: Every disposition is re-grounded before the interview
- **WHEN** the latest round contains findings dispositioned `Fix now`, `File issue`, and `Drop`
- **THEN** the skill re-grounds each in its cited code — Drops included — before putting any question to the owner

#### Scenario: Questions name their finding IDs
- **WHEN** the skill puts a finding to the owner, including a merge of two findings
- **THEN** the question names the covered finding ID(s) and carries the re-grounded evidence and a recommended disposition

### Requirement: Adjudications persist as a nested subsection, written only on change

When the interview changes at least one finding's disposition (or merges findings), the skill SHALL append a `### Adjudications (<date>)` subsection **inside** the latest `## Round N` block — never rewriting the round's original findings table or any prior round. The subsection SHALL list only the changed findings with columns `# | Old → New | Rationale` and SHALL end with a `**Verdict:**` line carrying the recomputed round verdict. When the interview confirms every disposition unchanged, the skill SHALL write nothing: the round's original table and verdict stand and the header's `round:` is unchanged. Adjudications SHALL NOT create a new round.

#### Scenario: A disposition change writes a nested subsection
- **WHEN** the owner re-dispositions `s1` from `Fix now` to `File issue`
- **THEN** a `### Adjudications` subsection is appended inside the latest round listing `s1 | Fix now → File issue | <rationale>` with a recomputed `**Verdict:**` line, and the round's original findings table is unchanged

#### Scenario: Confirming everything as-is writes nothing
- **WHEN** the interview confirms every finding's disposition unchanged
- **THEN** no `### Adjudications` subsection is written, the round's original verdict stands, and `round:` is not bumped

### Requirement: The Adjudications structure and the as-amended reader rule are the shared contract

The `### Adjudications` subsection structure and the rule for reading a round as amended SHALL be defined in the shared `.claude/skills/spec-review/reference/finding-format.md`, which `/adjudicate-review` reads for format only — taking no runtime dependency on the `spec-review` skill. A round's **effective findings** SHALL be its findings table with each finding's disposition overridden by the latest `### Adjudications` entry for that finding ID; a round's **effective verdict** SHALL be the last verdict-bearing line in the round (an `### Adjudications` verdict overriding the round's own `**Verdict:**` line). Because the verdict keys off dispositions and not counts, an `### Adjudications` subsection alone SHALL be able to make a round's effective verdict `clear to land`.

#### Scenario: Effective verdict comes from the adjudication line
- **WHEN** a round's `**Verdict:**` line reads `findings remain` and its `### Adjudications` line reads `clear to land`
- **THEN** any reader of the report resolves the round's effective verdict to `clear to land`

#### Scenario: Re-dispositioned findings drop out of the open set
- **WHEN** the round's only open `Fix now` finding is re-dispositioned to `File issue` in `### Adjudications`
- **THEN** the round's effective findings carry no open `Fix now` finding, so the effective verdict is `clear to land`

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

