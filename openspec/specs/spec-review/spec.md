# spec-review Specification

## Purpose

TBD - created by archiving change add-spec-review-skill. Update Purpose after archive.
## Requirements
### Requirement: Invocation and scope resolution

The skill SHALL be invokable as `/spec-review` with an optional argument that is a change name, a PR reference, or a diff source. When invoked with no argument, the skill SHALL review the staged diff (`git diff --staged`) — the trunk workflow's pre-commit review scope — regardless of the current branch. Branch work is reviewed via an explicit PR reference or ref range.

#### Scenario: No argument defaults to the staged diff
- **WHEN** a user runs `/spec-review` with no argument
- **THEN** the skill uses `git diff --staged` as the review scope, on any branch

#### Scenario: Branch review requires an explicit scope
- **WHEN** a user wants to review a feature branch against `dev`
- **THEN** they pass an explicit scope (the PR reference or a ref range such as `dev...HEAD`); no argument does not imply it

#### Scenario: Explicit PR reference
- **WHEN** a user runs `/spec-review <PR>` with a pull-request reference
- **THEN** the skill fetches that PR's diff via `gh` and uses it as the review scope

#### Scenario: Explicit change name
- **WHEN** a user runs `/spec-review <change-name>` naming an active OpenSpec change
- **THEN** the skill uses that change as the contract-audit target without attempting auto-detection

### Requirement: Multi-agent orchestration

The skill SHALL run its review phases as parallel sub-agents — one per arena: an
alignment agent, a boundary agent, a convention agent, and a testing agent — and
SHALL consolidate their findings into a single report. The skill SHALL perform
this parallel review fan-out by spawning the arena agents directly as Agent-tool
sub-agents, issued together so they run concurrently, with no dependency on the
Workflow tool or any bundled workflow script.

Each arena agent SHALL be instructed to reply with only a JSON object
`{"findings": [...], "deferredToCI": [...]}` whose findings carry exactly the
fields of the skill's finding shape (as defined in the skill's finding-format
reference), with `phase` set to the agent's own arena key (`alignment` /
`boundary` / `convention` / `testing`). The skill SHALL parse and validate each
reply against that shape — required fields present and the enumerated `phase` /
`severity` / `disposition` values respected. On a malformed reply the skill SHALL
retry exactly once by sending a follow-up message to the same agent requesting
only the corrected JSON; if the reply is still malformed after that single retry,
the skill SHALL abort the review, naming the failed arena and surfacing the raw
reply, and SHALL NOT persist a partial round.

The skill SHALL retain in the orchestrating session every interactive or
orchestrator-judgment step: scope and change resolution (including any
`AskUserQuestion` prompts), the CI status read, consolidation of the returned
findings into the report, the verdict / clear-to-archive determination, and the
adjudication handoff. The skill SHALL pass each arena agent only fully-resolved,
non-interactive inputs (at minimum the diff source and the agent's bundled brief
location; additionally, for the alignment and testing agents, the resolved
change name and archive state where applicable) and SHALL consume the findings
the agents return for consolidation. This SHALL NOT weaken the existing
"OpenSpec change resolution" requirement: its interactive steps remain in the
skill.

#### Scenario: Fan-out runs as direct parallel sub-agents

- **WHEN** `/spec-review` executes against a resolved diff
- **THEN** the skill spawns the alignment, boundary, convention, and testing
  arena agents as Agent-tool sub-agents issued together so they run
  concurrently, without invoking the Workflow tool, and their findings are
  returned to the skill and merged into one consolidated report

#### Scenario: Phase findings arrive as validated JSON replies

- **WHEN** an arena agent produces findings
- **THEN** it replies with only a JSON object matching the skill's finding
  shape with `phase` one of `alignment` / `boundary` / `convention` / `testing`,
  and the skill validates the reply — required fields and enumerated values —
  before consolidating, rather than consuming free-text prose

#### Scenario: Malformed reply is retried once with the same agent

- **WHEN** an arena agent's reply fails to parse or validate against the finding
  shape
- **THEN** the skill sends that same agent one follow-up message requesting only
  the corrected JSON object, reusing the agent's existing review context rather
  than re-running the arena

#### Scenario: Persistent malformed reply aborts the review

- **WHEN** an arena agent's reply is still malformed after the single retry
- **THEN** the skill aborts the review, names the failed arena, surfaces the raw
  reply, and persists no round

#### Scenario: Interactive steps stay in the orchestrating session

- **WHEN** scope resolution is ambiguous (more than one plausible change)
- **THEN** the interaction (e.g. `AskUserQuestion`) is performed by the skill in
  the orchestrating session, never by an arena agent, which receives only the
  already-resolved inputs

#### Scenario: Arena agents receive resolved inputs and return findings

- **WHEN** the skill spawns the arena agents
- **THEN** it passes each one the diff source and its bundled brief location, and —
  for the alignment and testing agents — the resolved change name and archive
  state, and consumes the findings the agents return rather than re-deriving them

### Requirement: Convention audit follows CLAUDE.md doc-pointers

The convention-audit phase SHALL always audit the diff against the repository's root `CLAUDE.md`. When `CLAUDE.md` declares a pointer to a supporting document (e.g. "Read DATABASE.md first") and the diff touches the subject that pointer is gated on, the skill SHALL read that supporting document and audit the diff against it. Pointer following SHALL be derived generically from `CLAUDE.md`'s declared pointers, not from a hardcoded filename list.

The test-subject pointer is the one exception: `TESTING.md`, test files, and all test-quality duties (test substance, missing tests, coverage-gaming) belong to the testing arena per the "Testing arena charter" requirement, and the convention audit SHALL NOT load `TESTING.md` or audit test files.

#### Scenario: DB changes trigger DATABASE.md audit
- **WHEN** the diff modifies database schema or queries as gated by the `CLAUDE.md` pointer
- **THEN** the skill reads `DATABASE.md` and audits the change against its rules, including the `neon-http` no-transactions constraint

#### Scenario: New pointer is picked up without code change
- **WHEN** a new "Read X first" pointer is added to `CLAUDE.md` and the diff hits its trigger
- **THEN** the skill follows the new pointer without requiring an edit to the skill itself

#### Scenario: Untriggered pointers are not loaded
- **WHEN** the diff does not touch the subject a given pointer is gated on
- **THEN** the skill does not read that supporting document for the audit

#### Scenario: Test duties route to the testing arena

- **WHEN** the diff touches test files or behavior warranting a `TESTING.md` audit
- **THEN** the convention arena raises no test-quality finding; the testing arena owns the audit

### Requirement: OpenSpec change resolution

The alignment arena SHALL identify the related OpenSpec change by auto-detection, using `openspec list --json` together with commit messages and the spec paths the diff touches. When auto-detection is ambiguous (more than one plausible change), the skill SHALL ask the user to choose. When no related change is found, the skill SHALL ask the user whether to proceed with no alignment audit or to name a change to review against; only on the user choosing to proceed without one SHALL it skip the alignment arena and still produce the boundary, convention, and testing findings — the testing arena running degraded per its charter.

#### Scenario: Single match auto-detected
- **WHEN** commit messages and diffed spec paths point to exactly one active change
- **THEN** the skill selects that change for the alignment audit without prompting

#### Scenario: Ambiguous match prompts the user
- **WHEN** auto-detection yields more than one plausible change
- **THEN** the skill asks the user to pick which change to audit

#### Scenario: No change found prompts the user
- **WHEN** no related OpenSpec change can be identified (e.g. a hotfix PR)
- **THEN** the skill asks the user whether to proceed with no alignment audit or to name a change to review against

#### Scenario: User opts to proceed without an alignment audit
- **WHEN** no related change is found and the user chooses to proceed without one
- **THEN** the skill skips the alignment arena and still reports boundary, convention, and degraded testing findings

### Requirement: Contract audit against the resolved change

The alignment arena — the contract audit — SHALL read the resolved change's `tasks.md`, `design.md`, and `specs/**/spec.md`. When the change was resolved by auto-detection it SHALL be read from the active `openspec/changes/<name>/` directory and SHALL NOT be substituted by an `openspec/changes/archive/` copy. When the user explicitly names a change that exists only under `openspec/changes/archive/` (e.g. a PR reviewed after its change was archived), the skill SHALL read that change from its date-prefixed archive directory `openspec/changes/archive/*-<name>/`. For the resolved change it SHALL verify that every task marked complete (`[x]`) in `tasks.md` corresponds to real work present in the diff or codebase, that the completed work conforms to `design.md` and `specs/**/spec.md`, and that no behavior was added that no task or spec documents (undocumented scope creep).

When an alignment check surfaces a disagreement between the implementation and the change's own `tasks.md`/`design.md`/`spec.md`, the skill SHALL report it as a mismatch without presuming which artifact is the defect, because in a not-yet-archived change the spec and the implementation were authored together and are equally provisional. The proposed resolution SHALL name both directions — amend the implementation, or amend/relax the task or spec — and the user adjudicates which side is correct. This neutral framing applies to an active (pre-archive) change and to a premature archive (see "Archive state governs reconciliation latitude"); when the review runs against an already-merged archived change the canonical spec is the fixed contract and the skill SHALL apply the directional "implementation must conform to the spec" framing instead.

It SHALL run `openspec validate <name> --strict` for an active change and report failures; for any archived change (premature or merged), which the CLI cannot resolve by name, it SHALL skip validation and note it as not-applicable rather than reporting a failure.

#### Scenario: Task marked complete without matching work is flagged

- **WHEN** a `tasks.md` item is marked `[x]` but the described work is absent from the diff and codebase
- **THEN** the skill flags the task↔implementation mismatch without presuming the task is correct, and proposes both resolution directions (implement the work, or amend/unmark the task)

#### Scenario: Work contradicting the spec is flagged

- **WHEN** completed work conflicts with a SHALL requirement in `design.md` or `specs/**/spec.md`
- **THEN** the skill flags the implementation↔spec mismatch citing the requirement, without presuming the spec is correct, and proposes both resolution directions (change the implementation, or amend the spec)

#### Scenario: Mismatch against a merged archived spec is directional

- **WHEN** the review runs against an already-merged archived change (its archive directory already exists on the diff's base branch) and the implementation conflicts with the canonical spec
- **THEN** the skill treats the canonical spec as the fixed contract and flags the implementation as the side that must conform

#### Scenario: Undocumented behavior is flagged as scope creep

- **WHEN** the diff introduces behavior not covered by any task or spec requirement
- **THEN** the skill flags it as undocumented scope creep, with both resolution directions available (remove the behavior, or document it in a task/spec)

#### Scenario: Auto-detected change reads the active directory only

- **WHEN** the alignment audit loads the artifacts of an auto-detected change
- **THEN** it reads from `openspec/changes/<name>/` and not from `openspec/changes/archive/`

#### Scenario: Explicitly-named archived change reads the archive

- **WHEN** the user explicitly names a change that exists only under `openspec/changes/archive/`
- **THEN** the alignment audit reads it from `openspec/changes/archive/*-<name>/` and skips `openspec validate`

### Requirement: Archive state governs reconciliation latitude

When the resolved change is located under `openspec/changes/archive/`, the skill SHALL determine whether that archive directory is introduced by the diff under review or already present on the diff's base branch, and SHALL set the contract-audit framing accordingly. An archive directory added by the diff (absent on the base branch) is a premature archive whose spec delta has already been synced within the PR; an archive directory already present on the base branch is a merged archive whose spec delta is canonical.

For a premature archive the skill SHALL apply the direction-neutral framing of an active change, but SHALL restrict in-PR reconciliation to sync-neutral edits — wording or clarity fixes to the spec, or fixes affecting only the code being merged. When reconciling a mismatch would add, remove, or materially alter a SHALL requirement, the skill SHALL NOT propose hand-editing the archived artifacts, SHALL require a fresh propose→archive cycle, and SHALL block the PR.

For a merged archive the skill SHALL treat the canonical spec as the fixed contract: the implementation must conform. A conformance violation SHALL be resolved only by conforming the implementation or by opening a fresh change proposal, never by editing the merged spec in this PR, and SHALL block the PR until resolved.

#### Scenario: Premature archive allows sync-neutral reconciliation
- **WHEN** the resolved change's archive directory is added by the diff and a contract mismatch can be reconciled by a wording fix or a code-only change
- **THEN** the skill proposes that reconciliation as `Fix now` under direction-neutral framing

#### Scenario: Premature archive blocks a significant spec change
- **WHEN** the resolved change's archive directory is added by the diff and reconciling a mismatch would add, remove, or materially alter a SHALL requirement
- **THEN** the skill does not propose hand-editing the archived spec, requires a fresh propose→archive cycle, and blocks the PR

#### Scenario: Merged archive requires conformance or a fresh proposal
- **WHEN** the resolved change's archive directory already exists on the diff's base branch and the implementation conflicts with the canonical spec
- **THEN** the skill offers only conforming the implementation or opening a fresh proposal, never editing the merged spec, and blocks the PR

### Requirement: Hardened disposition criteria

`Fix now` SHALL be governed by scope, never effort: any in-charter defect at any size, plus any fix whose deferral would ship soon-dead code (a follow-up that would delete or redo what is merging). `File issue` SHALL cite the charter boundary the finding exceeds — a proposed `File issue` with no charter citation is invalid and SHALL be re-dispositioned. Fix cost SHALL never be an input to a disposition.

#### Scenario: A large in-charter defect is still Fix now

- **WHEN** a finding is squarely within the change's charter but expensive to fix
- **THEN** its proposed disposition is `Fix now`; effort does not demote it

#### Scenario: Deferral shipping soon-dead code is Fix now

- **WHEN** deferring a finding would merge code the follow-up issue would immediately delete or redo
- **THEN** the proposed disposition is `Fix now` even if the finding is otherwise arguably out of charter

#### Scenario: File issue requires a charter citation

- **WHEN** an agent proposes `File issue` without citing the charter boundary the finding exceeds
- **THEN** the disposition is invalid and the finding is re-dispositioned before the report is emitted

### Requirement: Consolidated report with a defined output contract and a clear-to-archive verdict

The skill SHALL emit a single consolidated report in a fixed, deterministic output contract — explicitly defined order, style, and wording — so that successive reviews are scannable and comparable. The order SHALL be: (1) header naming the resolved change (or "no related change"); (2) a one- to two-sentence summary of overall quality and headline alignment status; (3) a scope line stating the diff source and resolved change (or that the alignment audit was skipped); (4) findings grouped by arena in the fixed order alignment → boundary → convention → testing, each as a table whose columns are ID, severity, location, finding, disposition, and citation; (5) a short "what looks good" bullet list; (6) the verdict; (7) a pointer to `/adjudicate-review` as the final line.

Each finding's ID SHALL follow the shared scheme defined in `reference/finding-format.md`: a capital arena letter (`A` alignment, `B` boundary, `C` convention, `T` testing) followed by an integer that increments globally across all arena tables within the round — one continuous sequence, never restarting per arena — so every finding is referable by an ID unique within its round (e.g. `A1`, `B2`, `T3`, never `A1` and `B1` in the same round) and merges are written by joining IDs with `+` (e.g. `A1+C3`).

Severity SHALL use the text labels `Critical` / `Major` / `Minor` with no emojis. Each finding SHALL carry a proposed disposition of exactly one of `Fix now` / `File issue` / `Drop`, applying the hardened disposition criteria (scope-never-effort, soon-dead-code, charter citation for `File issue`). Wording SHALL be terse and factual, citing the offending line and — for convention findings — the specific doc rule or named universal principle, and — for alignment findings — the SHALL requirement. The skill SHOULD use an ASCII diagram for a finding when it conveys a relationship (data/control flow, state machine, dependency or task-to-work mapping, before/after of a fix) faster than prose; diagrams serve terseness and SHALL NOT be included as decoration.

The verdict SHALL be `Request changes` when at least one open finding is dispositioned `Fix now`, and `Approve` otherwise. Findings dispositioned `File issue` or `Drop` SHALL NOT, on their own, cause a `Request changes` verdict — the verdict is determined by dispositions, not by the count of findings. Severity SHALL NOT override the disposition: a `Minor` `Fix now` blocks and a higher-severity finding adjudicated `Drop` does not.

The verdict SHALL also state the archive-gate outcome appropriate to the resolved change's state. For an active or premature-archive change the change SHALL be reported clear to archive only when all `tasks.md` items are complete, validation passes (or is not-applicable for a premature archive), and the alignment audit found no unresolved conformance or false-complete findings; otherwise the verdict SHALL state it is not yet clear to archive and list the blockers. For a merged-archive change the clear-to-archive gate is moot and the verdict SHALL state `already archived`; an open conformance violation against a merged archive SHALL force `Request changes` and state the PR is blocked pending implementation conformance or a fresh proposal. When the alignment audit was skipped (no related change), the verdict SHALL state that no archive gate applies and be determined solely by the boundary, convention, and testing dispositions.

#### Scenario: Output follows the fixed order and style

- **WHEN** the skill emits its report
- **THEN** sections appear in the defined order, findings are grouped alignment → boundary → convention → testing in tables with the defined columns, each finding carries a capital arena-letter + global-integer ID, severity uses text labels with no emojis, and every finding carries a `Fix now` / `File issue` / `Drop` disposition

#### Scenario: Finding IDs are one continuous sequence within the round

- **WHEN** a round contains findings across the alignment, boundary, convention, and testing arenas
- **THEN** each finding's integer increments globally across the arenas (e.g. `A1`, `B2`, `T3` — never `A1` and `B1` together) so no two findings in the round share an integer and any finding is referable by its ID alone

#### Scenario: Final line points at adjudication

- **WHEN** the report and verdict have been emitted
- **THEN** the final output line is a pointer offering `/adjudicate-review <change>` rather than an in-context explore-mode prompt

#### Scenario: Approve verdict despite non-blocking findings

- **WHEN** the report contains findings but none is dispositioned `Fix now` (all are `File issue` or `Drop`)
- **THEN** the verdict is `Approve`

#### Scenario: Request changes when a fix-now finding is open

- **WHEN** at least one open finding is dispositioned `Fix now`, regardless of its severity
- **THEN** the verdict is `Request changes`

#### Scenario: Clear-to-archive verdict when contract is satisfied

- **WHEN** all tasks are `[x]`, validation passes, and no alignment findings remain
- **THEN** the verdict states the change is clear to archive

#### Scenario: Not clear to archive when alignment findings exist

- **WHEN** any false-complete, conformance, or validation finding remains open
- **THEN** the verdict states the change is not yet clear to archive and lists the blocking findings

#### Scenario: No archive gate when alignment audit was skipped

- **WHEN** the user proceeded without an alignment audit because no related change was found
- **THEN** the verdict states no archive gate applies and is determined solely by the boundary, convention, and testing dispositions

#### Scenario: Merged-archive violation blocks pending a fresh proposal

- **WHEN** the review runs against a merged archive and an implementation-vs-spec conformance violation is open
- **THEN** the verdict is `Request changes` and states the PR is blocked pending implementation conformance or a fresh proposal

### Requirement: Adverse rounds append a gate section to tasks.md

When the persisted round's verdict is `findings remain`, the skill SHALL append a
numbered `## <N>. Gates — round <n>` section to the resolved change's `tasks.md`,
continuing the file's section numbering. The section SHALL carry, as separate
checkable items: one item per open `Fix now` finding referenced by durable ID, and
the five pre-merge verification gates (`npm run lint`, `npx tsc --noEmit`, `npm run
build`, `npm run test:coverage`, `npm run test:e2e`) restated so each partial
failure is visible — minus any gate omitted under the doc-only exemption, which
SHALL carry no checklist item, its omission and rationale named in the section's
lead-in instead. A lead-in under the heading SHALL point fix sessions to
`review.md` Round `<n>` by durable ID for each finding's severity, location,
citation, and reconcile side. Prior gate sections SHALL never be unchecked or
edited; a clearing verdict appends no section. `/landfall`'s all-tasks-checked
gate is the enforcement mechanism and needs no change of its own.

#### Scenario: Adverse round appends a gate section with restated gates

- **WHEN** round 1 persists with verdict `findings remain` and open findings `A1`
  and `B4`
- **THEN** `tasks.md` gains a numbered `## Gates — round 1` section listing `A1` and
  `B4` plus the five pre-merge gates as separate checkable items, under a lead-in
  pointing to `review.md` Round 1 by durable ID

#### Scenario: Doc-only round omits the exempt gates

- **WHEN** the round's change touches no executable file, so the two test gates are
  exempt
- **THEN** the appended section carries no `test:coverage` or `test:e2e` item, and
  its lead-in names both as omitted under the doc-only exemption

#### Scenario: Clearing verdict appends nothing

- **WHEN** the persisted round's verdict is `clear to land`
- **THEN** no gate section is appended

#### Scenario: Finding lines reference review.md by durable ID

- **WHEN** a fix session opens the gate section in a fresh chat
- **THEN** the lead-in directs it to `review.md` Round `<n>`, where each finding's
  durable ID resolves its full severity, `path:line`, citation, and disposition

### Requirement: Sub-agent briefs are bundled within the skill

The skill SHALL define each arena brief — alignment, boundary, convention, and
testing — within the skill itself, and SHALL NOT factor any brief into a
separately invocable skill. The orchestrator SHALL deliver each brief to its
sub-agent by reference to the brief's bundled location together with the review
inputs (the diff or the command to produce it, the resolved change name, and the
archive state where relevant), such that no review phase takes a runtime
dependency on a skill external to `spec-review`. Any contract shared across the
orchestrator and a brief — the structured finding shape, and the archive-state
definitions and reconciliation-latitude data — SHALL be defined in a single
source rather than duplicated per brief. The bundled briefs are the single
source of the arena contract for the whole review family:
`/incremental-spec-review` SHALL consume these same brief files (a format-only
file read, not a skill invocation), and no skill SHALL carry its own divergent
copy.

#### Scenario: Each brief is bundled, not a separate skill

- **WHEN** the `spec-review` skill is packaged
- **THEN** each of the alignment, boundary, convention, and testing briefs
  exists as a file bundled within the `spec-review` skill, and none is
  registered as its own invocable skill

#### Scenario: All phases run without any external skill present

- **WHEN** `/spec-review` runs and no skill other than `spec-review` is installed
- **THEN** all four arena phases execute using their bundled briefs without
  error

#### Scenario: A brief is delivered by reference with the review inputs

- **WHEN** the orchestrator spawns a review sub-agent
- **THEN** it passes the sub-agent the location of that agent's bundled brief
  together with the diff, the resolved change name, and the archive state where
  relevant, rather than reproducing the brief's body in the orchestrator's own
  working context

#### Scenario: A shared contract has a single source

- **WHEN** the structured finding shape or the archive-state definitions are
  needed by both the orchestrator and a brief
- **THEN** that contract is defined in one place and referenced, not copied into
  each brief

#### Scenario: The incremental skill consumes the same briefs

- **WHEN** `/incremental-spec-review` spawns its arena agents
- **THEN** they read the briefs bundled under `spec-review`, and no divergent
  brief copy exists in another skill

### Requirement: Concise, progressively-disclosed authoring

The skill SHALL be authored for conciseness and progressive disclosure: its
`SKILL.md` body SHALL stay under 500 lines and contain only the orchestrator's
job (scope resolution, fan-out invocation, CI read, consolidation, verdict,
handoff), with shared contracts and agent-facing detail placed in bundled
reference files rather than inline. Each reference file SHALL be a terminal leaf
(it SHALL NOT reference further files) and SHALL be referenced **one level deep**
from each entry point that needs it — `SKILL.md` and each sub-agent brief link to
it directly, and no brief SHALL reach a shared contract by pointing back through
`SKILL.md`. Any bundled markdown file longer than 100 lines SHALL begin with a
table of contents. This builds on, and does not weaken, the "Sub-agent briefs are
bundled within the skill" single-sourcing requirement: the single source MAY move
to a leaf reference file, but remains single.

#### Scenario: SKILL.md stays under the size limit

- **WHEN** the `spec-review` skill is packaged
- **THEN** its `SKILL.md` body is under 500 lines and carries the orchestrator's
  job rather than the agent-facing review contracts

#### Scenario: Shared contracts live in terminal leaf reference files

- **WHEN** a contract is shared between the orchestrator and a brief (e.g. the
  archive-state latitude table or the finding format)
- **THEN** it lives in a bundled reference file that itself references no further
  file, single-sourced rather than duplicated

#### Scenario: References are one level deep from each entry point

- **WHEN** `SKILL.md` or a brief needs a shared contract
- **THEN** it links to that reference file directly, and no brief obtains the
  contract by pointing back through `SKILL.md`

#### Scenario: Long reference files carry a table of contents

- **WHEN** a bundled markdown file exceeds 100 lines
- **THEN** it begins with a table of contents listing its sections

### Requirement: Bundled evaluation scenarios

The skill SHALL ship with at least four bundled evaluation scenarios that cover
its core verdict outcomes — at minimum a false-complete contract mismatch (a
task marked complete with no implementing work, yielding a not-clear-to-archive
verdict), a merged-archive conformance violation (a Type-2 change yielding a
`Request changes` verdict under directional framing), a clean PR (no `Fix now`
findings, yielding an `Approve` verdict), and a stale-suite traceability case (a
delta spec changing behavior an untouched suite test still asserts — e.g. an
absence assertion staying green by winning a timing race — yielding an arena-T
finding). Each scenario SHALL state its inputs and its expected behavior so it
can serve as a source of truth for future iteration, independent of whether an
automated runner exists.

#### Scenario: At least four evaluations are bundled

- **WHEN** the `spec-review` skill is packaged
- **THEN** at least four evaluation scenarios are bundled with it

#### Scenario: Evaluations cover the core verdict outcomes

- **WHEN** the bundled evaluation scenarios are read
- **THEN** they include at minimum a false-complete contract mismatch, a
  merged-archive conformance violation, a clean approving PR, and a stale-suite
  traceability case caught by arena T

#### Scenario: Each evaluation states inputs and expected behavior

- **WHEN** an individual evaluation scenario is read
- **THEN** it specifies the review inputs and the expected behavior, so it is
  checkable by hand even without an automated runner

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

#### Scenario: Adjudication verdict is the round's last verdict-bearing line

- **WHEN** an `### Adjudications` subsection is appended to a persisted round whose own `**Verdict:**` reads `findings remain`
- **THEN** the subsection nests inside the same `## Round N` block after that line, so the adjudication's `**Verdict:**` is the round's last verdict-bearing line and the effective verdict

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

### Requirement: Four review arenas

The review SHALL run four arenas:

- **A — Alignment** (delta-scoped): the change's promise — `tasks.md`, `design.md`, `specs/**/spec.md`, and `openspec validate`. Task-completion truth (work claimed done but absent, including unchecked or false-complete "add tests" tasks) stays in A.
- **B — Boundary** (whole-scoped): corpus-relative defects, fenced by "invisible when viewing the delta or file alone" — duplication against existing code, naming-fit against the repo's naming structure, doc-vs-code disagreement, cross-file performance.
- **C — Convention** (delta-scoped): house law (`CLAUDE.md` and its gated doc-pointers) and craft law (universal convention: security, correctness, single-file performance, single-responsibility), reading **production code against docs**. Every C finding SHALL cite its source — the specific doc rule, or the named universal principle; a universal citation is itself contestable at adjudication. C SHALL carry no test-file or `TESTING.md` duties.
- **T — Testing** (delta-scoped, with one defined outside-the-diff look): the test suite read **against the change's behavior** — test substance, scenario traceability, testability, and semantic test naming, per the "Testing arena charter" requirement.

The direction of gaze is the A/C/T boundary: T reads the suite against behavior ("does something prove it works"); C reads production code against docs; A reads the delivered work against the change's promise. After the migration T and C SHALL share zero material. Coverage thresholds SHALL belong to no arena — they are `test:coverage`'s mechanical question.

#### Scenario: A corpus-relative defect is a Boundary finding

- **WHEN** the diff adds a helper duplicating one that exists elsewhere in the repo, invisible from the diff alone
- **THEN** the finding is reported in arena B

#### Scenario: A single-sight craft defect is a Convention finding

- **WHEN** the diff contains an injection-prone query visible in the changed lines alone
- **THEN** the finding is reported in arena C citing the universal principle it violates

#### Scenario: A test-quality defect is a Testing finding

- **WHEN** the diff adds a test whose assertion is a tautology, or changes behavior a stale suite test still contradicts
- **THEN** the finding is reported in arena T, not C or A

#### Scenario: A false-complete test task is an Alignment finding

- **WHEN** a `tasks.md` item claiming tests were added is `[x]` with no matching test work
- **THEN** the finding is reported in arena A (task-completion truth), not T

#### Scenario: Coverage percentage is no arena's finding

- **WHEN** a reviewed file's coverage falls below threshold but no test-substance or coverage-gaming defect exists
- **THEN** no arena raises a finding; the coverage gate owns the question

### Requirement: Testing arena charter

The testing arena SHALL run four checks, defined in a bundled `testing-brief.md` with phase key `testing` and arena letter `T`:

1. **Test substance** — the full `TESTING.md` audit: assertion bar, forbidden patterns, and coverage-gaming (newly added coverage-suppression directives over real behavior, and code commented out or deleted to dodge coverage, used in place of a test or refactor). The absence of test changes SHALL NOT be a silent skip: when the diff adds or changes testable behavior but touches no test files, the arena SHALL judge whether a test was warranted and — if so — surface a finding that behavior changed with no test added or updated; the test audit is skipped only when the diff changes nothing testable. A passing coverage gate SHALL be treated as non-conclusive.
2. **Scenario traceability** — each delta-spec SHALL/`#### Scenario:` in the resolved change SHALL be pinned by a named test (or the gap surfaced as a finding). This check includes a **suite-wide staleness sweep** — the arena's one outside-the-diff look: for each changed or removed requirement, grep the unit and e2e suites by the behavior's stable handles (aria-labels, role names, rendered text, route paths) for assertions, selectors, or comments encoding the superseded behavior, treating a green run as no evidence of alignment (a stale absence assertion can pass by winning a timing race). The scenario↔test mapping SHALL be re-derived fresh each round from the delta specs and the suite; the arena SHALL NOT persist or consume a stored test plan and SHALL take no dependency on `acceptance.md` in either direction.
3. **Testability** — structure that resists testing, evidenced from the suite (e.g. contortions existing tests perform to reach the behavior); fixes are routed as ordinary findings under the standard dispositions.
4. **Semantic test naming** — whether each touched or traced test's name still accurately describes its body, including the drift case where behavior, spec, or body changed and the name fossilized. Mechanical `<StateUnderTest>_<ExpectedBehavior>` format enforcement stays with lint and SHALL NOT be re-audited here.

The testing agent SHALL receive the resolved change name and archive state and SHALL read the change's delta specs from the same location rule as the alignment arena (active directory for an active change; date-prefixed archive directory for an archived one). When the review proceeds with no resolved change, the testing arena SHALL run **degraded** — substance, testability, and naming only — noting traceability as skipped for lack of delta specs.

#### Scenario: Superseded suite behavior is caught outside the diff

- **WHEN** a delta spec changes an existing behavior and an untouched suite test still asserts the old contract (e.g. an absence assertion that stays green by racing an async round-trip)
- **THEN** the staleness sweep surfaces a T finding naming the stale test and the changed requirement, with the fix updating the test to the new contract

#### Scenario: Unpinned scenario is a traceability finding

- **WHEN** a delta-spec scenario has no named test exercising it
- **THEN** arena T surfaces a finding citing the scenario, and the mapping is derived fresh in this round rather than read from any stored plan

#### Scenario: Degraded run without a resolved change

- **WHEN** the review proceeds with no related OpenSpec change
- **THEN** the testing arena still runs substance, testability, and semantic-naming checks, and its output notes traceability skipped

#### Scenario: Fossilized test name is a naming finding

- **WHEN** a test's body was updated to a new behavior but its name still describes the superseded one
- **THEN** arena T surfaces a semantic-naming finding; lint format compliance does not clear it

#### Scenario: Coverage suppression over real behavior is flagged

- **WHEN** the diff adds a coverage-ignore directive (e.g. `/* v8 ignore */`) over non-trivial behavior instead of testing it
- **THEN** arena T flags it as a coverage-gaming finding

#### Scenario: Behavior changed with no test is flagged

- **WHEN** the diff adds or changes testable behavior but includes no test additions or updates
- **THEN** arena T surfaces a finding that behavior changed with no test added or updated

#### Scenario: Non-testable change does not require tests

- **WHEN** the diff changes only non-testable content (e.g. docs, comments, pure config)
- **THEN** arena T skips the substance audit without flagging a missing-test finding

