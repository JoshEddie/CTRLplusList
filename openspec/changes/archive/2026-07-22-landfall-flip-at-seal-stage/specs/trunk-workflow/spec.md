## MODIFIED Requirements

### Requirement: A change SHALL land through /landfall with an owner-chosen verification path

`/landfall` (née `/land-change`) SHALL gate on the change's persisted `review.md` **effective** latest verdict being clear to land — the latest round's verdict as amended by any `### Adjudications` subsection (the last verdict-bearing line in the latest round, per the reader rule in `reference/finding-format.md`, so an adjudication that clears the findings satisfies the gate on its own) — all `tasks.md` items complete, `openspec validate --strict` passing, and local lint and typecheck passing; the full test battery SHALL NOT be run locally by this skill. It SHALL then ask the owner once: does this change need dev verification before sealing? **Fast path** (no): archive the change, run `/finalize-spec-purposes`, stage both commits — the `issue-<N>:` work commit and the `issue-<N>: archive <change>` seal commit — as two separate owner-signed commits pushed together in one push, no CI wait. **Verified path** (yes): stage and push the work commit first, watch CI, confirm the live dev deployment with the owner, then archive and stage the seal commit. On either path `/finalize-spec-purposes` SHALL run before the seal commit is staged so its repairs ride inside it, every hand-off SHALL include the paste-ready commit message(s), and bookkeeping SHALL run the instant the change is archived — in one swoop with the archive and independent of staged/committed/pushed git state: flip the issue's label to `IN PORT` — nothing else (the milestone lives only on the `MAP` issue, stamped at map exit and owned by `map-workflow`, so landing has no milestone to touch). Landfall SHALL NOT close the issue: closing is inspection's act (`/port-inspection`, owned by `map-workflow`). Skills SHALL NOT run `git commit`: stage, state what is ready with the message, stop; a blocked signature is never retried. On red CI the change fixes forward under the same `issue-<N>:` prefix — on the verified path with the contract still unsealed, on the fast path against the sealed contract as an accepted cost. At most one change SHALL be in the apply stage at a time; an oversized change splits into multiple changes rather than multiple work commits.

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
- **THEN** the issue is flipped to `IN PORT` in the same swoop as the archive — before the seal commit is staged, signed, or pushed — and nothing else changes; it remains open for inspection to close

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
