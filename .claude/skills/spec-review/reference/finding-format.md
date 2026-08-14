# Finding format

## Persisted-report contract

Every persisted review report — `openspec/changes/<name>/review.md` for a
spec-review, `openspec/reviews/<version>.md` for a release-review — opens with a
machine-readable header. The header is the contract the review family shares:
the review writes round 1, `/recheck-review` and `/incremental-spec-review`
append rounds and compute their deltas from the header, `/landfall` gates on the
latest round's verdict.

```yaml
---
review: spec-review | release-review
target: <change-name | milestone/version>
anchor: <sha the reviewed diff was computed against>
diff-source: <the exact diff command or PR reference reviewed>
round: <highest round number in the file>
---
```

- `anchor` — for a spec-review, the HEAD sha at review time (the staged baseline);
  for a release-review, the PR base sha. Follow-up reviews derive their scopes from
  it: recheck on a spec-review target → the unstaged working-tree diff;
  release-review → `git diff <anchor>..dev`; incremental-spec-review → A/C on
  `git diff` (unstaged), B/T on `git diff <anchor>` (whole footprint).
- `round` — updated in the header each time a round is appended; the body keeps
  every round.

### `round: 0` — the pre-review scaffold

For a spec-review target, `review.md` exists from propose time as a **scaffold**:
the header with `round: 0`, `TBD`/empty `anchor` and `diff-source`, and **no
round sections** (owned by the `review-artifact` capability). A round-less
`round: 0` file is a valid *unreviewed* state, not a malformed report — readers
treat it as "no rounds yet." `/spec-review`'s first round is **appended** into
this scaffold: it sets `round: 1`, overwrites the `TBD` `anchor`/`diff-source`
with real values, and adds `## Round 1`. `/landfall`'s verdict gate rejects a
`round: 0` scaffold (no clearing verdict exists), so nothing lands unreviewed.

### Round structure

The body is a sequence of numbered round sections, **append-only** — a new round
never rewrites or deletes a prior one. A round is **self-contained**: every part
of it — findings, "what looks good", the verdict, and any later Adjudications —
nests at `###` (or deeper) **inside** its `## Round <n>` heading. Nothing at `##`
level ever belongs to a round; the next `##` starts the next round.

```markdown
## Round <n> — <spec-review | recheck | incremental-spec-review | release-review> (<date>)

<one- to two-sentence summary>

**Scope:** <diff source> · <resolved change>

### Alignment / ### Boundary / ### Convention / ### Testing
<findings table(s), per the finding-table style below>

### What looks good
- <short bullets>

**Verdict:** <round verdict>
```

The round's **`**Verdict:**` line is the round-verdict vocabulary** (`clear to
land` / `findings remain` / …), not the session report's `Approve` / `Request
changes` wording — a persisted spec-review round maps `Approve → clear to land`
and `Request changes → findings remain` (blockers listed after). It is the last
line of a round that has no `### Adjudications` subsection; when an Adjudications
subsection is added it nests below this line and carries the round's new last
verdict-bearing line (see **Adjudications subsection**).

Round 1 is the full review's consolidated report rendered as a round: its
sections demoted to `###` under the round heading, its verdict mapped to the
round vocabulary. Recheck rounds list each prior open `Fix now` finding with its
resolution status (resolved / still open / superseded by a new finding) plus any
new findings the fix introduced. Incremental-spec-review rounds carry that same
prior-findings status table **plus** fresh arena findings tables — one round, one
verdict, subsuming a recheck on a mixed fix delta.

### Round-verdict vocabulary

Exactly one per round:

- Change reviews (spec-review / recheck / incremental-spec-review): `clear to
  land` (no open `Fix now` findings remain) · `findings remain` · `outgrew
  recheck` (recheck only — the fix delta turned out to touch both code and spec
  artifacts; run `/incremental-spec-review`).
- Release reviews: `ready to cut` · `not ready` (blockers listed).

Only open `Fix now` findings block a clear/ready verdict; `File issue` and
`Drop` dispositions never do.

### Adjudications subsection

When the owner's post-review adjudication (`/adjudicate-review`) changes at least
one finding's disposition — or merges findings — it records those deltas as an
`### Adjudications (<date>)` subsection **nested inside** the latest `## Round N`
block, beneath that round's `**Verdict:**` line:

```markdown
### Adjudications (<date>)

| # | Old → New | Rationale |
| A1 | Fix now → File issue | exceeds the charter's <boundary>; filed #280 |

**Verdict:** clear to land
```

Rules:

- **Only on change.** The subsection is written **only when ≥1 disposition
  changes or findings merge**. When adjudication confirms every disposition as-is,
  nothing is written — the round's original table and verdict stand.
- **Delta-only, never a rewrite.** It lists just the changed findings (by durable
  ID) and never rewrites the round's findings table or any prior round.
- **Never a new round.** An Adjudications subsection is an addition *within* the
  latest round block; it does **not** create a new round and does **not** bump the
  header's `round:`. A subsection may follow the last round with no round after it
  (e.g. adjudicating round 1 straight to `clear to land` with no recheck).

### Reading a round as amended

Every reader (`/recheck-review`, `/incremental-spec-review`, `/landfall`) reads the latest round **as amended**
by its `### Adjudications` subsection:

- **Effective findings** = the round's findings table with each finding's
  disposition overridden by the latest `### Adjudications` entry for that finding ID.
- **Effective verdict** = the **last verdict-bearing line in the round** — an
  `### Adjudications` `**Verdict:**` line overrides the round's own `**Verdict:**`.
  Because the verdict keys off dispositions, not counts, an Adjudications subsection
  alone can make a round's effective verdict `clear to land`.

A round with no `### Adjudications` subsection reads exactly as written — the
effective findings and verdict are the round's own.

## Finding shape

Every finding an audit agent emits takes this shape; each agent replies with
only a JSON object carrying its findings, which the skill parses and validates
against this shape, so the orchestrator consumes validated objects, not parsed
prose:

```
- phase:       alignment | boundary | convention | testing
- location:    path:line
- description: terse statement of the problem
- severity:    Critical | Major | Minor
- citation:    link to the offending line, and (alignment) the SHALL violated, (convention) the doc rule or named universal principle, (testing) the TESTING.md rule or the delta-spec scenario/SHALL traced
- disposition: Fix now | File issue | Drop
```

## Finding IDs

Every finding carries a **durable ID** of the form `<arena-letter><global-round-integer>`:

- **arena letter** — capital `A` Alignment · `B` Boundary · `C` Convention · `T` Testing. Marks the arena for at-a-glance readability.
- **global-round integer** — one continuous sequence incrementing **globally across all arena tables within a round**, never restarting per arena, so every finding in a round has a unique integer on its own (`A1`, `B2`, `T3` — never `A1` and `B1` in the same round).

The ID is stable: it is how `/adjudicate-review` grills a finding and how follow-up rounds cite a prior finding. Merges join the IDs with `+` (`A1+C3` = the two are the same defect). No sub-lane notation in IDs or prose — house-vs-craft lives in the Citation column. Old persisted rounds carrying `s`/`c`/`k` IDs stay valid history; readers resolve IDs within their own round, so no migration.

## Finding-table style

Columns, in order:

```
# | Severity | Location | Finding | Disposition | Citation
```

- **#** — the finding's durable ID (see **Finding IDs** above): arena letter + global-round integer (`A1`, `B2`, `C3`, `T4`), merges joined with `+`.
- **Severity** — text labels `Critical` / `Major` / `Minor`. **No emojis** (repo convention).
- **Location** — `path:line`.
- **Finding** — terse, factual. Cite, don't editorialize. No preamble, no restating the diff.
- **Citation** — link the offending line; for alignment findings, also cite the SHALL requirement; for convention findings, the specific doc rule or named universal principle.

## Disposition

Every finding carries exactly one proposed disposition (the skill proposes; the
user adjudicates):

### Fix now

Governed by **scope, never effort**: any in-charter defect at any size, plus any
fix whose deferral would ship soon-dead code (a follow-up that would delete or
redo what is merging — that finding is `Fix now` even if arguably out of
charter). Default for real findings. For an alignment **mismatch** finding
(neutral framing), "fix" means *reconcile the disagreement in this PR* — the
reconciliation may edit **either** side (amend the implementation, or amend/relax
the task or spec), within the archive-state reconciliation latitude. Name both
options and let the user adjudicate; do not assume the spec is the correct side.
(The merged-archive case is the one where only the implementation may change.)

### File issue

For findings genuinely out of scope of the current change. The disposition
**must cite the charter boundary the finding exceeds** — a proposed `File issue`
with no charter citation is invalid and gets re-dispositioned before the report
is emitted. The only durable form a follow-up may take is an actual GitHub issue;
at adjudication, a confirmed `File issue` has the issue created in-interview
(the owner picks the type: chunk into the open map vs `OFF THE MAP`) with the
link recorded in the rationale.

### Drop

A genuine non-issue, with a one-line rationale.

**Fix cost is never an input to the disposition.** Cheap-and-wrong is still wrong;
expensive-and-right is still right. Severity communicates impact but never gates
inclusion or the now-or-never call.

## Gate sections in tasks.md

Any change-review round (spec-review, incremental-spec-review, recheck) whose
verdict is adverse (`findings remain`, or recheck's `outgrew recheck`) appends to
the change's `tasks.md` — as does `/adjudicate-review` when a promotion turns a
round that cleared its own verdict adverse (see **Adjudication entry**). A lead-in under the heading points fix sessions to
`review.md` Round `<n>` by durable ID — the terse gate lines carry no severity,
`path:line`, citation, or reconcile side, all of which live only in the round:

```markdown
## <N>. Gates — round <n>

> Findings by durable ID (severity, `path:line`, citation, reconcile side) are in
> `review.md` Round <n>. Resolve each open `Fix now` there before checking it off.

- [ ] <N>.1 <ID> <one-line finding> — resolved
- [ ] <N>.2 <ID> <one-line finding> — resolved
- [ ] <N>.3 `npm run lint` — zero errors, zero non-size warnings
- [ ] <N>.4 `npx tsc --noEmit` — zero errors
- [ ] <N>.5 `npm run build` — completes successfully
- [ ] <N>.6 `npm run test:coverage` — run result
- [ ] <N>.7 `npm run test:e2e` — run result
```

A gate skipped under the doc-only exemption carries **no checklist item** — a
never-run gate is not a checkable task. Omit it and note the exemption in a
lead-in line under the section (naming the skipped gates + the rationale), so the
skip stays visible without wedging `/landfall`'s all-tasks-checked gate on an item
that will never be checked.

The section is a **numbered tasks.md section** continuing the file's existing
sequence (`## <N>. Gates — round <n>`, `<N>` = next section number). It carries
two blocks:

- **One item per open `Fix now` finding**, referenced by durable ID.
- **The full pre-merge verification gate set restated**, each gate its own
  checkable item so partial failure stays visible — the same five gates as the
  change's pre-merge section (defined in `openspec/config.yaml` `rules.tasks`:
  lint · tsc · build · test:coverage · test:e2e). Fixing the findings changes
  code, invalidating the already-checked pre-merge section; restating the gates
  under the round forces them re-run before the round can clear. The two test
  gates inherit that section's doc-only exemption when the fix delta touches no
  executable file — a skipped gate is **omitted** (no checklist item), the
  exemption noted in the section's lead-in.

Rules:

- **Append-only per round.** A prior round's gate section is never unchecked or
  edited. A clearing verdict appends no section. Each round restates its own gate
  items — checking the change's original pre-merge section, or a prior round's,
  does not check off a later round's gates.
- **Exits.** The fixes land and the fixing session checks the section off; or an
  adjudication re-dispositions every open `Fix now` and — its recomputed verdict
  now clearing the round — **deletes** that round's pending gate section (a gate
  for findings that no longer block is dead weight and would wedge `/landfall`'s
  tasks gate on a cleared round). Deletion is scoped strictly: only the latest
  adverse round's pending section, never a prior round's checked section, never
  `review.md` content.
- **Adjudication entry.** The mirror of the clearing exit: when
  `/adjudicate-review` **promotes** a finding to an open `Fix now` (from `Drop` or
  `File issue`), that finding owes a gate item in the latest round. If the round
  had **no** pending gate section (its own verdict cleared it), the skill
  **appends** the section (the review never wrote one). If the round **already**
  carries a pending gate section, the skill **inserts one gate line** per promoted
  finding into that section's finding block and **renumbers** so the verification
  gates stay last — finding items always precede the gates, which must run after
  every fix. Either way every open `Fix now` in the round's amended dispositions
  ends with exactly one gate line, ahead of the verification gates. Scoped
  strictly: only the latest round's section.
- **Adjudication demotion.** When `/adjudicate-review` **demotes** a finding out
  of open `Fix now` (to `Drop` or `File issue`) while the round stays adverse,
  that finding's existing gate line is **checked off in place** and annotated with
  a trailing `— _italic note_` naming the disposition change and pointing at the
  round's Adjudications (`— dropped at adjudication`, `— filed #<N>` for a
  confirmed `File issue`). Not deleted: the line stays as the record that the
  finding existed and how it left the open set, and the check stops the fix
  session chasing an item with no work behind it and stops `/landfall`'s
  all-tasks-checked gate wedging on it. Scoped strictly: only the latest round's
  section, only lines for findings this adjudication demoted, no renumbering.
- **Superseding rounds.** An `outgrew recheck` section's findings are re-verified
  by the follow-up incremental round; its status table is the authoritative
  resolution record and licenses checking off or superseding the stale section,
  same as fixes do.
- `/landfall`'s existing all-tasks-checked gate is the enforcement mechanism and
  needs no change of its own.

## Diagrams

Use an ASCII diagram for a finding **when it conveys a relationship faster than
prose** — a broken vs. expected data/control flow, a state machine, a dependency or
task↔work mapping, a before/after of a fix. Include one only when it replaces a
paragraph of explanation. **No decorative diagrams.**

Worked example — an alignment mismatch (task marked done, no implementing work). The
**bidirectional** arrow shows the two artifacts disagree, not that one is the authority:

```
┌──────────┐   disagree    ┌──────────────┐
│  task    │ ◀ ─ ─ ─ ─ ─ ▶ │ implementation│
│  [x] 3.2 │  no matching  │  (no work)    │
└──────────┘     work      └──────────────┘
   resolve EITHER: do the work  OR  amend/unmark the task
```
