---
name: set-sail
argument-hint: '[change-name | MUSTER issue#]'
description: Begin a voyage - the only route into occupying the tree. Hard-stop if any issue is labeled UNDER SAIL, add UNDER SAIL to the target and remove CHARTED if present (MUSTER stays), state the mid-voyage disciplines, then either delegate to /opsx:apply (OpenSpec change) or implement a MUSTER tests-only chunk inline from its ticket-body plan. Use when a change's artifacts are ready or a MUSTER issue is picked up for implementation.
disable-model-invocation: true
metadata:
  author: list_eddiefamily
  version: '2.0'
---

# /set-sail

The only route into occupying the tree. Sails unfurl here, and the board should say so. Embark proposed; set-sail executes. The seam is hard: two commands, two moments.

## Usage

```
/set-sail [change-name | MUSTER issue#]
```

The argument resolves to one of two lanes:

- **An OpenSpec change** in `openspec/changes/` → the charted lane. No argument: the single proposed-but-unimplemented change (ask if several). The change's issue number comes from its artifacts or the linked issue.
- **A `MUSTER`-labeled issue** → the MUSTER lane: a tests-only coverage chunk cut by the map's e2e scout, whose plan lives in the ticket body. No change directory exists or is created.

## Gate — the UNDER SAIL beacon

Hard-stop if **any** issue is labeled `UNDER SAIL` — charted or MUSTER, it occupies the tree. Report the occupying issue and stop. No tree-state heuristics: the label is the board's single "tree is occupied" beacon; this gate reads it and nothing else.

Not blockers: spec artifacts for another change, or a fully-implemented change awaiting review or landing. The gate protects the tree, not the planning space.

## On proceed — both lanes

1. **Stamp the beacon** — both lanes alike: add `UNDER SAIL`, remove `CHARTED` if present (`gh issue edit <N> --add-label 'UNDER SAIL' --remove-label CHARTED`). `MUSTER` is never removed — it marks the lane, keeping the voyage distinguishable from a charted one. Set-sail stamps the beacon; nothing else does.
2. **State the mid-voyage disciplines** (they bind every session until landfall):
   - **Discoveries are never folded into the active change.** Out-of-scope work found mid-voyage never joins the change under way; the voyage continues either way. Where it goes instead — chartered onto an open map, a fog line, or an `OFF THE MAP` issue with the richest body the session can write — is decided by the charter criteria, which the definition layer owns; charting onto an open map runs through [/anchor](../anchor/SKILL.md), never by invoking `/map` directly.
   - **A mirage stops work.** A settled decision revealed wrong mid-apply fires [/run-aground](../run-aground/SKILL.md), whose blast-radius call (patch at sea / park `ADRIFT` / discard `UNCHARTED`) is the owner's call.
   - **Mid-map e2e is minimal keep-green only.** An implementation chunk makes only the smallest e2e edits that keep the suite green; coverage of removed behavior is deleted with the behavior, but coverage of surviving behavior is never deleted to get green. Map-wide e2e coverage — new flows, cross-chunk journeys, consolidating the minimal patches — is owned by the closing e2e chunk the map's e2e scout cuts, not by any implementation chunk.

## Charted lane

3. **Delegate to `/opsx:apply`** for the task loop. Implementation, task check-offs, and pauses are its contract.

## MUSTER lane

3. **The ticket body is the plan** — coverage rows plus deliberate skips. No change directory, no `/opsx:apply`, no task tracking.
4. **Staleness check before any test is written**: grep every `#### Scenario:` heading the plan cites against the active specs (`openspec/specs/<capability>/spec.md`). Any missing heading → stop back to the owner: the plan is stale.
5. **Read `TESTING.md` in full** before writing any test.
6. **Implement inline.** Every test file carries the citation header naming the capability and scenario it verifies (traceability flows test → spec, never spec → test). Any needed production-code change disqualifies the lane — stop back to the owner; the work must route through the normal charted flow.
7. Review is `/muster-review`; landing is `/landfall`'s MUSTER branch.

## Never commits

This skill never runs `git commit` and never stages unasked.
