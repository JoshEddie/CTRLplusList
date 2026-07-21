# spec-review Specification (delta)

## ADDED Requirements

### Requirement: Three review arenas

The review SHALL run three arenas, replacing the former standard/convention/contract lanes:

- **A — Alignment** (delta-scoped): the change's promise — `tasks.md`, `design.md`, `specs/**/spec.md`, and `openspec validate`. Absorbs the former contract audit.
- **B — Boundary** (whole-scoped): corpus-relative defects, fenced by "invisible when viewing the delta or file alone" — duplication against existing code, naming-fit against the repo's naming structure, doc-vs-code disagreement, cross-file performance.
- **C — Convention** (delta-scoped): house law (`CLAUDE.md` and its gated doc-pointers, including test substance per `TESTING.md` and coverage-gaming detection) and craft law (universal convention: security, correctness, single-file performance, single-responsibility). Every C finding SHALL cite its source — the specific doc rule, or the named universal principle; a universal citation is itself contestable at adjudication.

The former standard lane is dissolved, not renamed: its corpus-relative cargo moves to B and its single-sight cargo to C. Coverage thresholds SHALL belong to no arena — they are `test:coverage`'s mechanical question — while test-substance and coverage-gaming audits remain in C.

#### Scenario: A corpus-relative defect is a Boundary finding

- **WHEN** the diff adds a helper duplicating one that exists elsewhere in the repo, invisible from the diff alone
- **THEN** the finding is reported in arena B

#### Scenario: A single-sight craft defect is a Convention finding

- **WHEN** the diff contains an injection-prone query visible in the changed lines alone
- **THEN** the finding is reported in arena C citing the universal principle it violates

#### Scenario: Coverage percentage is no arena's finding

- **WHEN** a reviewed file's coverage falls below threshold but no test-substance or coverage-gaming defect exists
- **THEN** no arena raises a finding; the coverage gate owns the question

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

### Requirement: Adverse rounds append a gate section to tasks.md

When the persisted round's verdict is `findings remain`, the skill SHALL append an unchecked `## Gates — round <n>` section to the resolved change's `tasks.md` with one item per open `Fix now` finding, referenced by durable ID. Prior gate sections SHALL never be unchecked or edited. A clearing verdict appends no section. `/landfall`'s existing all-tasks-checked gate is the enforcement mechanism and needs no change of its own.

#### Scenario: Findings-remain round writes a gate section

- **WHEN** round 1 persists with verdict `findings remain` and open findings `A1` and `B4`
- **THEN** `tasks.md` gains an unchecked `## Gates — round 1` section listing `A1` and `B4`

#### Scenario: Clear round leaves tasks.md untouched

- **WHEN** the persisted round's verdict is `clear to land`
- **THEN** no gate section is appended

## MODIFIED Requirements

### Requirement: Multi-agent orchestration

The skill SHALL run its review phases as parallel sub-agents — one per arena: an
alignment agent, a boundary agent, and a convention agent — and SHALL consolidate
their findings into a single report. The skill SHALL perform this parallel review
fan-out by spawning the arena agents directly as Agent-tool sub-agents, issued
together so they run concurrently, with no dependency on the Workflow tool or any
bundled workflow script.

Each arena agent SHALL be instructed to reply with only a JSON object
`{"findings": [...], "deferredToCI": [...]}` whose findings carry exactly the
fields of the skill's finding shape (as defined in the skill's finding-format
reference), with `phase` set to the agent's own arena key (`alignment` /
`boundary` / `convention`). The skill SHALL parse and validate each reply against
that shape — required fields present and the enumerated `phase` / `severity` /
`disposition` values respected. On a malformed reply the skill SHALL retry
exactly once by sending a follow-up message to the same agent requesting only the
corrected JSON; if the reply is still malformed after that single retry, the
skill SHALL abort the review, naming the failed arena and surfacing the raw
reply, and SHALL NOT persist a partial round.

The skill SHALL retain in the orchestrating session every interactive or
orchestrator-judgment step: scope and change resolution (including any
`AskUserQuestion` prompts), the CI status read, consolidation of the returned
findings into the report, the verdict / clear-to-archive determination, and the
adjudication handoff. The skill SHALL pass each arena agent only fully-resolved,
non-interactive inputs (at minimum the diff source, the resolved change name and
archive state where applicable, and the agent's bundled brief location) and
SHALL consume the findings the agents return for consolidation. This SHALL NOT
weaken the existing "OpenSpec change resolution" requirement: its interactive
steps remain in the skill.

#### Scenario: Fan-out runs as direct parallel sub-agents

- **WHEN** `/spec-review` executes against a resolved diff
- **THEN** the skill spawns the alignment, boundary, and convention arena agents
  as Agent-tool sub-agents issued together so they run concurrently, without
  invoking the Workflow tool, and their findings are returned to the skill and
  merged into one consolidated report

#### Scenario: Phase findings arrive as validated JSON replies

- **WHEN** an arena agent produces findings
- **THEN** it replies with only a JSON object matching the skill's finding
  shape with `phase` one of `alignment` / `boundary` / `convention`, and the
  skill validates the reply — required fields and enumerated values — before
  consolidating, rather than consuming free-text prose

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
- **THEN** it passes each one the diff source, its bundled brief location, and —
  for the alignment agent — the resolved change name and archive state, and
  consumes the findings the agents return rather than re-deriving them

### Requirement: OpenSpec change resolution

The alignment arena SHALL identify the related OpenSpec change by auto-detection, using `openspec list --json` together with commit messages and the spec paths the diff touches. When auto-detection is ambiguous (more than one plausible change), the skill SHALL ask the user to choose. When no related change is found, the skill SHALL ask the user whether to proceed with no alignment audit or to name a change to review against; only on the user choosing to proceed without one SHALL it skip the alignment arena and still produce the boundary and convention findings.

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
- **THEN** the skill skips the alignment arena and still reports boundary and convention findings

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

### Requirement: Consolidated report with a defined output contract and a clear-to-archive verdict

The skill SHALL emit a single consolidated report in a fixed, deterministic output contract — explicitly defined order, style, and wording — so that successive reviews are scannable and comparable. The order SHALL be: (1) header naming the resolved change (or "no related change"); (2) a one- to two-sentence summary of overall quality and headline alignment status; (3) a scope line stating the diff source and resolved change (or that the alignment audit was skipped); (4) findings grouped by arena in the fixed order alignment → boundary → convention, each as a table whose columns are ID, severity, location, finding, disposition, and citation; (5) a short "what looks good" bullet list; (6) the verdict; (7) a pointer to `/adjudicate-review` as the final line.

Each finding's ID SHALL follow the shared scheme defined in `reference/finding-format.md`: a capital arena letter (`A` alignment, `B` boundary, `C` convention) followed by an integer that increments globally across all arena tables within the round — one continuous sequence, never restarting per arena — so every finding is referable by an ID unique within its round (e.g. `A1`, `B2`, `C3`, never `A1` and `B1` in the same round) and merges are written by joining IDs with `+` (e.g. `A1+C3`).

Severity SHALL use the text labels `Critical` / `Major` / `Minor` with no emojis. Each finding SHALL carry a proposed disposition of exactly one of `Fix now` / `File issue` / `Drop`, applying the hardened disposition criteria (scope-never-effort, soon-dead-code, charter citation for `File issue`). Wording SHALL be terse and factual, citing the offending line and — for convention findings — the specific doc rule or named universal principle, and — for alignment findings — the SHALL requirement. The skill SHOULD use an ASCII diagram for a finding when it conveys a relationship (data/control flow, state machine, dependency or task-to-work mapping, before/after of a fix) faster than prose; diagrams serve terseness and SHALL NOT be included as decoration.

The verdict SHALL be `Request changes` when at least one open finding is dispositioned `Fix now`, and `Approve` otherwise. Findings dispositioned `File issue` or `Drop` SHALL NOT, on their own, cause a `Request changes` verdict — the verdict is determined by dispositions, not by the count of findings. Severity SHALL NOT override the disposition: a `Minor` `Fix now` blocks and a higher-severity finding adjudicated `Drop` does not.

The verdict SHALL also state the archive-gate outcome appropriate to the resolved change's state. For an active or premature-archive change the change SHALL be reported clear to archive only when all `tasks.md` items are complete, validation passes (or is not-applicable for a premature archive), and the alignment audit found no unresolved conformance or false-complete findings; otherwise the verdict SHALL state it is not yet clear to archive and list the blockers. For a merged-archive change the clear-to-archive gate is moot and the verdict SHALL state `already archived`; an open conformance violation against a merged archive SHALL force `Request changes` and state the PR is blocked pending implementation conformance or a fresh proposal. When the alignment audit was skipped (no related change), the verdict SHALL state that no archive gate applies and be determined solely by the boundary and convention dispositions.

#### Scenario: Output follows the fixed order and style

- **WHEN** the skill emits its report
- **THEN** sections appear in the defined order, findings are grouped alignment → boundary → convention in tables with the defined columns, each finding carries a capital arena-letter + global-integer ID, severity uses text labels with no emojis, and every finding carries a `Fix now` / `File issue` / `Drop` disposition

#### Scenario: Finding IDs are one continuous sequence within the round

- **WHEN** a round contains findings across the alignment, boundary, and convention arenas
- **THEN** each finding's integer increments globally across the arenas (e.g. `A1`, `B2`, `C3` — never `A1` and `B1` together) so no two findings in the round share an integer and any finding is referable by its ID alone

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
- **THEN** the verdict states no archive gate applies and is determined solely by the boundary and convention dispositions

#### Scenario: Merged-archive violation blocks pending a fresh proposal

- **WHEN** the review runs against a merged archive and an implementation-vs-spec conformance violation is open
- **THEN** the verdict is `Request changes` and states the PR is blocked pending implementation conformance or a fresh change proposal

### Requirement: Sub-agent briefs are bundled within the skill

The skill SHALL define each arena brief — alignment, boundary, and convention —
within the skill itself, and SHALL NOT factor any brief into a separately
invocable skill. The orchestrator SHALL deliver each brief to its sub-agent by
reference to the brief's bundled location together with the review inputs (the
diff or the command to produce it, the resolved change name, and the archive
state where relevant), such that no review phase takes a runtime dependency on a
skill external to `spec-review`. Any contract shared across the orchestrator and
a brief — the structured finding shape, and the archive-state definitions and
reconciliation-latitude data — SHALL be defined in a single source rather than
duplicated per brief. The bundled briefs are the single source of the arena
contract for the whole review family: `/incremental-spec-review` SHALL consume
these same brief files (a format-only file read, not a skill invocation), and no
skill SHALL carry its own divergent copy.

#### Scenario: Each brief is bundled, not a separate skill

- **WHEN** the `spec-review` skill is packaged
- **THEN** each of the alignment, boundary, and convention briefs exists as a
  file bundled within the `spec-review` skill, and none is registered as its own
  invocable skill

#### Scenario: All phases run without any external skill present

- **WHEN** `/spec-review` runs and no skill other than `spec-review` is installed
- **THEN** all three arena phases execute using their bundled briefs without
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

### Requirement: The consolidated report SHALL be persisted to the change directory

After emitting the consolidated report, the skill SHALL write it to `openspec/changes/<name>/review.md`, opening with the review family's shared machine-readable header (review type, target change, anchor sha, diff source, round number) as defined in the skill's bundled `reference/finding-format.md`. The persisted form SHALL be a **self-contained round** per that reference's round structure, not the session report verbatim: the `# /spec-review` title becomes the `## Round 1` heading, every section of the report nests at `###` (or deeper) inside it so nothing at `##` level belongs to the round, and the round SHALL end with a round-vocabulary `**Verdict:**` line — mapping the session verdict `Approve → clear to land` and `Request changes → findings remain` (blockers listed after `findings remain`) — which is the line `/landfall` and `/recheck-review` read and an `### Adjudications` subsection overrides. A repeat full review — run only by explicit owner choice — SHALL append a new round rather than overwriting prior rounds. When no related change was resolved (alignment audit skipped), no report file is written and the skill SHALL say so. The persisted report is the contract consumed by `/recheck-review` and `/incremental-spec-review` (round appending, delta computation from the header) and `/landfall` (latest-verdict gate), and travels with the change directory at archive time.

#### Scenario: Report is written with the shared header

- **WHEN** `/spec-review` completes against resolved change `add-foo`
- **THEN** `openspec/changes/add-foo/review.md` exists, beginning with the shared header naming `spec-review`, the change, the anchor sha, the diff source, and the round

#### Scenario: Persisted round is self-contained with a round-vocab verdict

- **WHEN** `/spec-review` persists its report for resolved change `add-foo`
- **THEN** `review.md`'s round 1 nests its findings tables, "what looks good", and verdict at `###` under `## Round 1`, and ends with a `**Verdict:** clear to land`/`findings remain` line rather than the session `Approve`/`Request changes` wording

#### Scenario: Adjudication verdict is the round's last verdict-bearing line

- **WHEN** an `### Adjudications` subsection is appended to a persisted round whose own `**Verdict:**` reads `findings remain`
- **THEN** the subsection nests inside the same `## Round N` block after that line, so the adjudication's `**Verdict:**` is the round's last verdict-bearing line and the effective verdict

#### Scenario: Repeat review appends a round

- **WHEN** the owner explicitly chooses to run a full `/spec-review` again on a change with an existing `review.md`
- **THEN** the new report is appended to `review.md` as the next round, with earlier rounds unmodified

#### Scenario: No resolved change writes no file

- **WHEN** the user proceeds with no alignment audit (no related change)
- **THEN** no `review.md` is written and the report notes the review was not persisted

## REMOVED Requirements

### Requirement: Self-contained standard review

**Reason**: The standard lane is dissolved by the three-arena restructure — its corpus-relative cargo moves to arena B (Boundary) and its single-sight craft cargo to arena C (Convention, craft law). Self-containment is preserved: the arena definitions live in the skill's own bundled briefs per "Sub-agent briefs are bundled within the skill".

**Migration**: Security, performance, correctness, and maintainability review continue under arenas B and C per "Three review arenas"; no external plugin dependency is introduced.
