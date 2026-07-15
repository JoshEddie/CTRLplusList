# trunk-workflow Delta

## MODIFIED Requirements

### Requirement: A change SHALL land through /landfall with an owner-chosen verification path

`/landfall` (née `/land-change`) SHALL gate on the change's persisted `review.md` latest verdict being clear to land, all `tasks.md` items complete, `openspec validate --strict` passing, and local lint and typecheck passing; the full test battery SHALL NOT be run locally by this skill. It SHALL then ask the owner once: does this change need dev verification before sealing? **Fast path** (no): archive the change, run `/finalize-spec-purposes`, stage both commits — the `issue-<N>:` work commit and the `issue-<N>: archive <change>` seal commit — as two separate owner-signed commits pushed together in one push, no CI wait. **Verified path** (yes): stage and push the work commit first, watch CI, confirm the live dev deployment with the owner, then archive and stage the seal commit. On either path `/finalize-spec-purposes` SHALL run before the seal commit is staged so its repairs ride inside it, every hand-off SHALL include the paste-ready commit message(s), and bookkeeping SHALL run eagerly at stage time: flip the issue's label to `IN PORT` — nothing else (the milestone lives only on the `MAP` issue, stamped at map exit and owned by `map-workflow`, so landing has no milestone to touch). Landfall SHALL NOT close the issue: closing is inspection's act (`/close-map`, owned by `map-workflow`). Skills SHALL NOT run `git commit`: stage, state what is ready with the message, stop; a blocked signature is never retried. On red CI the change fixes forward under the same `issue-<N>:` prefix — on the verified path with the contract still unsealed, on the fast path against the sealed contract as an accepted cost. At most one change SHALL be in the apply stage at a time; an oversized change splits into multiple changes rather than multiple work commits.

#### Scenario: Fast path lands in one push
- **WHEN** the owner answers that a doc-only change needs no dev verification
- **THEN** landfall stages the work and seal commits for signing with both messages pasted, pushes once after both signatures, and the issue leaves labeled `IN PORT` — no CI wait before sealing

#### Scenario: Verified path seals only after the live check
- **WHEN** the owner answers that the change needs dev verification
- **THEN** the seal commit is staged only after CI is green and the owner confirms the live dev deployment

#### Scenario: Landfall docks, never closes
- **WHEN** either path completes its bookkeeping
- **THEN** the issue is labeled `IN PORT` and nothing else changes — it remains open for inspection to close

#### Scenario: Skills never commit
- **WHEN** a landing reaches a commit point and the owner is not present to sign
- **THEN** the skill leaves the tree staged with the message and ends its turn; it does not attempt or retry the commit

### Requirement: /landfall SHALL be state-driven and self-healing

`/landfall` SHALL determine its position from repository state on every invocation and resume mid-landing without relying on session memory. Phase detection SHALL recognize at minimum: work unstaged (start), work staged/signed but unpushed (push and proceed), work pushed awaiting CI or live check (verified path wait), seal staged but unsigned (re-report the hand-off), and pushed-but-bookkeeping-incomplete (finish `IN PORT` labeling silently). Any later invocation SHALL sweep incomplete bookkeeping from a prior session before starting new work.

#### Scenario: Resumable across sessions
- **WHEN** a session ends after the work commit is pushed and `/landfall` is invoked later
- **THEN** the skill detects the pushed-but-unsealed state and resumes at the verification wait

#### Scenario: Leftover bookkeeping is swept
- **WHEN** `/landfall` is invoked and a previously-landed issue is missing its `IN PORT` label
- **THEN** the skill completes that labeling before handling the current change
