# Finding format

## Finding shape

Every finding an audit agent emits takes this shape; the workflow's
structured-output schema validates it, so the orchestrator consumes validated
objects, not parsed prose:

```
- phase:       standard | convention | contract
- location:    path:line
- description: terse statement of the problem
- severity:    Critical | Major | Minor
- citation:    link to the offending line, and (convention/contract) the doc rule or SHALL violated
- disposition: Fix now | File issue | Drop
```

## Finding-table style

Columns, in order:

```
# | Severity | Location | Finding | Disposition | Citation
```

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
