## Why

Neither `/anchor` nor `/map` has a move for a mid-voyage discovery that belongs on an **open map** and blocks its milestone. `/anchor`'s moves are decision-state only; the mid-voyage discipline forces every discovery through a full `OFF THE MAP` → `/map` round-trip, and `/map` fed such a discovery cold would compile a wrong new single-chunk map carrying its own milestone — breaking the map ⇔ milestone invariant for work that must ship with the map already in flight.

Live evidence: voyage #214 on map #203. The correct routing was two `CHARTED` chunks on the open map (#246, #247), but the chunk-cut happened inside `/anchor`, breaching the definition layer's worked-issue-creation monopoly.

Inherited constraints from active specs (binding SHALLs this change must respect or amend):

- `map-workflow` — "No other skill SHALL create issues cleared for work"; `/map` is the one fog engine. Charter must not breach this monopoly.
- `map-workflow` — "Implementation issues SHALL be created only at exit, never incrementally during the decision phase." Charter cuts outside the original exit and must be reconciled with this clause.
- `map-workflow` — the milestone lives **only** on the `MAP` issue; no chunk carries one. A chartered chunk inherits this.
- `map-workflow` — `/split-map` is already specified as "a permanent thin wrapper over `/map`'s machinery." Charter follows this precedent for the **wrapper shape only**: `/split-map` cuts no chunks and creates nothing cleared for work, so it has never tested the monopoly or the birth-label stamper question. Charter is the first wrapper to do both, and must carry those arguments itself.
- `map-workflow` — the label machine's scenario "Discovery mid-voyage is logged, not charted" mandates the `OFF THE MAP` round-trip and directly contradicts charter.
- `trunk-workflow` — `/set-sail` SHALL "state the mid-voyage disciplines — discoveries are logged as rich `OFF THE MAP` issues without charting." This is normative spec text, not skill prose.

## What Changes

- `/anchor` gains a fourth bearing move, **charter**: a discovery inside an open map's Destination that the release cannot ship without is cut directly as a chunk of that map.
- Charter **diagnoses and triggers** in `/anchor`; the chunk-cut itself runs as a thin wrapper over `/map`'s exit mechanics — the same wrapper shape `/split-map` uses — so the worked-issue monopoly holds: exit creates the issue and decides its label, and the intake requirement is amended to name charter as its sole exception.
- Charter routing criteria: in-Destination **and** release-blocking → cut as a chunk. In-Destination nice-to-have → owner picks per discovery (fog line on the map vs `OFF THE MAP`). Outside any open map's Destination → `OFF THE MAP`, unchanged.
- A chartered chunk is born with an owner-approved distilled body, as a sub-issue of the map, with **no milestone**, `CHARTED` unless an open decision ticket gates it (then `UNCHARTED`), blocked-by wired onto anything it builds on.
- Charter fires at the **moment of discovery and the voyage continues** — it writes only GitHub issues, so an occupied tree is irrelevant. It is not a mirage and does not stop work.
- **BREAKING** (workflow contract): the blanket mid-voyage discipline "discoveries are logged as rich `OFF THE MAP` issues without charting" is rescoped to "never folded into the active change; charting onto the map runs through `/anchor`." A release-blocking in-Destination discovery now routes to charter instead of `OFF THE MAP`.
- `/map` gains an explicit append-to-open-map clause under its mechanics.
- Charter is silent on release pressure: the criteria already decide, and `/split-map` already owns the map-won't-finish case.

## Capabilities

### New Capabilities

(none — charter extends existing workflow capabilities)

### Modified Capabilities

- `map-workflow`: the exit requirement is amended so exit is **re-enterable per-discovery via charter** on an open map, reconciling the "only at exit, never incrementally during the decision phase" clause; the intake requirement's worked-issue monopoly gains a pointer naming charter as its sole exception, so the clause is not read as outlawing charter in isolation; the label machine's "Discovery mid-voyage is logged, not charted" scenario is amended to route release-blocking in-Destination discoveries to charter; `/anchor`'s bearing-moves requirement names charter as a fourth move that fires without stopping the voyage.
- `trunk-workflow`: `/set-sail`'s mid-voyage discipline is rescoped — discoveries are never folded into the active change, and charting onto an open map runs through `/anchor`.

The label machine's **stamper table is deliberately untouched**: `/map` remains the sole origin of a chunk's birth label because the charter wrapper is transparent — exit, not `/anchor`, decides `CHARTED` vs `UNCHARTED` from the chunk's blocked-by state. This is not a `/split-map` precedent: `/split-map` cuts no chunks (it re-parents existing ones) and is named a stamper for the relabelling it genuinely decides. The requirement gains a carve-out sentence scoping wrapper-transparency to **birth labels only**, so the table's existing `/anchor` and `/split-map` entries stay true.

## Impact

- `.claude/skills/anchor/SKILL.md` — the charter move (diagnose, criteria, trigger, thin wrapper over map's exit mechanics).
- `.claude/skills/map/SKILL.md` — explicit append-to-open-map clause under GitHub mechanics / Exit.
- `.claude/skills/map/reference/label-machine.md` — the birth-label wrapper-transparency carve-out (canonical mirror of the label-machine delta).
- `.claude/skills/set-sail/SKILL.md` — the rescoped discipline line.
- `CLAUDE.md` — fleet text for `/anchor`.
- `openspec/specs/map-workflow/spec.md`, `openspec/specs/trunk-workflow/spec.md` — via delta specs.

Prose, skill, and spec work only — no app code, no DB, no UI surface, no cache tags. Nautical lexicon holds.

Out of scope: mirage handling and the park/discard/patch triage; `/split-map` boundary mechanics; the `/port-inspection` sibling chunk.
