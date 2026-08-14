# Proposal: adopt-trunk-flow

## Why

The current per-change pipeline (issue → branch → explore → propose → apply → test battery → PR → spec-review → edits → re-review → archive → merge) double-tracks every change as both a git branch/PR and an OpenSpec change, and serializes a solo developer through ceremony sized for team review. It slows feature delivery and makes switching between problems expensive, while the repo's real safety comes from OpenSpec contracts and the review skills — not from the PR mechanics. Separately, the repo carries release artifacts nothing reads (`app/changelog/releases.ts` has zero importers) and a CI config whose comment assumes "trunk branches always flow through PRs" — an assumption this redesign removes.

## What Changes

- Adopt a trunk-based workflow on `dev`: one OpenSpec change at a time in the working tree, reviewed **before** commit (staged diff), landed in **two phases** — an `issue-N:` work commit pushed to `dev` and verified on the live dev deployment (CI + click-testing), then an archive commit that seals the contract. Skills never run `git commit`; every commit is a stage-and-hand-off to the owner. Branches/PRs into `dev` become an escape hatch for large slow features, not the default.
- New skill `/start-change <issue#>`: preconditions (on `dev`, clean tree, pulled); reads the issue; routes by label (`IDEA`/`EXPLORE NEEDED` → explore session, write distilled outcome back to the issue, strip the label; negative IDEA outcome → findings comment + `HOLD` label, issue stays open) then runs propose seeded from the issue body. Never commits.
- New skill `/land-change`, state-driven across two phases: **land** — gates (latest `review.md` verdict clear, tasks all `[x]`, `openspec validate --strict`, local lint + typecheck), stage the work commit, push to `dev`, report the CI run; **seal** — after green CI and owner click-testing of the live dev deploy, archive, stage the archive commit, then `/finalize-spec-purposes`, milestone-assign, close the issue. Red CI or failed live check → fix-forward under the same prefix.
- New skill `/recheck-review`: lightweight inline single-pass verifier of a prior review's open `Fix now` findings against the fix delta; appends rounds to the persisted report; escalates to a full re-review when fixes outgrow the original diff. Works against both spec-review and release-review reports via a shared report header.
- `/spec-review` updated: no-arg default scope becomes `--staged` (was branch-vs-`dev`); persists its report to `openspec/changes/<name>/review.md` with a machine-readable header. PR invocation and its CI read remain first-class.
- New skill `/release-review` (ported from the budget repo, adapted): the sole gate for `dev → release-branch` PRs. Preflight (release base + milestone), five dimensions (milestone completeness, cross-feature interaction risk, migration ordering, OpenSpec state clean, version bump matches milestone — drafting/staging the bump when missing), CI rollup read, report persisted to `openspec/reviews/<version>.md`. No changelog phase.
- **BREAKING (process):** per-change PRs into `dev` are no longer required; `release-check` and `council` (user-global skills) leave the workflow; issue close moves to land time (milestone tracks release-to-prod).
- Remove the dead changelog: delete `app/changelog/` and its carve-outs (eslint file-size exemption, coverage exclude, `testing-foundation` spec mentions).
- CI workflow: add `push: branches: [dev]` trigger so direct pushes to `dev` run the full battery `/land-change` watches.
- Rewrite the CLAUDE.md workflow section to describe the trunk flow.

## Capabilities

### New Capabilities

- `trunk-workflow`: the change lifecycle on `dev` — start-change and land-change skill contracts, one-change-at-a-time and single-commit-per-change rules, label routing (`IDEA`/`EXPLORE NEEDED`/`HOLD`), issue close and milestone assignment at land, CI-on-dev-push requirement.
- `recheck-review`: the lightweight finding-resolution verifier — report-header-driven delta computation, round appending, escalation rules.
- `release-review`: the `dev → release-branch` gate — preflight gates, the five review dimensions, bump drafting, report persistence.

### Modified Capabilities

- `spec-review`: no-arg default scope changes from branch-vs-`dev` to `--staged`; report persistence to `openspec/changes/<name>/review.md` with the shared header becomes a requirement.
- `testing-foundation`: `app/changelog/releases.ts` disappears from the coverage-exclusion list and the file-size scope carve-outs (the file is deleted).

## Impact

- **Skills:** new `.claude/skills/{start-change,land-change,recheck-review,release-review}/`; updated `.claude/skills/spec-review/` (SKILL.md + `reference/finding-format.md` gains the report header/round format).
- **Deleted code:** `app/changelog/releases.ts` (no importers); its eslint carve-out in `eslint.config.mjs` and coverage exclude.
- **CI:** `.github/workflows/ci.yml` gains a `dev` push trigger.
- **Docs:** CLAUDE.md workflow section rewritten; `openspec/reviews/` directory convention introduced.
- **GitHub state (at apply):** `HOLD` label created. Out of scope: deleting user-global `~/.claude/skills/{council,release-check}` (owner housekeeping).
