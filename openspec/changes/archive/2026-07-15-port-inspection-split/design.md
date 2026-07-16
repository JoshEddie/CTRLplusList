# Design: port-inspection-split

## Context

`/close-map` (`.claude/skills/close-map/SKILL.md`) currently owns both the `IN PORT` inspection walk (step 2 of its flow) and the map close (steps 3–4). The `map-workflow` spec's "/close-map SHALL end the epic through inspection" requirement covers both in one block. The `IN PORT` label description says "awaiting inspection via /close-map". Nothing surfaces that closing a chunk unblocks its dependents.

Settled by map #249 and the propose grilling: split into `/port-inspection` (walk) + `/close-map` (close, delegating); arg shape `[map#|issue#]`; no-arg recommends via recent commits; dependents surfaced per chunk.

## Goals / Non-Goals

**Goals:**

- Inspection invokable any time cargo is in port, without knowing the epic's state.
- Each inspection stop states the dependency consequence: "closing this unblocks #N".
- `/close-map` keeps end-to-end behavior via delegation; stays the only closer of maps.

**Non-Goals:**

- Prod-regression handling (unchanged: new bug ticket scoped to a patch release).
- Any change to `/landfall`'s behavior or the label machine's transitions (`IN PORT` still stamped by `/landfall`; no new label).
- `release-review` spec text (its `/close-map` mention is map-close context, still correct).

## Decisions

### D1 — Argument shape: `[map#|issue#]`, no-arg recommends

- `MAP` issue# → walk that map's open `IN PORT` chunks (same listing as `/close-map` today: sub_issues endpoint, filter open + `IN PORT`).
- Chunk issue# → inspect just that chunk.
- Discriminate by the `MAP` label on the resolved issue, not by guessing from body shape.
- No-arg → `git log` recent `dev` commits, parse `issue-<N>:` prefixes, look up which of those issues are open + `IN PORT`, resolve their parent maps, and **recommend** candidates to the owner (AskUserQuestion). The owner picks; only then does a walk run. Rationale (owner decision): recent landings are where uninspected cargo accumulates; a silent repo-wide walk was rejected in favor of a recommendation step.
- Alternative rejected: required map# (owner must already know where the cargo sits — reproduces the #247 discoverability gap).

### D2 — Dependents surface

One lookup per chunk at its stop: `gh api repos/{owner}/{repo}/issues/<n>/dependencies/blocking --jq '.[] | {number, state, title}'` (verified live: #214 → blocks #247). Open dependents are reported in the stop's question as "closing this unblocks #N — title". No dependents → nothing extra said. A failed lookup is reported, never read as "no dependents"; the stop still proceeds (the surface is informational, not a gate).

### D3 — Delegation is textual

`/close-map` states "the walk runs per `/port-inspection`'s Walk section" and follows it inline — no Skill-tool invocation, mirroring how `/anchor`'s charter move wraps `/map`'s exit mechanics. The walk section lives in exactly one skill; `/close-map` carries no copy. Drift hazard is the reason: two walk texts would diverge silently.

### D4 — `disable-model-invocation: true` on `/port-inspection`

The walk is HITL (owner verifies on the dev deployment); matches every other fleet skill. Discoverability is solved by the label description, fleet docs, and no-arg recommendation — not by model auto-invocation.

### D5 — Spec split shape

In `map-workflow`: the single "/close-map SHALL end the epic through inspection" requirement becomes two — "/port-inspection SHALL own the IN PORT inspection walk" (scoping, dependents surface, dev-deployment verification, closing on confirmation) and "/close-map SHALL close the map through delegated inspection" (delegation, leftovers refusal, only-closer, decision-ticket flagging). The gh-only side-effects requirement's skill list gains `/port-inspection`. In `trunk-workflow`: `/landfall`'s parenthetical "closing is inspection's act (`/close-map`, owned by `map-workflow`)" re-points to `/port-inspection` — wording-only delta, no scenario behavior change.

## Risks / Trade-offs

- [No-arg commit heuristic misses cargo landed long ago] → recommendation is advisory; the owner can always pass a map#/issue# directly, and `/close-map` still sweeps a whole map at close time.
- [Two skills could drift on verification rules (dev deployment, pre-cut)] → the rules live once in `/port-inspection`; `/close-map` cites, never restates.
- [`gh` label edit is a repo side effect outside the tree] → performed during apply, idempotent, matches the existing "skills stamp, setup creates" convention.

## Open Questions

(none — grilling concluded, shape owner-confirmed)
