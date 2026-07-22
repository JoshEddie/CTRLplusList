## ADDED Requirements

### Requirement: Every map SHALL pass a map-wide e2e scout before it closes

Every map SHALL be read, after its last implementation chunk closes and before the map closes, by one e2e `SCOUTING` ticket ("what e2e coverage does this map need?") — created lazily by `/port-inspection` per its requirement, born via `issue-cut.md` as an ordinary fire-at-creation scout with no UI-touching precondition: the scout itself owns the judgment of whether e2e work is needed. The scout's subagent SHALL read the per-chunk summary comments on the map's sub-issues (posted by `/landfall`, owned by `trunk-workflow`) and the landed code; a sub-issue carrying no summary comment SHALL NOT be treated as an error or as "no user-visible changes" — the scout derives that chunk's user-visible changes itself from its `issue-<N>:` commits and archived change. Findings land as the resolution comment and the ticket auto-closes with the ***unreviewed*** marker per the scouting requirement. A report recommending coverage SHALL route to an owner-approved map-wide e2e chunk cut via `issue-cut.md`; a report finding no e2e updates needed resolves the ticket with no chunk.

Mid-map e2e policy: implementation chunks SHALL make only minimal keep-green e2e edits; coverage of removed behavior SHALL be deleted with the behavior; coverage of surviving behavior SHALL NOT be deleted to get green. The closing e2e chunk owns map-wide coverage — new flows, cross-chunk journeys, and consolidating the minimal patches.

#### Scenario: Scout runs on a map with no visible UI scope
- **WHEN** the scout fires on a map whose chunks were entirely non-UI
- **THEN** it resolves "no e2e updates needed" from the accumulated one-liners and landed code, closes with the ***unreviewed*** marker, and no chunk is cut

#### Scenario: Legacy sub-issue lacks the summary comment
- **WHEN** the scout reads a map whose sub-issues predate the landfall summary comment
- **THEN** the missing comments are not read as "no user-visible changes" — the scout derives each such chunk's user-visible changes from its `issue-<N>:` commits and archived change

#### Scenario: Scout recommends coverage
- **WHEN** the fired scout's report recommends map-wide e2e coverage
- **THEN** `/port-inspection` cuts the e2e chunk via `issue-cut.md` with owner approval, and that chunk blocks `/close-map` like any open implementation chunk

#### Scenario: Chunk keeps e2e minimally green mid-map
- **WHEN** an implementation chunk breaks an existing e2e spec covering behavior that survives the change
- **THEN** the chunk patches the spec minimally to keep it green — it does not delete the coverage — and map-wide consolidation waits for the closing e2e chunk

## MODIFIED Requirements

### Requirement: SCOUTING tickets SHALL auto-resolve with unreviewed markers

A `SCOUTING` ticket SHALL fire its background subagent automatically at creation (e.g. during charting or on graduation from fog — the creation context is owned by the requirement that creates the ticket, not enumerated exhaustively here), with findings landing as the ticket's resolution comment and no scratch branches. The ticket SHALL auto-close, and its gist SHALL enter Decisions so far carrying an *unreviewed* marker until an owner-present session clears it. Downstream, `/embark`'s grilling SHALL treat unreviewed scouting decisions as suspect — re-validated with the owner, not cited as settled.

#### Scenario: Scouting fires at creation
- **WHEN** a `SCOUTING` ticket is created
- **THEN** a background subagent is spawned immediately and its findings land as the resolution comment, the ticket closes, and the map gist is marked unreviewed

#### Scenario: Unreviewed finding is re-validated at departure
- **WHEN** `/embark` proposes a chunk whose inherited map decisions include an unreviewed scouting gist
- **THEN** the grilling re-validates that decision with the owner instead of citing it as settled

### Requirement: /port-inspection SHALL own the IN PORT inspection walk

`/port-inspection [map#|issue#]` SHALL be the skill that inspects `IN PORT` cargo, invokable whenever cargo is in port — inspection never waits on the epic's frontier. Scoping: a `MAP` issue# walks that map's open `IN PORT` chunks; a chunk issue# inspects just that chunk (discriminated by the `MAP` label on the resolved issue); no argument SHALL NOT walk anything silently — the skill reads recent `issue-<N>:` commits on `dev`, resolves which of those issues are open and `IN PORT`, and recommends candidates for the owner to pick before any walk runs.

At each stop the skill SHALL surface the dependency consequence of closing: one dependents lookup per chunk (`gh api repos/{owner}/{repo}/issues/<n>/dependencies/blocking`), reporting each open dependent as "closing this unblocks #N". A failed lookup SHALL be reported, never read as "no dependents"; the surface is informational and does not gate the stop.

At each stop the skill SHALL also verify the chunk's archive commit actually landed on `origin/dev` before closing — the compensating check for landfall flipping `IN PORT` at archive rather than after push. A chunk whose `issue-<N>: archive <change>` seal commit is not present on `origin/dev` SHALL NOT be closed: the chunk stays open, the stop flags the unpushed/abandoned seal, and the skill flips the chunk's label `IN PORT` → `UNDER SAIL` to un-strand it so `/landfall` can re-run and land it. This flip-back is the sole reconciler of a stranded `IN PORT`; a failed archive-presence check SHALL be reported, never read as "archive landed".

`/port-inspection` SHALL own the map-wide e2e scout end to end: whenever a close (or any invocation's state read) finds every implementation chunk of a map closed and no e2e scout on the map, the skill creates the scout per `issue-cut.md` as an ordinary fire-at-creation `SCOUTING` ticket, and it fires per the map-wide e2e scout requirement. A recommendation for coverage routes to an owner-approved e2e chunk cut via `issue-cut.md` — creating, firing, and cutting are `/port-inspection`'s acts, never `/close-map`'s. A failed sub-issue-state read SHALL be reported, never read as "all chunks closed".

The verification surface is the **dev deployment, before the map's release cuts** — never production; a regression discovered in production after ship is a new bug ticket scoped to a patch release, not a reopened chunk. Owner confirms verified → `gh issue close <N>`; not confirmed → the chunk stays open with what's outstanding noted. Side effects are GitHub issue operations only, via `gh`; no trunk preconditions gate.

#### Scenario: Closing surfaces the unblock
- **WHEN** `/port-inspection` stops at an `IN PORT` chunk that blocks an open `CHARTED` issue
- **THEN** the stop reports "closing this unblocks #N" from the dependents lookup, and closing the chunk on the owner's confirmation makes the dependent frontier

#### Scenario: No-arg recommends before walking
- **WHEN** `/port-inspection` runs with no argument
- **THEN** it recommends inspection candidates derived from recent `issue-<N>:` commits on `dev` that sit open and `IN PORT`, and walks only what the owner picks

#### Scenario: Single-chunk inspection
- **WHEN** `/port-inspection <chunk#>` runs against one `IN PORT` chunk whose archive commit is present on `origin/dev`
- **THEN** only that chunk is inspected — verified on the dev deployment → closed, otherwise left open with the outstanding note

#### Scenario: Unpushed seal keeps the chunk open and un-strands the label
- **WHEN** `/port-inspection` stops at an `IN PORT` chunk whose `issue-<N>: archive <change>` seal commit is not on `origin/dev`
- **THEN** the chunk is not closed — the stop flags the unpushed seal and flips the chunk's label `IN PORT` → `UNDER SAIL`, clearing it for `/landfall` to re-run

#### Scenario: Last close births and fires the e2e scout
- **WHEN** an inspection stop closes the final open implementation chunk of a map that has no e2e scout
- **THEN** `/port-inspection` creates the scout per `issue-cut.md` and it fires at creation — reading the sub-issues' summary comments and landed code, posting its report, and auto-closing with the ***unreviewed*** marker

#### Scenario: Legacy map gets its scout on demand
- **WHEN** `/port-inspection` reads a map whose implementation chunks are all already closed but which predates the e2e scout
- **THEN** the same lazy path applies — the scout is created and fired then, no backfill step and no exemption

### Requirement: /close-map SHALL end the epic through inspection

`/close-map` SHALL be the inspection batch-point and the only skill that closes a map: it runs the `IN PORT` inspection walk as a thin delegation to `/port-inspection` — the walk's rules (dev-deployment verification surface, dependents surface, close-on-confirmation) live in that skill and are followed, never restated — then closes the map when — and only when — every implementation chunk is closed. A map whose last chunk is merely `IN PORT` SHALL NOT close: `IN PORT` is uninspected cargo. `/close-map` SHALL refuse to close a map still holding unstarted chunks or residual Not-yet-specified fog, pointing at `/split-map` to dispatch the leftovers. A map whose e2e scout is absent or unresolved SHALL NOT close — the skill points at `/port-inspection`, which creates and fires the scout; an open e2e scout is an explicit carve-out from the residual-tickets-are-stale rule, the one residual ticket that means work remains. Closing never creates, fires, or cuts. Landfall labels; inspection closes.

#### Scenario: In-port chunks block the close
- **WHEN** `/close-map` runs while two chunks sit `IN PORT`
- **THEN** it walks both per `/port-inspection` (closing those the owner confirms verified on the dev deployment) and closes the map only if none remain open

#### Scenario: Leftovers block the close
- **WHEN** `/close-map` runs on a map whose chunks are all closed but whose body still holds Not-yet-specified fog or an unstarted chunk
- **THEN** it refuses to close the map and points at `/split-map`

#### Scenario: Missing or unresolved e2e scout blocks the close
- **WHEN** `/close-map` runs on a map whose chunks are all closed but whose e2e scout is absent or still open
- **THEN** it refuses to close the map and points at `/port-inspection` to create/fire the scout — closing never adds tickets or fires scouts
