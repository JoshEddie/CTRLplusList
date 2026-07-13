# Design: adopt-trunk-flow

## Context

Today every change runs issue → branch → explore → propose → apply → gates → PR → spec-review → edits → (re-review) → archive → merge. The branch/PR layer duplicates the segmentation OpenSpec already provides, and the interview + review machinery already scales itself (grill-me depth tracks blast radius). The repo's downstream pipeline is `dev → release-*.*.x → main`; council/release-check (user-global, council-era) are unused here. CI triggers only on `pull_request` and push to `main` — direct dev pushes run nothing. `app/changelog/releases.ts` is dead data (zero importers). The `spec-review` capability spec is normative and already requires fan-out orchestration, bundled briefs, fixed report contract; this change modifies its scope defaults and adds persistence without touching the fan-out contract.

Constraint from the owner: commits are signature-signed and the password prompt requires the owner at the screen — an agent attempting `git commit` unattended strands itself retrying a blocked signature. Skills therefore never commit: every commit is an explicit hand-off (stage, report what's ready, stop). Commits themselves are cheap when the owner is present. A second constraint surfaced late: `dev` has a live deployed app, giving instant manual verification of every landing.

## Goals / Non-Goals

**Goals:**
- Minimize wall-clock and ceremony per change while keeping OpenSpec coverage of *every* change, however minor.
- Make switching between problems cheap (no branch juggling, no rebases, no stash discipline).
- Keep review rigor: every change is reviewed pre-commit; every release cut is gated.
- Persist review history as part of the change record.

**Non-Goals:**
- Multi-change concurrency in one working tree (explicitly serialized; branches remain the escape hatch for long-running work).
- Automating the release→main merge (plain merge after release-review ready verdict).
- Test-battery changes (the five gates stay; only *where* they run moves).
- Deleting user-global `council`/`release-check` skills (owner housekeeping outside the repo).

## Decisions

### D1 — Trunk flow with review-before-commit

Work happens directly on `dev` in the working tree; `/spec-review` runs on the **staged** diff before any commit exists. Staged = reviewed baseline, unstaged = current fix round (matches the owner's existing staged-vs-unstaged habit). Rejected: commit-prefix-scoped review of interleaved trunk commits (patch-stream diffs, needs enforcement hooks) and worktree-per-change (rebase overhead killed it in practice).

### D2 — Two-phase landing: work commit verified live, then archive commit

Landing is two owner-signed commits. **Land phase:** the `issue-N:` work commit pushes the implementation to `dev`, which deploys the live dev app and runs CI. **Seal phase:** only after CI is green and the owner has click-tested the live deploy does the change archive, landing as a second `issue-N: archive <change>` commit (carrying the archived change dir including `review.md`). Rationale: archive is the moment the spec delta becomes canonical — verification on the live deploy must precede it, so that "seeing it live changed the design" is still a cheap spec-delta edit inside active-change latitude rather than a fresh propose→archive cycle. A bug found in click-testing is a fix-forward `issue-N:` commit plus a recheck round; only a *design* realization touches the (still-active) spec delta. No propose-time commit: it buys only backup, and the OpenSpec-state release dimension works off the working copy regardless. A change whose work phase would warrant multiple commits is two changes. Rejected: single commit carrying work + archive together (seals the contract before any live verification — the one thing archive-last protects against); local-only verification via `dev:local` (not the deployed environment).

Skills never run `git commit`. At each commit point the skill stages, states exactly what is ready to commit, and stops — resuming on the next invocation. A blocked or absent signature is never retried in a loop.

### D3 — CI ordering: push first, bookkeeping after seal

Land-phase push is gated only on: review verdict clear, tasks `[x]`, `validate --strict`, local lint + typecheck (seconds). The slow battery runs on GitHub after the push, in parallel with the owner's click-testing of the live deploy. Bookkeeping — `/finalize-spec-purposes`, milestone assignment, issue close — runs in the seal phase, after archive. `/land-change` is one command, state-driven: gated-but-unpushed change → land phase; pushed change with green CI and an unarchived dir → seal phase (asks the owner to confirm the click-test passed). Sessions may end between phases; re-invocation resumes from state. Red CI or a failed click-test → fix-forward commit under the same prefix, re-watched. Requires the new `push: branches: [dev]` CI trigger; no double-run since per-change dev PRs stop existing. Rejected: running the full battery locally pre-push (reintroduces the wait this change exists to remove).

### D4 — Review reports are persisted artifacts with a shared header

`/spec-review` writes `openspec/changes/<name>/review.md`; `/release-review` writes `openspec/reviews/<version>.md`. Both open with a machine-readable header (`review:` type, `target:`, `anchor:` sha, `diff-source:`, `round:`), defined once in `spec-review/reference/finding-format.md` (already the family's shared format reference — release-review reads it format-only, no runtime dependency; precedent set in the budget repo). The report is the contract between three independent skills: the review writes round 1, `/recheck-review` appends rounds, `/land-change` gates on the latest verdict. Archive moves `review.md` with the change (verified: `openspec validate --strict` tolerates extra files in a change dir). Rejected: report-in-chat-only (fresh-session rechecks and land gating have nothing to read).

### D5 — recheck-review is a sibling skill, not a spec-review mode

Fan-out review and inline finding-verification are different flows; a mode flag would couple them (the repo's own fragile-coupling rule). `/recheck-review` reads the report, computes the delta from the header (spec-review target → unstaged `git diff`; release-review target → `git diff <anchor>..dev`), verifies each open `Fix now` finding (resolved / still open / new issue introduced), appends a round, and emits `clear to land` | `findings remain` | `outgrew recheck`. Escalation tells: the fix delta touches files outside the original review's diff, or rivals it in size. Data-driven delta lookup, single flow — no per-type branches.

### D6 — release-review: five dimensions, PR-shaped, self-repairing bump

Cut stays a PR (`dev → x.y.x`): stable diff anchor, CI-rollup surface, merge button as the final act. Ported skill keeps budget's preflight (release-branch base pattern, milestone present) and three dimensions (milestone completeness, cross-feature interaction, migration ordering), adds two: **OpenSpec state clean** (working-copy `openspec list` empty + repo `validate --strict`) and **version bump matches milestone title** — when missing, the skill drafts and stages the bump and asks the owner to commit (signing stays human). Absorbs the deploy-readiness CI-rollup read (release-check is retired). Drops budget's Phase 2 changelog delegation entirely. Rejected: branchless pre-cut review (loses PR anchor + CI surface); keeping the bump check in a separate release-check skill (two gates where one suffices).

### D7 — start-change label routing

`gh issue view` → labels decide: `EXPLORE NEEDED` or `IDEA` → explore session first; outcome is written back into the issue body (issue stays the single source propose reads) and the label stripped. A negative IDEA verdict (never viable / not now / not worth the churn) → findings comment + swap label to `HOLD`, issue stays open for revisiting; `/start-change` on a `HOLD` issue surfaces the hold comment and asks before re-exploring. No label → propose directly from the issue body. Preconditions hard-stop: on `dev`, clean tree, up to date with origin. The clean-tree check is what enforces one-change-at-a-time.

### D8 — spec-review deltas are minimal

Only two requirement-level changes: no-arg default scope becomes `--staged` unconditionally on every branch (branch-vs-dev dies as a default entirely — branch work names its scope explicitly via PR reference or ref range; the PR path and its CI read remain first-class), and report persistence per D4. The fan-out orchestration, briefs, output contract, archive-state latitude, and evaluation-scenario requirements are untouched.

### D9 — Issue close at land; milestone assignment at land

The issue tracks the work; work is done when landed on dev. Release tracking belongs to the milestone, which release-review audits at cut. `/land-change` assigns the issue to the currently-open milestone when closing it, keeping Dimension 1's audit list maintained incrementally. Rejected: close-at-prod (backlog lies about what's actionable); milestone-at-cut (batch bookkeeping at exactly the moment the flow should be lean).

## Risks / Trade-offs

- [Red CI or failed click-test after the work commit is on dev] → the change is still unarchived (spec delta still editable) and the issue still open; fix-forward commits + recheck rounds resolve, and the seal phase only runs once CI is green and the owner confirms the live test.
- [Owner walks away mid-landing] → every commit is a stage-and-stop hand-off; skills never retry a blocked signature, and `/land-change` resumes from state on the next invocation.
- [dev carries unreviewed-by-CI commits briefly] → acceptable: nothing deploys from dev; release cut re-gates everything.
- [One-change-at-a-time serialization] → deliberate; branches remain available for long-running features, reviewed via the retained PR path.
- [`openspec/reviews/` grows unbounded] → one small file per release; acceptable, and it doubles as the release record the changelog never was.
- [HOLD label semantics drift] → label description set at creation; start-change surfaces the hold comment instead of interpreting it.

## Migration Plan

1. Land this change itself via the old flow (it is already on a branch) — the last branch-PR change.
2. Apply creates skills, CI trigger, deletions, doc rewrite, `HOLD` label.
3. First shakedown of the new flow: next real issue runs start-change → land-change.
4. Rollback: revert the commit; the old flow's skills (spec-review PR path) still work throughout.

## Open Questions

None — all decisions grilled and confirmed with the owner (commit timing, milestone-at-land, bump fold-in, PR-shaped cut, PR path retained, hybrid spec mapping, changelog removal in-scope, HOLD outcome).
