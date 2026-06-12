## Context

`spec-review` is a self-contained, multi-phase review skill. An earlier change
(`refine-spec-review-skill`) already extracted the three sub-agent *briefs* into
bundled files, but left the **shared contracts** (archive-state classification +
reconciliation-latitude table, finding shape, disposition definitions,
finding-table style, diagram rules) inline in `SKILL.md` as the single source the
briefs and verdict reference. The result is a ~330-line `SKILL.md` written in a
rationale-dense style.

Two mechanics from the [best-practices doc](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
frame this change:

1. **Conciseness is a per-token cost.** Only metadata is pre-loaded; once the
   orchestrator reads `SKILL.md`, every token competes with conversation history.
   "Assume Claude is already very smart" — cut anything that explains *why* a rule
   exists or restates structure, since it does not change what the model does.
2. **Progressive disclosure has a depth limit.** Detail belongs in bundled files
   loaded on demand — but "keep references one level deep," because Claude may
   only partially read a file reached through another referenced file. A
   brief→`SKILL.md` back-reference (today's archive-state pointer) is exactly the
   nesting the doc warns against.

The constraint that keeps this honest: the skill also encodes **fragile,
consistency-critical judgment** (neutral-vs-directional framing, Type-1/Type-2
reconciliation latitude). The doc's "degrees of freedom" guidance says such logic
warrants specificity. So this is a density pass, not an indiscriminate cut.

## Goals / Non-Goals

**Goals:**

- Reduce word count across `SKILL.md` and the briefs by cutting rationale,
  meta-commentary, and reassurance while preserving every instruction and all
  calibration.
- Move agent-facing shared contracts out of the orchestrator's always-loaded
  context into flat leaf reference files, one level deep from each entry point.
- Encode the durable invariants (size, progressive-disclosure depth, TOC,
  evaluations) as spec requirements so future edits cannot regress them.
- Give the sole gate a minimum evaluation set.

**Non-Goals:**

- No change to the **output contract** — section order, finding-table columns,
  severity labels, dispositions, verdict / clear-to-archive logic, the
  explore-mode handoff, and the audited dimensions are all preserved.
- Not weakening any calibration: distinctions the model would otherwise get wrong
  stay (tightened, not removed).
- Not building an evaluation *runner* (the doc notes none is built in); this ships
  scenario definitions only.
- No application-code, DB, UI, or cache-tag changes.

## Decisions

### D1 — Density pass gated by the existing removal bar

Apply the briefs' own removal bar to all prose: a sentence stays only if removing
it changes *what the model flags* or *how it writes a finding/verdict*. Cut three
recurring kinds: (a) rationale for why a rule exists ("by deferring it to here, CI
has had the whole review duration…"), (b) meta-commentary about the doc's own
structure ("It is defined once, here; the brief references this section…"), (c)
elaboration/reassurance restating a one-line rule. Keep calibration verbatim in
substance, tightened in wording.

- **Alternative — rewrite from scratch:** rejected. High risk of dropping
  load-bearing calibration; the sentence-level removal bar is safer and auditable.

### D2 — Extract shared contracts to flat leaf reference files

Move the archive-state classification (+ latitude table), finding shape,
disposition definitions, finding-table style, and diagram rules into
`reference/` leaf files. Each leaf is **terminal** (no outbound references), and
is linked **directly, one level deep** from both `SKILL.md` (for the bits the
orchestrator needs — verdict gate, report skeleton) and each brief (for the
authoring detail the agents need). `SKILL.md` retains thin orchestrator hooks
(column order, "no emoji", disposition→verdict mapping, archive-state→gate
mapping) and a pointer for the rest.

Likely split (final granularity decided in implementation):
- `reference/archive-state.md` — states, git discrimination, latitude table.
- `reference/finding-format.md` — finding shape, finding-table style, disposition
  definitions, diagram rules.

- **Alternative — one big `reference/contracts.md`:** acceptable; pick per size.
  Keep any file over 100 lines fronted by a TOC (D4).
- **Alternative — briefs reference `SKILL.md` (status quo):** rejected — it is the
  two-level nesting the doc warns against, and pins the agents to reading a large
  orchestrator file for a small table.

### D3 — Density first, then extract only what remains

Sequence the work: tighten prose first (D1), then extract whatever agent-facing
contract still sits in `SKILL.md` (D2). Rationale: under the 500-line limit,
removing tokens (density) beats relocating them (extraction); density is also
structure-neutral and lower-risk. Extraction then handles the residual
agent-facing blocks and the nesting fix, not raw size.

### D4 — Encode the invariants as testable spec requirements

The valuable, durable outcomes are testable, so spec them rather than leaving them
to erode:
- `SKILL.md` body < 500 lines (line count).
- Shared contracts in flat leaf files, one level deep from each entry point
  (no entry-point reference chains two deep; leaves have no outbound refs).
- Reference files > 100 lines carry a TOC.
- ≥ 3 bundled evaluation scenarios covering the core verdict outcomes.

These are the spec delta; the prose density itself is internal authoring (no SHALL,
consistent with the refine change's principle that brief quality is not behavioral).

### D5 — Evaluation scenarios cover the verdict outcomes that matter

Author three scenarios in the doc's JSON shape (`query` + inputs +
`expected_behavior`): a **false-complete task** (a `[x]` with no implementing work
→ contract mismatch, not clear to archive), a **merged-archive conformance
violation** (Type-2 → `Request changes`, directional framing), and a **clean PR**
(no `Fix now` → `Approve`, clear to archive). These span the three verdict axes
(contract mismatch, archive-state framing, approve path). No runner is built; the
scenarios are the source of truth for future iteration.

## Risks / Trade-offs

- **Cutting load-bearing calibration** → mitigate with D1's sentence-level removal
  bar (changes-a-flag test) rather than wholesale rewrite, and a post-pass diff
  review against the current behavior.
- **Reference granularity churn** (wrong split in D2) → mitigate by deciding split
  at implementation by file size, with the one-level-deep + leaf-terminal +
  >100-line-TOC invariants (D4) as the fixed constraints regardless of split.
- **Spec over-fitting** (encoding authoring mechanics as SHALLs) → limited to the
  four testable invariants in D4; the prose density stays non-normative.
- **Evaluations drift from behavior** → accepted; without a runner they are
  reference scenarios, not enforced gates, and are revised when behavior changes.

## Migration Plan

Skill-file change only; no runtime/data migration, nothing to roll back at the
system level.

1. Density pass over `SKILL.md` and the three briefs (D1).
2. Extract residual shared contracts to `reference/` leaf files; rewire `SKILL.md`
   and the briefs to point at them one level deep; delete the brief→`SKILL.md`
   back-reference (D2).
3. Add the `SKILL.md` contents block and the `standard-review-brief.md` TOC;
   terminology pass.
4. Author the three evaluation scenarios (D5).
5. Verify: `SKILL.md` < 500 lines; no two-deep entry-point references; output
   contract unchanged (run `/spec-review` against a known diff and diff the report
   shape); the three evaluations describe the correct expected behavior.

Rollback = revert the skill-file changes (git).

## Open Questions

_None._ Reference-file granularity (one file vs. two) is deferred to implementation
by size, bounded by the D4 invariants.
