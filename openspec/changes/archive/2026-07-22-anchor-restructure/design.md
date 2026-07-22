## Context

`/anchor` currently owns five moves and its SKILL.md hedges on which applies at every invocation. The mechanics those moves depend on (issue birth, map-body editing, demotion) live inside `/map`'s SKILL.md narrative, reachable by other skills only through "thin wrapper" framings that `map-workflow`'s spec has to carve out in four places. Triage — the one move that touches the working tree — forces the definition layer's guardrails requirement to carry a park exception. Issue #275 settled the decomposition; issue #278 charted the exhaustive consumer sweep. #277 (port-inspection's e2e cut) consumes the extracted mechanics next — this change must leave `issue-cut.md` consumable by a skill that is not `/map` or `/anchor`.

## Goals / Non-Goals

**Goals:**
- Mechanics extracted into three map-owned reference docs, followed by citation (label-machine model), judgment staying with each caller.
- `/anchor` slim: dispatch table + four map-side moves, pure GitHub-writes.
- `/run-aground` owns the mid-voyage mirage response end to end: demotion, blast-radius call, tree exception, resume.
- Spec contract relocated: new `anchor-and-run-aground` capability; `map-workflow` sheds the bearing-moves requirement, park exception, and thin-wrapper carve-outs.

**Non-Goals:**
- `/port-inspection`'s consumption of `issue-cut.md` for the e2e cut (#277's scope — this change only keeps its cross-references valid).
- Any change to `/embark`, `/close-map`, `/landfall`, `/adjudicate-review` (verified no stale citations at terrain check, 2026-07-21).
- Changing who closes maps or the production-regression policy (map #270 out-of-scope).

## Decisions

### One combined spec: `anchor-and-run-aground`

Owner-settled during the propose grilling. Alternatives considered: per-skill specs (`anchor` + `run-aground`, review-family precedent) — rejected because the two skills overlap heavily (run-aground's first step executes anchor's demotion doc; both stamp `UNCHARTED`); keeping requirements inside `map-workflow`/`trunk-workflow` (original issue shape) — rejected because anchor's contract deserves its own home rather than staying buried in a 283-line workflow spec. The layer seam stays visible inside the one spec as separate requirements: anchor requirements are definition-layer (GitHub-writes-only, no exception), run-aground requirements are execution-layer (owns the tree exception).

### `map-workflow` guardrails drop `/anchor` from their skill list

With anchor's contract in the new spec, keeping it in `map-workflow`'s guardrails requirement would duplicate the GitHub-writes-only rule in two normative homes. Single-source: the new spec carries anchor's guardrail; `map-workflow`'s guardrails requirement covers `/map`, `/port-inspection`, `/close-map`, `/split-map` and loses the park exception entirely — those skills become pure GitHub-writes with no carve-out.

### Reference docs are mechanics-only, never invocable

The seam principle from #275: `issue-cut.md`, `map-body.md`, `demotion.md` hold procedures; every judgment call (exit drafts a release's worth, charter keeps its conjunctive diagnosis, promote keeps its precision test) stays in the citing skill. This is the same model as `reference/label-machine.md` — cited, not run. Alternative (a shared invocable sub-skill) rejected: skills-calling-skills adds dispatch complexity and the docs would still need per-caller judgment framing.

### `issue-cut.md`, not `cut.md`

Owner-picked. "Cut" is live fleet vocabulary for chunk creation, but `/split-map` also "cuts a map at the landed boundary" — qualifying as *issue*-cut keeps the established verb while avoiding the collision. `map-body.md` and `demotion.md` follow label-machine's plain-noun style.

### Deferred-`SCOUTING` variant lives in `issue-cut.md` and `map-workflow`'s scouting requirement

The variant (created unfired; fires when all blockers close) contradicts the current "fires at creation" SHALL, so the scouting requirement is modified here rather than left for #277 — #277 then consumes it (port-inspection fires the deferred scout) without touching the birth rules. Firing responsibility is out of this change's scope; the variant's birth is in.

### `/run-aground` is the dark mirror of `/landfall`

Same layer, same disciplines (state-driven where applicable, stage-never-sign, never `git commit`, paste-ready messages), opposite direction: landfall seals a finished voyage, run-aground resolves a broken one. It owns the whole mirage path: executes `demotion.md` first (the map-side truth update — a mirage is real regardless of blast radius), then puts the blast-radius call to the owner via AskUserQuestion. The resume path (merge `adrift/issue-<N>` back into dev, relabel `UNDER SAIL`) lives in run-aground's SKILL.md too — one home for the `ADRIFT` lifecycle.

### Label stamping: `map-workflow` keeps the stamper scenario, reassigned

The routing-label machine stays `map-workflow`'s (and `label-machine.md`'s) home. Its stamper scenario is modified to name `/run-aground` for `ADRIFT` and discard-`UNCHARTED`; the transparent-wrapper paragraph in `label-machine.md` is replaced by the cut-doc rule: whichever skill runs `issue-cut.md`'s mechanics, exit's rules stamp the birth label.

## Risks / Trade-offs

- [Doc/skill drift: three new reference docs create more citation edges that can rot] → The citation sweep in #278 was exhaustive at plotting and re-verified at embark; spec scenarios pin each consumer's citation target, so a stale edge is a spec violation, not silent drift.
- [Combined spec blurs the definition/execution seam] → Requirements are explicitly layered: anchor requirements state GitHub-writes-only with no exception; run-aground requirements own the tree exception. A future need to split the spec is a rename-level change.
- [`/run-aground`'s park stages a WIP commit — a session could sign it] → The skill inherits the fleet-wide stage-never-sign rule verbatim and states it; `UNDER SAIL` never survives a park, so a half-parked state is visible on the board.
- [#277 lands on `issue-cut.md` before it stabilizes] → #277 is blocked-by #278 on the board; the deferred-variant birth rules land here so #277 only adds a consumer.

## Migration Plan

Doc-only change on `dev` — no deploy or rollback concerns. Ordering inside the change: write reference docs first, then rewrite the citing skills, then the spec deltas — so every citation target exists when its citer is edited. `openspec/specs/` deltas apply at archive time as usual.

## Open Questions

None — all decisions owner-settled in the propose grilling (spec architecture, spec id, doc names) or inherited from #275/#270.
