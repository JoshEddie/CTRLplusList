## Why

The team's PR reviews currently lean on the external `engineering:code-review` plugin skill, which is blind to two things this repo cares about most. First, it never reads `CLAUDE.md`'s load-bearing supporting docs — `TESTING.md` and `DATABASE.md` are reachable only via a one-hop pointer inside `CLAUDE.md` that the skill does not follow, so a `db.transaction(...)` on the `neon-http` driver or a tautological test can pass review clean. Second, it has no awareness of the OpenSpec contract: it can't confirm that a change's `[x]` tasks are actually done or that the shipped work matches `design.md`/`spec.md`. Because the team's flow reviews a PR *before* archiving the change and never re-reviews after archive, the review step is the only gate that protects the spec contract — and right now nothing checks it.

## What Changes

- Add a new project skill at `.claude/skills/spec-review/SKILL.md`, invokable as `/spec-review [change-name | PR | diff]` (no arg = current branch vs `main`).
- The skill is **self-contained** — it does not sub-call or take a runtime dependency on the external `engineering:code-review` plugin. The standard review dimensions (security, performance, correctness, maintainability) are inlined as a sub-agent brief (provenance is recorded in design.md, not as a coupling note in the skill body — D1).
- **Multi-agent orchestration**: the skill spawns parallel sub-agents — a standard-review agent, a convention-audit agent, and a contract-audit agent — then consolidates their findings into one report.
- **Convention audit (Feature 1)**: always audits against `CLAUDE.md`, and *follows the doc-pointers declared in `CLAUDE.md`* when the diff hits their trigger (e.g. test files → `TESTING.md`, DB schema/queries → `DATABASE.md`). The pointer-following is generic, not a hardcoded filename list, so new docs added to `CLAUDE.md` are picked up automatically.
- **Contract audit (Feature 2)**: resolves the related OpenSpec change (auto-detect via `openspec list --json` + commit messages + diffed spec paths; ask if ambiguous; on no match, ask whether to proceed with no contract audit or name a change to review against), then verifies (a) every `[x]` task in `tasks.md` corresponds to real work in the diff, (b) the work matches `design.md` and `specs/**/spec.md`, (c) no undocumented behavior was added that no task or spec covers (scope creep), and runs `openspec validate --strict`. The verdict doubles as a "clear to archive?" gate, since this is the pre-archive review.
- Reads the **active** change directory `openspec/changes/<name>/` for an auto-detected change (never substituting an `archive/` copy), because the skill runs before the archive step. When the target lives under `openspec/changes/archive/*-<name>/`, the skill classifies it by its position relative to the spec-sync step (design D13): a **premature archive** (the archive move is in *this* PR, not yet on the base branch) is treated like an active change but with reconciliation capped at sync-neutral edits — wording fixes or code-only changes; a significant spec change must re-run propose→archive. An **already-merged archive** (present on the base branch) is a fixed canonical contract — implementation must conform; a violation is resolved only by conforming the code or opening a fresh proposal, never by editing the merged spec, and blocks the PR. Either archived case skips the (active-only) `openspec validate`.

## Capabilities

### New Capabilities
- `spec-review`: A project code-review skill that audits a PR/diff against the repo's standard review dimensions, its `CLAUDE.md` + pointer-referenced supporting docs, and the related OpenSpec change's task-completion and design/spec contract.

### Modified Capabilities
<!-- None. This is dev tooling under .claude/skills/; it introduces no runtime app behavior and modifies no existing capability spec. -->

## Impact

- **New file**: `.claude/skills/spec-review/SKILL.md` (and any reference files under that skill dir).
- **No runtime app code changes.** This change touches no interactive surface, no `lib/dal.ts` read, no mutation, no cache tag, and no DB schema — so the cross-cutting design-system, cache-freshness, and `neon-http` constraints do not apply to the change itself (though the skill *audits* against them at review time).
- **Tooling dependency**: relies on the existing `openspec` CLI (v1.3.1) for change resolution and `openspec validate --strict`.
- **Accepted non-goal**: the archive move and any post-archive corrections ship unreviewed, by the team's deliberate process choice; the skill does not attempt to close that gap.
