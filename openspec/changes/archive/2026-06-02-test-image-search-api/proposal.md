## Why

Sub-proposal 5.1 of the `test-coverage` initiative — the **`app/api/image-search/route.ts` API-route carve-out**. Parent `tasks.md` §5.1 names three behaviors to pin: the auth gate, the per-user 30/min token bucket, and the `rate_limited`-vs-`quota_exceeded` error-shape distinction — with the mandatory rule that the upstream provider is mocked at the `fetch` boundary and the real upstream is NEVER called from tests or CI.

**Reconciliation at proposal time.** The carve-out's test file already exists. Sibling sub-proposal **4.13 `test-server-endpoint-authorization`** (archived `2026-06-01`) delivered `app/api/image-search/__tests__/route.test.ts` at the universal `COVERAGE_FLOOR` (measured at HEAD: `statements 100% / branches 97.82% / functions 100% / lines 100%`), with its `vitest.config.ts` per-file threshold and `eslint.config.mjs` `sonarjs/cognitive-complexity = error` entry, and made `CACHE_MAX_ENTRIES` env-tunable for testability. 4.13 approached the route on its **authorization axis** (authenticated / unauthenticated) and, in doing so, already asserts the §5.1 auth gate (401), the budget-exceeded rejection (429 `rate_limited`), the query-length cap (400 `query_too_long`), provider success/cache, and the full `quota_exceeded` fall-through chain — all with `fetch` stubbed. **This carve-out does not re-author that file; it verifies §5.1's invariants are met at HEAD and closes the one behavioral gap 4.13's axis left open.**

**The gap — the per-user / per-minute semantics are coverage-green but behaviorally unasserted.** The active `server-endpoint-authorization` spec (lines 102–111) already requires a *per-user* budget enforced *within the bucket window*, but the landed tests exercise neither half of that contract: every rate-limit assertion uses a single user inside a single un-advanced window. Branch coverage is satisfied by short-circuit evaluation of `!bucket || bucket.resetAt <= now` (the `||` operand is reached, but `bucket.resetAt <= now` is never *true*), so the window-reset path and the per-user keying are both green without ever being exercised. Per [TESTING.md](TESTING.md), coverage is not the bar — "would this test fail if the production code were subtly wrong" is. Today, deleting the window reset or collapsing the per-`users.id` bucket into a single global counter would keep every test passing. Those are exactly the two invariants §5.1's "per-user 30/min token bucket" phrase names.

Inherited binding constraints (grepped across active specs):
- `server-endpoint-authorization` (lines 86–116) — the route SHALL `await auth()` (401), SHALL enforce a per-user budget returning 429 `{ error: 'rate_limited' }` distinct from upstream `{ error: 'quota_exceeded' }`, and SHALL length-cap `?q=` at 200 (400). This carve-out's new scenarios pin the per-user and per-window facets the requirement already implies.
- `testing-foundation` — `__tests__/` colocation, `.test.ts` → **node** project, universal `COVERAGE_FLOOR`, no-backdoor rule, four-gate pre-merge, assertion-substance bar, `<State>_<Behavior>` it-naming + three-role describes, and the **"Tests SHALL NOT call rate-limited external services"** requirement whose Image-search scenario mandates `fetch`-boundary interception with no real upstream call.

## What Changes

- Append two behavioral tests to the existing `app/api/image-search/__tests__/route.test.ts`, both with `fetch` stubbed (no real upstream):
  - **Window reset** — an authenticated user who has spent their budget can search again after the bucket window elapses (drives `bucket.resetAt <= now` to *true* via fake timers), asserting the budget refills rather than staying exhausted forever.
  - **Per-user isolation** — user A exhausting their 30-request budget does NOT rate-limit user B; B's request still reaches the (mocked) provider and returns 200. Asserts the bucket is keyed per `users.id`, not global.
- Add the two facets as scenarios under the existing per-user-rate-limiting requirement in `server-endpoint-authorization`, so the contract test-pins what it currently only implies.
- Record the §5.1 carve-out bookkeeping in `testing-foundation` (Tier 2, archive-only): the image-search-api carve-out is satisfied at the universal `COVERAGE_FLOOR`, reconciled with 4.13's landed file, with the rate-limit window/per-user semantics now behaviorally asserted.
- No source change to `app/api/image-search/route.ts` is anticipated (the `IMAGE_SEARCH_CACHE_MAX_ENTRIES` testability seam already exists from 4.13; the window-reset path is reachable with fake timers, and per-user keying is reachable with a second seeded user — both without a backdoor). The verification audit below confirms this; if a genuine seam is found necessary it follows the no-backdoor disposition rule.

## Capabilities

### New Capabilities

_None._ The route's normative behavior is already governed by `server-endpoint-authorization`; the test program's rules are governed by `testing-foundation`. No new capability is introduced.

### Modified Capabilities

- `server-endpoint-authorization`: ADD two scenarios under the existing "API route handlers consuming paid third-party quota SHALL apply per-user rate limiting" requirement — (1) the budget window resets after its interval, and (2) one user's exhaustion does not affect another user. The requirement text is unchanged; the scenarios pin facets it already implies. (Source behavior is unchanged — this is contract-hardening, not a behavior change.)
- `testing-foundation`: ADD a Tier-2 (archive-only) carve-out bookkeeping record for sub-proposal 5.1 `test-image-search-api`, mirroring 4.13's record style. Does NOT roll into the parent `test-coverage` accumulator and does NOT modify the active `testing-foundation` spec.

## Impact

- **Test files:** `app/api/image-search/__tests__/route.test.ts` — two appended tests (file already owned/created by 4.13). No new test file.
- **Source:** `app/api/image-search/route.ts` — none anticipated (verified during apply).
- **Config:** none — the route is already enumerated in `vitest.config.ts` per-file `thresholds` and `eslint.config.mjs` `sonarjs/cognitive-complexity = error` (added by 4.13). The carve-out stays at the universal `COVERAGE_FLOOR`.
- **Specs:** delta files under `openspec/changes/test-image-search-api/specs/` for `server-endpoint-authorization` (MODIFIED requirement with two added scenarios) and `testing-foundation` (ADDED bookkeeping record).
- **Mocking boundary:** upstream SerpAPI / Serper `fetch` stays intercepted via `vi.stubGlobal('fetch', …)`; the real upstream is never called — CI and local runs make zero metered provider requests.
- **Parent:** flips `test-coverage` `tasks.md` §5.1. **Closes when** `openspec archive test-image-search-api` runs.
