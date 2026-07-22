## Context

`/landfall` currently flips `IN PORT` after the seal commit is pushed (fast path and verified path both). Because the flip trails the push, a session that ends between push and flip leaves the label lagging — so landfall carries a state-driven "finish IN PORT silently" phase plus a leftover-bookkeeping sweep to catch that gap, and owners flip the label by hand when they don't return to chat. Map [#270](https://github.com/JoshEddie/CTRLplusList/issues/270) moves the flip earlier; the owner pins it to the archive action.

## Goals / Non-Goals

**Goals:**
- The `IN PORT` flip fires the instant the change is archived, in one swoop with the archive, independent of staged/committed/pushed state.
- Landfall carries no bookkeeping that can outlive a single invocation — no post-push phase, no sweep.
- A stranded `IN PORT` (archive rolled back / seal abandoned before it reaches `origin/dev`) is reconciled by exactly one owner.

**Non-Goals:**
- Landfall closing the issue (still `/port-inspection`'s act).
- Any skill running `git commit` / staging / pushing beyond what it already does.
- Changing the fast/verified path structure or the review/validate gates.

## Decisions

**Trigger = archive, not a git milestone.** The flip is bound to the archive filesystem action, not to staging or pushing the seal commit. Rationale: "archived" is a single unambiguous moment both paths pass through exactly once; "staged"/"pushed" are git states that can be undone, re-done, or split across sessions, which is what forced the lagging-label machinery in the first place. Alternative (flip at seal-commit staging, per the raw map wording) was rejected because staging is still reversible and reintroduces the same lag class.

**Self-heal owner = `/port-inspection`, not landfall.** Because the flip now precedes the push, a new failure mode appears: label flipped, but the archive commit never reaches `origin/dev` (abandoned/unsigned seal). Landfall stays dumb — it adds no detection. Instead `/port-inspection`, which already walks each chunk before closing, verifies the archive commit is on `origin/dev`; if absent it keeps the chunk open, flags it, and flips `IN PORT` → `UNDER SAIL`, which un-strands the issue and clears landfall to re-run normally. Rationale: single reconciler, and it lives in the skill that already gates on real landed state. This relocates the map's "sweep un-strands the wrong label" duty from trunk-workflow (landfall) to map-workflow (port-inspection) — a within-promise reshuffle confirmed with the owner.

## Risks / Trade-offs

- [Stranded `IN PORT` persists until the next `/port-inspection` stop] → Acceptable: the label is only advisory between land and inspection, and inspection is the gate that would otherwise wrongly close an unpushed chunk. The flip-back is exactly what stops the wrong close.
- [Flip-back label choice `UNDER SAIL`] → It returns the chunk to the apply-stage state so `/set-sail`/`/landfall` resume cleanly; no other label represents "work exists, not yet landed."
