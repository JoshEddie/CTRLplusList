## Why

Diff-scoped review structurally cannot see test defects outside the diff: issue-258 changed deck preselect behavior and an untouched e2e test asserting the superseded contract stayed green by winning a timing race. Test duties are currently smeared across the alignment and convention arenas as secondary concerns (the superseded-behavior sweep in alignment, the TESTING.md audit in convention). A dedicated testing arena makes the suite-vs-behavior question a first-class review concern with one owner.

Inherited constraints (binding SHALLs in active specs this change modifies): `spec-review`'s "Three review arenas", "Multi-agent orchestration", "Convention audit follows CLAUDE.md doc-pointers", "Consolidated report…", "Sub-agent briefs are bundled within the skill", "Concise, progressively-disclosed authoring", "Bundled evaluation scenarios"; `incremental-spec-review`'s "Arena scopes derive from the report header" and "Fan-out reuses spec-review's shared briefs and reply mechanics". `recheck-review`, `adjudicate-review`, `review-artifact`, and `/landfall` consume the persisted-report contract unchanged — only the finding-ID arena-letter vocabulary grows.

## What Changes

- New arena **T — Testing**: a fourth spec-review agent with a bundled brief (`testing-brief.md`) chartered with four checks — test substance (full TESTING.md audit, migrated from convention, incl. coverage-gaming and missing-tests), scenario traceability (each delta-spec SHALL/scenario pinned by a named test; subsumes alignment's superseded-behavior sweep; a suite-wide staleness sweep is the arena's one outside-the-diff look, re-derived fresh each round — no stored test plan), testability (structure resisting testing, evidence from the suite, fixes routed as ordinary findings), and semantic test naming (name-describes-body drift; lint keeps mechanical format enforcement).
- Migrations are **moves, not copies**: alignment-brief drops the superseded-behavior sweep (4→3 checks); convention-brief drops all test duties (TESTING.md pointer row, missing-tests section, test-substance and coverage-gaming material). One boundary sentence in the alignment and testing briefs: task-completion truth stays with alignment; test quality/staleness is arena T's.
- `/spec-review` fan-out grows 3→4 agents; the report skeleton gains a `### Testing` findings group; finding IDs gain arena letter `T` in `reference/finding-format.md`.
- When no related change resolves (alignment skipped), arena T runs **degraded** — substance/testability/naming only, traceability noted skipped — so fan-out is 3, not 2.
- `/incremental-spec-review`: arena T runs on the full footprint (`git diff <anchor>`), like boundary — traceability is a whole-change property.
- One new bundled evaluation scenario: the motivating stale-e2e-wins-timing-race case yielding an arena-T traceability finding.
- `/release-review` does NOT gain arena T; `recheck-review`/`adjudicate-review`/`landfall` unchanged.

## Capabilities

### New Capabilities

_None — arena T is a modification of the existing review capabilities._

### Modified Capabilities

- `spec-review`: three arenas become four (T added with its charter); convention's requirement loses its test-audit duties; the contract-audit requirement loses the superseded-behavior framing to T; orchestration, report contract, finding IDs, briefs, and evaluation requirements extend to the fourth arena; degraded-T behavior when no change resolves.
- `incremental-spec-review`: arena scope table gains T at `git diff <anchor>` (full footprint); fan-out gains the fourth agent.

## Impact

- `.claude/skills/spec-review/`: new `testing-brief.md`; edits to `SKILL.md`, `alignment-brief.md`, `convention-brief.md`, `reference/finding-format.md`, `evaluations.md`.
- `.claude/skills/incremental-spec-review/SKILL.md`: scope table + fan-out.
- No production code, DB, or UI impact; no cache tags. Non-executable change — test gates exempt under the doc-only exemption.
