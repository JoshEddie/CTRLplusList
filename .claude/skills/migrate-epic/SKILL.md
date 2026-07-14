---
name: migrate-epic
argument-hint: "<governing-issue#>"
description: TEMPORARY helper - migrate a pre-map-workflow governing epic (an old-style issue with manually listed sub-issues) into the new map workflow. Wraps /map's chart phase with the migration policies - consume the old governing issue, re-parent closed sub-issues, sweep earned decisions as re-validation candidates, re-distill open sub-issues into fresh chunks. Delete this skill once no pre-workflow epics remain.
disable-model-invocation: true
metadata:
  author: list_eddiefamily
  version: '1.0'
---

# /migrate-epic

**Temporary.** Exists to translate governing epics that predate the map workflow (e.g. #141) into `MAP` indexes. Once every pre-workflow epic is migrated, delete this directory — the policies below matter only at the boundary between the two eras. Nothing references this skill; removal is clean.

This is a wrapper around `/map`'s chart phase. Everything not stated here follows [/map](../map/SKILL.md) exactly: guardrails (GitHub issue writes only, never the tree, never commits, ungated), the label machine, the map-body template, ticket types, the write-back discipline (owner approves every body before any issue is created or edited).

## Usage

```
/migrate-epic <governing-issue#>
```

## Migration policies (what differs from a fresh chart)

1. **The old governing issue is input — consumed, never converted.** It becomes the prompt for charting. At the end it is closed with a pointer comment to the new `MAP` index. No in-place relabeling of the old epic.
2. **Its earned decisions are candidates, not decisions.** The old body's context/decision sections ("don't re-litigate" lists included) enter chart's re-validation sweep: each is confirmed into Decisions so far as a gist line, or demoted to fog / a fresh ticket. They were earned under old terrain — vendor pricing, API access rules, and landed code may all have shifted.
3. **Landed state is scouted, not remembered.** Before chunking, fire a `SCOUTING` ticket per landed sub-issue area: what actually shipped (archived OpenSpec changes, commits, live behavior), reported as the ticket's resolution comment. The map starts from terrain, not from the old epic's claims.
4. **Closed sub-issues are re-parented as-is.** They are cargo, not input — history stays in its original thread. No duplicates, no `IN PORT` (they are past inspection; closed is terminal in both eras), no routing labels added. Re-parent so the new index shows the epic's full history and `/close-map`'s all-chunks-closed gate counts them trivially.
5. **Open sub-issues are raw material, not chunks.** At exit their content is re-distilled into fresh chunk issues (born `CHARTED`/`UNCHARTED` per blocking, milestone-assigned individually); each old open sub-issue is then closed with a pointer comment to its successor.
6. **The old epic's milestone does not move to the map.** Maps carry no milestone; chunks inherit the release individually at exit.

## Steps

1. Read the governing issue and every sub-issue (`gh issue view <N> --json title,body,labels,state,milestone,comments`; sub-issue list via the endpoint below). Present the migration inventory to the owner: what's closed (to re-parent), what's open (to re-distill), what decisions the body claims (to sweep).
2. Run `/map`'s chart phase on the governing issue's content with the re-validation sweep of policy 2, plus policy-3 scouting tickets. Chart proceeds exactly as `/map` specifies — destination named via `/grill-me`, fog to Not yet specified, tickets as sub-issues.
3. Create the `MAP` index (owner-approved body, no milestone).
4. Re-parent sub-issues. First verify the endpoint accepts closed issues (it should; confirm live before batching):

   ```bash
   # remove from the old parent, then add to the new map
   gh api repos/{owner}/{repo}/issues/<old-epic#>/sub_issue -X DELETE -F sub_issue_id=<numeric id>
   gh api repos/{owner}/{repo}/issues/<map#>/sub_issues -X POST -F sub_issue_id=<numeric id>
   # id lookup: gh api repos/{owner}/{repo}/issues/<n> --jq .id
   ```

   Closed sub-issues re-parent as-is (policy 4). Open sub-issues re-parent too if their content will be consumed at exit, or stay put until then — either way they are closed with pointer comments when their successor chunks are created.
5. Close the old governing issue with a pointer comment naming the new map by title-wrapped link (policy 1).
6. Hand off: report the map's frontier. Decision work continues in ordinary `/map` work sessions; exit cuts the chunks; this skill's job ends at the consume step.

## What this skill never does

Everything `/map` never does — plus: it never edits landed history (closed issues keep their labels, comments, and state), never assigns the map a milestone, and never carries old routing labels (`IDEA`, `EXPLORE NEEDED`, `HOLD`) onto anything it creates.
