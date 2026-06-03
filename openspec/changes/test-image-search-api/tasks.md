## 1. Verify the §5.1 carve-out invariants against 4.13's landed file

- [ ] 1.1 Confirm `app/api/image-search/__tests__/route.test.ts` exists and asserts all §5.1 invariants at HEAD: unauthenticated → 401 with `fetch` not called; budget-exceeded → 429 `{ error: 'rate_limited' }` with no further provider `fetch`; provider quota fall-through → 429 `{ error: 'quota_exceeded' }` (distinct shape); `?q=` > 200 → 400 `query_too_long`. Record the confirmation (test names) in §6.
- [ ] 1.2 Confirm the upstream provider is mocked only at the `fetch` boundary (`vi.stubGlobal('fetch', …)`), no internal module is mocked beyond `@/lib/auth` + the `@/db` holder, and no real SerpAPI/Serper call can occur. Grep the file for any literal `serpapi.com` / `serper.dev` request that isn't a stub.
- [ ] 1.3 Confirm the route is enumerated at the shared `COVERAGE_FLOOR` in `vitest.config.ts` and in the `eslint.config.mjs` `sonarjs/cognitive-complexity = error` override (both added by 4.13). No new config entry needed.

## 2. Close the rate-limit behavioral gap (append to existing test file)

- [ ] 2.1 Append a window-reset test to `app/api/image-search/__tests__/route.test.ts`: spend the per-user budget within one `loadRoute` instance, advance system time past `RATE_LIMIT_WINDOW_MS` with fake timers (mirror the existing `ExpiredCacheEntry` `try/finally` + `vi.useRealTimers()` shape), and assert the next request returns 200 and reaches the (stubbed) provider — proving `bucket.resetAt <= now` resets the budget. Name per `<State>_<Behavior>` (e.g. `AfterWindowElapsed_BudgetResets-RequestProceeds`).
- [ ] 2.2 Append a per-user-isolation test: seed a second `users` row, exhaust user A's 30-request budget, then issue user B's first request (re-mock `auth()` to B's email) and assert 200 with a provider `fetch` — proving the bucket is keyed per `users.id`, not global. Name e.g. `OtherUserExhausted_IndependentBudget-RequestProceeds`.
- [ ] 2.3 Group both under an appropriate `describe` (extend the existing `RateLimit` describe). Assert observable response (status + body + `fetch` call count), not mock internals, per the TESTING.md substance bar.

## 3. Apply the spec deltas

- [ ] 3.1 Confirm `specs/server-endpoint-authorization/spec.md` (MODIFIED per-user-rate-limiting requirement + window-reset and per-user-isolation scenarios) and `specs/testing-foundation/spec.md` (Tier-2 carve-out bookkeeping record) are present and `openspec validate test-image-search-api --strict` passes.
- [ ] 3.2 Confirm Decision 4 holds: no source change to `app/api/image-search/route.ts` was needed. If a seam proved necessary, it is a genuine config/behavior surface (no `NODE_ENV === 'test'` backdoor) and is recorded with rationale in §6.

## 4. Audits (testing-foundation obligations)

- [ ] 4.1 **Assertion-substance audit** — confirm each new test would fail if the corresponding production behavior were subtly wrong (delete the window reset → 2.1 fails; collapse the bucket to a global counter → 2.2 fails). No tautologies, no assertions on mock return values, no execute-for-coverage.
- [ ] 4.2 **Duplication audit** — confirm the new tests reuse the file's existing harness (`loadRoute`, `sessionFor`, `req`, `res`, `serpapiBody`) and introduce no copy-pasted setup that should extract to `test/helpers/`.
- [ ] 4.3 **Invariant-elevation audit** — the two facets (window reset, per-user isolation) are elevated to `server-endpoint-authorization` scenarios (§3.1). Confirm no further non-obvious route invariant surfaced during testing that warrants elevation; record the disposition in §6.
- [ ] 4.4 **Coverage audit** — re-run coverage on the route after appending; confirm `app/api/image-search/route.ts` stays at or above the universal `COVERAGE_FLOOR`. Record the per-file metrics from `coverage/coverage-summary.json` in §6. Any `/* v8 ignore */` added carries a named rationale (none anticipated).

## 5. Pre-merge

- [ ] 5.1 `npm run lint` passes with zero errors and zero warnings.
- [ ] 5.2 `npx tsc --noEmit` passes with zero errors.
- [ ] 5.3 `npm run build` completes successfully (with `DATABASE_URL` set, per the route's module-load neon client).
- [ ] 5.4 `npm run test:coverage` passes with zero failing tests; `app/api/image-search/route.ts` is at or above `COVERAGE_FLOOR`.
- [ ] 5.5 `npm run test:e2e` passes with zero failing tests (author-run locally).

## 6. Records (filled during apply)

- [ ] 6.1 §5.1 invariant verification (test names mapping to auth/rate-limit/quota/query-cap).
- [ ] 6.2 Source-change disposition (expected: none; record any seam + no-backdoor rationale).
- [ ] 6.3 Invariant-elevation disposition.
- [ ] 6.4 Per-file coverage metrics from `coverage-summary.json`.
