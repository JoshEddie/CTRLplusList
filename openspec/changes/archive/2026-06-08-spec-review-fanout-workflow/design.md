## Context

`spec-review` today runs as a single orchestrator that: (Phase 0) acquires the
diff, resolves the related OpenSpec change — interactively via `AskUserQuestion`
when ambiguous — and classifies archive state; then spawns three review phases
(standard / convention / contract) as **parallel Agent-tool calls**; then reads
CI, consolidates findings into a fixed-shape report, computes the
verdict / clear-to-archive line, and offers an interactive explore handoff.

Two mechanics of the tooling drive this design:

1. **The Agent tool returns free text.** There is no enforced return shape, so the
   current skill stamps a "finding shape" into each prompt and relies on the agent
   to comply; consolidation then parses prose. The `Workflow` tool's
   `agent(..., { schema })` forces a validated structured-output call — the model
   retries until the shape matches. This format guarantee is the change's point.
2. **A `Workflow` runs in the background and cannot prompt the user.** Its
   `agent()` calls cannot invoke `AskUserQuestion`. So any interactive step is
   ineligible to move into the workflow.

The change is therefore a **hybrid**: only the already-resolved, non-interactive
fan-out is delegated; everything interactive or judgment-bearing stays in the
skill. The workflow guarantees finding *format*, not finding *correctness* —
correctness is the job of the human reading the advisory report and of the
post-review explore step.

## Goals / Non-Goals

**Goals:**

- Delegate the three-phase review fan-out to a bundled `Workflow` the skill
  invokes, with parallel execution and skill-side consolidation preserved.
- Enforce the existing finding shape at origin via schema-validated structured
  output, removing format drift at consolidation.
- Keep every interactive and judgment step (Phase 0 resolution, CI read, verdict,
  explore handoff) in the skill; pass the workflow only resolved inputs and
  receive findings back.

**Non-Goals:**

- No change to the **output contract** — invocation, audited dimensions, the
  fixed report shape, verdict / clear-to-archive logic, and the explore-mode
  handoff are preserved.
- **No correctness verification of findings.** The workflow does not refute,
  re-judge, or filter findings for being right or wrong — that is over-scope and
  redundant with the explore step. It only guarantees their *shape*.
- Not moving Phase 0, CI read, consolidation, the verdict, or the handoff into
  the workflow (they are interactive or are the orchestrator's judgment).
- No application-code, DB, UI, or cache-tag changes.

## Decisions

### D1 — Delegate only the fan-out to a workflow; keep the skill as orchestrator

The skill remains the entry point and orchestrator. Its Phase-orchestration step
is rewritten from "spawn three Agent-tool calls in one message" to "invoke the
bundled workflow with resolved inputs and await its findings." The skill
instructing this call is a valid `Workflow` opt-in (one of the tool's named
opt-in forms is "the user invoked a skill whose instructions tell you to call
Workflow"), so no separate user opt-in is needed per run.

- **Alternative — full conversion (whole skill becomes a workflow):** rejected.
  Phase 0's `AskUserQuestion` resolution and the explore handoff are interactive;
  a background workflow cannot prompt the user. The verdict / archive-gate logic
  is nuanced single-threaded judgment that does not belong in a JS control-flow
  script.
- **Alternative — status quo (inline parallel Agent calls):** the Agent tool
  cannot enforce a finding schema, so consolidation keeps parsing prose and format
  drift persists. The workflow's schema enforcement is the reason to convert.

### D2 — The hybrid boundary

```
SKILL (interactive · judgment)                    WORKFLOW (background · deterministic)
┌─────────────────────────────────────┐
│ Phase 0: acquire diff · resolve      │
│   change (AskUserQuestion) · classify│
│   archive state                      │
└──────────────┬──────────────────────┘
               │ Workflow(args:{ diffCmd, changeName,    ┌──────────────────────────────┐
               │   archiveState, briefs })               │ Audit (parallel):            │
               ├────────────────────────────────────────▶│   standard ─┐                │
               │                                          │   convention┼ schema'd       │
               │                                          │   contract ─┘ findings       │
               │  ◀── { findings, deferredToCI } ─────────┤                              │
┌──────────────┴──────────────────────┐                  └──────────────────────────────┘
│ read CI · consolidate · verdict /    │
│ archive gate · explore handoff       │
└──────────────────────────────────────┘
```

**Crosses into the workflow (via `args`):** `diffCmd` (the command that produces
the diff — each agent runs it, so the raw diff is not carried as a giant `args`
string), `changeName`, `archiveState`, and the three bundled brief paths.
**Returns:** `{ findings, deferredToCI }` — a flat findings array (each conforming
to the finding schema) plus any tasks the contract agent flags as deferred-to-CI.

### D3 — Schema-enforced findings

The finding shape (location, description, severity, citation, disposition, plus a
`phase` tag) is passed as `agent(..., { schema })`. The phase agent cannot return
a malformed finding; consolidation consumes validated objects instead of parsing
prose. The shape itself is unchanged — this is the same contract the skill
single-sources today, now machine-enforced.

### D4 — Parallel fan-out, no extra stages

The three audit agents run as a single `parallel` fan-out; the workflow flattens
their schema'd findings and returns them. There is no second stage — no
verification, judging, or filtering of findings inside the workflow. Findings are
advisory output for the report; their correctness is adjudicated by the human and,
on demand, by the post-review explore handoff.

- **Alternative — add an adversarial verification stage** (skeptic agents
  refuting each finding before inclusion): rejected. It roughly doubles token cost,
  scales as `findings × votes` (a findings-heavy PR could exceed 1M tokens), and
  duplicates the explore step, which already investigates findings — targeted and
  user-gated rather than blanket and up-front.

### D5 — Why a workflow rather than inline Agent calls

The remaining justification, with verification off the table, is narrow but real:

1. **Schema enforcement** (D3) — the Agent tool has no structured-output mode; the
   workflow is the only way to *guarantee* finding format rather than hope for it.
2. **Context isolation** — the raw per-agent findings are assembled inside the
   workflow; only the consolidated set crosses back, instead of three agents' raw
   output flowing through the orchestrator's context.

If neither mattered, the inline parallel Agent fan-out would be the simpler choice;
the schema guarantee is what tips it.

## Risks / Trade-offs

- **Second artifact to maintain** (a workflow script beside `SKILL.md`) →
  accepted for the schema guarantee; the three brief files are untouched, limiting
  the blast radius.
- **`args` serialization** (the tool input may arrive as a JSON string rather than
  an object) → the workflow normalizes `args` (parses if a string) and guards for
  missing brief paths with a clear error.
- **Workflow opt-in / cost** → bounded fan-out (3 audit agents, 2 when the contract
  phase is skipped); no per-finding agent multiplication.
- **Loss of the conversational gate feel** → mitigated by keeping all user-facing
  narration (the report, verdict, handoff) in the skill; the workflow surfaces only
  progress and returns data.

## Migration Plan

Skill-file change only; no runtime/data migration, nothing to roll back at the
system level.

1. Define the finding JSON Schema (single-sourced from the existing finding shape)
   and a bundled workflow script under `.claude/skills/spec-review/`.
2. Workflow body: a `parallel` fan-out running the three phase agents (each reads
   its bundled brief by pointer, returns schema'd findings), flattened to
   `{ findings, deferredToCI }`.
3. Rewrite the skill's Phase-orchestration step to invoke the workflow with the
   resolved inputs (D2) and consume its returned findings, replacing the inline
   Agent-tool fan-out. Leave Phase 0, CI read, consolidation, verdict, and handoff
   untouched.
4. Verify by running `/spec-review` against a known diff: the output contract is
   unchanged (section order, finding-table columns, severities, dispositions,
   verdict logic), and findings come back as validated objects.

Rollback = revert the skill-file changes (git).

## Open Questions

_None._
