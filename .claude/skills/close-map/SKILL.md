---
name: close-map
argument-hint: "[map#]"
description: End an epic through inspection - walk each open IN PORT chunk with the owner (verified on the live deployment -> close), then close the MAP index when, and only when, every implementation chunk is closed. The only skill that closes a map. Use when an epic's chunks have landed and the map looks done.
disable-model-invocation: true
metadata:
  author: list_eddiefamily
  version: '1.0'
---

# /close-map

The inspection batch-point and the only skill that closes a map. `/landfall` labels a landed chunk `IN PORT` and never closes it — `IN PORT` is uninspected cargo; closing is inspection's act, and inspection is the owner's.

## Guardrails

- Side effects are GitHub issue operations only, via `gh`. No trunk preconditions gate; never touches the tree, never commits.
- A map whose last chunk is merely `IN PORT` SHALL NOT close.

## Flow

1. Resolve the map (argument, or ask). List its sub-issues (`gh api --paginate repos/{owner}/{repo}/issues/<map#>/sub_issues --jq '.[] | {number, state, title, labels: [.labels[].name]}'`) and partition the implementation chunks: closed / `IN PORT` / anything else still open.
2. **Walk each open `IN PORT` chunk with the owner** (AskUserQuestion, one at a time): verified on the live deployment? Confirmed → `gh issue close <N>`. Not confirmed → it stays open; note what's outstanding. The walk runs whatever else is open — inspecting landed cargo never waits on the epic's frontier.
3. **Every implementation chunk closed** → close the map itself with a one-line completion comment pointing at the destination reached. Any chunk still open → the map stays open; report what remains. The gate reads issue state, not labels: closed is closed, whatever a chunk is labeled.

Decision tickets don't gate the close — a residual open ticket wired onto no open chunk is stale by construction; flag it to the owner for closing into Out of scope or Decisions so far as part of the walk.
