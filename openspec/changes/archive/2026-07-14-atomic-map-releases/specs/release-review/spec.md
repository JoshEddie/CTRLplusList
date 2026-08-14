# release-review Delta

## MODIFIED Requirements

### Requirement: The review SHALL cover five dimensions inline

The review SHALL run as a single inline pass (no sub-agents, no workflow) over exactly five dimensions:

1. **Map closure** — every `MAP` issue assigned to the milestone is closed, which per `map-workflow` is reachable only through `/close-map`'s inspection walk (all chunks closed, leftovers dispatched via `/split-map`). An open map, an open chunk under a milestoned map, or a chunk still `IN PORT` is a blocking finding; the resolution options reported are finish, re-milestone the whole map, or `/split-map` — never moving a single chunk. Conversely, no substantial diff content in the PR's commit range lacks a home under one of the milestone's maps.
2. **Cross-feature interaction risk** — at diff-stat level, bundled features touching shared surfaces (nav, cache tags, shared components under `app/ui/`, `lib/`) are flagged for a look; disjoint features pass silently.
3. **Migration ordering** — new Drizzle migration files are sequential with no divergent heads or duplicate prefixes; stated N/A when the release has no migrations.
4. **OpenSpec state clean** — working-copy `openspec list` reports no active changes and repo-level `openspec validate --strict` passes; any in-flight change is a finding (land it or it waits for the next cut).
5. **Version bump** — `package.json`'s version matches the milestone title.

The skill SHALL NOT re-litigate findings from the bundled changes' own reviews and SHALL NOT include a changelog phase.

#### Scenario: Unlanded change blocks the cut
- **WHEN** `openspec list` shows an active change at review time
- **THEN** the review raises a finding that the change must land or be excluded from this cut

#### Scenario: Open map blocks the cut
- **WHEN** a `MAP` issue assigned to the milestone is still open at review time
- **THEN** the review raises a blocking finding naming the map and its open or uninspected chunks, with finish / re-milestone the whole map / `/split-map` as the reported options

#### Scenario: Uninspected cargo blocks the cut
- **WHEN** every chunk of a milestoned map has landed but one still carries `IN PORT`
- **THEN** the verdict is not ready — the owner runs `/close-map` to inspect on the dev deployment before the cut

#### Scenario: No changelog work occurs
- **WHEN** the review completes
- **THEN** no changelog artifact is drafted or requested
