## Context

Map #270 charted this chunk (issue #277) behind anchor-restructure (#278), which landed the terrain this change builds on: `issue-cut.md` as the sole issue-birth rule-set, `/anchor` slimmed to four bearing moves in `anchor-and-run-aground`, `/port-inspection` owning compensating checks and cutting via `issue-cut.md` directly, and `/landfall` flip-at-archive with no post-push bookkeeping tail. e2e coverage today has no map-wide owner: chunks each touch slivers of flows a single e2e spec spans, and nothing at map close verifies coverage.

## Goals / Non-Goals

**Goals:**
- Every map, before it closes, gets one e2e scout that reads the whole landed map and decides whether a map-wide e2e chunk is needed.
- Give the scout a complete per-chunk record to read, at near-zero landfall cost.
- Gate map close on that decision being made.

**Non-Goals:**
- No changes to e2e tooling, Playwright config, or any test file — this is a workflow/spec change only.
- No exit-time or anchor-time scout bookkeeping — the scout has no mid-map existence to maintain.
- No new firing infrastructure — reuses the ordinary fire-at-creation scouting subagent + ***unreviewed*** auto-close mechanic.

## Decisions

### Lazy creation by /port-inspection (no exit creation, no anchor wiring)

The scout is created on demand by `/port-inspection` the moment it finds every implementation chunk of a map closed and no scout present — then fires immediately as an ordinary fire-at-creation `SCOUTING` ticket per `issue-cut.md`. Rejected: creation at map exit as a deferred scout blocked-by every chunk (the map's original shape) — it needs the deferred-birth variant, an `/anchor` duty wiring every late sub-issue as a blocker, and a legacy-map backfill/carve-out; lazy creation deletes all three — and with the map-wide scout its only would-be consumer, the deferred-birth variant is retired from `issue-cut.md` outright rather than left as dead normative surface — auto-includes late chunks (fireability is a live sub-issue read, not a wiring artifact), and gives legacy and new maps one identical path. Rejected: UI-touching precondition for creating the scout — chunks' diffs are the evidence and the scout already owns the "is e2e work needed?" judgment; a non-UI map resolves cheaply as "no e2e updates needed". Cost: no mid-map visibility of the pending e2e obligation — accepted; the close-map gate makes the obligation unskippable anyway.

### Landfall posts to its own ticket, every chunk

Bookkeeping posts one comment on the landed issue itself: a user-visible-changes summary when UI was touched, a "no user-visible changes" one-liner otherwise. The scout harvests these comments from the map's sub-issues at fire time; a sub-issue without one (legacy maps predate the comment, and non-fleet landings can miss it) is not an error — the scout derives that chunk's user-visible changes itself from its `issue-<N>:` commits and archived change. Rejected: posting to the scout ticket — under lazy creation the scout doesn't exist yet at landing time, and even without that it couples trunk-workflow to map structure. Rejected: UI-only-with-silent-skip — a missing comment becomes ambiguous (non-UI or forgotten?); always-post keeps the record complete and judgment-free at the "post or not" layer. This amends trunk-workflow's "flip the label — nothing else" clause; the comment rides the same archive swoop, so the no-post-push-tail requirement stands untouched.

### Port-inspection owns create, fire, and cut

Consistent with #278's division: port-inspection already owns compensating checks and cuts via `issue-cut.md` directly. The scout auto-closes with the ***unreviewed*** marker identical to chart-time scouts; a coverage recommendation routes to an owner-approved e2e chunk cut via `issue-cut.md` (definition-layer monopoly holds — the chunk is born through the sole birth-label rule-set), and the chunk blocks close. Rejected: leave-open-until-owner-closes — a second resolution mechanic for one scout kind, and the owner review already happens when port-inspection acts on the report. `/close-map` never creates, fires, or cuts — closing never adds tickets; it refuses and points at `/port-inspection`.

### Close-map gate

`/close-map` refuses while the map's e2e scout is absent or unresolved. The open-scout case is a carve-out from the residual-tickets-are-stale rule: that scout is the one residual ticket that means "work remains". No legacy exemption needed — an old scoutless map hits the absent case and routes through port-inspection like any other.

## Risks / Trade-offs

- [Scout noise on trivially non-UI maps] → the scout resolves "no e2e updates needed" cheaply from the accumulated one-liners; cost is one ticket per map.
- [Missing summary comments on legacy maps or non-fleet landings] → explicit scout fallback: absent comment → derive from the chunk's `issue-<N>:` commits and archived change; comments are an aid, never the sole source.
- [***unreviewed*** auto-close masking a needed chunk] → port-inspection is the mandatory reader and the close-map gate means the report is always read before close.
- [No mid-map visibility of the e2e obligation] → accepted trade of lazy creation; the gate guarantees it cannot be skipped, only not-yet-seen.
- [Line-number drift in charted spec citations] → deltas target requirement headings, not line numbers.
