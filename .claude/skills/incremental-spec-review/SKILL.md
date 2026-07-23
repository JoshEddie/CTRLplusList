---
name: incremental-spec-review
argument-hint: "[change-name]"
description: Second-stage full-rigor review scoped to the not-yet-reviewed fix delta - for fixes atop a reviewed staged baseline that changed BOTH code and spec artifacts (single-sided deltas stay with /recheck-review). Runs arenas A+C on the unstaged delta and B on the change's whole footprint via spec-review's shared briefs, appends a round subsuming recheck's status table to review.md, and never requires staging the fix delta. Use when a recheck declared outgrew recheck or the fix delta visibly touched both sides.
disable-model-invocation: true
metadata:
  author: list_eddiefamily
  version: '1.0'
---

# /incremental-spec-review

The review family's **second stage**: full rigor on the not-yet-reviewed delta.
After `/spec-review` produced findings and the fixes grew past what a recheck can
honestly verify — the fix delta changed **both** code and spec artifacts, so the
contract itself moved — this skill re-reviews with full arena rigor while
preserving the staged-reviewed vs unstaged-fix separation. **It never requires
staging the fix delta**: the staged tree stays the reviewed baseline, the
unstaged working tree stays the fix delta, throughout.

Shared formats (header, round structure, finding shape, IDs, verdict vocabulary,
gate sections) live in `.claude/skills/spec-review/reference/finding-format.md` —
read it first. The arena briefs live in `.claude/skills/spec-review/` and are
shared: this skill points its agents at those same files (a format-only file
read — no runtime dependency on the spec-review skill, and no incremental-only
brief copies exist).

## Usage

```
/incremental-spec-review [change-name]
```

- **`<change-name>`** → the target change; reads `openspec/changes/<name>/review.md`.
- **No argument** → resolve the single active change with a `review.md`; announce
  it. More than one qualifies → ask the owner via **AskUserQuestion** — never
  guess. None → say so and stop.

## Routing boundary — check before anything else

Inspect the fix delta (`git diff --stat`):

- **Changed both code and spec artifacts** (`openspec/changes/<name>/**`) → this
  skill's scope; proceed.
- **Changed only one side** (only code, or only spec artifacts) → the delta is
  recheck-scoped regardless of its size: state so, direct the owner to
  `/recheck-review`, and stop.

Size is not a routing signal in either direction. A full `/spec-review` rerun
happens only by explicit owner choice — never as this skill's escalation target.

## Arena scopes — header-driven

Read the target report's shared machine-readable header. The `anchor:` sha is the
staged baseline the original review was computed against. Scopes:

| Arena | Diff command | Reviews |
| --- | --- | --- |
| A Alignment | `git diff` | the unstaged-atop-staged fix delta |
| C Convention | `git diff` | the unstaged-atop-staged fix delta |
| B Boundary | `git diff <anchor>` | the change's whole footprint (staged + unstaged), because corpus-relative defects can be created by the combination of reviewed and unreviewed edits |

Arena definitions are spec-review's three-arena contract, carried by the shared
briefs.

## Prior findings — read as amended

Before fan-out, read the latest round **as amended** by any `### Adjudications`
subsection (the reader rule in `reference/finding-format.md`): a finding's
effective disposition is the one set by the latest Adjudications entry for its
durable ID, and a re-dispositioned finding is **never re-litigated**. Collect
every finding whose effective disposition is an open `Fix now` — the round's
status table will account for each.

## Fan-out

Spawn the three arena agents as parallel Agent-tool sub-agents **in a single
message**, exactly per spec-review's orchestration contract:

- **Identity line** — `You are the <arena> agent for /incremental-spec-review.`
- **Brief pointer** — `First Read your brief at <brief path> and follow it exactly.`
  - `alignment`: `.claude/skills/spec-review/alignment-brief.md`
  - `boundary`: `.claude/skills/spec-review/boundary-brief.md`
  - `convention`: `.claude/skills/spec-review/convention-brief.md`
- **Diff command** — the arena's own command from the scope table above.
- **Phase key** — `alignment` / `boundary` / `convention`.
- **Alignment agent only** — the resolved change name and archive state (the
  change is active mid-apply; classify per
  `.claude/skills/spec-review/reference/archive-state.md` if in doubt), plus the
  deferred-to-CI instruction.

Reply convention, parse, single retry via **SendMessage**, and
abort-on-persistent-malformed (name the failed arena, show the raw reply,
persist no round) are spec-review's mechanics verbatim. Interactive and
orchestrator-judgment steps — change resolution, prior-findings status calls,
consolidation, verdict — stay in this session; agents receive only resolved,
non-interactive inputs.

## Append the round

Append to `review.md` — **never rewriting prior rounds** — and bump the header's
`round:`:

```markdown
## Round <n> — incremental-spec-review (<date>)

<one- to two-sentence summary>

**Scope:** A/C `git diff` · B `git diff <anchor>` · <resolved change>

### Prior findings
| # | Prior finding | Status | Notes |
|---|---------------|--------|-------|

### Alignment / ### Boundary / ### Convention
<fresh findings tables, standard finding shape; IDs continue the capital-letter
global-integer scheme within this round>

### What looks good
- <short bullets>

**Verdict:** <clear to land | findings remain>
```

- **Prior findings** — one row per open `Fix now` from the latest round (as
  amended), by durable ID: resolved / still open / superseded by a new finding.
  Verify in the actual code, not by diff eyeballing alone. This subsumes
  `/recheck-review` on a mixed round — one round, one verdict, no separate
  recheck round. A prior round's stale `## Gates` section (e.g. from an
  `outgrew recheck` round) is superseded by this table: a clearing status
  licenses checking those items off.
- **Fresh findings** — apply the hardened disposition criteria (scope never
  effort; charter-cited `File issue` or it's re-dispositioned).
- **Verdict** — exactly one, round vocabulary: `clear to land` (every prior open
  `Fix now` resolved and no new `Fix now` findings) or `findings remain` (list
  them). Only open `Fix now` findings block.

## Gate section on an adverse verdict

When the verdict is `findings remain`, append an unchecked `## Gates — round <n>`
section to the change's `tasks.md` per `reference/finding-format.md` § Gate
sections — one item per open `Fix now` finding, by durable ID. Never uncheck or
edit a prior round's section. A clearing verdict appends no section.

## Handoff

Close with the adjudication pointer, as spec-review does:

> To adjudicate these findings, run `/adjudicate-review <change>` (a fresh
> session is recommended).

**No commits, no staging, no fixes.** This skill reviews and reports; fixing and
landing remain separate acts.
