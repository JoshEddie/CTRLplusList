## ADDED Requirements

### Requirement: Invocation and scope resolution

The skill SHALL be invokable as `/spec-review` with an optional argument that is a change name, a PR reference, or a diff source. When invoked with no argument, the skill SHALL review the current branch diffed against `main`.

#### Scenario: No argument defaults to branch vs main
- **WHEN** a user runs `/spec-review` with no argument on a feature branch
- **THEN** the skill computes the diff of the current branch against `main` and uses that as the review scope

#### Scenario: Explicit PR reference
- **WHEN** a user runs `/spec-review <PR>` with a pull-request reference
- **THEN** the skill fetches that PR's diff via `gh` and uses it as the review scope

#### Scenario: Explicit change name
- **WHEN** a user runs `/spec-review <change-name>` naming an active OpenSpec change
- **THEN** the skill uses that change as the contract-audit target without attempting auto-detection

### Requirement: Self-contained standard review

The skill SHALL perform a standard code review covering security, performance, correctness, and maintainability without taking a runtime dependency on the external `engineering:code-review` plugin skill. The standard-review dimensions SHALL be defined within the skill itself.

#### Scenario: Review runs without the external plugin present
- **WHEN** the `engineering:code-review` plugin is not installed or has changed
- **THEN** `/spec-review` still completes its standard-review pass using its own inlined dimension definitions

### Requirement: Multi-agent orchestration

The skill SHALL run its review phases as parallel sub-agents — at minimum a standard-review agent, a convention-audit agent, and a contract-audit agent — and SHALL consolidate their findings into a single report.

#### Scenario: Phases run in parallel and consolidate
- **WHEN** `/spec-review` executes against a diff
- **THEN** the standard-review, convention-audit, and contract-audit agents run concurrently and their findings are merged into one consolidated report

### Requirement: Convention audit follows CLAUDE.md doc-pointers

The convention-audit phase SHALL always audit the diff against the repository's root `CLAUDE.md`. When `CLAUDE.md` declares a pointer to a supporting document (e.g. "Read TESTING.md first" / "Read DATABASE.md first") and the diff touches the subject that pointer is gated on, the skill SHALL read that supporting document and audit the diff against it. Pointer following SHALL be derived generically from `CLAUDE.md`'s declared pointers, not from a hardcoded filename list.

The absence of test changes SHALL NOT be treated as a silent skip: when the diff adds or changes testable behavior but touches no test files, the skill SHALL read `TESTING.md`, judge whether a test was warranted, and — if so — surface a finding that behavior changed with no test added or updated. The test audit SHALL be skipped only when the diff changes nothing testable (e.g. docs, comments, pure config).

A passing coverage gate SHALL be treated as non-conclusive. The skill SHALL flag coverage gaming: newly added coverage-suppression directives (e.g. `c8` / `v8` / `istanbul` ignore hints) placed over real behavior, and code commented out or deleted to drop it from coverage, when either is used in place of writing a test or refactoring.

#### Scenario: Test changes trigger TESTING.md audit
- **WHEN** the diff modifies files matching the test trigger declared in `CLAUDE.md` (e.g. `*.test.ts`/`*.test.tsx`)
- **THEN** the skill reads `TESTING.md` and audits the changed tests against its rules

#### Scenario: DB changes trigger DATABASE.md audit
- **WHEN** the diff modifies database schema or queries as gated by the `CLAUDE.md` pointer
- **THEN** the skill reads `DATABASE.md` and audits the change against its rules, including the `neon-http` no-transactions constraint

#### Scenario: New pointer is picked up without code change
- **WHEN** a new "Read X first" pointer is added to `CLAUDE.md` and the diff hits its trigger
- **THEN** the skill follows the new pointer without requiring an edit to the skill itself

#### Scenario: Untriggered pointers are not loaded
- **WHEN** the diff does not touch the subject a given pointer is gated on
- **THEN** the skill does not read that supporting document for the audit

#### Scenario: Behavior changed with no test is flagged
- **WHEN** the diff adds or changes testable behavior but includes no test additions or updates
- **THEN** the skill reads `TESTING.md` and surfaces a finding that behavior changed with no test added or updated

#### Scenario: Non-testable change does not require tests
- **WHEN** the diff changes only non-testable content (e.g. docs, comments, pure config)
- **THEN** the skill skips the test audit without flagging a missing-test finding

#### Scenario: Coverage suppression over real behavior is flagged
- **WHEN** the diff adds a coverage-ignore directive (e.g. `/* c8 ignore */`, `/* istanbul ignore next */`) over non-trivial behavior instead of testing it
- **THEN** the skill flags it as a coverage-gaming finding

#### Scenario: Commenting out code to dodge coverage is flagged
- **WHEN** the diff comments out or deletes code to drop it from coverage rather than testing or refactoring it
- **THEN** the skill flags it as a coverage-gaming finding

### Requirement: OpenSpec change resolution

The contract-audit phase SHALL identify the related OpenSpec change by auto-detection, using `openspec list --json` together with commit messages and the spec paths the diff touches. When auto-detection is ambiguous (more than one plausible change), the skill SHALL ask the user to choose. When no related change is found, the skill SHALL ask the user whether to proceed with no contract audit or to name a change to review against; only on the user choosing to proceed without one SHALL it skip the contract audit and still produce the standard and convention findings.

#### Scenario: Single match auto-detected
- **WHEN** commit messages and diffed spec paths point to exactly one active change
- **THEN** the skill selects that change for the contract audit without prompting

#### Scenario: Ambiguous match prompts the user
- **WHEN** auto-detection yields more than one plausible change
- **THEN** the skill asks the user to pick which change to audit

#### Scenario: No change found prompts the user
- **WHEN** no related OpenSpec change can be identified (e.g. a hotfix PR)
- **THEN** the skill asks the user whether to proceed with no contract audit or to name a change to review against

#### Scenario: User opts to proceed without a contract audit
- **WHEN** no related change is found and the user chooses to proceed without one
- **THEN** the skill skips the contract audit and still reports standard-review and convention-audit findings

### Requirement: Contract audit against the resolved change

The contract-audit phase SHALL read the resolved change's `tasks.md`, `design.md`, and `specs/**/spec.md`. When the change was resolved by auto-detection it SHALL be read from the active `openspec/changes/<name>/` directory and SHALL NOT be substituted by an `openspec/changes/archive/` copy. When the user explicitly names a change that exists only under `openspec/changes/archive/` (e.g. a PR reviewed after its change was archived), the skill SHALL read that change from its date-prefixed archive directory `openspec/changes/archive/*-<name>/`. For the resolved change it SHALL verify that every task marked complete (`[x]`) in `tasks.md` corresponds to real work present in the diff or codebase, that the completed work conforms to `design.md` and `specs/**/spec.md`, and that no behavior was added that no task or spec documents (undocumented scope creep).

When a contract check surfaces a disagreement between the implementation and the change's own `tasks.md`/`design.md`/`spec.md`, the skill SHALL report it as a mismatch without presuming which artifact is the defect, because in a not-yet-archived change the spec and the implementation were authored together and are equally provisional. The proposed resolution SHALL name both directions — amend the implementation, or amend/relax the task or spec — and the user adjudicates which side is correct. This neutral framing applies to an active (pre-archive) change; when the review runs against an explicitly-named already-archived change the archived spec is the fixed contract and the skill SHALL apply the directional "implementation must conform to the spec" framing instead.

It SHALL run `openspec validate <name> --strict` for an active change and report failures; for an archived change, which the CLI cannot resolve by name, it SHALL skip validation and note it as not-applicable rather than reporting a failure.

#### Scenario: Task marked complete without matching work is flagged
- **WHEN** a `tasks.md` item is marked `[x]` but the described work is absent from the diff and codebase
- **THEN** the skill flags the task↔implementation mismatch without presuming the task is correct, and proposes both resolution directions (implement the work, or amend/unmark the task)

#### Scenario: Work contradicting the spec is flagged
- **WHEN** completed work conflicts with a SHALL requirement in `design.md` or `specs/**/spec.md`
- **THEN** the skill flags the implementation↔spec mismatch citing the requirement, without presuming the spec is correct, and proposes both resolution directions (change the implementation, or amend the spec)

#### Scenario: Mismatch against an archived spec is directional
- **WHEN** the review runs against an explicitly-named already-archived change and the implementation conflicts with the archived spec
- **THEN** the skill treats the archived spec as the fixed contract and flags the implementation as the side that must conform

#### Scenario: Undocumented behavior is flagged as scope creep
- **WHEN** the diff introduces behavior not covered by any task or spec requirement
- **THEN** the skill flags it as undocumented scope creep, with both resolution directions available (remove the behavior, or document it in a task/spec)

#### Scenario: Auto-detected change reads the active directory only
- **WHEN** the contract audit loads the artifacts of an auto-detected change
- **THEN** it reads from `openspec/changes/<name>/` and not from `openspec/changes/archive/`

#### Scenario: Explicitly-named archived change reads the archive
- **WHEN** the user explicitly names a change that exists only under `openspec/changes/archive/`
- **THEN** the contract audit reads it from `openspec/changes/archive/*-<name>/`, skips `openspec validate`, and reports the verdict against the archived contract without a clear-to-archive line

### Requirement: Consolidated report with a defined output contract and a clear-to-archive verdict

The skill SHALL emit a single consolidated report in a fixed, deterministic output contract — explicitly defined order, style, and wording — so that successive reviews are scannable and comparable. The order SHALL be: (1) header naming the resolved change (or "no related change"); (2) a one- to two-sentence summary of overall quality and headline contract status; (3) a scope line stating the diff source and resolved change (or that the contract audit was skipped); (4) findings grouped by phase in the fixed order standard → convention → contract, each as a table whose columns are number, severity, location, finding, disposition, and citation; (5) a short "what looks good" bullet list; (6) the verdict; (7) the explore-mode handoff prompt as the final line.

Severity SHALL use the text labels `Critical` / `Major` / `Minor` with no emojis. Each finding SHALL carry a proposed disposition of exactly one of `Fix now` / `File issue` / `Drop`, and out-of-scope findings SHALL only be proposed as `File issue` when they are sizable enough to warrant their own change cycle. Wording SHALL be terse and factual, citing the offending line and — for convention and contract findings — the specific doc rule or SHALL requirement. The skill SHOULD use an ASCII diagram for a finding when it conveys a relationship (data/control flow, state machine, dependency or task-to-work mapping, before/after of a fix) faster than prose; diagrams serve terseness and SHALL NOT be included as decoration.

The verdict SHALL be `Request changes` when at least one open finding is dispositioned `Fix now`, and `Approve` otherwise. Findings dispositioned `File issue` or `Drop` SHALL NOT, on their own, cause a `Request changes` verdict — the verdict is determined by dispositions, not by the count of findings. Severity SHALL NOT override the disposition: a `Minor` `Fix now` blocks and a higher-severity finding adjudicated `Drop` does not.

The verdict SHALL also state whether the change is clear to archive. The change SHALL be reported clear to archive only when all `tasks.md` items are complete, `openspec validate <name> --strict` passes, and the contract audit found no unresolved conformance or false-complete findings.

#### Scenario: Output follows the fixed order and style
- **WHEN** the skill emits its report
- **THEN** sections appear in the defined order, findings are grouped standard → convention → contract in tables with the defined columns, severity uses text labels with no emojis, and every finding carries a `Fix now` / `File issue` / `Drop` disposition

#### Scenario: Approve verdict despite non-blocking findings
- **WHEN** the report contains findings but none is dispositioned `Fix now` (all are `File issue` or `Drop`)
- **THEN** the verdict is `Approve`

#### Scenario: Request changes when a fix-now finding is open
- **WHEN** at least one open finding is dispositioned `Fix now`, regardless of its severity
- **THEN** the verdict is `Request changes`

#### Scenario: Clear-to-archive verdict when contract is satisfied
- **WHEN** all tasks are `[x]`, validation passes, and no contract findings remain
- **THEN** the verdict states the change is clear to archive

#### Scenario: Not clear to archive when contract findings exist
- **WHEN** any false-complete, conformance, or validation finding remains open
- **THEN** the verdict states the change is not yet clear to archive and lists the blocking findings

### Requirement: Optional explore-mode handoff

After the report and verdict, the skill SHALL present exactly one prompt offering to continue into OpenSpec explore mode to investigate the findings — recommending which to fix and weighing how each fix would land (pros and cons). The skill SHALL NOT enter explore mode automatically; it SHALL enter only on the user's explicit affirmative response.

#### Scenario: Handoff is offered, not auto-run
- **WHEN** the report and verdict have been emitted
- **THEN** the final output line is a single prompt offering to enter explore mode, and the skill takes no further action until the user responds

#### Scenario: Enters explore mode only on explicit yes
- **WHEN** the user answers yes to the handoff prompt
- **THEN** the skill enters OpenSpec explore mode carrying the findings as context

#### Scenario: Declining or not responding ends the review
- **WHEN** the user declines or does not respond to the handoff prompt
- **THEN** the skill does not enter explore mode and the review ends
