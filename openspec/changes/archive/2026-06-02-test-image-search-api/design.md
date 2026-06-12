## Context

Sub-proposal 5.1 of the `test-coverage` initiative targets `app/api/image-search/route.ts`. By the time this sub-proposal opens, the carve-out's test file already exists: sibling **4.13 `test-server-endpoint-authorization`** (archived `2026-06-01`) authored `app/api/image-search/__tests__/route.test.ts`, enumerated the route in `vitest.config.ts` per-file `thresholds` and `eslint.config.mjs` (`sonarjs/cognitive-complexity = error`), and made `CACHE_MAX_ENTRIES` env-tunable. Measured at HEAD the file is at the universal `COVERAGE_FLOOR` (`statements 100% / branches 97.82% / functions 100% / lines 100%`; the two residual uncovered branches are line 206 `query || 'mock'` and line 277 `if (oldestKey)`, both above the 95% branch floor).

4.13 approached the route on the **authorization axis** (authenticated / unauthenticated). That axis already covers §5.1's auth gate, the budget-exceeded `rate_limited` rejection, the `query_too_long` cap, provider success/cache, and the full `quota_exceeded` fall-through. What it does NOT cover — because the axis never needed it — is the **per-user** and **per-minute** semantics of the bucket itself. The single rate-limit test uses one user inside one un-advanced window, so:

- `checkRateLimit`'s window-reset path (`bucket.resetAt <= now` evaluating *true*) is never exercised. Branch coverage is green only because the `||` short-circuit reaches the operand; the operand is never *true*.
- The per-`users.id` keying of `rateBuckets` is never exercised — only one user ever appears.

Both are real invariants the active `server-endpoint-authorization` spec already requires ("per-user request budget … within the bucket window") but no test would catch if broken. This is the coverage-vs-behavior gap [TESTING.md](TESTING.md) names: green coverage, unverified behavior.

## Goals / Non-Goals

**Goals:**

- Close the behavioral gap with two appended tests in the existing `route.test.ts`: window-reset and per-user isolation, each with `fetch` stubbed and asserting on the route's observable response (status + body + provider-fetch call count).
- Verify (audit, not re-author) that 4.13's landed file satisfies every §5.1 invariant at HEAD: auth 401, 30/min `rate_limited` 429, `quota_exceeded` 429 distinction, `query_too_long` 400, and `fetch`-boundary-only mocking with zero real upstream calls.
- Pin the two facets into the `server-endpoint-authorization` contract as scenarios, and record the §5.1 carve-out bookkeeping in `testing-foundation` (Tier 2, archive-only).

**Non-Goals:**

- Re-authoring or restructuring 4.13's `route.test.ts`, its `vitest.config.ts` / `eslint.config.mjs` entries, or its `CACHE_MAX_ENTRIES` seam. Those are inherited as-is.
- Changing `app/api/image-search/route.ts` production behavior. The bucket window and per-user keying already work; this carve-out builds the regression net under them.
- Multi-replica rate-limit durability. The per-process in-memory bucket is an accepted residual per the `server-endpoint-authorization` requirement and the route's own comment; testing it across replicas is out of scope.
- Re-litigating the apply-time-vs-archive-time canonical-write convention (parent §7.11, unratified). This change defers its canonical writes to archive-time per the established precedent.

## Decisions

### Decision 1: Append to the existing `route.test.ts` rather than create a new file.

The carve-out is one source file; `testing-foundation` mandates one colocated `__tests__/` test file per source file, and 4.13 already created it. A second test file for the same source would split the route's regression net and duplicate the `loadRoute` / `vi.resetModules` / `fetch`-stub harness. The two new tests reuse that harness verbatim (`loadRoute`, `sessionFor`, `req`, `res`, `serpapiBody`). **Alternative rejected:** a separate `route.rate-limit.test.ts` — rejected because it fragments coverage of one file and re-implements the established harness for no benefit.

### Decision 2: Drive the window-reset path with fake timers, not 60 real seconds.

The window is `RATE_LIMIT_WINDOW_MS = 60_000`. The existing `ExpiredCacheEntry` test already establishes the fake-timer pattern in this file (`vi.useFakeTimers()` + `vi.setSystemTime`). The window-reset test spends the budget (or one request), advances system time past the 60s window, and asserts the next request succeeds (200, provider fetched) rather than returning 429 — proving `bucket.resetAt <= now` resets the bucket. **Alternative rejected:** lowering the window via a new env seam — rejected because the fake-timer approach reaches the branch with zero source change and no test-only knob, and a window-size env knob has no production caller (KISS / no-backdoor).

### Decision 3: Drive per-user isolation with a second seeded `users` row + per-call `auth()` mock.

`checkRateLimit` keys on `sessionUser.id`, resolved from `users.email`. The file already seeds one user (`searcher`) in `beforeAll` and re-mocks `auth()` per test. The isolation test seeds a second user, exhausts user A's 30-request budget, then issues user B's request and asserts it returns 200 with a provider fetch — proving the bucket is per-`users.id`, not global. A global counter would 429 user B and fail the test. **Alternative rejected:** mocking `checkRateLimit` directly — rejected because it would test the mock, not the production keying (TESTING.md: no assertions on mock return values; internal modules run real).

### Decision 4: No source change to `route.ts` is anticipated; if one proves necessary it follows the no-backdoor rule.

Both new branches are reachable from tests as-is (fake timers for the window; a second seeded user for the key). The `IMAGE_SEARCH_CACHE_MAX_ENTRIES` seam from 4.13 is unrelated and stays. Should the apply step discover an unavoidable seam, it MUST be a genuine config/behavior surface identical in prod and test — never a `NODE_ENV === 'test'` branch (TESTING.md no-backdoor rule). Expectation recorded so a reviewer can confirm the file diff is test-only.

### Decision 5: Strengthen the existing `server-endpoint-authorization` requirement with scenarios; do not create an `image-search` capability.

The route's normative contract already lives in `server-endpoint-authorization` (the rate-limit requirement at lines 102–116). The window-reset and per-user facets are scenarios of that existing requirement, not a new capability. Adding them there keeps the contract single-sourced. The requirement *text* is unchanged (source behavior is unchanged) — only scenarios are added, so the delta uses MODIFIED with the full requirement block restated plus two new `#### Scenario:` entries. **Alternative rejected:** a new `image-search` capability spec — rejected as duplicate ownership of behavior `server-endpoint-authorization` already governs (specs rule: constraints belong in the capability that owns the behavior).

### Decision 6: The `testing-foundation` delta is Tier 2 (archive-only), mirroring 4.13.

Per the parent `test-coverage` design D13 two-tier rollup, a carve-out bookkeeping record stays in the sub-proposal's archive directory and does NOT roll into the parent accumulator or modify the active `testing-foundation` spec. This change's record notes the §5.1 carve-out is satisfied at `COVERAGE_FLOOR`, reconciled with 4.13's file, with the rate-limit window/per-user semantics now behaviorally locked.

## Risks / Trade-offs

- **[Fake-timer leakage across tests]** → wrap the window-reset test's timer use in `try { … } finally { vi.useRealTimers() }`, matching the existing `ExpiredCacheEntry` test, so a failure can't strand fake timers for sibling tests.
- **[`vi.resetModules()` per `loadRoute` resets the module-singleton bucket]** → both new tests must spend their budget *within a single `loadRoute` instance* (one `GET` handler reference) — re-importing mid-test would reset the bucket and mask the behavior. The harness's existing one-`loadRoute`-per-test shape already enforces this.
- **[Over-speccing `server-endpoint-authorization`]** → kept to two scenarios under an existing requirement with unchanged text; no new requirement, no new capability. Proportionate to the invariants discovered.
- **[Per-process bucket is not multi-replica durable]** → out of scope and already an accepted residual in the requirement; the tests assert single-process semantics only and do not claim distributed correctness.

## Migration Plan

Not applicable — test-only change plus spec deltas. No runtime/deploy/rollback surface. Rollback is reverting the two appended tests and the two delta files.

## Open Questions

_None._ The apply step confirms Decision 4 (no source change) empirically; if a seam is required, the no-backdoor rule decides its shape.
