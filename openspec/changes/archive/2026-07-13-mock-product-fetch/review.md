---
review: spec-review
target: mock-product-fetch
anchor: fddfd3355dac8dcd094a37c5c9db88d81e1b0a55
diff-source: git diff --staged
round: 4
---

## Round 1 — spec-review (2026-07-13)

Implementation is clean and the contract is honored — the mock seam sits ahead of the real path, the route reorder stops invalid bodies from consuming tokens, and the spec/design/tasks trilogy is consistent (`openspec validate --strict` passes). Three fixable findings: one untested spec-required branch masked by a whole-file coverage exclusion, one test whose name overclaims, and a duplicated design sentence.

**Scope:** `git diff --staged` · mock-product-fetch (active)

### Standard
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| S1 | Minor | [design.md:63](openspec/changes/mock-product-fetch/design.md:63) | D5's closing sentence — "This is a deliberate, spec-recorded exception to 'the route contains no mock logic' — recorded as a delta on `product-link-prefill`." — is duplicated verbatim back-to-back (copy-paste stutter). | Fix now | design.md:63 sentence repeated verbatim; doc clarity |

### Convention
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| C1 | Major | [vitest.config.ts:91](vitest.config.ts:91) · [mock.ts](lib/product-fetch/mock.ts) | `lib/product-fetch/mock.ts` is whole-file coverage-excluded on the rationale "gating behavior is asserted through its callers," but the unknown-scenario fallback (`?? { ok: false, error: 'fetch_failed' }`) — a normative Scenario ("Unknown scenario fails like a dead link") — is exercised by no seam or route test. The exclusion blinds the coverage gate to a spec-required behavior shipping untested. | Fix now | TESTING.md "would this test fail if the production code were subtly wrong"; product-fetch-mock spec SHALL return `{ ok: false, error: 'fetch_failed' }` for an unrecognized scenario |
| C2 | Minor | [route.test.ts:207](app/api/product-fetch/__tests__/route.test.ts:207) | `NonLocalMockHost_ConsumesBucketAndReachesSeam` issues one request and asserts 200 + `fetchProduct` args (ReachesSeam). Nothing asserts the bucket was consumed — that needs driving past the 10/min limit. The name's "ConsumesBucket" half claims a behavior the body never checks. | Fix now | TESTING.md precision: "both halves of a name MUST be as specific as the test's assertions" |

### Contract
_none_

## What looks good
- Seam wired at the top of `fetchProduct` — real path genuinely untouched when the resolver passes through; covered by `LocalModeRealHost_TakesRealPath`.
- Route reorder (auth → parse → mock → bucket → seam) is exactly the design's ordering; `InvalidUrl_Returns400-BucketUntouched` proves validation failures don't spend tokens.
- `mock.test/rate-limited` → route-level 429 and mock bypass of the bucket (11+ requests keep resolving) both tested.
- Piggybacked workflow-doc fix (trunk-workflow delta / SKILL.md / CLAUDE.md) states one consistent contract — task 4.4 verified, no drift found.

## Verdict
Request changes — not yet clear to archive (blockers: C1 untested spec-required branch; C2, S1 fixable in place). No CI gate on a staged-diff review — the five local gates and `test:e2e` are the owner's landing gate. Task 3.4 (manual scenario click-test) remains the owner's live-deploy step.

---
Would you like me to enter OpenSpec explore mode to investigate these findings — verify every disposition (Drops included), recommend which to fix, and weigh how each fix would land (pros/cons)?

## Round 2 — recheck (2026-07-13)

Fix delta: unstaged working tree (`git diff`) — 3 files (`design.md`, `index.test.ts`, `route.test.ts`), all inside the round-1 diff. No escalation tell.

| # | Prior finding | Status | Notes |
|---|---------------|--------|-------|
| C1 | Untested unknown-scenario fallback (`?? { ok: false, error: 'fetch_failed' }`) masked by whole-file coverage exclusion | resolved | Two seam tests added in [index.test.ts:138](lib/product-fetch/__tests__/index.test.ts:138): `LocalModeUnknownScenario_ReturnsFetchFailedWithoutFetch` (unknown segment → `FIXTURES[...]` undefined) and `LocalModeEmptyScenario_ReturnsFetchFailedWithoutFetch` (`mock.test/` → `?? ''` empty segment). Both assert `{ ok: false, error: 'fetch_failed' }` and `fetchMock` not called — the fallback is now exercised through the seam, the exact gap C1 named. |
| C2 | `NonLocalMockHost_ConsumesBucketAndReachesSeam` name overclaims (nothing asserts bucket consumed) | resolved | Renamed to `NonLocalMockHost_TakesRealPath` at [route.test.ts:207](app/api/product-fetch/__tests__/route.test.ts:207); body (non-local host → real path → `fetchProduct` called with url) now matches both name-halves. |
| S1 | Duplicated design sentence (copy-paste stutter) | resolved | Second copy removed at [design.md:60](openspec/changes/mock-product-fetch/design.md:60). |

**Verdict:** clear to land

## Round 3 — recheck (2026-07-13)

No open `Fix now` finding remained after Round 2 (C1/C2/S1 all resolved), so there is nothing to re-verify. The delta since Round 2 is **new scope, not a fix** — it adds normative contract and production behavior no prior round reviewed:

- `lib/product-fetch/mock.ts` — two new fixtures `success-title-warn` (title `TITLE_SNAPPY`–`TITLE_MAX` → warn tier + inline note) and `success-no-price` (omit `price` → price step + triage "Not set"); `LONG_DESC` re-commented as a description-drop guard.
- `specs/product-fetch-mock/spec.md` — two new `SHALL` scenarios (warn-tier title, missing price), a reworded long-desc scenario (drop-guard framing), and a new "no invalid-store scenario" unreachability clause.
- `tasks.md` — new task 1.4 (marked `[x]`), reworded 3.4.

| # | Prior finding | Status | Notes |
|---|---------------|--------|-------|
| — | _none open after Round 2_ | — | Round 2 cleared C1/C2/S1; no finding to recheck. |

**Escalation tell:** the delta is unreviewed ground — new fixtures, new normative scenarios, a new task — outside what any round audited. A recheck may not verify contract+code it has never seen, and Round 2's `clear to land` must not stand as the latest verdict while this scope sits unreviewed in the tree.

**Verdict:** outgrew recheck — run a full `/spec-review` on the current staged diff to audit the added fixtures, the new spec scenarios (contract consistency + task completion), and their test coverage before landing.

## Round 4 — owner manual review (2026-07-13)

Owner reviewed the Round-3 out-of-scope delta manually (new `mock.ts` fixtures `success-title-warn` / `success-no-price`, the two added `SHALL` scenarios + unreachability clause in `product-fetch-mock/spec.md`, new task 1.4) and judged a full `/spec-review` re-run not worth the cost for a minor, dev-only mock change. This round records that override; it does not re-audit.

Follow-up noted by owner: extend the `recheck` skill to handle minor `outgrew recheck` states without forcing a full re-review.

**Verdict:** clear to land
