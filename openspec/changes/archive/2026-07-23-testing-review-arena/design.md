## Context

The spec-review family runs three arena agents (A alignment, B boundary, C convention) from bundled briefs under `.claude/skills/spec-review/`, shared by `/incremental-spec-review` as file reads. Test duties are currently split: alignment carries a superseded-behavior sweep (its one outside-the-diff look), convention carries the TESTING.md audit (substance, missing tests, coverage-gaming). The issue-258 failure showed the structural gap; map 289 settled the charter, boundaries, and non-goals.

## Goals / Non-Goals

**Goals:** a fourth arena T owning all suite-vs-behavior questions; clean migration (moves, not copies) out of A and C; orchestration, IDs, report, and incremental scopes extended; one new eval scenario.

**Non-Goals:** arena T in `/release-review`; a stored test plan or any coupling to `acceptance.md`; changes to `recheck-review`/`adjudicate-review`/`landfall` beyond the grown ID vocabulary; a full-corpus traceability audit of existing specs; changing lint's mechanical test-name enforcement.

## Decisions

### Arena T charter — four checks in one brief

`testing-brief.md`, phase key `testing`, letter `T`. Checks: test substance (TESTING.md audit — assertion bar, forbidden patterns, coverage-gaming directives, missing-tests-are-a-finding), scenario traceability (each delta-spec SHALL/`#### Scenario:` pinned by a named test; the suite-wide staleness sweep — grep by stable handles for assertions encoding superseded behavior — is the arena's one outside-the-diff look), testability (structure resisting testing, evidenced from the suite; ordinary `Fix now` findings), semantic naming (name-describes-body, incl. fossilized names after behavior changed). Alternative — splitting traceability into alignment — rejected: direction of gaze is the boundary (T reads the suite against behavior; A reads work against the promise; C reads production code against docs).

### Migrations are moves

Alignment-brief's "Superseded-behavior sweep" section is deleted (four checks → three); convention-brief loses the TESTING.md pointer row, "Missing tests are a finding" section, coverage-gaming and test-substance examples, and test-related scope wording. One boundary sentence in both A and T briefs: unchecked "add tests" tasks (task-completion truth) stay A; test quality/staleness is T. After the move, T and C share zero material.

### Degraded T when no change resolves

When Phase 0c proceeds without a change, T still runs — substance, testability, naming — with traceability noted skipped (no delta specs to trace). Fan-out floor rises 2→3. Alternative — skip T with alignment — rejected by owner: hotfix diffs keep a test-quality audit.

### T's scopes

Full `/spec-review`: delta-scoped like A/C, plus the staleness sweep as its one outward look. `/incremental-spec-review`: full footprint (`git diff <anchor>`), like B — a fix delta can silently orphan a scenario reviewed in round 1. Mapping is re-derived fresh each round; a stored table was rejected at charting as a silent-drift hazard.

### T's inputs

T receives the resolved change name and archive state (it reads delta specs from the same location rule as A: active dir, or date-prefixed archive dir) plus the diff command and brief pointer. It does not receive the deferred-to-CI instruction — that stays alignment-only.

### Report and ID placement

Report order gains `### Testing` after Convention (alignment → boundary → convention → testing); `T` joins the arena-letter vocabulary in `reference/finding-format.md`; the global integer sequence spans all four tables. Old three-arena rounds stay valid history — readers resolve IDs within their own round.

## Risks / Trade-offs

- [Four parallel agents cost more per review] → bounded fan-out, unchanged reply/retry mechanics; the motivating defect class was invisible at any price before.
- [T and C could drift back into overlap as TESTING.md evolves] → the migration leaves C's brief with an explicit arena-boundary sentence (test files and TESTING.md are T's lane), mirroring the existing C↔B fence.
- [Staleness sweep is unbounded suite reading] → scoped to changed/removed SHALLs' stable handles (aria-labels, roles, rendered text, routes), same fence the alignment sweep uses today.

## Migration Plan

Docs-only skill edits on `dev`; no deploy or rollback concerns. Old persisted rounds need no migration (IDs resolve per round).

## Open Questions

None — map 289 exited ready; the two embark-time gaps (degraded T, eval scenario) were adjudicated by the owner in-interview.
