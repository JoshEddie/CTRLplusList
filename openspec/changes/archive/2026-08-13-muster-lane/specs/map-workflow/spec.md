## MODIFIED Requirements

### Requirement: Routing labels SHALL form the machine-read lifecycle, stamped by the skill that causes each transition

Routing labels SHALL be ALL CAPS and SHALL be the only labels skills route on:

- `OFF THE MAP` — logged, not yet charted
- `CHARTED` — scope settled, cleared for work
- `UNCHARTED` — fog only, scope not settled; NOT a blocked marker
- `MUSTER` — coverage roll-call chunk cut by the map's e2e scout
  - plan in the ticket body, no spec delta, skips `/embark`
  - `/set-sail`'s direct-work target
  - never comes off — the lane marker rides through the voyage and into port
- `UNDER SAIL` — a voyage occupies the tree: an OpenSpec change or a MUSTER voyage
- `IN PORT` — landed and sealed, awaiting inspection
- `ADRIFT` — voyage interrupted with recoverable work
- `MAP` — index issue
- `PLOTTING` / `SCOUTING` — decision tickets

#### Scenario: Label case is the semantics
- **WHEN** any skill decides how to treat an issue
- **THEN** only ALL-CAPS routing labels affect the decision, and ticket kind is read from the `PLOTTING`/`SCOUTING` label, never inferred from title or body

#### Scenario: Sequencing is a blocked-by edge, never a label
- **WHEN** a fully-scope-settled chunk must follow a predecessor chunk
- **THEN** it is `CHARTED` with native blocked-by wired, and no label expresses the sequencing

#### Scenario: Blocker lands, no label moves
- **WHEN** a chunk sits `CHARTED` with blocked-by wired onto a predecessor chunk and that predecessor closes
- **THEN** the chunk is frontier by the dependency graph alone — its label is untouched, no `/anchor` fires, and no skill carries a flip-on-blocker-landing duty

#### Scenario: Each transition is stamped by its causing skill
- **WHEN** a lifecycle transition occurs
- **THEN** `/map` applies `CHARTED`/`UNCHARTED`, `/set-sail` applies `UNDER SAIL` (adding it, removing `CHARTED` if present), `/landfall` applies `IN PORT`, and `/run-aground` applies `ADRIFT` and the discard `UNCHARTED`

#### Scenario: Birth labels follow the cut doc regardless of the cutting skill
- **WHEN** any citing consumer of `issue-cut.md` births an issue on a map
- **THEN** `issue-cut.md`'s per-kind rules stamp the birth label — the cut doc is the sole birth-label rule-set, and no citing skill carries birth-label rules of its own

#### Scenario: Relabelling an existing chunk is stamped by the relabeller
- **WHEN** `/anchor` demotes a chunk, `/run-aground` demotes dependent chunks (its always-run Step 1) or discards one, or `/split-map` migrates one
- **THEN** that skill stamps `UNCHARTED` in its own right — the cut doc governs birth labels only

### Requirement: Every map SHALL pass a map-wide e2e scout before it closes

Every map SHALL be read, after its last implementation chunk closes and before the map closes, by one e2e `SCOUTING` ticket ("what e2e coverage does this map need?").

**Creation.** Created lazily by `/port-inspection` per its requirement, born via `issue-cut.md` as an ordinary fire-at-creation scout with no UI-touching precondition — the scout itself owns the judgment of whether e2e work is needed.

**Sources.**

- The scout's subagent SHALL read the archived `acceptance.md` of each of the map's landed voyages, newest first, as the primary source of that chunk's user-visible behavior, plus the landed code.
- Per-chunk summary comments (posted by `/landfall`, owned by `trunk-workflow`) and `issue-<N>:` commits SHALL be read as fallback only, for chunks whose archived change carries no `acceptance.md`.
- A sub-issue carrying no summary comment SHALL NOT be treated as an error or as "no user-visible changes".

**Resolution.**

- Findings land as the resolution comment and the ticket auto-closes with the ***unreviewed*** marker per the scouting requirement.
- A report recommending coverage SHALL route to an owner-approved map-wide e2e chunk cut via `issue-cut.md`, whose per-kind rule births the closing e2e chunk `MUSTER` with the coverage plan — rows plus deliberate skips — in the ticket body.
- A report finding no e2e updates needed resolves the ticket with no chunk.

**Mid-map e2e policy.**

- Implementation chunks SHALL make only minimal keep-green e2e edits.
- Coverage of removed behavior SHALL be deleted with the behavior.
- Coverage of surviving behavior SHALL NOT be deleted to get green.
- The closing e2e chunk owns map-wide coverage — new flows, cross-chunk journeys, and consolidating the minimal patches — and runs the MUSTER lane (owned by `trunk-workflow`), not the charted flow.

#### Scenario: Scout runs on a map with no visible UI scope
- **WHEN** the scout fires on a map whose chunks were entirely non-UI
- **THEN** it resolves "no e2e updates needed" from the archived acceptance flows and landed code, closes with the ***unreviewed*** marker, and no chunk is cut

#### Scenario: Legacy sub-issue lacks an archived acceptance.md
- **WHEN** the scout reads a map whose sub-issues predate the `acceptance` artifact
- **THEN** it falls back for those chunks to the `/landfall` summary comment, and — where that is also missing — derives their user-visible changes from their `issue-<N>:` commits and archived change, neither absence read as "no user-visible changes"

#### Scenario: Scout recommends coverage
- **WHEN** the fired scout's report recommends map-wide e2e coverage
- **THEN** `/port-inspection` cuts the e2e chunk via `issue-cut.md` with owner approval — born `MUSTER`, plan in the ticket body — and that chunk blocks `/close-map` like any open implementation chunk

#### Scenario: Chunk keeps e2e minimally green mid-map
- **WHEN** an implementation chunk breaks an existing e2e spec covering behavior that survives the change
- **THEN** the chunk patches the spec minimally to keep it green — it does not delete the coverage — and map-wide consolidation waits for the closing e2e chunk
