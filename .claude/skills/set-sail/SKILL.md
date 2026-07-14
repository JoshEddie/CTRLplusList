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
   - **Discoveries are logged, not charted.** Out-of-scope work found mid-voyage gets the richest issue body the session can write, labeled `OFF THE MAP` (plus any lowercase kind), and the voyage continues. Never invoke `/map` mid-voyage.
   - **A mirage stops work.** A settled decision revealed wrong mid-apply fires [/anchor](../anchor/SKILL.md), whose triage (patch at sea / park `ADRIFT` / discard `UNCHARTED`) is the owner's call.
3. **Delegate to `/opsx:apply`** for the task loop. Implementation, task check-offs, and pauses are its contract.

## Never commits

This skill flips one label and delegates. It never runs `git commit`, never stages, never pushes.
