# spec-review delta

## REMOVED Requirements

### Requirement: Three review arenas

**Reason**: Replaced by "Four review arenas" — a dedicated testing arena (T) takes the test duties previously smeared across alignment and convention.
**Migration**: Arena definitions carry forward under "Four review arenas"; T's charter is the new "Testing arena charter" requirement.

## ADDED Requirements

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

## MODIFIED Requirements

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
