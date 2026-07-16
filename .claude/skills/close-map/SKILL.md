---
name: close-map
argument-hint: "[map#]"
description: Close a map through delegated inspection - run the IN PORT walk per /port-inspection's Walk section, then close the MAP index when, and only when, every implementation chunk is closed and no unstarted chunks or residual fog remain (leftovers route to /split-map). The only skill that closes a map. Use when an epic's chunks have landed and the map looks done.
disable-model-invocation: true
metadata:
  author: list_eddiefamily
  version: '1.0'
---

# /close-map

The inspection batch-point and the only skill that closes a map. The `IN PORT` inspection walk itself — verification surface, dependents surface, close-on-confirmation — is owned by [/port-inspection](../port-inspection/SKILL.md); this skill delegates to its Walk section and never restates its rules.

## Guardrails

- Side effects are GitHub issue operations only, via `gh`. No trunk preconditions gate; never touches the tree, never commits.
- A map whose last chunk is merely `IN PORT` SHALL NOT close.
- A map still holding unstarted chunks or residual Not-yet-specified fog SHALL NOT close — point at `/split-map` to dispatch the leftovers.

## Flow

1. Resolve the map (argument, or ask). List its sub-issues (`gh api --paginate repos/{owner}/{repo}/issues/<map#>/sub_issues --jq '.[] | {number, state, title, labels: [.labels[].name]}'`) and partition the implementation chunks: closed / `IN PORT` / anything else still open.
2. **Walk each open `IN PORT` chunk per [/port-inspection](../port-inspection/SKILL.md)'s Walk section** — followed inline, not restated here. The walk runs whatever else is open — inspecting landed cargo never waits on the epic's frontier.
3. **Leftover check.** Unstarted chunks (`CHARTED`/`UNCHARTED`) or residual Not-yet-specified fog in the map body → the map cannot close; refuse and point at `/split-map` to migrate the leftovers to a successor map (or demote fog to `OFF THE MAP`).
4. **Every implementation chunk closed and no leftovers** → close the map itself with a one-line completion comment pointing at the destination reached. Any chunk still open → the map stays open; report what remains. The gate reads issue state, not labels: closed is closed, whatever a chunk is labeled.

Decision tickets don't gate the close — a residual open ticket wired onto no open chunk is stale by construction; flag it to the owner for closing into Out of scope or Decisions so far as part of the walk.
