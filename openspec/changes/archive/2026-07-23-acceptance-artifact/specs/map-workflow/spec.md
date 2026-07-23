# map-workflow Delta Specification

## MODIFIED Requirements

### Requirement: Every map SHALL pass a map-wide e2e scout before it closes

Every map SHALL be read, after its last implementation chunk closes and before the map closes, by one e2e `SCOUTING` ticket ("what e2e coverage does this map need?") — created lazily by `/port-inspection` per its requirement, born via `issue-cut.md` as an ordinary fire-at-creation scout with no UI-touching precondition: the scout itself owns the judgment of whether e2e work is needed. The scout's subagent SHALL read the archived `acceptance.md` of each of the map's landed voyages, newest first, as the primary source of that chunk's user-visible behavior, plus the landed code; per-chunk summary comments (posted by `/landfall`, owned by `trunk-workflow`) and `issue-<N>:` commits SHALL be read as fallback only, for chunks whose archived change carries no `acceptance.md`. A sub-issue carrying no summary comment SHALL NOT be treated as an error or as "no user-visible changes". Findings land as the resolution comment and the ticket auto-closes with the ***unreviewed*** marker per the scouting requirement. A report recommending coverage SHALL route to an owner-approved map-wide e2e chunk cut via `issue-cut.md`; a report finding no e2e updates needed resolves the ticket with no chunk.

Mid-map e2e policy: implementation chunks SHALL make only minimal keep-green e2e edits; coverage of removed behavior SHALL be deleted with the behavior; coverage of surviving behavior SHALL NOT be deleted to get green. The closing e2e chunk owns map-wide coverage — new flows, cross-chunk journeys, and consolidating the minimal patches.

#### Scenario: Scout runs on a map with no visible UI scope
- **WHEN** the scout fires on a map whose chunks were entirely non-UI
- **THEN** it resolves "no e2e updates needed" from the archived acceptance flows and landed code, closes with the ***unreviewed*** marker, and no chunk is cut

#### Scenario: Legacy sub-issue lacks an archived acceptance.md
- **WHEN** the scout reads a map whose sub-issues predate the `acceptance` artifact
- **THEN** it falls back for those chunks to the `/landfall` summary comment, and — where that is also missing — derives their user-visible changes from their `issue-<N>:` commits and archived change, neither absence read as "no user-visible changes"

#### Scenario: Scout recommends coverage
- **WHEN** the fired scout's report recommends map-wide e2e coverage
- **THEN** `/port-inspection` cuts the e2e chunk via `issue-cut.md` with owner approval, and that chunk blocks `/close-map` like any open implementation chunk

#### Scenario: Chunk keeps e2e minimally green mid-map
- **WHEN** an implementation chunk breaks an existing e2e spec covering behavior that survives the change
- **THEN** the chunk patches the spec minimally to keep it green — it does not delete the coverage — and map-wide consolidation waits for the closing e2e chunk
