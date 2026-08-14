## 1. Arena T brief

- [x] 1.1 Write `.claude/skills/spec-review/testing-brief.md` — phase key `testing`, letter `T`; four checks (test substance incl. coverage-gaming + missing-tests, scenario traceability incl. suite-wide staleness sweep, testability, semantic naming); inputs (change name + archive state, same read-location rule as alignment); degraded mode when no change resolved; no stored test plan / no acceptance.md dependency; boundary sentence (task-completion truth is arena A's); worked findings + calibration material migrated from the convention brief where it concerns tests

## 2. Brief migrations (moves, not copies)

- [x] 2.1 `alignment-brief.md` — delete the "Superseded-behavior sweep" section (four checks → three); add the boundary sentence (test quality/staleness is arena T's; task-completion truth stays here)
- [x] 2.2 `convention-brief.md` — drop all test duties: TESTING.md pointer row, "Missing tests are a finding" section, coverage-gaming and test-substance examples, test wording in scope lines; add the arena-boundary note routing test duties to T

## 3. Orchestration and shared contracts

- [x] 3.1 `spec-review/SKILL.md` — arenas 3→4 (T section, brief path, per-agent prompt incl. T's change-name/archive-state inputs), fan-out counts (4; 3 degraded when no change), report skeleton gains `### Testing`, verdict wording for skipped-alignment covers T
- [x] 3.2 `reference/finding-format.md` — arena letter `T` in the ID scheme, table examples, and finding-shape `phase` enum (`testing`)
- [x] 3.3 `incremental-spec-review/SKILL.md` — scope table gains T at `git diff <anchor>` with rationale; fan-out four agents incl. testing brief path
- [x] 3.4 `evaluations.md` — add the stale-e2e-wins-timing-race scenario (arena-T traceability finding), per the four-scenario minimum

## 4. Pre-merge verification

Doc-only change (`.claude/**` skills + `openspec/**` only) — `test:coverage` and `test:e2e` omitted under the doc-only exemption.

- [x] 4.1 `openspec validate testing-review-arena --strict` passes
- [x] 4.2 `npm run lint` — zero errors, zero non-size warnings
- [x] 4.3 `npx tsc --noEmit` — zero errors
- [x] 4.4 `npm run build` — completes successfully
