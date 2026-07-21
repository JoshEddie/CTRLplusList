## 1. Shared format reference

- [x] 1.1 Update `.claude/skills/spec-review/reference/finding-format.md`: finding IDs to capital `A/B/C` + one continuous global integer per round (`A1, B2, C3`, merges `A1+C3`); `phase` enum to `alignment | boundary | convention`; round-heading vocab gains `incremental-spec-review`; escalation vocab notes `outgrew recheck` targets `/incremental-spec-review`; hardened disposition text (Fix now scope-never-effort + soon-dead-code; File issue charter citation, adjudication picks issue type and creates it); new gate-section contract (`## Gates — round <n>` shape, append rules, adjudication deletion rule)

## 2. spec-review restructure

- [x] 2.1 Rewrite the three briefs to the arena split — `alignment-brief.md` (from contract-audit-brief), `boundary-brief.md` + `convention-brief.md` (standard's cargo split corpus-relative vs single-sight; convention keeps house-law doc-pointer following, test substance, coverage-gaming; every C finding cites doc rule or named universal principle); delete the old brief files
- [x] 2.2 Update `spec-review/SKILL.md`: arena lanes and phase keys, report order alignment → boundary → convention, ID scheme, hardened dispositions, gate-section append on adverse persisted verdict, repeat-full-review wording (explicit owner choice, not escalation target)
- [x] 2.3 Update `spec-review/evaluations.md` vocabulary (arena letters, lane names) without changing scenario substance

## 3. New skill

- [x] 3.1 Create `.claude/skills/incremental-spec-review/SKILL.md`: routing boundary (both sides changed; recheck pointer for single-sided), header-driven scopes (A+C `git diff`, B `git diff <anchor>`), fan-out via spec-review's shared briefs with spec-review's JSON/retry/abort mechanics, round `## Round <n> — incremental-spec-review` with prior-findings status table (as-amended reading) + fresh arena tables + one verdict, gate-section append on adverse verdict, never requires staging

## 4. recheck-review and adjudicate-review

- [x] 4.1 Update `recheck-review/SKILL.md`: routing boundary (code OR specs never both), retire size/files-outside-diff tells, sole escalation tell = delta touches both sides → `outgrew recheck` → `/incremental-spec-review`, gate-section append on adverse change-review rounds
- [x] 4.2 Update `adjudicate-review/SKILL.md`: clearing verdict deletes the pending gate section (scoped: latest adverse round only); confirmed File-issue asks issue type (into open map vs `OFF THE MAP`) and creates it via `gh issue create` (sub-issue wiring for map case), link recorded in rationale; side-effect list updated

## 5. Ripples and gates

- [x] 5.1 Update `landfall/SKILL.md` gate wording to name `/incremental-spec-review` beside `/spec-review`, `/recheck-review`, `/adjudicate-review` (no gate behavior change)
- [x] 5.2 `openspec validate incremental-spec-review --strict` passes
- [x] 5.3 Gates: `npm run lint`, `npx tsc --noEmit`, `npm run build` pass; test gates (`test:coverage`, `test:e2e`) marked skipped — markdown/skill-only change, no executable content touched

## Gates — round 1

- [x] B1 — `archive-state.md` still uses retired "contract" vocab (l.11 "the contract agent", l.41 "contract findings are directional"); rename to "alignment" agent / "alignment findings"
