---
name: run-aground
argument-hint: "[issue#] [what the mirage is]"
description: Resolve a mirage that strikes an UNDER SAIL issue - the execution-layer dark mirror of /landfall. Executes the map-side demotion first, then puts the blast-radius call to the owner: patch at sea (amend the change in place, stays UNDER SAIL), park ADRIFT (one WIP commit staged on adrift/issue-<N> for the owner's signature, dev restored clean), or discard to UNCHARTED (tree cleaned, fresh proposal later). Owns stage-never-sign and the resume path for ADRIFT voyages. Use when a settled decision is revealed wrong mid-apply, or to resume a parked voyage.
disable-model-invocation: true
metadata:
  author: list_eddiefamily
  version: '1.0'
---

# /run-aground

The dark mirror of `/landfall`: landfall seals a finished voyage, run-aground resolves a broken one. **Trigger:** a settled decision is revealed wrong — a mirage — while its chunk is `UNDER SAIL`. Same layer, same disciplines as landfall (stage-never-sign, never `git commit`, paste-ready messages), opposite direction.

**Skills never commit.** At the park move's commit point: stage, state exactly what is ready with the **paste-ready commit message**, and **stop** — the owner signs at the screen. Never run `git commit`; never retry a blocked or unattended signature.

## Step 1 — demote on the map, always

Execute [demotion.md](../map/reference/demotion.md) first: reopen the original ticket, post the invalidation evidence, move the gist back to Not yet specified marked *reopened*, flip dependent chunks `CHARTED` → `UNCHARTED` with the reopened ticket wired blocked-by. The map-side truth update runs **regardless of blast radius** — a mirage is real whatever it costs the voyage.

## Step 2 — the blast-radius call

Put it to the owner (AskUserQuestion), by how much of the voyage the mirage sinks. Exactly three moves:

### Patch at sea — destination stands, course was wrong

Amend the still-active change's design/spec/code in place; the issue stays `UNDER SAIL`. This is the existing fix-forward mechanic — cheap because the contract hasn't sealed.

### Park — premise invalidated, cargo worth keeping

1. Create the branch `adrift/issue-<N>` and stage the in-flight work as **one WIP commit** for the owner to sign — stage, report the paste-ready message, stop. Never sign; a blocked signature is never retried. Sessions may end at the hand-off; re-invocation resumes from state.
2. After the signature: restore `dev` to a clean tree.
3. Relabel the issue `UNDER SAIL` → `ADRIFT`. The tree is no longer occupied; **`UNDER SAIL` never survives a park**.

### Discard — a fresh proposal is cheaper than untangling

Remove the in-flight work and the change's artifacts from the tree; relabel the issue `UNDER SAIL` → `UNCHARTED`. The next voyage starts clean from a re-plotted chart.

`ADRIFT` vs `UNCHARTED` is not provenance — they encode different resume paths (recover cargo vs start clean).

## Resume path (`ADRIFT` → back under sail)

When the owner resumes a parked issue: merge the `adrift/issue-<N>` branch back into `dev` **locally**, and relabel the issue `ADRIFT` → `UNDER SAIL`.

## Guardrails

- **The tree exception lives here.** This is the only skill outside `/landfall`'s landing flow permitted to stage work — exactly one WIP commit on `adrift/issue-<N>`, in the park move only.
- **Half-finished work is never merged to `dev`.** Park moves it to its own branch; discard removes it.
- **One beacon per issue.** After any move the board carries exactly one routing label: patch keeps `UNDER SAIL`, park stamps `ADRIFT`, discard stamps `UNCHARTED` — this skill stamps both of the latter.
