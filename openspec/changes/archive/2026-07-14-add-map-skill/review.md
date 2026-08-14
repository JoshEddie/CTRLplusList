---
review: spec-review
target: add-map-skill
anchor: f0b70652b40420e7052c8f156c56d4272bf04193
diff-source: git diff --staged
round: 6
---

# /spec-review — add-map-skill

The workflow itself is coherent and well-designed — a two-layer constitution with a clean label machine — but three structural defects block it: the `openspec/specs/**` cross-reference sweep stopped at `.claude/**`, the canonical `trunk-workflow` spec was hand-edited outside the delta mechanism, and a whole undeclared skill (`/migrate-epic`) rides along with no task, proposal entry, or spec requirement.

**Scope:** `git diff --staged` (anchor `f0b7065`) · change `add-map-skill` (active)

## Round 1 — spec-review (2026-07-14)

### Standard
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| S1 | Major | openspec/specs/trunk-workflow/spec.md:4 | Purpose still names `/start-change` and `/land-change` and describes landing as an unconditional two-phase live-verified flow. No delta touches the Purpose (only REMOVED/ADDED Requirements), so archive copies it through unchanged; `/finalize-spec-purposes` only repairs `TBD`. The normative spec ships describing two retired commands. | Fix now | spec.md:4 "how an issue becomes an OpenSpec change (`/start-change`) … then archive commit (`/land-change`)" ↔ CLAUDE.md "Specs are the contract" |
| S2 | Major | .claude/skills/embark/SKILL.md:36 | Dispatch table's catch-all swallows `UNDER SAIL` and `IN PORT`, so re-running `/embark <N>` on the issue occupying the tree sends the owner to `/map` to re-plot work already mid-apply. The trunk-workflow delta has the same hole. Add rows: `UNDER SAIL` → resume via `/set-sail`; `IN PORT` → `/close-map`. | Fix now | SKILL.md:36 catch-all ↔ delta "any issue without `CHARTED` (including `OFF THE MAP`, `UNCHARTED`, `ADRIFT`) is handed to the definition layer" |
| S3 | Minor | .claude/skills/anchor/SKILL.md:60 | Park and discard moves add `ADRIFT`/`UNCHARTED` but never remove `UNDER SAIL` — the only state they're entered from. Issue then carries both, falsifying the "tree is occupied" beacon and making `/embark` dispatch and `/close-map` partition ambiguous. | Fix now | anchor:60/:66 ↔ landfall "flip its label to `IN PORT` (removing `UNDER SAIL`)" |
| S4 | Minor | .claude/skills/close-map/SKILL.md:22 | Step 2 hard-stops when any chunk is still open, so the `IN PORT` inspection walk never runs mid-epic — the opposite of a batch-point. Spec orders the walk first and gates only the map close. | Fix now | close-map:22 ↔ map-workflow spec "walks each open `IN PORT` chunk …, then closes the map when — and only when — every implementation chunk is closed" |
| S5 | Minor | .claude/skills/map/SKILL.md:69 | `gh label list` defaults to page size 30 (repo has 16 today). Past 30, an existing label reads as absent and `gh label create` exits non-zero — defeating the idempotency the block guarantees. Pass `--limit 200`; hoist the list out of the loop (also kills 9 API round-trips). | Fix now | map:69 ↔ § The label machine "Labels are created idempotently, never clobbered" |
| S6 | Minor | openspec/config.yaml:150 | Doc-only exemption's allowlist permits `openspec/**` while the denylist forbids "config" changes — `openspec/config.yaml` is both, and this change edits it, so whether it qualifies for its own exemption is undecidable. Scope the denylist to files outside the allowlist. | Fix now | config.yaml:146-150; same text duplicated in testing-foundation delta |
| S7 | Minor | .claude/skills/migrate-epic/SKILL.md:38 | design.md D1 requires every inline `gh api` be verified live; this ships "confirm live before batching" — a TODO to the future runner, at the least reversible step (bulk re-parenting of closed history). | File issue | migrate-epic:38 ↔ design.md D1 "Verified live on this repo (gh 2.88.1)" |

### Convention
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| C1 | Major | openspec/specs/spec-review/spec.md:369 | Normative spec-review spec still names `/land-change` while its SKILL.md was swept to `/landfall` — spec and implementation directly contradict after archive. Same at `openspec/specs/recheck-review/spec.md:40`. Root cause: task 3.2 scoped the sweep to `.claude/**` + CLAUDE.md, excluding `openspec/specs/**`. | Fix now | spec.md:369 "consumed by `/recheck-review` … and `/land-change`" ↔ CLAUDE.md "Specs are the contract" |
| C2 | Major | openspec/specs/trunk-workflow/spec.md:4 | Same as S1 from the convention angle: the Purpose was hand-edited in this diff yet still names both retired skills. Purposes aren't part of deltas, so archive won't repair it and `/finalize-spec-purposes` skips non-`TBD` text. | Fix now | spec.md:4 ↔ CLAUDE.md § Hard rules |
| C3 | Major | openspec/specs/trunk-workflow/spec.md:8 | Requirement bodies and scenarios in the **active** spec are hand-edited directly (gate reworded to the mid-apply rule; "Dirty tree blocks start" swapped for two mid-apply scenarios). No MODIFIED delta backs them — the delta REMOVES the very requirement being edited. Main specs are written by sync/archive, not by hand. | Fix now | Delta "REMOVED … /start-change SHALL gate on trunk preconditions" while the same requirement is reworded in place ↔ CLAUDE.md "Specs are the contract" |
| C4 | Major | .claude/skills/migrate-epic/SKILL.md:1 | 52-line skill added with no task, no proposal "What Changes"/"Impact" entry, no design.md mention, absent from CLAUDE.md § The fleet and the `map-workflow` delta. Nothing normative governs it — including its own "delete once no pre-workflow epics remain" contract. | Fix now | design.md Migration Plan: "two skill directories renamed, four skills authored/reworked" — migrate-epic is an undeclared fifth |
| C5 | Minor | .github/workflows/ci.yml:5 | CI comment still explains the trunk model via `/land-change`. Fixing it would pull `.github/**` into the diff, voiding the doc-only exemption tasks 4.5/4.6 rely on — hence follow-up, not fix-now. | File issue | ci.yml:5 "# dev is a trunk: /land-change pushes work commits directly, with no PR, so" |

### Contract
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| K1 | Major | .claude/skills/migrate-epic/SKILL.md:1 | Artifacts and implementation disagree on whether this skill belongs to this change — grep for `migrate-epic` across the change dir + CLAUDE.md returns zero hits. It's also a second issue-creating skill, in tension with map-workflow's SHALL. Reconcile EITHER: drop it and land it as its own charted issue, OR document it (task under § 1, proposal Impact entry, map-workflow requirement sanctioning a temporary chart-phase wrapper). | Fix now | proposal.md § Impact enumerates four new skills + two renames; map-workflow "/map SHALL be the mandatory intake" / "No other skill SHALL create issues cleared for work" |
| K2 | Major | openspec/specs/trunk-workflow/spec.md:6 | The canonical spec's hand-edits are dead on arrival — at archive this change's own REMOVED entries delete exactly the text being edited. Reconcile EITHER: revert the file to HEAD (the delta supersedes it), OR, if the one-change-apply-stage wording must survive independently, add a task documenting it and confirm the REMOVED entries don't clobber it. | Fix now | Delta "REMOVED Requirements — /start-change SHALL gate…" / "A change SHALL land in two phases" |
| K3 | Minor | .claude/skills/migrate-epic/SKILL.md:44 | Encodes `DELETE …/issues/<old-epic#>/sub_issue` — singular, inconsistent with the plural `sub_issues` used everywhere else — and the text concedes it's unverified. Reconcile EITHER: verify live and encode verbatim, dropping the hedge, OR drop it with the skill if K1 resolves that way. | Fix now | migrate-epic step 4 ↔ design.md D1 |

```
┌──────────────────────┐  disagree   ┌──────────────────────────┐
│ delta: REMOVED       │ ◀ ─ ─ ─ ─ ▶ │ specs/trunk-workflow.md  │
│ /start-change req    │  archive    │ same req reworded in place│
└──────────────────────┘  deletes it └──────────────────────────┘
   resolve EITHER: revert the hand-edit  OR  document + de-conflict
```

### What looks good
- Two-layer constitution (definition vs. execution) is a clean separation, and the "sharpness is perishable" framing gives `/embark`'s terrain check a real job rather than ceremony.
- The label machine is a genuine state machine with each transition owned by exactly one skill — no ambiguity about who stamps what.
- `/landfall`'s state-driven, self-healing resume and the never-commit discipline are consistently applied across all seven new/reworked skills.
- Deltas cover three capabilities coherently; `openspec validate add-map-skill --strict` passes and all 19 tasks are `[x]`.
- design.md D1's live-verification standard for `gh` invocations is a strong invariant — `/map` follows it exactly.

### CI
Unverified — non-PR invocation, no check run to read. Tasks 4.5 (`npm run test:coverage`) and 4.6 (`npm run test:e2e`) are marked `[x]` with a doc-only rationale; the deferral is reasonable for this diff (no production source, test, or script file touched), but must be confirmed against the `dev`-push check run before archiving.

**Verdict:** findings remain — 12 open `Fix now` findings; CI unverified.

## Round 2 — adjudication (2026-07-14)

Owner rulings between round 1 and the next review. Dispositions here supersede round 1's proposals. C1, C2, C3, K2, S3, S4, S5, S6, C5 were fixed — read the delta. This round records only what the delta can't explain.

Amended after the design changes below landed; round 1 is untouched.

### Dropped — do not re-raise

| # | Why |
|---|-----|
| K1 · C4 | Owner: undocumented **by design**. `/migrate-epic` self-declares as a temporary helper to be deleted once no pre-workflow epics remain, and nothing references it. Not scope creep. |
| S7 | Duplicate of K3, and `File issue` failed the skill's own "warrants its own cycle" bar. |
| K3 | **Verified false.** GitHub's REST API is genuinely asymmetric — `POST/GET .../sub_issues` but `DELETE .../sub_issue` (singular). The invocation is correct; changing it to plural would break it. The residual "confirm live before batching" instruction is operational guidance in an intentionally-undocumented temporary skill, not a defect — the whole finding is disposed. |

### Owner-directed design changes — not findings

Two redesigns the owner called during the fix round. Neither came from a finding; both are unreviewed surface for the next round.

- **`/embark` is an allowlist, not a routing table** (supersedes S2's fix). S2's fix added `UNDER SAIL`/`IN PORT` rows to embark's dispatch table; the owner identified the table itself as the defect — enumeration is fragile, every new label silently acquires a catch-all route, and `MAP` → "delegate to map's work phase" had the execution layer reaching into the definition layer. Now: `CHARTED` proceeds, every other state stops. **The S2 rows are gone** — do not verify them. Rationale in design.md D7; `/embark <map#>` reports and stops instead of delegating, the accepted cost.
- **The label machine extracted** to `.claude/skills/map/reference/label-machine.md`. It was stated twice (CLAUDE.md + map/SKILL.md), identical by design, and it is cross-layer vocabulary that neither layer owns — map stamps the definition-side transitions, `/set-sail` and `/landfall` the execution-side ones. Map, embark, and CLAUDE.md now reference it. Rationale in design.md D13; the spec still assigns the machine to `map-workflow`, deliberately left (fixing it means a new capability and its Purpose).

### Two fixes that look unfixed

- **C1** — canonical `openspec/specs/spec-review/spec.md` and `recheck-review/spec.md` still read `/land-change`. Correct: the new MODIFIED deltas carry the rename, and sync/archive writes canonical text from deltas. Not a hand-edit surface.
- **C5 · S6** — `ci.yml` is now in the diff while tasks 4.5/4.6 stay skipped. Correct: the reworked exemption is an effects test, and a comment-only edit qualifies.

### New finding (fixed in this round)

| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| N1 | Major | design.md D1 · .claude/skills/close-map/SKILL.md:22 · .claude/skills/map/SKILL.md:120 | `GET .../sub_issues` returns 30 per page and `gh api` does not auto-paginate. **Two** unpaginated readers whose results gate decisions: close-map's partition (a >30-sub-issue map could close with open chunks) and map's frontier scan (truncated frontier). Root cause is D1, not the two call sites: "verified live" tests whether an invocation is *shaped right*, never whether it returns *everything*, so both sites passed the invariant while silently truncating. Round-1 evidence that the gap is real — the agents caught the identical page-size class in `gh label list` (S5) and missed it twice in the same skill. Fixed: `--paginate` at both sites, and D1 extended to require completeness (`--paginate` / `--limit` on every encoded list call whose result gates a decision). | Fix now | docs.github.com/en/rest/issues/sub-issues (`per_page` default 30) ↔ close-map guardrail "A map whose last chunk is merely `IN PORT` SHALL NOT close" |

### Self-caught during the fix round

Five defects introduced or missed by the round-2 fixes themselves, every one found by verification rather than review — the fix round's own error rate is the reason round 3 is a full review:

- **design.md D14** still carried S6's superseded path-allowlist wording — the S6 fix swept `openspec/config.yaml`, the `testing-foundation` delta, and CLAUDE.md but missed `design.md`. Same incomplete-sweep class as C1. Fixed, with the rejected framing and why recorded.
- **tasks.md 4.5/4.6 rationale went factually false** — it claimed "entire diff is CLAUDE.md, `.claude/**`, `openspec/**`" after the C5 fix put `ci.yml` in the diff. Rewritten to state the comment-only edit and cite the effects test.
- **map/SKILL.md:131** (`dependencies/blocked_by`) was a third unpaginated list read — the file introducing D1's completeness rule would have violated it. `--paginate` added; >30 blockers is unrealistic, but the invariant shouldn't have a hole in its own source.
- **close-map grew an enumeration** — deleting step 2 (S4) moved its label list into step 3's gate, reintroducing the exact fragility the embark redesign had just removed. Also redundant: the gate reads GitHub issue state, not labels. Enumeration deleted.
- **map lost `OFF THE MAP`** — the label extraction restated map's local role as "what it stamps," a frame that structurally excludes the label it *reads*. Map's intake queue vanished from its own skill. Restored. Same blind spot as embark's table, which enumerated outputs while `UNDER SAIL`/`IN PORT` fell through a catch-all: each skill must name its input state **and** its stamps.

### Next round is a full review, not a recheck

`/recheck-review`'s escalation tells both fire, so a recheck would declare `outgrew recheck` on sight:

- **Files outside round 1's diff** — `.github/workflows/ci.yml`, `specs/spec-review/`, `specs/recheck-review/`, and `map/reference/label-machine.md` were not in `git diff --staged` at anchor `f0b7065`.
- **Unreviewed normative surface** — two MODIFIED deltas, a redesigned `/embark` requirement and its scenarios, and three design decisions (D1 completeness, D7 allowlist, D13 extraction) that no review has seen.

Run `/spec-review add-map-skill` for round 3. Its anchor will differ from this header's — these fixes are unstaged on top of `f0b7065`.

**Verdict:** findings remain — no open `Fix now` from round 1's set. Round 3 reviews the fix delta and the two owner-directed redesigns as new surface. CI still unverified.

## Round 3 — recheck (2026-07-14)

Both escalation tells fire; this recheck cannot cover the delta and does not try.

- **Files outside the original review's diff** — the fix delta (unstaged on anchor `f0b7065`) touches `.github/workflows/ci.yml` and introduces untracked surface never in the staged baseline: `.claude/skills/map/reference/label-machine.md`, `openspec/changes/add-map-skill/specs/spec-review/`, `openspec/changes/add-map-skill/specs/recheck-review/`.
- **Unreviewed normative surface** — two new MODIFIED deltas, the redesigned `/embark` allowlist requirement and scenarios, and design decisions D1 (completeness), D7 (allowlist), D13 (label-machine extraction), none seen by any review round.

Finding-status pass, as far as it stays honest:

| # | Prior finding | Status | Notes |
|---|---------------|--------|-------|
| N1 | Unpaginated gating list reads (close-map partition, map frontier) | resolved | `--paginate` verified at close-map/SKILL.md:22, map/SKILL.md:108 and :119 (the third read self-caught in round 2); design.md D1 now requires completeness (`--paginate`/`--limit`) on every encoded list call gating a decision. |

No other `Fix now` findings were open entering this round (round 2 adjudicated or fixed round 1's set in-round).

**Verdict:** outgrew recheck — run `/spec-review add-map-skill` for round 4; its anchor will differ from this header's (fixes are unstaged on `f0b7065`).

## Round 4 — spec-review (2026-07-14)

Full review of the fix delta only: unstaged diff plus untracked files (`label-machine.md`, the `spec-review`/`recheck-review` deltas) on top of the staged, already-reviewed baseline at anchor `f0b7065`. Staged changes were used for scope context, not re-reviewed. Owner-directed redesigns (D1 completeness, D7 allowlist, D13 extraction) reviewed here as new surface.

**Scope:** `git diff` + untracked (excluding this report) · change `add-map-skill` (active)

### Standard
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| S8 | Minor | .claude/skills/map/reference/label-machine.md:23 | Label creation demoted to "a one-time repo-setup step", but the deleted idempotent `gh label create` loop was rehomed nowhere durable — the only surviving record is design.md's migration section (which cites the deleted block by its old location) inside a change directory that archives away. No active file tells an adopter, or a repo whose label was deleted, how to create the routing labels the machine requires to exist. Natural home: a repo-setup appendix in label-machine.md itself. | Fix now | label-machine.md:23 "creation is a one-time repo-setup step" ↔ map-workflow delta "label creation lives in adoption tooling" — no adoption tooling exists |

### Convention
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| C6 | Minor | openspec/changes/add-map-skill/tasks.md:22 | Task 3.5 inserted between 3.2 and 3.3 — IDs run 3.1, 3.2, 3.5, 3.3, 3.4. IDs are cited by this report's prior rounds, so renumbering would break citations; the fix is a line reorder (move 3.5 after 3.4) keeping IDs stable, or an owner Drop if the sweep-adjacent grouping is intentional. | Fix now | tasks.md:20-24 ↔ config.yaml tasks rule (ordered, separately-checkable items) |
| C7 | Major | openspec/specs/trunk-workflow/spec.md | **Verified false — dropped.** Agent read the unstaged diff's `+`-lines as new hand-edits of the `/start-change` requirement bodies; they are HEAD's original text restored by the K2 revert. `git diff HEAD` on the file shows exactly one changed line: the Purpose (the sanctioned S1/C2 fix). Requirements and scenarios are byte-identical to HEAD; the delta's REMOVED entries supersede them at archive. | Drop | `git diff HEAD --stat -- openspec/specs/trunk-workflow/spec.md` → 1 insertion, 1 deletion (Purpose only) |
| C8 | Major | openspec/specs/trunk-workflow/spec.md | **Verified false — dropped.** Same misread as C7: the alleged canonical-spec-vs-CLAUDE.md contradiction ("dirty tree blocks start" vs apply-stage rule) compares restored HEAD text against the new CLAUDE.md. The disagreement is real only until archive, when this change's delta removes the old requirement — exactly the mechanism the workflow prescribes. | Drop | Same evidence as C7; delta `REMOVED: /start-change SHALL gate on trunk preconditions` |

### Contract
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| K4 | Minor | openspec/changes/add-map-skill/design.md:95 | Migration record contradicts the label-machine rework it now ships beside: claims "Routing labels are the same create-if-absent block `/map` carries" and its script step 1 cites "the create-if-absent loop from .claude/skills/map/SKILL.md § The label machine" — a block this round deleted — and restates the superseded "absence of `CHARTED` means hand to `/map`" framing (now: embark stops). Same incomplete-sweep class round 2 self-caught in D14. Fix: reword the migration record to inline the actual creation commands (pairs with S8's rehoming) and drop the hand-to-`/map` phrasing. | Fix now | design.md:95-98 ↔ map-workflow delta "skills SHALL stamp them and SHALL NOT create them"; trunk-workflow delta "every other state SHALL stop" |
| K5 | Minor | openspec/changes/add-map-skill/specs/map-workflow/spec.md:27 | Two SHALLs in the same delta set disagree on embark entering the definition layer: map-workflow:27 says "the definition layer SHALL NOT be entered by delegation from embark" (unscoped), while trunk-workflow:25 and map-workflow:111 itself sanction the grilling's owner-confirmed epic route-out to `/map`'s chart phase in the same conversation. Reconcile EITHER: scope the SHALL NOT to the boarding check's label dispatch (the D7 intent), OR remove the route-out allowance from trunk-workflow and D7. | Fix now | map-workflow spec.md:27 ↔ trunk-workflow spec.md:25 "MAY … route out to `/map`'s chart phase"; map-workflow spec.md:111 |

### What looks good
- The K2 revert was executed exactly as prescribed — canonical trunk-workflow spec back to HEAD except the one sanctioned Purpose line; both false-positive Majors dissolved on verification against `git diff HEAD`.
- D7's allowlist requirement is written the way the redesign intended: no enumerated reject-states, unknown labels stop, lowercase never routes.
- D1's completeness extension ("shaped right **and** complete") names the failure mode precisely and both gating list reads carry `--paginate`.
- The label-machine extraction (D13) gives the cross-layer vocabulary one home, and the new MODIFIED deltas carry the `/land-change` → `/landfall` rename through `spec-review`/`recheck-review` specs via the correct mechanism.
- `openspec validate add-map-skill --strict` passes; all tasks `[x]`.

### CI
Unverified — non-PR invocation. Tasks 4.5/4.6 remain skipped under the doc-only effects-test exemption (diff is CLAUDE.md, `.claude/**`, `openspec/**`, comment-only `ci.yml` edit) — reasonable; confirm against the `dev`-push check run before archiving.

**Verdict:** Request changes — findings remain: 4 open `Fix now` (S8, C6, K4, K5), all Minor. Not yet clear to archive (blockers: the four findings; CI unverified).

## Round 5 — adjudication (2026-07-14)

Fixes applied in-session after round 4, plus one owner overrule. Recheck verifies against this record, not round 4's dispositions.

### S8 — owner-overruled to Drop; do not re-raise

The round-4 fix added a `## Repo setup (one-time)` creation script to `label-machine.md`. The owner overruled and it was removed: the script's omission was **deliberate** — label-machine.md is read on every routing decision (map, embark, anywhere the list is consulted), and a one-time setup script does not belong in that hot path, nor anywhere else in the active tree. The durable-home premise of S8 is rejected, not unmet. Current state, verify as-is:

- label-machine.md:23 states creation is deliberately undocumented there and repair = recreate by hand from the table (`gh label create`).
- design.md migration record states creation happened once at migration, recorded nowhere active; script step-1 comment no longer cites any deleted block or nonexistent section.
- map-workflow delta reworded "lives in adoption tooling" → "a one-time adoption step" (no tooling exists).

### Fixed as dispositioned

- **C6** — tasks.md line 3.5 moved after 3.4; IDs untouched (prior-round citations intact).
- **K4** — design.md migration record: "absence of `CHARTED` means hand to `/map`" → embark-stops framing; stale create-if-absent citations gone (see S8 state above for final wording).
- **K5** — map-workflow spec.md:27 SHALL NOT scoped to the boarding check's label dispatch; the grilling's owner-confirmed epic route-out (owned by `trunk-workflow`) named the sole sanctioned entry — consistent with trunk-workflow:25 and map-workflow:111.

### Adjacent cleanup (not a finding)

map/SKILL.md chart step 1 ("Ensure the routing labels exist (create-if-absent above)") deleted — it cited the removed creation block and contradicted stamp-never-create; chart steps renumbered 1–7.

`openspec validate add-map-skill --strict` passes after all edits.

**Verdict:** findings remain — pending recheck of C6/K4/K5 fixes and the S8 removal state; S8 itself is dropped by owner ruling. CI still unverified.

## Round 6 — recheck (2026-07-14)

Fix delta (unstaged on the round-4 baseline): `map/SKILL.md`, `label-machine.md`, `design.md`, `specs/map-workflow/spec.md`, `tasks.md` — all inside round 4's reviewed scope, delta small. No escalation tell fires.

| # | Prior finding | Status | Notes |
|---|---------------|--------|-------|
| S8 | Label-creation script has no durable home | resolved (owner-overruled to Drop) | Verified the removal state round 5 records: label-machine.md:23 states the omission is deliberate (hot-path file, setup happened once at adoption) and names the repair path (`gh label create` from the table); no `## Repo setup` section remains; map-workflow delta reads "one-time adoption step" — the "adoption tooling" phrase is gone. |
| C6 | tasks.md 3.5 out of order | resolved | Line 3.5 now follows 3.4; IDs unchanged, prior-round citations intact. |
| K4 | design.md migration record cites deleted create-if-absent block + superseded hand-to-`/map` framing | resolved | Record now reads "an issue without `CHARTED` stops `/embark` and re-enters through `/map`"; script step 1 cites label-machine.md's table, not the deleted block; grep for `create-if-absent`/`adoption tooling` across `.claude/**` and the change dir returns zero hits outside this report. |
| K5 | Unscoped "SHALL NOT be entered by delegation from embark" contradicts the sanctioned epic route-out | resolved | map-workflow spec.md:27 now scopes the SHALL NOT to embark's boarding-check label dispatch and names the trunk-workflow-owned grilling route-out as the sole sanctioned entry — consistent with trunk-workflow spec.md:25 and the map-workflow re-validation-sweep requirement. |

Adjacent cleanup verified: map/SKILL.md chart step 1 (create-if-absent citation) deleted, steps renumbered 1–7 cleanly. `openspec validate add-map-skill --strict` passes.

No new findings introduced by the fixes.

**Verdict:** clear to land — every prior open `Fix now` finding resolved or owner-dropped; no new `Fix now` findings. CI remains unverified (non-PR invocation) — confirm the `dev`-push check run before archiving, per rounds 1–4.
