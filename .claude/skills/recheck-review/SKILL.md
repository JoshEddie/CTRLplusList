---
name: recheck-review
argument-hint: "[change-name | version]"
description: Verify a prior review's open Fix-now findings against just the fix delta - a lightweight inline pass that appends a round to the persisted report (openspec/changes/<name>/review.md or openspec/reviews/<version>.md) instead of re-running a full multi-agent review. Scope - a fix delta that changed code OR spec artifacts, never both; a mixed delta routes to /incremental-spec-review. Use after fixing findings from /spec-review or /release-review.
disable-model-invocation: true
metadata:
  author: list_eddiefamily
  version: '1.1'
---

# /recheck-review

Closes the review loop: after `/spec-review` or `/release-review` produced findings and fixes were made, verify each open `Fix now` finding against **just the fix delta**, append a numbered round to the persisted report, and emit a verdict `/landfall` can gate on.

**Routing boundary:** recheck is the lever when the fix delta changed code OR spec artifacts — **never both**. A delta that touched both sides means the contract moved; that is `/incremental-spec-review`'s scope. Delta size is not a routing signal in either direction.

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

Read the latest round **as amended** by its `### Adjudications` subsection (the reader rule in `.claude/skills/spec-review/reference/finding-format.md`): a finding's **effective disposition** is the one set by the latest `### Adjudications` entry for its durable ID, and a re-dispositioned finding is **never re-litigated**.

For each finding in the latest round whose **effective disposition** is an open `Fix now` (findings whose effective disposition is `File issue` or `Drop` are not re-litigated):

- **resolved** — the delta addresses it (verify in the actual code, not by diff eyeballing alone).
- **still open** — the delta doesn't (fully) address it.
- **superseded by a new finding** — the fix itself introduces a fresh defect; report it as a new finding in the round's table (full finding shape from the shared reference).

## Escalation tell — check before verifying

Exactly one tell: mid-recheck the fix delta turns out to touch **both code and spec artifacts**. Declare `outgrew recheck` and direct the owner to `/incremental-spec-review`. The former tells — files outside the original review's diff, delta size rivaling the original — are retired and never trigger escalation; a large single-sided delta is still recheck-scoped. A full `/spec-review` rerun happens only by explicit owner choice, never as this skill's escalation target.

When escalating, still append the round (with the tell); do the finding-status pass only as far as it stays honest.

## Append the round

Append a new numbered round section to the report — **never rewrite or delete prior rounds** — per the round structure in the shared reference, and bump the header's `round:`. Reference each prior finding by its **durable ID** (column 1):

```markdown
## Round <n> — recheck (<date>)

| # | Prior finding | Status | Notes |
|---|---------------|--------|-------|

<new-findings table, if any, in the standard finding shape>

**Verdict:** <clear to land | findings remain | outgrew recheck>
```

For a release-review target the clear/blocked vocabulary is `ready to cut` / `not ready` (escalation stays `outgrew recheck`).

### Gate section on an adverse verdict (change-review targets)

When the round's verdict is `findings remain` or `outgrew recheck` against a change-review target, append an unchecked `## Gates — round <n>` section to the change's `tasks.md` per `reference/finding-format.md` § Gate sections — one item per open `Fix now` finding, by durable ID. Never uncheck or edit a prior round's section; `clear to land` appends no section. (An `outgrew recheck` section is later superseded by the incremental round's status table.)

## Verdict

Exactly one, from the shared vocabulary:

- **`clear to land`** (release: `ready to cut`) — every prior open `Fix now` finding resolved, no new `Fix now` findings.
- **`findings remain`** (release: `not ready`) — open `Fix now` findings persist (still-open or newly introduced); list them.
- **`outgrew recheck`** — the delta touched both code and spec artifacts; run `/incremental-spec-review` for the next round.

Only open `Fix now` findings block; `File issue` / `Drop` never do.

**No commits, no staging, no fixes.** This skill verifies and reports; fixing remains the owner's/session's separate act.
