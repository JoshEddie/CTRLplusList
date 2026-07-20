---
name: spec-review
argument-hint: "<change-name | PR | diff>"
description: Review a spec-driven PR/diff before archiving its OpenSpec change. Differentiators over a generic code review - (1) audits the diff against CLAUDE.md and the supporting docs it points to (TESTING.md, DATABASE.md), and (2) audits the diff against the related OpenSpec change's task-completion and design/spec contract, doubling as a pre-archive readiness gate. Use when reviewing a feature branch or PR that implements an OpenSpec change.
metadata:
  author: list_eddiefamily
  version: '1.4'
---

# /spec-review

A self-contained project code-review skill. It audits a PR/diff against three things at once:

### Standard review

- security
- performance
- correctness
- maintainability

### Convention audit

- the repo's `CLAUDE.md`
- the supporting docs it points to (e.g. `TESTING.md`, `DATABASE.md`)

### Contract audit

- the related OpenSpec change's `tasks.md`, `design.md`, `specs/**/spec.md`
- `openspec validate`

This is the review family's **full** review: it opens round 1 of a change's review history. Findings are fixed and verified in lightweight `/recheck-review` rounds appended to the same persisted report; a full `/spec-review` runs again only when a recheck escalates (`outgrew recheck`), appending a fresh full round. The latest round's verdict is the gate `/landfall` reads before staging the work commit.

## Contents

- **Usage** — invocation forms.
- **Phase 0** — scope and change resolution (you do this; it produces the agents' inputs).
- **Phase orchestration** — fan out the three review agents via the bundled workflow.
- **Check CI status** — read CI after the agents return (PR invocations).
- **Consolidated report** — the fixed output contract and verdict logic.
- **Persist the report** — write/append `openspec/changes/<name>/review.md`.
- **Adjudication handoff** — the closing pointer to `/adjudicate-review`.
- Reference leaves under `.claude/skills/spec-review/reference/`: `archive-state.md` (states + reconciliation latitude), `finding-format.md` (finding shape, table style, dispositions, diagrams).

Each review phase runs as its own **agent** against a bundled brief file; the skill takes no runtime dependency on any external skill:

- `standard-review-brief.md`
- `convention-audit-brief.md`
- `contract-audit-brief.md`

## Usage

```
/spec-review [change-name | PR | diff]
```

- **No argument** → review the staged diff (`git diff --staged`), on any branch — the trunk workflow's pre-commit scope. Branch work is never an implicit default: review a branch by naming its PR or an explicit ref range (e.g. `dev...HEAD`).
- **`<change-name>`** → an active OpenSpec change name; used directly as the contract-audit target without auto-detection.
- **`<PR>`** → a pull-request reference; the diff is fetched via `gh`.
- **`<diff>`** → an explicit diff source (e.g. `--staged`, `--local`, a ref range).

**Report-only side effects.** Emits its report to the session and persists it to the change directory (see "Persist the report"); does **not** post comments to the PR. CI owns build/typecheck/lint — this skill does not *run* them. For a `<PR>` invocation it does *read* the CI result via `gh` (see "Check CI status"): a red CI is a Critical `Fix now` blocker on its own, independent of how `tasks.md` is checked off — CI is ground truth, the checkboxes are not.

---

## Phase 0 — Scope and change resolution

Do this yourself (not in an agent) — it produces the inputs the agents need.

### 0a. Acquire the diff

| Invocation | Diff command |
| --- | --- |
| No argument | `git diff --staged` (staged diff, any branch) |
| `<PR>` (number/URL) | `gh pr diff <PR>` |
| `--staged` | `git diff --staged` |
| `--local` | `git diff` (unstaged working tree) |
| ref range (e.g. `a..b`) | `git diff <range>` |

If `gh` is unavailable for a PR reference, degrade: ask the user for a diff source rather than failing the whole review.

### 0b. Resolve the related OpenSpec change (auto-detect)

Unless the user named a change explicitly, auto-detect using these signals, strongest first:

#### Diffed spec paths

Any `openspec/changes/<name>/**` paths in the diff name the change directly. Strongest signal. Also covers a **premature archive** (Type 1): when the PR includes the `openspec archive` move, the diff adds `openspec/changes/archive/*-<name>/**`, which names the change even though `openspec list` won't.

#### Commit messages

`git log dev..HEAD` often references the change slug or issue.

#### `openspec list --json`

Enumerate active changes to match against the above. **Active-only** — a premature-archived change won't appear here, so rely on the diffed archive paths for that case.

**The branch name is NOT a primary signal.** Branch names and change slugs diverge in this repo — e.g. branch `issue-69` implemented change `enforce-test-title-lint`. Use the branch name only as a weak tiebreaker.

### 0c. Resolution branches

#### Exactly one plausible change

Select it; announce `Using change: <name>`.

#### More than one plausible change

Ask the user to choose via the **AskUserQuestion** tool (list the candidates). Do not guess.

#### No related change found

(e.g. a hotfix PR, or a PR whose change is already archived)

Ask the user via the **AskUserQuestion** tool whether to

- (a) proceed with no contract audit
- (b) name the change to review against.

On (a), skip the contract audit and run only the standard-review and convention-audit phases, noting it in the scope line; the verdict reads `no archive gate (contract audit skipped)`. On (b), use the named change as the contract-audit target — commonly an already-merged archived one; classify it in 0d and pass the state to the contract agent.

### 0d. Classify the archive state

When a change resolved (0c (b) or auto-detect), classify it per `.claude/skills/spec-review/reference/archive-state.md` so the orchestrator can pass the state to the contract agent and use it in the verdict. Compute the state here once; do not make the contract agent re-derive it.

---

## Phase orchestration

The three review phases run as a **bundled workflow**, not direct Agent-tool calls. Invoke it with the **Workflow** tool, pointing `scriptPath` at the bundled script and passing the Phase-0-resolved inputs as `args`:

- **scriptPath**: `.claude/skills/spec-review/fanout.workflow.js`
- **args**:
  - `diffCmd` — the diff command resolved in 0a. The workflow's agents each run it; the raw diff is never passed as a giant string.
  - `changeName` — the resolved change (0c), or `null` when 0c resolved to no change. `null` makes the workflow skip the contract phase.
  - `archiveState` — `active` / `Type 1 premature` / `Type 2 merged` (from 0d), or `null` when no change.
  - `briefs` — the three bundled brief paths:
    - `standard`: `.claude/skills/spec-review/standard-review-brief.md`
    - `convention`: `.claude/skills/spec-review/convention-audit-brief.md`
    - `contract`: `.claude/skills/spec-review/contract-audit-brief.md`

The skill instructing this call is itself the Workflow opt-in. The fan-out is bounded: 3 audit agents (2 if the contract phase is skipped). It returns `{ findings, deferredToCI }`; the fan-out mechanics live in `fanout.workflow.js`.

After the workflow returns, **consolidate** its `findings` into the report below — each is a validated object in the shape defined in `.claude/skills/spec-review/reference/finding-format.md`.

## Check CI status (PR invocations)

Do this **after** the agents return, not in Phase 0 — CI has had the whole review duration to run, so it is usually finished, and it feeds the archive gate computed at the end.

For a `<PR>` invocation, read the PR's check-run rollup:

```bash
gh pr checks <PR>                              # human-readable pass/fail/pending per check
gh pr view <PR> --json statusCheckRollup       # machine-readable; inspect each check's conclusion
```

Read CI every time, regardless of how `tasks.md` is checked off — CI is ground truth, the checkboxes are not. Three outcomes:

- **CI green** → no CI finding. Any task the change deferred to CI (surfaced as `deferredToCI` in the workflow return; e.g. a `[~]` "verified by GitHub PR CI" gate) is thereby confirmed.
- **CI red** → raise an open **`Fix now` (Critical)** finding citing the failing check(s), and block the archive gate. Holds whether or not any task is marked complete.
- **CI still pending** (or no PR / `gh` unavailable) → state CI as **unverified** in the verdict; do not claim clear-to-archive on its basis, and note CI must be re-checked (and any red result fixed) before archiving.

A non-PR invocation has no CI to read — state CI as unverified rather than assuming it passed.

---

## Consolidated report — fixed output contract

Emit a single report in **exactly this order** — do not reorder, omit, or add sections. The finding-table columns, severity labels (text, no emoji), dispositions, and diagram rules are defined in `.claude/skills/spec-review/reference/finding-format.md`. Column 1 of every findings table is the finding's **durable ID** per that reference's finding-ID scheme — an arena letter (`s` standard, `c` convention, `k` contract) plus an integer that increments globally across the arena tables within the round (`s1`, `s2`, `c3`, `k4`), so every finding is referable by an ID unique within its round. Fill in this skeleton:

```markdown
# /spec-review — <change-name | "no related change">

<one- to two-sentence summary: overall code quality + headline contract status>

**Scope:** <diff source> · <resolved change | "contract audit skipped — no related change">

## Findings

### Standard
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|

### Convention
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|

### Contract
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|

## What looks good
- <short bullets>

## Verdict
<Approve | Request changes> — <clear to archive | not yet clear to archive (blockers: …) | not yet clear — needs a fresh propose→archive cycle | already archived | blocked — violates merged spec <name>; needs implementation conformance or a fresh proposal | no archive gate (contract audit skipped)>

---
To adjudicate these findings, run `/adjudicate-review <change>` (a fresh session is recommended) — it re-grounds every disposition in the cited code, interviews you one finding at a time, and records any changes back into `review.md`.
```

A findings group with no findings shows `_none_`; the **Contract** group is omitted when the contract audit was skipped.

### Verdict and clear-to-archive logic

The verdict line is `Approve` or `Request changes`, followed by the clear-to-archive determination. **The verdict keys off dispositions, not the raw count of findings:**

- `Request changes` — at least one open `Fix now` finding exists (something must change in *this* PR).
- `Approve` — no open `Fix now` findings. `File issue` (out of scope) and `Drop` (non-issue) findings do **not** block approval; note them but approve.

Severity does not change this — a `Minor` `Fix now` still blocks, and a `Critical`-looking item dispositioned `Drop` does not.

The archive-gate line depends on the change's state (see `.claude/skills/spec-review/reference/archive-state.md`):

#### Active or Type-1 (premature) change

The clear-to-archive gate applies (a Type-1 change becomes canonical on merge). Clear to archive only when ALL of:

- **CI is green** (PR invocations) — red CI blocks regardless of checkbox state; pending/unverified CI cannot satisfy the gate, **and**
- every `tasks.md` item is `[x]` (a `[~]` gate deferred to CI counts only once that CI is confirmed green), **and**
- `openspec validate <name> --strict` passes — for a Type-1 archive the CLI cannot resolve the archived name, so note validate N/A (it ran before the in-PR archive), **and**
- no open false-complete or conformance findings remain.

Otherwise state **not yet clear to archive** and list the blocking items — including red CI or pending/unverified CI. A Type-1 finding whose only reconciliation is a significant spec change is blocking: state `not yet clear — needs a fresh propose→archive cycle`.

#### Type-2 (merged) change

The clear-to-archive gate is moot; state `already archived` and give the verdict purely on whether the diff conforms to the canonical contract. An open conformance violation forces `Request changes` and reads `blocked — violates merged spec <name>; needs implementation conformance or a fresh proposal`.

#### No contract audit (Phase 0c proceed-without)

No change to gate; state `no archive gate (contract audit skipped)`. The verdict is determined solely by the standard/convention dispositions.

---

## Persist the report

After emitting the consolidated report, write it to `openspec/changes/<name>/review.md`. The persisted form is a **round**, not the session report verbatim — apply the round structure in `reference/finding-format.md`:

- The file opens with the shared machine-readable header defined in `reference/finding-format.md` (`review: spec-review`, `target:` the change, `anchor:` the sha the diff was computed against, `diff-source:` the diff command or PR reference, `round:` the highest round in the file).
- The report body is round 1 (`## Round 1 — spec-review (<date>)`). The session report's `# /spec-review` title becomes the `## Round 1` heading; its `### Standard`/`### Convention`/`### Contract` finding tables sit directly under the round (drop the `## Findings` wrapper), and `## What looks good` nests as `### What looks good` — so every part of the round lives at `###` and the round is self-contained (nothing at `##` belongs to it; the next `##` starts the next round). A repeat full review (after an `outgrew recheck` escalation) **appends** the next round and bumps the header's `round:` — prior rounds are never rewritten.
- **The round ends with a round-vocab `**Verdict:**` line**, not the session `## Verdict` wording: map `Approve → **Verdict:** clear to land` and `Request changes → **Verdict:** findings remain` (list the blockers after `findings remain`). This is the line `/landfall` and `/recheck-review` read, and the line an `### Adjudications` subsection overrides.
- The persisted report is consumed by `/recheck-review` (round appending, delta computation from the header) and `/landfall` (latest-round-verdict gate), and travels with the change directory at archive time.
- **When the contract audit was skipped** (no related change resolved), there is no change directory to write into: write no file and say so in the report.

---

## Adjudication handoff

The **final line** of output is a pointer to the adjudication step — not an action this skill takes. Suggested wording (rewordable):

> To adjudicate these findings, run `/adjudicate-review <change>` (a fresh session is recommended) — it re-grounds every disposition in the cited code, interviews you one finding at a time, and records any changes back into `review.md`.

`/spec-review` **invokes nothing** at handoff: it emits the pointer and stops. Adjudication is a separate, file-driven skill (`/adjudicate-review`) whose only input is the persisted `review.md`, so this skill's no-external-dependency invariant stays intact — it enters no explore mode and calls no other skill.
