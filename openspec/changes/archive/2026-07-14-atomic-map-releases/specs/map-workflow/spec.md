# map-workflow Delta

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: /map SHALL be the mandatory intake for all work definition, scaled to demand

All work SHALL enter through `/map`: it accepts plain text or an existing GitHub issue and compiles it toward ready-to-work issues through three phases — **chart** (name the destination via `/grill-me`, grill breadth-first, create the map and its tickets), **work** (resolve tickets, scouting excepted in parallel), and **exit** (cut the destination into implementation chunks). No other skill SHALL create issues cleared for work, and the retired explore route SHALL NOT be routed to; map's charting is the one fog engine, and it SHALL preserve the explore write-back discipline — every issue map emits carries a distilled body that is the complete, current statement of what to build, approved by the owner before any issue is created or edited. Persistence machinery beyond the map itself SHALL materialize only when state must outlive the session: a question answered inline never becomes a ticket. Every work item SHALL live under a map — input that charts to one-change size SHALL compile to a single-chunk map: the `MAP` index created in the same session with one distilled `CHARTED` chunk as its sub-issue and no decision tickets, so the milestone ⇔ map invariant holds uniformly. Input SHALL be consumed, never converted: a prompt issue is closed with a pointer comment to what map created. Nothing SHALL ever be implemented from the map; every ticket resolves a decision, not a slice of the build.

#### Scenario: Small clear idea compiles to a single-chunk map
- **WHEN** charting finds no fog and the idea is sized for one OpenSpec change
- **THEN** `/map` creates a `MAP` index with exactly one distilled `CHARTED` chunk as its sub-issue in the same session, closes a prompt issue with a pointer comment, and creates no decision tickets

#### Scenario: Giant but clear idea skips the decision phase
- **WHEN** charting finds no fog but the work exceeds one OpenSpec change
- **THEN** the map is created purely as the epic index and the invocation proceeds straight to the exit phase

#### Scenario: Foggy epic charts a map
- **WHEN** charting surfaces decisions that must wait for later sessions
- **THEN** a `MAP`-labeled index issue is created with typed tickets as sub-issues, scouting subagents fire in parallel, and the invocation stops without hand-resolving plotting tickets

### Requirement: Exit SHALL cut owner-approved, change-sized, sequenced chunks, tolerating wired residual fog

Exit SHALL run when the chunking is drafteable and the frontier chunk is unblocked — not only when every decision is closed. Residual open decision tickets SHALL be wired blocked-by onto the chunks they gate, and those chunks SHALL be born `UNCHARTED`; unblocked chunks are born `CHARTED`. Fog scoped to later chunks MAY persist in Not yet specified. Exit SHALL cut one release's worth of chunks and stamp the milestone **on the map issue** — chunks SHALL carry no milestone; scope beyond that release routes to a successor map or stays as fog until `/split-map` or `/close-map` dispatches it. The chunking SHALL be proposed to the owner before any issue is created; on approval, chunks are created as sub-issues of the map, sequenced with native blocked-by, bodies pre-distilled (problem, settled decisions linked from the map, constraints) and linking the map so `/embark` inherits its Decisions so far. Implementation issues SHALL be created only at exit, never incrementally during the decision phase.

#### Scenario: Exit with a residual decision
- **WHEN** chunking is drafteable but one decision needs landed code to resolve
- **THEN** exit proceeds with that ticket open and wired blocked-by onto the chunks it gates, those chunks born `UNCHARTED`, and the frontier chunk born `CHARTED`

#### Scenario: Owner gates the chunking
- **WHEN** exit drafts the implementation split
- **THEN** no issue is created until the owner approves the chunking

#### Scenario: Milestone lands on the map, not the chunks
- **WHEN** exit creates the approved chunks
- **THEN** the map issue is assigned the target milestone and every chunk is created without one

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
