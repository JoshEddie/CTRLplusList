# map-workflow Delta

## RENAMED Requirements

- FROM: `### Requirement: Chart SHALL seed from an aborted embark grilling with a re-validation sweep`
- TO: `### Requirement: Chart SHALL seed from an aborted departure with a re-validation sweep`

## MODIFIED Requirements

### Requirement: Routing labels SHALL form the machine-read lifecycle, stamped by the skill that causes each transition

Routing labels SHALL be ALL CAPS and SHALL be the only labels skills route on:

- `OFF THE MAP` — logged, not yet charted
- `CHARTED` — scope settled, cleared for work
- `UNCHARTED` — fog only, scope not settled; NOT a blocked marker
- `MUSTER` — coverage roll-call chunk cut by the map's e2e scout
  - plan in the ticket body, no spec delta, skips the departure arc's planning members
  - `/embark-apply`'s direct-work target
  - never comes off — the lane marker rides through the voyage and into port
- `UNDER SAIL` — a voyage occupies the tree: an OpenSpec change or a MUSTER voyage
- `IN PORT` — landed and sealed, awaiting inspection
- `ADRIFT` — voyage interrupted with recoverable work
- `MAP` — index issue
- `PLOTTING` / `SCOUTING` — decision tickets

The execution side of the machine SHALL be stamped by exactly one member of the departure arc: `/embark-apply`. The planning members — `/embark-start`, `/embark-design`, `/embark-qualify`, `/embark-write-tasks` — SHALL flip no label, because planning artifacts are tree state recorded by the change directory.

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
- **THEN** `/map` applies `CHARTED`/`UNCHARTED`, `/embark-apply` applies `UNDER SAIL` (adding it, removing `CHARTED` if present), `/landfall` applies `IN PORT`, and `/run-aground` applies `ADRIFT` and the discard `UNCHARTED`

#### Scenario: The planning members stamp nothing
- **WHEN** `/embark-start` boards an issue and the arc runs through to `/embark-write-tasks`
- **THEN** the issue's labels are untouched until `/embark-apply` stamps `UNDER SAIL` — the arc's four planning members are not in the label machine

#### Scenario: Birth labels follow the cut doc regardless of the cutting skill
- **WHEN** any citing consumer of `issue-cut.md` births an issue on a map
- **THEN** `issue-cut.md`'s per-kind rules stamp the birth label — the cut doc is the sole birth-label rule-set, and no citing skill carries birth-label rules of its own

#### Scenario: Relabelling an existing chunk is stamped by the relabeller
- **WHEN** `/anchor` demotes a chunk, `/run-aground` demotes dependent chunks (its always-run Step 1) or discards one, or `/split-map` migrates one
- **THEN** that skill stamps `UNCHARTED` in its own right — the cut doc governs birth labels only

#### Scenario: Lowercase labels are human triage only
- **WHEN** an issue carries `bug`, `idea`, `debt`, `hold`, or any other lowercase label
- **THEN** no skill routes on it

#### Scenario: Held waters surface their hold note
- **WHEN** `/map` recharts an `OFF THE MAP` issue carrying the `hold` label
- **THEN** the parked findings comment is surfaced to the owner before any charting proceeds

#### Scenario: Missing routing label fails loudly
- **WHEN** a skill stamps a routing label that does not exist in the repo
- **THEN** the `gh` call fails loudly — skills stamp labels and never create them, label creation being a one-time adoption step

#### Scenario: Embark gates on both signals
- **WHEN** `/embark-start` boards an issue
- **THEN** it proceeds only on label `CHARTED` AND zero open blockers, and stops on anything else

#### Scenario: Boarding check never delegates into the definition layer
- **WHEN** `/embark-start`'s label dispatch rejects an issue
- **THEN** it stops rather than routing into `/map`; the owner-confirmed epic route-out — reachable from `/embark-start`'s terrain check or `/embark-design`'s grilling, both owned by `trunk-workflow` — is the sole sanctioned entry from the departure arc

#### Scenario: Discovery mid-voyage is logged, not folded
- **WHEN** a session discovers out-of-scope work during implementation or review that sits outside every open map's Destination
- **THEN** it writes the richest issue body it can, labels it `OFF THE MAP` (plus any lowercase kind), and returns to its voyage without invoking map

#### Scenario: Release-blocking discovery is chartered onto its open map
- **WHEN** a session discovers work that sits inside an open map's Destination and that map's release cannot ship without it
- **THEN** the discovery is chartered onto that map via `/anchor` rather than logged `OFF THE MAP`, and the chunk's birth label is stamped per `issue-cut.md`, not by `/anchor`'s own judgment

### Requirement: SCOUTING tickets SHALL auto-resolve with unreviewed markers

A `SCOUTING` ticket SHALL fire its background subagent automatically at creation (e.g. during charting or on graduation from fog — the creation context is owned by the requirement that creates the ticket, not enumerated exhaustively here), with findings landing as the ticket's resolution comment and no scratch branches. The ticket SHALL auto-close, and its gist SHALL enter Decisions so far carrying an *unreviewed* marker until an owner-present session clears it. Downstream, `/embark-design`'s grilling SHALL treat unreviewed scouting decisions as suspect — re-validated with the owner, not cited as settled. `/embark-start` drafts the proposal before that interview runs, so an unreviewed gist it inherits SHALL be carried as provisional and SHALL NOT be recorded as settled.

#### Scenario: Scouting fires at creation
- **WHEN** a `SCOUTING` ticket is created
- **THEN** a background subagent is spawned immediately and its findings land as the resolution comment, the ticket closes, and the map gist is marked unreviewed

#### Scenario: Unreviewed finding is re-validated at departure
- **WHEN** `/embark-design` grills a change whose inherited map decisions include an unreviewed scouting gist
- **THEN** the grilling re-validates that decision with the owner instead of citing it as settled

#### Scenario: The proposal carries an unreviewed gist as provisional
- **WHEN** `/embark-start` drafts a proposal for a chunk whose map decisions include an unreviewed scouting gist
- **THEN** the proposal marks it provisional rather than settled — the interview that clears it has not run yet

### Requirement: Exit SHALL cut owner-approved, change-sized, sequenced chunks, tolerating wired residual fog

Exit SHALL run when the chunking is drafteable and the frontier chunk is unblocked — not only when every decision is closed — and SHALL be re-enterable per-discovery on an open map via `/anchor`'s charter move. Exit's issue-creation mechanics SHALL follow `issue-cut.md`; exit keeps the judgment (drafting the split, sizing to one release, sequencing).

#### Scenario: Exit with a residual decision
- **WHEN** chunking is drafteable but one decision needs landed code to resolve
- **THEN** exit proceeds with that ticket open and wired blocked-by onto the chunks it gates, those chunks born `UNCHARTED`, and the frontier chunk born `CHARTED`

#### Scenario: Sequenced chunk is born CHARTED
- **WHEN** exit creates a fully-scope-settled chunk whose only gate is a predecessor chunk
- **THEN** the chunk is born `CHARTED` with blocked-by wired onto the predecessor, and no relabel occurs when the predecessor lands

#### Scenario: Owner gates the chunking
- **WHEN** exit drafts the implementation split
- **THEN** no issue is created until the owner approves the chunking

#### Scenario: Approved chunks are born ready to embark
- **WHEN** the owner approves the chunking
- **THEN** chunks are created as sub-issues of the map, sequenced with native blocked-by, with bodies pre-distilled (problem, settled decisions linked from the map, constraints) and linking the map so `/embark-start` inherits its Decisions so far

#### Scenario: Exit cuts one release's worth
- **WHEN** exit cuts chunks
- **THEN** it cuts one release's worth and stamps the milestone on the map issue with chunks carrying none; scope beyond that release routes to a successor map or stays as fog until `/split-map` or `/close-map` dispatches it, and fog scoped to later chunks may persist in Not yet specified

#### Scenario: Decision phase still bars incremental chunks
- **WHEN** a map work session resolving a plotting ticket identifies a slice of the build before exit has run
- **THEN** no implementation issue is created — charter applies only to an open map whose exit has already run

#### Scenario: Charter re-enters exit on an open map
- **WHEN** a session discovers that cargo landed under an open map is broken and that map's release cannot ship without the fix
- **THEN** `/anchor`'s charter move cuts it as an owner-approved sub-issue chunk of that map per `issue-cut.md`, born `CHARTED` with no milestone and blocked-by wired onto what it builds on

#### Scenario: Chartered chunk gated by an open decision is born UNCHARTED
- **WHEN** a chartered chunk is gated by an open decision ticket
- **THEN** it is born `UNCHARTED` with blocked-by wired, by the same `issue-cut.md` mechanics as any other chunk

#### Scenario: In-Destination nice-to-have is put to the owner
- **WHEN** a discovery sits inside an open map's Destination but the release can ship without it
- **THEN** the owner chooses per discovery between a fog line on the map and an `OFF THE MAP` issue, and no chunk is cut

#### Scenario: Out-of-Destination discovery is logged
- **WHEN** a discovery sits outside every open map's Destination
- **THEN** it is logged `OFF THE MAP` and no chunk is cut

#### Scenario: Charter is silent on release pressure
- **WHEN** a chartered chunk would push the map past what its release can finish
- **THEN** the charter criteria alone decide, no scope warning is owed, and the overrun remains `/split-map`'s case

### Requirement: Chart SHALL seed from an aborted departure with a re-validation sweep

When the departure arc routes out as epic-sized (the gate-side behavior is owned by `trunk-workflow`), `/map`'s chart phase SHALL run in the same conversation and SHALL treat everything the aborted session established as candidates, not decisions: chart opens with a re-validation sweep in which each prior answer is either confirmed into Decisions so far as a plain unlinked gist line (no ticket — an answer that never waited never earns one) or demoted to fog or a ticket, because answers given under a one-change framing may not survive the epic reframing.

The route-out is reachable from two members, and the sweep's input differs by which:

- **From `/embark-start`'s terrain check** — no interview has run, so the sweep's input is the issue body and the map decisions the terrain check surfaced. No change directory exists.
- **From `/embark-design`'s grilling** — the sweep's input is the grilling's answers plus the drafted `proposal.md`, which SHALL itself be treated as a candidate rather than a settled framing.

#### Scenario: Prior answer survives reframing
- **WHEN** the re-validation sweep confirms an answer given before the epic realization still holds
- **THEN** it enters Decisions so far as an unlinked gist line and is not re-asked

#### Scenario: Prior answer turns foggy
- **WHEN** the epic reframing makes a previously clear answer suspect
- **THEN** the sweep demotes it to Not yet specified or a fresh ticket instead of carrying it forward

#### Scenario: Route-out before any interview has a thinner sweep
- **WHEN** `/embark-start`'s terrain check routes the issue out as epic-sized
- **THEN** chart's sweep re-validates the issue body and surfaced map decisions — there are no interview answers to carry, and no change directory to discard

#### Scenario: A drafted proposal is a candidate, not a framing
- **WHEN** `/embark-design`'s grilling routes out as epic-sized against an existing `proposal.md`
- **THEN** the sweep treats that proposal's positions as candidates alongside the interview answers rather than as the map's settled scope
