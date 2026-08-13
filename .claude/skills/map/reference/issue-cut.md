# Issue cut

Issue birth on a map — the mechanics, followed by citation by every skill that births an issue on a map (`/map`'s chart and exit, `/anchor`'s charter, `/split-map`). Mechanics only: what to cut, when, and why stays with the citing skill. Label vocabulary lives in [label-machine.md](label-machine.md) — this doc names labels, never redefines them.

This doc is the **sole birth-label rule-set**: whichever skill runs these mechanics, the per-kind rules below stamp the birth label. No citing skill carries birth-label rules of its own. (Relabelling an existing issue is a different act, owned by the relabelling skill — see label-machine.md.)

## Common rules — every issue born on a map

- **Owner-approved body before creation.** The body is a distilled, complete, current statement, approved by the owner before any issue is created or edited.
- **Sub-issue of the map.** Wired via the REST `sub_issues` endpoint below.
- **No milestone.** The milestone lives only on the `MAP` issue; chunks, tickets, and every other issue carry none.

## GitHub mechanics (verified invocations)

`gh api` substitutes `{owner}`/`{repo}` from the current repo. Both endpoints verified live on this repo (gh 2.88.1).

**Sub-issues.** The POST body takes the numeric issue **id**, not the issue number — look it up first:

```bash
# id lookup (issue number -> numeric id)
gh api repos/{owner}/{repo}/issues/<child#> --jq .id

# add child as sub-issue of the map
gh api repos/{owner}/{repo}/issues/<map#>/sub_issues -X POST -F sub_issue_id=<numeric id>

# list sub-issues in list order (number, state, labels)
gh api --paginate repos/{owner}/{repo}/issues/<map#>/sub_issues \
  --jq '.[] | {number, state, title, labels: [.labels[].name]}'
```

**Blocked-by.** Same id-vs-number rule (`issue_id` = numeric id):

```bash
# wire: <blocked#> is blocked by <blocker#>
gh api repos/{owner}/{repo}/issues/<blocked#>/dependencies/blocked_by -X POST -F issue_id=<blocker numeric id>

# read an issue's blockers (open blockers = not frontier)
gh api --paginate repos/{owner}/{repo}/issues/<n>/dependencies/blocked_by --jq '.[] | {number, state, title}'
```

## Per-kind rules

### Chunk (implementation issue)

- Body pre-distilled — problem, settled decisions linked from the map, constraints — and links the map issue so `/embark` inherits its Decisions so far.
- **Birth label:** `CHARTED`, unless an open **decision ticket** gates it directly — then `UNCHARTED`. Sequencing behind another **chunk** is not fog: a chunk-only blocker leaves it `CHARTED`, and no relabel is owed when the predecessor lands.
- **Exception — the scout's closing e2e chunk:** the map-wide e2e coverage chunk cut on the e2e scout's recommendation is born `MUSTER`, not `CHARTED` — its plan (coverage rows plus deliberate skips) lives in the ticket body, it gets no OpenSpec change, and it enters work through `/set-sail`'s MUSTER lane, never `/embark`.
- Blocked-by wired onto everything it builds on: predecessor chunks and any gating decision tickets.

### `PLOTTING` ticket

- Body is **one sharp question, sized to one session**. If the question can't be stated precisely yet, it stays fog — no ticket.
- Born labeled `PLOTTING`; blocked-by wired onto any chunks the decision gates.

### `SCOUTING` ticket

- Body is one sharp question a background subagent can answer (codebase, docs, third-party APIs).
- Born labeled `SCOUTING`; **fires its background subagent at creation**. Findings land as the ticket's resolution comment, the ticket auto-closes, and its gist enters Decisions so far marked *unreviewed*. No scratch branches.
