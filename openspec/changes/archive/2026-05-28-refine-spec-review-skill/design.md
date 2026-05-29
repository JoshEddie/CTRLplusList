## Context

`spec-review` runs three review phases as parallel sub-agents (standard-review,
convention-audit, contract-audit) and consolidates their findings. Today all
three briefs live inline as sections of a single ~390-line `SKILL.md`.

Two mechanics of the Claude Code skill + Agent tooling drive this design:

1. `SKILL.md` loads into the **orchestrator's** context in full when the skill
   triggers — everything in it is carried whether or not the orchestrator acts
   on it.
2. A sub-agent spawned via the Agent tool runs in a **fresh, disjoint context**.
   It cannot see `SKILL.md` or the orchestrator's conversation; instructions
   reach it only via text embedded in the Agent `prompt` or a path it `Read`s.

The consequence: with the briefs inline, the orchestrator permanently carries
~140 lines of checklists it never executes, while its actual job (dispatch,
Phase 0, consolidation, verdict) is interleaved with three deep briefs that run
elsewhere. The skill already speces self-containment for the standard-review
dimensions; the factoring decision must preserve that guarantee for all briefs.

## Goals / Non-Goals

**Goals:**

- Place each instruction in the context that consumes it: file boundary = context
  boundary.
- Keep the orchestrator's context focused on the orchestrator's job; keep brief
  detail out of it.
- Preserve self-containment: briefs stay bundled within the skill, with no
  runtime dependency on any external skill.
- Express any cross-context shared contract exactly once (no per-brief
  duplication).
- Use the breathing room extraction creates to raise each sub-agent's output
  quality — not merely to relocate terse text.

**Non-Goals:**

- No change to the **output contract** — invocation, audited dimensions, the
  fixed report shape, verdict / clear-to-archive logic, and the explore-mode
  handoff are all preserved. (Finding *content* is expected to improve; see D5.)
- Not turning any brief into a separately invocable skill.
- Not expanding the spec: brief content quality is internal authoring, not a
  behavioral SHALL — the `spec-review` spec delta is unchanged by the expansion.
- No application-code, DB, UI, or cache-tag changes.

## Decisions

### D1 — One bundled leaf file per sub-agent brief

Split the standard-review, convention-audit, and contract-audit briefs out of
`SKILL.md` into one bundled file each under the skill directory. The split falls
on the context boundary: each file maps 1:1 to a sub-agent that consumes it in
isolation.

- **Alternative — keep inline (status quo):** rejected. The orchestrator carries
  three checklists it never executes; its job is buried. Only worthwhile if the
  briefs were trivially small — they are not (~140 lines combined).
- **Alternative — make each brief a separately invocable skill:** rejected. A
  skill is an intent-matched entry point; these are deterministic, data-fed
  internal stages. Skill args cannot carry the payload (diff + resolved change +
  archive state), the descriptions would pollute every session's skill list for
  callers that never exist, and a brief invoked out of context (e.g.
  contract-audit without Phase 0 outputs) produces garbage. It would also
  re-introduce the cross-skill runtime dependency the self-containment
  requirement exists to prevent.

### D2 — Deliver briefs by pointer, not by embedding

The orchestrator spawns each sub-agent with a prompt of the form *"Read
`<brief path>`, follow it. Diff: `<…>`  Resolved change: `<name>`  Archive
state: `<…>`"* — a path pointer plus the review inputs. The brief text lives only
in the consuming sub-agent's context.

- **Alternative — embed brief text into the prompt:** rejected. The orchestrator
  would `Read` the brief and paste it, paying the brief's tokens in its own
  context anyway — defeating the point of the split. Embedding is the fallback
  only if path stability ever becomes a concern.

### D3 — Extract each cross-context shared contract to a single source

Two things are needed by more than one context after the split; neither is
duplicated into the briefs:

- **Structured finding shape** — needed by all three agents (to produce) and the
  orchestrator (to consume). Single source lives in `SKILL.md`; the orchestrator
  stamps it inline into each agent prompt alongside the pointer. It is small, so
  inlining from one source is cheap and guarantees the agent sees it.
- **Archive-state definitions + reconciliation-latitude table** — needed by the
  contract brief (to frame findings and cap reconciliation) and the orchestrator
  (to write the verdict / clear-to-archive line). The shared *data* (state
  definitions: active / premature / merged; the git discrimination command; the
  latitude table) gets one home in `SKILL.md`; the contract brief references it.
  The differing *applications* (how to frame a finding vs. how to gate the
  verdict) stay separate — they are not identical data. The orchestrator computes
  the classification once in Phase 0 (it is a git check, and the orchestrator
  needs the state for the verdict regardless) and passes it to the contract agent
  as an input; the agent applies the latitude given the state rather than
  re-deriving it. This matches the spec scenario "passes the sub-agent … the
  archive state" and avoids the orchestrator and the agent both computing it.

- **Alternative — copy the shared contracts into each brief:** rejected (DRY;
  guaranteed drift across files).

### D4 — `SKILL.md` retains only the orchestrator's job

After the split, `SKILL.md` holds dispatch, Phase 0 (scope + change resolution),
the finding-shape contract, consolidation, and the verdict / clear-to-archive
logic — and pointers to the three briefs.

### D5 — Expand each brief for the sub-agent's budget, not port it verbatim

The authoring target inverts at extraction. Inline, a brief was written to
minimize the **orchestrator's** budget — every token was taxed on every run, paid
by the agent that does not use it. Extracted and pointer-delivered (D2), a brief's
tokens are paid once, by the one sub-agent that reads it, in an otherwise near-
empty context. The constraint is no longer length; it is the **quality of that
sub-agent's output**. So each brief is rewritten for its consumer rather than
moved verbatim.

Expansion is confined to axes that demonstrably change sub-agent output:

- **Few-shot worked findings** — one or two concrete `diff-hunk → finding`
  examples (in the exact output shape) per dimension. The strongest lever on
  output *consistency*, which consolidation depends on.
- **Calibration pairs** — paired "flag this / do NOT flag this near-miss, because
  X" examples for the categories most prone to false positives. Calibration is
  taught by example, not by rule.
- **Walked decision procedures** — a decision tree with a worked example for
  genuinely ambiguous calls. The contract brief benefits most (D12 neutral vs
  directional framing; D13 latitude application) — its logic is the most
  conditional and was the most expensive to keep terse. The Type-1 vs Type-2
  classification walk (git command + its interpretation) stays single-sourced in
  `SKILL.md` per D3: the orchestrator classifies once in Phase 0 and passes the
  state down, so the brief applies the given state rather than re-deriving it.

**Removal bar (the discipline).** The repo's comment policy — "if removing it
wouldn't confuse a reader, don't write it" — is applied to brief prose: every
added sentence must change *what the sub-agent flags* or *how it writes a
finding*, else cut it. Two hard exclusions: do not restate a shared contract
(re-breaks D3's single source), and do not add generic rationale that alters no
decision.

This is why extraction and expansion ride in **one** change: they touch different
layers. Extraction preserves the **output contract** (structural, owned by
`SKILL.md`); expansion improves the **finding content** within it (owned by the
briefs). The contract must not move; the content is meant to.

- **Alternative — extract verbatim now, expand in a later change:** rejected.
  This change is pre-implementation and unreviewed, so the cheap moment to write
  richer briefs is the same pass that creates the files; a second proposal cycle
  buys only a marginally cleaner "behavior unchanged" check, which (per the
  two-layer split) was never the real goal — finding content is *supposed* to
  change.

## Risks / Trade-offs

- **Pointer drift** (a brief path in `SKILL.md` diverges from the actual file)
  → mitigate with stable, conventionally-named paths under the skill directory
  and a validation pass after the refactor.
- **Reference drift between `SKILL.md` and a brief** (e.g. the finding-shape or
  archive-state table referenced from a brief falls out of sync) → mitigate by
  keeping each shared contract single-sourced (D3) so there is nothing to drift.
- **Sub-agent skips its `Read`** → the prompt is an explicit instruction to read
  the brief first; an agent that returns findings not in the structured shape is
  caught at consolidation.
- **Over-expansion** (a brief grows verbose enough to dilute attention and
  *degrade* adherence — more words is not more quality) → mitigate with the D5
  removal bar: every sentence must change a flag or a finding's wording, else
  cut. Expansion is for examples and decision procedures, not prose padding.

## Migration Plan

This is a refactor of skill files only; there is no runtime/data migration and
nothing to roll back at the system level.

1. Carve the three briefs out of `SKILL.md` into bundled leaf files.
2. Single-source the finding-shape contract and the archive-state
   definitions/table in `SKILL.md`; point the briefs at them.
3. Expand each brief along the D5 axes (few-shot, calibration pairs, decision
   procedures), applying the removal bar; prioritize the contract brief.
4. Rewrite the Phase-orchestration step to spawn each sub-agent with a pointer +
   inputs (D2).
5. Reduce `SKILL.md` to the orchestrator's job + pointers (D4).
6. Verify in two layers by running `/spec-review` against a known diff:
   (a) the **output contract** is unchanged — section order, finding-table
   columns, text-label severities, dispositions, verdict logic;
   (b) **finding content** is at least as good — spot-check that the expanded
   briefs did not regress findings, accepting that improved/added findings are
   the intended outcome, not a contract violation.

Rollback = revert the skill-file changes (git).

## Open Questions

_None._ The archive-state shared table stays in `SKILL.md` (referenced by the
contract brief) rather than a fourth file — it keeps the verdict logic and its
governing data co-located, and adds no new file to keep in sync.
