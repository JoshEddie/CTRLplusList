# map-workflow Specification

## Purpose
The definition layer of the two-layer workflow constitution. Every piece of work enters through `/map`, the mandatory intake that clears fog and emits issues cleared for work; nothing else creates worked issues. Governs the map lifecycle (chart / work / exit), the routing-label machine, ticket types, bearing moves (`/anchor`), and epic completion (`/close-map`). The execution layer (`trunk-workflow`) owns everything after departure: tree, commits, gates, review, landing.
## Requirements
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

### Requirement: Routing labels SHALL form the machine-read lifecycle, stamped by the skill that causes each transition

Routing labels SHALL be ALL CAPS and SHALL be the only labels skills route on: `OFF THE MAP` (logged, not yet charted — map's intake queue), `CHARTED` (cleared for work), `UNCHARTED` (a map chunk not cleared — born gated at exit, or demoted by `/anchor`), `UNDER SAIL` (an OpenSpec change occupies the tree), `IN PORT` (landed and sealed, awaiting inspection), `ADRIFT` (voyage interrupted with recoverable work), `MAP` (index issue), `PLOTTING` / `SCOUTING` (decision tickets). Each lifecycle transition SHALL be stamped by the skill that causes it: `/map` applies `CHARTED`/`UNCHARTED`, `/set-sail` applies `UNDER SAIL`, `/landfall` applies `IN PORT`, `/anchor` applies `ADRIFT`/`UNCHARTED`. Lowercase labels (`bug`, `idea`, `debt`, `hold`, …) SHALL be human triage only — no skill SHALL route on them, except that map's intake SHALL surface the findings comment of a `hold`-marked issue before recharting it. The routing labels SHALL be a repo-setup prerequisite: skills SHALL stamp them and SHALL NOT create them, so label creation is a one-time adoption step rather than a per-invocation guard, and a missing label SHALL surface as a loud `gh` failure rather than being silently repaired. `/embark` (execution layer) SHALL treat the absence of `CHARTED` as a stop — no separate not-cleared marker exists, and the definition layer SHALL NOT be entered by delegation from embark's boarding check (label dispatch stops, never routes); the propose grilling's owner-confirmed epic route-out, owned by `trunk-workflow`, is the sole sanctioned entry from embark.

#### Scenario: Label case is the semantics
- **WHEN** any skill decides how to treat an issue
- **THEN** only ALL-CAPS routing labels affect the decision, and ticket kind is read from the `PLOTTING`/`SCOUTING` label, never inferred from title or body

#### Scenario: Held waters surface their hold note
- **WHEN** `/map` recharts an `OFF THE MAP` issue carrying the `hold` label
- **THEN** the parked findings comment is surfaced to the owner before any charting proceeds

#### Scenario: Discovery mid-voyage is logged, not charted
- **WHEN** a session discovers out-of-scope work during implementation or review
- **THEN** it writes the richest issue body it can, labels it `OFF THE MAP` (plus any lowercase kind), and returns to its voyage without invoking map

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

Decision state SHALL be bidirectional for the epic's whole life, and every bearing move SHALL be executed via `/anchor`. **Promote** (fog → typed ticket): state the question precisely, create the ticket, wire blocked-by onto any chunks it gates, fire scouting subagents as always. **Demote** (a decision revealed as a mirage): reopen the **original** ticket — never a superseding one — post the invalidation evidence as a comment, move the gist line back to Not yet specified marked *reopened*, and flip affected chunks `CHARTED` → `UNCHARTED`. Anchor SHALL also re-sync the map body against ticket reality. Any session MAY anchor at the moment of discovery; no session carries a proactive detection duty. When the mirage strikes an `UNDER SAIL` issue, anchor SHALL put the blast-radius call to the owner: **patch at sea** — amend the still-active change's design/spec/code in place and stay `UNDER SAIL`; **park** — stage the in-flight work as one WIP commit on an `adrift/issue-<N>` branch for the owner to sign, restore a clean tree, and relabel `UNDER SAIL` → `ADRIFT` (resume = merge the branch back into dev locally and relabel `UNDER SAIL`); or **discard** — when a fresh proposal is cheaper than untangling, remove the work and change artifacts and relabel `UNDER SAIL` → `UNCHARTED`. `UNDER SAIL` SHALL NOT survive an anchor: the tree is no longer occupied, and the board SHALL carry exactly one beacon per issue. Half-finished work SHALL never be merged to `dev`.

#### Scenario: Mirage patchable at sea
- **WHEN** a mid-apply session discovers a settled decision is wrong but the chunk's destination stands
- **THEN** anchor demotes the decision on the map and the change is amended in place, staying `UNDER SAIL`

#### Scenario: Voyage parked adrift
- **WHEN** the mirage invalidates the chunk's premise but the work is worth keeping
- **THEN** the work is staged as a WIP commit on `adrift/issue-<N>` for the owner's signature, the tree comes back clean, and the issue is labeled `ADRIFT`

#### Scenario: Fog too thick — start fresh
- **WHEN** untangling the in-flight work would cost more than a fresh proposal
- **THEN** the work and change artifacts are discarded and the issue is labeled `UNCHARTED` for re-plotting

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
