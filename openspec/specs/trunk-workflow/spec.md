# trunk-workflow Specification

## Purpose
TBD - created by archiving change adopt-trunk-flow. Update Purpose after archive.
## Requirements
### Requirement: /start-change SHALL gate on trunk preconditions and route by issue label

The `/start-change <issue#>` skill SHALL hard-stop unless the working copy is on `dev`, the working tree is clean, and `dev` is up to date with its remote. It SHALL read the issue via `gh issue view`. When the issue carries an `IDEA` or `EXPLORE NEEDED` label, the skill SHALL run an OpenSpec explore session before proposing; when the issue carries a `HOLD` label, the skill SHALL surface the most recent hold comment and ask the owner whether to re-explore before proceeding; otherwise it SHALL run propose seeded from the issue body. The skill SHALL NOT create commits.

#### Scenario: Dirty tree blocks start
- **WHEN** `/start-change 42` runs with uncommitted changes in the working tree
- **THEN** the skill stops before touching the issue, reporting that the in-flight change must land (or be stashed deliberately) first

#### Scenario: Unlabeled issue goes straight to propose
- **WHEN** `/start-change 42` runs against an issue with no routing label
- **THEN** the skill runs propose using the issue body as the seed, with no explore session

#### Scenario: EXPLORE NEEDED routes through explore
- **WHEN** the issue carries the `EXPLORE NEEDED` label
- **THEN** the skill enters an explore session before any proposal artifact is drafted

#### Scenario: HOLD issue requires explicit confirmation
- **WHEN** `/start-change` runs against an issue labeled `HOLD`
- **THEN** the skill surfaces the hold comment and proceeds to re-explore only on the owner's explicit yes

### Requirement: Explore outcomes SHALL be written back to the issue

When `/start-change` runs an explore session, the distilled outcome SHALL be written into the issue body (the issue remains the single source propose reads) and the routing label (`IDEA` / `EXPLORE NEEDED`) removed before propose runs. When an `IDEA` explore concludes the idea is not viable (never viable, not currently viable, or not worth the churn), the skill SHALL post the findings and rationale as an issue comment, swap the label to `HOLD`, leave the issue open, and stop without creating a change.

#### Scenario: Viable explore updates the issue and proposes
- **WHEN** an explore session for an `EXPLORE NEEDED` issue reaches a buildable shape
- **THEN** the issue body is updated with the distilled outcome, the label is removed, and propose runs from the updated body

#### Scenario: Non-viable IDEA is parked, not closed
- **WHEN** an `IDEA` explore concludes the idea should not move forward now
- **THEN** the skill comments the findings and why, replaces `IDEA` with `HOLD`, leaves the issue open, and creates no change

### Requirement: A change SHALL land in two phases — a work commit verified live, then an archive commit

One OpenSpec change SHALL occupy the working tree at a time. Landing SHALL comprise two owner-signed commits: a work commit (`issue-<N>:` prefixed) carrying the implementation, and — only after the dev CI run is green and the owner has verified the change on the live dev deployment — an archive commit (`issue-<N>: archive <change>`) carrying the archived change directory including its `review.md`. The change SHALL remain active (spec delta editable) until the archive commit; no artifact commit SHALL be made at propose time. A change whose work phase would warrant multiple commits SHALL instead be split into multiple changes. Skills SHALL NOT run `git commit`: at each commit point they SHALL stage, state what is ready, and stop — a blocked or unattended signature SHALL never be retried.

#### Scenario: Archive follows live verification
- **WHEN** `/land-change` lands change `add-foo` for issue 42
- **THEN** dev first gains an `issue-42:` work commit, and the `issue-42: archive add-foo` commit (containing `openspec/changes/archive/*-add-foo/` with its `review.md`) is created only after CI is green and the owner confirms the live dev deploy

#### Scenario: Live verification changes the design before it seals
- **WHEN** click-testing the deployed work commit reveals the specced behavior itself should differ
- **THEN** the still-active change's spec delta is amended and the fix lands as a further `issue-42:` commit — no fresh propose→archive cycle is needed because the contract has not yet sealed

#### Scenario: Skills never commit
- **WHEN** a landing phase reaches a commit point and the owner is not present to sign
- **THEN** the skill leaves the tree staged with instructions and ends its turn; it does not attempt or retry the commit

#### Scenario: Oversized change is split
- **WHEN** an in-flight change grows to where a reviewer would want its work committed in parts
- **THEN** the disposition is to split it into separate OpenSpec changes, not to land multiple work commits under one change

### Requirement: /land-change SHALL be a state-driven two-phase command

`/land-change` SHALL determine its phase from repository state. **Land phase** (gated change, work not pushed): verify the change's persisted `review.md` exists with its latest round's verdict clear to land, every `tasks.md` item complete, `openspec validate <name> --strict` passing, and local lint and typecheck passing; then stage the work commit for the owner to sign and, once signed, push to `dev` and report the CI run to watch. **Seal phase** (work pushed, CI green, change dir still active): confirm with the owner that the live dev deployment checks out, archive the change, stage the archive commit, and once signed and pushed run `/finalize-spec-purposes`, assign the issue to the currently-open milestone, and close the issue. On red CI or a failed live check the skill SHALL drive a fix-forward commit under the same `issue-<N>:` prefix and re-enter the wait; bookkeeping SHALL NOT run before the seal. The full test battery SHALL NOT be run locally by this skill. Sessions MAY end between phases; re-invocation SHALL resume from state.

#### Scenario: Missing review blocks landing
- **WHEN** `/land-change` runs and the change directory has no `review.md`, or its latest verdict is not clear
- **THEN** the skill stops before staging anything and names the missing gate

#### Scenario: Seal phase completes bookkeeping
- **WHEN** `/land-change` runs with the work commit pushed, CI green, and the owner confirming the live check
- **THEN** the change archives, the archive commit is staged for signing, and after push the skill runs `/finalize-spec-purposes`, assigns the milestone, and closes the issue

#### Scenario: Red CI defers the seal and fixes forward
- **WHEN** the dev CI run for the work commit fails
- **THEN** the change stays unarchived and the issue open, and the fix lands as a follow-up `issue-<N>:` commit re-watched by the skill

#### Scenario: Resumable across sessions
- **WHEN** the session ends after the work commit is pushed and `/land-change` is invoked later in a fresh session
- **THEN** the skill detects the pushed-but-unarchived state and enters the seal phase directly

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

