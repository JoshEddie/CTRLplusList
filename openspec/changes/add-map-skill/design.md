# Design — add-map-skill

## Context

Issue #178 carried the explored decision record and a draft SKILL.md. The propose interview (2026-07-14) resolved its open questions; an initial apply landed a first version; a post-apply grilling + explore session (same day) then redesigned the constitution around it: map moved from optional step 0 to the governing layer for all work definition, the label machine and voyage-fleet naming emerged, and several first-version mechanics (claiming, `MAP:` prefixes, the task ticket type, issue-closing landfall) were overturned. This design records the post-explore state — the WHAT/WHY live in the proposal and #178.

All map state lives on GitHub — index issues, tickets as sub-issues, native blocked-by. The definition layer's only side effects are `gh` writes; it never reads or mutates the working tree.

## Goals / Non-Goals

**Goals:**
- Two-layer constitution: map-workflow governs definition (mandatory intake), trunk-workflow governs execution.
- The voyage fleet: `/map`, `/embark`, `/set-sail`, `/anchor`, `/landfall`, `/close-map` — each name doing exact work, each lifecycle label stamped by the skill that causes its transition.
- Fast, honest landing: no forced CI wait for locally-verified work; no falsely-closed or dangling issues.

**Non-Goals:**
- No prototype ticket type, no research scratch branches, no ADRs, no incremental chunk creation, no map milestones (rejected in #178).
- No harbor/front-door wrapper above map (rejected: a layer with no job — map is the intake).
- No automation of the owner's side of HITL tickets; a plotting session that answers its own questions has broken the contract.
- No tracker abstraction — GitHub/`gh` hardcoded.

## Decisions

### D1 — GitHub mechanics: REST via `gh api`, no GraphQL
Verified live on this repo (gh 2.88.1): `GET/POST repos/{owner}/{repo}/issues/{n}/sub_issues` (POST body `sub_issue_id` = numeric issue **id**, not number) and `GET/POST .../issues/{n}/dependencies/blocked_by` (POST body `issue_id`). Invocations encoded inline in SKILL.md, including the id-vs-number lookup.

Verified live means shaped right **and** complete. Every encoded list call carries `--paginate` (`gh api` does not auto-paginate; GitHub defaults to 30 per page), because a call that works on today's data and silently truncates on a bigger map is the failure mode this invariant exists to prevent — it passes every live check right up until it drops a chunk. The same applies to any `gh` subcommand with a `--limit` default. Truncation is never acceptable in a call whose result gates a decision: close-map's all-chunks-closed gate and map's frontier scan both read the full list or the skill is wrong.

### D2 — Two-layer constitution; map is mandatory intake
Every piece of work enters through `/map`; nothing else creates worked issues. The scaling law makes this cheap: the map *artifact* is optional (small clear input compiles to a single distilled `CHARTED` issue in one short pass), the *intake* is not. Map subsumes the explore route — charting is the one fog engine; the explore write-back discipline (distilled body = complete statement, owner sign-off before any edit) survives as how map writes every issue it emits. Rationale: sharpness is perishable — definition-time clearing (map) and departure-time re-verification (embark's terrain check + propose grilling) observe different terrains, so neither substitutes for the other; and the mega-change pain that motivated #178 was a definition failure, so definition gets governance of equal weight to execution.

### D3 — The label machine: caps = machine-read routing, lowercase = human triage
Routing labels (ALL CAPS) form the lifecycle, each transition stamped by the skill that causes it:

`OFF THE MAP` (pre-map intake queue; the label hints its own remedy) → `/map` → `CHARTED` ⇄ `UNCHARTED` (the map-side coin; chunks are born on either side per residual blocking; `/anchor` flips it back) → `/set-sail` → `UNDER SAIL` (the tree is occupied) → `/landfall` → `IN PORT` (landed, sealed, awaiting inspection) → closed. `ADRIFT` marks an interrupted voyage with recoverable cargo. `MAP` marks indexes; `PLOTTING`/`SCOUTING` mark tickets.

No `MAP:` prefix: the state machine already excludes tickets from embark targets (they are never `CHARTED`), and sub-issue parentage carries provenance. Lowercase labels (`bug`, `idea`, `debt`, `hold`, …) are orthogonal human triage; no skill routes on them (`hold` is a modifier on `OFF THE MAP` — parked with findings; map's intake surfaces the hold note before recharting). Provenance labels rejected: where an issue came from changes nothing downstream — body quality does. `IDEA` → `idea`, `EXPLORE NEEDED` dies, `HOLD` → `hold`; one-time relabel sweep. An embark-time label (`RIGGED`) rejected: proposal artifacts are tree state, authoritatively recorded by `openspec list`; a label mirroring tree state can drift after a discarded draft. Labels created idempotently, preserving existing colors/descriptions.

### D4 — Ticket types: `PLOTTING` (HITL) and `SCOUTING` (AFK); task type dropped
`PLOTTING` — you plot the course; run `/grill-me`, decisions put to the owner one at a time; the agent never plots for the helm. `SCOUTING` — sent out and reports back: a background subagent fires at ticket creation, findings land as the resolution comment, the ticket auto-closes, and its Decisions-so-far gist line carries an *unreviewed* marker until an owner-present session clears it; embark's grilling treats unreviewed scouting decisions as suspect (re-validated, not cited). The wayfinder task type is superseded by `/anchor`: a manual prerequisite is a fog line ("can't plot X until Y exists"), the owner does Y off-map, an anchor graduates the fog — a ticket that existed only to be a blocked-by target was ceremony. Kind is read from the label, never inferred.

### D5 — No claiming; frontier pick is a two-mode prompt
Claim-by-assignment dropped: solo repo, one assignee, the claim carried no signal and stale claims silently narrowed the frontier. Frontier = open, unblocked sub-issues in list order. When several are ready, the session scans and prompts with the actual tickets as options — "issue A for the quickest landing, issue X for the highest leverage (most likely to flush a mirage before work builds on it)" — ties broken by list order.

### D6 — `/anchor` owns all bearing moves and mid-voyage triage
Promote (fog → typed ticket, blocked-by wired onto gated chunks) and demote (reopen the **original** ticket — one thread holds the decision's whole history; evidence comment; gist line back to Not yet specified marked *reopened*; coin-flip affected chunks `CHARTED` → `UNCHARTED`) work identically for the epic's whole life. Any session MAY anchor at the moment of discovery; no session carries a proactive detection duty (agent-lookout remains named deferred fog). Mid-voyage (`UNDER SAIL`) triage is anchor's call to put to the owner, by blast radius:
- **Patchable at sea** — destination stands, course was wrong: amend the still-active change's design/spec/code in place, stay `UNDER SAIL` (the existing fix-forward mechanic).
- **Return to port, cargo worth keeping** — park the work on an `adrift/issue-<N>` branch as one owner-signed WIP commit, tree comes back clean, label `ADRIFT`. Resume = merge the branch back into dev locally, relabel `UNDER SAIL`.
- **Cheaper to start fresh** — discard the work and change artifacts, label `UNCHARTED`; the next voyage starts clean from a re-plotted chart.
Half-finished work is never merged to dev — execution constitution. `ADRIFT` vs `UNCHARTED` is not provenance: they encode different resume paths (recover cargo vs start clean).

### D7 — `/embark`: thin dispatcher, no mechanics of its own
Gate (on `dev`, up to date) → `CHARTED` check (**allowlist: `CHARTED` proceeds, everything else stops**) → terrain check (re-read the issue and its map decisions against *current* code/specs; a shifted map decision fires `/anchor`) → propose, grilling seeded with the map's Decisions so far (settled owner decisions cited, unreviewed scouting decisions re-validated). Embark's grilling MAY conclude the input is epic-sized and, on owner confirmation, route out to `/map` chart in the same conversation (prior answers carried as candidates for the re-validation sweep). The name: em-barque — literally "onto the ship" — boarding, provisioning, leaving dock under oars.

**Allowlist, not routing table.** A per-state dispatch table was rejected: it must enumerate every state to stay correct, so each label added to the machine silently acquires a catch-all route nobody designed (`UNDER SAIL` and `IN PORT` fell through to "hand to `/map`" — re-charting work that already exists, the one hand-off that can destroy it). It also duplicated the state→owner mapping that `/map`'s label machine already owns, giving it a second home to drift from, and `MAP` → "delegate to map's work phase" had the execution layer reaching into the definition layer, which D2 says neither does. The allowlist has none of these failure modes: an unrecognized label stops embark, which is always safe. Cost: `/embark <map#>` reports and stops instead of delegating — the guarantee that mattered (never propose against an index body) survives as the stricter form.

### D8 — `/set-sail`: the apply wrapper; the mid-apply gate lives here
"Set sail" literally means unfurling the sails — the voyage proper. The skill: enforce one-change-mid-apply at the moment it becomes real (apply start, not propose time), flip `CHARTED` → `UNDER SAIL`, state the two mid-voyage disciplines (discoveries → rich `OFF THE MAP` issue, never chart mid-voyage; mirages → stop and `/anchor`), then delegate the task loop to `/opsx:apply`. Same wrapper relationship to generated machinery as embark-to-propose. The seam between embark and set-sail is hard: two commands, two moments; the label flips exactly when the tree becomes occupied.

### D9 — `/landfall`: verification is a choice; issues dock, not close
Land phase opens with one owner question: does this change need dev verification (CI + live click-test) before sealing? **No** → fast path: two signed commits (`issue-<N>:` work, `issue-<N>: archive <change>`), one push, no CI wait — accepted cost: a red CI after the combined push fixes forward against an already-sealed contract (expected customers: locally-verified and doc-only changes). **Yes** → two-phase flow as before. Either path: `/finalize-spec-purposes` runs *before* staging the seal commit (repairs ride inside it instead of orphaning post-push), every hand-off prompt includes the paste-ready commit message(s), and bookkeeping (milestone, labels, map awareness) runs eagerly at stage time. Landfall labels the issue `IN PORT` — never closes it: closing is inspection's act. Self-healing: phase detection gains a row for seal-staged-but-unsigned and bookkeeping-incomplete states; any later invocation sweeps leftovers. Name kept over arrival-flavored alternatives: landfall is the moment you reach land, `IN PORT` is where you sit right after — the skill applies the label its own name leads into.

### D10 — `/close-map`: plain name, inspection batch-point
Arrival-flavored names (disembark, plant-the-flag, arrival) collide with landfall; map-object names disambiguate by construction, and `close-map` states its relationship to `/map` exactly. Scope: walk open `IN PORT` chunks with the owner (verified? → close), then close the map when the last chunk closes — a map whose last chunk is merely `IN PORT` is a voyage with uninspected cargo and SHALL NOT close. Flair variants (`roll-map`, `fold-map`) rejected for clarity.

### D11 — Exit gate: relaxed (unchanged from the interview)
Exit runs when the chunking is drafteable and the frontier chunk is unblocked. Residual open decisions wire blocked-by onto the chunks they gate — those chunks are born `UNCHARTED`; unblocked chunks are born `CHARTED`. Chunking proposed to the owner before any issue is created; chunks are sub-issues of the map, bodies pre-distilled, milestone-assigned individually; the map carries no milestone; implementation issues are created only at exit.

### D12 — Scaling law and consumed-never-converted (unchanged)
Persistence machinery materializes only when state must outlive the session. Input is consumed, never converted: a prompt issue is closed with a pointer comment; map artifacts are born as map artifacts.

### D13 — Map-body template inline in SKILL.md (unchanged)
~15 lines, one consumer; a reference file adds an indirection hop for no reuse.

The label machine goes the other way, to `.claude/skills/map/reference/label-machine.md` — not for reuse (only embark reads it, so D13's own test would keep it inline) but for **ownership and duplication**. It was stated twice, in CLAUDE.md and map/SKILL.md, identical by design and free to drift. And it is not map's: map stamps the definition-side transitions while `/set-sail` and `/landfall` stamp execution-side ones, so hosting the shared vocabulary inside one layer's skill made embark reach into the definition layer just to learn what a label means. One home; map and embark each state only their own transitions and link the rest; CLAUDE.md keeps the shape and points. Home follows the `spec-review/reference/finding-format.md` precedent (shared reference under a skill dir, read by others for content only, no runtime dependency). The spec still assigns the machine to `map-workflow`, which carries the same misattribution one level up — deliberately left, since fixing it means a new capability and its Purpose.

### D14 — Doc-only gate exemption: an effects test, not a path allowlist
A diff whose every file cannot affect test outcomes — markdown docs, `.claude/**`, `openspec/**`, and comment-only edits to any other file — MAY mark the `test:coverage` and `test:e2e` gate tasks skipped with an explicit rationale, never silently. Any executable change voids it however small. The allowlist framing was rejected because its allow and deny clauses contradicted (`openspec/**` permitted while "config changes" forbidden — `openspec/config.yaml` is both), leaving a change unable to decide whether it qualified for its own exemption; and because it turned on directory rather than effect, so fixing a stale comment in `ci.yml` would have forced a full Playwright run. CI still runs the full battery on the dev push. Codified in `openspec/config.yaml`'s `tasks` rule, CLAUDE.md, and the testing-foundation delta.

## Risks / Trade-offs

- [Fast-path landing seals before CI] → two-commits-one-push preserves clean revert granularity; owner chooses the path per change; expected fast-path customers already verified locally or cannot affect the battery.
- [Relaxed exit ships chunks a late decision invalidates] → blocked-by wiring, `UNCHARTED`-at-birth for gated chunks, anchor's demote flow.
- [Auto-closed scouting findings enter decisions unseen] → unreviewed markers + embark-time suspicion; a bad finding is exactly what anchor's demote exists for.
- [Sub-issue/dependency REST endpoints are newer GitHub surface] → invocations verified live; encoded verbatim so drift is a one-file fix.
- [Map body drifts from ticket reality] → anchor owns the body edit as a scripted step; map work sessions re-sync on load.
- [Stale `UNDER SAIL` after an abandoned change] → visible dangling flag is the desired alarm; anchor or the owner clears it deliberately.

## Migration Plan

Additive plus renames: two skill directories renamed, four skills authored/reworked, spec deltas, CLAUDE.md/config.yaml edits, cross-reference sweep. One-time GitHub label migration at enactment: create routing + status labels, relabel `IDEA` → `idea`, delete `EXPLORE NEEDED`, swap `HOLD` → `hold`. No deploy surface; rollback is `git revert` plus label cleanup.

### One-time label migration (executed 2026-07-14)

Renames use `gh label edit --name`, which preserves the label's color and its attachment to existing issues (`IDEA` rode on #179/#136/#130 at migration time). Deleting `EXPLORE NEEDED` strips it from its issues (#180/#170/#164/#140/#28), leaving them with no routing label — correct under the new constitution, where an issue without `CHARTED` stops `/embark` and re-enters through `/map`; no `HOLD` issues existed. Skills stamp labels and never create them; creation happened here, once, and is deliberately recorded nowhere in the active tree — a lost label is repaired by hand from label-machine.md's table.

```bash
# 1. Routing labels — one gh label create per row of label-machine.md's table (executed at migration)
# 2. Status-label renames + retirement
gh label edit 'IDEA' --name 'idea'
gh label edit 'HOLD' --name 'hold'
gh label delete 'EXPLORE NEEDED' --yes
# 3. Remaining status label named by the machine
gh label create 'debt' --description 'Tech debt - human triage only'
```

## Open Questions

- **Deferred fog (named): agent-lookout for decision invalidations** — should sessions proactively scan for settled decisions their work is about to invalidate? Deliberately unresolved; revisit after the first real map dogfoods anchor. Not a blocker for apply.
