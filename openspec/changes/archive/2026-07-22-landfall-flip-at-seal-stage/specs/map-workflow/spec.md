## MODIFIED Requirements

### Requirement: /port-inspection SHALL own the IN PORT inspection walk

`/port-inspection [map#|issue#]` SHALL be the skill that inspects `IN PORT` cargo, invokable whenever cargo is in port — inspection never waits on the epic's frontier. Scoping: a `MAP` issue# walks that map's open `IN PORT` chunks; a chunk issue# inspects just that chunk (discriminated by the `MAP` label on the resolved issue); no argument SHALL NOT walk anything silently — the skill reads recent `issue-<N>:` commits on `dev`, resolves which of those issues are open and `IN PORT`, and recommends candidates for the owner to pick before any walk runs.

At each stop the skill SHALL surface the dependency consequence of closing: one dependents lookup per chunk (`gh api repos/{owner}/{repo}/issues/<n>/dependencies/blocking`), reporting each open dependent as "closing this unblocks #N". A failed lookup SHALL be reported, never read as "no dependents"; the surface is informational and does not gate the stop.

At each stop the skill SHALL also verify the chunk's archive commit actually landed on `origin/dev` before closing — the compensating check for landfall flipping `IN PORT` at archive rather than after push. A chunk whose `issue-<N>: archive <change>` seal commit is not present on `origin/dev` SHALL NOT be closed: the chunk stays open, the stop flags the unpushed/abandoned seal, and the skill flips the chunk's label `IN PORT` → `UNDER SAIL` to un-strand it so `/landfall` can re-run and land it. This flip-back is the sole reconciler of a stranded `IN PORT`; a failed archive-presence check SHALL be reported, never read as "archive landed".

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
