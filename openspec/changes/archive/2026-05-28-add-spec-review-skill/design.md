## Context

The team reviews a spec-driven PR once — after `propose` + `apply` are pushed and the PR is open, but *before* the change is archived — and never re-reviews after archive. That single review is therefore the only gate protecting the OpenSpec contract. The external `engineering:code-review` skill the team has used is single-pass and project-agnostic: it never follows `CLAUDE.md`'s pointers to `TESTING.md`/`DATABASE.md`, and it has no notion of `tasks.md`/`design.md`/`spec.md`. This change adds a self-contained project skill, `spec-review`, that closes both gaps. No runtime app code is involved; the artifact is a `.claude/skills/spec-review/SKILL.md` instruction document plus optional reference files.

## Goals / Non-Goals

**Goals:**
- A self-contained `/spec-review` skill that needs no other plugin at runtime.
- Explicit convention auditing against `CLAUDE.md` and the docs it points to, gated on whether the diff hits each pointer's trigger.
- An OpenSpec contract audit that verifies task-completion claims, design/spec conformance, and undocumented scope creep, and that doubles as a pre-archive readiness gate.
- Multi-agent (parallel sub-agent) orchestration with a single consolidated report in a fixed, deterministic output contract (order, style, wording).
- A single opt-in prompt at the end offering to continue into OpenSpec explore mode to investigate the findings — never auto-run.

**Non-Goals:**
- Re-reviewing the archive move or post-archive corrections — deliberately accepted unreviewed per the team's process.
- Auto-posting findings to the PR (no `--comment` mode in this version); output is to the session.
- Replacing or modifying the external `engineering:code-review` skill; `spec-review` sits alongside it.
- Running build/typecheck/lint as part of review — CI owns those; the skill assumes they run separately.
- Auditing the diff against canonical `openspec/specs/` (the accumulated, already-archived requirements). A proposal is already validated against canonical when it is created, and spec-vs-canonical drift is reconciled by the archive (spec-sync) step — so a standing canonical-conformance pass at review time would be redundant. (The skill *does* enforce conformance to a specific already-merged archived spec when it is the explicit review target — see D13 Type 2 — but it does not sweep the whole canonical spec set.)

## Decisions

### D1 — Self-contained, not a wrapper around `engineering:code-review`
The skill inlines the four standard dimensions (security, performance, correctness, maintainability) as a sub-agent brief rather than invoking the external skill.
- **Why:** (a) The multi-agent choice means the skill orchestrates sub-agents itself, so there is nothing to delegate to — the external *skill* is single-pass and its output format (its own tables + verdict) does not slot in as a sub-section. (b) Skills don't compose as clean function calls; invoking one mid-execution loads its full instructions and its own verdict into context. (c) A runtime dependency on an external marketplace plugin is fragile — a plugin update or removal would silently break a version-controlled project skill.
- **Alternative rejected:** Sub-call `engineering:code-review` for Phase 1. Rejected for the three reasons above. The cost of D1 is duplicating a small, stable, generic ~4-dimension checklist. Provenance is recorded here in design (Context + this decision), **not** as a coupling note inside the skill body — a hard-coded `engineering:code-review` reference in `SKILL.md` would re-introduce exactly the fragile external coupling D1 exists to avoid, and the four dimensions (security/performance/correctness/maintainability) are the universal review axes, not a proprietary checklist that needs attribution.

### D2 — Multi-agent orchestration
Spawn parallel sub-agents (standard-review, convention-audit, contract-audit) and consolidate.
- **Why:** Deeper, isolated coverage per concern; keeps each agent's context focused on its phase. Matches the chosen run style.
- **Trade-off:** More tokens and latency than a single pass; accepted for the higher-stakes pre-archive gate.

### D3 — Generic CLAUDE.md pointer following
Derive doc-pointers from `CLAUDE.md` at review time rather than hardcoding `TESTING.md`/`DATABASE.md`. A pointer fires only when the diff touches the subject it is gated on (test files → `TESTING.md`; DB schema/queries → `DATABASE.md`).
- **Why:** Robust to new docs added to `CLAUDE.md`; avoids stale filename lists; matches the repo's DRY instinct. `CLAUDE.md` is already auto-loaded into context, so the pointers are available for free.
- **Alternative rejected:** Hardcode the two known filenames. Simpler but rots when a third doc is added.

### D4 — Change resolution: auto-detect, ask if ambiguous, ask if none
Resolve the related change via `openspec list --json` + commit messages + diffed spec paths. Branch name is unreliable (e.g. branch `issue-69` ↔ change `enforce-test-title-lint`), so it is not the primary signal. When auto-detection finds nothing, the skill asks the user whether to proceed with no contract audit or to name a change to review against, rather than silently skipping.
- **Why:** Lowest-friction for the common single-match case while staying correct when the branch name doesn't match the slug. Prompting on no-match (instead of auto-skipping) keeps the user in control on hotfix PRs and guards against a missed auto-detection silently dropping the contract gate.

### D5 — Read the active change dir and gate archive readiness; archived dirs are split by D13
For the normal pre-archive flow the contract audit reads `openspec/changes/<name>/` and never substitutes an `archive/` copy for an auto-detected match — the review runs before archive, so it must audit the live artifacts. The verdict states "clear to archive?" using all-tasks-complete + `openspec validate <name> --strict` clean + no open contract findings.

When the change is instead located under `openspec/changes/archive/*-<name>/`, "archived" is **not one case but two**, and the editing latitude differs — see D13. The clear-to-archive gate still applies to an *in-PR (premature) archive* (D13 Type 1) because it becomes canonical on merge; it is moot for an *already-merged archive* (D13 Type 2), whose verdict reads `already archived`. For any archived target `openspec validate <name>` cannot resolve the change (the CLI only resolves active changes), so validation is skipped and noted not-applicable.
- **Why:** Aligns with the team's flow where review is the last gate before archive; folds the archive-readiness check into the review that already exists rather than adding a separate step. Keeping a path for archived targets keeps the skill useful for the realistic case where the only spec to review against has moved to `archive/`, without weakening the default that an auto-detected pre-archive review never reads stale archived copies.

### D6 — Scope-creep detection is in-scope (full strictness)
Findings include false-complete `[x]` tasks, design/spec conformance violations, AND behavior added that no task or spec documents.
- **Why:** "Not violating our own contract" cuts both ways — silently shipping undocumented behavior erodes the spec as the source of truth just as much as an unmet requirement does.

### D7 — Finding disposition: fix now, file a GitHub issue, or drop — nothing else
The decision hinge for every finding is binary: fix it in this PR, or never. "Follow-up" is a rare exception reserved only for work that is **both** genuinely out of scope of the current change **and** sizable enough to warrant its own `explore → proposal → apply → archive` cycle. When a finding qualifies as follow-up, the only permitted action is to open a GitHub issue (`gh issue create`) — that is the sole durable form a follow-up may take. There are **no mental follow-ups**: the skill must never park a real concern as a vague "revisit later" note. Every surfaced finding resolves to exactly one of: **fixed-now**, a **filed GitHub issue**, or **dropped as not-a-problem** (with rationale).
- **Why:** a review whose findings dissolve into "we should look at this someday" notes gives false assurance; the spec contract and code quality only hold if every concern lands somewhere accountable.
- **Application:** drives a per-finding disposition in the consolidated report and refines D6 — out-of-scope creep that's sizable → GitHub issue; out-of-scope but trivial/incidental and acceptable → dropped with rationale; anything in scope → fixed before merge. The skill proposes the disposition; the user adjudicates.

### D8 — Fix cost is not an input to the now-or-never decision
Whether a finding is cheap or expensive to fix has no bearing on whether it must be addressed. Cheap-and-wrong is still wrong; expensive-and-right is still right. The skill SHALL NOT discount or defer a valid finding because it is large, nor surface a non-issue because it is trivial. There are no deadlines or release schedules that justify shipping a known miss — delaying a PR because it missed the mark is the expected, acceptable outcome.
- **Why:** cost-based triage silently lets correctness erode under schedule pressure; this repo has no such pressure, so the only axes that matter are right/wrong and in/out-of-scope (D7).
- **Application:** removes "too expensive to fix now" and "too cheap to mention" as adjudication reasons. Severity still communicates impact, but it never gates inclusion or the now-or-never call. Boundary with the standard-review false-positive guard (D1 / §4): genuine non-issues are still dropped — D8 forbids using *cost* as the filter, not surfacing pedantry.

### D9 — Post-review explore handoff is a single opt-in prompt, never auto-run
After the report and verdict, the skill ends with exactly one prompt offering to enter OpenSpec explore mode to investigate the findings — recommend which to fix, and think through how each fix would land with pros/cons. It SHALL NOT enter explore mode automatically; it only does so on the user's explicit yes.
- **Why:** the user already runs this step by hand after every review; making it a one-tap offer removes the manual context-switch without seizing control of the workflow. Auto-running would defeat the deliberate "stop and decide" beat between review and remediation.
- **Application:** the prompt is the final line of output. Suggested wording (rewordable): *"Would you like me to enter OpenSpec explore mode to investigate these findings — recommend which to fix, and weigh how each fix would land (pros/cons)?"* On yes, the skill hands the findings into explore mode; on no/no-response, it stops.

### D10 — The skill defines a fixed, deterministic output contract
The SKILL.md SHALL pin the exact output order, style, and wording rather than leaving formatting to the model. The contract:
- **Order (fixed):** (1) header `# /spec-review — <change-name | "no related change">`; (2) one- to two-sentence summary stating overall quality and headline contract status; (3) scope line — diff source + resolved change (or "none — contract audit skipped"); (4) findings grouped by phase in the fixed order **Standard → Convention → Contract**, each a table with columns `# | Severity | Location | Finding | Disposition | Citation`; (5) "What looks good" — short bullets; (6) verdict — `Approve` / `Request changes` (keyed off dispositions, see D11) plus the clear-to-archive line (D5), listing blockers when not clear; (7) the D9 explore-handoff prompt as the final line.
- **Style:** tables for findings, bullets for "what looks good", a single-line verdict. Severity uses **text labels** `Critical` / `Major` / `Minor` — **no emojis** (consistent with repo convention). `Disposition` is one of `Fix now` / `File issue` / `Drop` (D7). `Location` is `path:line`; `Citation` links the offending line and, for contract/convention findings, the specific SHALL or doc rule.
- **Wording:** terse and factual — no preamble, no restating the diff, cite rather than editorialize.
- **Diagrams:** use ASCII diagrams when they convey a relationship faster than prose — a broken/expected data or control flow, a state machine, a dependency or task↔work mapping, a before/after of a fix. They serve terseness, not decoration: include one only when it replaces a paragraph of explanation, never as filler. This mirrors the "Visualize" stance the OpenSpec explore skill uses, scoped here to clarifying a specific finding.

  ```
  ┌──────────┐  unmet SHALL   ┌──────────┐
  │  task    │ ─ ─ ─ ─ ─ ─ ─▶ │  spec    │
  │  [x] 3.2 │   (no impl)    │  req     │
  └──────────┘                └──────────┘
  ```
- **Why:** a deterministic contract makes reviews scannable and comparable run-to-run, and it is the natural home for the D7 disposition and D8 cost-neutral framing. Leaving format to the model produces drift the user has to re-read each time.

### D11 — Verdict is keyed off dispositions, not the count of findings
`Request changes` iff at least one open `Fix now` finding exists; otherwise `Approve`. Findings dispositioned `File issue` (out of scope, tracked elsewhere) or `Drop` (non-issue) do not block approval.
- **Why:** a binary verdict driven by the mere *presence* of findings would make `Approve` almost unreachable — any review surfaces something, even if it's a non-issue or out-of-scope note. Tying the verdict to the D7 disposition makes `Approve` mean "nothing must change in *this* PR," which is the decision the verdict actually needs to communicate. A thorough review with only `Drop`/`File issue` findings should still approve.
- **Interaction with D8:** severity never overrides the disposition — a `Minor` `Fix now` blocks, a `Critical`-looking item adjudicated `Drop` does not. Severity communicates impact; the disposition drives the verdict.

### D12 — Contract mismatches are reported direction-neutral
When the implementation and the change's own `tasks.md`/`design.md`/`spec.md` disagree, the finding states the **disagreement** — it does not presume which artifact is the defect. The proposed resolution names both directions (amend the implementation, **or** amend/relax the task or spec), and the user adjudicates which side is wrong.
- **Why:** the normal contract-audit framing ("code must conform to spec") is correct only when the spec is an already-fixed, separately-archived contract. But this skill reviews a change *before* it is archived (D5), where `tasks.md`/`design.md`/`spec.md` and the implementation were authored together in the **same** PR and are equally provisional. Auto-siding with the spec means that at the only gate before an irreversible archive, the skill would push the user to "fix" correct code to match a stale or wrong spec — entrenching the spec error permanently. The review's job is to surface the mismatch; adjudicating which artifact is correct is the user's call.
- **Application:** the three contract checks (false-complete, conformance, scope-creep) are phrased neutrally — "task X and the implementation disagree", not "code violates task X". A `Fix now` contract-mismatch finding may be reconciled by editing **either** side; the report states both options. This does not add a fourth disposition — `Fix now` still means "must be reconciled in this PR" (D11 verdict logic unchanged); it only widens *how* a contract finding may be reconciled.
- **Exception:** when the review runs against an **already-merged** archived change (D13 Type 2), the canonical spec genuinely is the fixed contract, so the directional "code must conform" framing applies and neutral framing does not. A change archived *within this PR* (D13 Type 1) keeps the neutral framing but caps reconciliation at sync-neutral edits — see D13.

### D13 — Archive state discriminates the editing rule (the spec-sync-distance gradient)
"Active vs archived" is not a binary for this skill. There are **three positions** a change can occupy relative to the spec-sync (archive) step, and each permits a different degree of hand-editing at review time. The discriminator is git: **is the change's `archive/` dir present on the diff's base/merge-base, or introduced by the diff?**

| Position | Git signal | Spec-sync status | Hand-edit allowed at review |
| --- | --- | --- | --- |
| **Active** | `openspec/changes/<name>/`, no archive move | not run (runs at archive) | anything — both sides, D12-neutral; sync reconciles later |
| **Type 1 — premature archive** | archive dir **added by the diff** (absent on base) | ran, *inside this PR* | minor only: wording/clarity, or fixes affecting only the code being merged. A changed/added/removed SHALL must re-run propose→archive (can't hand-patch post-sync artifacts) — block |
| **Type 2 — merged archive** | archive dir **already on base** (diff doesn't add it) | ran, already canonical on base | nothing spec-side. conform code (`Fix now`) **or** fresh proposal (`File issue`); block until resolved |

- **Why:** the spec-sync step (`openspec archive`) merges a change's spec delta into canonical `openspec/specs/` and updates cross-references. The governing rule: **you may hand-edit the spec only to the degree the edit wouldn't have needed the sync you are now bypassing.** Pure wording is sync-neutral; a SHALL change is not. An active change hasn't synced yet (edit freely — sync runs later); a premature archive already synced *inside the PR* (only sync-neutral edits are safe — a significant deviation would silently miss what the automated sync propagates); a merged archive is canonical and immutable here (no spec-side edits — changing it requires a fresh proposal so sync runs correctly).
- **Application:** Phase 0 classifies the change once its dir is located, using the diff's base (`<PR>` base branch, else `dev`/the range's left side). Type 2 conformance findings are directional and block (the D12 exception). A Type-1 finding whose reconciliation is a significant spec change is also blocking and routed to a re-cycle (`not yet clear — needs a fresh propose→archive cycle`); minor Type-1 reconciliations are ordinary `Fix now`. This adds no fourth disposition — "block + needs a fresh proposal" is a `Request changes` verdict whose reconciliation happens to be a `File issue` (new cycle) rather than an in-PR edit.
- **Relation to S1:** the verdict strings fall out of the three positions — Type 1 reuses the clear-to-archive line, Type 2 reads `already archived`, and the no-contract-audit path (D4 proceed-without) reads `no archive gate (contract audit skipped)`. The earlier single archived verdict value was the symptom; this gradient is the cause.

## Risks / Trade-offs

- **Scope-creep false positives** (flagging legitimate incidental work as undocumented) → surface with a clear rationale and citation and a proposed disposition (D7); the user adjudicates the final call rather than the skill hard-blocking. "Advisory" here means the skill cannot merge — not that a real finding may be left as a vague note (D7 forbids mental follow-ups).
- **Change auto-detection mis-resolves** to the wrong change on PRs that touch multiple changes' spec paths → fall back to asking the user when more than one plausible match is found (D4).
- **Multi-agent cost/latency** higher than single-pass → accepted given this is the only contract gate before an irreversible archive+merge (D2).
- **Lineage drift** — the inlined dimensions could fall behind `engineering:code-review` upstream → acceptable; the dimensions are stable and generic, and the provenance recorded in this design's Context/D1 tells a maintainer where to reconcile if desired. The skill body itself stays free of a coupling reference (D1).
- **`gh` / `openspec` CLI availability** assumed present → if `gh` is missing for a PR-reference invocation or `openspec` for resolution, the affected phase degrades to asking the user or skipping, not failing the whole review.
