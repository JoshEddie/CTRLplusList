# spec-review Specification

## MODIFIED Requirements

### Requirement: The consolidated report SHALL be persisted to the change directory

After emitting the consolidated report, the skill SHALL persist it to
`openspec/changes/<name>/review.md`. When a propose-time scaffold exists (a
`round: 0` file created by the `review-artifact` capability), the skill SHALL
**append round 1 into that existing file**, filling the review family's shared
machine-readable header — setting `round: 1` and writing the real `anchor` sha and
`diff-source` over the scaffold's `TBD` placeholders — rather than creating the
file from scratch. When no scaffold exists (no related change was resolved, or the
review targets an external PR outside any OpenSpec change), the skill SHALL NOT
write a report file and SHALL say so. The persisted form SHALL be a
**self-contained round** per the bundled `reference/finding-format.md` round
structure, not the session report verbatim: the `# /spec-review` title becomes the
`## Round 1` heading, every section of the report nests at `###` (or deeper) inside
it so nothing at `##` level belongs to the round, and the round SHALL end with a
round-vocabulary `**Verdict:**` line — mapping the session verdict `Approve → clear
to land` and `Request changes → findings remain` (blockers listed after `findings
remain`) — which is the line `/landfall` and `/recheck-review` read and an `###
Adjudications` subsection overrides. A repeat full review — run only by explicit
owner choice — SHALL append a new round rather than overwriting prior rounds. The
persisted report is the contract consumed by `/recheck-review` and
`/incremental-spec-review` (round appending, delta computation from the header) and
`/landfall` (latest-verdict gate), and travels with the change directory at archive
time.

#### Scenario: Round 1 is appended to the propose-time scaffold

- **WHEN** `/spec-review` persists its first round for a resolved change whose
  `review.md` is a `round: 0` scaffold
- **THEN** the skill appends `## Round 1` to the existing `review.md`, sets the
  header `round: 1`, and replaces the `TBD` `anchor`/`diff-source` with the real
  values, leaving no separate created-from-scratch file

#### Scenario: Round nests its sections and ends with a round verdict

- **WHEN** `/spec-review` persists its report for resolved change `add-foo`
- **THEN** `review.md`'s round 1 nests its findings tables, "what looks good", and
  verdict at `###` under `## Round 1`, and ends with a `**Verdict:** clear to
  land`/`findings remain` line rather than the session `Approve`/`Request changes`
  wording

#### Scenario: No scaffold and no related change writes nothing

- **WHEN** `/spec-review` runs on a diff with no resolved OpenSpec change and thus
  no scaffold
- **THEN** no `review.md` is written and the report notes the review was not
  persisted

#### Scenario: Repeat review appends a round

- **WHEN** the owner explicitly chooses to run a full `/spec-review` again on a
  change with an existing `review.md`
- **THEN** the new report is appended to `review.md` as the next round, with
  earlier rounds unmodified

### Requirement: Adverse rounds append a gate section to tasks.md

When the persisted round's verdict is `findings remain`, the skill SHALL append a
numbered `## <N>. Gates — round <n>` section to the resolved change's `tasks.md`,
continuing the file's section numbering. The section SHALL carry, as separate
checkable items: one item per open `Fix now` finding referenced by durable ID, and
the five pre-merge verification gates (`npm run lint`, `npx tsc --noEmit`, `npm run
build`, `npm run test:coverage`, `npm run test:e2e`) restated so each partial
failure is visible — the two test gates inheriting the doc-only exemption. A
lead-in under the heading SHALL point fix sessions to `review.md` Round `<n>` by
durable ID for each finding's severity, location, citation, and reconcile side.
Prior gate sections SHALL never be unchecked or edited; a clearing verdict appends
no section. `/landfall`'s all-tasks-checked gate is the enforcement mechanism and
needs no change of its own.

#### Scenario: Adverse round appends a gate section with restated gates

- **WHEN** round 1 persists with verdict `findings remain` and open findings `A1`
  and `B4`
- **THEN** `tasks.md` gains a numbered `## Gates — round 1` section listing `A1` and
  `B4` plus the five pre-merge gates as separate checkable items, under a lead-in
  pointing to `review.md` Round 1 by durable ID

#### Scenario: Clearing verdict appends nothing

- **WHEN** the persisted round's verdict is `clear to land`
- **THEN** no gate section is appended

#### Scenario: Finding lines reference review.md by durable ID

- **WHEN** a fix session opens the gate section in a fresh chat
- **THEN** the lead-in directs it to `review.md` Round `<n>`, where each finding's
  durable ID resolves its full severity, `path:line`, citation, and disposition
