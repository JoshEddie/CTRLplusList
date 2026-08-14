## Why

e2e coverage cannot be scoped per-chunk — chunks carry slivers of routes a single e2e test spans — so maps close without anyone verifying map-wide e2e coverage (issue #277, map #270). Inherited constraints this change amends or must respect: `map-workflow` SHALLs on scouting auto-fire-at-creation, `/port-inspection`'s inspection walk, `/close-map`'s residual-tickets refusal; `trunk-workflow`'s `/landfall` bookkeeping SHALL ("flip the issue's label to `IN PORT` — nothing else") and its no-post-push-tail rule. The scout is an ordinary fire-at-creation `SCOUTING` ticket born via `issue-cut.md` — created lazily by `/port-inspection`, so exit and `/anchor` are untouched. The deferred-scout birth variant is **retired**: lazy creation was its only would-be consumer, so it leaves no live caller.

## What Changes

- `/landfall` archive-swoop bookkeeping additionally posts one summary comment **on the landed issue itself**: a user-visible-changes summary when the change touched UI, a "no user-visible changes" one-liner otherwise. No scout lookup, no post-push tail.
- `/port-inspection` owns the map-wide e2e scout end to end: when it finds every implementation chunk of a map closed and no e2e scout exists, it creates one ("what e2e coverage does this map need?") via `issue-cut.md` as an ordinary fire-at-creation `SCOUTING` ticket. The subagent reads the sub-issues' summary comments + landed code, posts its report, auto-closes with the ***unreviewed*** marker. When the report recommends coverage, port-inspection cuts the map-wide e2e chunk via `issue-cut.md` with owner approval; the chunk blocks close.
- `/close-map` gains one gate: a map whose e2e scout is absent or unresolved does not close — the skill points at `/port-inspection` (explicit carve-out from the residual-tickets-are-stale rule for an open scout). Lazy creation means legacy maps take the same path as new ones.
- Mid-map e2e policy recorded normatively: chunks make minimal keep-green edits; coverage of removed behavior is deleted with the behavior; coverage of surviving behavior is never deleted to get green; the closing e2e chunk owns map-wide coverage.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `map-workflow`: `/port-inspection` requirement gains lazy e2e-scout creation + firing + e2e-chunk cut routing via `issue-cut.md`; `/close-map` requirement gains the e2e-scout gate; map-wide e2e scout + mid-map e2e policy added as a new requirement.
- `trunk-workflow`: `/landfall` bookkeeping requirement amended — archive-swoop bookkeeping is flip `IN PORT` **plus** the self-ticket summary comment; the no-post-push-tail rule stands.
- `adjudicate-review`: two new requirements mirroring the existing clearing-verdict gate-section delete — a promotion to open `Fix now` owes a gate line, a demotion out of open `Fix now` checks off and annotates its gate line in place.
- `spec-review` + `testing-foundation`: the doc-only exemption's form — an exempt gate is **omitted** (no checklist item, omission + rationale in the section lead-in) rather than checked-with-a-skip-rationale, which would leave a permanently-unchecked item wedging `/landfall`'s all-tasks-checked gate.

## Impact

Docs/skills only — no production code, DB, or UI surface. Touches: `.claude/skills/landfall/SKILL.md`, `.claude/skills/port-inspection/SKILL.md`, `.claude/skills/close-map/SKILL.md`, `.claude/skills/map/reference/label-machine.md` (scout note), `CLAUDE.md` § Trunk workflow (if digest names the amended behaviors), mid-map policy home (`.claude/skills/set-sail/SKILL.md` or map SKILL.md), `.claude/skills/map/reference/issue-cut.md` (deferred-`SCOUTING` variant retired), `.claude/skills/adjudicate-review/SKILL.md` + `.claude/skills/spec-review/reference/finding-format.md` (adjudication gate promotion/demotion, doc-only gate omission), `openspec/config.yaml` + `CLAUDE.md` (doc-only exemption form), `openspec/specs/{map-workflow,trunk-workflow,adjudicate-review,spec-review,testing-foundation}/spec.md`. Exit and `/anchor` are untouched; `issue-cut.md`'s birth rules are untouched apart from the deferred-`SCOUTING` variant's retirement.
