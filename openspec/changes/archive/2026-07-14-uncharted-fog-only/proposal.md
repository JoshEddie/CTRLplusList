## Why

The label machine currently overloads `UNCHARTED` to mean both "scope not settled" (fog) and "sequenced behind another chunk" (blocked). During map #203's exit session the owner settled the semantics (recorded in the "Label semantics (owner-settled at exit)" note in issue #203's body): `UNCHARTED` means fog only; sequencing lives exclusively in GitHub blocked-by relationships. Live precedent: #210 and #211 are `CHARTED` with blocked-by wired. The overloaded meaning forces label churn every time a blocker lands (someone must flip `UNCHARTED` → `CHARTED`) and drags `/anchor` into routine planned sequencing instead of reserving it for genuine lost-bearings moments. The skills and specs still encode the old semantics; this change codifies the decision.

Inherited constraints touched (binding SHALLs in active specs):

- `openspec/specs/map-workflow/spec.md` — label vocabulary requirement (`UNCHARTED` defined as "not cleared — born gated at exit"), exit requirement ("residual open decision tickets … those chunks SHALL be born `UNCHARTED`"), and the `/embark` sentence ("no separate not-cleared marker exists").
- `openspec/specs/trunk-workflow/spec.md` — `/embark` gate requirement ("act on exactly one routing state: `CHARTED` proceeds").

## What Changes

- **`UNCHARTED` redefined as fog only**: scope not settled — born gated by an open decision ticket at exit, demoted by `/anchor`, or migrated by `/split-map`. Explicitly not a blocked marker.
- **Sequencing invariant**: chunk-to-chunk ordering is expressed exclusively via GitHub blocked-by relationships. A fully-scope-settled chunk is born `CHARTED` even while blocked behind a predecessor chunk. No label flip occurs when a blocker lands — the chunk is auto-frontier.
- **`/embark` gate widens to two conditions**: label `CHARTED` AND zero open blockers (verified via `gh api …/dependencies/blocked_by`). An open blocker stops embark, naming the blocking issue(s).
- **`/map` exit rule split**: chunks gated by residual open decision tickets are born `UNCHARTED`; chunks merely sequenced behind other chunks are born `CHARTED` with blocked-by wired.
- **`/anchor` scope confirmed**: promote remains the fog-graduation path (decision resolved → chunk flips `CHARTED`); no duty exists to flip labels when a blocking *chunk* lands.
- **One-time sweep of map #181** (owner-requested): chunks whose only gates are predecessor chunks flip `UNCHARTED` → `CHARTED` (#191–#199 as of charting read); chunks directly gated by an open decision ticket stay `UNCHARTED` (#190 ← #202, #200 ← #201). No standing sweep duty is created.
- Skill files updated: `label-machine.md`, `embark/SKILL.md`, `map/SKILL.md`, `anchor/SKILL.md`; `CLAUDE.md`'s label-machine summary only if its wording contradicts (audit says it does not — the state diagram names transitions, not blocking semantics).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `map-workflow`: `UNCHARTED` definition in the label vocabulary becomes fog-only; the sequencing-via-blocked-by invariant is added; the exit requirement distinguishes decision-ticket-gated chunks (born `UNCHARTED`) from chunk-sequenced chunks (born `CHARTED` + blocked-by).
- `trunk-workflow`: `/embark`'s gate becomes label `CHARTED` AND zero open blockers, with the blocker query and stop behavior specified.

## Impact

- `.claude/skills/map/reference/label-machine.md` — `UNCHARTED` row + closing invariant line.
- `.claude/skills/embark/SKILL.md` — boarding check gains the open-blockers query and stop.
- `.claude/skills/map/SKILL.md` — Exit section rules.
- `.claude/skills/anchor/SKILL.md` — audit only; promote already reads as fog graduation, no flip-on-chunk-landing duty found.
- `CLAUDE.md` — audit only; current wording does not contradict.
- `openspec/specs/map-workflow/spec.md`, `openspec/specs/trunk-workflow/spec.md` — via delta specs.
- No application code, DB, or tests affected. An unrelated revision (atomic-map-releases, archived) touched the same files — edits layer on top of its landed wording, never revert it.
