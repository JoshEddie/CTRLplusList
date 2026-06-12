## Why

`spec-review` fans out to three parallel review agents, but the Agent tool returns
**free text** — there is no enforced finding shape. Today the skill stamps a
finding shape into each prompt and *hopes* the agent complies, then consolidates by
parsing prose; format drift between agents lands in the report. Moving the fan-out
into a `Workflow` the skill invokes closes that gap: each phase agent returns its
findings through a **schema-validated** structured-output shape, so the skill
consolidates uniform, validated objects instead of parsing text. As a secondary
benefit, the raw per-agent findings are assembled inside the workflow and only the
consolidated set returns, keeping fan-out churn out of the orchestrator's context.

This is a **format** guarantee, not a correctness one: the workflow does not
second-guess whether a finding is *right* — the report's verdict is advisory and
the existing post-review explore handoff is where findings are investigated. The
existing `spec-review` spec's "Multi-agent orchestration" requirement is the
binding constraint this change modifies; parallel execution and skill-side
consolidation are preserved.

## What Changes

- Move the three-phase review fan-out (standard-review, convention-audit,
  contract-audit) out of inline Agent-tool calls and into a bundled `Workflow`
  script the `SKILL.md` invokes — the skill instructing the call is itself the
  Workflow opt-in.
- Each phase agent returns findings via a **schema-enforced** structured-output
  shape (the existing finding shape, now machine-validated rather than
  stamped-into-a-prompt-and-hoped), eliminating format drift at consolidation.
- The workflow returns `{ findings, deferredToCI }` — the consolidated findings
  plus any tasks the contract agent flags as deferred-to-CI; the skill consolidates
  and computes the verdict as before.
- **Keep in the skill, never in the workflow**: Phase 0 (diff acquisition,
  interactive change resolution via `AskUserQuestion`, archive-state
  classification), the CI read, consolidation, the verdict / clear-to-archive
  logic, and the explore-mode handoff. A workflow runs non-interactively in the
  background and cannot prompt the user, so every interactive or judgment step
  stays skill-side; the workflow receives fully-resolved inputs and returns
  findings.

The **output contract** is preserved unchanged — invocation, audited dimensions,
the fixed report shape, verdict / clear-to-archive logic, and the explore-mode
handoff. What changes is that the findings filling that contract are
schema-validated at origin rather than parsed from prose.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `spec-review`: modify **"Multi-agent orchestration"** so the parallel review
  fan-out is performed by a workflow the skill invokes (with schema-validated
  findings and skill-side consolidation preserved), and so the interactive scope
  resolution and explore-mode handoff are explicitly retained in the skill rather
  than the non-interactive workflow. The existing "OpenSpec change resolution" and
  "Optional explore-mode handoff" requirements (interactive) are inherited
  constraints the workflow boundary must not violate.

## Impact

- Skill files under `.claude/skills/spec-review/`: `SKILL.md` (the Phase-
  orchestration step is rewritten to invoke the workflow instead of spawning
  Agent-tool calls) plus a new bundled workflow script and the schema it enforces.
  The three existing brief files are unchanged — the workflow agents read them by
  pointer exactly as today.
- No application code, DB schema/queries, UI primitives, server reads, or cache
  tags are touched — the cross-cutting design-system and cache-tag rules do not
  apply to this change.
- Active spec touched: `openspec/specs/spec-review/spec.md` — one requirement
  modified ("Multi-agent orchestration"). Binding inherited constraints preserved:
  "OpenSpec change resolution" and "Optional explore-mode handoff" (both
  interactive, must stay skill-side); "Sub-agent briefs are bundled within the
  skill" (briefs still delivered by pointer, now by the workflow's agents); the
  "Consolidated report …" output contract (unchanged).
