---
name: spec-review
argument-hint: "<change-name | PR | diff>"
description: Review a spec-driven PR/diff before archiving its OpenSpec change. Differentiators over a generic code review - (1) audits the diff against CLAUDE.md and the supporting docs it points to (TESTING.md, DATABASE.md), and (2) audits the diff against the related OpenSpec change's task-completion and design/spec contract, doubling as a pre-archive readiness gate. Use when reviewing a feature branch or PR that implements an OpenSpec change.
metadata:
  author: list_eddiefamily
  version: '1.0'
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

## Usage

```
/spec-review [change-name | PR | diff]
```

- **No argument** → review the current branch diffed against `main`.
- **`<change-name>`** → an active OpenSpec change name; used directly as the contract-audit target without auto-detection.
- **`<PR>`** → a pull-request reference; the diff is fetched via `gh`.
- **`<diff>`** → an explicit diff source (e.g. `--staged`, `--local`, a ref range).

**Output-only.** This version writes its report to the session. It does **not** post comments to the PR. CI owns build/typecheck/lint — this skill does not run them.

---

## Phase 0 — Scope and change resolution

Do this yourself (not in a sub-agent), because it produces the inputs the sub-agents need.

### 0a. Acquire the diff

Map the invocation form to a concrete command:

| Invocation | Diff command |
| --- | --- |
| No argument | `git diff main...HEAD` (current branch vs `main`) |
| `<PR>` (number/URL) | `gh pr diff <PR>` |
| `--staged` | `git diff --staged` |
| `--local` | `git diff` (unstaged working tree) |
| ref range (e.g. `a..b`) | `git diff <range>` |

If `gh` is unavailable for a PR reference, degrade: ask the user for a diff source rather than failing the whole review.

### 0b. Resolve the related OpenSpec change (auto-detect)

Unless the user named a change explicitly, auto-detect using these signals, strongest first:

#### Diffed spec paths
- any `openspec/changes/<name>/**` paths in the diff name the change directly. Strongest signal. This also covers a **premature archive** (D13 Type 1): when the PR includes the `openspec archive` move, the diff adds `openspec/changes/archive/*-<name>/**`, which names the change even though `openspec list` won't.

#### Commit messages
- `git log main..HEAD` often references the change slug or issue.

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

On (a), skip the contract audit and run only the standard-review and convention-audit phases, noting it in the scope line; the verdict reads `no archive gate (contract audit skipped)`. On (b), use the named change as the contract-audit target — the named change is **commonly an already-merged archived one**; the contract-audit brief classifies it (active / Type 1 / Type 2) and reads from `archive/` as needed.

---

## Phase orchestration

Spawn the three phase agents as **parallel sub-agents** using the Agent tool — all in a **single message** with multiple tool calls so they run concurrently. Pass each agent the diff (or the command to produce it) and the resolved change name where relevant. Skip the contract-audit agent when Phase 0c resolved to no change.

Each sub-agent returns findings in this **structured shape** so consolidation can merge them uniformly:

```
- phase:       standard | convention | contract
- location:    path:line
- description: terse statement of the problem
- severity:    Critical | Major | Minor
- citation:    link to the offending line, and (convention/contract) the doc rule or SHALL violated
- disposition: Fix now | File issue | Drop   (proposed; see §Disposition)
```

After all agents return, **consolidate** their findings into the single report defined under "Consolidated report" below.

---

## Standard-review agent brief

Review the diff across four dimensions. For each, apply the concrete sub-checks:

### Security
- SQL injection, XSS, CSRF
- Authentication and authorization flaws
- Secrets or credentials in code
- Insecure deserialization
- Path traversal
- SSRF

### Performance
- N+1 queries
- Unnecessary memory allocations
- Algorithmic complexity (O(n²) in hot paths)
- Missing database indexes
- Unbounded queries or loops
- Resource leaks

### Correctness
- Edge cases (empty input, null, overflow)
- Race conditions and concurrency issues
- Error handling and propagation
- Off-by-one errors
- Type safety

### Maintainability
- Naming clarity
- Single responsibility
- Duplication
- Test coverage
- Documentation for non-obvious logic

### False-positive guard — do NOT report
- Pre-existing issues on lines the diff did not touch.
- Anything a linter or typechecker already catches (CI owns those).
- Unmodified lines / context lines shown only for orientation.
- Pedantic style nits with no correctness, security, or clarity impact.

---

## Convention-audit agent brief

**Always** audit the diff against the repository root `CLAUDE.md`.

**Follow `CLAUDE.md`'s doc-pointers generically.** Parse `CLAUDE.md` for "Read X first"-style pointers — do NOT use a hardcoded filename list, so new docs added to `CLAUDE.md` are picked up automatically. Each pointer is **gated on a trigger**: read the pointed-to doc only when the diff touches the subject that pointer is about.

Known pointers at time of writing (re-derive from `CLAUDE.md` each run — this list is illustrative, not authoritative):

| Pointer in CLAUDE.md | Trigger — read the doc only when the diff... | Key checks |
| --- | --- | --- |
| "Read TESTING.md first" | touches test files (`*.test.ts` / `*.test.tsx`) **or** changes testable behavior with no accompanying test (see "Missing tests are a finding") | substance rules; forbidden patterns (tautologies, execute-for-coverage, snapshot-only); assertion bar; test naming `<State>_<Behavior>` |
| "Read DATABASE.md first" | touches DB schema or queries | **`neon-http` driver — no interactive transactions** (`db.transaction(...)`, `SELECT … FOR UPDATE` are forbidden); migration workflow; driver caveats |

**Untriggered pointers are not loaded** — e.g. if the diff touches no DB schema/queries, do not read `DATABASE.md`. Also audit against the inline `CLAUDE.md` rules that always apply (comment policy, commit-message style, page-minimalism, etc.) when the diff is in their scope.

### Missing tests are a finding, not a skip

A diff that adds or changes behavior but touches **no** test files is itself a red flag — it usually means code is being merged without coverage. Do not silently skip the test audit in that case:

- Read `TESTING.md` and judge whether the changed behavior warranted a test;
- If it did, surface a maintainability finding (`behavior changed with no test added/updated`), citing the untested code;
- Only skip the test audit when the diff changes nothing testable (docs, comments, pure config/styling).

A passing coverage gate is **not** proof the behavior is tested — it can be gamed. Also flag, as maintainability findings:

- New coverage-suppression directives (`/* c8 ignore … */`, `/* v8 ignore … */`, `/* istanbul ignore … */`) placed over real behavior instead of testing it;
- Code commented out or deleted to drop it from the coverage denominator rather than being refactored or tested.

The fix for these is a test or a genuine refactor — not an ignore hint or a commented-out block. Treat a new ignore directive on non-trivial logic as Major unless it is justified inline (e.g. a genuinely unreachable defensive branch).

---

## Contract-audit agent brief

Skip this agent entirely if Phase 0c resolved to no change.

Read the resolved change's `tasks.md`, `design.md`, and `specs/**/spec.md` from its directory. First classify the change by its position relative to the spec-sync (archive) step — this sets how findings may be reconciled (see "Reconciliation latitude" below).

### Locate and classify the resolved change

#### Active

`openspec/changes/<name>/` with no archive move. The normal pre-archive flow; read from there. An auto-detected change SHALL come from the active directory only — never substitute an `archive/` copy for an auto-detected match.

#### Type 1 — premature archive

The change lives under `openspec/changes/archive/*-<name>/` (date-prefixed, e.g. `archive/2026-05-21-add-following-and-history/`) and that archive dir is introduced by the diff — i.e. the `openspec archive` move is part of *this* PR and the dir is absent on the base branch. Its spec delta was synced *inside this PR*.

#### Type 2 — merged archive

The change lives under `openspec/changes/archive/*-<name>/` and already exists on the base branch (the diff does not add it). Its spec delta is canonical. This is the expected path when a PR is reviewed after its change was already merged-and-archived.

#### Discriminate Type 1 from Type 2 with git

Check against the diff's base (`<base>` = the PR base branch for a `<PR>` invocation, else `main`, else the left side of an explicit range):

```bash
# Type 2 (merged) if the archive dir exists on the base; Type 1 (premature) if added by the diff.
git cat-file -e "<base>:openspec/changes/archive/<dir>/proposal.md" 2>/dev/null && echo "Type 2 (merged)" || echo "Type 1 (premature)"
```

Equivalently, the archive path shows as `A` in `git diff --name-status <base>...HEAD` ⇒ Type 1.

### Report mismatches direction-neutral (D12)

A pre-archive review is auditing a change whose `tasks.md`/`design.md`/`spec.md` and implementation were authored **together in the same PR** — they are equally provisional. So when a contract check finds a disagreement, report it as a **mismatch**, and do **not** presume the spec is correct and the code is the defect. The implementation may be right and the task/spec stale, premature, or simply wrong. Your job is to surface the disagreement; the user adjudicates which side wins.

For every contract finding below: state it as "X and the implementation disagree" (not "code violates X"), and propose **both** resolution directions — amend the implementation, **or** amend/relax the task or spec. Disposition is unchanged (`Fix now` still means "reconcile in this PR"); D12 only widens *how* it may be reconciled.

**Exception:** when reviewing against an **already-merged** archived change (Type 2 above), the canonical spec *is* the fixed contract — apply the directional "implementation must conform to the spec" framing instead, and do not offer "amend the spec". A change archived *within this PR* (Type 1) keeps the neutral framing but caps reconciliation — see below.

### Reconciliation latitude by archive state (D13)

How far past the spec-sync step the change sits caps what a finding's reconciliation may touch. The governing rule: **you may hand-edit the spec only to the degree the edit wouldn't have needed the sync you are now bypassing** — pure wording is sync-neutral, a changed/added/removed SHALL is not.

| State | Framing | In-PR reconciliation |
| --- | --- | --- |
| **Active** | neutral (D12) | edit either side freely; the archive step's sync reconciles spec↔canonical later |
| **Type 1 — premature** | neutral (D12) | **minor only**: wording/clarity fixes, or fixes affecting only the code being merged. A changed/added/removed SHALL **cannot** be hand-patched (it would bypass the sync that already ran in this PR) — block and route to a fresh `propose→archive` cycle |
| **Type 2 — merged** | directional — code must conform | **no spec-side edits**: conform the code (`Fix now`) **or** open a fresh proposal (`File issue`); block until resolved |

For Type 2, never propose amending the merged spec to make a finding go away — that bypasses spec-sync; changing canonical requires its own proposal cycle. "Block + needs a fresh proposal" is not a fourth disposition — it is a `Request changes` verdict whose reconciliation is a `File issue` (new cycle) rather than an in-PR edit.

### The three contract checks

#### Task-completion truth

For every task marked `[x]` in `tasks.md`, confirm matching real work exists in the diff or codebase. Absent → **mismatch finding** (Critical/Major): the task and the implementation disagree — either the work is missing, or the task should not be `[x]` / should be reworded or dropped. Propose both directions.

#### Design/spec conformance

Confirm completed work conforms to the SHALL requirements in `design.md` and `specs/**/spec.md`. Contradiction → **conformance mismatch finding**, citing the specific SHALL — neutrally for an active or Type-1 (premature) change (propose changing the code or amending the SHALL, capped at sync-neutral edits for Type 1), directionally for a Type-2 (merged) archived spec (code must conform).

#### Scope creep

Confirm no behavior was added that no task and no spec requirement documents. Undocumented → **scope-creep finding**: resolve by removing the behavior or documenting it in a task/spec. (Silently shipping undocumented behavior erodes the spec as source of truth just as much as an unmet requirement — D6.)

### Validation

Run `openspec validate <name> --strict` and report any failures as contract findings. This resolves **active** changes only; for any archived change (Type 1 or Type 2) the command cannot resolve it — skip validation and note it as not-applicable in the report rather than reporting a failure.

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

Anything in scope of this change. Default for real findings. For a contract **mismatch** finding (D12), "fix" means *reconcile the disagreement in this PR* — and the reconciliation may edit **either** side (amend the implementation, or amend/relax the task or spec). Name both options and let the user adjudicate; do not assume the spec is the correct side. (The archived-spec exception in the contract brief is the one case where only the implementation may change.)

#### File issue

Reserved for findings that are **both** genuinely out of scope of the current change **and** sizable enough to warrant their own `explore → proposal → apply → archive` cycle. The only durable form a follow-up may take is an actual GitHub issue (`gh issue create`). There are **no mental follow-ups** — never park a real concern as a vague "revisit later" note.

#### Drop

A genuine non-issue, with a one-line rationale.

**Fix cost is never an input to the disposition (D8).** Cheap-and-wrong is still wrong; expensive-and-right is still right. Do not discount or defer a valid finding because it is large, nor surface a non-issue because it is trivial. There is no schedule pressure here — delaying a PR because it missed the mark is the expected, acceptable outcome. Severity communicates impact but never gates inclusion or the now-or-never call.

### Diagrams

Use an ASCII diagram for a finding **when it conveys a relationship faster than prose** — a broken vs. expected data/control flow, a state machine, a dependency or task↔work mapping, a before/after of a fix. Diagrams serve terseness: include one only when it replaces a paragraph of explanation. **No decorative diagrams.**

Worked example — a contract mismatch (task marked done, no implementing work). Note the **bidirectional** arrow: the diagram shows the two artifacts disagree, not that one is the authority (D12).

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

So a clean-but-noted review approves. Severity does not change this — a `Minor` `Fix now` still blocks (D8: cost/size never gate inclusion), and a `Critical`-looking item dispositioned `Drop` does not (it was adjudicated a non-issue).

The archive-gate line depends on the change's state (D13):

#### Active or Type-1 (premature) change

The clear-to-archive gate applies (a Type-1 change becomes canonical on merge). It is clear to archive only when ALL of:

- every `tasks.md` item is `[x]`, **and**
- `openspec validate <name> --strict` passes — for a Type-1 archive the CLI cannot resolve the archived name, so note validate N/A (it ran before the in-PR archive), **and**
- no open false-complete or conformance findings remain.

Otherwise state **not yet clear to archive** and list the blocking items. A Type-1 finding whose only reconciliation is a significant spec change is blocking: state `not yet clear — needs a fresh propose→archive cycle`.

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
