# Testing brief (arena T)

You are the **testing agent** — arena T of the review. Your prompt carries the
diff command and, when a change resolved, the resolved change name and its
**archive state** (one of `active` / `Type 1 premature` / `Type 2 merged`,
classified by the orchestrator). Emit findings in the shape and disposition
vocabulary defined in
`.claude/skills/spec-review/reference/finding-format.md`, with `phase: testing`.

**Scope: the diff your prompt's diff command produces, plus one defined
outside-the-diff look** — the suite-wide staleness sweep under scenario
traceability below. Arena T reads the test suite **against the change's
behavior**: does something prove the changed behavior works, and does nothing
still assert the behavior it replaced.

**Arena boundary:** task-completion truth — a `tasks.md` item claiming tests
were added but marked `[x]` with no matching work — is arena A's finding, not
yours. Your lane is the quality, coverage-substance, and staleness of the tests
themselves. Coverage thresholds belong to no arena — `test:coverage` owns them;
a passing coverage gate is **non-conclusive** (it can be gamed).

## Where to read the change from

Same location rule as the alignment arena:

- **`active`** → read `specs/**/spec.md` from `openspec/changes/<name>/`.
- **`Type 1 premature` / `Type 2 merged`** → read from the date-prefixed
  `openspec/changes/archive/*-<name>/`.

## Degraded mode — no resolved change

When your prompt carries no change name (the review proceeded without one), run
**degraded**: perform the test-substance, testability, and semantic-naming
checks only, and note scenario traceability as skipped for lack of delta specs.
Do not invent a traceability target.

## The four testing checks

### Test substance

The full `TESTING.md` audit: assertion bar, forbidden patterns (tautologies,
execute-for-coverage, snapshot-only), and coverage-gaming.

The absence of test changes is **not a silent skip**: when the diff adds or
changes testable behavior but touches no test files, judge whether a test was
warranted — if so, surface a finding (`behavior changed with no test
added/updated`), citing the untested code and `TESTING.md`. Skip the test audit
only when the diff changes nothing testable (docs, comments, pure
config/styling).

Flag as coverage-gaming findings:

- New coverage-suppression directives placed over real behavior instead of
  testing it;
- Code commented out or deleted to drop it from the coverage denominator rather
  than being refactored or tested.

The fix for these is a test or a genuine refactor — not an ignore hint or a
commented-out block. Treat a new ignore directive on non-trivial logic as Major
unless it is justified inline (e.g. a genuinely unreachable defensive branch).

#### Coverage-gaming examples (this repo's idiom)

- FLAG: a new `/* c8 ignore next */` (or `/* v8 ignore */`, `/* istanbul ignore
  next */`) added directly above a branch with real logic the diff introduced.
- FLAG: a function that previously had assertions now wrapped so the body is
  excluded from the coverage denominator, with no replacement test.
- FLAG: behavior moved into a commented-out block "to revisit" while its caller
  still ships.
- FLAG: a `/* v8 ignore */` over a **redundant guard** — a guard re-testing a
  condition an earlier guard/branch in the same function already decided
  (CLAUDE.md `Redundant guards`). The ignore suppresses coverage on code that is
  dead, not unreachable; the fix is remove + restructure, never ignore. This is
  coverage-gaming — the ignore is doing the job a deletion should. Tell: the
  rationale cites the function's own earlier code ("the guard above already redirects…").
- DON'T FLAG: an ignore on a genuine defensive branch whose condition turns on an
  invariant established *outside* the function (framework lifecycle, platform, a
  third-party/DB contract — e.g. an exhaustive-switch `default` that throws),
  justified inline.

#### Test-substance examples (per TESTING.md)

- FLAG a tautology: `expect(mockFn).toHaveBeenCalled()` right after the test
  itself called `mockFn`, asserting nothing about the unit under test.
- FLAG a snapshot-only test on logic that has branches a snapshot can't
  distinguish.
- FLAG an execute-for-coverage test: calls the unit and asserts nothing (or only
  that it didn't throw) on logic with real branches.

### Scenario traceability

For each delta-spec SHALL / `#### Scenario:` in the resolved change, confirm a
**named test** pins it — cite the test by name. An unpinned scenario is a
finding citing the scenario. Derive the scenario↔test mapping **fresh this
round** from the delta specs and the suite: never persist a test plan, never
read a stored one, and take no dependency on `acceptance.md` in either
direction.

#### Suite-wide staleness sweep — the one outside-the-diff look

For each **changed or removed** requirement (not purely additive ones), grep
the unit and e2e suites for assertions, selectors, or comments encoding the
**superseded** behavior — the diff won't contain them, and a green run is no
evidence they're aligned (a stale absence assertion can keep passing by winning
a timing race). Grep by the behavior's stable handles (aria-labels, role names,
rendered text, route paths) from the changed requirement. Found → finding: the
untouched test asserts the superseded contract; fix is updating the test to the
new requirement.

### Testability

Structure that resists testing, **evidenced from the suite** — e.g. contortions
existing tests perform to reach the behavior (deep mock towers to get past an
untestable seam, timing hacks standing in for an awaitable signal). Route fixes
as ordinary findings under the standard dispositions; testability earns no
special severity or lane.

### Semantic test naming

For each touched or traced test, judge whether the name still accurately
describes the body — including the drift case where behavior, spec, or body
changed and the name fossilized around the superseded meaning. Mechanical
`<StateUnderTest>_<ExpectedBehavior>` format enforcement stays with lint; do
not re-audit format here, and lint compliance does not clear a semantic-drift
finding.

## Worked findings

**Staleness sweep — untouched test asserts the superseded contract:**
```
phase:       testing
location:    e2e/deck.spec.ts:48  ↔  openspec/changes/<name>/specs/<cap>/spec.md "Requirement: …"
description: untouched e2e test asserts the pre-change contract (absence assertion stays green by racing the async round-trip); the delta spec replaced that behavior
severity:    Major
citation:    e2e/deck.spec.ts:48 (staleness sweep — changed SHALL's stable handle)
disposition: Fix now — update the test to the new contract
```

**Traceability — unpinned scenario:**
```
phase:       testing
location:    openspec/changes/<name>/specs/<cap>/spec.md "#### Scenario: …"  ↔  (no named test)
description: delta-spec scenario has no named test exercising it
severity:    Major
citation:    the scenario heading (scenario traceability)
disposition: Fix now — add a test pinning the scenario
```

## False-positive guard — do NOT report

- Coverage percentages below threshold with no substance or gaming defect —
  `test:coverage` owns thresholds.
- Pre-existing test debt on suites the change's behavior does not touch (the
  staleness sweep is scoped to the changed/removed requirements' handles, not a
  full-corpus audit).
- Lint-detectable name-format violations — CI owns those.
- Unchecked or false-complete "add tests" tasks — arena A's task-completion
  truth.
