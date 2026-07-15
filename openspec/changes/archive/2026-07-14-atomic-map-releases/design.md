# Design: Atomic Map Releases

## Context

The two-layer workflow constitution splits definition (`map-workflow`) from execution (`trunk-workflow`), with `release-review` gating the cut. Milestone assignment is currently split across two writers — `/map` exit assigns chunks individually, `/landfall` assigns "the currently-open milestone" at landing — and the release gate checks milestone *membership* completeness, which is structurally blind to an issue that never got a milestone. Maps deliberately carry no milestone and may span releases, which permits half-baked prefixes of a feature to ship, lets maps balloon into standing backlogs, and defers `IN PORT` inspection indefinitely (`/close-map` has no clock).

Owner decisions settled in the propose grilling:

1. Milestone lives only on the `MAP` issue; sub-issues carry none.
2. Standalone small work wraps in a single-chunk map — uniform milestone ⇔ map invariant.
3. Verification happens on the **dev deployment before the cut** — waiting to test in production is wrong; prod breakage is a new bug ticket scoped to a patch release. (This removes any need for a cross-release inspection ratchet.)
4. Leftover scope at close time routes through `/split-map`: unstarted chunks always migrate to a successor map; residual fog migrates or demotes to `OFF THE MAP` per owner choice.

## Goals / Non-Goals

**Goals:**

- Make "half a map ships" structurally unrepresentable: a release cuts only when every map on its milestone is fully closed.
- One milestone writer (map exit), one milestone carrier (the map issue).
- Give maps a clock: release cadence forces `/close-map` inspection and flushes leftovers via `/split-map`.
- Preserve pipelining: charting/working future-milestone maps while the current release is in flight stays legal.

**Non-Goals:**

- No application code, DB, or UI changes.
- No change to the review family formats, the label set, or the escape-hatch branch workflow.
- No automated migration of pre-existing open maps/issues — one-time manual owner reconciliation.
- `/split-map` does not close maps, does not touch the tree, and is not a re-charting session — successor freshness is the re-orientation ticket's job at resume time.

## Decisions

### D1 — Milestone lives only on the MAP issue

Chunks, tickets, and every non-map issue carry no milestone. Rejected: per-chunk assignment at exit (two artifacts encode the release boundary; the accidental-omission failure stays representable) and landfall-as-sole-assigner ("currently-open milestone" binds landing time, not intent — the original bug). Single carrier makes `/release-review`'s query trivial: enumerate `MAP` issues on the milestone.

### D2 — Uniform map wrapper: small work becomes a single-chunk map

Rejected: keeping the standalone `CHARTED` path with the milestone on the issue itself — two milestone-carrier shapes means every consumer (release gate, close-map, landfall sweep) branches on shape forever. Cost accepted: two issues where one sufficed; the chart phase for small input stays one session, creating map + chunk together, and `/close-map` inspects the one chunk. Existing scenarios "small clear idea compiles without a map" flip to "compiles to a single-chunk map".

### D3 — Release gate is map closure, not milestone membership

`/release-review` dimension 1 becomes: every `MAP` issue milestoned to the target release is **closed**, and closure is only reachable through `/close-map`'s all-chunks-closed walk (existing invariant). An open map, an open chunk, or `IN PORT` (uninspected) cargo blocks the cut. Rejected: advisory finding (relies on the vigilance this change exists to remove) and auto-running `/close-map` inline (inspection is an owner walk; release-review is a read-and-report pass).

### D4 — Inspection surface is the dev deployment, pre-cut

`/close-map`'s "live deployment" is pinned to dev. Everything is verified before `dev → release` merges; production regressions are new bug tickets scoped to a third-digit patch release. Rejected: post-ship inspection with a next-release ratchet — inspecting after ship means the gate can never protect the release that actually contains the work.

### D5 — /split-map is a thin wrapper skill, not an /anchor move or /map mode

`/anchor`'s moves are lightweight label/body corrections on existing artifacts; split creates a new map, re-parents sub-issues, and rewrites two bodies — a different weight class that would give anchor two personalities. `/map` already carries three phases. Precedent: `migrate-epic` — "everything not stated here follows `/map` exactly" (guardrails, label machine, body template, write-back discipline, sub-issue endpoints). Unlike `migrate-epic` it is permanent. Governed by a new `map-workflow` requirement, not a new capability: it is definition-layer, issue-writes-only.

### D6 — Re-orientation PLOTTING ticket gates the successor

Split seeds the successor with one `PLOTTING` ticket wired blocked-by onto every migrated chunk, so migrated chunks are born `UNCHARTED` under the existing exit rule — no new label semantics. The first work session on the successor must resolve it: predecessor fully closed, inherited decision gists re-validated against shipped terrain, migrated chunk bodies still accurate, fog sharpened. This defers "predecessor landed?" verification to the only moment it is answerable (split happens mid-flight) and makes successor freshness structural rather than relying on `/embark`'s per-chunk terrain check alone. Rejected: `SCOUTING` type ("decisions still valid?" is owner judgment, not a fact).

### D7 — /landfall bookkeeping shrinks to the IN PORT label

Milestone assignment and the milestone half of the self-healing sweep are deleted; the sweep still repairs a missing `IN PORT` label. Rejected: landfall verifying chunk-milestone consistency — chunks no longer carry milestones, so there is nothing to verify.

### D8 — Chunk descoping moves the whole map

Under atomicity a single chunk cannot slip to the next release. If a milestoned map will not finish: either finish it, re-milestone the entire map (nothing landed yet), or `/split-map` at the landed boundary. Release-review reports which; the owner chooses.

## Risks / Trade-offs

- [Small-work ceremony: every one-change task now costs a map + chunk + close-map walk] → Chart phase creates both in one owner-approved step; the close walk for one chunk is one question. Accepted as the price of a uniform invariant.
- [Multi-release features lose silent decision inheritance] → Deliberate: the re-orientation ticket re-validates inherited gists ("sharpness is perishable" applied to maps). Cross-links keep the predecessor's history one click away.
- [Pre-existing maps/issues violate the new invariant (chunks with milestones, maps without)] → One-time manual owner reconciliation, listed in tasks as an owner action; skills self-heal nothing here.
- [Split mid-flight while a migrated-chunk's sibling is `UNDER SAIL`] → Split only migrates unstarted chunks; an `UNDER SAIL` or `ADRIFT` chunk pins the split until the voyage resolves via landfall or `/anchor`. Stated in the skill.
- [`gh` sub-issue re-parenting quirks] → Endpoints already live-verified on this repo during the #141 migration; commands copied verbatim from `migrate-epic`.

## Migration Plan

Docs-only landing (fast path expected). After landing: owner reconciles existing open maps — assign each map its milestone, strip milestones from sub-issues, wrap any standalone milestoned issues into single-chunk maps or close them out under the old regime. `migrate-epic` policy 7 text updated in the same change so the temporary skill doesn't reintroduce chunk milestones.

## Open Questions

None — all decisions settled with the owner in the propose grilling.
