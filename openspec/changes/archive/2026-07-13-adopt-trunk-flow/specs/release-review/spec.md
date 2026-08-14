# release-review Delta

## Purpose

Defines the sole review gate for `dev → release-branch` PRs: an inline integration review of the release cut as a whole — milestone completeness, cross-feature interaction, migration ordering, OpenSpec state, and version bump — with a persisted per-release report that doubles as the repo's release record.

## ADDED Requirements

### Requirement: Preflight SHALL hard-gate on release base and milestone

`/release-review [PR#]` SHALL resolve the PR (the argument, or the current branch's open PR) and stop entirely — no review dimensions run — unless the PR's base branch matches the release pattern (`^\d+\.\d+(\.x)?$`) and the PR carries a GitHub milestone. The milestone title is carried forward as the target version. On a base mismatch the skill SHALL direct trunk-landing review to `/spec-review`.

#### Scenario: Non-release base stops the run
- **WHEN** `/release-review` is invoked against a PR whose base is `dev`
- **THEN** the skill stops at preflight and points to `/spec-review`

#### Scenario: Missing milestone stops the run
- **WHEN** the PR has no milestone
- **THEN** the skill stops, instructing the owner to tag one (creating it if needed) and re-run

### Requirement: The review SHALL cover five dimensions inline

The review SHALL run as a single inline pass (no sub-agents, no workflow) over exactly five dimensions:

1. **Milestone completeness** — every issue in the milestone is closed with its work present in the PR's commit range, and no substantial diff content lacks a milestone home.
2. **Cross-feature interaction risk** — at diff-stat level, bundled features touching shared surfaces (nav, cache tags, shared components under `app/ui/`, `lib/`) are flagged for a look; disjoint features pass silently.
3. **Migration ordering** — new Drizzle migration files are sequential with no divergent heads or duplicate prefixes; stated N/A when the release has no migrations.
4. **OpenSpec state clean** — working-copy `openspec list` reports no active changes and repo-level `openspec validate --strict` passes; any in-flight change is a finding (land it or it waits for the next cut).
5. **Version bump** — `package.json`'s version matches the milestone title.

The skill SHALL NOT re-litigate findings from the bundled changes' own reviews and SHALL NOT include a changelog phase.

#### Scenario: Unlanded change blocks the cut
- **WHEN** `openspec list` shows an active change at review time
- **THEN** the review raises a finding that the change must land or be excluded from this cut

#### Scenario: Open milestone issue is a finding
- **WHEN** an issue assigned to the milestone is still open
- **THEN** the review flags milestone incompleteness

#### Scenario: No changelog work occurs
- **WHEN** the review completes
- **THEN** no changelog artifact is drafted or requested

### Requirement: A missing version bump SHALL be drafted by the skill and committed by the owner

When the version bump is absent or mismatched, the skill SHALL draft and stage the `package.json` bump to the milestone title and request that the owner commit it (commit signing is the owner's act). The skill SHALL NOT commit, push, or merge anything itself.

#### Scenario: Bump is staged, not committed
- **WHEN** the review finds `package.json` behind the milestone version
- **THEN** the skill stages the corrected version and asks the owner to commit, and the finding is resolved on re-check rather than by the skill committing

### Requirement: Deploy readiness SHALL be absorbed via the CI rollup read

After the dimensions run, the skill SHALL read the PR's CI check rollup via `gh`. A red rollup is a blocking finding; a pending rollup SHALL be reported as unverified and the verdict SHALL NOT claim ready-to-cut on its basis. There is no separate downstream release gate.

#### Scenario: Red CI blocks the cut
- **WHEN** the PR's check rollup reports a failure
- **THEN** the verdict is not ready, citing the failing check

### Requirement: The report SHALL be persisted per release with the shared header

The skill SHALL emit findings in the review family's shared finding format and persist the report to `openspec/reviews/<version>.md`, opening with the shared machine-readable header (review type, target milestone/version, anchor sha, diff source, round). The verdict SHALL be `ready to cut` or `not ready` (blockers listed), where only open `Fix now` findings block. Subsequent rounds are appended by `/recheck-review`.

#### Scenario: Report lands in openspec/reviews
- **WHEN** `/release-review` completes for milestone `1.4.0`
- **THEN** `openspec/reviews/1.4.0.md` exists, starting with the shared header and containing the findings table and verdict
