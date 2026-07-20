---
review: spec-review
target: single-store-dal-boundary
anchor: 972042e3b2bc25d51701c075e5b7143501e16131
diff-source: git diff --staged
round: 2
---

# /spec-review — single-store-dal-boundary

Clean array→scalar store refactor across the DAL, deck, and purchase-modal surfaces; standard and contract audits found nothing, only two Minor stale-terminology / test-gap notes both dispositioned out of this round. Contract: all 16 tasks `[x]`, `openspec validate --strict` passes.

**Scope:** `git diff --staged` · single-store-dal-boundary (active)

## Findings

### Standard
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| _none_ | | | | | |

### Convention
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| C1 | Minor | `deck/__tests__/FocusEditor.test.tsx:91` (also StoreCard/PriceCard tests) | Stale single-store-era test names survive the array→scalar refactor: `NoStoreRow_*` now builds an empty store **object** (no "row" in the scalar model); `*OnPrimaryStore` / `*ToPrimaryStore` implies selecting among multiple stores that no longer exist. Names no longer describe the tests. | Fix now (escalated from File issue; fixed this round) | TESTING.md precision principle; MEMORY "Name tests from what they do" |
| C2 | Minor | `lib/data/item.ts:172`, `lib/data/purchase.ts:197` | `getItemsByListId` and `getItemsByPurchased` now emit scalar `store: primaryStore(stores)`, an observable output-shape change, but no test asserts scalar `store` at these two mapper sites. Same mapping is covered at `getItemsByUser`/`getItemById` + `primaryStore` unit tests, so risk is low; wiring here is unverified. | Fix now (escalated from File issue; fixed this round) | TESTING.md "assert observable behavior" |

### Contract
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| _none_ | | | | | |

## What looks good
- Array→scalar store shape collapsed to one home (`primaryStore(stores)`) — DAL mappers, view model, deck cards, and purchase modal all consume the single accessor; no shape drift.
- Contract fully satisfied: 16/16 tasks `[x]`, `openspec validate single-store-dal-boundary --strict` passes.
- Standard audit (security/perf/correctness/maintainability) surfaced nothing.

## Verdict
Approve — clear to archive once dev-push CI is green (build + e2e deferred there per tasks.md 6.1). Tasks all `[x]`, `openspec validate --strict` passes. CI unverified in this non-PR pass — re-check on the dev push before sealing.

**Post-review escalation (explore mode):** both C1 and C2 were escalated from `File issue` → `Fix now` and fixed in this round. Rationale: both are direct, in-scope loose ends of *this* refactor (C1 = stale multi-store test names the array→scalar rename left behind; C2 = the change's headline scalar `store` field unasserted at 2 of 4 mapper sites), test-only and cheap, so folded into the change rather than deferred. C1: renamed `NoStoreRow_*`→`EmptyStore_*`, `*OnPrimaryStore`/`*ToPrimaryStore`→`*Store` across FocusEditor/StoreCard/PriceCard tests. C2: added `*_MapsScalarPrimaryStore` assertions to the `getItemsByListId` and `getItemsByPurchased` blocks. All affected suites green (63 tests).

---

## Round 1 — spec-review (2026-07-18)

_Full multi-agent review (standard / convention / contract). Findings and verdict as above._

## Round 2 — recheck (2026-07-20)

Fix delta: unstaged working tree (`git diff` off staged baseline `972042e`) — 5 test files, all within the original review scope, test-only. No escalation tell fired.

| # | Prior finding | Status | Notes |
|---|---------------|--------|-------|
| C1 | Stale single-store-era test names (`NoStoreRow_*`, `*OnPrimaryStore`, `*ToPrimaryStore`) across FocusEditor/StoreCard/PriceCard tests | resolved | Renamed to `EmptyStore_*` and `*Store` / `*CallsSetStore`; zero residual old names in the working tree. |
| C2 | Scalar `store` output unasserted at `getItemsByListId` / `getItemsByPurchased` mapper sites | resolved | `ItemWithStores_MapsScalarPrimaryStore` (item.test.ts:250 → `getItemsByListId`) and `PurchasedItemWithStores_MapsScalarPrimaryStore` (purchase.test.ts:69 → `getItemsByPurchased`) both assert `rows[0].store?.name === 'cheap'` (primary by lowest `order`). |

No new findings. All 5 affected suites green (63 tests).

**Verdict:** clear to land
