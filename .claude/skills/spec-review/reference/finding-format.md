# Finding format

## Persisted-report contract

Every persisted review report — `openspec/changes/<name>/review.md` for a
spec-review, `openspec/reviews/<version>.md` for a release-review — opens with a
machine-readable header. The header is the contract three independent skills
share: the review writes round 1, `/recheck-review` appends rounds and computes
the fix delta from the header, `/landfall` gates on the latest round's verdict.

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
  for a release-review, the PR base sha. `/recheck-review` derives its delta from
  it: spec-review → the unstaged working-tree diff; release-review →
  `git diff <anchor>..dev`.
- `round` — updated in the header each time a round is appended; the body keeps
  every round.

### Round structure

The body is a sequence of numbered round sections, **append-only** — a new round
never rewrites or deletes a prior one. A round is **self-contained**: every part
of it — findings, "what looks good", the verdict, and any later Adjudications —
nests at `###` (or deeper) **inside** its `## Round <n>` heading. Nothing at `##`
level ever belongs to a round; the next `##` starts the next round.

```markdown
## Round <n> — <spec-review | recheck | release-review> (<date>)

<one- to two-sentence summary>

**Scope:** <diff source> · <resolved change>

### Standard / ### Convention / ### Contract
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
new findings the fix introduced.

### Round-verdict vocabulary

Exactly one per round:

- Change reviews (spec-review / recheck): `clear to land` (no open `Fix now`
  findings remain) · `findings remain` · `outgrew recheck` (recheck only —
  the fix delta outgrew a recheck; run the full review again).
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
| s1 | Fix now → File issue | out of scope; filed #280 |

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

Every reader (`/recheck-review`, `/landfall`) reads the latest round **as amended**
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
- phase:       standard | convention | contract
- location:    path:line
- description: terse statement of the problem
- severity:    Critical | Major | Minor
- citation:    link to the offending line, and (convention/contract) the doc rule or SHALL violated
- disposition: Fix now | File issue | Drop
```

## Finding IDs

Every finding carries a **durable ID** of the form `<arena-letter><global-round-integer>`:

- **arena letter** — `s` standard · `c` convention · `k` contract. Marks the arena for at-a-glance readability.
- **global-round integer** — increments **globally across all arena tables within a round**, so every finding in a round has a unique integer on its own (`s1`, `s2`, `c3`, `k4` — note the integer, not the letter, carries uniqueness, dodging the `c`-Convention vs `c`-Contract collision).

The ID is stable: it is how `/adjudicate-review` grills a finding and how `/recheck-review` cites a prior finding. Merges join the IDs with `+` (`s1+c3` = the two are the same defect). The scheme is rename-stable — if the arenas are relettered, the mechanism is unchanged and only the letters swap.

## Finding-table style

Columns, in order:

```
# | Severity | Location | Finding | Disposition | Citation
```

- **#** — the finding's durable ID (see **Finding IDs** above): arena letter + global-round integer (`s1`, `c3`, `k4`), merges joined with `+`.
- **Severity** — text labels `Critical` / `Major` / `Minor`. **No emojis** (repo convention).
- **Location** — `path:line`.
- **Finding** — terse, factual. Cite, don't editorialize. No preamble, no restating the diff.
- **Citation** — link the offending line; for convention/contract findings, also cite the specific doc rule or SHALL requirement.

## Disposition

Every finding carries exactly one proposed disposition (the skill proposes; the
user adjudicates):

### Fix now

Anything in scope of this change. Default for real findings. For a contract
**mismatch** finding (neutral framing), "fix" means *reconcile the disagreement in
this PR* — the reconciliation may edit **either** side (amend the implementation,
or amend/relax the task or spec), within the archive-state reconciliation latitude.
Name both options and let the user adjudicate; do not assume the spec is the correct
side. (The merged-archive case is the one where only the implementation may change.)

### File issue

For findings that are **both** genuinely out of scope of the current change **and**
sizable enough to warrant their own `explore → proposal → apply → archive` cycle.
The only durable form a follow-up may take is an actual GitHub issue
(`gh issue create`) — never a vague "revisit later" note.

### Drop

A genuine non-issue, with a one-line rationale.

**Fix cost is never an input to the disposition.** Cheap-and-wrong is still wrong;
expensive-and-right is still right. Severity communicates impact but never gates
inclusion or the now-or-never call.

## Diagrams

Use an ASCII diagram for a finding **when it conveys a relationship faster than
prose** — a broken vs. expected data/control flow, a state machine, a dependency or
task↔work mapping, a before/after of a fix. Include one only when it replaces a
paragraph of explanation. **No decorative diagrams.**

Worked example — a contract mismatch (task marked done, no implementing work). The
**bidirectional** arrow shows the two artifacts disagree, not that one is the authority:

```
┌──────────┐   disagree    ┌──────────────┐
│  task    │ ◀ ─ ─ ─ ─ ─ ▶ │ implementation│
│  [x] 3.2 │  no matching  │  (no work)    │
└──────────┘     work      └──────────────┘
   resolve EITHER: do the work  OR  amend/unmark the task
```
