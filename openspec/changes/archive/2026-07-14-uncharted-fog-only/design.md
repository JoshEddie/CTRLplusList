## Context

The two-layer workflow constitution routes on ALL-CAPS labels, canonically documented in `.claude/skills/map/reference/label-machine.md` and normatively specified in `openspec/specs/map-workflow` (definition layer) and `openspec/specs/trunk-workflow` (execution layer). Today `UNCHARTED` conflates two orthogonal facts about a chunk — "scope not settled" and "waiting on a predecessor" — because `/map`'s exit rule labels every blocked-by-gated chunk `UNCHARTED` regardless of what gates it. GitHub already carries the sequencing fact natively (blocked-by relationships, visible in the UI, queryable via the dependencies API), so the label duplicates state that can drift: when a blocker lands, someone must remember to flip the label, and no skill currently owns that flip cleanly.

Owner decision (issue #203 body, "Label semantics (owner-settled at exit)"): `UNCHARTED` = fog only; sequencing lives exclusively in blocked-by; `/embark` checks both label and open blockers. Precedent applied live: #210, #211 born `CHARTED` with blocked-by wired.

Constraint: the atomic-map-releases revision (milestone-on-map-only) recently landed edits in several of these same files; this change layers on top of its wording and must not revert any of it. The `openspec-*`/`opsx/*` generated skills are untouchable (none need edits — the label machine is repo-owned).

## Goals / Non-Goals

**Goals:**

- Single meaning per signal: label = scope state, blocked-by = sequencing state.
- Zero label churn on blocker landing — a `CHARTED` chunk becomes frontier automatically when its blocker closes.
- `/embark` cannot board a blocked chunk: gate = `CHARTED` AND zero open blockers, with a concrete verified query.
- `/anchor` reserved for genuine bearing moves (fog graduation, mirage demotion), not routine sequencing.

**Non-Goals:**

- No change to `/split-map` behavior: migrated chunks stay born `UNCHARTED` because their gate is the re-orientation `PLOTTING` ticket — a decision ticket, i.e. genuine fog under the new semantics. Its resolution flipping chunks `CHARTED` is anchor's promote path working as designed.
- No change to `/anchor` demote (mirage → affected chunks `UNCHARTED`): a demoted decision unsettles scope, so the flip is correct fog semantics already.
- No *standing* relabeling duty — but this change includes a **one-time owner-requested sweep of map #181** (see Decision 6). #210/#211 already follow the new semantics.
- No new labels, no changes to `UNDER SAIL`/`IN PORT`/`ADRIFT`/`MAP`/ticket labels.

## Decisions

### 1. Blocker check lives in embark's boarding check, after the label read

The gate becomes two conditions checked in the boarding step: label is `CHARTED`, and the dependencies API returns zero open blockers:

```bash
gh api --paginate repos/{owner}/{repo}/issues/<n>/dependencies/blocked_by \
  --jq '.[] | {number, state, title}'
```

Filter to `state == "open"`; any open blocker stops embark with a message naming the blocking issue(s). Closed blockers are history, not gates. Alternative considered: folding the check into the trunk-preconditions gate — rejected because that gate runs before the issue is read and owns git state, not issue state; the boarding check already owns "is this issue cleared."

This query is already the verified read pattern in `map/SKILL.md` § GitHub mechanics (line ~119), so embark cites a known-good invocation rather than inventing one.

### 2. Exit labels by gate type, not by blocked-ness

Exit rule splits on *what* gates a chunk: a residual open **decision ticket** (`PLOTTING`/`SCOUTING`) wired blocked-by → born `UNCHARTED` (scope genuinely unsettled until the decision closes); a predecessor **chunk** wired blocked-by → born `CHARTED` (scope settled, merely sequenced). Alternative considered: dropping `UNCHARTED` at exit entirely and using only blocked-by — rejected because a decision-gated chunk's *body* is provisional (the open decision may reshape it), and `/embark`'s label allowlist needs a state that says "do not board even if unblocked-looking"; fog is a real state, not derivable from the dependency graph's node types alone.

### 3. No flip-on-blocker-landing duty anywhere

Under the new semantics the only `UNCHARTED` → `CHARTED` transitions are decision-resolution ones (anchor promote resolving fog; split-map's re-orientation ticket resolution). Audit of `anchor/SKILL.md` found no existing flip-on-chunk-landing duty to remove — the change is confirmatory there: promote's wording stays, and the new label-machine text makes explicit that no landing-triggered flip exists. `landfall`/`close-map` gain no duty (verified by grep: no such text exists).

### 4. Canonical home stays label-machine.md; other files reference

`label-machine.md` gets the reworded `UNCHARTED` row plus the sequencing invariant (blocked-by is the only sequencing channel; `/embark` gates on label AND open blockers), replacing the now-stale "no separate not-cleared marker" closing line with wording that names both gate conditions. `embark`/`map` skill edits state their local rule and lean on the reference. `CLAUDE.md`'s § label machine sentence audits clean — its arrow diagram (`CHARTED` ⇄ `UNCHARTED`) describes transitions that still exist (promote/demote), so no edit unless review finds contradicting wording.

### 5. Spec deltas mirror the same split

`map-workflow` delta modifies the label-vocabulary requirement (new `UNCHARTED` definition + sequencing invariant + embark's two-condition gate replacing "no separate not-cleared marker exists") and the exit requirement (gate-type split). `trunk-workflow` delta modifies the embark requirement (two-condition gate, blocker query, stop-naming-blockers behavior). The demote and split-map requirements stand unmodified — their `UNCHARTED` uses are fog-correct already.

### 6. One-time sweep of map #181, classified by direct gate type

Owner requested map #181's chunks be brought under the new semantics as part of this change. Classification rule: a chunk stays `UNCHARTED` only when an **open decision ticket** (`PLOTTING`/`SCOUTING`) is wired directly blocked-by onto it; chunk-only blockers flip it `CHARTED`. Applied to the live graph (read 2026-07-14): #190 (gated by open `PLOTTING` #202) and #200 (gated by open `PLOTTING` #201) stay `UNCHARTED`; #191–#199 (nine chunks, chunk-only blockers) flip to `CHARTED`. Transitive exposure (e.g. #191 behind decision-gated #190) does not make a chunk fog — the direct-gate rule keeps classification mechanical, and any scope damage from the upstream decision resolving badly is `/anchor` demote's job, as everywhere else. The sweep is a one-time apply-stage task re-verified against the live graph at execution time (labels may have moved since this read); it establishes no standing duty.

## Risks / Trade-offs

- [Old-semantics chunks in the wild: an existing chunk labeled `UNCHARTED` only because it was chunk-sequenced would now never auto-flip] → Audit at owner review: #210/#211 already follow new semantics; any stragglers get a one-time manual relabel during this change's review, not a standing sweep.
- [The dependencies API (`/dependencies/blocked_by`) is comparatively new; a `gh`/API failure could be misread as "no blockers"] → The skill text treats query failure as a stop (loud failure, consistent with the label-machine's missing-label philosophy), not as an empty result.
- [Two-condition gate makes embark chattier to run] → One extra paginated read per embark; negligible, and it replaces a whole class of stale-label bugs.
- [Layering risk on atomic-map-releases wording (milestone-on-map lines sit adjacent in the same files)] → Edits are surgical replacements of the specific sentences named in tasks; milestone sentences untouched.
