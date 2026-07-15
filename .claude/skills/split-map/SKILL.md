---
name: split-map
argument-hint: "<map#>"
description: Cut a map at the landed boundary - create an owner-approved successor map on the next milestone, migrate unstarted chunks and their gating tickets, dispatch residual fog per line, and seed one re-orientation PLOTTING ticket that gates every migrated chunk. The only operation that lets a map's scope cross a release boundary. Use when a milestoned map will not finish in its release, or when /close-map refuses to close a map holding leftovers.
disable-model-invocation: true
metadata:
  author: list_eddiefamily
  version: '1.0'
---

# /split-map

The only operation that cuts a map at the landed boundary. A map is atomic with respect to its release — a single chunk never moves to another release. When a milestoned map will not finish, the options are: finish it, re-milestone the whole map (nothing landed yet), or split it here. The predecessor keeps its landed chunks and its milestone; everything unstarted moves to a successor map on the next milestone.

This is a **permanent thin wrapper** around `/map`'s machinery. Everything not stated here follows [/map](../map/SKILL.md) exactly: guardrails (GitHub issue writes only, never the tree, never commits, ungated), the label machine, the map-body template, ticket types, the write-back discipline (owner approves every body before any issue is created or edited).

## Usage

```
/split-map <map#>
```

## Guardrails

- Everything `/map` never does — no tree, no commits, no push.
- **Never closes anything** — no issue, no map. Closing is `/close-map`'s act; the predecessor closes through its inspection walk after the split.
- **An active voyage pins the split.** Any chunk labeled `UNDER SAIL` or `ADRIFT` stops the split before anything migrates — name the voyage; it must resolve via `/landfall` or `/anchor` first.

## Split policies

1. **Only unstarted chunks migrate.** Landed chunks (`IN PORT` or closed) stay under the predecessor as its cargo. Unstarted chunks (`CHARTED`/`UNCHARTED`) re-parent to the successor together with any open decision tickets that gate them.
2. **Residual fog is dispatched per line.** Each Not-yet-specified line is the owner's per-line choice: carry it into the successor's Not yet specified, or demote it to an `OFF THE MAP` issue when it has drifted from the destination.
3. **Relevant decisions travel as copies with provenance.** Decisions-so-far gists relevant to migrated chunks are copied into the successor body, each linking back to its original ticket. They arrive as inherited claims, not settled truth — the re-orientation ticket re-validates them.
4. **One re-orientation `PLOTTING` ticket gates the successor.** Seeded as the successor's first sub-issue and wired blocked-by onto **every** migrated chunk, so migrated chunks are born `UNCHARTED` under the standard exit rule. Its resolution must: verify the predecessor map is fully closed, re-validate each copied decision gist against the shipped terrain (confirmed or demoted to fog), confirm migrated chunk bodies still match landed reality, and sharpen residual fog the shipped release settled. Sharpness is perishable — the successor resumes from terrain, not memory.
5. **Both bodies cross-link.** Predecessor Notes gains a continued-in line naming the successor by title-wrapped link; successor Notes gains an origin line naming the predecessor. The predecessor body's migrated fog lines and chunk gists are pruned so each map reads as exactly its own scope.

## Steps

1. Read the map and every sub-issue (`gh api --paginate repos/{owner}/{repo}/issues/<map#>/sub_issues --jq '.[] | {number, state, title, labels: [.labels[].name]}'`). **Stop on any `UNDER SAIL` or `ADRIFT` chunk.** Partition: landed (`IN PORT`/closed) vs unstarted, plus open decision tickets and fog lines.
2. Present the split line to the owner: what stays (landed), what migrates (unstarted chunks + gating tickets), the per-line fog dispatch choices, and which Decisions-so-far gists travel. Nothing is created or edited until they approve.
3. Create the successor `MAP` index — five-section body per `/map`'s template, milestone set to the **next release**, Notes carrying the origin link.
4. Re-parent each migrating chunk and gating ticket (endpoints verified live on this repo during the #141 migration; id lookup: `gh api repos/{owner}/{repo}/issues/<n> --jq .id`):

   ```bash
   # remove from the predecessor, then add to the successor
   gh api repos/{owner}/{repo}/issues/<old-map#>/sub_issue -X DELETE -F sub_issue_id=<numeric id>
   gh api repos/{owner}/{repo}/issues/<new-map#>/sub_issues -X POST -F sub_issue_id=<numeric id>
   ```

5. Create the re-orientation `PLOTTING` ticket as a successor sub-issue and wire it blocked-by onto every migrated chunk (`gh api repos/{owner}/{repo}/issues/<chunk#>/dependencies/blocked_by -X POST -F issue_id=<ticket numeric id>`); relabel each migrated chunk `UNCHARTED`.
6. Dispatch fog per the owner's line choices: successor Not yet specified, or a distilled `OFF THE MAP` issue.
7. Edit both map bodies: cross-links in, migrated scope pruned from the predecessor, copied gists (with links back) into the successor.
8. Hand off: report the predecessor's remaining close path (`/close-map` once its landed cargo is inspected) and the successor's frontier (the re-orientation ticket).
