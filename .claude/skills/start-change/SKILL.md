---
name: start-change
argument-hint: "<issue#>"
description: Begin work on a GitHub issue under the trunk workflow - gate on trunk preconditions (on dev, clean tree, up to date), read the issue, route by label (IDEA/EXPLORE NEEDED explore first with write-back; HOLD surfaces the hold comment), then run OpenSpec propose seeded from the issue body. Use when picking up an issue to start a new change on dev.
metadata:
  author: list_eddiefamily
  version: '1.0'
---

# /start-change

Turns a GitHub issue into an active OpenSpec change on `dev`. Routing is label-driven; the issue body is the single source propose reads. **This skill never creates commits, never pushes, and never edits code.**

## Usage

```
/start-change <issue#>
```

The issue number is required; without one, ask for it and stop.

## Preconditions — hard stop, checked first

All three must hold before the issue is even read; on any failure report exactly which failed and stop (no partial progress):

1. **On `dev`** — `git branch --show-current` is `dev`.
2. **Clean working tree** — `git status --porcelain` is empty. A dirty tree means an in-flight change: it must land via `/land-change` (or be stashed deliberately by the owner) first. This check is what enforces one-change-at-a-time.
3. **Up to date with origin** — after `git fetch origin dev`, `dev` is not behind `origin/dev`.

## Read the issue

```bash
gh issue view <N> --json title,body,labels,comments
```

Route on the labels present:

| Label | Route |
| --- | --- |
| `IDEA` or `EXPLORE NEEDED` | Explore first (below) |
| `HOLD` | Surface the hold + confirm (below) |
| none of these | Propose directly from the issue body |

## Explore route (`IDEA` / `EXPLORE NEEDED`)

1. Enter an OpenSpec explore session (`/opsx:explore`) seeded with the issue title + body, to shape the problem into something buildable — or to conclude it shouldn't move forward.
2. **Viable outcome** → write the distilled outcome back into the **issue body** (`gh issue edit <N> --body …`; keep the original ask, append/reshape so the body is the complete, current statement of what to build), remove the routing label (`gh issue edit <N> --remove-label …`), then proceed to propose from the updated body.
3. **Negative IDEA outcome** (never viable / not viable now / not worth the churn) →
   - post the findings and rationale as an issue comment (`gh issue comment`),
   - swap the label: remove `IDEA`, add `HOLD`,
   - leave the issue **open**, create **no** change, and stop.

## HOLD route

The issue was explored and parked. Surface the most recent hold comment verbatim, then ask the owner (AskUserQuestion) whether to re-explore. Only an explicit yes proceeds (into the explore route); otherwise stop. Never interpret or second-guess the hold rationale — show it.

## Propose

Run the OpenSpec propose flow (`/opsx:propose`) seeded from the (possibly just-updated) issue body. The proposal's grilling interview and artifact generation proceed as normal. No artifact commit is made — the change lives in the working tree until `/land-change`.

## Never commits

At no point does this skill run `git commit`, stage files for one, or push. Issue edits, comments, and label changes via `gh` are its only side effects outside the OpenSpec change directory.
