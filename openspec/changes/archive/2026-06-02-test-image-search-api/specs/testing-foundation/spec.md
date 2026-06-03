## ADDED Requirements

### Requirement: Image-search-api carve-out SHALL be tested at the universal COVERAGE_FLOOR with rate-limit semantics behaviorally locked

The image-search-api carve-out (sub-proposal 5.1) — the single executable source file `app/api/image-search/route.ts` — SHALL be covered by the colocated test file `app/api/image-search/__tests__/route.test.ts` meeting the universal per-file `COVERAGE_FLOOR` defined in `vitest.config.ts` (`lines:98 / statements:98 / branches:95 / functions:100`). The file runs under the **node** project (`.test.ts`) as a DB-integration test against a real pglite-backed database; `@/lib/auth` (NextAuth) and the upstream provider `fetch` are mocked as network boundaries — the real SerpAPI / Serper upstream SHALL NOT be called from any test or in CI — while internal modules run real. The route SHALL remain enumerated in `vitest.config.ts` per-file `thresholds` and in the `eslint.config.mjs` `sonarjs/cognitive-complexity = error` override.

Beyond the auth-gate (401), budget-exceeded (429 `rate_limited`), `quota_exceeded` (429) distinction, and `query_too_long` (400) assertions inherited from sub-proposal 4.13, this carve-out SHALL behaviorally assert the per-user token bucket's two facets that branch coverage alone leaves unexercised: the budget window resets after its interval, and one user's exhaustion does not throttle a different authenticated user.

This is a Tier 2 carve-out bookkeeping record per the parent `test-coverage` change's design D13 two-tier rollup: it lives ONLY in this sub-proposal's archive directory and does NOT roll into the parent `test-coverage` accumulator, nor does it modify the active `openspec/specs/testing-foundation/spec.md`. The route's test file and config entries were created by sub-proposal 4.13 `test-server-endpoint-authorization`; this carve-out reconciles with that file and appends the rate-limit window/per-user behavioral tests.

#### Scenario: Carve-out file meets the universal floor

- **WHEN** `npm test -- --coverage` runs against `main` after this change archives
- **THEN** the per-file coverage report shows `app/api/image-search/route.ts` at `lines ≥ 98%, statements ≥ 98%, branches ≥ 95%, functions = 100%`
- **AND** the gate passes
- **AND** the `vitest.config.ts` per-file threshold entry for the route references the shared `COVERAGE_FLOOR` constant (no per-file numeric variation)

#### Scenario: Upstream provider is never called for real

- **WHEN** the `route.test.ts` suite runs in CI or locally
- **THEN** every test that reaches the provider chain does so against a stubbed `fetch` (`vi.stubGlobal('fetch', …)`)
- **AND** no network request is made to SerpAPI or Serper

#### Scenario: Rate-limit window-reset and per-user isolation are regression-locked

- **WHEN** a future change to `app/api/image-search/route.ts` removes the bucket window reset (so an exhausted user stays throttled forever) or collapses the per-`users.id` bucket into a single global counter (so one user throttles another)
- **THEN** the corresponding behavioral test in `route.test.ts` fails — the window-reset test because the post-window request no longer returns 200, or the per-user-isolation test because user B's request returns 429 instead of 200
- **AND** the `test` pre-merge gate fails
