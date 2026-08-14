---
review: spec-review
target: deferred-e2e-scout-lifecycle
anchor: 8c09793f20a8fd79c4c31694dcc479da253b0b94
diff-source: git diff --staged
round: 6
---

## Round 1 — spec-review (2026-07-21)

Clean spec/skills-only change: scout-lifecycle deferral is coherently wired across port-inspection, close-map, landfall, label-machine, and set-sail, with matching normative spec deltas. Alignment and convention clean; one Minor cross-file doc-staleness note.

**Scope:** `git diff --staged` · deferred-e2e-scout-lifecycle (active)

### Alignment
_none_

### Boundary
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| B1 | Minor | openspec/specs/map-workflow/spec.md (auto-resolve requirement parenthetical) | The unmodified `SCOUTING tickets SHALL auto-resolve` requirement enumerates fire-at-creation contexts as "(during charting or on graduation from fog)". This change adds a third creation context — /port-inspection's lazy scout at map close — without amending that parenthetical, so the list reads exhaustive while omitting the new path. Illustrative, not contradictory: the new requirement documents the path and cross-references here. | File issue | CLAUDE.md doc-vs-code drift (single-source; parenthetical under-enumerates) |

### Convention
_none_

### What looks good
- All three MODIFIED requirement headers match the main specs exactly; `openspec validate --strict` passes.
- Mid-map policy single-sourced: spec normative, skill mechanics — no duplication.
- Conditional CLAUDE.md task 4.2 correctly untouched (Trunk digest names skills only, no landfall bookkeeping detail).
- Every `[x]` task has matching diff work; test battery deferral to CI is legitimate for a non-executable change.

**Verdict:** clear to land — no open Fix-now findings; active-change archive gate satisfied (9/9 tasks `[x]`, validate --strict passes). CI unverified: non-PR staged review, so the deferred test:coverage/test:e2e battery must show green on the dev push before archive. B1 filed as a follow-up, non-blocking.

### Adjudications (2026-07-21)

| # | Old → New | Rationale |
|---|-----------|-----------|
| B1 | File issue → Fix now | Intended design is lazy fire-at-creation (settled at `/embark` grilling, supersedes map #270's original deferred/exit-created/anchor-wired shape). The parenthetical is a maintained enumeration in a spec this change already touches — single-source discipline: **relax** it so it stops claiming exhaustiveness (creation contexts are owned by their own requirements), rather than grow it with the map-close context. Same-class stale first-shape leftover to reconcile in the same pass: the trunk-workflow delta's parenthetical calls the scout "harvested later by the map's **deferred** e2e scout" — `deferred` is wrong; the scout is lazy-created, not the deferred variant. In-charter doc reconciliation, not a follow-up. |

**Verdict:** findings remain — B1 reopened as an open Fix-now spec-reconciliation; resolve in this change (relax map-workflow:112 parenthetical + drop the stale "deferred" in the trunk-workflow delta) before landing.

## Round 2 — recheck (2026-07-21)

B1's fix verified resolved, but the fix delta touched both implementation skills and spec artifacts — outside recheck's single-sided scope.

**Scope:** `git diff` (unstaged working tree atop anchor `8c09793`) · deferred-e2e-scout-lifecycle (active)

| # | Prior finding | Status | Notes |
|---|---------------|--------|-------|
| B1 | Relax `SCOUTING … auto-resolve` parenthetical + drop stale "deferred" in trunk-workflow delta | resolved | Delta spec adds MODIFIED `SCOUTING tickets SHALL auto-resolve with unreviewed markers` requirement whose parenthetical is explicitly non-exhaustive ("the creation context is owned by the requirement that creates the ticket"); header matches main spec exactly. Trunk-workflow delta now reads "the map's e2e scout". Matching implementation-side reconciliation: `issue-cut.md`'s Deferred `SCOUTING` variant section deleted. `openspec validate --all --strict` passes (54/54). |

**Escalation tell:** the fix delta touched both sides — implementation skills (`.claude/skills/adjudicate-review/SKILL.md` and `.claude/skills/spec-review/reference/finding-format.md` gained a new, never-reviewed adjudication-promotion gate mechanic; `.claude/skills/map/reference/issue-cut.md` lost its deferred-variant section) **and** spec artifacts (`specs/map-workflow/spec.md`, `specs/trunk-workflow/spec.md`, `tasks.md`). A mixed delta is `/incremental-spec-review`'s scope.

**Verdict:** outgrew recheck — run `/incremental-spec-review` for the next round.

## Round 3 — incremental-spec-review (2026-07-21)

B1 confirmed resolved, but the fix delta carried three undocumented normative expansions beyond B1's adjudicated scope — the deferred-`SCOUTING` variant's retirement, a new adjudication gate-promotion mechanic, and a gate-omission rule that contradicts `openspec/config.yaml` and CLAUDE.md.

**Scope:** A/C `git diff` · B `git diff 8c09793` · deferred-e2e-scout-lifecycle (active)

### Prior findings
| # | Prior finding | Status | Notes |
|---|---------------|--------|-------|
| B1 | Relax `SCOUTING … auto-resolve` parenthetical + drop stale "deferred" in trunk-workflow delta | resolved | Verified in code, not diff alone: the delta's MODIFIED `SCOUTING tickets SHALL auto-resolve with unreviewed markers` requirement carries an explicitly non-exhaustive parenthetical ("the creation context is owned by the requirement that creates the ticket"), header matches the main spec exactly; the trunk-workflow delta reads "the map's e2e scout". `openspec validate deferred-e2e-scout-lifecycle --strict` passes. Round 2's stale `## 7. Gates` section is superseded by this table for its 7.x items. |

### Alignment
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| A1 | Major | `.claude/skills/map/reference/issue-cut.md:57` (deleted) ↔ `proposal.md:3,25` | The fix delta deletes issue-cut.md's entire `Deferred SCOUTING variant` section and drops the matching `A **deferred** SCOUTING variant SHALL exist per issue-cut.md` sentence + `Deferred scouting is born unfired` scenario from the map-workflow MODIFIED requirement — retiring a normative birth variant. proposal.md still states "exit, `/anchor`, and the deferred-scout variant are untouched" and "issue-cut.md's birth rules are untouched"; design.md's rejected-alternative reasoning still leans on the variant existing. No task covers the retirement; gate item 6.1 scoped B1 to the parenthetical relax + stale-word drop only. | Fix now — reconcile **either** side: restore the variant section + its SHALL/scenario (keeping B1 to the relax), **or** keep the removal and amend proposal.md/design.md's "untouched" claims plus add a task covering it | CLAUDE.md § Specs are the contract; task-completion truth (work with no task, artifacts contradicting implementation) |
| A2+B3 | Major | `.claude/skills/adjudicate-review/SKILL.md:106` ↔ `openspec/specs/adjudicate-review/spec.md:60` | The delta adds a new adjudication mechanic — a promotion to open `Fix now` owes a gate line; append the section when the round had none, insert-and-renumber when it did. The governing capability spec enumerates adjudication's tasks.md authority in exactly one requirement ("A clearing adjudication deletes the pending gate section"), scoping the skill to *deleting only*. This change carries no `adjudicate-review` delta spec, no task, and no proposal mention, so the skill now claims a tasks.md write its spec does not grant. | Fix now — reconcile **either** side: revert the promotion mechanic out of this change and propose it separately, **or** add an `adjudicate-review` delta spec + task documenting the new SHALL | `openspec/specs/adjudicate-review/spec.md:60` (no promotion mirror); CLAUDE.md § Specs are the contract |
| A3+B4 | Major | `.claude/skills/spec-review/reference/finding-format.md:235,249` ↔ `openspec/config.yaml:146-160`, `CLAUDE.md:12`, `openspec/specs/spec-review/spec.md:322` | The delta flips the doc-only exemption from "gate item marked skipped with rationale" to "gate item omitted entirely — a never-run gate is not a checkable task". `config.yaml` `rules.tasks` says the test gates "MAY be marked skipped instead of run, checked with an explicit 'skipped — doc-only change' rationale on the task line" and that "the five tasks still appear in every tasks.md; the exemption changes how they may be satisfied, not whether they exist"; CLAUDE.md § Five gates says the same; `spec-review/spec.md:322` SHALLs the five gates "restated so each partial failure is visible". None is amended, so the repo now carries two live opposed rules for the same artifact — and this change's own §6/§7 already follow the new one. | Fix now — reconcile **either** side: restore the marked-skipped item form in finding-format.md, **or** amend `config.yaml` `rules.tasks` + CLAUDE.md § Five gates + a `spec-review` delta spec to permit omission | `openspec/config.yaml` `rules.tasks` doc-only exemption; CLAUDE.md § Five gates; `openspec/specs/spec-review/spec.md:322` |

### Boundary
_merged into A2+B3 and A3+B4 above; no standalone boundary findings._

Cleared by arena B: the deleted `issue-cut.md` variant section leaves no dangling references anywhere in skills or specs; the near-verbatim restatement of the promotion mechanic across `adjudicate-review/SKILL.md` and `finding-format.md` follows the established skill-mechanics-vs-shared-format split, not new duplication; landfall ↔ port-inspection ↔ close-map scout wiring is consistent with both spec deltas.

### Convention
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| C5 | Minor | `.claude/skills/spec-review/reference/finding-format.md:215` | The new lead-in cross-references the adjudication-append behavior as "(see **Exits**)", but **Exits** describes the opposite case (deleting a pending section on a clearing verdict). The rule it means is the newly added **Adjudication entry** bullet. | Fix now — point the cross-reference at **Adjudication entry** | CLAUDE.md single-source doc discipline — a pointer must name the rule it targets |
| C6 | Minor | `openspec/changes/deferred-e2e-scout-lifecycle/tasks.md:32` | Round-1 gate section §6 restates lint, tsc, and `openspec validate` but omits `npm run build`. Only the two test gates inherit the doc-only exemption, and §6's lead-in names only those two as skipped. §7, written in the same delta, does include build — the omission is inconsistent within the change itself. | Fix now — add `npm run build` to §6 (or state the round-1 rationale for its absence) | `finding-format.md:245-254` (full pre-merge set restated; only the two test gates exempt) |

### What looks good
- B1's reconciliation is genuinely single-source: the relaxed parenthetical hands creation-context ownership to the requirement that creates the ticket rather than growing a maintained enumeration.
- MODIFIED requirement headers still match the main specs exactly after the fix; `openspec validate --strict` passes.
- Non-executable-change test deferral to CI remains legitimate — no executable file anywhere in the footprint.

**Verdict:** findings remain — A1 (deferred-variant retirement undocumented), A2+B3 (adjudicate-review promotion mechanic without a delta spec), A3+B4 (gate-omission rule contradicts `config.yaml`/CLAUDE.md/`spec-review` spec), C5, C6.

### Adjudications (2026-07-21)

| # | Old → New | Rationale |
|---|-----------|-----------|
| A1 | Fix now (either side) → Fix now, **keep the removal** | Retirement is the coherent outcome, not an accident: design.md's lazy-creation decision explicitly rejects the deferred-birth shape, and grep confirms the map-wide e2e scout was its only would-be consumer — zero remaining references in any skill or spec. Restoring would resurrect dead normative surface. Reconcile the **artifact** side: amend proposal.md:3 ("the deferred-scout variant are untouched") and :25 ("issue-cut.md's birth rules are untouched"), and add a task covering the retirement. |
| A2+B3 | Fix now (either side) → Fix now, **add the delta spec** | The promotion mechanic was born from this change's own round-1 adjudication (B1 promoted `File issue` → `Fix now` — precisely the scenario it governs), so reverting it would leave round 3's own gate section written under an ungoverned rule. Add an `adjudicate-review` delta spec carrying the promotion requirement as the mirror of the existing "A clearing adjudication deletes the pending gate section", plus a task. Accepted cost: widens the charter beyond the e2e scout. **Scope extended by owner (see the demotion-mirror note below)**: the same delta spec, `adjudicate-review/SKILL.md`, and `finding-format.md` also gain the *demotion* rule. |
| A3+B4 | Fix now (either side) → Fix now, **amend the canonical sources** | Owner's ruling reverses the recommended side: an unchecked box for a gate that will never run has no meaningful check, and "check it to record that I skipped it" is bookkeeping the task file should not carry — visibility of a skip belongs to whoever writes the tasks (the section lead-in), not to a checkbox. The omission form in `finding-format.md` stands; reconcile the other side — amend `openspec/config.yaml` `rules.tasks` (drop "checked with an explicit rationale on the task line" + "The five tasks still appear in every tasks.md"), CLAUDE.md § Five gates, and add a `spec-review` delta spec amending `spec-review/spec.md:322`'s five-gates-restated SHALL to permit omission of an exempt gate. This change's tasks.md §6/§7/§8 already follow the omission form and need no edit. |
| C5 | Fix now → Fix now (confirmed) | Cross-reference at `finding-format.md:215` repoints from **Exits** to **Adjudication entry**. Rides along with A2+B3's work on the same mechanic. |
| C6 | Fix now → **Drop** | §6 is round 1's already-checked historical section; §8 restates `npm run build` and re-runs it before landing, so §6's omission has no live effect. Per the demotion-mirror rule below, gate item **8.5 is checked off by this adjudication** and annotated `— dropped at adjudication (see review.md Round 3 Adjudications)`. |

#### Demotion mirror — owner directive (in scope for A2+B3)

`/adjudicate-review` today has two tasks.md authorities: delete the whole pending
section on a clearing verdict, and add a gate line on **promotion** to open
`Fix now`. It has none for the opposite move — a finding **demoted** out of open
`Fix now` (→ `Drop` or → `File issue`) leaves its gate line pending, so the fix
session faces an item with no work behind it, and `/landfall`'s all-tasks-checked
gate blocks on a finding that no longer blocks. C6 above is exactly this case.

Owner's ruling: the skill SHALL **check off** the demoted finding's existing gate
line in place and **annotate** it with the disposition — `— dropped at
adjudication` for a `Drop`, `— filed #<N>` for a confirmed `File issue`, carrying
the issue number created in-interview. Not deletion: the line stays as the visible
record that the finding existed and how it left the open set. Scoped like its
siblings — only the latest round's section, only lines for findings this
adjudication demoted, no renumbering (the item count is unchanged).

**Annotation shape** (owner-specified): a **trailing `— _italic note_` on the item
line itself**, following the repo's existing tasks.md convention for annotating a
checked item (see the `deck-failure-actions` change's 1.3 / 2.3 / 3.1). The note
says there is no work to do, names the disposition change, and points at the round's
Adjudications. Not a note in the section's lead-in (too far from the item to stop a
fix session mid-scan), and not a nested blockquote or a GitHub `> [!IMPORTANT]`
alert (the editor's markdown preview does not implement alert syntax and renders
the marker as literal text). 8.5 in this change's `tasks.md` is the worked example.

Fix-session footprint, folded into A2+B3's reconciliation: the new SHALL in the
`adjudicate-review` delta spec (alongside the promotion requirement), the mechanic
in `.claude/skills/adjudicate-review/SKILL.md`'s side-effect list, and a mirror
bullet in `finding-format.md`'s § Gate sections Rules beside **Adjudication entry**
and **Exits**. Applied here already, on owner's direction, as the rule's first
instance: gate item **8.5 is checked off and annotated** in `tasks.md`, so the fix
session does not chase a dropped finding.

**Verdict:** findings remain — A1, A2+B3, A3+B4, C5 stay open `Fix now` with their reconcile sides now settled; C6 dropped. Round 3's `## 8. Gates — round 3` section stands; item 8.5 is discharged by C6's Drop per the demotion mirror above.

## Round 4 — recheck (2026-07-21)

All four open round-3 `Fix now` findings verified resolved in the code, but the fix delta again touched both implementation skills and spec artifacts — outside recheck's single-sided scope.

**Scope:** `git diff` (unstaged working tree atop anchor `8c09793`) · deferred-e2e-scout-lifecycle (active)

| # | Prior finding | Status | Notes |
|---|---------------|--------|-------|
| A1 | Deferred-`SCOUTING`-variant retirement vs proposal/design "untouched" claims | resolved | Adjudicated side taken (keep the removal, amend the artifacts): `proposal.md:3` now reads "so exit and `/anchor` are untouched. The deferred-scout birth variant is **retired**: lazy creation was its only would-be consumer"; `proposal.md` Impact names `issue-cut.md` in the touch list and qualifies the birth-rules claim; `design.md`'s rejected-alternative reasoning now states the retirement explicitly. Task 2.3 added covering the retirement. |
| A2+B3 | adjudicate-review gate-promotion mechanic without a delta spec or task | resolved | `specs/adjudicate-review/spec.md` added with two ADDED requirements — the promotion gate line (both scenarios: no-section-append, existing-section insert-and-renumber) and the owner-directed demotion mirror (check off in place + trailing italic annotation, `Drop` and confirmed `File issue` scenarios). `adjudicate-review/SKILL.md` gained the demotion section and its side-effect list now enumerates it; `finding-format.md` gained the matching **Adjudication demotion** Rules bullet. Task 4.4 added. `proposal.md` What Changes names the capability. |
| A3+B4 | Gate-omission rule contradicts `config.yaml` / CLAUDE.md / `spec-review/spec.md:322` | resolved | Owner's side taken (amend the canonical sources): `config.yaml` `rules.tasks` now says the exempt gates "MAY be omitted instead of run, never silently: an exempt gate carries no checklist item … the section's lead-in names the omitted gates and the rationale", and the "five tasks still appear in every tasks.md" sentence is gone; `CLAUDE.md` § Five gates matches. `specs/spec-review/spec.md` MODIFIED requirement amends the five-gates-restated SHALL with "minus any gate omitted under the doc-only exemption" plus a doc-only-omission scenario; `specs/testing-foundation/spec.md` MODIFIED requirement carries the same form. Both MODIFIED headers match the main specs exactly (`spec-review/spec.md:322`, `testing-foundation/spec.md:15`). Task 4.5 added. |
| C5 | `finding-format.md:215` cross-reference points at **Exits** | resolved | Now reads "(see **Adjudication entry**)". |

### New findings

| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| A5 | Minor | `openspec/changes/deferred-e2e-scout-lifecycle/tasks.md:26-27` | The change's own §5 pre-merge section predates the amended rule and no longer satisfies it: 5.2 lumps `npm run lint` and `npx tsc --noEmit` into one item, omits `npm run build` entirely, and describes the test gates as "skipped" inline rather than omitted-with-a-lead-in-rationale. The `testing-foundation` requirement this delta amends still SHALLs "the five-gate pre-merge section with separately-checkable items, minus any gate omitted under the doc-only exemption" — the exemption covers only the two test gates, so `build` owes an item and lint/tsc owe separate ones. Unlike C6 (round 3, dropped because §8 restated `build` and re-ran it), this is the change's *primary* pre-merge section and it now contradicts the very requirement the change is amending. | Fix now — split 5.2 into separate lint / tsc / build items and move the doc-only rationale into a §5 lead-in naming the two omitted test gates | `openspec/changes/deferred-e2e-scout-lifecycle/specs/testing-foundation/spec.md` (five-gate section, separately-checkable, exemption limited to the two test gates); `openspec/config.yaml` `rules.tasks` as amended by this delta |

**Escalation tell:** the fix delta touched both sides — implementation skills (`.claude/skills/adjudicate-review/SKILL.md` gained the demotion mechanic, `.claude/skills/spec-review/reference/finding-format.md` gained the demotion Rules bullet + the C5 cross-reference repoint) **and** spec artifacts (`specs/adjudicate-review/spec.md`, `specs/spec-review/spec.md`, `specs/testing-foundation/spec.md`, `proposal.md`, `design.md`, `tasks.md`) **and** repo canon (`openspec/config.yaml`, `CLAUDE.md`). A mixed delta is `/incremental-spec-review`'s scope — and this delta added three never-reviewed delta specs, which no recheck pass covers.

**Verdict:** outgrew recheck — run `/incremental-spec-review` for the next round.

## Round 5 — incremental-spec-review (2026-07-21)

Full-rigor pass over the mixed fix delta round 4 escalated. Round 4's A5 is unfixed (no work has happened since), and both alignment and boundary independently surfaced one stale consumer of the retired skip-marker form in `/landfall`. Convention clean.

**Scope:** A/C `git diff` · B `git diff 8c09793` · deferred-e2e-scout-lifecycle (active)

### Prior findings
| # | Prior finding | Status | Notes |
|---|---------------|--------|-------|
| A5 | §5 pre-merge section contradicts the amended five-gate requirement — 5.2 lumps lint+tsc, omits `build`, uses the retired "skipped" wording | still open | `tasks.md:26-27` unchanged since round 4: `5.1 openspec validate` / `5.2 npm run lint and npx tsc --noEmit pass (non-executable change: test gates skipped …)`. No `build` item, lint and tsc share one checkbox, and the inline "test gates skipped" phrasing is the exact form this change's own `testing-foundation` delta retires. Round 4's `## 9. Gates` section stands; 9.1 remains its open item. |

### Alignment
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| A1+B2 | Minor | `.claude/skills/landfall/SKILL.md:37` | Landfall's Tasks-complete gate still reads "every item in the change's `tasks.md` is `[x]` (**doc-only skip markers count as complete**)". This change retires the skip-marker form repo-wide — `openspec/config.yaml` `rules.tasks`, `CLAUDE.md` § Five gates, `finding-format.md`, and the new `testing-foundation` / `spec-review` delta SHALLs all mandate that an exempt gate carries **no checklist item**. The parenthetical grants completion credit to an artifact form the change now forbids, so it is dead normative surface; sharper, the `testing-foundation` delta justifies omission on the grounds that "a permanently-unchecked item wedges `/landfall`'s all-tasks-checked gate" — a wedge this very line says landfall tolerates. `landfall/SKILL.md` is already in the footprint (edited by task 3.1), and task 4.5's file list does not name it. Independently raised by both the alignment and boundary arenas; merged. | Fix now — reconcile **either** side: reword the landfall parenthetical to the omission form (an exempt gate carries no item, so nothing is left unchecked) and add `landfall/SKILL.md` to task 4.5's file list, **or** keep the parenthetical and amend the `testing-foundation` delta's rationale so it stops citing a wedge landfall explicitly tolerates | `.claude/skills/landfall/SKILL.md:37` ↔ `openspec/changes/deferred-e2e-scout-lifecycle/specs/testing-foundation/spec.md` (omitted gate carries no checklist item; wedge rationale), `openspec/config.yaml` `rules.tasks` as amended, `CLAUDE.md` § Five gates as amended; CLAUDE.md doc-vs-code drift / single-source discipline |

### Boundary
_merged into A1+B2 above; no standalone boundary findings._

Cleared by arena B across the whole footprint (`git diff 8c09793` + the three untracked delta specs): the three new delta specs' MODIFIED headers match their main specs exactly and `openspec validate --all --strict` passes 54/54; the promotion/demotion mechanic's restatement across `adjudicate-review/SKILL.md`, `finding-format.md`, and the `adjudicate-review` delta spec follows the established spec-normative / skill-mechanics / shared-format split rather than introducing duplication; the retired deferred-`SCOUTING` variant leaves no dangling reference anywhere in skills or specs; the doc-only-exemption amendment is consistent across `config.yaml`, `CLAUDE.md`, `finding-format.md`, and both delta specs — landfall is its one stale consumer, reported above.

### Convention
_none_

### What looks good
- The A3+B4 reconciliation is genuinely single-source: `config.yaml` `rules.tasks` carries the rule, the two delta specs carry the SHALLs, `finding-format.md` carries the mechanic, CLAUDE.md carries only the digest line — no fourth copy.
- The owner-directed demotion mirror landed as a real spec requirement with both a `Drop` and a confirmed-`File issue` scenario, not just skill prose; 8.5 in this change's own `tasks.md` is the worked first instance.
- Every requirement added or modified in the three new delta specs carries scenarios; `openspec validate --all --strict` passes 54/54.
- Non-executable-change test deferral to CI remains legitimate — no executable file anywhere in the footprint.

**Verdict:** findings remain — A5 (still open from round 4: §5 pre-merge section shape) and A1+B2 (landfall's stale skip-marker parenthetical).

### Adjudications (2026-07-21)

| # | Old → New | Rationale |
|---|-----------|-----------|
| A5 | Fix now → **Drop** | §5 is the change's already-checked pre-merge section, written before the amended five-gate rule existed — a historical record of gates that were actually run, not a live claim about the new form. Retroactively reshaping checked items to match a rule that postdates them buys nothing: §8 and §10 both restate `build` and re-run the full set before landing, so the amended rule is exercised where it has effect. Same class as C6 (round 3), dropped for the same reason. Per the demotion-mirror rule, gate item **10.1 is checked off by this adjudication** and annotated. |

A1+B2 confirmed as-is (`Fix now`), reconcile side settled by the owner: **reword the landfall parenthetical** to the omission form (an exempt gate carries no checklist item, so nothing is left unchecked) and add `.claude/skills/landfall/SKILL.md` to task 4.5's file list. Not the other side — the `testing-foundation` delta's wedge rationale stands; landfall is the stale consumer.

**Verdict:** findings remain — A1+B2 stays open `Fix now` with its reconcile side settled; A5 dropped. Round 5's `## 10. Gates — round 5` section stands; item 10.1 is discharged by A5's Drop per the demotion mirror.

## Round 6 — recheck (2026-07-21)

Round 5's one open `Fix now` (A1+B2) verified resolved on the adjudicated side. Single-sided delta — skill prose plus this change's own `tasks.md` bookkeeping, no spec artifact, proposal, or design touched — so recheck holds.

**Scope:** `git diff` (unstaged working tree atop anchor `8c09793`) · deferred-e2e-scout-lifecycle (active)

| # | Prior finding | Status | Notes |
|---|---------------|--------|-------|
| A1+B2 | `landfall/SKILL.md:37` credits "doc-only skip markers" as complete, a form the change retires | resolved | Verified in the file, not the diff alone: gate 2 now reads "every item in the change's `tasks.md` is `[x]`." with no parenthetical, so nothing grants completion credit to the retired form. Repo-wide grep for `skip marker(s)` returns only this change's own review/tasks prose describing the finding and one archived round's history — no live consumer. Task 4.5's file list now names `.claude/skills/landfall/SKILL.md`, matching the adjudicated reconcile side. `openspec validate deferred-e2e-scout-lifecycle --strict` passes. Round 5's `## 10. Gates` section is fully checked (10.1 discharged by A5's Drop; 10.2–10.6 checked with results). |

No new findings: the delta is one deleted parenthetical, one task file-list addition, and gate checkboxes.

**Verdict:** clear to land

---
To adjudicate these findings, run `/adjudicate-review deferred-e2e-scout-lifecycle` (a fresh session is recommended) — it re-grounds every disposition in the cited code, interviews you one finding at a time, and records any changes back into `review.md`.
