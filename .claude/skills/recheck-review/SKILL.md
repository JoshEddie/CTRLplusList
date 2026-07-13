---
name: recheck-review
argument-hint: "[change-name | version]"
description: Verify a prior review's open Fix-now findings against just the fix delta - a lightweight inline pass that appends a round to the persisted report (openspec/changes/<name>/review.md or openspec/reviews/<version>.md) instead of re-running a full multi-agent review. Use after fixing findings from /spec-review or /release-review; escalates honestly to a full re-review when the fixes outgrow a recheck.
metadata:
  author: list_eddiefamily
  version: '1.0'
---

# /recheck-review

Closes the review loop: after `/spec-review` or `/release-review` produced findings and fixes were made, verify each open `Fix now` finding against **just the fix delta**, append a numbered round to the persisted report, and emit a verdict `/land-change` can gate on.

Shared formats (header, round structure, verdict vocabulary) live in `.claude/skills/spec-review/reference/finding-format.md` — read it first. This skill reads that reference for format only; it takes no runtime dependency on the spec-review skill.

## Usage

```
/recheck-review [change-name | version]
```

- **Argument** → the report to recheck: an active change name (`openspec/changes/<name>/review.md`) or a release version (`openspec/reviews/<version>.md`).
- **No argument** → scan both locations for reports with unresolved `Fix now` findings in their latest round. Exactly one → auto-select and announce it. More than one → ask the owner which to recheck via **AskUserQuestion** — never guess. None → say so and stop.

## Delta computation — header-driven, no per-type branches

Read the target report's header. The `review:` type keys a data-driven delta lookup:

| Header `review:` | Fix delta |
| --- | --- |
| `spec-review` | `git diff` (unstaged working tree — fixes on top of the reviewed staged baseline) |
| `release-review` | `git diff <anchor>..dev` (using the header's `anchor:` sha) |

One flow after the lookup; nothing else branches on report type.

## Verification — inline, single pass

Run **inline in this session** — no sub-agents, no Workflow fan-out, no briefs. That is the point of a recheck: the full review already ran; this pass only confirms fixes.

For each **open `Fix now` finding in the latest round** (findings dispositioned `File issue` or `Drop` are not re-litigated):

- **resolved** — the delta addresses it (verify in the actual code, not by diff eyeballing alone).
- **still open** — the delta doesn't (fully) address it.
- **superseded by a new finding** — the fix itself introduces a fresh defect; report it as a new finding in the round's table (full finding shape from the shared reference).

## Escalation tells — check before verifying

A recheck must not stretch to cover unreviewed ground. Declare `outgrew recheck` — and direct the owner to run the full review again — when either:

- the fix delta touches **files outside the original review's diff**, or
- the fix delta **rivals the original diff in size**.

When escalating, still append the round (with the tell that triggered it); do the finding-status pass only as far as it stays honest.

## Append the round

Append a new numbered round section to the report — **never rewrite or delete prior rounds** — per the round structure in the shared reference, and bump the header's `round:`:

```markdown
## Round <n> — recheck (<date>)

| # | Prior finding | Status | Notes |
|---|---------------|--------|-------|

<new-findings table, if any, in the standard finding shape>

**Verdict:** <clear to land | findings remain | outgrew recheck>
```

For a release-review target the clear/blocked vocabulary is `ready to cut` / `not ready` (escalation stays `outgrew recheck`).

## Verdict

Exactly one, from the shared vocabulary:

- **`clear to land`** (release: `ready to cut`) — every prior open `Fix now` finding resolved, no new `Fix now` findings.
- **`findings remain`** (release: `not ready`) — open `Fix now` findings persist (still-open or newly introduced); list them.
- **`outgrew recheck`** — escalation tell fired; run the full review for the next round.

Only open `Fix now` findings block; `File issue` / `Drop` never do.

**No commits, no staging, no fixes.** This skill verifies and reports; fixing remains the owner's/session's separate act.
