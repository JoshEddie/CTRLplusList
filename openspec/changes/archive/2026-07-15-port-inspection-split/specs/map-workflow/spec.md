# map-workflow — Delta for port-inspection-split

## ADDED Requirements

### Requirement: /port-inspection SHALL own the IN PORT inspection walk

`/port-inspection [map#|issue#]` SHALL be the skill that inspects `IN PORT` cargo, invokable whenever cargo is in port — inspection never waits on the epic's frontier. Scoping: a `MAP` issue# walks that map's open `IN PORT` chunks; a chunk issue# inspects just that chunk (discriminated by the `MAP` label on the resolved issue); no argument SHALL NOT walk anything silently — the skill reads recent `issue-<N>:` commits on `dev`, resolves which of those issues are open and `IN PORT`, and recommends candidates for the owner to pick before any walk runs.

At each stop the skill SHALL surface the dependency consequence of closing: one dependents lookup per chunk (`gh api repos/{owner}/{repo}/issues/<n>/dependencies/blocking`), reporting each open dependent as "closing this unblocks #N". A failed lookup SHALL be reported, never read as "no dependents"; the surface is informational and does not gate the stop.

The verification surface is the **dev deployment, before the map's release cuts** — never production; a regression discovered in production after ship is a new bug ticket scoped to a patch release, not a reopened chunk. Owner confirms verified → `gh issue close <N>`; not confirmed → the chunk stays open with what's outstanding noted. Side effects are GitHub issue operations only, via `gh`; no trunk preconditions gate.

#### Scenario: Closing surfaces the unblock

- **WHEN** `/port-inspection` stops at an `IN PORT` chunk that blocks an open `CHARTED` issue
- **THEN** the stop reports "closing this unblocks #N" from the dependents lookup, and closing the chunk on the owner's confirmation makes the dependent frontier

#### Scenario: No-arg recommends before walking

- **WHEN** `/port-inspection` runs with no argument
- **THEN** it recommends inspection candidates derived from recent `issue-<N>:` commits on `dev` that sit open and `IN PORT`, and walks only what the owner picks

#### Scenario: Single-chunk inspection

- **WHEN** `/port-inspection <chunk#>` runs against one `IN PORT` chunk
- **THEN** only that chunk is inspected — verified on the dev deployment → closed, otherwise left open with the outstanding note

## MODIFIED Requirements

### Requirement: /close-map SHALL end the epic through inspection

`/close-map` SHALL be the inspection batch-point and the only skill that closes a map: it runs the `IN PORT` inspection walk as a thin delegation to `/port-inspection` — the walk's rules (dev-deployment verification surface, dependents surface, close-on-confirmation) live in that skill and are followed, never restated — then closes the map when — and only when — every implementation chunk is closed. A map whose last chunk is merely `IN PORT` SHALL NOT close: `IN PORT` is uninspected cargo. `/close-map` SHALL refuse to close a map still holding unstarted chunks or residual Not-yet-specified fog, pointing at `/split-map` to dispatch the leftovers. Landfall labels; inspection closes.

#### Scenario: In-port chunks block the close

- **WHEN** `/close-map` runs while two chunks sit `IN PORT`
- **THEN** it walks both per `/port-inspection` (closing those the owner confirms verified on the dev deployment) and closes the map only if none remain open

#### Scenario: Leftovers block the close

- **WHEN** `/close-map` runs on a map whose chunks are all closed but whose body still holds Not-yet-specified fog or an unstarted chunk
- **THEN** it refuses to close the map and points at `/split-map`

### Requirement: The definition layer SHALL only write GitHub issues and SHALL run ungated

`/map`, `/anchor` (its map-side moves), `/port-inspection`, `/close-map`, and `/split-map` SHALL limit side effects to GitHub issue operations (issues, comments, labels, sub-issue links, blocked-by relationships, map milestone assignment) via `gh`. They SHALL never mutate the working tree, never stage, never run `git commit`, and never push — with the sole exception of anchor's park move, which stages a WIP commit for the owner's signature and never signs it. They SHALL have no trunk preconditions gate — branch and tree state are irrelevant to issue writes.

#### Scenario: Dirty tree does not block mapping

- **WHEN** `/map` is invoked while an implemented change sits uncommitted in the working tree
- **THEN** the invocation proceeds — the skill touches only GitHub issues
