# map-workflow Specification

## Purpose
The definition layer of the two-layer workflow constitution. Every piece of work enters through `/map`, the mandatory intake that clears fog and emits issues cleared for work; nothing else creates worked issues. Governs the map lifecycle (chart / work / exit), the routing-label machine, ticket types, bearing moves (`/anchor`), and epic completion (`/close-map`). The execution layer (`trunk-workflow`) owns everything after departure: tree, commits, gates, review, landing.
## Requirements
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

### Requirement: The map SHALL be an index issue with typed sub-issue tickets wired by native relationships

The map SHALL be one GitHub issue labeled `MAP`, its body holding exactly five sections: Destination, Notes, Decisions so far, Not yet specified, Out of scope (template inline in `SKILL.md`). The map SHALL be an index, not a store — a decision lives in exactly one place (its ticket) and the map gists and links it; maps and tickets SHALL be referred to by title wrapping the link, never a bare number. Tickets SHALL be sub-issues of the map (REST `sub_issues` via `gh api`, numeric-id lookup encoded inline), each labeled exactly one of `PLOTTING` (HITL — run `/grill-me`, decisions put to the owner one at a time; the agent SHALL never answer for the helm) or `SCOUTING` (AFK — facts a decision waits on, resolved by a background subagent). Sequencing SHALL use native blocked-by relationships (`dependencies/blocked_by` via `gh api`). There SHALL be no claiming: the frontier is the open, unblocked sub-issues in list order. When multiple tickets are ready, the session SHALL prompt with the actual tickets as options — one recommended for the quickest landing, one for the highest leverage (most likely to flush a mirage before work builds on it) — with ties broken by list order. At most one plotting ticket SHALL be resolved per session. A question SHALL become a ticket only when it can be stated precisely now; otherwise it stays fog in Not yet specified. A ticket found to sit past the destination SHALL be closed into Out of scope with one line of why, never into Decisions so far. A manual prerequisite SHALL be recorded as a fog line naming what it waits on — not a ticket type; when the owner completes it, an anchor graduates the fog.

#### Scenario: Frontier prompt offers real tickets by mode
- **WHEN** a map work session finds three open, unblocked tickets
- **THEN** it prompts with the tickets themselves — quickest-landing and highest-leverage recommendations named — and list order breaks any tie

#### Scenario: Plotting waits for the owner
- **WHEN** a session reaches a `PLOTTING` ticket and the owner is not engaging live
- **THEN** the ticket stays open — the agent does not answer the plotting questions itself

### Requirement: SCOUTING tickets SHALL auto-resolve with unreviewed markers

A `SCOUTING` ticket SHALL fire its background subagent automatically at creation (during charting or on graduation from fog), with findings landing as the ticket's resolution comment and no scratch branches. The ticket SHALL auto-close, and its gist SHALL enter Decisions so far carrying an *unreviewed* marker until an owner-present session clears it. Downstream, `/embark`'s grilling SHALL treat unreviewed scouting decisions as suspect — re-validated with the owner, not cited as settled.

#### Scenario: Scouting fires at creation
- **WHEN** a `SCOUTING` ticket is created
- **THEN** a background subagent is spawned immediately and its findings land as the resolution comment, the ticket closes, and the map gist is marked unreviewed

#### Scenario: Unreviewed finding is re-validated at departure
- **WHEN** `/embark` proposes a chunk whose inherited map decisions include an unreviewed scouting gist
- **THEN** the grilling re-validates that decision with the owner instead of citing it as settled

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

### Requirement: /close-map SHALL end the epic through inspection

`/close-map` SHALL be the inspection batch-point and the only skill that closes a map: it walks each open `IN PORT` chunk with the owner (verified on the **dev deployment**? → close), then closes the map when — and only when — every implementation chunk is closed. The dev deployment is the verification surface: inspection runs **before** the map's release cuts, never against production; a regression discovered in production after ship is a new bug ticket scoped to a patch release, not a reopened chunk. A map whose last chunk is merely `IN PORT` SHALL NOT close: `IN PORT` is uninspected cargo. `/close-map` SHALL refuse to close a map still holding unstarted chunks or residual Not-yet-specified fog, pointing at `/split-map` to dispatch the leftovers. Landfall labels; inspection closes.

#### Scenario: In-port chunks block the close
- **WHEN** `/close-map` runs while two chunks sit `IN PORT`
- **THEN** it prompts the owner to verify each on the dev deployment (closing those confirmed) and closes the map only if none remain open

#### Scenario: Leftovers block the close
- **WHEN** `/close-map` runs on a map whose chunks are all closed but whose body still holds Not-yet-specified fog or an unstarted chunk
- **THEN** it refuses to close the map and points at `/split-map`

### Requirement: The definition layer SHALL only write GitHub issues and SHALL run ungated

`/map`, `/anchor` (its map-side moves), `/close-map`, and `/split-map` SHALL limit side effects to GitHub issue operations (issues, comments, labels, sub-issue links, blocked-by relationships, map milestone assignment) via `gh`. They SHALL never mutate the working tree, never stage, never run `git commit`, and never push — with the sole exception of anchor's park move, which stages a WIP commit for the owner's signature and never signs it. They SHALL have no trunk preconditions gate — branch and tree state are irrelevant to issue writes.

#### Scenario: Dirty tree does not block mapping
- **WHEN** `/map` is invoked while an implemented change sits uncommitted in the working tree
- **THEN** the invocation proceeds — the skill touches only GitHub issues

### Requirement: Chart SHALL seed from an aborted embark grilling with a re-validation sweep

When `/embark`'s propose grilling routes out as epic-sized (the gate-side behavior is owned by `trunk-workflow`), `/map`'s chart phase SHALL run in the same conversation and SHALL treat already-given interview answers as candidates, not decisions: chart opens with a re-validation sweep in which each prior answer is either confirmed into Decisions so far as a plain unlinked gist line (no ticket — an answer that never waited never earns one) or demoted to fog or a ticket, because answers given under a one-change framing may not survive the epic reframing.

#### Scenario: Prior answer survives reframing
- **WHEN** the re-validation sweep confirms an answer given before the epic realization still holds
- **THEN** it enters Decisions so far as an unlinked gist line and is not re-asked

#### Scenario: Prior answer turns foggy
- **WHEN** the epic reframing makes a previously clear answer suspect
- **THEN** the sweep demotes it to Not yet specified or a fresh ticket instead of carrying it forward

### Requirement: The map SHALL be atomic with respect to a release, with /split-map as the only boundary cutter

A map's implementation chunks SHALL all ship in the same release: the milestone lives **only on the `MAP` issue**, stamped at exit, and no chunk, ticket, or other issue SHALL carry one. A map milestoned to a release SHALL be fully closed — via `/close-map`'s inspection walk — before that release cuts (the gate itself is owned by `release-review`). A single chunk SHALL NOT move to another release: when a milestoned map will not finish, the options are finish it, re-milestone the whole map (nothing landed yet), or split it.

`/split-map <map#>` SHALL be the only operation that cuts a map at the landed boundary. It SHALL be a permanent thin wrapper over `/map`'s machinery — everything not stated here follows `/map` exactly (guardrails, label machine, body template, write-back discipline, sub-issue endpoints). It SHALL: inventory landed (`IN PORT`/closed) versus open chunks and present the split line to the owner; create an owner-approved successor map on the next milestone; migrate every unstarted chunk (re-parent as sub-issue) together with any decision tickets that gate them; migrate residual fog per the owner's per-line choice — into the successor's Not yet specified, or demoted to an `OFF THE MAP` issue when it has drifted from the destination; copy the Decisions-so-far gists relevant to migrated chunks into the successor body with links back; cross-link both bodies (predecessor Notes → continued-in successor, successor Notes → origin); and seed the successor with exactly one re-orientation `PLOTTING` ticket wired blocked-by onto every migrated chunk, so migrated chunks are born `UNCHARTED`. The re-orientation ticket's resolution SHALL verify the predecessor map is fully closed, re-validate each copied decision gist against the shipped terrain (confirmed or demoted to fog), confirm migrated chunk bodies still match landed reality, and sharpen residual fog the shipped release settled. `/split-map` SHALL never close any issue or map, and SHALL NOT migrate an `UNDER SAIL` or `ADRIFT` chunk — an active voyage pins the split until it resolves via `/landfall` or `/anchor`.

#### Scenario: Split at the landed boundary
- **WHEN** `/split-map` runs on a map with two chunks landed and three unstarted
- **THEN** an owner-approved successor map is created on the next milestone, the three unstarted chunks and their gating tickets are re-parented to it, both map bodies are cross-linked, and the predecessor retains only its landed chunks

#### Scenario: Re-orientation ticket gates the successor
- **WHEN** the successor map's first work session opens its frontier
- **THEN** the sole unblocked item is the re-orientation `PLOTTING` ticket, every migrated chunk sits `UNCHARTED` behind it, and resolving it verifies the predecessor closed, re-validates inherited gists, and flips unblocked chunks `CHARTED`

#### Scenario: Residual fog is dispatched per line
- **WHEN** the split reaches a Not-yet-specified line
- **THEN** the owner chooses per line: carry it into the successor's fog or demote it to an `OFF THE MAP` issue

#### Scenario: Active voyage pins the split
- **WHEN** `/split-map` finds a chunk labeled `UNDER SAIL` or `ADRIFT`
- **THEN** it stops without migrating anything, naming the voyage that must resolve first

