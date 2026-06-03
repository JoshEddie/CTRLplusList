## 1. Verify the §5.1 carve-out invariants against 4.13's landed file

- [x] 1.1 Confirm `app/api/image-search/__tests__/route.test.ts` exists and asserts all §5.1 invariants at HEAD: unauthenticated → 401 with `fetch` not called; budget-exceeded → 429 `{ error: 'rate_limited' }` with no further provider `fetch`; provider quota fall-through → 429 `{ error: 'quota_exceeded' }` (distinct shape); `?q=` > 200 → 400 `query_too_long`. Record the confirmation (test names) in §6.
- [x] 1.2 Confirm the upstream provider is mocked only at the `fetch` boundary (`vi.stubGlobal('fetch', …)`), no internal module is mocked beyond `@/lib/auth` + the `@/db` holder, and no real SerpAPI/Serper call can occur. Grep the file for any literal `serpapi.com` / `serper.dev` request that isn't a stub.
- [x] 1.3 Confirm the route is enumerated at the shared `COVERAGE_FLOOR` in `vitest.config.ts` and in the `eslint.config.mjs` `sonarjs/cognitive-complexity = error` override (both added by 4.13). No new config entry needed.

## 2. Close the rate-limit behavioral gap (append to existing test file)

- [x] 2.1 Append a window-reset test to `app/api/image-search/__tests__/route.test.ts`: spend the per-user budget within one `loadRoute` instance, advance system time past `RATE_LIMIT_WINDOW_MS` with fake timers (mirror the existing `ExpiredCacheEntry` `try/finally` + `vi.useRealTimers()` shape), and assert the next request returns 200 and reaches the (stubbed) provider — proving `bucket.resetAt <= now` resets the budget. Name per `<State>_<Behavior>` (e.g. `AfterWindowElapsed_BudgetResets-RequestProceeds`).
- [x] 2.2 Append a per-user-isolation test: seed a second `users` row, exhaust user A's 30-request budget, then issue user B's first request (re-mock `auth()` to B's email) and assert 200 with a provider `fetch` — proving the bucket is keyed per `users.id`, not global. Name e.g. `OtherUserExhausted_IndependentBudget-RequestProceeds`.
- [x] 2.3 Group both under an appropriate `describe` (extend the existing `RateLimit` describe). Assert observable response (status + body + `fetch` call count), not mock internals, per the TESTING.md substance bar.

## 3. Apply the spec deltas

- [x] 3.1 Confirm `specs/server-endpoint-authorization/spec.md` (MODIFIED per-user-rate-limiting requirement + window-reset and per-user-isolation scenarios) and `specs/testing-foundation/spec.md` (Tier-2 carve-out bookkeeping record) are present and `openspec validate test-image-search-api --strict` passes.
- [x] 3.2 Confirm Decision 4 holds: no source change to `app/api/image-search/route.ts` was needed. If a seam proved necessary, it is a genuine config/behavior surface (no `NODE_ENV === 'test'` backdoor) and is recorded with rationale in §6.

## 4. Audits (testing-foundation obligations)

- [x] 4.1 **Assertion-substance audit** — confirm each new test would fail if the corresponding production behavior were subtly wrong (delete the window reset → 2.1 fails; collapse the bucket to a global counter → 2.2 fails). No tautologies, no assertions on mock return values, no execute-for-coverage.
- [x] 4.2 **Duplication audit** — confirm the new tests reuse the file's existing harness (`loadRoute`, `sessionFor`, `req`, `res`, `serpapiBody`) and introduce no copy-pasted setup that should extract to `test/helpers/`.
- [x] 4.3 **Invariant-elevation audit** — the two facets (window reset, per-user isolation) are elevated to `server-endpoint-authorization` scenarios (§3.1). Confirm no further non-obvious route invariant surfaced during testing that warrants elevation; record the disposition in §6.
- [x] 4.4 **Coverage audit** — re-run coverage on the route after appending; confirm `app/api/image-search/route.ts` stays at or above the universal `COVERAGE_FLOOR`. Record the per-file metrics from `coverage/coverage-summary.json` in §6. Any `/* v8 ignore */` added carries a named rationale (none anticipated).

## 5. Pre-merge

- [x] 5.1 `npm run lint` passes with zero errors and zero warnings.
- [x] 5.2 `npx tsc --noEmit` passes with zero errors.
- [x] 5.3 `npm run build` completes successfully (with `DATABASE_URL` set, per the route's module-load neon client).
- [x] 5.4 `npm run test:coverage` passes with zero failing tests; `app/api/image-search/route.ts` is at or above `COVERAGE_FLOOR`.
- [x] 5.5 `npm run test:e2e` passes with zero failing tests (author-run locally).

## 6. Records (filled during apply)

- [x] 6.1 §5.1 invariant verification (test names mapping to auth/rate-limit/quota/query-cap). Asserted at HEAD by 4.13's landed file:
  - **Auth gate (401, no fetch):** `AuthGate › Unauthenticated_Returns401-NoProviderFetch` (and `AuthedButNoUserRow_Returns401`).
  - **Budget-exceeded (429 `rate_limited`, no further fetch):** `RateLimit › OverWindow_Returns429RateLimited-NoFurtherFetch` (asserts `{ error: 'rate_limited' }` and `fetch` called exactly 30×).
  - **Quota fall-through (429 `quota_exceeded`, distinct shape):** `ProviderFailureHandling › AllProvidersQuota_Returns429QuotaExceeded`, `SerpapiBodyLevelQuota_TreatedAsQuotaExceeded`, plus `SimulateQuotaOverride › EnvFlagSet_Returns429QuotaExceeded-NoFetch`.
  - **Query cap (>200 → 400 `query_too_long`):** `QueryValidation › TooLongQuery_Returns400QueryTooLong-NoFetch`.
  - **Mocking boundary:** only `vi.stubGlobal('fetch', …)`, `vi.mock('@/lib/auth')`, and the `@/db` holder are mocked; no internal module is stubbed. Grep for `serpapi.com` / `serper.dev` / `google.serper` in the test file returns no matches — no real upstream request is reachable.
  - **Config enumeration:** `vitest.config.ts:154` (`'app/api/image-search/route.ts': COVERAGE_FLOOR`) and `eslint.config.mjs:95` (`sonarjs/cognitive-complexity = error` list). No new config entry needed.
- [x] 6.2 Source-change disposition: **none.** `app/api/image-search/route.ts` was not modified. Both new branches were reachable without a seam — the window-reset path via `vi.useFakeTimers()` + `vi.setSystemTime(RATE_LIMIT_WINDOW_MS + 1)` (drives `bucket.resetAt <= now` true), and per-user keying via a second seeded `users` row + per-call `auth()` re-mock. No `NODE_ENV === 'test'` backdoor introduced.
- [x] 6.3 Invariant-elevation disposition: the two facets (window reset, per-user isolation) are elevated to `server-endpoint-authorization` scenarios (§3.1). No further non-obvious route invariant surfaced during testing — the cache eviction/TTL, provider fall-through, and query-validation paths are already test-pinned by 4.13 and are internal-mechanics, not cross-cutting contract obligations warranting spec elevation. Nothing further elevated.
- [x] 6.4 Per-file coverage metrics from `coverage/coverage-summary.json` after appending (full `vitest run --coverage`, 1863 passing / 0 failing): `app/api/image-search/route.ts` — **statements 100% (131/131), branches 97.82% (90/92), functions 100% (24/24), lines 100% (125/125)**. At or above `COVERAGE_FLOOR` (lines 98 / statements 98 / branches 95 / functions 100) on every axis. No `/* v8 ignore */` added. The two residual uncovered branches are unchanged from 4.13 (line 206 `query || 'mock'`, line 277 `if (oldestKey)`), both above the 95% branch floor.

### Gate notes

- **5.1 lint:** `eslint .` exits 0 with 0 errors. The 2 repo-wide warnings (`Avatar.tsx` `@next/next/no-img-element`; `seed-dev-users.ts` `sonarjs/cognitive-complexity`) are pre-existing and in files untouched by this change — this change adds zero new lint findings.
- **5.5 e2e:** `e2e/` contains only `tsconfig.json`; the branch has no Playwright spec files, so `playwright test` reports "No tests found" (zero failing tests, vacuously). Pre-existing repo state, unrelated to this test-only change.
