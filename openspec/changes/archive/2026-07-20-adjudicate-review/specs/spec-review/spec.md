## MODIFIED Requirements

### Requirement: Consolidated report with a defined output contract and a clear-to-archive verdict

The skill SHALL emit a single consolidated report in a fixed, deterministic output contract — explicitly defined order, style, and wording — so that successive reviews are scannable and comparable. The order SHALL be: (1) header naming the resolved change (or "no related change"); (2) a one- to two-sentence summary of overall quality and headline contract status; (3) a scope line stating the diff source and resolved change (or that the contract audit was skipped); (4) findings grouped by phase in the fixed order standard → convention → contract, each as a table whose columns are ID, severity, location, finding, disposition, and citation; (5) a short "what looks good" bullet list; (6) the verdict; (7) a pointer to `/adjudicate-review` as the final line.

Each finding's ID SHALL follow the shared scheme defined in `reference/finding-format.md`: an arena letter (`s` standard, `c` convention, `k` contract) followed by an integer that increments globally across all arena tables within the round, so every finding is referable by an ID unique within its round (e.g. `s1`, `s2`, `c3`, `k4`) and merges are written by joining IDs with `+` (e.g. `s1+c3`).

Severity SHALL use the text labels `Critical` / `Major` / `Minor` with no emojis. Each finding SHALL carry a proposed disposition of exactly one of `Fix now` / `File issue` / `Drop`, and out-of-scope findings SHALL only be proposed as `File issue` when they are sizable enough to warrant their own change cycle. Wording SHALL be terse and factual, citing the offending line and — for convention and contract findings — the specific doc rule or SHALL requirement. The skill SHOULD use an ASCII diagram for a finding when it conveys a relationship (data/control flow, state machine, dependency or task-to-work mapping, before/after of a fix) faster than prose; diagrams serve terseness and SHALL NOT be included as decoration.

The verdict SHALL be `Request changes` when at least one open finding is dispositioned `Fix now`, and `Approve` otherwise. Findings dispositioned `File issue` or `Drop` SHALL NOT, on their own, cause a `Request changes` verdict — the verdict is determined by dispositions, not by the count of findings. Severity SHALL NOT override the disposition: a `Minor` `Fix now` blocks and a higher-severity finding adjudicated `Drop` does not.

The verdict SHALL also state the archive-gate outcome appropriate to the resolved change's state. For an active or premature-archive change the change SHALL be reported clear to archive only when all `tasks.md` items are complete, validation passes (or is not-applicable for a premature archive), and the contract audit found no unresolved conformance or false-complete findings; otherwise the verdict SHALL state it is not yet clear to archive and list the blockers. For a merged-archive change the clear-to-archive gate is moot and the verdict SHALL state `already archived`; an open conformance violation against a merged archive SHALL force `Request changes` and state the PR is blocked pending implementation conformance or a fresh proposal. When the contract audit was skipped (no related change), the verdict SHALL state that no archive gate applies and be determined solely by the standard and convention dispositions.

#### Scenario: Output follows the fixed order and style
- **WHEN** the skill emits its report
- **THEN** sections appear in the defined order, findings are grouped standard → convention → contract in tables with the defined columns, each finding carries an arena-letter + global-integer ID, severity uses text labels with no emojis, and every finding carries a `Fix now` / `File issue` / `Drop` disposition

#### Scenario: Finding IDs are unique within the round
- **WHEN** a round contains findings across the standard, convention, and contract arenas
- **THEN** each finding's integer increments globally across the arenas (e.g. `s1`, `s2`, `c3`, `k4`) so no two findings in the round share an ID and any finding is referable by its ID alone

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
- **WHEN** all tasks are `[x]`, validation passes, and no contract findings remain
- **THEN** the verdict states the change is clear to archive

#### Scenario: Not clear to archive when contract findings exist
- **WHEN** any false-complete, conformance, or validation finding remains open
- **THEN** the verdict states the change is not yet clear to archive and lists the blocking findings

#### Scenario: No archive gate when contract audit was skipped
- **WHEN** the user proceeded without a contract audit because no related change was found
- **THEN** the verdict states no archive gate applies and is determined solely by the standard and convention dispositions

#### Scenario: Merged-archive violation blocks pending a fresh proposal
- **WHEN** the review runs against a merged archive and an implementation-vs-spec conformance violation is open
- **THEN** the verdict is `Request changes` and states the PR is blocked pending implementation conformance or a fresh change proposal

### Requirement: The consolidated report SHALL be persisted to the change directory

After emitting the consolidated report, the skill SHALL write it to `openspec/changes/<name>/review.md`, opening with the review family's shared machine-readable header (review type, target change, anchor sha, diff source, round number) as defined in the skill's bundled `reference/finding-format.md`. The persisted form SHALL be a **self-contained round** per that reference's round structure, not the session report verbatim: the `# /spec-review` title becomes the `## Round 1` heading, every section of the report nests at `###` (or deeper) inside it so nothing at `##` level belongs to the round, and the round SHALL end with a round-vocabulary `**Verdict:**` line — mapping the session verdict `Approve → clear to land` and `Request changes → findings remain` (blockers listed after `findings remain`) — which is the line `/landfall` and `/recheck-review` read and an `### Adjudications` subsection overrides. A repeat full review SHALL append a new round rather than overwriting prior rounds. When no related change was resolved (contract audit skipped), no report file is written and the skill SHALL say so. The persisted report is the contract consumed by `/recheck-review` (round appending) and `/landfall` (latest-verdict gate), and travels with the change directory at archive time.

#### Scenario: Persisted round is self-contained with a round-vocab verdict
- **WHEN** `/spec-review` persists its report for resolved change `add-foo`
- **THEN** `review.md`'s round 1 nests its findings tables, "what looks good", and verdict at `###` under `## Round 1`, and ends with a `**Verdict:** clear to land`/`findings remain` line rather than the session `Approve`/`Request changes` wording

#### Scenario: Adjudication verdict is the round's last verdict-bearing line
- **WHEN** an `### Adjudications` subsection is appended to a persisted round whose own `**Verdict:**` reads `findings remain`
- **THEN** the subsection nests inside the same `## Round N` block after that line, so the adjudication's `**Verdict:**` is the round's last verdict-bearing line and the effective verdict

## REMOVED Requirements

### Requirement: Optional explore-mode handoff

**Reason**: The in-context explore handoff — designed before `/spec-review` persisted a `review.md` — produced owner adjudications as chat prose that never reached the file, causing `/recheck-review` to re-litigate re-dispositioned findings. Adjudication moves to the standalone file-driven `/adjudicate-review` skill (see the new `adjudicate-review` capability), restoring `/spec-review`'s no-external-dependency invariant.

**Migration**: `/spec-review`'s final line now points at `/adjudicate-review <change>` (see the modified consolidated-report requirement, item 7). Owners adjudicate findings by running that skill in a fresh session; it reads `review.md` and appends a `### Adjudications` subsection.
