# trunk-workflow Specification

## Purpose
Defines the change lifecycle on `dev` once work departs the definition layer: how a `CHARTED` issue becomes an OpenSpec change (`/embark`), how implementation is gated and entered (`/set-sail`), how a reviewed change lands through an owner-chosen verification path — a fast path of two signed commits in one push, or a verified path sealing only after green CI and a live dev check (`/landfall`) — and the trunk rules that make review-before-commit safe: one change in the apply stage at a time, CI on every dev push, skills never committing, branches reserved as an escape hatch for long-running work.
## Requirements
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

### Requirement: /set-sail SHALL gate the apply stage and wrap opsx:apply

`/set-sail` SHALL be the only route into implementing a change: it gates on one-change-mid-apply, flips the issue to `UNDER SAIL`, states the mid-voyage disciplines, and delegates the task loop to `/opsx:apply`.

#### Scenario: Mid-apply change blocks a second voyage
- **WHEN** `/set-sail` runs while an active change in `openspec/changes/` has unchecked `tasks.md` items alongside uncommitted code changes
- **THEN** the skill stops before touching anything, naming the mid-apply change

#### Scenario: Implemented change under review does not block
- **WHEN** `/set-sail` runs while the tree holds only a fully-implemented change awaiting review or landing plus the new change's artifacts
- **THEN** the skill proceeds, flips the new issue `CHARTED` → `UNDER SAIL`, and enters apply

#### Scenario: Under sail is the single occupied-tree beacon
- **WHEN** `/set-sail` flips the issue to `UNDER SAIL`
- **THEN** that label is the board's only "the tree is occupied" signal

#### Scenario: Discipline defers discovery routing to the definition layer
- **WHEN** `/set-sail` states the mid-voyage disciplines at the start of a voyage
- **THEN** it states that a discovery is never folded into the active change, that charting onto an open map runs through `/anchor` (whose charter move is owned by `anchor-and-run-aground`), and that a mirage stops work and fires `/run-aground` (owned by `anchor-and-run-aground`) — without mandating `OFF THE MAP` as the only route or restating the charter criteria

#### Scenario: Embark flips no label
- **WHEN** `/embark` produces proposal artifacts
- **THEN** no label is flipped — proposal artifacts are tree state, authoritatively recorded by the change directory

### Requirement: A change SHALL land through /landfall with an owner-chosen verification path

`/landfall` (née `/land-change`) SHALL gate on the change's persisted `review.md` **effective** latest verdict being clear to land — the latest round's verdict as amended by any `### Adjudications` subsection (the last verdict-bearing line in the latest round, per the reader rule in `reference/finding-format.md`, so an adjudication that clears the findings satisfies the gate on its own) — all `tasks.md` items complete, `openspec validate --strict` passing, and local lint and typecheck passing; the full test battery SHALL NOT be run locally by this skill. It SHALL then ask the owner once: does this change need dev verification before sealing? **Fast path** (no): archive the change, run `/finalize-spec-purposes`, stage both commits — the `issue-<N>:` work commit and the `issue-<N>: archive <change>` seal commit — as two separate owner-signed commits pushed together in one push, no CI wait. **Verified path** (yes): stage and push the work commit first, watch CI, confirm the live dev deployment with the owner, then archive and stage the seal commit. On either path `/finalize-spec-purposes` SHALL run before the seal commit is staged so its repairs ride inside it, every hand-off SHALL include the paste-ready commit message(s), and bookkeeping SHALL run the instant the change is archived — in one swoop with the archive and independent of staged/committed/pushed git state: flip the issue's label to `IN PORT` and post one summary comment on the landed issue itself — a short user-visible-changes summary when the change touched UI, a "no user-visible changes" one-liner otherwise — and nothing else (the milestone lives only on the `MAP` issue, stamped at map exit and owned by `map-workflow`, so landing has no milestone to touch; the comment is harvested later by the map's e2e scout, owned by `map-workflow` — landfall never locates or writes to the scout ticket). Landfall SHALL NOT close the issue: closing is inspection's act (`/port-inspection`, owned by `map-workflow`). Skills SHALL NOT run `git commit`: stage, state what is ready with the message, stop; a blocked signature is never retried. On red CI the change fixes forward under the same `issue-<N>:` prefix — on the verified path with the contract still unsealed, on the fast path against the sealed contract as an accepted cost. At most one change SHALL be in the apply stage at a time; an oversized change splits into multiple changes rather than multiple work commits.

#### Scenario: Fast path lands in one push
- **WHEN** the owner answers that a doc-only change needs no dev verification
- **THEN** landfall stages the work and seal commits for signing with both messages pasted, pushes once after both signatures, and the issue leaves labeled `IN PORT` — no CI wait before sealing

#### Scenario: An adjudication clears the review gate
- **WHEN** the latest round's `**Verdict:**` line reads `findings remain` but its `### Adjudications` subsection re-dispositions every open `Fix now` finding and carries a `clear to land` verdict
- **THEN** landfall's review gate reads the effective verdict as `clear to land` and does not block on the round's raw verdict line

#### Scenario: Verified path seals only after the live check
- **WHEN** the owner answers that the change needs dev verification
- **THEN** the seal commit is staged only after CI is green and the owner confirms the live dev deployment

#### Scenario: The label flips at archive
- **WHEN** either path archives the change
- **THEN** the issue is flipped to `IN PORT` and the summary comment is posted in the same swoop as the archive — before the seal commit is staged, signed, or pushed — and nothing else changes; it remains open for inspection to close

#### Scenario: Non-UI change posts the one-liner
- **WHEN** a landed change touched no user-visible surface
- **THEN** bookkeeping posts a "no user-visible changes" one-liner on the issue — every landing posts exactly one summary comment, so the scout's record has no ambiguous silence

#### Scenario: Skills never commit
- **WHEN** a landing reaches a commit point and the owner is not present to sign
- **THEN** the skill leaves the tree staged with the message and ends its turn; it does not attempt or retry the commit

### Requirement: /landfall SHALL be state-driven and self-healing

`/landfall` SHALL determine its position from repository state on every invocation and resume mid-landing without relying on session memory. Phase detection SHALL recognize at minimum: work unstaged (start), work staged/signed but unpushed (push and proceed), work pushed awaiting CI or live check (verified path wait), and seal staged but unsigned (re-report the hand-off). The label flip is atomic with archive and therefore cannot lag it, so landfall carries no post-push bookkeeping phase and no leftover-bookkeeping sweep — a stranded `IN PORT` (an abandoned seal whose archive commit never reached `origin/dev`) is reconciled by `/port-inspection`, not by landfall.

#### Scenario: Resumable across sessions
- **WHEN** a session ends after the work commit is pushed and `/landfall` is invoked later
- **THEN** the skill detects the pushed-but-unsealed state and resumes at the verification wait

#### Scenario: Landfall carries no bookkeeping sweep
- **WHEN** `/landfall` is invoked after a prior landing whose seal was abandoned, leaving an issue labeled `IN PORT` with no archive commit on `origin/dev`
- **THEN** landfall does not attempt to detect or reconcile that label — it starts the current change normally, leaving the stranded label for `/port-inspection` to flip back

### Requirement: CI SHALL run on direct pushes to dev

The CI workflow SHALL trigger on `push` to `dev` in addition to its existing triggers, running the same battery as a pull request, so that trunk landings are verified without a PR. The trigger set SHALL NOT double-run a single event.

#### Scenario: Trunk landing runs the battery
- **WHEN** `/land-change` pushes a landing commit directly to `dev`
- **THEN** the full CI battery runs against that push without any PR existing

### Requirement: Branch-and-PR SHALL remain the escape hatch for long-running work

Large or slow features MAY still be developed on a feature branch and reviewed through `/spec-review`'s PR invocation. The trunk rules in this capability apply to trunk landings and SHALL NOT forbid deliberate branch work.

#### Scenario: Deliberate branch work stays supported
- **WHEN** the owner develops a large feature on a branch and opens a PR to `dev`
- **THEN** `/spec-review <PR>` reviews it exactly as before, including the CI rollup read

