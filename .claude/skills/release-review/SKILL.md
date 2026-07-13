---
name: release-review
argument-hint: "[PR#]"
description: The sole review gate for dev -> release-branch PRs - preflight hard gates (release base pattern, milestone present), five inline integration dimensions (milestone completeness, cross-feature interaction risk, migration ordering, OpenSpec state clean, version bump vs milestone), CI rollup read, and a persisted per-release report in openspec/reviews/. Verdict is ready to cut / not ready. Use when cutting a release from dev.
metadata:
  author: list_eddiefamily
  version: '1.0'
---

# /release-review

Integration review of a release cut **as a whole**. Per-change quality was already reviewed at landing (`/spec-review` rounds persisted per change) — this gate does **not** re-litigate those findings. It runs **inline** — no sub-agents, no Workflow fan-out.

Shared formats (report header, round structure, finding shape, verdict vocabulary) come from `.claude/skills/spec-review/reference/finding-format.md` — format reference only, no runtime dependency on the spec-review skill.

## Usage

```
/release-review [PR#]
```

No argument → the current branch's open PR (`gh pr view`). No PR resolvable → ask.

## Preflight — hard gates, nothing runs on failure

Resolve the PR (`gh pr view <PR> --json baseRefName,milestone,number,title`):

1. **Release base** — the PR's base branch must match `^\d+\.\d+(\.x)?$` (e.g. `1.4.x`). Base is `dev` or anything else → stop entirely and direct trunk-landing review to `/spec-review`.
2. **Milestone present** — the PR must carry a GitHub milestone; its **title is the target version** for everything below. Missing → stop, instruct the owner to tag one (creating it if needed) and re-run.

## The five dimensions — single inline pass

### 1. Milestone completeness

Every issue in the milestone is **closed** and its work is present in the PR's commit range; conversely, no substantial diff content lacks a milestone home. An open milestone issue is a finding.

### 2. Cross-feature interaction risk

At diff-stat level: when bundled features touch shared surfaces (nav, cache tags, shared components under `app/ui/`, `lib/`), flag the overlap for a look. Disjoint features pass silently — no manufactured findings.

### 3. Migration ordering

New Drizzle migration files in the range are sequential — no divergent heads, no duplicate prefixes. No migrations in the release → state N/A.

### 4. OpenSpec state clean

Working-copy `openspec list` reports **no active changes**, and repo-level `openspec validate --strict` passes. An in-flight change is a finding: land it or it waits for the next cut.

### 5. Version bump

`package.json`'s `version` equals the milestone title. **When absent or mismatched: draft it** — stage the corrected `package.json` and ask the owner to commit (signing is the owner's act; never commit, push, or merge). The finding resolves on a recheck round, not by the skill committing.

## CI rollup read

After the dimensions, read the PR's check rollup (`gh pr checks <PR>` / `gh pr view <PR> --json statusCheckRollup`):

- **Red** → blocking finding; verdict is `not ready`, citing the failing check.
- **Pending** → report CI as unverified; the verdict must not claim `ready to cut` on its basis.
- **Green** → deploy readiness confirmed. There is no separate downstream release gate.

## Persist the report

Write the report to `openspec/reviews/<version>.md`, opening with the shared machine-readable header:

- `review: release-review`, `target:` the milestone/version, `anchor:` the PR base sha, `diff-source:` the PR reference, `round:` 1.
- Body is `## Round 1 — release-review (<date>)` with the findings table (shared finding shape/dispositions) and the verdict. Subsequent rounds are appended by `/recheck-review`.

The persisted report doubles as the repo's release record.

## Verdict

Exactly one:

- **`ready to cut`** — no open `Fix now` findings, CI green. The owner merges the PR (plain merge) as the final act.
- **`not ready`** — blockers listed. Only open `Fix now` findings block; `File issue` / `Drop` never do.

**No changelog phase.** This skill drafts no changelog artifact and requests none.
