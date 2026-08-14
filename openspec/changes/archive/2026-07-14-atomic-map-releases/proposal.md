# Atomic Map Releases

## Why

Today a map's chunks are milestone-assigned individually at exit and `/landfall` assigns "the currently-open milestone" at landing — two writers, and neither can see an omission. If chunks 1–2 of a map land in a release while chunk 3 silently misses its milestone, `/release-review`'s milestone-completeness dimension passes (an unmilestoned issue is invisible to it) and the release ships a half-baked feature off `dev`. The spanning-map design also lets maps balloon — residual "someday" tickets and fog sit in a live map with no forcing function — and defers `/close-map`'s `IN PORT` inspection indefinitely. Inherited constraints: `map-workflow` currently mandates "the map SHALL carry no milestone" and a no-map path for small input; `trunk-workflow` mandates landfall's milestone bookkeeping; `release-review` mandates the milestone-completeness dimension — all three flip here.

## What Changes

- **Map atomic with respect to release**: all of a map's chunks ship in one release; a map never straddles a release boundary. **BREAKING** (workflow contract): the milestone lives **only on the `MAP` issue** — chunks and every other issue carry none.
- **Every work item lives under a map**: small input compiles to a single-chunk map instead of a standalone `CHARTED` issue. **BREAKING**: the no-map small-work path is removed; milestone ⇔ map becomes a uniform invariant.
- **`/map` exit** stamps the milestone on the map and cuts one release's worth of chunks; spillover routes to a successor map or fog per the split rules.
- **`/landfall`** drops milestone bookkeeping entirely; docking stamps the `IN PORT` label only.
- **`/close-map`** inspects against the **dev deployment before the release cuts** (production is never the verification surface; prod breakage after ship is a new bug ticket scoped to a patch release). It refuses to close a map holding unstarted chunks or residual fog, pointing at `/split-map`.
- **`/release-review`** replaces the milestone-completeness dimension with a map-closure hard check: every map milestoned to the release is fully closed (map and all chunks) at review time.
- **New skill `/split-map <map#>`** — a permanent thin wrapper over `/map`'s machinery (the `migrate-epic` pattern): inventories landed vs open chunks, creates an owner-approved successor map on the next milestone, migrates unstarted chunks (re-parent via the sub-issue endpoints) and owner-chosen residual fog, seeds the successor with one re-orientation `PLOTTING` ticket wired blocked-by onto every migrated chunk (born `UNCHARTED`), cross-links both map bodies, and never closes anything.
- `migrate-epic`'s milestone policy (policy 7) updated in passing to match.

## Capabilities

### New Capabilities

None — `/split-map` is a definition-layer bearing operation governed by `map-workflow` (new requirement there), not a new capability.

### Modified Capabilities

- `map-workflow`: map carries the milestone (was: no milestone; chunks assigned individually); small input compiles to a single-chunk map (was: standalone issue, no map); exit cuts one release's worth; `/close-map` verifies on the dev deployment pre-cut and refuses leftovers; new `/split-map` requirement.
- `trunk-workflow`: `/landfall` bookkeeping is `IN PORT` label only — no milestone assignment; state-detection/sweep language updated to match.
- `release-review`: dimension 1 becomes map closure — every map on the milestone closed with all chunks closed — replacing per-issue milestone completeness.

## Impact

- Markdown/skill files only — no application code, no DB, no UI. The two test gates may be marked skipped with rationale per the trunk rules.
- Specs: `openspec/specs/map-workflow/spec.md`, `openspec/specs/trunk-workflow/spec.md`, `openspec/specs/release-review/spec.md`.
- Skills: `.claude/skills/map/SKILL.md` (exit, small-input path), `.claude/skills/landfall/SKILL.md` (bookkeeping), `.claude/skills/release-review/SKILL.md` (dimension 1), `.claude/skills/close-map/SKILL.md` (dev-deployment verification, leftover refusal), `.claude/skills/split-map/SKILL.md` (new), `.claude/skills/migrate-epic/SKILL.md` (policy 7), `.claude/skills/map/reference/label-machine.md` (if it states milestone placement).
- Process: existing open maps/issues predating this change need a one-time manual milestone reconciliation by the owner (out of scope for the skills themselves).
