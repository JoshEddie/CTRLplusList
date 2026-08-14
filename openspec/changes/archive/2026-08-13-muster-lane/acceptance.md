# Acceptance — muster-lane

## Flows

### Flow: Scout's coverage chunk is born MUSTER

- **Given** a map whose implementation chunks are all closed and whose fired e2e scout report recommends coverage
- **When** the owner approves the chunk cut in `/port-inspection`
- **Then** a new sub-issue exists carrying the label `MUSTER`
- **And** the issue body contains the coverage plan rows and deliberate skips
- **And** the issue carries no `CHARTED` label
- **And** no `openspec/changes/` directory exists for it

### Flow: Set-sail enters the MUSTER lane

- **Given** a `MUSTER`-labeled issue whose plan cites only `#### Scenario:` headings present in active specs
- **And** no issue on the board is labeled `UNDER SAIL`
- **When** the owner runs `/set-sail <issue#>`
- **Then** the issue's labels read both `MUSTER` and `UNDER SAIL`
- **And** the session reports the ticket body as the plan
- **And** the session reports TESTING.md read before any test is written
- **And** no `openspec/changes/` directory is created
- **And** `/opsx:apply` is not invoked

### Flow: Stale plan stops the voyage

- **Given** a `MUSTER`-labeled issue whose plan cites one `#### Scenario:` heading absent from every active spec
- **When** the owner runs `/set-sail <issue#>`
- **Then** the session stops naming the missing heading
- **And** no test file is written
- **And** the issue still reads `MUSTER`

### Flow: Occupied tree blocks either lane

- **Given** any issue on the board labeled `UNDER SAIL`
- **When** the owner runs `/set-sail` with any target
- **Then** the session stops naming the occupying issue
- **And** no label is flipped

### Flow: Muster-review reports a verdict in the session

- **Given** an `UNDER SAIL` MUSTER voyage whose tests-only diff sits in the working tree
- **When** the owner runs `/muster-review`
- **Then** exactly one testing-arena agent reviews the diff
- **And** the session reports findings and a verdict line
- **And** no comment is posted on the issue
- **And** no `review.md` exists in the tree
- **And** nothing is staged

### Flow: Hollow test is caught

- **Given** a MUSTER diff containing a test that runs its cited flow but asserts nothing the scenario's THEN states
- **When** the owner runs `/muster-review`
- **Then** the session's verdict report lists that test as a finding
- **And** the verdict line does not read clear to land

### Flow: MUSTER landing — one commit, CI-verified, no seal

- **Given** an `UNDER SAIL` MUSTER voyage whose latest muster-review verdict read clear to land
- **And** lint and typecheck pass locally
- **When** the owner runs `/landfall`
- **And** confirms the clear verdict at the review-gate question
- **And** signs the single staged `issue-<N>:` work commit
- **And** the pushed CI run turns green
- **Then** the issue's labels read `MUSTER` and `IN PORT`, not `UNDER SAIL`
- **And** exactly one new commit exists on `origin/dev` for the voyage
- **And** no `issue-<N>: archive` seal commit exists
- **And** no summary comment is posted on the issue
- **And** the session never asked the fast-vs-verified verification question

### Flow: Missing verdict blocks the landing

- **Given** an `UNDER SAIL` MUSTER voyage with no `/muster-review` round run
- **When** the owner runs `/landfall`
- **And** answers the review-gate question that no round has run
- **Then** the session stops pointing at `/muster-review`
- **And** nothing is staged

### Flow: Red CI fixes forward with a fresh round

- **Given** a pushed MUSTER work commit whose CI run is red
- **When** the owner resumes `/landfall`
- **Then** the issue still reads `UNDER SAIL`
- **And** the session drives the fix under the same `issue-<N>:` prefix
- **And** a fresh `/muster-review` round is required before the follow-up hand-off

## No manual path — fully automated

- `map-workflow` routing-label glossary wording (`UNDER SAIL` covers both lanes; `MUSTER` entry) — normative text only; observable behavior is exercised by the flows above
