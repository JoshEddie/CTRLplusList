# Add the map workflow — definition-layer governance and the voyage fleet

## Why

Recurring pain: massive PRs and OpenSpec changes that do too much. The trunk workflow keeps changes issue-sized, but nothing governs how work gets *defined* — issue #178 (explored; decisions in its body) called for a step 0 that decomposes big foggy ideas into ready-to-work issues. The propose interview and a post-apply grilling + explore session (both 2026-07-14) went further: mega-changes are a *definition* failure, not an execution failure, so work definition gets its own governing layer instead of an optional pre-step.

The result is a two-layer constitution. **map-workflow** governs work definition: every piece of work enters through `/map`, which clears fog and emits issues cleared for work; nothing else creates worked issues. **trunk-workflow** governs execution: tree, commits, gates, review, landing. Neither layer governs the other — `/map` never touches the tree, and the execution skills never chart. Sharpness is perishable: the definition layer clears fog at charting time, and the execution layer re-verifies at departure time, because terrain shifts between the two.

Idea adapted from Matt Pocock's wayfinder skill; credit comment retained, mechanics rebuilt for this repo (GitHub `gh` REST, `/grill-me` as interview engine, OpenSpec as contract of record).

## What Changes

- **New skill `/map`** (`.claude/skills/map/SKILL.md`) — the mandatory intake: compiles any input (spark, documented discovery, epic) through chart / work / exit phases. Small clear input compiles to a single `CHARTED` issue with no map artifact; epics get a `MAP` index with `PLOTTING`/`SCOUTING` tickets and exit into sequenced implementation chunks. Subsumes the explore route — map's charting is the one fog engine.
- **New skill `/anchor`** — bearing moves and damage control: promote (fog → ticket), demote (mirage — reopen original ticket, coin-flip affected chunks), map-body re-sync, and mid-voyage triage (stay `UNDER SAIL` / park to `ADRIFT` / discard to `UNCHARTED`).
- **New skill `/close-map`** — ends the epic: inspection batch-point for open `IN PORT` chunks, closes the map when the last chunk closes.
- **`/start-change` → `/embark`** (rename + thinning): board and prep — trunk gate, `CHARTED` allowlist (every other state stops), terrain check, then propose with inherited map decisions. Explore routing removed.
- **New skill `/set-sail`** — the apply wrapper: enforces the one-change-mid-apply gate at the moment it matters, flips `CHARTED` → `UNDER SAIL`, states the mid-voyage disciplines (discoveries logged `OFF THE MAP`, mirages go to `/anchor`), delegates to `/opsx:apply`.
- **`/land-change` → `/landfall`** (rename + rework): up-front dev-verification prompt with a fast path (two signed commits, one push, no CI wait), eager bookkeeping with pasted commit messages, labels the issue `IN PORT` instead of closing it, self-healing resume.
- **Label machine** (created idempotently): routing caps `OFF THE MAP` → `CHARTED` ⇄ `UNCHARTED` → `UNDER SAIL` → `IN PORT`, plus `ADRIFT` (interrupted voyage), `MAP` (index), `PLOTTING`/`SCOUTING` (tickets); lowercase status labels (`bug`, `idea`, `hold`, …) are human triage only. `IDEA`/`EXPLORE NEEDED`/`HOLD` retire (one-time relabel sweep).
- **Doc-only gate exemption** — a diff touching only documentation/workflow files may mark the two test gates skipped with an explicit rationale.
- Rejected across #178 and the interviews (do not re-litigate): prototype ticket type, research scratch branches, ADRs, incremental chunk creation, map milestones, a harbor/front-door wrapper skill, the task ticket type (anchor supersedes it), claim-by-assignment, an embark-time label (`RIGGED`), arrival-flavored names for the map-closing skill.

## Capabilities

### New Capabilities

- `map-workflow` — the definition layer: mandatory intake, chart/work/exit phases, scaling law, the label machine, ticket types (`PLOTTING` HITL / `SCOUTING` AFK), mirages and anchor triage, relaxed exit, `IN PORT` inspection and map close, guardrails (writes issues only; never touches the tree; never commits).

### Modified Capabilities

- `trunk-workflow` — `/embark` (née start-change) becomes a thin dispatcher gated on `CHARTED`; `/set-sail` takes over the apply stage and its gate; `/landfall` (née land-change) gains the fast path, eager bookkeeping, and `IN PORT` semantics; the explore route retires.
- `testing-foundation` — the five-gate pre-merge requirement gains the doc-only exemption: a diff touching only documentation and workflow files (markdown docs, `.claude/**`, `openspec/**`) may mark the two test gates skipped with an explicit rationale, since it cannot affect test outcomes (CI still runs the full battery).

## Impact

- New: `.claude/skills/map/SKILL.md` (rework of this change's earlier draft), `.claude/skills/map/reference/label-machine.md` (the machine's one home — both layers reference it, neither restates it), `.claude/skills/anchor/SKILL.md`, `.claude/skills/set-sail/SKILL.md`, `.claude/skills/close-map/SKILL.md`.
- Renamed + rewritten: `.claude/skills/start-change/` → `.claude/skills/embark/`, `.claude/skills/land-change/` → `.claude/skills/landfall/`.
- Edited: CLAUDE.md (§ Trunk workflow rewritten around the two layers and the fleet), `openspec/config.yaml` (doc-only exemption in the `tasks` rule), cross-references in any skill naming the old commands.
- Spec deltas: `specs/map-workflow/spec.md` (ADDED), `specs/trunk-workflow/spec.md` (MODIFIED), `specs/testing-foundation/spec.md` (MODIFIED), `specs/spec-review/spec.md` (MODIFIED), `specs/recheck-review/spec.md` (MODIFIED) — the last two carry the `/land-change` → `/landfall` rename out of their normative text.
- Hand-edited canonical spec: `openspec/specs/trunk-workflow/spec.md` **Purpose only** — deltas cannot carry a Purpose, so this is the sanctioned route (same surface `/finalize-spec-purposes` writes). Requirements and Scenarios there are untouched; this change's own delta supersedes them.
- GitHub side effects at runtime only: labels, issues, sub-issue links (`gh api .../sub_issues`), blocked-by wiring (`gh api .../dependencies/blocked_by`) — both endpoints verified live on this repo with gh 2.88.1. One-time relabel sweep of existing `IDEA`/`EXPLORE NEEDED`/`HOLD` issues at enactment.
- No app code, no DB, no UI. Test gates satisfied under the doc-only exemption this change itself introduces; lint/typecheck/build still run.
