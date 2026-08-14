## ADDED Requirements

### Requirement: Tests-only coverage chunks SHALL run the MUSTER lane with no OpenSpec change

- **Qualifies when** — a chunk SHALL run the MUSTER lane when every test it adds verifies a scenario already stated in an active spec (`openspec/specs/<capability>/spec.md`) and it changes zero production code: no new capability, no spec delta, nothing to seal.
- **Label** — such chunks SHALL carry the `MUSTER` routing label from birth (birth rule owned by `issue-cut.md`, per `map-workflow`), through the voyage, and into port. The marker never comes off, keeping a MUSTER voyage distinguishable from a charted one.
- **No change directory** — SHALL NOT get one, and SHALL NOT board `/embark`, whose allowlist admits only `CHARTED`.
- **Plan** — SHALL live in the scout-cut ticket body: coverage rows plus deliberate skips.
- **Traceability** — SHALL flow test → spec via an in-file citation header naming the capability and scenario each test file verifies, never spec → test.
- **Review and landing** — `/muster-review`, then `/landfall`'s MUSTER branch.

#### Scenario: A MUSTER chunk never gets a change directory
- **WHEN** a `MUSTER`-labeled issue is picked up for implementation
- **THEN** work enters through `/set-sail`'s MUSTER lane with the ticket body as the plan — no `openspec/changes/` directory is created and `/embark` is never invoked

#### Scenario: Production code disqualifies the lane
- **WHEN** implementing a MUSTER chunk turns out to require any production-code change
- **THEN** the voyage stops back to the owner — the work no longer qualifies as tests-only and must route through the normal charted flow

### Requirement: /set-sail SHALL run the MUSTER lane for MUSTER-labeled issues

When `/set-sail`'s argument resolves to a `MUSTER`-labeled issue rather than an OpenSpec change, the skill SHALL:

- **Stamp** — add `UNDER SAIL`; `MUSTER` is never removed.
- **Plan** — treat the ticket body as the plan.
- **Staleness check** — grep every `#### Scenario:` heading the plan cites against active specs; on any missing heading, stop back to the owner as a stale plan.
- **Read `TESTING.md` in full** — before writing any test.
- **Citation header** — ensure every test file carries one, naming the capability and scenario it verifies.
- **Implement inline** — no `/opsx:apply` delegation, no task tracking.

The lane SHALL never commit and never stage unasked.

#### Scenario: MUSTER lane enters inline implementation
- **WHEN** `/set-sail 297` resolves issue 297 labeled `MUSTER` and every cited scenario heading exists in active specs
- **THEN** the issue gains `UNDER SAIL` alongside `MUSTER` and implementation proceeds inline from the ticket-body plan — no change directory, no `/opsx:apply`

#### Scenario: Stale plan stops the voyage
- **WHEN** the staleness grep finds a cited `#### Scenario:` heading absent from every active spec
- **THEN** the skill stops before writing any test and reports the missing heading to the owner — the plan is stale

### Requirement: A MUSTER voyage SHALL land through /landfall's no-seal branch, always CI-verified

When `/landfall` resolves a MUSTER voyage — an issue labeled both `MUSTER` and `UNDER SAIL` — it SHALL gate on owner confirmation that the latest `/muster-review` round's verdict reads clear to land, on local lint passing, and on local typecheck passing. No `review.md`, no `tasks.md`, no `openspec validate`.

- **Verdict gate** — the verdict is reported in the review session, not persisted; no round, or a non-clear verdict, stops the landing pointing at `/muster-review`.
- **No verification question** — a MUSTER landing is always CI-verified, because the e2e battery is the deliverable's own verification and has no live click-test.
- **Flow**
  - stage the work — never blanket-stage unasked
  - hand off the single paste-ready `issue-<N>:` work commit message, then stop for the owner's signature
  - after the signature, push to `dev` and watch CI
  - on green, remove `UNDER SAIL` and add `IN PORT`; `MUSTER` stays as the lane marker
- **No summary comment** — this chunk is the e2e scout's own output, with no later scout to feed.
- **No seal commit** — nothing was proposed, so nothing is archived.
- **Red CI** — the voyage fixes forward under the same `issue-<N>:` prefix, with a fresh `/muster-review` round before the follow-up hand-off.

#### Scenario: MUSTER landing is one commit, no seal
- **WHEN** `/landfall` runs on an `UNDER SAIL` MUSTER issue, the owner confirms the latest muster-review verdict is clear, and lint and typecheck pass
- **THEN** it stages the tests-only work, hands off one `issue-<N>:` commit message, and after the signature pushes and watches CI — no verification question, no archive, no seal commit, no summary comment

#### Scenario: IN PORT waits for green CI
- **WHEN** the MUSTER work commit is pushed and CI is still pending or red
- **THEN** the issue stays `UNDER SAIL` — the `IN PORT` flip happens only on green CI, and red CI fixes forward under the same prefix with a fresh review round

#### Scenario: Missing muster-review verdict blocks the landing
- **WHEN** `/landfall` runs on a MUSTER voyage and the owner cannot confirm a `/muster-review` round ran, or the latest verdict is not clear to land
- **THEN** the skill stops before staging anything and points at `/muster-review`

## MODIFIED Requirements

### Requirement: /set-sail SHALL gate the apply stage and wrap opsx:apply

`/set-sail` SHALL be the only route into occupying the tree.

- **Gate** — it SHALL hard-stop when ANY issue is labeled `UNDER SAIL`, the board's single "the tree is occupied" beacon shared by both lanes, and SHALL NOT gate on tree-state heuristics.
- **Lanes** — its argument SHALL resolve to either an OpenSpec change (the charted lane: state the mid-voyage disciplines, delegate the task loop to `/opsx:apply`) or a `MUSTER`-labeled issue (the MUSTER lane, per its own requirement).
- **Stamp** — the same two acts in both lanes: add `UNDER SAIL`, and remove `CHARTED` if present. `MUSTER` is never removed.

#### Scenario: An under-sail voyage blocks a second voyage
- **WHEN** `/set-sail` runs while any issue — charted or MUSTER — is labeled `UNDER SAIL`
- **THEN** the skill stops before touching anything, naming the occupying issue

#### Scenario: Implemented change under review does not block
- **WHEN** `/set-sail` runs while the tree holds only a fully-implemented change awaiting review or landing plus the new change's artifacts, and no issue is labeled `UNDER SAIL`
- **THEN** the skill proceeds, adds `UNDER SAIL` to the new issue (removing `CHARTED`), and enters apply

#### Scenario: Under sail is the single occupied-tree beacon
- **WHEN** `/set-sail` stamps `UNDER SAIL` — adding it, removing `CHARTED` if present
- **THEN** that label is the board's only "the tree is occupied" signal, and set-sail's own gate reads it and nothing else

#### Scenario: Discipline defers discovery routing to the definition layer
- **WHEN** `/set-sail` states the mid-voyage disciplines at the start of a voyage
- **THEN** it states that a discovery is never folded into the active change, that charting onto an open map runs through `/anchor` (whose charter move is owned by `anchor-and-run-aground`), and that a mirage stops work and fires `/run-aground` (owned by `anchor-and-run-aground`) — without mandating `OFF THE MAP` as the only route or restating the charter criteria

#### Scenario: Embark flips no label
- **WHEN** `/embark` produces proposal artifacts
- **THEN** no label is flipped — proposal artifacts are tree state, authoritatively recorded by the change directory

### Requirement: A change SHALL land through /landfall with an owner-chosen verification path

`/landfall` (née `/land-change`) SHALL gate on the change's persisted `review.md` **effective** latest verdict being clear to land, all `tasks.md` items complete, `openspec validate --strict` passing, and local lint and typecheck passing. The full test battery SHALL NOT be run locally by this skill.

- **Effective verdict** — the latest round's verdict as amended by any `### Adjudications` subsection: the last verdict-bearing line in the latest round, per the reader rule in `reference/finding-format.md`, so an adjudication that clears the findings satisfies the gate on its own.
- **Gate scope** — the `review.md` verdict gate binds changes landed from OpenSpec change directories; a MUSTER landing gates on owner confirmation of the latest `/muster-review` verdict instead, per the MUSTER landing requirement.
- **The question** — it SHALL then ask the owner once: does this change need dev verification before sealing?
- **Fast path** (no) — archive the change, run `/finalize-spec-purposes`, stage both commits (the `issue-<N>:` work commit and the `issue-<N>: archive <change>` seal commit) as two separate owner-signed commits pushed together in one push, no CI wait.
- **Verified path** (yes) — stage and push the work commit first, watch CI, confirm the live dev deployment with the owner, then archive and stage the seal commit.
- **Either path** — `/finalize-spec-purposes` SHALL run before the seal commit is staged so its repairs ride inside it, and every hand-off SHALL include the paste-ready commit message(s).
- **Bookkeeping** — SHALL run the instant the change is archived, in one swoop with the archive and independent of staged/committed/pushed git state: flip the issue's label to `IN PORT`, and post one summary comment on the landed issue itself — a short user-visible-changes summary when the change touched UI, a "no user-visible changes" one-liner otherwise — and nothing else.
  - The milestone lives only on the `MAP` issue, stamped at map exit and owned by `map-workflow`, so landing has no milestone to touch.
  - The comment is harvested later by the map's e2e scout, owned by `map-workflow`; landfall never locates or writes to the scout ticket.
- **Not closing** — landfall SHALL NOT close the issue: closing is inspection's act (`/port-inspection`, owned by `map-workflow`).
- **Never commit** — skills SHALL NOT run `git commit`: stage, state what is ready with the message, stop. A blocked signature is never retried.
- **Red CI** — the change fixes forward under the same `issue-<N>:` prefix: on the verified path with the contract still unsealed, on the fast path against the sealed contract as an accepted cost.
- **One voyage at a time** — at most one SHALL occupy the tree, per the `UNDER SAIL` beacon shared with the MUSTER lane; an oversized change splits into multiple changes rather than multiple work commits.

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
