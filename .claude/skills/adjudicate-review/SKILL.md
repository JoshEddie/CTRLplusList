---
name: adjudicate-review
argument-hint: "<change>"
description: Owner adjudication over a persisted spec-review report - a fresh-session, file-driven pass that re-grounds each disposition in the cited code, interviews the owner one finding at a time, and appends an ### Adjudications subsection to review.md with a recomputed effective verdict. Reads only the change's review.md; takes no runtime dependency on the spec-review skill. Use after /spec-review or /recheck-review to settle dispositions before landing.
metadata:
  author: list_eddiefamily
  version: '1.0'
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
finding in the code it cites — including findings dispositioned `Drop`. This is a
concise explore pass: follow each finding's citation into the actual code and
confirm whether the finding (and its proposed disposition) still holds.

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
  e.g. "`s1+c3` are the same defect; this question covers both"),
- carry the re-grounded evidence from step 1, and
- offer a **recommended disposition**.

Walk the findings until the owner has confirmed or changed each. Do not skip the
interview.

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

**No commits, no staging, no fixes.** This skill re-grounds, interviews, and — when
a disposition changed — appends to `review.md`. Fixing findings and landing remain
separate acts.
