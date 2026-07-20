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

For the latest round's findings, the skill SHALL re-ground each proposed disposition in the code the finding cites — a concise explore pass, including findings dispositioned `Drop` — treating the persisted dispositions as proposals to confirm or reopen, not as settled. It SHALL then interview the owner one finding, or one merge-group, at a time via `AskUserQuestion`, each question naming the finding ID(s) it covers (including merged findings, e.g. "s1+c3 are the same defect; this question covers both") with the re-grounded evidence and a recommended disposition. The skill SHALL NOT skip the interview or batch unrelated findings into a single question.

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
