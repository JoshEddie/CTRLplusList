# Proposal: port-inspection-split

## Why

`/close-map` welds two jobs with different cadences: inspecting `IN PORT` cargo (many times per map — and the only act that closes chunks, which is what unblocks dependents, since GitHub dependencies gate on the blocker's `state`) and closing the map (once, at the end). Only the second job is advertised by the skill's name, so the unblock path is undiscoverable — live example: #247 sat `CHARTED` blocked by #214 (`IN PORT`, code already on `dev`) with nothing pointing at the walk that would unblock it. No skill surfaces the dependency consequence of closing a chunk.

Inherited constraints (map #249, settled): the walk becomes its own skill `/port-inspection`; it surfaces "closing this unblocks #N" via one dependents lookup per chunk; `/close-map` keeps the leftovers check + map close, stays the only closer of maps, and delegates its walk; the `IN PORT` label description re-points to `/port-inspection`.

## What Changes

- New skill `.claude/skills/port-inspection/SKILL.md` — owns the `IN PORT` inspection walk. Argument `[map#|issue#]`: a `MAP` issue# walks that map's open `IN PORT` chunks; a chunk issue# inspects just that chunk; no-arg reads recent `issue-<N>:` commits on `dev`, resolves which of those issues sit `IN PORT`, and recommends the map(s)/chunk(s) to inspect — the owner picks before any walk runs. Every stop surfaces "closing this unblocks #N" by reading the chunk's dependents (`dependencies/blocking`). Verified on the dev deployment → close; not confirmed → stays open with what's outstanding noted.
- `/close-map` slims to leftovers check + map close, delegating its walk to `/port-inspection` textually (follows that skill's walk section) so one invocation still finishes a map end-to-end. It remains the **only** closer of maps. Decision-ticket staleness flagging stays in `/close-map`.
- `IN PORT` label description re-points from `/close-map` to `/port-inspection` (gh label edit).
- Fleet docs updated: CLAUDE.md fleet list, `.claude/skills/map/reference/label-machine.md`.
- `trunk-workflow` spec's stale pointer fixed: "closing is inspection's act (`/close-map`)" → `/port-inspection` (chunk closing lives in the walk now).

## Capabilities

### New Capabilities

(none — `/port-inspection` is a requirement split within `map-workflow`, not a new capability)

### Modified Capabilities

- `map-workflow`: the `/close-map` requirement splits in two — `/port-inspection` owns the inspection walk (scoping rules, dependents surface, dev-deployment verification, closing); `/close-map` keeps leftovers check + map close and delegates the walk. The gh-only side-effects requirement adds `/port-inspection` to its skill list.
- `trunk-workflow`: `/landfall`'s "closing is inspection's act" cross-reference re-points from `/close-map` to `/port-inspection`; no behavior change to landfall itself.

## Impact

- New: `.claude/skills/port-inspection/SKILL.md`
- Edited: `.claude/skills/close-map/SKILL.md`, `.claude/skills/landfall/SKILL.md` (inspection cross-reference), `.claude/skills/map/reference/label-machine.md`, `CLAUDE.md` (fleet list), `openspec/specs/map-workflow/spec.md` + `openspec/specs/trunk-workflow/spec.md` (via deltas)
- GitHub: `IN PORT` label description edit
- Out of scope: prod-regression handling (stays: new bug ticket scoped to a patch release); `release-review`'s `/close-map` mention (map-close context — still correct under delegation)
- Doc/skill-only change: no app code; test gates eligible for the doc-only exemption
