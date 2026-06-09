## Why

`spec-review`'s `SKILL.md` (~330 lines) and its three briefs are written in a
dense, rationale-heavy style — meta-commentary about the doc's own structure,
justifications for why each rule exists, and reassurance prose — that a capable
model does not need in order to follow the instruction. This violates Anthropic's
[Agent Skills best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
("Concise is key" · "assume Claude is already very smart" · "does this paragraph
justify its token cost?") and the repo's own `CLAUDE.md` comment policy ("if
removing it wouldn't confuse a reader, don't write it"). Those tokens compete with
conversation history and other context every time the orchestrator loads the
skill.

The file is *under* the doc's 500-line threshold, so this is a conciseness and
progressive-disclosure pass, not a limit-violation fix. Two further best-practice
gaps motivate it: the contract brief points back at the 330-line `SKILL.md` for
the archive-state contract (a nested reference the doc warns degrades reads), and
the skill — the team's only review gate — ships with zero evaluation scenarios,
the practice the doc says to establish first.

The existing `spec-review` spec requirements this change must preserve are its
**output contract** ("Consolidated report with a defined output contract…") and
its **single-sourcing** rule ("Sub-agent briefs are bundled within the skill").
Both are inherited constraints: the report shape and review behavior do not
change, and shared contracts stay single-sourced — this change only relocates the
single source to a flatter file and tightens the prose around it.

## What Changes

- **Density pass** over `SKILL.md` and all three briefs: cut rationale, structural
  meta-commentary, and reassurance; keep (and tighten) the *calibration* that
  changes what the model flags or how it writes a finding. Gate every cut by the
  briefs' existing removal bar — a sentence stays only if removing it changes a
  flag or a finding's wording. Targets ~20–30% word reduction with no instruction
  removed. The **output contract is unchanged.**
- **Extract the remaining shared contracts** (archive-state classification +
  reconciliation-latitude table, finding shape, disposition definitions,
  finding-table style, diagram rules) out of `SKILL.md` into one or more **flat
  leaf reference files** under `reference/`, referenced **one level deep** from
  *both* `SKILL.md` and each brief. This removes agent-facing content from the
  orchestrator's always-loaded context and replaces the current
  brief→`SKILL.md` back-reference with brief→small-leaf.
- **`SKILL.md` keeps only the orchestrator's job** plus a short contents/navigation
  block at the top (it is the entry point and exceeds 100 lines).
- **Terminology consistency** pass — standardize "sub-agent" / "agent" /
  "phase agent" to one term.
- **Add a table of contents** to `standard-review-brief.md` (112 lines; the doc
  recommends a TOC for reference files over 100 lines).
- **Author at least three evaluation scenarios** for the gate, bundled with the
  skill: a false-complete task, a merged-archive conformance violation, and a
  clean PR that should `Approve`.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `spec-review`: add a requirement that the skill is authored for **conciseness
  and progressive disclosure** — `SKILL.md` body stays under 500 lines and holds
  only the orchestrator's job; shared contracts and agent-facing detail live in
  flat leaf reference files referenced one level deep from each entry point
  (`SKILL.md` and each brief); reference files over 100 lines carry a table of
  contents. Add a requirement that the skill **ships with at least three bundled
  evaluation scenarios** covering its core verdict outcomes. Both build on, and do
  not weaken, the existing "Sub-agent briefs are bundled within the skill"
  (single-sourcing) and "Consolidated report with a defined output contract"
  (output-shape) requirements.

## Impact

- Skill files under `.claude/skills/spec-review/`: `SKILL.md` (prose tightened,
  agent-facing contracts removed, contents block added), the three brief files
  (prose tightened; `standard-review-brief.md` gains a TOC), new `reference/*.md`
  leaf file(s) for the extracted shared contracts, and new evaluation scenario
  files.
- No application code, DB schema/queries, UI primitives, server reads, or cache
  tags are touched — the cross-cutting design-system and cache-tag rules do not
  apply.
- Active spec touched: `openspec/specs/spec-review/spec.md` — two requirements
  added (conciseness/progressive-disclosure; evaluation scenarios). Inherited
  constraints preserved: "Sub-agent briefs are bundled within the skill" and
  "Consolidated report with a defined output contract" (the output contract and
  review behavior are unchanged).
- Independent of the in-flight `spec-review-fanout-workflow` change; the density
  pass applies regardless of whether the fan-out runs inline or via the workflow.
