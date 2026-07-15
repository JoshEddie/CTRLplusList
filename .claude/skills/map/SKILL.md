---
name: map
argument-hint: "[idea text | issue#]"
description: The mandatory intake for all work definition - compile any input (spark, documented discovery, epic) toward ready-to-work issues through chart / work / exit phases. Small clear input compiles to a single-chunk map (MAP index + one CHARTED chunk, same session); epics get a MAP index with PLOTTING/SCOUTING decision tickets as sub-issues and exit into sequenced, /embark-ready implementation chunks. Use for any new work definition, to work an existing map's tickets, or when an embark grilling routes out as epic-sized.
disable-model-invocation: true
metadata:
  author: list_eddiefamily
  version: '2.0'
---

<!-- Idea adapted from Matt Pocock's "wayfinder" skill
     (github.com/mattpocock/skills); rebuilt for this repo's
     trunk workflow, OpenSpec, and GitHub tooling. -->

# /map

The **definition layer's** one entry point. Every piece of work enters through `/map`: it accepts plain text or an existing GitHub issue and compiles it toward ready-to-work issues through three phases — **chart** (name the destination, grill breadth-first, create the map and its tickets), **work** (resolve tickets, scouting excepted in parallel), and **exit** (cut the destination into implementation chunks). No other skill creates issues cleared for work. Charting is the one fog engine — the retired explore route is never routed to.

The execution layer (`/embark` → `/set-sail` → `/landfall`) owns everything after departure: tree, commits, gates, review, landing. Neither layer governs the other — map never touches the tree, and the execution skills never chart. Sharpness is perishable: map clears fog at charting time; embark re-verifies at departure time, because terrain shifts between the two.

**The write-back discipline survives from explore:** every issue map emits carries a distilled body that is the complete, current statement of what to build, **approved by the owner before any issue is created or edited**.

**Input is consumed, never converted.** A prompt issue ends there: close it with a pointer comment to what map created. Map's artifacts are always born as map artifacts — no in-place conversion of an idea issue into an epic.

**Nothing is ever implemented from the map.** Every ticket resolves a decision, not a slice of the build. The pull to just start implementing is the signal the map is nearing its exit.

## Prerequisites

The routing labels in [reference/label-machine.md](reference/label-machine.md) must exist in the repo — map stamps them, never creates them.

## Guardrails

- **Side effects are GitHub issue operations only** — issues, comments, labels, sub-issue links, blocked-by relationships, all via `gh`. This skill never reads or mutates the working tree, never stages, never runs `git commit`, never pushes.
- **No preconditions gate.** Branch and tree state are irrelevant to issue writes — a dirty tree, a mid-apply change, an out-of-date `dev`: none of them block mapping. `gh` auth failure is loud on its own.
- **At most one plotting ticket resolved per session.** Scouting is the exception: it resolves in parallel via background subagents, at charting time or whenever new tickets graduate from fog.

## Scale to demand

Persistence machinery only materializes when state must outlive the session. A question answered inline during charting never becomes a ticket; a ticket exists only when a question must *wait* — for another session, a subagent, or manual work. **Every work item lives under a map** — the milestone ⇔ map invariant is uniform, so even a small, clear idea compiles to a single-chunk map: the `MAP` index created in the same session with one distilled `CHARTED` chunk as its sub-issue and no decision tickets. That is the skill succeeding at small scale, not ceremony: two issues, one owner approval, one session.

## The label machine

The full machine — every label, meaning, and stamping skill — lives in [reference/label-machine.md](reference/label-machine.md).

`OFF THE MAP` is map's intake queue — the label it operates on, logged by any session and charted only here. Map stamps `CHARTED` and `UNCHARTED` (chart, exit), and `MAP` / `PLOTTING` / `SCOUTING` on the artifacts it creates. It routes on ALL-CAPS labels only; the `hold` carve-out is map's own — recharting an issue carrying `hold` surfaces its parked findings comment first.

## The map

One GitHub issue, label `MAP`. Tickets are sub-issues of the map. The map is an index, not a store: a decision lives in exactly one place — its ticket — and the map gists and links it. Refer to every map and ticket by its title (wrapping the link), never a bare number.

Map body — exactly these five sections:

    ## Destination
    <what done looks like — one or two lines; every session orients
    to it before choosing a ticket>

    ## Notes
    <domain context; standing preferences for this effort. Always
    read first: CLAUDE.md and any capability specs the effort
    touches — same read-first discipline as openspec/config.yaml>

    ## Decisions so far
    - [<closed ticket title>](link) — <one-line gist>
    - [<closed scouting ticket title>](link) — <gist> *(unreviewed)*
    - <unlinked gist line — an answer that never waited for a ticket>

    ## Not yet specified
    <in-scope fog too dim to ticket yet; demoted decisions appear
    here marked *reopened*; manual prerequisites appear as fog
    lines naming what they wait on>

    ## Out of scope
    <consciously ruled out; never graduates>

The milestone lives **only on the map issue**, stamped at exit — chunks, tickets, and every other issue carry none. A map is atomic with respect to a release: all its chunks ship together, and `/split-map` is the only operation that cuts a map at the landed boundary.

## Tickets

Sub-issue of the map; body is one sharp question, sized to one session. Ticket kind is read from its label — **never inferred from title or body**. Exactly one of:

- **`PLOTTING`** (HITL — you plot the course) — run `/grill-me` on the question, decisions put to the owner one at a time. The agent never plots for the helm: a plotting session that answers its own questions has broken the contract. If the owner is not engaging live, the ticket stays open.
- **`SCOUTING`** (AFK — sent out, reports back) — facts a decision waits on (codebase, docs, third-party APIs). A background subagent **fires automatically at ticket creation** (during charting or on graduation from fog); its findings land as the ticket's resolution comment, the ticket **auto-closes**, and its gist enters Decisions so far carrying an ***unreviewed*** marker until an owner-present session clears it. Downstream, `/embark`'s grilling treats unreviewed scouting decisions as suspect — re-validated with the owner, not cited as settled. No scratch branches — trunk stays clean.

There is **no task ticket type**: a manual prerequisite ("can't plot X until Y exists") is a fog line in Not yet specified naming what it waits on; the owner does Y off-map, and an `/anchor` graduates the fog. A ticket that exists only to be a blocked-by target is ceremony.

**Resolution** is always: post the answer as a comment on the ticket, close the ticket, append the gist to Decisions so far.

**No claiming.** The frontier is the open, unblocked sub-issues in list order — blocked-by relationships make it visible in the GitHub UI; assignees carry no routing meaning.

**Fog or ticket?** Ticket when the question can be stated precisely now (even if blocked). Fog (Not yet specified) when it can't. Don't pre-slice fog.

**Out of scope:** when a ticket turns out to sit past the destination, close it and add one line to Out of scope with why. It stays out of Decisions so far — never in it.

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

## Chart

1. **Intake.** If the input is an existing issue, read it (`gh issue view <N> --json title,body,labels,comments`). If it carries `hold`, surface the most recent parked findings comment to the owner verbatim before proceeding.
2. **Seeded from an aborted embark grilling?** When `/embark`'s propose grilling routed out as epic-sized and handed off in-session, open with a **re-validation sweep**: every already-given answer is a **candidate, not a decision** — answers given under a one-change framing may not survive the epic reframing. Each is either confirmed into Decisions so far as a plain unlinked gist line (no ticket — an answer that never waited never earns one) or demoted to fog or a fresh ticket. Confirmed answers are not re-asked.
3. Run `/grill-me` to name the destination — it fixes the scope. Grill breadth-first to surface open decisions, then scale to what surfaced:
   - **No fog, one-change-sized** — compile to a **single-chunk map** in this session: draft the distilled chunk body, get the owner's approval, create the `MAP` index (five-section body, milestone stamped) with exactly one `CHARTED` chunk as its sub-issue and no decision tickets, close a prompt issue with a pointer comment, stop.
   - **No fog, bigger than one change** — skip the decision phase: create the map purely as the epic index and proceed straight to Exit.
   - **Fog** — continue charting.
4. Create the map (label `MAP`, five-section body; the milestone is stamped at exit), fog sketched into Not yet specified. Close a prompt issue with a pointer comment.
5. Create the tickets you can specify now as sub-issues, each labeled exactly one of `PLOTTING`/`SCOUTING`; wire blocked-by in a second pass.
6. **Scouting fires now:** for each `SCOUTING` ticket just created, spawn a background subagent to answer it in parallel. As results return, post each finding as the resolution comment, close the ticket, and append its gist to Decisions so far marked *unreviewed*. Plotting tickets are never auto-resolved — they wait for their sessions.
7. Stop — charting hand-resolves nothing else.

## Work (existing map)

1. Load the map and **re-sync the body against ticket reality** — anchors may have run outside map sessions; the index-not-store discipline keeps the diff small (gist lines and links, never restated content).
2. Pick from the frontier — the open, unblocked sub-issues in list order:
   - User named a ticket → take it.
   - One ready → take it.
   - **Several ready → prompt with the actual tickets as options**: name one recommended for the **quickest landing** and one for the **highest leverage** (most likely to flush a mirage before work builds on it); ties broken by list order.
3. Resolve it by its label's contract (§ Tickets), zooming into related closed tickets on demand. An owner-present session that touches an *unreviewed* scouting gist confirms or demotes it, clearing the marker.
4. Post the answer as a resolution comment, close the ticket, append the gist to Decisions so far.
5. Graduate any fog the answer sharpened into new typed tickets via `/anchor`'s promote move (new scouting tickets fire their subagent at creation); a decision revealed wrong goes through `/anchor`'s demote. If the chunking is now drafteable and the frontier chunk would be unblocked, proceed to Exit.

Bearing moves — promote (fog → ticket) and demote (mirage) — are `/anchor`'s to execute; see [.claude/skills/anchor/SKILL.md](../anchor/SKILL.md). Any session MAY anchor at the moment of discovery; no session carries a proactive detection duty.

## Exit (way clear enough to chunk)

The gate is **relaxed**: exit runs when the chunking is drafteable and the frontier chunk is unblocked — not only when every decision has closed. Residual open decision tickets are wired blocked-by onto the chunks they gate, and **those chunks are born `UNCHARTED`; unblocked chunks are born `CHARTED`**. Fog scoped to later chunks may persist in Not yet specified. Implementation chunks are created **only at exit**, never incrementally during the decision phase.

Exit cuts **one release's worth of chunks** — the map is atomic with respect to its release, so everything it chunks ships together. Scope beyond that release never becomes a chunk here: it routes to a successor map or stays as fog until `/split-map` or `/close-map` dispatches it.

1. Draft the chunking: implementation issues each sized for one OpenSpec change, sequenced with blocked-by, bodies pre-distilled — problem, settled decisions (linked from the map), constraints — so `/embark` consumes each without re-exploring. Each body links the map issue so the propose grilling inherits its Decisions so far.
2. **Propose the split to the owner before creating anything; the chunking is theirs to approve.** No issue exists until they say yes.
3. On approval, create the chunks as sub-issues of the map, wire the blocked-by sequence plus any residual decision tickets onto the chunks they gate, and label each `CHARTED` or `UNCHARTED` per its blocking. **Stamp the target milestone on the map issue; chunks are created with no milestone.**
4. The map stays open as the epic's living index. Chunks land as `IN PORT` via `/landfall`; `/close-map` inspects them and closes the map when the last chunk closes.

Decisions recorded on tickets are provenance; when a chunk becomes an OpenSpec change, the decisions it builds on land in that change's design/spec deltas as usual. OpenSpec remains the contract of record.
