---
name: anchor
argument-hint: "[map# | issue#] [what was discovered]"
description: Execute a bearing move on a map - promote fog into a typed decision ticket, demote a settled decision revealed as a mirage, charter a release-blocking in-Destination discovery onto an open map as a chunk (leaving the voyage under sail), or re-sync the map body against ticket reality. A mirage striking an UNDER SAIL issue is not anchor's move - it routes to /run-aground. Writes GitHub issues only, never the tree. Use at the moment a discovery changes the map's decision state or belongs on its chart, from any session - map work, embark, or mid-apply.
disable-model-invocation: true
metadata:
  author: list_eddiefamily
  version: '2.0'
---

# /anchor

Decision state is bidirectional for the epic's whole life: fog sharpens into tickets, and settled decisions dissolve on approach — mirages. Every map-side bearing move runs through this skill. Any session — a map session, `/embark` on a chunk, mid-apply, or the owner simply remembering — MAY anchor at the moment of discovery. **No session carries a proactive detection duty**: anchor is fired by discoveries, not by patrols.

## Dispatch — observable state picks exactly one move

| Observed | Move |
| --- | --- |
| Fog sharpened — a Not-yet-specified line can now be stated precisely | **Promote** |
| A settled decision is revealed wrong | **Demote** |
| A new discovery may belong on an open map's chart | **Charter** (diagnose first) |
| The map body has drifted from ticket reality | **Re-sync** |
| A mirage strikes an issue labeled `UNDER SAIL` | Not anchor's move — fire [/run-aground](../run-aground/SKILL.md) |

## Guardrails

**GitHub issue writes only, never the tree** — issues, comments, labels, sub-issue links, blocked-by, via `gh`. No staging, no `git commit`, no push, no exception; parking work is `/run-aground`'s act. No trunk preconditions gate — branch and tree state are irrelevant to issue writes.

## Promote (fog → ticket)

Identical before and after exit. The judgment is the **precision test**: state the question precisely — if it can't be stated precisely yet, it stays fog.

1. State the question precisely.
2. Create the typed sub-issue on the map per [issue-cut.md](../map/reference/issue-cut.md), labeled exactly one of `PLOTTING`/`SCOUTING`.
3. Wire blocked-by onto any chunks the decision gates (post-exit).
4. Remove the fog line from Not yet specified.

A manual prerequisite the owner has completed graduates the same way: the fog line that named it either dissolves into a decision gist or promotes to the ticket it was waiting to unblock.

## Demote (settled decision → mirage)

Execute [demotion.md](../map/reference/demotion.md): reopen the original ticket (never a superseding one), post the invalidation evidence, move the gist back to Not yet specified marked *reopened*, flip dependent chunks `CHARTED` → `UNCHARTED` with the reopened ticket wired blocked-by.

If the mirage strikes a chunk currently `UNDER SAIL`, the demotion belongs to [/run-aground](../run-aground/SKILL.md) — it runs the same doc as its first step, then owns the blast-radius call.

## Charter (discovery → chunk on an open map)

A discovery that belongs to an open map's Destination and blocks its release is cut onto that map here, at the moment of discovery. Anchor **diagnoses and triggers**; the cut follows [issue-cut.md](../map/reference/issue-cut.md), whose per-kind rules stamp the birth label. Charter applies **only to an open map whose exit has already run**.

### The criteria are conjunctive

Diagnose which condition the discovery meets — its facts pick the branch, and no branch is the fallback:

- **Inside an open map's Destination, and release-blocking** — that map's release cannot verify or ship without it (landed cargo found broken, say) → cut it as a chunk of that map.
- **Inside an open map's Destination, and the release can ship without it** → put it to the owner per discovery: a fog line on the map, or an `OFF THE MAP` issue. No chunk.
- **Outside every open map's Destination** → `OFF THE MAP`.

### Charter does not stop the voyage

It writes only GitHub issues, so an occupied tree is irrelevant: a chartering session mid-voyage leaves its issue `UNDER SAIL`, touches nothing in the tree, and sails on. The discovery is left for a future voyage, never folded into the active change. This is the seam against a mirage — a mirage invalidates the active change's premise and stops work via `/run-aground`; a charter-worthy discovery is orthogonal to it.

Charter is silent on release pressure. The criteria alone decide; no scope warning is owed. A map that will not finish is `/split-map`'s case.

## Re-sync

When asked, or when a map work session loads a drifted map: re-sync the body against ticket reality per [map-body.md](../map/reference/map-body.md)'s edit discipline — gist lines and links only, never restated content. Every move above also keeps the body current as a scripted step.
