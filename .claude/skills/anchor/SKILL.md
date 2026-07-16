---
name: anchor
argument-hint: "[map# | issue#] [what was discovered]"
description: Execute a bearing move on a map - promote fog into a typed decision ticket, demote a settled decision revealed as a mirage (reopen the original ticket, coin-flip affected chunks to UNCHARTED), charter a release-blocking in-Destination discovery onto an open map as a chunk (a thin wrapper over map's exit mechanics, leaving the voyage under sail), re-sync the map body against ticket reality, and triage a mirage that strikes mid-voyage (patch at sea, park ADRIFT, or discard to UNCHARTED). Use at the moment a discovery changes the map's decision state or belongs on its chart, from any session - map work, embark, or mid-apply.
disable-model-invocation: true
metadata:
  author: list_eddiefamily
  version: '1.0'
---

# /anchor

Decision state is bidirectional for the epic's whole life: fog sharpens into tickets, and settled decisions dissolve on approach — mirages. Every bearing move runs through this skill. Any session — a map session, `/embark` on a chunk, mid-apply, or the owner simply remembering — MAY anchor at the moment of discovery. **No session carries a proactive detection duty**: anchor is fired by discoveries, not by patrols.

## Guardrails

- **Map-side moves write GitHub issues only** — issues, comments, labels, sub-issue links, blocked-by, via `gh`. No trunk preconditions gate.
- The **sole tree exception** is the park move below: it stages a WIP commit for the owner's signature — and never signs it. Skills never run `git commit`.
- Half-finished work is **never merged to `dev`**.

## Promote (fog → ticket)

Identical before and after exit:

1. State the question precisely — if it can't be stated precisely yet, it stays fog.
2. Create the typed sub-issue on the map, labeled exactly one of `PLOTTING`/`SCOUTING` (mechanics in [/map](../map/SKILL.md) § GitHub mechanics).
3. Wire blocked-by onto any chunks the decision gates (post-exit).
4. Remove the fog line from Not yet specified.
5. A new `SCOUTING` ticket fires its background subagent at creation, as always.

A manual prerequisite the owner has completed graduates the same way: the fog line that named it either dissolves into a decision gist or promotes to the ticket it was waiting to unblock.

## Demote (settled decision → mirage)

1. Reopen the **original** ticket — one thread holds the decision's whole history; refer-by-name keeps working. Never open a superseding ticket.
2. Post the invalidation evidence as a comment on it.
3. Edit the map body: move the gist line from Decisions so far back to Not yet specified, marked *reopened*.
4. **Coin-flip affected chunks**: any implementation chunk that builds on the demoted decision flips `CHARTED` → `UNCHARTED`, and the reopened ticket is wired blocked-by onto it.

## Charter (discovery → chunk on an open map)

A discovery that belongs to an open map's Destination and blocks its release is cut onto that map here, at the moment of discovery. Anchor **diagnoses and triggers**; the cut itself is a thin wrapper over [/map](../map/SKILL.md) § Exit, which owns the mechanics — the same shape [/split-map](../split-map/SKILL.md) already uses, so the definition layer's worked-issue-creation monopoly holds. `/map` alone stamps a chunk's birth label; the wrapper is transparent and is not a stamper.

### The criteria are conjunctive

Diagnose which condition the discovery meets — its facts pick the branch, and no branch is the fallback:

- **Inside an open map's Destination, and release-blocking** — that map's release cannot verify or ship without it (landed cargo found broken, say) → cut it as a chunk of that map.
- **Inside an open map's Destination, and the release can ship without it** → put it to the owner per discovery: a fog line on the map, or an `OFF THE MAP` issue. No chunk.
- **Outside every open map's Destination** → `OFF THE MAP`.

### The chunk's birth

Exit's mechanics, unchanged: an owner-approved distilled body (problem, settled decisions linked from the map, constraints), created as a sub-issue of the map, **no milestone** — the milestone lives only on the map issue — labeled `CHARTED` unless an open decision ticket gates it directly (then `UNCHARTED`), with blocked-by wired onto anything it builds on.

### Charter does not stop the voyage

It writes only GitHub issues, so an occupied tree is irrelevant: a chartering session mid-voyage leaves its issue `UNDER SAIL`, touches nothing in the tree, and sails on. The discovery is left for a future voyage, never folded into the active change. This is the seam against mid-voyage triage below, which **does** stop work — a mirage invalidates the active change's premise; a charter-worthy discovery is orthogonal to it.

Charter is silent on release pressure. The criteria alone decide; no scope warning is owed. A map that will not finish is `/split-map`'s case.

## Re-sync

Anchor owns the map-body edit as a scripted step of every move above. Independently, when asked (or when a map work session loads a drifted map), re-sync the body against ticket reality: gist lines and links only, never restated content — the decision lives on its ticket.

## Mid-voyage triage (mirage strikes an `UNDER SAIL` issue)

Stop work and put the blast-radius call to the owner (AskUserQuestion), after executing the demote above on the map. Three options, by how much of the voyage the mirage sinks:

### Patch at sea — destination stands, course was wrong

Amend the still-active change's design/spec/code in place; the issue stays `UNDER SAIL`. This is the existing fix-forward mechanic — cheap because the contract hasn't sealed.

### Park — premise invalidated, cargo worth keeping

1. Create the branch `adrift/issue-<N>` and stage the in-flight work as **one WIP commit** for the owner to sign (stage, report the message, stop — never sign).
2. After the signature, restore `dev` to a clean tree.
3. Relabel the issue `UNDER SAIL` → `ADRIFT`. The tree is no longer occupied; `UNDER SAIL` SHALL NOT survive a park move.

Resume later = merge the branch back into `dev` locally and relabel `UNDER SAIL`.

### Discard — a fresh proposal is cheaper than untangling

Remove the in-flight work and the change's artifacts from the tree; relabel the issue `UNDER SAIL` → `UNCHARTED`. The next voyage starts clean from a re-plotted chart.

`ADRIFT` vs `UNCHARTED` is not provenance — they encode different resume paths (recover cargo vs start clean).
