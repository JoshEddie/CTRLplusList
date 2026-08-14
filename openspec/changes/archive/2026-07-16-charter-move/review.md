---
review: spec-review
target: charter-move
anchor: e25a653b29d4933c5987dc6b39eeb6be0efa6a5f
diff-source: git diff --staged
round: 4
---

# /spec-review — charter-move

## Round 1 — spec-review (2026-07-15)

The change is well-reasoned and the design work is genuinely strong — the exit-re-enterability framing, the transparent-wrapper conclusion, and the `trunk-workflow` terrain-check catch are all correct calls. What blocks it is the contradiction surface `design.md` § Risks itself predicted (risk 3): three deltas across two capabilities, and the sweep in tasks §6 missed several live contradictions. One inherited SHALL the proposal committed to reconciling was left unsignposted, and the new stamper carve-out sentence makes claims that are false against the docs it sits in.

**Scope:** `git diff --staged` @ `e25a653` · charter-move (active)

### Findings

#### Standard
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| S1 | Major → **Minor** (see Adjudication) | [openspec/specs/map-workflow/spec.md:8](openspec/specs/map-workflow/spec.md:8) | The intake requirement's monopoly clause — "No other skill SHALL create issues cleared for work" — is never amended. `CHARTED` is defined as "scope settled, **cleared for work**", and charter births a `CHARTED` chunk from inside `/anchor`. `proposal.md` § Why lists this clause as an inherited SHALL the change "must respect or amend"; per the agent, it does neither. | Fix now | `openspec/specs/map-workflow/spec.md:8` vs. delta exit requirement; `proposal.md` § Why |
| S2 | Minor | [.claude/skills/anchor/SKILL.md:78](.claude/skills/anchor/SKILL.md:78) | Park states the blanket invariant "`UNDER SAIL` SHALL NOT survive an anchor", which the new Charter section falsifies. The spec delta added the carve-out ("except on a charter, which changes no voyage state and leaves the beacon standing") but the skill prose did not get the matching qualifier. Phrased as a universal, so its position under Park does not scope it. | Fix now | `.claude/skills/anchor/SKILL.md:78` vs. delta `specs/map-workflow/spec.md` (bearing-moves requirement) |
| S3 | Minor | [openspec/changes/charter-move/specs/map-workflow/spec.md](openspec/changes/charter-move/specs/map-workflow/spec.md) | The stamper carve-out describes `/split-map` as "a skill that **cuts chunks** as a thin wrapper over `/map`'s exit mechanics". `/split-map` does not cut chunks — its own requirement specifies it migrates existing ones by re-parenting, creating only a successor `MAP` index plus one re-orientation `PLOTTING` ticket. Load-bearing rather than cosmetic: this is the sentence establishing the precedent the design cites for charter's transparency, and it overstates it in normative text. | Fix now | delta stamper sentence vs. `openspec/specs/map-workflow/spec.md:138` ("migrate every unstarted chunk (re-parent as sub-issue)") |

#### Convention
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| C1 | Major | [.claude/skills/map/reference/label-machine.md:19](.claude/skills/map/reference/label-machine.md:19) | The added sentence claims `/split-map` and `/anchor`'s charter move are "never named a stamper **above**" — but the table directly above names both: `/split-map (migrate)` on the `UNCHARTED` row, `/split-map (successor)` on the `MAP` row, and `/anchor` on `UNCHARTED`/`ADRIFT`/`PLOTTING`/`SCOUTING`. The claim is literally false against the canonical table it sits under (CLAUDE.md designates this file canonical for "every label, meaning, and stamping skill"). The intent — that neither wrapper stamps a chunk's *birth* label — needs that scoping. Same wording is normative in the delta, so both need the fix. | Fix now | `.claude/skills/map/reference/label-machine.md:19` vs. its own table rows; mirrored in delta `specs/map-workflow/spec.md` |
| C2 | Minor | [.claude/skills/set-sail/SKILL.md:32](.claude/skills/set-sail/SKILL.md:32) | The rescoped discipline bullet retains its trailing absolute "Never invoke `/map` mid-voyage" one sentence after routing charting through `/anchor` — whose charter move is, by this change's own design, "a thin wrapper over `/map` § Exit". Either charter is barred mid-voyage or `/anchor` may not delegate to exit's mechanics. The `trunk-workflow` delta drops the mandate entirely, so the skill states a bar the spec does not, and it does not differentiate the outside-Destination case (where it stands) from charter (where it does not). | Fix now | `.claude/skills/set-sail/SKILL.md:32` vs. `.claude/skills/anchor/SKILL.md:41`; delta `specs/trunk-workflow/spec.md` carries no such prohibition |

#### Contract
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| T1 | Minor | [openspec/changes/charter-move/proposal.md](openspec/changes/charter-move/proposal.md) | The diff adds a new normative sentence to `label-machine.md`, but no task covers authoring it (6.2 is confirm-only: "Confirm no skill or spec names `/anchor` as a stamper") and `proposal.md` § Impact omits the file from its touched-surface list. The task set and the implementation disagree on what work this change performs. | Fix now | `tasks.md` §6.2; `proposal.md` § Impact lists anchor/map/set-sail SKILL.md + CLAUDE.md + two specs — not `label-machine.md` |
| T2 | Minor | [openspec/changes/charter-move/tasks.md](openspec/changes/charter-move/tasks.md) | Tasks 6.1–6.3 are marked `[x]` but the sweep did not catch S2, C1, or C2 — its grep list (`never charted`, `without invoking map`, `logged, not charted`) covers none of the three phrases that actually contradict. False-complete: the consistency sweep is the task that exists to prevent exactly the partial-edit contradiction `design.md` § Risks names as risk 3. | Fix now | `tasks.md` §6.1–6.3 vs. findings S2, C1, C2 |

### What looks good

- **The design reasoning is strong.** The "charter is exit re-entered, not a new requirement" call puts chunk-cutting mechanics in exactly one normative home and names the DRY drift hazard the alternative would create. The rejected alternatives are real alternatives, argued on their merits.
- **The terrain check earned its keep.** It falsified issue #250's prediction that `trunk-workflow` was untouched, and independently found the label-machine scenario the issue never listed.
- **The conjunctive criteria are correctly narrow.** In-Destination **and** release-blocking, with the nice-to-have branch routed to an owner choice, directly answers the "charter becomes the path of least resistance" risk instead of hand-waving it.
- **The `UNDER SAIL` carve-out was noticed in the spec** — the delta gets the voyage-continues semantics right (S2 is only that the skill prose didn't follow).
- **Delta hygiene:** `openspec validate charter-move --strict` passes; MODIFIED requirements carry full original blocks with scenarios retained.
- **Doc-only test exemption is properly claimed.** Tasks 7.4/7.5 cite the CLAUDE.md exemption, and the staged diff genuinely touches only `.claude/**`, `openspec/**`, and CLAUDE.md — no executable file. Verified, not taken on trust.

**Verdict:** findings remain

### Adjudication (2026-07-15)

Owner opted into explore mode; every disposition was verified against the source. Two corrections to the agents' output above:

- **S1 downgraded Major → Minor.** The agent's "does neither" is false. The `/anchor` bearing-moves delta explicitly asserts "…so the worked-issue-creation monopoly holds" — the change *respects* the clause via the transparent-wrapper theory. Charter is not illegal. The real residue is discoverability: a reader landing on the intake requirement sees no signpost. Fix is a pointer, not a substantive amendment.
- **E1 added (Major, standard).** `design.md` § Decisions justified the transparent-wrapper call with "`/split-map` already births `UNCHARTED` chunks … and is *not* named a stamper — the precedent is set." Both halves are false: `/split-map` **is** a named stamper (`UNCHARTED` migrate, `MAP` successor), and it births no chunks (spec:138 has it re-parent existing ones). `/split-map` never tested the monopoly or the birth-label question, so it cannot be precedent. Charter is the first wrapper to do either. The *conclusion* survives on the transparent-wrapper argument alone; the *stated rationale* does not.

No findings were dropped — all eight are real. The §6.1 sweep was independently re-run with a widened phrase set across `.claude/skills/`, `CLAUDE.md`, and `openspec/specs/`: **no contradictions beyond the three already found**, bounding T2's blast radius to the known misses.

### Response — fixes applied (2026-07-15)

Owner chose **Option A** (keep the wrapper transparent; repair its wording and rationale) over Option B (name `/anchor` on the `CHARTED` row, which `design.md` had explicitly rejected). All eight findings addressed; none deferred.

| Finding | Resolution |
|---|---|
| S1 | Intake requirement added as a fourth MODIFIED block in the `map-workflow` delta (full original text + all three scenarios preserved), its monopoly clause gaining a pointer naming charter as the sole exception. |
| S2 | [anchor/SKILL.md:78](.claude/skills/anchor/SKILL.md:78) blanket rule scoped to triage moves, with the charter carve-out mirrored from the spec. |
| S3 + C1 | Merged — one sentence, two homes. `/split-map` dropped from the carve-out entirely (it cuts no chunks and *is* a legitimate migrate-stamper); the carve-out is now scoped to a chunk's **birth label**, with an explicit line keeping the table's `/anchor` and `/split-map` entries true. Fixed in both [label-machine.md](.claude/skills/map/reference/label-machine.md) and the delta. |
| E1 | [design.md § Decisions](openspec/changes/charter-move/design.md:38) rewritten: the false precedent is deleted and named as non-existent; the conclusion is re-argued on its own ground — a birth label is a property of the cut, exit owns the cut, `/anchor` makes no labelling decision and could not make a different one. Heading corrected ("sole stamper" → "sole origin of a birth label") and the stale "No label-machine stamper delta" claim removed. |
| C2 | [set-sail/SKILL.md:32](.claude/skills/set-sail/SKILL.md:32) — "Never invoke `/map` mid-voyage" → "never by invoking `/map` directly", preserving the bar that still stands while permitting charter's delegation. |
| T1 | `label-machine.md` added to `proposal.md` § Impact; task 6.2 rewritten from confirm-only to an authoring task. |
| T2 | Task 6.1's grep list widened to the phrases that actually caught the contradictions (`never invoke /map`, `shall not survive`, `mid-voyage`) and extended to `openspec/specs/**`; sweep re-run clean. |

**Found while fixing** (not in the tables above): the same false `/split-map` precedent was duplicated in `proposal.md` § Why (:12), § What Changes (:19), and § Capabilities (:38). All three corrected — `:12` now scopes the precedent to the **wrapper shape only**, noting `/split-map` has never tested the monopoly or the stamper question.

**Gates re-run after fixes:** `openspec validate charter-move --strict` valid · `npx tsc --noEmit` clean · `npm run lint` 0 errors (1 pre-existing yellow size warning on an untouched file). Tests remain doc-only-exempt — the diff still touches no executable file. CI on the `dev` push is unverified and must be green before the seal.

No verdict is claimed here: this round records the response to round 1, not a grade of it. The fixing session does not grade its own fixes — `/recheck-review` reads this delta and issues round 2's verdict.

## Round 2 — recheck (2026-07-15)

**Delta:** `git diff` (unstaged) @ anchor `e25a653` · 7 files, +34/−14. No escalation tell: every file sits inside round 1's reviewed set, and the fix delta is ~11% of the baseline's 302 insertions.

### Prior findings

| # | Prior finding | Status | Notes |
|---|---------------|--------|-------|
| S1 | Intake monopoly clause unsignposted | resolved | The intake requirement is now a fourth MODIFIED block. Diffed against `openspec/specs/map-workflow/spec.md:6` — header matches exactly, the requirement body is the full original, all three scenarios retained verbatim; the only edit is the monopoly clause's charter pointer. `openspec validate charter-move --strict` re-run: valid. |
| S2 | `UNDER SAIL` blanket invariant falsified by charter | **superseded by N1** | The charter half is genuinely fixed — [anchor/SKILL.md:78](.claude/skills/anchor/SKILL.md:78) now scopes to triage and states the carve-out explicitly. But "triage move" is the wrong scope: patch at sea is a triage move and keeps `UNDER SAIL`. See N1. |
| S3 | Carve-out claimed `/split-map` cuts chunks | resolved | `/split-map` dropped from the carve-out in both homes. The delta's routing-labels requirement now reads "A skill that cuts **a chunk**… — `/anchor`'s charter move —", and adds the sentence keeping `/anchor` (demote/discard) and `/split-map` (migrate) named as `UNCHARTED` stampers in their own right. |
| C1 | `label-machine.md` sentence false against its own table | resolved | [label-machine.md:19](.claude/skills/map/reference/label-machine.md:19) rewritten to match the delta word-for-word in substance: scoped to a chunk's **birth label**, with the relabelling case explicitly excluded. Checked against the table's `UNCHARTED`/`MAP` rows above it — no row is falsified. |
| C2 | `set-sail` bars `/map` mid-voyage while `/anchor` delegates to it | resolved | [set-sail/SKILL.md:32](.claude/skills/set-sail/SKILL.md:32) now reads "…runs through /anchor, never by invoking `/map` directly", which bars the direct call and permits charter's delegation. Consistent with the `trunk-workflow` delta, which carries no prohibition. |
| T1 | `label-machine.md` edit uncovered by tasks and Impact | resolved | Added to `proposal.md` § Impact; task 6.2 rewritten from confirm-only to an authoring task naming the file. Task 1.4 added for S1's new delta block. Every file in the diff now maps to a task. |
| T2 | §6 sweep false-complete | resolved | Task 6.1's phrase list now includes `never invoke /map`, `shall not survive`, `mid-voyage`, and the scope extends to `openspec/specs/**` — the three phrases that actually caught S2/C1/C2. Independently re-grepped `shall not survive` and `mid-voyage` across skills, specs, and CLAUDE.md; the only live hit is N1 below. |
| E1 | `design.md` false `/split-map` precedent | resolved | [design.md:38](openspec/changes/charter-move/design.md:38) names the precedent as non-existent and re-argues the conclusion on its own ground (a birth label is a property of the cut; exit owns the cut). Heading corrected; the stale "No label-machine stamper delta" claim is gone. The same false precedent was also removed from `proposal.md` §§ Why / What Changes / Capabilities — verified, all three now scope `/split-map` to the wrapper shape only. |

### New findings

#### Standard
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| N1 | Minor | [.claude/skills/anchor/SKILL.md:78](.claude/skills/anchor/SKILL.md:78) | S2's fix narrowed "`UNDER SAIL` SHALL NOT survive an anchor" to "…a triage move", but patch at sea **is** a triage move — it sits under § Mid-voyage triage and its own text says "the issue stays `UNDER SAIL`". The universal is still false; the fix swapped charter for patch at sea as its counterexample. The invariant belongs to park and discard (the moves that unoccupy the tree), not to triage as a class. The same sentence in the delta's bearing-moves requirement (`specs/map-workflow/spec.md:45`) carries the identical defect — "`UNDER SAIL` SHALL NOT survive an anchor … except on a charter" — two clauses after specifying that patch at sea stays `UNDER SAIL`. Inherited from the current spec, but the delta re-authors that sentence as MODIFIED text, so it is in scope here. | Fix now | `.claude/skills/anchor/SKILL.md:78` vs. `:72` (patch at sea); delta `specs/map-workflow/spec.md:45` vs. `openspec/specs/map-workflow/spec.md:68` |

```
"UNDER SAIL SHALL NOT survive a triage move"
        │
        ├── park      → ADRIFT     ✓ true
        ├── discard   → UNCHARTED  ✓ true
        └── patch at sea → stays UNDER SAIL   ✗ falsifies the universal
```

Both homes fix the same way — tie the invariant to tree-occupancy rather than to a move class: *once the tree is unoccupied the beacon SHALL NOT stand* (park and discard unoccupy it; patch at sea and charter do not). That subsumes the charter carve-out instead of enumerating exceptions, and stops the next move from needing another one.

**Verdict:** findings remain

### Response — N1 fixed (2026-07-15)

Owner took the occupancy framing. Both homes now tie the beacon to tree state rather than enumerating move classes, so no exception clause is carried and the next move needs no new one:

| Home | Now reads |
|---|---|
| [anchor/SKILL.md:78](.claude/skills/anchor/SKILL.md:78) | "The beacon marks an occupied tree and SHALL NOT survive its unoccupying — park and discard clear the tree and relabel; patch at sea and charter leave the tree as it stands, and the beacon with it." |
| delta `specs/map-workflow/spec.md:45` | "`UNDER SAIL` SHALL mark an occupied tree and SHALL NOT survive its unoccupying: park and discard clear the tree and SHALL relabel accordingly, while patch at sea and charter leave the tree as it stands and the beacon with it. The board SHALL carry exactly one beacon per issue." |

The charter carve-out is now **subsumed rather than stated** — charter leaves the beacon standing because it does not unoccupy the tree, not because it is named an exception.

## Round 3 — recheck (2026-07-15)

**Delta:** `git diff` (unstaged) — 2 files, +2/−2 against round 2's fix delta. Same file set, minimal size; no escalation tell.

| # | Prior finding | Status | Notes |
|---|---------------|--------|-------|
| N1 | `UNDER SAIL` universal false for patch at sea | resolved | Both homes verified against all four moves: park (`:76-78`) and discard (`:84`) clear the tree and relabel — covered by the SHALL; patch at sea (`:72`) and charter (`:58`) leave the tree occupied-as-was and keep the beacon — outside the SHALL rather than excepted from it. No counterexample remains. The four delta scenarios (`Mirage patchable at sea`, `Voyage parked adrift`, `Fog too thick`, `Charter leaves the voyage under sail`) each match the new sentence. Swept `.claude/skills/**`, `CLAUDE.md`, and the change dir for `survive an anchor` / `survive a triage` / `except on a charter`: zero hits, so no artifact still cites the retired wording. `openspec validate charter-move --strict`: valid. |

No new findings.

**Verdict:** clear to land

## Round 4 — recheck (2026-07-15)

**Delta:** `git diff` (unstaged) — 2 artifact files, +2/−2. Round 2's fixes are now the staged baseline. No escalation tell.

**Round 3 is superseded.** Its table quoted an occupancy rewrite of [anchor/SKILL.md:78](.claude/skills/anchor/SKILL.md:78) and `specs/map-workflow/spec.md:45` that no longer exists in either file, and its `clear to land` verdict was issued against that text. Round 3's finding-status column is stale; this round re-issues the verdict against what the tree actually holds. Prior rounds are kept per the append-only contract, not because they still describe the change.

### Owner correction to N1's premise

The owner rejected the occupancy rewrite in both homes, and the objection lands. Two errors in rounds 2–3:

- **Over-correction in the skill.** Step 3 of Park is a procedure step. The rewrite made it explain patch at sea and charter — moves documented elsewhere in the same file — and then restated the relabel as "the beacon comes down", which is what `UNDER SAIL` → `ADRIFT` already says. The owner's wording is the one that landed: *"The tree is no longer occupied; `UNDER SAIL` SHALL NOT survive a park move."* Scoped to the move it sits under, no charter aside, no metaphor.
- **N1's real cause was structural, not lexical.** The owner's diagnosis: the bearing-moves requirement narrates every mechanic in prose, so the beacon rule is stated twice — once by enumerating patch-at-sea/park/discard, once by the `SHALL NOT survive an anchor` summary. A summary of a list it sits beside is what let it contradict one entry and still validate `--strict`. Wording it a fourth time was never going to fix that; the sentence had no content the scenarios lack.

### Prior findings

| # | Prior finding | Status | Notes |
|---|---------------|--------|-------|
| N1 | `UNDER SAIL` universal false for patch at sea | resolved — **by deletion, not rewording** | The summary sentence is gone from the delta's bearing-moves requirement. What remains is only the clause the scenarios do not carry: "`UNDER SAIL` SHALL mark an occupied tree, and the board SHALL carry exactly one beacon per issue." Per-move beacon behavior is now decidable **only** from the four scenarios — `Mirage patchable at sea` (stays `UNDER SAIL`), `Voyage parked adrift` (`ADRIFT`), `Fog too thick` (`UNCHARTED`), `Charter leaves the voyage under sail` (stays `UNDER SAIL`, tree untouched) — which cover all four moves with no prose competing with them. The contradiction cannot recur because the contradicting sentence no longer exists. |

### Verification

- `openspec validate charter-move --strict`: valid.
- Swept `.claude/**`, `CLAUDE.md`, `openspec/**` for `survive an anchor` / `survive a triage` / `survive its unoccupying` / `except on a charter`. Two hits, both correct: `openspec/specs/map-workflow/spec.md:68` (the requirement this delta replaces wholesale on archive) and `openspec/changes/archive/2026-07-14-add-map-skill/` (history, immutable).
- No task or proposal line promised the deleted sentence. Task 2.4 ("charter leaves `UNDER SAIL` standing") is still met by the requirement's `Charter SHALL NOT stop the voyage` clause and its scenario. The three live `carve-out` references all point at the label-machine birth-label sentence, which is untouched.
- Round 1's other seven findings were verified resolved in round 2 and are unaffected by this delta.

**Caveat on this verdict:** rounds 2–4 grade edits this session authored, and the round-2 finding that drove them was over-reached. The owner authored the landed skill line and the structural diagnosis behind the deletion. Round 1's eight findings are the only ones a fresh reviewer produced.

No new findings.

**Verdict:** clear to land
