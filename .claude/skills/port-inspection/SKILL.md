---
name: port-inspection
argument-hint: "[map#|issue#]"
description: Inspect IN PORT cargo with the owner - walk a map's open IN PORT chunks (map#), a single chunk (issue#), or recommend candidates from recent dev landings (no arg). Each stop surfaces "closing this unblocks #N" from the chunk's dependents; verified on the dev deployment, before the release cuts -> close. Invokable whenever cargo is in port - inspection never waits on the epic's frontier. Use when landed chunks await inspection or a dependent sits blocked behind IN PORT cargo.
disable-model-invocation: true
metadata:
  author: list_eddiefamily
  version: '1.0'
---

# /port-inspection

The `IN PORT` inspection walk. `/landfall` labels a landed chunk `IN PORT` and never closes it — `IN PORT` is uninspected cargo; closing is inspection's act, and inspection is the owner's. Closing is also what unblocks dependents: GitHub blocked-by relationships gate on the blocker's *state*, so a chunk sitting `IN PORT` keeps its dependents off the frontier however long ago its code landed.

**The verification surface is the dev deployment, before the map's release cuts** — never production. A map milestoned to a release must be fully closed before that release cuts (`/release-review` owns the gate), so inspection always happens pre-cut on dev. A regression discovered in production after ship is a **new bug ticket scoped to a patch release**, not a reopened chunk.

## Guardrails

- Side effects are GitHub issue operations only, via `gh`. No trunk preconditions gate; never touches the tree, never commits.
- Closes chunks only — never a map. `/close-map` is the only closer of maps.

## Scoping

Resolve the argument and discriminate by the `MAP` label on the resolved issue — never by guessing from body shape:

- **`MAP` issue#** — walk that map's open `IN PORT` chunks: `gh api --paginate repos/{owner}/{repo}/issues/<map#>/sub_issues --jq '.[] | {number, state, title, labels: [.labels[].name]}'`, filter open + `IN PORT`.
- **Chunk issue#** — inspect just that chunk.
- **No argument** — never walk anything silently. Read recent `issue-<N>:` commits on `dev` (`git log`), resolve which of those issues are open and labeled `IN PORT`, resolve their parent maps, and **recommend** the candidate map(s)/chunk(s) to the owner (AskUserQuestion). The owner picks; only then does a walk run. The heuristic is advisory — recent landings are where uninspected cargo accumulates, but the owner can always pass a map#/issue# directly.

## Walk

Each in-scope chunk gets one stop, walked with the owner one at a time (AskUserQuestion):

1. **Dependents lookup** — `gh api repos/{owner}/{repo}/issues/<n>/dependencies/blocking --jq '.[] | {number, state, title}'`. Each *open* dependent is reported in the stop's question as "closing this unblocks #N — title". No dependents → nothing extra said. A failed lookup is reported, never read as "no dependents"; the stop still proceeds — the surface is informational, not a gate.
2. **Verification question** — verified on the dev deployment? Confirmed → `gh issue close <N>`. Not confirmed → the chunk stays open; note what's outstanding.
