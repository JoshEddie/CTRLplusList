---
name: spec-review
argument-hint: "<change-name | PR | diff>"
description: Review a spec-driven PR/diff before archiving its OpenSpec change. Differentiators over a generic code review - (1) audits the diff against CLAUDE.md and the supporting docs it points to (TESTING.md, DATABASE.md), and (2) audits the diff against the related OpenSpec change's task-completion and design/spec contract, doubling as a pre-archive readiness gate. Use when reviewing a feature branch or PR that implements an OpenSpec change.
metadata:
  author: list_eddiefamily
  version: '1.5'
---

# /spec-review

A self-contained project code-review skill. It audits a PR/diff across three arenas at once:

### A — Alignment (delta-scoped)

- the change's promise: the related OpenSpec change's `tasks.md`, `design.md`, `specs/**/spec.md`
- `openspec validate`

### B — Boundary (whole-scoped)

- corpus-relative defects, invisible viewing the delta or a file alone: duplication against existing code, naming fit, doc-vs-code drift, cross-file performance

### C — Convention (delta-scoped)

- house law: the repo's `CLAUDE.md` and the supporting docs it points to (e.g. `TESTING.md`, `DATABASE.md`), test substance, coverage-gaming
- craft law: security, correctness, single-file performance, single-responsibility — every finding citing the doc rule or named universal principle

Coverage thresholds belong to no arena — `test:coverage` owns them.

This is the review family's **full** review: it opens round 1 of a change's review history. Findings are fixed and verified in follow-up rounds appended to the same persisted report — `/recheck-review` when the fix delta changed code OR spec artifacts (never both), `/incremental-spec-review` when it changed both. A full `/spec-review` runs again only by explicit owner choice, never as an escalation target. The latest round's effective verdict is the gate `/landfall` reads before staging the work commit.

## Contents

- **Usage** — invocation forms.
- **Phase 0** — scope and change resolution (you do this; it produces the agents' inputs).
- **Phase orchestration** — fan out the three arena agents as parallel Agent-tool sub-agents; parse and validate their JSON replies.
- **Check CI status** — read CI after the agents return (PR invocations).
- **Consolidated report** — the fixed output contract and verdict logic.
- **Persist the report** — write/append `openspec/changes/<name>/review.md`, plus the tasks.md gate section on an adverse verdict.
- **Adjudication handoff** — the closing pointer to `/adjudicate-review`.
- Reference leaves under `.claude/skills/spec-review/reference/`: `archive-state.md` (states + reconciliation latitude), `finding-format.md` (finding shape, IDs, table style, dispositions, gate sections, diagrams).

Each arena runs as its own **agent** against a bundled brief file; the skill takes no runtime dependency on any external skill. The briefs are the single source of the arena contract for the whole review family — `/incremental-spec-review` reads these same files (a file read, not a skill invocation):

- `alignment-brief.md`
- `boundary-brief.md`
- `convention-brief.md`

## Usage

```
/spec-review [change-name | PR | diff]
```

- **No argument** → review the staged diff (`git diff --staged`), on any branch — the trunk workflow's pre-commit scope. Branch work is never an implicit default: review a branch by naming its PR or an explicit ref range (e.g. `dev...HEAD`).
- **`<change-name>`** → an active OpenSpec change name; used directly as the alignment-audit target without auto-detection.
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

- (a) proceed with no alignment audit
- (b) name the change to review against.

On (a), skip the alignment arena and run only the boundary and convention arenas, noting it in the scope line; the verdict reads `no archive gate (alignment audit skipped)`. On (b), use the named change as the alignment-audit target — commonly an already-merged archived one; classify it in 0d and pass the state to the alignment agent.

### 0d. Classify the archive state

When a change resolved (0c (b) or auto-detect), classify it per `.claude/skills/spec-review/reference/archive-state.md` so the orchestrator can pass the state to the alignment agent and use it in the verdict. Compute the state here once; do not make the alignment agent re-derive it.

---

## Phase orchestration

The arena reviews run as **direct Agent-tool sub-agents** — issue all arena agents as Agent-tool calls **in a single message** so they run concurrently. The fan-out is bounded: 3 arena agents (alignment / boundary / convention), or 2 when Phase 0c resolved no change (alignment arena skipped).

### Per-agent prompt

Build each agent's prompt from the Phase-0-resolved inputs:

- **Identity line** — `You are the <arena> agent for /spec-review.`
- **Brief pointer** — `First Read your brief at <brief path> and follow it exactly.` The bundled brief paths:
  - `alignment`: `.claude/skills/spec-review/alignment-brief.md`
  - `boundary`: `.claude/skills/spec-review/boundary-brief.md`
  - `convention`: `.claude/skills/spec-review/convention-brief.md`
- **Diff command** — `Produce the diff under review with: <diffCmd>, then review it.` Each agent runs the 0a-resolved command itself; the raw diff is never passed as a giant string.
- **Phase key** — the agent's own key (`alignment` / `boundary` / `convention`), which it sets as `phase` on every finding.
- **Alignment agent only** — additionally: the resolved change name (0c), the archive state (0d), `Apply the framing and reconciliation latitude for that state exactly as the brief describes.`, and `Surface any task explicitly deferred to CI as a deferredToCI entry rather than a missing-work finding.`

### Reply convention

Each prompt ends with the reply instruction: reply with **only** a JSON object

```json
{"findings": [...], "deferredToCI": [...]}
```

— no prose. Each finding carries exactly the six fields of `reference/finding-format.md` § Finding shape (`phase`, `location`, `description`, `severity`, `citation`, `disposition`), with `phase` set to the agent's own key. `deferredToCI` is meaningful only from the alignment agent; absent arrays default to empty.

### Parse, retry, abort

Parse each agent's reply: strip an optional code fence (a fenced JSON block is tolerated), read it as JSON, and check the shape — an object, `findings` an array, every finding carrying the six fields with the enumerated `phase` / `severity` / `disposition` values. On failure, retry **exactly once**: send the same agent a follow-up message via **SendMessage** — "reply was not valid findings JSON; resend only the JSON object" — reusing its existing review context rather than re-running the arena. Still malformed after the retry (or the follow-up cannot reach the agent): **abort the review** — name the failed arena, show the raw reply, and persist no round.

After all replies validate, **consolidate**: concatenate the per-agent `findings` and `deferredToCI` arrays, then render the findings into the report below — each is a validated object in the shape defined in `.claude/skills/spec-review/reference/finding-format.md`.

## Check CI status (PR invocations)

Do this **after** the agents return, not in Phase 0 — CI has had the whole review duration to run, so it is usually finished, and it feeds the archive gate computed at the end.

For a `<PR>` invocation, read the PR's check-run rollup:

```bash
gh pr checks <PR>                              # human-readable pass/fail/pending per check
gh pr view <PR> --json statusCheckRollup       # machine-readable; inspect each check's conclusion
```

Read CI every time, regardless of how `tasks.md` is checked off — CI is ground truth, the checkboxes are not. Three outcomes:

- **CI green** → no CI finding. Any task the change deferred to CI (surfaced as `deferredToCI` in the alignment agent's reply; e.g. a `[~]` "verified by GitHub PR CI" gate) is thereby confirmed.
- **CI red** → raise an open **`Fix now` (Critical)** finding citing the failing check(s), and block the archive gate. Holds whether or not any task is marked complete.
- **CI still pending** (or no PR / `gh` unavailable) → state CI as **unverified** in the verdict; do not claim clear-to-archive on its basis, and note CI must be re-checked (and any red result fixed) before archiving.

A non-PR invocation has no CI to read — state CI as unverified rather than assuming it passed.

---

## Consolidated report — fixed output contract

Emit a single report in **exactly this order** — do not reorder, omit, or add sections. The finding-table columns, severity labels (text, no emoji), dispositions, and diagram rules are defined in `.claude/skills/spec-review/reference/finding-format.md`. Column 1 of every findings table is the finding's **durable ID** per that reference's finding-ID scheme — a capital arena letter (`A` alignment, `B` boundary, `C` convention) plus an integer that increments globally across the arena tables within the round in one continuous sequence (`A1`, `B2`, `C3` — never `A1` and `B1` together), so every finding is referable by an ID unique within its round; merges join IDs with `+` (`A1+C3`). Fill in this skeleton:

```markdown
# /spec-review — <change-name | "no related change">

<one- to two-sentence summary: overall code quality + headline alignment status>

**Scope:** <diff source> · <resolved change | "alignment audit skipped — no related change">

## Findings

### Alignment
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|

### Boundary
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|

### Convention
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|

## What looks good
- <short bullets>

## Verdict
<Approve | Request changes> — <clear to archive | not yet clear to archive (blockers: …) | not yet clear — needs a fresh propose→archive cycle | already archived | blocked — violates merged spec <name>; needs implementation conformance or a fresh proposal | no archive gate (alignment audit skipped)>

---
To adjudicate these findings, run `/adjudicate-review <change>` (a fresh session is recommended) — it re-grounds every disposition in the cited code, interviews you one finding at a time, and records any changes back into `review.md`.
```

A findings group with no findings shows `_none_`; the **Alignment** group is omitted when the alignment audit was skipped.

Apply the hardened disposition criteria from `reference/finding-format.md` when rendering dispositions: `Fix now` is governed by scope never effort (plus soon-dead-code deferrals); a `File issue` with no charter citation is invalid — re-disposition it before emitting the report.

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

#### No alignment audit (Phase 0c proceed-without)

No change to gate; state `no archive gate (alignment audit skipped)`. The verdict is determined solely by the boundary/convention dispositions.

---

## Persist the report

After emitting the consolidated report, persist it to `openspec/changes/<name>/review.md`. The persisted form is a **round**, not the session report verbatim — apply the round structure in `reference/finding-format.md`:

- **Append round 1 into the pre-existing `round: 0` scaffold.** A change created via propose already carries a `review.md` scaffold (the `review-artifact` capability: header with `round: 0`, `TBD` `anchor`/`diff-source`, no round sections). Fill that header in place — set `round: 1` and write the real `anchor` sha and `diff-source` over the `TBD` placeholders — and append the round body below it. Do not create the file from scratch when a scaffold exists. **Fallback create path:** when no scaffold exists (an older in-flight change made before this landed, or a `<PR>` review outside any resolved OpenSpec change), write the file fresh with the same header — see the no-related-change note below.
- The header is the shared machine-readable header defined in `reference/finding-format.md` (`review: spec-review`, `target:` the change, `anchor:` the sha the diff was computed against, `diff-source:` the diff command or PR reference, `round:` the highest round in the file).
- The report body is round 1 (`## Round 1 — spec-review (<date>)`). The session report's `# /spec-review` title becomes the `## Round 1` heading; its `### Alignment`/`### Boundary`/`### Convention` finding tables sit directly under the round (drop the `## Findings` wrapper), and `## What looks good` nests as `### What looks good` — so every part of the round lives at `###` and the round is self-contained (nothing at `##` belongs to it; the next `##` starts the next round). A repeat full review — run only by explicit owner choice — **appends** the next round and bumps the header's `round:` — prior rounds are never rewritten.
- **The round ends with a round-vocab `**Verdict:**` line**, not the session `## Verdict` wording: map `Approve → **Verdict:** clear to land` and `Request changes → **Verdict:** findings remain` (list the blockers after `findings remain`). This is the line `/landfall`, `/recheck-review`, and `/incremental-spec-review` read, and the line an `### Adjudications` subsection overrides.
- **When the persisted round's verdict is `findings remain`**, also append the `## Gates — round <n>` section to the change's `tasks.md` per `reference/finding-format.md` § Gate sections — one unchecked item per open `Fix now` finding, by durable ID; never uncheck or edit a prior round's section. A clearing verdict appends no section.
- The persisted report is consumed by `/recheck-review` and `/incremental-spec-review` (round appending, delta computation from the header) and `/landfall` (latest-round-verdict gate), and travels with the change directory at archive time.
- **When the alignment audit was skipped** (no related change resolved), there is no change directory to write into: write no file and say so in the report.

---

## Adjudication handoff

The **final line** of output is a pointer to the adjudication step — not an action this skill takes. Suggested wording (rewordable):

> To adjudicate these findings, run `/adjudicate-review <change>` (a fresh session is recommended) — it re-grounds every disposition in the cited code, interviews you one finding at a time, and records any changes back into `review.md`.

`/spec-review` **invokes nothing** at handoff: it emits the pointer and stops. Adjudication is a separate, file-driven skill (`/adjudicate-review`) whose only input is the persisted `review.md`, so this skill's no-external-dependency invariant stays intact — it enters no explore mode and calls no other skill.
