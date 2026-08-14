# map-workflow delta

## MODIFIED Requirements

### Requirement: Routing labels SHALL form the machine-read lifecycle, stamped by the skill that causes each transition

Routing labels SHALL be ALL CAPS and SHALL be the only labels skills route on: `OFF THE MAP` (logged, not yet charted — map's intake queue), `CHARTED` (scope settled, cleared for work — even while sequenced behind an open blocker), `UNCHARTED` (fog only: a map chunk whose scope is not settled — born gated by an open decision ticket at exit, demoted by `/anchor`, or migrated by `/split-map`; NOT a blocked marker), `UNDER SAIL` (an OpenSpec change occupies the tree), `IN PORT` (landed and sealed, awaiting inspection), `ADRIFT` (voyage interrupted with recoverable work), `MAP` (index issue), `PLOTTING` / `SCOUTING` (decision tickets). Sequencing between issues SHALL be expressed exclusively via native blocked-by relationships, never via labels: a fully-scope-settled chunk sequenced behind a predecessor chunk is `CHARTED` with blocked-by wired, and when its blocker closes it becomes frontier automatically — no label transition occurs and no skill SHALL carry a flip-on-blocker-landing duty. Each lifecycle transition SHALL be stamped by the skill that causes it: `/map` applies `CHARTED`/`UNCHARTED`, `/set-sail` applies `UNDER SAIL`, `/landfall` applies `IN PORT`, `/anchor` applies `ADRIFT`/`UNCHARTED`. Lowercase labels (`bug`, `idea`, `debt`, `hold`, …) SHALL be human triage only — no skill SHALL route on them, except that map's intake SHALL surface the findings comment of a `hold`-marked issue before recharting it. The routing labels SHALL be a repo-setup prerequisite: skills SHALL stamp them and SHALL NOT create them, so label creation is a one-time adoption step rather than a per-invocation guard, and a missing label SHALL surface as a loud `gh` failure rather than being silently repaired. `/embark` (execution layer) SHALL gate on both signals — label `CHARTED` AND zero open blockers — treating anything else as a stop, and the definition layer SHALL NOT be entered by delegation from embark's boarding check (label dispatch stops, never routes); the propose grilling's owner-confirmed epic route-out, owned by `trunk-workflow`, is the sole sanctioned entry from embark.

#### Scenario: Label case is the semantics
- **WHEN** any skill decides how to treat an issue
- **THEN** only ALL-CAPS routing labels affect the decision, and ticket kind is read from the `PLOTTING`/`SCOUTING` label, never inferred from title or body

#### Scenario: Blocker lands, no label moves
- **WHEN** a chunk sits `CHARTED` with blocked-by wired onto a predecessor chunk and that predecessor closes
- **THEN** the chunk is frontier by the dependency graph alone — its label is untouched and no `/anchor` fires

#### Scenario: Held waters surface their hold note
- **WHEN** `/map` recharts an `OFF THE MAP` issue carrying the `hold` label
- **THEN** the parked findings comment is surfaced to the owner before any charting proceeds

#### Scenario: Discovery mid-voyage is logged, not charted
- **WHEN** a session discovers out-of-scope work during implementation or review
- **THEN** it writes the richest issue body it can, labels it `OFF THE MAP` (plus any lowercase kind), and returns to its voyage without invoking map

### Requirement: Exit SHALL cut owner-approved, change-sized, sequenced chunks, tolerating wired residual fog

Exit SHALL run when the chunking is drafteable and the frontier chunk is unblocked — not only when every decision is closed. Residual open decision tickets SHALL be wired blocked-by onto the chunks they gate, and **those chunks SHALL be born `UNCHARTED`** — an open decision means the chunk's scope is not settled. Chunks merely sequenced behind other chunks SHALL be born `CHARTED` with blocked-by wired: sequencing is not fog, and no label flip is owed when the predecessor lands. Unblocked, fully-settled chunks are born `CHARTED` as before. Fog scoped to later chunks MAY persist in Not yet specified. Exit SHALL cut one release's worth of chunks and stamp the milestone **on the map issue** — chunks SHALL carry no milestone; scope beyond that release routes to a successor map or stays as fog until `/split-map` or `/close-map` dispatches it. The chunking SHALL be proposed to the owner before any issue is created; on approval, chunks are created as sub-issues of the map, sequenced with native blocked-by, bodies pre-distilled (problem, settled decisions linked from the map, constraints) and linking the map so `/embark` inherits its Decisions so far. Implementation issues SHALL be created only at exit, never incrementally during the decision phase.

#### Scenario: Exit with a residual decision
- **WHEN** chunking is drafteable but one decision needs landed code to resolve
- **THEN** exit proceeds with that ticket open and wired blocked-by onto the chunks it gates, those chunks born `UNCHARTED`, and the frontier chunk born `CHARTED`

#### Scenario: Sequenced chunk is born CHARTED
- **WHEN** exit creates a fully-scope-settled chunk whose only gate is a predecessor chunk
- **THEN** the chunk is born `CHARTED` with blocked-by wired onto the predecessor, and no relabel occurs when the predecessor lands

#### Scenario: Owner gates the chunking
- **WHEN** exit drafts the implementation split
- **THEN** no issue is created until the owner approves the chunking

#### Scenario: Milestone lands on the map, not the chunks
- **WHEN** exit creates the approved chunks
- **THEN** the map issue is assigned the target milestone and every chunk is created without one
