---
name: embark
argument-hint: "<issue#>"
description: Board and prep a CHARTED issue for the voyage - gate on trunk preconditions (on dev, up to date), verify the issue is cleared for work (label CHARTED AND zero open blockers), run the terrain check against current code and specs, then run OpenSpec propose seeded from the issue body with inherited map decisions. CHARTED with no open blocker is the only state it acts on; anything else stops. Use when picking up a cleared issue to start a new change on dev.
metadata:
  author: list_eddiefamily
  version: '2.0'
---

# /embark

The execution layer's entry point: turns a `CHARTED` GitHub issue into a proposed OpenSpec change on `dev`. A thin dispatcher — it owns no map mechanics, creates no commits, never pushes, never edits code. Definition work (fog, epics, re-plotting) belongs to the definition layer; embark's job is boarding, provisioning, and leaving dock.

## Usage

```
/embark <issue#>
```

The issue number is required; without one, ask for it and stop.

## Gate — hard stop, checked first

Both must hold before the issue is even read; on failure report exactly which failed and stop:

1. **On `dev`** — `git branch --show-current` is `dev`.
2. **Up to date with origin** — after `git fetch origin dev`, `dev` is not behind `origin/dev`.

The one-change-mid-apply gate is **not** here — it lives in `/set-sail`, at the moment the tree becomes occupied. Proposal artifacts coexisting in the tree don't block an embark.

## Boarding check — `CHARTED` and unblocked, or stop

```bash
gh issue view <N> --json title,body,labels,comments
```

`CHARTED` is the only state embark acts on. Anything else stops — report the routing labels found; [the label machine](../map/reference/label-machine.md) names the skill that owns each. Lowercase labels are human triage and never route.

The label alone does not board. Verify zero open blockers:

```bash
gh api --paginate repos/{owner}/{repo}/issues/<n>/dependencies/blocked_by \
  --jq '.[] | {number, state, title}'
```

Any blocker with state `open` stops embark — report each blocking issue by number and title. Closed blockers are sequencing history, not gates. A failed query stops loudly too: an error is never read as "no blockers".

## Terrain check — before proposing

Charting sharpness is perishable; re-verify at departure time. Re-read the issue body and, when it links a `MAP` index, that map's Decisions so far, against the **current** code and specs. Surface anything that shifted since charting. A settled map decision contradicted by landed code is a mirage — fire [/anchor](../anchor/SKILL.md) on it before any proposal work begins.

## Propose

Run the OpenSpec propose flow (`/opsx:propose`) seeded from the issue body. The grilling interview runs in-conversation, one decision at a time, and **concludes only when the owner explicitly confirms shared understanding** — never self-certify it.

**Inherited map context:** when the issue's body links a `MAP`-labeled index, read that map's Decisions so far first. Settled owner decisions are cited, not re-asked; the grilling covers only what the map left open. Any gist carrying an ***unreviewed*** marker (auto-closed scouting) is suspect — re-validate it with the owner instead of citing it.

**Map tracking is a sailing duty, not `/anchor`.** Keeping a `MAP` body in sync with what a voyage actually built — recording that a chunk shipped a refined-but-in-promise shape — is ordinary set-sail / embark bookkeeping, done by the skill that boarded the work. Only a **bearing change** (a settled map decision now contradicted, a discovery that re-charters the map) routes to [/anchor](../anchor/SKILL.md). A within-promise refinement is tracked, not anchored.

No artifact commit is made — the change lives in the working tree until `/landfall`. Embark flips no label: proposal artifacts are tree state, authoritatively recorded by the change directory; `/set-sail` stamps `UNDER SAIL` when apply begins.

## Epic route-out

The grilling MAY conclude the input is epic-sized — bigger than one OpenSpec change. Put that conclusion to the owner; on their confirmation, hand off to [/map](../map/SKILL.md)'s chart phase **in the same conversation** instead of continuing (no proposal is drafted). Already-given interview answers carry into chart as candidates subject to its re-validation sweep — that treatment is `/map`'s to own.

## Never commits

At no point does this skill run `git commit`, stage files for one, or push. Issue reads and label operations via `gh` are its only side effects outside the OpenSpec change directory.
