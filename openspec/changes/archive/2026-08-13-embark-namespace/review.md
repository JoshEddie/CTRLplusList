---
review: spec-review
target: embark-namespace
anchor: f026e60e0d6a838a3ecd2fc23d3847bf7872f08a
diff-source: git diff --staged
round: 2
---

<!-- MUSTER staleness groundwork (task 8.1, run 2026-08-13):
     `gh issue list --label MUSTER --state open` returned zero issues, so no
     open MUSTER plan cites any of the four scenario headings that land stale
     (`Propose grilling routes out an epic`, `Embark gates on both signals`,
     `Propose drafts acceptance flows from scenarios`, `Propose emits a
     review.md scaffold`). The post-archive rename is unblocked. Re-run the
     query at landing if any MUSTER issue has been opened since. -->

## Round 1 — spec-review (2026-08-13)

Clean, well-structured namespace split; the fleet rename is internally coherent and the delta specs match what shipped. Headline problem is landing scope, not content: `CLAUDE.md`'s fleet route line — task 7.5, checked off — is only an unstaged working-tree edit, so the committed tree would route through two skills this change deletes.

**Scope:** `git diff --staged` @ f026e60 · embark-namespace (active)

### Alignment
| # | Severity | Location | Finding | Disposition | Citation |
|---|---|---|---|---|---|
| A1+B6 | Major | `CLAUDE.md:31` (unstaged) ↔ tasks.md 7.5 | 7.5 is `[x]` and the edit exists in the working tree, but `CLAUDE.md` is not staged — the landed tree keeps a fleet line routing `/embark` → `/set-sail`, both deleted by this diff. Staging the file as-is also pulls in an unrelated basics.md bullet. | Fix now — stage `CLAUDE.md` (fleet line only) OR unmark 7.5 and drop it from Impact | proposal.md Impact; `.claude/skills/embark-apply/SKILL.md` ↔ deleted `.claude/skills/embark/SKILL.md` |
| A2+C8 | Minor | `openspec/config.yaml:97` | New `rules.specs` grill gate is a run-on: "Before drafting, run `/mattpocock-skills:grilling` Interview must have concluded against the reviewed proposal." Two sentences fused; ambiguous between "run it now" and "it must already have concluded". Task 1.5 specifies the latter. | Fix now — repair to the single intended sentence OR reword 1.5 | tasks.md 1.5; design.md § `config.yaml`; `.claude/basics.md` (one idea per line) |
| A3 | Minor | `.claude/skills/embark-start/SKILL.md:32,58` ↔ tasks.md 2.3 | 2.3 claims the boarding check and never-commits sections are unchanged; both were edited (boarding check gained the owner-not-handoff clause; never-commits dropped "and label operations"). Edits are correct under the delta — only the task's claim is wrong. | Fix now — reword 2.3 to name the edits OR revert them | tasks.md 2.3 (task-completion truth) |
| A4 | Minor | `.claude/skills/embark-design/SKILL.md:117-126` ↔ tasks.md § 3 | Skill reads the issue, its map, and the `dependencies/blocking` set — required by the delta spec, covered by no task in § 3. | Fix now — add the task OR note tasks.md as non-exhaustive | `specs/trunk-workflow/spec.md` → `/embark-design` requirement, issue-and-map bullet |
| A5 | Minor | tasks.md § 9 lead-in | § 9 omits all five gates; three (`lint`, `tsc`, `build`) by owner decision the lead-in itself calls "a deliberate departure from the exemption as currently written". Departure is declared in the change but backed by no normative doc. | Fix now — run the three cheap gates and restore their items OR widen the documented exemption (CLAUDE.md / testing-foundation) | CLAUDE.md hard rules — exemption covers only the two test gates |

### Boundary
| # | Severity | Location | Finding | Disposition | Citation |
|---|---|---|---|---|---|
| B7 | Minor | `.claude/skills/embark-qualify/SKILL.md:24-38` ↔ `openspec/schemas/spec-driven-review/schema.yaml:186-208` | Gap-vs-contradiction distinction, the three `design.md` cases, and the repair-through-`/opsx:update` rule are stated in full in both homes — identical by design, structured (numbered three-case enumeration), so it drifts silently. | Fix now — one home, the other references it | CLAUDE.md DRY (identical-by-design → one home on sight); design.md:59 applies the same principle to grilling mechanics |

### Convention
| # | Severity | Location | Finding | Disposition | Citation |
|---|---|---|---|---|---|
| C9 | Minor | `.claude/skills/embark-design/SKILL.md:36` | Grilling line says "run … against proposal.md and specs/ if they are present" while step 1 already carries the real rule ("skip if `specs/` is already written") — second, weaker copy of the same fact. | Fix now (re-dispositioned from `File issue`: no charter citation, and it's in-delta wording) | `.claude/basics.md` "Say it once" |

### Testing
_none_

### What looks good
- Five-member split is cleanly cut: each member has one entry condition, one exit artifact, no overlapping ownership.
- Delta specs, `acceptance.md` flows, and the schema fork edits agree with the implementation.
- `openspec validate --strict embark-namespace` passes (verified in-review, exit 0).
- MUSTER staleness sweep done up front (8.1/8.2) with the post-archive rename correctly parked as a landing-time action — a MODIFIED delta can't rename a scenario.
- Testing arena clean: doc-only diff, no test debt introduced.

**Verdict:** findings remain — A1+B6 (CLAUDE.md not staged), A2+C8, A3, A4, A5, B7, C9. CI unverified (no PR invocation); must be green before archiving.

### Adjudications (2026-08-13)

| # | Old → New | Rationale |
|---|---|---|
| A1+B6 | Fix now → Drop | Re-grounded at adjudication: `git diff --staged CLAUDE.md` now carries exactly the fleet-route rewrite (`/embark` → the five `embark-*` members), and the only unstaged hunk is the unrelated `.claude/basics.md` bullet. Task 7.5 is truthful and the landed tree routes through no deleted skill. |
| A5 | Fix now → Drop | Owner accepts § 9's declared three-gate departure as-is. CI on the `dev` push runs the full battery, so the omission costs no coverage. |
| B7 | Fix now (remedy amended) | The one-home rule holds; the finding's **unit** did not. B7 read the duplicated block as one thing with one correct home, offering only schema-or-skill. The settled remedy runs the DRY seam *through* the block, because `/embark-qualify` is the route a map charts through, not the exclusive path to `acceptance.md`: **sourcing** rules govern what the file may contain and stay in the schema `acceptance` instruction, which every generator reads; **classification, repair and verdict** govern what an operator does with a surfaced finding and live in `embark-qualify/SKILL.md`, normatively under `trunk-workflow`. One home per rule, not per block — nothing is stated twice, and neither home carries a rule it cannot act on. Case 1 was recut in the same pass: design never sources behavior, it may name the observable a spec leaves unnamed. A later round finding these rules split across both files should read this before reinstating them. See design.md § "B7's one home was right; its unit was wrong", tasks §§ 11–12. |
| C9 | Fix now (scope amended) | Line 36's vague "if they are present" is the smaller half. `/opsx:continue` takes a **change name**, never an artifact — it creates the FIRST `ready` artifact and exactly one per invocation ([`.claude/commands/opsx/continue.md:57,106`](../../../.claude/commands/opsx/continue.md)). The `→ <artifact>` notation reads as a parameter the command does not have, and a fixed call count is the wrong control shape. **Overrun is the danger, not just the wording:** the fork's artifact order is `proposal, specs, design, acceptance, tasks, review`, so on the re-entry path `embark-design`'s numbered "1. specs / 2. design" produces **design then acceptance** — `acceptance.md` written by the very conversation that held the grilling, which is the false-pass `/embark-qualify` exists to prevent (its fresh-chat rule, `embark-qualify/SKILL.md:13`). Remedy is the control shape, not a count, chosen per member: a **terminal condition** where the call count varies with what is on disk (`embark-design` until `design.md`, `embark-write-tasks` until `review.md`), a **precondition guard** where the member always makes exactly one artifact (`embark-qualify` — `design.md` present and `acceptance.md` absent, then one invocation). `embark-start/SKILL.md:58` already carried the guard form. |

**Fix mechanics (owner, adjudication):** every fix touching `openspec/changes/embark-namespace/**` routes through `/opsx:update`, never a direct edit — applies to A3 (task 2.3) and A4 (new § 3 task).

**Verdict:** findings remain — A2+C8, A3, A4, B7, C9. CI unverified (no PR invocation); must be green before archiving.

## Round 2 — recheck (2026-08-13)

Four of the five open `Fix now` findings are resolved. The recheck does not close, though: the B7 amendment moved the contract itself, so the fix delta rewrote both the implementation (`.claude/skills/embark-qualify`, `embark-write-tasks`, `openspec/config.yaml`, `openspec/schemas/spec-driven-review/schema.yaml`) and both delta specs (`specs/acceptance-artifact`, `specs/trunk-workflow`) in the same pass. That is the escalation tell — recheck is single-sided by construction.

**Scope:** the fix delta on top of round 1's reviewed baseline @ f026e60 · embark-namespace (active)

### Prior findings

| # | Prior finding | Status | Notes |
|---|---------------|--------|-------|
| A2+C8 | `config.yaml` grill gate is a run-on of two fused sentences | resolved | `openspec/config.yaml:97` now reads as one sentence — "The `/mattpocock-skills:grilling` interview must have concluded against the reviewed proposal before specs are drafted." Matches task 1.5's wording; the "run it now" reading is gone. |
| A3 | task 2.3 claims embark-start sections unchanged; both were edited | resolved | 2.3 now names both edits (boarding check → routing labels reported, label machine as owner not handoff; never-commits → label operations dropped). Matches the actual `embark-start/SKILL.md` diff. |
| A4 | no task covers embark-design's issue/map/blocking read | resolved | New task 3.3 covers the issue, the linked map body (bounded at the map's own body) and the `dependencies/blocking` set; § 3 renumbered. Matches `embark-design/SKILL.md` § Entry. |
| B7 | gap-vs-contradiction rules duplicated in embark-qualify and the schema | **still open** (narrowed) | The amended split landed for the failure types, design cases 2–3 and the repair route — schema instruction stripped, skill owns them. **Case 1 did not split.** It is stated in full, near-verbatim ("the handle, not the behavior"), in both homes: `schema.yaml:190-195` and `embark-qualify/SKILL.md:38-39` — and mirrored again across both delta specs. design.md's own seam table assigns it to the schema column ("design.md may name an observable, never source a behavior"), so the skill's copy is the duplicate the split was meant to remove. |
| C9 | embark-design restates the specs-already-written rule in weaker wording | resolved | Control shape fixed per member as adjudicated: terminal condition in `embark-design` ("until `design.md` exists") and `embark-write-tasks` ("until `review.md` exists"); precondition guard in `embark-qualify` (`design.md` present, `acceptance.md` absent, then one `/opsx:continue`). The `→ <artifact>` notation is gone everywhere. Line 36's vague half is repaired to "against `specs/` when an earlier run already wrote it", and the old step-1 re-entry branch it duplicated no longer exists, so it is now the single home. |

### New findings

_none_

### What looks good
- The B7 amendment is recorded where a later round will find it — design.md § "B7's one home was right; its unit was wrong" plus its seam table, and tasks §§ 11–12 — so the split will not be silently reverted to whole-block-in-schema.
- Superseded tasks 1.3, 1.4 and 4.5 are annotated in place rather than rewritten, keeping the record of what the original plan said.
- `openspec validate --strict embark-namespace` passes (re-verified this round, exit 0).
- Round 1's gate section (§ 10) is checked off with the two adjudication-dropped items annotated as no-work, per the demotion rule.

**Verdict:** outgrew recheck — the fix delta touched both code and spec artifacts. Run `/incremental-spec-review` for round 3; it re-verifies B7 (still open) alongside fresh arena findings against the moved contract. A2+C8, A3, A4 and C9 are resolved and need no further work.
