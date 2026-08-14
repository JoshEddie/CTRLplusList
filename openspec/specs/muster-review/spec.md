# muster-review Specification

## Purpose

Governs `/muster-review`, a single-agent review skill for MUSTER (tests-only) voyages. One fresh-context testing-arena agent reviews the diff against the bundled arena T brief, with traceability targeting active-spec scenarios cited in test file headers. The verdict is reported in-session only — no persisted artifacts — and gates `/landfall`'s MUSTER branch via owner confirmation.

## Requirements
### Requirement: /muster-review SHALL review a MUSTER diff with one fresh testing-arena agent

- **Resolve** — `/muster-review [issue#]` SHALL resolve the MUSTER voyage from its argument, else from the single issue labeled both `MUSTER` and `UNDER SAIL`.
- **Fan out** — exactly one fresh-context testing-arena sub-agent, against the voyage's tests-only diff.
- **Brief** — by reference to the bundled arena T brief `.claude/skills/spec-review/testing-brief.md` in `/spec-review`'s skill directory: the single source of the arena contract for the review family, consumed the way `/incremental-spec-review` consumes it — a file read, never a skill invocation. It SHALL NOT run degraded.
- **Framing adjustment** — traceability SHALL target the **active-spec scenarios cited by each test file's citation header** (`openspec/specs/<capability>/spec.md`), not delta specs.
- **Checks** — that each test asserts the observable behavior its cited scenario states, plus a sweep for `TESTING.md`'s forbidden patterns.
- **Stop condition** — a diff containing any production-code change SHALL stop the review; the voyage no longer qualifies for the lane.

#### Scenario: One agent, arena T brief, active-spec traceability
- **WHEN** `/muster-review` runs on a MUSTER voyage whose test files cite active-spec scenarios in their citation headers
- **THEN** exactly one testing-arena agent reviews the diff against the bundled arena T brief with traceability run against those cited active-spec scenarios — no boundary, convention, or alignment arena runs

#### Scenario: A passing but hollow test is a finding
- **WHEN** the diff contains a test that executes the flow its cited scenario names but asserts nothing the scenario's THEN states (a tautology or execute-for-coverage test)
- **THEN** the review reports it as a finding — green CI does not clear the substance bar

#### Scenario: Production code stops the review
- **WHEN** the resolved diff touches any production source file
- **THEN** the review stops without fanning out the agent and reports that the voyage no longer qualifies as tests-only

### Requirement: The verdict SHALL be reported in the session, not persisted

- **Report** — `/muster-review` SHALL report the findings and a verdict line (clear to land, or findings remain) in the session running the skill, once per round.
- **Persist nothing** — no issue comment, no `review.md`, no other tree artifact.
- **Read by** — `/landfall`'s MUSTER review gate, which takes the latest verdict via owner confirmation (gate ownership: `trunk-workflow`).
- **Never** — the skill SHALL never run `git commit`, never stage, never push.

#### Scenario: Verdict is reported in the session
- **WHEN** a review round completes
- **THEN** the findings and verdict are reported in the session, and the working tree and issue are untouched — no `review.md`, no issue comment, nothing staged

#### Scenario: A fix-forward round supersedes the last verdict
- **WHEN** red CI or findings drive further test edits and `/muster-review` runs again
- **THEN** the new round reports a fresh verdict, and that latest verdict is the one the owner confirms at the landing gate
