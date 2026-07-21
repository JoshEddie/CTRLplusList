## Why

When a review surfaces a fix bigger than a recheck can honestly verify, the only lever today is a full `/spec-review` — which re-reviews everything and demands everything staged, destroying the staged-reviewed vs unstaged-fix separation. Map [#269](https://github.com/JoshEddie/CTRLplusList/issues/269) settled the design (tickets #271, #272): a third review lever scoped to the not-yet-reviewed delta, plus an arena restructure both full-rigor skills share.

Inherited constraints: `spec-review`, `recheck-review`, and `adjudicate-review` capability specs govern the skills this change modifies; `trunk-workflow` fixes `/landfall`'s effective-verdict gate (unchanged here); `release-review` consumes the shared finding format but names no arena letters (mechanical ripple only). This is a skill/doc-only change — no production source.

## What Changes

- **New skill `/incremental-spec-review`** — full rigor on the unstaged-atop-staged delta plus whole-footprint boundary review. Routing in: the fix delta changed both code and spec artifacts. Subsumes recheck on such mixed rounds (prior-findings status table + fresh findings, one round, one verdict).
- **Arena restructure in both full-rigor skills** — standard/convention/contract dissolves into **A Alignment** (the change's promise: tasks/design/spec deltas, validate; delta-scoped), **B Boundary** (corpus-relative defects invisible in the delta alone; whole-scoped), **C Convention** (house law per CLAUDE.md + gated docs, and craft law: security, correctness, single-file performance; delta-scoped; every finding cites its source). Coverage thresholds belong to no arena (`test:coverage` owns them); test-substance and coverage-gaming audits stay in C. `spec-review`'s three briefs are rewritten to the arena split and shared by both skills.
- **Finding IDs relettered** — capital arena letter + integer continuing globally across all findings in a round (`A1, B2, C3`); merges still join with `+`. No sub-lane notation in IDs or prose; house-vs-craft lives in the Citation column.
- **Dispositions hardened** — `Fix now`: criterion is scope, never effort, plus any fix whose deferral ships soon-dead code. `File issue`: must cite the charter boundary it exceeds; no citation, no punt.
- **Round-gate sections in tasks.md** — an adverse verdict from any change-review round (spec-review, incremental, recheck) appends an unchecked `## Gates — round N` section (one item per open `Fix now`, by ID); prior sections are never unchecked. `/landfall`'s tasks-all-checked gate needs no change.
- **Recheck routing rebuilt** — old escalation tells (files-outside-diff, size) retired. Recheck is for a fix delta that changed code OR spec artifacts, never both; `outgrew recheck` survives with one tell — the delta turns out to touch both — and now directs to `/incremental-spec-review`.
- **Adjudication grows two duties** — an adjudication whose recomputed verdict clears the round deletes the pending gate section; a confirmed `File issue` creates the GitHub issue in-interview (owner picks type: chunk into the open map vs `OFF THE MAP`; plain `gh`, anchor wiring stays unwired pending #275) and records the link in the rationale.

## Capabilities

### New Capabilities

- `incremental-spec-review`: the second-stage review skill — routing boundary, delta scopes (A+C on unstaged, B on anchor→worktree), shared-brief fan-out, round persistence subsuming recheck's status table.

### Modified Capabilities

- `spec-review`: arena restructure (standard dissolved), finding-ID relettering, report order alignment → boundary → convention, brief renames, hardened dispositions, gate-section append on adverse verdict.
- `recheck-review`: routing boundary (code OR specs, never both), retired size/file tells, escalation retargeted at `/incremental-spec-review`, gate-section append on adverse verdict.
- `adjudicate-review`: gate-section deletion on a clearing verdict; in-interview `File issue` creation with owner-chosen issue type.

## Impact

- `.claude/skills/incremental-spec-review/SKILL.md` (new)
- `.claude/skills/spec-review/` — SKILL.md, three briefs (renamed to arena names), `reference/finding-format.md` (IDs, phase enum, gate-section contract, round-heading vocab), `evaluations.md` (arena/ID vocabulary)
- `.claude/skills/recheck-review/SKILL.md`
- `.claude/skills/adjudicate-review/SKILL.md`
- `.claude/skills/landfall/SKILL.md` — gate wording adds `/incremental-spec-review` to the named skills (no gate behavior change)
- `/release-review` untouched beyond consuming the shared format; no delta spec needed (its spec names no arena letters)
- No production source, tests, or DB — non-executable change; test gates skippable with rationale per CLAUDE.md
