## 1. Landfall skill — flip at archive, drop post-push tail

- [x] 1.1 Move both paths' `IN PORT` flip to the archive moment in `.claude/skills/landfall/SKILL.md`: fast path (currently step after the one push) and verified path (currently after the signed push) both flip in the same swoop as the archive, independent of staged/committed/pushed state.
- [x] 1.2 Remove the `Seal pushed but bookkeeping incomplete → Finish IN PORT labeling silently` row from the phase-detection table.
- [x] 1.3 Remove the leftover-bookkeeping sweep note ("before handling the current change, any invocation that finds a previously-landed issue missing its `IN PORT` label completes that labeling first").
- [x] 1.4 State that a stranded `IN PORT` (abandoned seal never on `origin/dev`) is reconciled by `/port-inspection`, not landfall.

## 2. Port-inspection skill — compensating archive check + flip-back

- [x] 2.1 In `.claude/skills/port-inspection/SKILL.md` Walk section, add the per-stop check: verify the chunk's `issue-<N>: archive <change>` seal commit is on `origin/dev` before closing; failed check reported, never read as "archive landed".
- [x] 2.2 On a missing/abandoned seal: keep the chunk open, flag it, and flip its label `IN PORT` → `UNDER SAIL` (the sole reconciler of a stranded label).

## 3. Specs + summary doc

- [x] 3.1 Apply the `trunk-workflow` delta to `openspec/specs/trunk-workflow/spec.md` (bookkeeping-at-archive; state-driven requirement loses the post-push tail).
- [x] 3.2 Apply the `map-workflow` delta to `openspec/specs/map-workflow/spec.md` (`/port-inspection` archive check + flip-back).
- [x] 3.3 Check CLAUDE.md § Trunk workflow for any restatement of the flip timing; update only if present (leave untouched otherwise).

## 4. Verify

- [x] 4.1 `openspec validate landfall-flip-at-seal-stage --strict` passes.
- [x] 4.2 Re-read landfall + port-inspection SKILL.md end-to-end for internal consistency (no dangling reference to the removed sweep/phase; flip-back label consistent).
