## MODIFIED Requirements

### Requirement: /map SHALL be the mandatory intake for all work definition, scaled to demand

`/map` SHALL compile plain text or an existing GitHub issue toward ready-to-work issues through three phases — **chart**, **work**, **exit** — and SHALL be the only origin of issues cleared for work.

#### Scenario: Small clear idea compiles to a single-chunk map
- **WHEN** charting finds no fog and the idea is sized for one OpenSpec change
- **THEN** `/map` creates a `MAP` index with exactly one distilled `CHARTED` chunk as its sub-issue in the same session, and creates no decision tickets

#### Scenario: Giant but clear idea skips the decision phase
- **WHEN** charting finds no fog but the work exceeds one OpenSpec change
- **THEN** the map is created purely as the epic index and the invocation proceeds straight to the exit phase

#### Scenario: Foggy epic charts a map
- **WHEN** charting surfaces decisions that must wait for later sessions
- **THEN** a `MAP`-labeled index issue is created with typed tickets as sub-issues, scouting subagents fire in parallel, and the invocation stops without hand-resolving plotting tickets

#### Scenario: Every work item lives under a map
- **WHEN** any skill other than `/map` — or `/anchor`'s charter move and `/split-map`, which are thin wrappers over `/map`'s exit mechanics — would create an issue cleared for work
- **THEN** it does not, and the retired explore route is not used

#### Scenario: Owner approves every body map emits
- **WHEN** `/map` is about to create or edit any issue
- **THEN** the body is a distilled, complete, current statement of what to build, and the owner has approved it first

#### Scenario: Prompt issue is consumed, not converted
- **WHEN** `/map` was invoked on an existing GitHub issue and has created the map
- **THEN** the prompt issue is closed with a pointer comment to what map created

#### Scenario: Inline answer never becomes a ticket
- **WHEN** a question raised during charting is answered in the same session
- **THEN** no ticket is created — persistence materializes only for state that must outlive the session

#### Scenario: Map never plans the build
- **WHEN** a ticket is created under a map
- **THEN** it resolves a decision, never a slice of the build, and nothing is implemented from the map

### Requirement: Routing labels SHALL form the machine-read lifecycle, stamped by the skill that causes each transition

Routing labels SHALL be ALL CAPS and SHALL be the only labels skills route on: `OFF THE MAP` (logged, not yet charted), `CHARTED` (scope settled, cleared for work), `UNCHARTED` (fog only — scope not settled; NOT a blocked marker), `UNDER SAIL` (an OpenSpec change occupies the tree), `IN PORT` (landed and sealed, awaiting inspection), `ADRIFT` (voyage interrupted with recoverable work), `MAP` (index issue), `PLOTTING` / `SCOUTING` (decision tickets).

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
- **THEN** `/map` applies `CHARTED`/`UNCHARTED`, `/set-sail` applies `UNDER SAIL`, `/landfall` applies `IN PORT`, and `/anchor` applies `ADRIFT`/`UNCHARTED`

#### Scenario: Exit stamps a chartered chunk's birth label
- **WHEN** `/anchor`'s charter move cuts a chunk as a thin wrapper over `/map`'s exit mechanics
- **THEN** exit is the stamper of that chunk's birth label — `/map` remains the sole origin of birth labels, and the wrapper is transparent

#### Scenario: Relabelling an existing chunk is stamped by the relabeller
- **WHEN** `/anchor` demotes or discards a chunk, or `/split-map` migrates one
- **THEN** that skill stamps `UNCHARTED` in its own right — the wrapper carve-out does not apply

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
- **WHEN** `/embark` boards an issue
- **THEN** it proceeds only on label `CHARTED` AND zero open blockers, and stops on anything else

#### Scenario: Boarding check never delegates into the definition layer
- **WHEN** `/embark`'s label dispatch rejects an issue
- **THEN** it stops rather than routing into `/map`; the propose grilling's owner-confirmed epic route-out, owned by `trunk-workflow`, is the sole sanctioned entry from embark

#### Scenario: Discovery mid-voyage is logged, not folded
- **WHEN** a session discovers out-of-scope work during implementation or review that sits outside every open map's Destination
- **THEN** it writes the richest issue body it can, labels it `OFF THE MAP` (plus any lowercase kind), and returns to its voyage without invoking map

#### Scenario: Release-blocking discovery is chartered onto its open map
- **WHEN** a session discovers work that sits inside an open map's Destination and that map's release cannot ship without it
- **THEN** the discovery is chartered onto that map via `/anchor` rather than logged `OFF THE MAP`, and the chunk's birth label is stamped by exit's mechanics, not by `/anchor`

### Requirement: /anchor SHALL own all bearing moves, including mid-voyage triage

Decision state SHALL be bidirectional for the epic's whole life, and every bearing move — promote, demote, charter, map-body re-sync, mid-voyage triage — SHALL be executed via `/anchor`.

#### Scenario: Promote turns fog into a ticket
- **WHEN** `/anchor` promotes a fog line
- **THEN** the question is stated precisely, the ticket is created, blocked-by is wired onto every chunk it gates, and scouting subagents fire as always

#### Scenario: Demote reopens the original ticket
- **WHEN** a settled decision is revealed as a mirage
- **THEN** the **original** ticket is reopened (never a superseding one), the invalidation evidence is posted as a comment, the gist line moves back to Not yet specified marked *reopened*, and affected chunks flip `CHARTED` → `UNCHARTED`

#### Scenario: Anchor re-syncs the map body
- **WHEN** the map body has drifted from ticket reality
- **THEN** `/anchor` re-syncs it

#### Scenario: Anchoring is opportunistic, never a duty
- **WHEN** any session discovers a bearing move is needed
- **THEN** it may anchor at that moment, and no session carries a proactive detection duty

#### Scenario: Mirage patchable at sea
- **WHEN** a mid-apply session discovers a settled decision is wrong but the chunk's destination stands
- **THEN** anchor demotes the decision on the map and the change is amended in place, staying `UNDER SAIL`

#### Scenario: Voyage parked adrift
- **WHEN** the mirage invalidates the chunk's premise but the work is worth keeping
- **THEN** the work is staged as one WIP commit on `adrift/issue-<N>` for the owner's signature, the tree comes back clean, and the issue is relabeled `UNDER SAIL` → `ADRIFT` (resume = merge the branch back into dev locally and relabel `UNDER SAIL`)

#### Scenario: Fog too thick — start fresh
- **WHEN** untangling the in-flight work would cost more than a fresh proposal
- **THEN** the work and change artifacts are discarded and the issue is relabeled `UNDER SAIL` → `UNCHARTED` for re-plotting

#### Scenario: Charter leaves the voyage under sail
- **WHEN** a session chartering a discovery onto an open map is itself mid-voyage on an `UNDER SAIL` chunk
- **THEN** the chunk is cut onto the map, the active issue stays `UNDER SAIL`, the tree is untouched, and the voyage continues — charter writes only GitHub issues, so an occupied tree is irrelevant

#### Scenario: One beacon per issue, clean dev
- **WHEN** triage completes any of the three blast-radius moves
- **THEN** `UNDER SAIL` marks an occupied tree, the board carries exactly one beacon per issue, and half-finished work is never merged to `dev`

### Requirement: Exit SHALL cut owner-approved, change-sized, sequenced chunks, tolerating wired residual fog

Exit SHALL run when the chunking is drafteable and the frontier chunk is unblocked — not only when every decision is closed — and SHALL be re-enterable per-discovery on an open map via `/anchor`'s charter move.

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
- **THEN** chunks are created as sub-issues of the map, sequenced with native blocked-by, with bodies pre-distilled (problem, settled decisions linked from the map, constraints) and linking the map so `/embark` inherits its Decisions so far

#### Scenario: Exit cuts one release's worth
- **WHEN** exit cuts chunks
- **THEN** it cuts one release's worth and stamps the milestone on the map issue with chunks carrying none; scope beyond that release routes to a successor map or stays as fog until `/split-map` or `/close-map` dispatches it, and fog scoped to later chunks may persist in Not yet specified

#### Scenario: Decision phase still bars incremental chunks
- **WHEN** a map work session resolving a plotting ticket identifies a slice of the build before exit has run
- **THEN** no implementation issue is created — charter applies only to an open map whose exit has already run

#### Scenario: Charter re-enters exit on an open map
- **WHEN** a session discovers that cargo landed under an open map is broken and that map's release cannot ship without the fix
- **THEN** `/anchor`'s charter move cuts it as an owner-approved sub-issue chunk of that map, born `CHARTED` with no milestone and blocked-by wired onto what it builds on

#### Scenario: Chartered chunk gated by an open decision is born UNCHARTED
- **WHEN** a chartered chunk is gated by an open decision ticket
- **THEN** it is born `UNCHARTED` with blocked-by wired, by the same exit mechanics as any other chunk

#### Scenario: In-Destination nice-to-have is put to the owner
- **WHEN** a discovery sits inside an open map's Destination but the release can ship without it
- **THEN** the owner chooses per discovery between a fog line on the map and an `OFF THE MAP` issue, and no chunk is cut

#### Scenario: Out-of-Destination discovery is logged
- **WHEN** a discovery sits outside every open map's Destination
- **THEN** it is logged `OFF THE MAP` and no chunk is cut

#### Scenario: Charter is silent on release pressure
- **WHEN** a chartered chunk would push the map past what its release can finish
- **THEN** the charter criteria alone decide, no scope warning is owed, and the overrun remains `/split-map`'s case
