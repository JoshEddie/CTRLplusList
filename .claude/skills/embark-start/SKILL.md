---
name: embark-start
argument-hint: "<issue#>"
description: Board a CHARTED issue and open the change - gate on trunk preconditions (on dev, up to date), verify the issue is cleared for work (label CHARTED AND zero open blockers), run the terrain check against current code and specs, then create the change directory and generate proposal.md and nothing else. CHARTED with no open blocker is the only state it acts on; anything else stops. Use when picking up a cleared issue to start a new change on dev.
disable-model-invocation: true
metadata:
  author: list_eddiefamily
  version: '3.0'
---

## Usage

```
/embark-start <issue#>
```

The issue number or github issue link is required; without one, ask for it and stop.

## Gate — hard stop, checked first

Both must hold before the issue is even read; on failure report exactly which failed and stop:

1. **On `dev`** — `git branch --show-current` is `dev`.
2. **Up to date with origin** — after `git fetch origin dev`, `dev` is not behind `origin/dev`.

The one-change-mid-apply gate is **not** here — it lives in [/embark-apply](../embark-apply/SKILL.md), at the moment the tree becomes occupied. Planning artifacts coexisting in the tree don't block a boarding.

## Boarding check — `CHARTED` and unblocked, or stop

```bash
gh issue view <N> --json title,body,labels,comments
```

`CHARTED` is the only state this skill acts on. Anything else stops — report the routing labels found and stop there; [the label machine](../map/reference/label-machine.md) names the owner for the report, not a handoff. Definition work (fog, epics, re-plotting) belongs to the definition layer, and this skill never delegates into it. Lowercase labels are human triage and never route.

The label alone does not board. Verify zero open blockers:

```bash
gh api --paginate repos/{owner}/{repo}/issues/<n>/dependencies/blocked_by \
  --jq '.[] | {number, state, title}'
```

Any blocker with state `open` stops boarding — report each blocking issue by number and title. Closed blockers are sequencing history, not gates. A failed query stops loudly too: an error is never read as "no blockers".

## Re-invocation

If the change already holds `proposal.md`, report that nothing remains here and name [/embark-design](../embark-design/SKILL.md). Do not re-board and do not regenerate the proposal.

## Terrain check — before anything is created

Charting sharpness is perishable; re-verify at departure time. Re-read the issue body and, when it links a `MAP` index, that map's Decisions so far, against the **current** code and specs. Surface anything that shifted since charting. A settled map decision contradicted by landed code is a mirage — fire [/anchor](../anchor/SKILL.md) on it before anything is created.

**Epic route-out.** The terrain check MAY conclude the issue is bigger than one OpenSpec change. Put that conclusion to the owner; on their confirmation, hand off to [/map](../map/SKILL.md)'s chart phase **in the same conversation** instead of continuing — no change directory is created. The issue body and the map decisions the terrain check surfaced carry into chart as candidates subject to its re-validation sweep; that treatment is `/map`'s to own.

## Open the change

1. `openspec new change` to create the change directory.
2. `/opsx:continue` once, generating **`proposal` and no other artifact**, seeded from the issue body. The proposal records the issue it came from — the number when you were given a number, the URL when you were given a link — so every later member reads the in-scope issue from the change directory alone.

**Inherited map context:** when the issue's body links a `MAP`-labeled index, read that map's Decisions so far first. Settled owner decisions are cited as settled context, not restated as open questions. Any gist carrying an ***unreviewed*** marker (auto-closed scouting) is carried as **provisional** — the interview that clears it has not run yet.

The grilling interview does not run here, and no specs, design, acceptance, tasks or review artifact is written. `/opsx:propose` and `/opsx:ff` are off the arc entirely — they emit the bundle in one turn, leaving the owner no checkpoint.

**Map tracking is a sailing duty, not `/anchor`.** Keeping a `MAP` body in sync with what a voyage actually built — recording that a chunk shipped a refined-but-in-promise shape — is ordinary bookkeeping, done by the skill that boarded the work. Only a **bearing change** (a settled map decision now contradicted, a discovery that re-charters the map) routes to [/anchor](../anchor/SKILL.md). A within-promise refinement is tracked, not anchored.

No artifact commit is made — the change lives in the working tree until `/landfall`. This skill flips no label: planning artifacts are tree state, authoritatively recorded by the change directory; `/embark-apply` stamps `UNDER SAIL` when apply begins.

## Never commits

At no point does this skill run `git commit`, stage files for one, or push. Issue reads via `gh` are its only side effects outside the OpenSpec change directory.

## Stop

End the turn here. Next: [/embark-design](../embark-design/SKILL.md) — the grilling interview, then specs and design.
