# trunk-workflow delta

## MODIFIED Requirements

### Requirement: /embark SHALL gate on trunk preconditions and act only on CHARTED

The `/embark <issue#>` skill (née `/start-change`) SHALL hard-stop unless the working copy is on `dev` and `dev` is up to date with its remote. It SHALL read the issue via `gh issue view` and board only when **both** conditions hold: the routing state is exactly `CHARTED`, **and** the issue has zero open blockers, verified via

```bash
gh api --paginate repos/{owner}/{repo}/issues/<n>/dependencies/blocked_by \
  --jq '.[] | {number, state, title}'
```

Any other routing state SHALL stop, reporting the routing labels found; an open blocker SHALL stop with a message naming the blocking issue(s) (closed blockers do not gate); a failed blocker query SHALL stop loudly, never be read as "no blockers". The label check SHALL be an allowlist, not a routing table: embark SHALL NOT enumerate the states it rejects, SHALL NOT route them to owning skills, and SHALL NOT delegate into the definition layer — an unrecognized or newly-added label therefore stops it, which is the correct outcome for a dispatcher whose only job is boarding cleared work. Lowercase labels SHALL NOT route. Before proposing, embark SHALL run a terrain check: re-read the issue body and its linked map's Decisions so far against the current code and specs, surfacing anything that shifted since charting; a shifted map decision fires `/anchor`. Propose then runs seeded from the issue body, its grilling citing settled map decisions rather than re-asking them, re-validating any unreviewed scouting decisions, and concluding only on the owner's explicit confirmation of shared understanding — never self-certified. The grilling MAY conclude the input is epic-sized and, on the owner's confirmation, route out to `/map`'s chart phase in the same conversation (prior answers carried per `map-workflow`'s re-validation sweep). The skill SHALL NOT create commits and SHALL own no map mechanics of its own.

#### Scenario: Anything but CHARTED stops
- **WHEN** `/embark 42` runs against an issue whose routing state is anything other than `CHARTED` — including `OFF THE MAP`, `UNCHARTED`, `ADRIFT`, `UNDER SAIL`, `IN PORT`, `MAP`, or no routing label at all
- **THEN** the skill reports the routing labels it found and stops — no proposal is drafted, no work is delegated, and no state is re-charted

#### Scenario: An open blocker stops a CHARTED issue
- **WHEN** `/embark 42` runs against a `CHARTED` issue whose blocked-by query returns one or more blockers with state `open`
- **THEN** the skill stops with a message naming each open blocking issue — the label alone does not board

#### Scenario: Closed blockers do not gate
- **WHEN** `/embark 42` runs against a `CHARTED` issue whose blocked-by relationships all point at closed issues
- **THEN** boarding proceeds — sequencing history is not a gate

#### Scenario: An unknown label stops embark
- **WHEN** `/embark 42` runs against an issue carrying a routing label added to the machine after embark was written
- **THEN** the skill stops rather than falling through to a catch-all route — the allowlist admits only `CHARTED`

#### Scenario: Terrain check catches drift before departure
- **WHEN** embark's terrain check finds a settled map decision contradicted by code landed since charting
- **THEN** `/anchor` fires on that decision before any proposal work begins

#### Scenario: Chunk issue inherits map context
- **WHEN** embark proposes an issue whose body links a `MAP`-labeled index
- **THEN** the grilling reads the map's Decisions so far as settled context, asks only about what the map left open, and re-validates unreviewed scouting gists

#### Scenario: Propose grilling routes out an epic
- **WHEN** the grilling concludes mid-interview that the issue is bigger than one OpenSpec change and the owner confirms
- **THEN** the session routes out to `/map`'s chart phase in the same conversation instead of drafting a proposal
