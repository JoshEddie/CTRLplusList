---
name: adjudicate-review
argument-hint: "<change>"
description: Owner adjudication over a persisted spec-review report - a fresh-session, file-driven pass that re-grounds each disposition in the cited code, interviews the owner one finding at a time, and appends an ### Adjudications subsection to review.md with a recomputed effective verdict. Reads only the change's review.md; takes no runtime dependency on the spec-review skill. Use after /spec-review or /recheck-review to settle dispositions before landing.
metadata:
  author: list_eddiefamily
  version: '1.1'
---

# /adjudicate-review

The owner's adjudication pass over a persisted `review.md`. `/spec-review` and
`/recheck-review` *propose* dispositions; this skill is where the owner *settles*
them — re-grounding each in the code it cites, then recording any changes back
into the file so `/recheck-review` and `/landfall` read the settled result.

**File-driven by design.** Its only input is the change's `review.md`. Run it in a
**fresh session** — a fresh chat's prose is worthless, so the file is the only
durable substrate and adjudications structurally cannot be left in chat. This is
the same shape as `/recheck-review`: a file-driven reader of `review.md` that
appends to it, taking no runtime dependency on the `spec-review` skill.

It reads `.claude/skills/spec-review/reference/finding-format.md` **for format
only** — the finding-table shape, the durable finding-ID scheme, the
`### Adjudications` subsection structure, and the as-amended reader rule.

## Usage

```
/adjudicate-review <change>
```

- **`<change>`** → reads `openspec/changes/<name>/review.md` and nothing else.
- **No argument** → resolve the single active change with a `review.md` that has
  findings; announce it. When more than one qualifies, ask the owner to choose via
  **AskUserQuestion** — never guess. None → say so and stop.

## Step 1 — Re-ground the latest round

Read the target `review.md`, take its **latest round**, and re-ground **every**
finding in the code it cites — including findings dispositioned `Drop`. Do this
re-grounding by invoking the **`/opsx:explore`** skill explicitly: follow each
finding's citation into the actual code under that skill and confirm whether the
finding (and its proposed disposition) still holds. The invocation is required,
not optional — "explore" here names the skill, not a loose mode of reading.

Treat the persisted dispositions as **proposals to confirm or reopen**, not as
settled. A `Drop` may prove real on a second look; a `Fix now` may prove already
handled or genuinely out of scope. The fresh session is a feature — the
re-grounding is an independent second look from the citations, not an echo of the
original reviewer's reasoning.

## Step 2 — Interview the owner, one finding at a time

Drive the adjudication as a `grill-me`-style interview: put **one finding, or one
merge-group, per `AskUserQuestion`** — never batch unrelated findings into a single
question. Each question SHALL:

- name the finding ID(s) it covers by their durable IDs (for a merge, name both,
  e.g. "`A1+C3` are the same defect; this question covers both"),
- carry the re-grounded evidence from step 1, and
- offer a **recommended disposition**.

Walk the findings until the owner has confirmed or changed each. Do not skip the
interview.

### Confirmed `File issue` → create the issue in-interview

When the owner confirms a finding as `File issue`, ask one follow-up: the
issue's **type** —

- **chunk into the change's open map** (same-release commitment) → create via
  `gh issue create`, then wire it as a **sub-issue of the map issue**;
- **standalone follow-up** → create via `gh issue create --label 'OFF THE MAP'`.

Plain `gh` only — do not invoke `/anchor` or any map-skill mechanics. Record the
created issue's link in that finding's Adjudications **Rationale** column. A
confirmed `File issue` with no created issue is not settled — do not record it
as such.

## Step 3 — Write the adjudications (only on change)

Per the `### Adjudications` structure in `reference/finding-format.md`:

- **If ≥1 disposition changed or findings merged** → append an
  `### Adjudications (<date>)` subsection **inside the latest `## Round N` block**,
  beneath its `**Verdict:**` line. List **only the changed findings**, by durable
  ID, with columns `# | Old → New | Rationale`. Then compute and write the
  recomputed **effective verdict** as a `**Verdict:**` line beneath the table (the
  verdict keys off the amended dispositions, not counts — an adjudication alone can
  reach `clear to land`). Never rewrite the round's findings table or any prior
  round; never create a new round; never bump the header's `round:`.
- **If nothing changed** (every disposition confirmed as-is) → **write nothing**
  and say so. The round's original table and verdict stand; `round:` is untouched.

### Clearing verdict deletes the pending gate section

When the recomputed effective verdict clears the latest round (`clear to land`),
**delete** that round's pending `## Gates — round <n>` section from the change's
`tasks.md` — a gate for findings that no longer block is dead weight and would
wedge `/landfall`'s all-tasks-checked gate on a cleared round. Scoped strictly:
only the latest adverse round's pending section; never a prior round's checked
section, never any other `tasks.md` content, never `review.md` content. When the
recomputed verdict does not clear the round, the gate section stands.

### Adverse promotion owes a gate line for every promoted `Fix now`

The mirror of the clearing case. When adjudication **promotes** a finding to an
open `Fix now` (from `Drop` or `File issue`), that finding now owes a gate item in
the latest round's `## Gates — round <n>` section — whichever of two cases holds:

- **Round had no pending gate section** (its own verdict cleared it, so the review
  never wrote one) → **append** the section to the change's `tasks.md` per the
  gate-section shape in `reference/finding-format.md`: one item per open `Fix now`
  finding by durable ID, plus the full pre-merge gate set restated (skipped gates
  omitted per that doc). Appended as the next numbered section.
- **Round already carries a pending gate section** (it was adverse before, or an
  earlier promotion created it) → do **not** add a second section; **insert one
  gate line** per newly-promoted `Fix now` finding (by durable ID) into the
  existing section's **finding block**, then **renumber the whole section** so the
  verification-gate lines keep their fixed order after all finding items. Finding
  items always precede the gates; the gates must run **after** every fix. A
  section with `N.1 fix A1 / N.2 lint / N.3 tsc …` promoting `B2` becomes
  `N.1 fix A1 / N.2 fix B2 / N.3 lint / N.4 tsc …`. A promoted finding whose item
  is missing is ungated — the existing gates were written for the findings adverse
  at review time, not the ones adjudication just added.

Either way, every open `Fix now` in the round's amended dispositions has exactly
one gate line, ahead of the verification gates. Without it the invalidated pre-merge gates stay checked and
`/landfall`'s all-tasks-checked gate never re-runs them after the promoted fix
lands. Scoped strictly: only the latest round's section, never a prior round's
section or any other `tasks.md` content.

### Demotion checks off and annotates the finding's gate line

The opposite move. When adjudication **demotes** a finding out of open `Fix now`
(to `Drop` or `File issue`) and the round stays adverse, its gate line in the
latest round's `## Gates — round <n>` section is **checked off in place** and
**annotated** with the disposition — a trailing `— _italic note_` on the item line
itself (the repo's tasks.md convention for annotating a checked item), saying
there is no work to do, naming the disposition change, and pointing at the round's
`### Adjudications`. `— dropped at adjudication` for a `Drop`, `— filed #<N>` for
a confirmed `File issue`, carrying the issue number created in-interview.

Not deletion — the line stays as the visible record that the finding existed and
how it left the open set. Without the check, the fix session faces an item with no
work behind it and `/landfall`'s all-tasks-checked gate blocks on a finding that
no longer blocks. Scoped strictly: only the latest round's section, only lines for
findings this adjudication demoted, no renumbering (the item count is unchanged).
The annotation is never a lead-in note (too far from the item to stop a fix
session mid-scan) and never a nested blockquote or GitHub `> [!IMPORTANT]` alert
(the editor's markdown preview renders the alert marker as literal text).

**No commits, no staging, no fixes.** This skill's side effects are exactly:
the `review.md` append, the pending gate-section delete on a clearing verdict,
the gate line(s) added (or the section created) for each promoted `Fix now`, the
gate line checked off and annotated for each demoted finding, and
`gh issue create` for confirmed `File issue` dispositions. Fixing findings and
landing remain separate acts.
