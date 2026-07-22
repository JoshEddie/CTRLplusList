## Why

`/landfall` defers the `IN PORT` label flip until after the seal commit is pushed, forcing the owner to push, return to the chat, and ask for routine bookkeeping — in practice the label gets flipped by hand on GitHub instead. Map [#270](https://github.com/JoshEddie/CTRLplusList/issues/270) settles that the flip belongs at the hand-off moment; the owner refines that to **the moment the change is archived**, in one swoop, independent of staged/committed/pushed git state.

Inherited constraints (binding SHALLs in the active specs this change edits):
- `trunk-workflow` — landfall SHALL NOT close the issue (closing is `/port-inspection`'s act); skills SHALL NOT run `git commit`; landfall SHALL be state-driven and self-healing.
- `map-workflow` — the definition layer (incl. `/port-inspection`) SHALL limit side effects to GitHub issue operations via `gh` — never mutate the tree, stage, commit, or push.

## What Changes

- **Landfall flips `IN PORT` at archive.** Both paths flip the issue's label the moment the change is archived, not after the seal push. The flip is decoupled from git state.
- **Landfall loses its post-push bookkeeping tail.** The state-driven requirement drops the `seal pushed but bookkeeping incomplete → finish IN PORT labeling silently` phase, the leftover-bookkeeping sweep, and the `Leftover bookkeeping is swept` scenario — labeling can no longer lag archive, so there is nothing to sweep. No self-heal is added to landfall.
- **`/port-inspection` gains a compensating per-stop check.** Before closing a chunk it verifies the chunk's archive commit actually landed on `origin/dev`. An unpushed/abandoned seal keeps the chunk open, flags it, **and** flips its label `IN PORT` → `UNDER SAIL` to un-strand it — which clears landfall to re-run normally. Port-inspection is now the sole reconciler of label-vs-reality.
- CLAUDE.md § Trunk workflow summary updated only if it restates the flip timing.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `trunk-workflow`: landfall bookkeeping requirement pinned to flip-at-archive; the state-driven/self-healing requirement loses its post-push bookkeeping tail (phase + sweep + scenario).
- `map-workflow`: `/port-inspection` requirement gains the archive-on-`origin/dev` verification and the `IN PORT` → `UNDER SAIL` label-flip-back self-heal.

## Impact

- `.claude/skills/landfall/SKILL.md` — both paths' bookkeeping steps + the phase-detection table.
- `.claude/skills/port-inspection/SKILL.md` — Walk section (per-stop archive check + flip-back).
- `openspec/specs/trunk-workflow/spec.md`, `openspec/specs/map-workflow/spec.md`.
- `CLAUDE.md` § Trunk workflow, if it restates the timing.
- Doc/skill-only change: no app code, no DB, no interactive surfaces, no cache tags.
