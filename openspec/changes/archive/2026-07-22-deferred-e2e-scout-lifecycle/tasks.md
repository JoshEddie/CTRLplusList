## 1. Specs

- [x] 1.1 Verify `map-workflow` and `trunk-workflow` deltas validate with `openspec validate --strict` (MODIFIED headers match existing requirements exactly)

## 2. Port-inspection and close-map

- [x] 2.1 `.claude/skills/port-inspection/SKILL.md`: lazy e2e scout — all implementation chunks closed + no scout on map → create per `issue-cut.md` (ordinary fire-at-creation `SCOUTING`); subagent reads sub-issue summary comments + landed code, derives changes from `issue-<N>:` commits/archived change when a comment is missing, posts report, auto-closes ***unreviewed***; coverage recommendation → owner-approved e2e chunk via `issue-cut.md`
- [x] 2.2 `.claude/skills/close-map/SKILL.md`: add the e2e-scout gate — scout absent or unresolved blocks close, points at `/port-inspection`; closing never creates/fires/cuts
- [x] 2.3 `.claude/skills/map/reference/issue-cut.md`: retire the deferred-`SCOUTING` birth variant — lazy creation was its only would-be consumer, so it leaves no live caller; proposal/design "untouched" claims amended to match

## 3. Landfall

- [x] 3.1 `.claude/skills/landfall/SKILL.md`: bookkeeping = flip `IN PORT` + post one summary comment on the landed issue (UI summary or "no user-visible changes" one-liner), same archive swoop, no scout lookup

## 4. Reference docs + CLAUDE.md

- [x] 4.1 `.claude/skills/map/reference/label-machine.md`: note the e2e scout in the SCOUTING row (created + fired lazily by `/port-inspection`)
- [x] 4.2 `CLAUDE.md` § Trunk workflow: one-line updates if the digest names landfall bookkeeping or close-map gating
- [x] 4.3 Record mid-map e2e policy where voyages read it (`.claude/skills/set-sail/SKILL.md` disciplines or map SKILL.md): minimal keep-green edits, delete coverage only with its behavior, closing chunk consolidates

- [x] 4.4 Adjudication gate-line mechanics (promotion + demotion) in `.claude/skills/adjudicate-review/SKILL.md` and `.claude/skills/spec-review/reference/finding-format.md`, carried by an `adjudicate-review` delta spec
- [x] 4.5 Doc-only exemption form — exempt gate **omitted**, not checked-with-rationale: `finding-format.md`, `openspec/config.yaml` `rules.tasks`, `CLAUDE.md` § Five gates, `.claude/skills/landfall/SKILL.md` Tasks-complete gate, plus `spec-review` and `testing-foundation` delta specs

## 5. Gates

- [x] 5.1 `openspec validate --strict` passes
- [x] 5.2 `npm run lint` and `npx tsc --noEmit` pass (non-executable change: test gates skipped — markdown/skills/specs only, no executable code touched)

## 6. Gates — round 1

> Findings by durable ID (severity, `path:line`, citation, reconcile side) are in
> `review.md` Round 1 (as amended by its Adjudications). Resolve each open `Fix now`
> there before checking it off.

- [x] 6.1 B1 relax `map-workflow` spec's `SCOUTING ... auto-resolve` parenthetical so it stops reading exhaustive + drop the stale "deferred" in the trunk-workflow delta parenthetical — resolved
- [x] 6.2 `openspec validate --strict` passes
- [x] 6.3 `npm run lint` — zero errors, zero non-size warnings
- [x] 6.4 `npx tsc --noEmit` — zero errors

> test:coverage + test:e2e skipped under the change's doc-only exemption (markdown/specs only, no executable file touched) — skipped gates carry no checklist item.

## 7. Gates — round 2

> Round 2 (recheck) verdict: **outgrew recheck** — the fix delta touched both
> implementation skills and spec artifacts; run `/incremental-spec-review` for the
> next round, whose status table supersedes this section. B1 verified resolved in
> round 2, so no finding items. test:coverage + test:e2e skipped under the
> change's doc-only exemption (markdown/skills/specs only) — skipped gates carry
> no checklist item.

- [x] 7.1 `npm run lint` — zero errors, zero non-size warnings
- [x] 7.2 `npx tsc --noEmit` — zero errors
- [x] 7.3 `npm run build` — completes successfully

## 8. Gates — round 3

> Findings by durable ID (severity, `path:line`, citation, reconcile side) are in
> `review.md` Round 3. Resolve each open `Fix now` there before checking it off.
> Round 3's prior-findings table supersedes §7 (B1 verified resolved); its 7.x
> verification items are restated below. test:coverage + test:e2e omitted under the
> change's doc-only exemption (markdown/skills/specs only) — A3+B4 is adjudicated in
> favour of the omission form, so this section's shape stands. Reconcile sides for
> every open item are settled in Round 3's Adjudications; read those, not just the
> findings table.

- [x] 8.1 A1 deferred-`SCOUTING`-variant retirement vs proposal/design "untouched" claims — reconcile, one side or the other — resolved
- [x] 8.2 A2+B3 adjudicate-review gate-promotion mechanic added without a delta spec or task — reconcile — resolved
- [x] 8.3 A3+B4 gate-omission rule contradicts `config.yaml` `rules.tasks`, CLAUDE.md § Five gates, and `spec-review/spec.md:322` — reconcile — resolved
- [x] 8.4 C5 `finding-format.md:215` cross-reference points at **Exits** instead of **Adjudication entry** — resolved
- [x] 8.5 C6 §6 omits `npm run build` — _no work to do: re-dispositioned `Fix now` → `Drop` in `review.md` Round 3 Adjudications; discharged by that adjudication, not by a fix_
- [x] 8.6 `openspec validate --strict` passes — 54/54 with `--all`
- [x] 8.7 `npm run lint` — zero errors, one pre-existing size warning (`app/api/image-search/route.ts`, 310 lines)
- [x] 8.8 `npx tsc --noEmit` — zero errors
- [x] 8.9 `npm run build` — completes successfully

## 9. Gates — round 4

> Round 4 (recheck) verdict: **outgrew recheck** — the fix delta touched both
> implementation skills and spec artifacts (and added three never-reviewed delta
> specs); run `/incremental-spec-review` for the next round, whose status table
> supersedes this section. A1, A2+B3, A3+B4 and C5 verified resolved in round 4.
> Finding by durable ID is in `review.md` Round 4. test:coverage + test:e2e
> omitted under the change's doc-only exemption (markdown/skills/specs only).

- [x] 9.1 A5 §5 pre-merge section contradicts the amended five-gate requirement — _superseded by 10.1; A5 re-dispositioned `Fix now` → `Drop` in `review.md` Round 5 Adjudications_
- [x] 9.2 `openspec validate --strict` passes — _superseded by 10.3_
- [x] 9.3 `npm run lint` — zero errors, zero non-size warnings — _superseded by 10.4_
- [x] 9.4 `npx tsc --noEmit` — zero errors — _superseded by 10.5_
- [x] 9.5 `npm run build` — completes successfully — _superseded by 10.6_

## 10. Gates — round 5

> Findings by durable ID (severity, `path:line`, citation, reconcile side) are in
> `review.md` Round 5. Resolve each open `Fix now` there before checking it off.
> Round 5's prior-findings table supersedes §9's status framing — A5 is still open
> and is restated below as 10.1, so §9's 9.x items are superseded by this section.
> test:coverage + test:e2e omitted under the change's doc-only exemption
> (markdown/skills/specs only, no executable file touched).

- [x] 10.1 A5 §5 pre-merge section contradicts the amended five-gate requirement — _no work to do: re-dispositioned `Fix now` → `Drop` in `review.md` Round 5 Adjudications; discharged by that adjudication, not by a fix_
- [x] 10.2 A1+B2 `landfall/SKILL.md:37` still credits "doc-only skip markers" the change retires — resolved: parenthetical dropped, gate now reads plainly; `landfall/SKILL.md` added to task 4.5's file list
- [x] 10.3 `openspec validate --strict` passes
- [x] 10.4 `npm run lint` — zero errors, one pre-existing size warning (`app/api/image-search/route.ts`, 310 lines)
- [x] 10.5 `npx tsc --noEmit` — zero errors
- [x] 10.6 `npm run build` — completes successfully
