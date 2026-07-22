---
name: set-sail
argument-hint: "[change-name]"
description: Begin implementing a proposed OpenSpec change - enforce the one-change-mid-apply gate at the moment the tree becomes occupied, flip the issue's label CHARTED -> UNDER SAIL, state the mid-voyage disciplines, and delegate the task loop to /opsx:apply. The only route into the apply stage. Use when a change's artifacts are ready and implementation should start.
metadata:
  author: list_eddiefamily
  version: '1.0'
---

# /set-sail

The apply wrapper — the only route into implementing a change. Sails unfurl here: the tree becomes occupied, and the board should say so. Embark proposed; set-sail executes. The seam is hard: two commands, two moments.

## Usage

```
/set-sail [change-name]
```

Resolve the change from the argument, else the single proposed-but-unimplemented change in `openspec/changes/` (ask if several). The change's issue number comes from its artifacts or the linked issue.

## Gate — one change mid-apply, checked at the moment it matters

Hard-stop if another change is **mid-apply**: an active change in `openspec/changes/` with unchecked `tasks.md` items alongside uncommitted code changes in the tree. Report which change and stop before touching anything.

Not blockers: spec artifacts for another change, or a fully-implemented change awaiting review or landing. The gate protects the tree, not the planning space.

## On proceed

1. **Flip the label**: `CHARTED` → `UNDER SAIL` on the issue (`gh issue edit <N> --remove-label CHARTED --add-label 'UNDER SAIL'`). This is the board's single "the tree is occupied" beacon — set-sail stamps it, nothing else does.
2. **State the mid-voyage disciplines** (they bind every session until landfall):
   - **Discoveries are never folded into the active change.** Out-of-scope work found mid-voyage never joins the change under way; the voyage continues either way. Where it goes instead — chartered onto an open map, a fog line, or an `OFF THE MAP` issue with the richest body the session can write — is decided by the charter criteria, which the definition layer owns; charting onto an open map runs through [/anchor](../anchor/SKILL.md), never by invoking `/map` directly.
   - **A mirage stops work.** A settled decision revealed wrong mid-apply fires [/run-aground](../run-aground/SKILL.md), whose blast-radius call (patch at sea / park `ADRIFT` / discard `UNCHARTED`) is the owner's call.
   - **Mid-map e2e is minimal keep-green only.** An implementation chunk makes only the smallest e2e edits that keep the suite green; coverage of removed behavior is deleted with the behavior, but coverage of surviving behavior is never deleted to get green. Map-wide e2e coverage — new flows, cross-chunk journeys, consolidating the minimal patches — is owned by the closing e2e chunk the map's e2e scout cuts, not by any implementation chunk.
3. **Delegate to `/opsx:apply`** for the task loop. Implementation, task check-offs, and pauses are its contract.

## Never commits

This skill flips one label and delegates. It never runs `git commit`, never stages, never pushes.
