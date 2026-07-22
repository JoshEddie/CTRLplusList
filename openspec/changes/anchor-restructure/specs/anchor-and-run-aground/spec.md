# anchor-and-run-aground Delta

## ADDED Requirements

### Requirement: /anchor SHALL dispatch on observable map state and own the four map-side bearing moves

Decision state SHALL be bidirectional for the epic's whole life. `/anchor` SHALL open with a dispatch table mapping observable state to exactly one move — fog sharpened → **promote**; settled decision wrong → **demote**; new discovery → **charter** diagnosis; map body drifted from ticket reality → **re-sync**; mirage striking an `UNDER SAIL` issue → not anchor's move, pointed at `/run-aground`. Each move SHALL carry only its judgment (promote's precision test, charter's conjunctive diagnosis) and cite the map-owned reference docs (`issue-cut.md`, `map-body.md`, `demotion.md`) for mechanics, never restating them.

#### Scenario: Promote turns fog into a ticket
- **WHEN** `/anchor` promotes a fog line
- **THEN** the question is stated precisely, the ticket is created per `issue-cut.md`, blocked-by is wired onto every chunk it gates, and scouting subagents fire as always

#### Scenario: Demote reopens the original ticket
- **WHEN** a settled decision is revealed as a mirage
- **THEN** `/anchor` executes `demotion.md`: the **original** ticket is reopened (never a superseding one), the invalidation evidence is posted as a comment, the gist line moves back to Not yet specified marked *reopened*, and affected chunks flip `CHARTED` → `UNCHARTED` with the reopened ticket wired blocked-by onto them

#### Scenario: Anchor re-syncs the map body
- **WHEN** the map body has drifted from ticket reality
- **THEN** `/anchor` re-syncs it per `map-body.md`'s edit discipline

#### Scenario: Anchoring is opportunistic, never a duty
- **WHEN** any session discovers a bearing move is needed
- **THEN** it may anchor at that moment, and no session carries a proactive detection duty

#### Scenario: Charter leaves the voyage under sail
- **WHEN** a session chartering a discovery onto an open map is itself mid-voyage on an `UNDER SAIL` chunk
- **THEN** the chunk is cut onto the map, the active issue stays `UNDER SAIL`, the tree is untouched, and the voyage continues — charter writes only GitHub issues, so an occupied tree is irrelevant

#### Scenario: Mirage under sail is dispatched, not triaged
- **WHEN** `/anchor` is invoked on a mirage that strikes an issue labeled `UNDER SAIL`
- **THEN** the dispatch table points at `/run-aground` and anchor performs no triage of its own

### Requirement: /anchor SHALL write only GitHub issues, with no tree exception

`/anchor` SHALL limit side effects to GitHub issue operations (issues, comments, labels, sub-issue links, blocked-by relationships) via `gh`. It SHALL never mutate the working tree, never stage, never run `git commit`, and never push — no exception. It SHALL have no trunk preconditions gate — branch and tree state are irrelevant to issue writes.

#### Scenario: Dirty tree does not block a bearing move
- **WHEN** `/anchor` is invoked while an implemented change sits uncommitted in the working tree
- **THEN** the move proceeds — the skill touches only GitHub issues

#### Scenario: No move stages work
- **WHEN** any anchor move completes
- **THEN** the working tree is byte-identical to before the invocation — parking work is `/run-aground`'s act, not anchor's

### Requirement: /run-aground SHALL be the execution-layer response to a mirage striking an UNDER SAIL issue

`/run-aground` SHALL be the dark mirror of `/landfall`: it triggers when a settled decision is revealed wrong while its chunk is `UNDER SAIL`. It SHALL first execute `demotion.md` — the map-side truth update runs regardless of blast radius — then put the blast-radius call to the owner (AskUserQuestion) with exactly three moves: **patch at sea** (the chunk's destination stands; the change is amended in place and stays `UNDER SAIL`), **park** (the premise is invalidated but the work is worth keeping; → `ADRIFT`), **discard** (untangling costs more than a fresh proposal; → `UNCHARTED`). `/run-aground` SHALL stamp `ADRIFT` and the discard `UNCHARTED`.

#### Scenario: Mirage patchable at sea
- **WHEN** a mid-apply session discovers a settled decision is wrong but the chunk's destination stands
- **THEN** the decision is demoted on the map per `demotion.md` and the change is amended in place, staying `UNDER SAIL`

#### Scenario: Voyage parked adrift
- **WHEN** the mirage invalidates the chunk's premise but the work is worth keeping
- **THEN** the work is staged as one WIP commit on `adrift/issue-<N>` for the owner's signature, the tree comes back clean, and the issue is relabeled `UNDER SAIL` → `ADRIFT` — `UNDER SAIL` never survives a park

#### Scenario: Fog too thick — start fresh
- **WHEN** untangling the in-flight work would cost more than a fresh proposal
- **THEN** the work and change artifacts are discarded, the tree comes back clean, and the issue is relabeled `UNDER SAIL` → `UNCHARTED` for re-plotting

#### Scenario: One beacon per issue, clean dev
- **WHEN** `/run-aground` completes any of the three blast-radius moves
- **THEN** `UNDER SAIL` marks an occupied tree, the board carries exactly one beacon per issue, and half-finished work is never merged to `dev`

### Requirement: /run-aground SHALL own the tree exception, stage-never-sign, and the resume path

`/run-aground` SHALL be the only skill outside `/landfall`'s landing flow permitted to stage work: the park move stages exactly one WIP commit on `adrift/issue-<N>` for the owner's signature and SHALL never sign it — skills never run `git commit`, and a blocked signature is never retried. `/run-aground` SHALL also own the resume path: resuming an `ADRIFT` issue merges the `adrift/issue-<N>` branch back into `dev` locally and relabels the issue `ADRIFT` → `UNDER SAIL`.

#### Scenario: Park stages, never signs
- **WHEN** the park move reaches its commit point and the owner is not present to sign
- **THEN** the WIP commit sits staged on `adrift/issue-<N>` with the paste-ready message reported, and the skill stops without attempting or retrying the commit

#### Scenario: Adrift voyage resumes
- **WHEN** the owner resumes a parked issue
- **THEN** the `adrift/issue-<N>` branch is merged back into `dev` locally and the issue is relabeled `ADRIFT` → `UNDER SAIL`, per `/run-aground`'s resume path
