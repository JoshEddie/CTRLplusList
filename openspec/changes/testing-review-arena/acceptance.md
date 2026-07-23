# Acceptance — testing-review-arena

## Flows

### Flow: Full review catches a stale suite test via arena T

- **Given** the owner has a change under review whose delta spec modifies an existing behavior
- **And** an untouched suite test still asserts the superseded contract (e.g. an absence assertion that stays green by winning a timing race)
- **When** the owner runs `/spec-review <change>`
- **And** the four arena agents (alignment, boundary, convention, testing) return
- **Then** the consolidated report shows findings grouped alignment → boundary → convention → testing
- **And** a `T<n>` finding names the stale test and the changed requirement, with the fix updating the test to the new contract
- **And** the persisted `review.md` round carries the `### Testing` table with the same durable ID

### Flow: Unpinned scenario surfaces as a traceability finding

- **Given** the owner has a change under review with a delta-spec scenario no named test exercises
- **When** the owner runs `/spec-review <change>`
- **Then** arena T reports a traceability finding citing the unpinned scenario
- **And** no stored test plan is read or written — the scenario↔test mapping is derived fresh in the round

### Flow: Review without a resolved change runs arena T degraded

- **Given** the owner reviews a hotfix diff with no related OpenSpec change
- **When** the owner chooses to proceed without an alignment audit
- **Then** the review still fans out boundary, convention, and testing agents (three, not two)
- **And** the testing arena reports on substance, testability, and semantic naming, noting traceability skipped
- **And** the verdict states no archive gate applies, determined by the boundary, convention, and testing dispositions

### Flow: Incremental review re-derives traceability across the whole footprint

- **Given** a change with a persisted `review.md` round whose fix delta changed both code and spec artifacts
- **And** the fix delta silently orphaned a scenario that was pinned in the earlier round
- **When** the owner runs `/incremental-spec-review <change>`
- **Then** the testing agent reviews `git diff <anchor>` (the whole footprint), like boundary
- **And** the orphaned scenario surfaces as a fresh `T<n>` finding in the appended round

## No manual path — fully automated

- Brief migrations (alignment loses the superseded-behavior sweep; convention loses all test duties; boundary sentences added) — static skill-file content consumed by the agents; verified by reading the briefs, no interactive journey.
- Finding-ID vocabulary gains `T` in `reference/finding-format.md` — static shared contract; exercised implicitly by the flows above.
- New bundled evaluation scenario (stale-e2e timing-race case) — hand-checkable doc content in `evaluations.md`, no runner.
