## 1. Schema and config

- [x] 1.1 Reorder `artifacts:` in `openspec/schemas/spec-driven-review/schema.yaml` to `proposal, specs, design, acceptance, tasks, review`, moving the whole `acceptance` block without editing its `requires: [specs]`
- [x] 1.2 Confirm upstream's `proposal, specs, design, tasks` relative order is preserved in the reordered list, so the fork stays reconcile-clean on `openspec update`
- [x] 1.3 Extend the `acceptance` artifact's schema `instruction` with the three design.md cases — design may supply wording, design as the only backing is a gap, design contradicting a spec is a contradiction — _superseded by § 12: only case 1 stays, and § 12.7 recuts it as design naming an observable rather than supplying wording_
- [x] 1.4 Extend the same `instruction` with the gap-vs-contradiction distinction and the rule that repair routes through `/opsx:update`, never a direct edit — _superseded by § 12: both moved to `embark-qualify/SKILL.md`_
- [x] 1.5 Move the grilling gate in `openspec/config.yaml` from `rules.proposal` to `rules.specs`, reworded: the interview must have concluded against the reviewed proposal before specs are drafted
- [x] 1.6 Verify `apply.requires` still lists `[tasks, review, acceptance]` after the reorder

## 2. `embark-start` — moved from `/embark`

- [x] 2.1 `git mv .claude/skills/embark .claude/skills/embark-start`, updating `name:` and `argument-hint:` in frontmatter
- [x] 2.2 Write the `description:` line: board a CHARTED issue and open the change — gate, terrain check, scaffold, proposal
- [x] 2.3 Keep the gate, blocker query and terrain check sections unchanged; carry the boarding check and never-commits sections across with one edit each — the boarding check reports the routing labels found and names the label machine as the report's owner rather than a handoff (allowlist, not routing table), and never-commits drops label operations from its `gh` side-effects line
- [x] 2.4 Replace the Propose section with `openspec new change` plus one `/opsx:continue` to `proposal` only
- [x] 2.5 Move the epic route-out trigger from the grilling to the terrain check, keeping the in-conversation hand-off to `/map`'s chart phase and the no-change-directory outcome
- [x] 2.6 Strip the restated interview mechanics; name the grilling skill instead
- [x] 2.7 Add the re-invocation branch: `proposal.md` present → report nothing remains, name `/embark-design`
- [x] 2.8 End with the stop line naming `/embark-design`

## 3. `embark-design` — new

- [x] 3.1 Create `.claude/skills/embark-design/SKILL.md` with `disable-model-invocation: true`
- [x] 3.2 Write the `description:` line: sharpen the proposal and write the contract — grilling interview, specs, design
- [x] 3.3 Write the Entry section: `proposal.md` required, then read the issue the proposal records, that issue's linked map body, and the `dependencies/blocking` set the issue blocks, bounding the map read at the map's own body
- [x] 3.4 Write the `/mattpocock-skills:grilling` invocation against the reviewed proposal rather than restating its mechanics
- [x] 3.5 Add the pause after the interview — owner check, then `/opsx:update` wherever the grilling moved a decision the proposal states
- [x] 3.6 Write the contract run as `/opsx:continue` until `design.md` exists, in the same turn as the interview, and not into acceptance or tasks
- [x] 3.7 Add the epic route-out from the grilling, carrying answers and the drafted proposal into `/map`'s re-validation sweep as candidates
- [x] 3.8 End with the stop line naming `/embark-qualify` and stating it must run in a fresh chat

## 4. `embark-qualify` — new

- [x] 4.1 Create `.claude/skills/embark-qualify/SKILL.md` with `disable-model-invocation: true`
- [x] 4.2 Write the `description:` line covering what qualification means and that a gap or contradiction disqualifies the change until `/opsx:update` clears it
- [x] 4.3 Make the fresh-chat requirement the skill's first line
- [x] 4.4 Write the run: guard on `design.md` present and `acceptance.md` absent, then one `/opsx:continue`, reporting qualified-or-disqualified to the owner
- [x] 4.5 Leave the failure-type rules to the schema's `acceptance` instruction (tasks 1.3, 1.4) — `openspec instructions` hands it to the generating agent on every run, so the skill carries no copy of it — _superseded by § 12: the failure types are the skill's; the instruction stops at surfacing_
- [x] 4.6 End with the stop line naming `/embark-write-tasks`

## 5. `embark-write-tasks` — new

- [x] 5.1 Create `.claude/skills/embark-write-tasks/SKILL.md` with `disable-model-invocation: true`
- [x] 5.2 Write the `description:` line: break the change into implementation work — tasks, review scaffold
- [x] 5.3 Write the run as `/opsx:continue` until `review.md` exists, reading specs and design from disk with no interview
- [x] 5.4 End with the stop line naming `/embark-apply`

## 6. `embark-apply` — moved from `/set-sail`

- [x] 6.1 `git mv .claude/skills/set-sail .claude/skills/embark-apply`, updating `name:` and `argument-hint:` in frontmatter
- [x] 6.2 Write the `description:` line: occupy the tree and implement — stamps UNDER SAIL
- [x] 6.3 Keep the UNDER SAIL gate, both lanes, the stamp rules and the three mid-voyage disciplines unchanged
- [x] 6.4 Add `openspec validate --strict <change>` as a hard gate before the beacon is stamped, on the charted lane only
- [x] 6.5 State explicitly that the validate gate does not apply to the MUSTER lane — no change directory exists to validate
- [x] 6.6 Add the closing output line suggesting `/opsx:verify` in a fresh chat after the task loop, as a line and not a numbered step

## 7. Rename sweep

- [x] 7.1 `.claude/skills/anchor/SKILL.md` — `/embark` → `/embark-start` in the description and the any-session-may-anchor line
- [x] 7.2 `.claude/skills/map/SKILL.md` — the execution-layer arc line, the aborted-grilling seed step, the chunking step, the SCOUTING unreviewed-marker line, and the frontmatter description
- [x] 7.3 `.claude/skills/map/reference/issue-cut.md` — the pre-distilled-body line and the MUSTER exception's lane reference
- [x] 7.4 `.claude/skills/map/reference/label-machine.md` — the both-layers lead-in, the `CHARTED` row, the `MUSTER` row, the `UNDER SAIL` row, and the sequencing paragraph
- [x] 7.5 `CLAUDE.md` § Trunk workflow — the fleet route line, replacing `/embark` → `/set-sail` with the five members
- [x] 7.6 `grep -rn 'embark\|set-sail' .claude/skills CLAUDE.md openspec/specs` and confirm every remaining hit is either an `embark-*` member or an intentional historical reference
- [x] 7.7 Leave `.claude/bench/` archives and prior handoffs untouched — they are history

## 8. Post-archive rename groundwork

- [x] 8.1 `gh issue list --label MUSTER --state open` and grep each open ticket body for the four scenario headings that land stale — `Propose grilling routes out an epic`, `Embark gates on both signals`, `Propose drafts acceptance flows from scenarios`, `Propose emits a review.md scaffold`
- [x] 8.2 Record the result in `review.md` or the landing hand-off: any MUSTER plan citing one of those headings must be edited in the same window as the rename, or its staleness check will stop the voyage

## 9. Pre-merge

Every file in this change's diff is markdown, a `.claude/**` skill, or an `openspec/**` artifact. **All five standard gates are omitted, not run**, and carry no checklist item below:

- `test:coverage` and `test:e2e` — omitted under CLAUDE.md's doc-only exemption.
- `lint`, `tsc --noEmit` and `build` — omitted by owner decision for this change, because none of them reads a file in this diff: `eslint .` has no markdown processor and its file-size rules are scoped to `app/**`, `lib/**`, `hooks/**`, `db/**`; there is no TypeScript to typecheck; `next build` compiles no changed module. This is a deliberate departure from the exemption as currently written, which covers only the two test gates.

CI on the `dev` push still runs the full battery, so defense in depth is preserved. Any executable edit added to this change voids both omissions and all five gates return as tasks.

- [x] 9.1 `openspec validate --strict embark-namespace` passes
- [x] 9.2 `openspec list` and `openspec status --change embark-namespace` both resolve cleanly against the reordered schema

**Landing-time action, not a task above.** After `/landfall` archives the change and before the seal commit is staged — the same window `/finalize-spec-purposes` uses, so the repair rides inside the seal — rename the four stale scenario headings by hand in `openspec/specs/trunk-workflow/spec.md`, `openspec/specs/map-workflow/spec.md`, `openspec/specs/acceptance-artifact/spec.md` and `openspec/specs/review-artifact/spec.md`. A MODIFIED delta cannot rename a scenario, so this cannot be done inside the change. Task 8.1's grep result gates it.

## 10. Gates — round 1

> Findings by durable ID (severity, `path:line`, citation, reconcile side) are in
> `review.md` Round 1. Resolve each open `Fix now` there before checking it off.

- [x] 10.1 A1+B6 `CLAUDE.md` fleet route line is not staged while task 7.5 is checked off — resolved — _dropped at adjudication (line is staged; see Round 1 § Adjudications), no work to do_
- [x] 10.2 A2+C8 `config.yaml` grill gate is a run-on of two fused sentences — resolved
- [x] 10.3 A3 task 2.3 claims embark-start sections unchanged; both were edited — resolved
- [x] 10.4 A4 no task covers embark-design's issue/map/blocking read — resolved
- [x] 10.5 A5 three-gate omission departs from the documented doc-only exemption — resolved — _dropped at adjudication (departure accepted as declared; see Round 1 § Adjudications), no work to do_
- [x] 10.6 B7 gap-vs-contradiction rules duplicated in embark-qualify and the schema — resolved
- [x] 10.7 C9 embark-design restates the specs-already-written rule in weaker wording — resolved

## 11. Qualification is a layer, not the artifact

> `/embark-qualify` is the route a map charts through, not the exclusive path to
> `acceptance.md`. The artifact's contract binds every generator; the verdict and
> the gate belong to the member. See design.md § Qualification is a layer over
> the artifact, not the artifact.

- [x] 11.1 In the `acceptance` schema instruction, replace the "qualification run, not a summary … disqualifies the change until repaired" paragraph with the sourcing rule — every row is sourced, a step the corpus cannot back is surfaced as a finding, never written around on the flow's own authority
- [x] 11.2 In the same instruction, reword design.md case 3 from "a contradiction, disqualifying the change" to "a contradiction, surfaced as a finding"
- [x] 11.3 Confirm `.claude/skills/embark-qualify/SKILL.md` states the verdict, the gate and the fresh-chat requirement, and still carries no copy of the failure-type rules (B7's one-home split)

## 12. The DRY seam runs through the block, not around it

> B7's one-home rule holds per *rule*, not per block. Sourcing rules govern what
> the file may contain and stay in the schema; classification, repair and verdict
> govern what an operator does with a finding and move to the member. See
> design.md § B7's one home was right; its unit was wrong.

- [x] 12.1 Cut the two failure types, design.md cases 2 and 3, and the repair-through-`/opsx:update` rule from the `acceptance` schema instruction, leaving the sourcing rule and the design.md rule. The instruction states no negative scope: it never says whose job classification is, because a generating agent was not asked for a verdict and silence already withholds one. Where the rules live is settled normatively in the specs, not in prose the agent reads on every run
- [x] 12.2 Strip the remaining taxonomy leak from the instruction's format block — "none findable = a spec gap to surface" → "none findable = surface it"
- [x] 12.3 Move the failure types, the design-only-backing rule and the repair route into `.claude/skills/embark-qualify/SKILL.md`, so the skill's "findings" has a referent it owns
- [x] 12.4 Re-cut `specs/acceptance-artifact/spec.md` to the artifact contract alone — no failure types, no repair route, no verdict — keeping both live scenario names so the MODIFIED delta stays archivable
- [x] 12.5 Carry the design-only-backing rule and the classification-is-the-member's rule into `specs/trunk-workflow/spec.md`'s `/embark-qualify` requirement, which already holds the failure types and the repair route
- [x] 12.6 Record the B7 amendment in `review.md` so a later round does not reinstate the whole block in the schema
- [x] 12.7 Replace "design supplies wording" with "design never sources behavior; it may name the observable a spec leaves unnamed" everywhere it landed — schema instruction, `embark-qualify/SKILL.md`, both delta specs, design.md's three-case ledger and table, proposal.md. Acceptance rows are Gherkin atoms asserting observables and design.md is prose, so there is no wording for a row to borrow; the real allowance is the concrete surface, which the format block already demands
- [x] 12.8 Report the verdict before repairing, and pause on one question — repair or continue. A repair adds a scenario to the binding contract, more durable than the proposal decision `/embark-design` already pauses for, and reporting "disqualified until repaired" after repairing states a verdict that no longer holds. On continue, whether a ruled step chains into its flow or stays out of it is the owner's call

## 13. Gates — round 2

> Findings by durable ID (severity, `path:line`, citation, reconcile side) are in
> `review.md` Round 2. Resolve each open `Fix now` there before checking it off.
> Verdict is `outgrew recheck` — this section is superseded by the follow-up
> `/incremental-spec-review` round's status table.
>
> All five verification gates omitted here under § 9's declared exemptions —
> `test:coverage` and `test:e2e` by CLAUDE.md's doc-only exemption, `lint`,
> `tsc --noEmit` and `build` by the owner decision § 9 states. The diff stays
> doc-only; any executable edit voids both omissions and returns all five.

- [ ] 13.1 B7 design.md case 1 is still stated in full in both the schema instruction and `embark-qualify/SKILL.md` — resolved
