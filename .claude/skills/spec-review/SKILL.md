---
name: spec-review
argument-hint: "<change-name | PR | diff>"
description: Review a spec-driven PR/diff before archiving its OpenSpec change. Differentiators over a generic code review - (1) audits the diff against CLAUDE.md and the supporting docs it points to (TESTING.md, DATABASE.md), and (2) audits the diff against the related OpenSpec change's task-completion and design/spec contract, doubling as a pre-archive readiness gate. Use when reviewing a feature branch or PR that implements an OpenSpec change.
metadata:
  author: list_eddiefamily
  version: '1.2'
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

This is the team's **only** review gate: a spec-driven PR is reviewed once, after `propose` + `apply` are pushed, *before* the change is archived, and never re-reviewed after. The verdict therefore doubles as a "clear to archive?" decision.

Each review phase runs as its own sub-agent against a **bundled brief file** in this skill directory — the skill takes no runtime dependency on any external skill:

- `standard-review-brief.md`
- `convention-audit-brief.md`
- `contract-audit-brief.md`

## Usage

```
/spec-review [change-name | PR | diff]
```

- **No argument** → review the current branch diffed against `dev`.
- **`<change-name>`** → an active OpenSpec change name; used directly as the contract-audit target without auto-detection.
- **`<PR>`** → a pull-request reference; the diff is fetched via `gh`.
- **`<diff>`** → an explicit diff source (e.g. `--staged`, `--local`, a ref range).

**Output-only.** This version writes its report to the session. It does **not** post comments to the PR. CI owns build/typecheck/lint — this skill does not *run* them. For a `<PR>` invocation it does, however, *read* the CI result via `gh` (see "Check CI status" after the agents return): a red CI is a Critical `Fix now` blocker on its own, independent of how `tasks.md` is checked off — CI is ground truth, the checkboxes are not.

---

## Phase 0 — Scope and change resolution

Do this yourself (not in a sub-agent), because it produces the inputs the sub-agents need.

### 0a. Acquire the diff

Map the invocation form to a concrete command:

| Invocation | Diff command |
| --- | --- |
| No argument | `git diff dev...HEAD` (current branch vs `dev`) |
| `<PR>` (number/URL) | `gh pr diff <PR>` |
| `--staged` | `git diff --staged` |
| `--local` | `git diff` (unstaged working tree) |
| ref range (e.g. `a..b`) | `git diff <range>` |

If `gh` is unavailable for a PR reference, degrade: ask the user for a diff source rather than failing the whole review.

### 0b. Resolve the related OpenSpec change (auto-detect)

Unless the user named a change explicitly, auto-detect using these signals, strongest first:

#### Diffed spec paths
- any `openspec/changes/<name>/**` paths in the diff name the change directly. Strongest signal. This also covers a **premature archive** (Type 1): when the PR includes the `openspec archive` move, the diff adds `openspec/changes/archive/*-<name>/**`, which names the change even though `openspec list` won't.

#### Commit messages
- `git log dev..HEAD` often references the change slug or issue.

#### `openspec list --json`
- enumerate active changes to match against the above. Note this is **active-only** — a premature-archived change won't appear here, so rely on the diffed archive paths above for that case.

**The branch name is NOT a primary signal.** Branch names and change slugs diverge in this repo — e.g. branch `issue-69` implemented change `enforce-test-title-lint`. Only use the branch name as a weak tiebreaker, never as the deciding factor.

### 0c. Resolution branches

#### Exactly one plausible change
Select it; announce `Using change: <name>`.

#### More than one plausible change
Ask the user to choose via the **AskUserQuestion** tool (list the candidate changes). Do not guess.

#### No related change found
(e.g. a hotfix PR, or a PR whose change is already archived)

Ask the user via the **AskUserQuestion** tool whether to
- (a) proceed with no contract audit
- (b) name the change to review against.

On (a), skip the contract audit and run only the standard-review and convention-audit phases, noting it in the scope line; the verdict reads `no archive gate (contract audit skipped)`. On (b), use the named change as the contract-audit target — the named change is **commonly an already-merged archived one**; classify it in 0d and pass the state to the contract agent.

### 0d. Classify the archive state

When a change resolved (0c (b) or auto-detect), classify it so the orchestrator can pass the state to the contract agent and use it in the verdict. The definitions, the git discrimination command, and the reconciliation-latitude table are single-sourced below under "Archive-state classification". Compute the state here once; do not make the contract agent re-derive it.

---

## Archive-state classification (shared contract)

The archive state of the resolved change is used in three places — Phase 0d (to classify), the contract-audit agent (to frame findings and cap reconciliation), and the verdict (to set the clear-to-archive line). It is defined **once, here**; the contract brief and the verdict logic reference this section rather than restating it.

### States

#### Active
`openspec/changes/<name>/` with no archive move. The normal pre-archive flow; the contract agent reads from there. An auto-detected change is read from the active directory only — never substitute an `archive/` copy for an auto-detected match.

#### Type 1 — premature archive
The change lives under `openspec/changes/archive/*-<name>/` (date-prefixed, e.g. `archive/2026-05-21-add-following-and-history/`) and that archive dir is **introduced by the diff** — the `openspec archive` move is part of *this* PR and the dir is absent on the base branch. Its spec delta was synced *inside this PR*.

#### Type 2 — merged archive
The change lives under `openspec/changes/archive/*-<name>/` and **already exists on the base branch** (the diff does not add it). Its spec delta is canonical. This is the expected path when a PR is reviewed after its change was already merged-and-archived.

### Discriminate Type 1 from Type 2 with git

Check against the diff's base (`<base>` = the PR base branch for a `<PR>` invocation, else `dev`, else the left side of an explicit range):

```bash
# Type 2 (merged) if the archive dir exists on the base; Type 1 (premature) if added by the diff.
git cat-file -e "<base>:openspec/changes/archive/<dir>/proposal.md" 2>/dev/null && echo "Type 2 (merged)" || echo "Type 1 (premature)"
```

Equivalently, the archive path shows as `A` in `git diff --name-status <base>...HEAD` ⇒ Type 1.

**Worked example.** The diff touches `openspec/changes/archive/2026-05-21-add-following/proposal.md`. Run `git cat-file -e "dev:openspec/changes/archive/2026-05-21-add-following/proposal.md"`:
- exits `0` (file exists on base) → **Type 2 merged**; the spec is canonical, contract findings are directional.
- exits non-zero (added by this diff) → **Type 1 premature**; neutral framing, reconciliation capped to sync-neutral edits.

### Reconciliation latitude by archive state

How far past the spec-sync step the change sits caps what a finding's reconciliation may touch. The governing rule: **you may hand-edit the spec only to the degree the edit wouldn't have needed the sync you are now bypassing** — pure wording is sync-neutral, a changed/added/removed SHALL is not.

| State | Framing | In-PR reconciliation |
| --- | --- | --- |
| **Active** | neutral | edit either side freely; the archive step's sync reconciles spec↔canonical later |
| **Type 1 — premature** | neutral | **minor only**: wording/clarity fixes, or fixes affecting only the code being merged. A changed/added/removed SHALL **cannot** be hand-patched (it would bypass the sync that already ran in this PR) — block and route to a fresh `propose→archive` cycle |
| **Type 2 — merged** | directional — code must conform | **no spec-side edits**: conform the code (`Fix now`) **or** open a fresh proposal (`File issue`); block until resolved |

For Type 2, never propose amending the merged spec to make a finding go away — that bypasses spec-sync; changing canonical requires its own proposal cycle. "Block + needs a fresh proposal" is not a fourth disposition — it is a `Request changes` verdict whose reconciliation is a `File issue` (new cycle) rather than an in-PR edit.

---

## Phase orchestration

Spawn the phase agents as **parallel sub-agents** using the Agent tool — all in a **single message** with multiple tool calls so they run concurrently. Skip the contract-audit agent when Phase 0c resolved to no change; spawn the other two regardless.

Each agent's prompt is assembled by the orchestrator from three parts:

1. **A pointer to its bundled brief** (the agent reads it first):
   - standard-review → `.claude/skills/spec-review/standard-review-brief.md`
   - convention-audit → `.claude/skills/spec-review/convention-audit-brief.md`
   - contract-audit → `.claude/skills/spec-review/contract-audit-brief.md`
2. **The review inputs**: the diff (or the command to produce it); for the contract agent also the resolved change name and its archive state (from 0d).
3. **The finding shape** below, stamped inline so every agent returns findings uniformly.

### Finding shape (single source — stamp into every agent prompt)

```
- phase:       standard | convention | contract
- location:    path:line
- description: terse statement of the problem
- severity:    Critical | Major | Minor
- citation:    link to the offending line, and (convention/contract) the doc rule or SHALL violated
- disposition: Fix now | File issue | Drop   (proposed; see §Disposition)
```

After all agents return, **consolidate** their findings into the single report defined under "Consolidated report" below.

### Check CI status (PR invocations)

Do this **after** the agents return, not in Phase 0 — by deferring it to here, CI has had the whole review duration to run, so it is usually finished (or nearly so) and rarely holds up the verdict. It feeds the archive gate, which is computed at the very end anyway.

For a `<PR>` invocation, read the PR's check-run rollup:

```bash
gh pr checks <PR>                              # human-readable pass/fail/pending per check
gh pr view <PR> --json statusCheckRollup       # machine-readable; inspect each check's conclusion
```

Read CI every time, regardless of how `tasks.md` is checked off — CI is ground truth, the checkboxes are not. Three outcomes:

- **CI green** → no CI finding. Any task the change deferred to CI (e.g. a `[~]` "verified by GitHub PR CI" gate) is thereby confirmed.
- **CI red** → raise an open **`Fix now` (Critical)** finding citing the failing check(s), and block the archive gate. This holds whether or not any task is marked complete — a failing build/test/lint the change is responsible for must be fixed in *this* PR.
- **CI still pending** (or no PR / `gh` unavailable) → state CI as **unverified** in the verdict; do not claim clear-to-archive on its basis, and note CI must be re-checked (and any red result fixed) before archiving.

A non-PR invocation has no CI to read — state CI as unverified rather than assuming it passed.

---

## Consolidated report — fixed output contract

Emit a single report in **exactly this order** — do not reorder, omit, or add sections. Fill in this skeleton:

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
Would you like me to enter OpenSpec explore mode to investigate these findings — recommend which to fix, and weigh how each fix would land (pros/cons)?
```

A findings group with no findings shows `_none_` in place of its table; the **Contract** group is omitted entirely when the contract audit was skipped.

### Finding-table style

Columns, in order:

```
# | Severity | Location | Finding | Disposition | Citation
```

- **Severity** — text labels `Critical` / `Major` / `Minor`. **No emojis** (repo convention).
- **Location** — `path:line`.
- **Finding** — terse, factual. Cite, don't editorialize. No preamble, no restating the diff.
- **Citation** — link the offending line; for convention/contract findings, also cite the specific doc rule or SHALL requirement.

### Disposition

Every finding carries exactly one proposed disposition (the skill proposes; the user adjudicates):

#### Fix now

Anything in scope of this change. Default for real findings. For a contract **mismatch** finding (neutral framing), "fix" means *reconcile the disagreement in this PR* — and the reconciliation may edit **either** side (amend the implementation, or amend/relax the task or spec), capped by the archive-state latitude table above. Name both options and let the user adjudicate; do not assume the spec is the correct side. (The merged-archive case is the one where only the implementation may change.)

#### File issue

Reserved for findings that are **both** genuinely out of scope of the current change **and** sizable enough to warrant their own `explore → proposal → apply → archive` cycle. The only durable form a follow-up may take is an actual GitHub issue (`gh issue create`). There are **no mental follow-ups** — never park a real concern as a vague "revisit later" note.

#### Drop

A genuine non-issue, with a one-line rationale.

**Fix cost is never an input to the disposition.** Cheap-and-wrong is still wrong; expensive-and-right is still right. Do not discount or defer a valid finding because it is large, nor surface a non-issue because it is trivial. There is no schedule pressure here — delaying a PR because it missed the mark is the expected, acceptable outcome. Severity communicates impact but never gates inclusion or the now-or-never call.

### Diagrams

Use an ASCII diagram for a finding **when it conveys a relationship faster than prose** — a broken vs. expected data/control flow, a state machine, a dependency or task↔work mapping, a before/after of a fix. Diagrams serve terseness: include one only when it replaces a paragraph of explanation. **No decorative diagrams.**

Worked example — a contract mismatch (task marked done, no implementing work). Note the **bidirectional** arrow: the diagram shows the two artifacts disagree, not that one is the authority.

```
┌──────────┐   disagree    ┌──────────────┐
│  task    │ ◀ ─ ─ ─ ─ ─ ▶ │ implementation│
│  [x] 3.2 │  no matching  │  (no work)    │
└──────────┘     work      └──────────────┘
   resolve EITHER: do the work  OR  amend/unmark the task
```

### Verdict and clear-to-archive logic

The verdict line is `Approve` or `Request changes`, followed by the clear-to-archive determination.

**The verdict keys off dispositions, not the raw count of findings.** A review can surface many findings and still `Approve`:

- `Request changes` — at least one open `Fix now` finding exists (something must change in *this* PR).
- `Approve` — no open `Fix now` findings. Findings dispositioned `File issue` (out of scope, tracked elsewhere) or `Drop` (non-issue) do **not** block approval; note them but approve.

So a clean-but-noted review approves. Severity does not change this — a `Minor` `Fix now` still blocks (cost/size never gate inclusion), and a `Critical`-looking item dispositioned `Drop` does not (it was adjudicated a non-issue).

The archive-gate line depends on the change's state (see "Archive-state classification" above):

#### Active or Type-1 (premature) change

The clear-to-archive gate applies (a Type-1 change becomes canonical on merge). It is clear to archive only when ALL of:

- **CI is green** (from the "Check CI status" step, PR invocations) — red CI blocks regardless of checkbox state; pending/unverified CI cannot satisfy the gate, **and**
- every `tasks.md` item is `[x]` (a `[~]` gate deferred to CI counts only once that CI is confirmed green above), **and**
- `openspec validate <name> --strict` passes — for a Type-1 archive the CLI cannot resolve the archived name, so note validate N/A (it ran before the in-PR archive), **and**
- no open false-complete or conformance findings remain.

Otherwise state **not yet clear to archive** and list the blocking items — including red CI (a blocker) or pending/unverified CI (re-check CI before archiving). A Type-1 finding whose only reconciliation is a significant spec change is blocking: state `not yet clear — needs a fresh propose→archive cycle`.

#### Type-2 (merged) change

The clear-to-archive gate is moot; state `already archived` and give the verdict purely on whether the diff conforms to the canonical contract. An open conformance violation forces `Request changes` and reads `blocked — violates merged spec <name>; needs implementation conformance or a fresh proposal`.

#### No contract audit (Phase 0c proceed-without)

There is no change to gate; state `no archive gate (contract audit skipped)`. The verdict is determined solely by the standard/convention dispositions.

---

## Post-review explore handoff

The **final line** of output is exactly one opt-in prompt. Suggested wording (rewordable):

> Would you like me to enter OpenSpec explore mode to investigate these findings — recommend which to fix, and weigh how each fix would land (pros/cons)?

**Never auto-run.** Do not enter explore mode automatically. After emitting the prompt, take no further action until the user responds.

- **Explicit yes** → enter OpenSpec explore mode, carrying the findings as context.
- **Decline or no response** → do not enter explore mode; the review ends.
