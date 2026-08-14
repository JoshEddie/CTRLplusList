# Tasks: mock-product-fetch

## 1. Mock module

- [x] 1.1 Create `lib/product-fetch/mock.ts`: `Scenario` union, `MOCK_HOSTNAME = 'mock.test'`, and the local-mode check (`USE_PG_DRIVER === '1'`) — no new flag, no boot guard
- [x] 1.2 Add fixtures typed `Record<Scenario, ProductResult>` covering `success`, `success-single-image`, `success-long-title`, `success-long-desc`, `success-no-image`, `success-many-images`, `fetch-failed`, `timeout` (image URLs via `https://picsum.photos/seed/<stable-id>/400/400`; many-images fixture holds 10 entries, first equals `imageUrl`; long-desc ≥ `DESCRIPTION_MAX`)
- [x] 1.4 Add two title/price-tier fixtures the initial set missed: `success-title-warn` (title `TITLE_SNAPPY`–`TITLE_MAX` → warn tier + inline note) and `success-no-price` (omit `price` → price step + triage "Not set"). Re-comment the `success-long-desc` `LONG_DESC` fixture as a *drop guard* (the deck discards a fetched description via `seedFromFetch`) — not a long-description render
- [x] 1.3 Export a resolver (`resolveMockResult(url)` or similar): local mode + `mock.test` host → fixture by first path segment, unknown scenario → `{ ok: false, error: 'fetch_failed' }`; otherwise signals pass-through

## 2. Seam + route integration

- [x] 2.1 Wire the mock branch at the top of `fetchProduct` in `lib/product-fetch/index.ts` — return the resolver's result before any retry/timeout setup; real path untouched when the resolver passes through
- [x] 2.2 Reorder `app/api/product-fetch/route.ts` to auth → parse/validate → mock handling → bucket → seam, so validation failures stop consuming rate-limit tokens
- [x] 2.3 Add the local-mode `mock.test` handling to the route: bypass `checkRateLimit` for mock requests; scenario `rate-limited` → 429 `{ error: 'rate_limited' }`; both dead-branch outside local mode

## 3. Tests

- [x] 3.1 Mock module gating covered via its callers (seam + route tests); `lib/product-fetch/mock.ts` coverage-excluded as dev-only tooling — no dedicated fixture-shape test file (owner decision during apply)
- [x] 3.2 Unit tests for the seam branch in `lib/product-fetch/__tests__/`: local-mode `mock.test` URL returns fixture with zero `fetchZyte` calls; non-mock host takes the real path in local mode
- [x] 3.3 Route tests: mocked `rate-limited` returns 429 on first request without consuming a token; mock requests never trip the bucket (11+ in a minute keep resolving); invalid body/URL returns 400 without consuming a token; non-local `mock.test` request follows the real path
- [x] 3.4 Manual verification via `npm run dev:local`: paste each scenario URL, confirm the mapped downstream UI state (deck, single-image skip, title error hard-block, title warn + inline note, no-price price step, long-desc → empty note (drop confirmed), no-image, selector overflow, timeout screen ×2, retry banner)

## 4. Docs + piggybacked workflow fix

- [x] 4.1 Add a CLAUDE.md section for the mock (magic URLs, scenario table pointer, local-mode keying) alongside the existing local-dev bypass notes
- [x] 4.2 Update `.claude/skills/start-change/SKILL.md`: explore route = interactive session only, owner-approved write-back then stop, never chains into propose; propose grill concludes only on explicit owner confirmation (done in-session when the defect surfaced)
- [x] 4.3 Update CLAUDE.md § Change lifecycle step 1 to match the split routes (done in-session)
- [x] 4.4 Verify the `trunk-workflow` delta, SKILL.md, and CLAUDE.md all state the same contract — no drift between the three

## 5. Pre-merge

- [x] 5.1 `npm run lint` — zero errors, zero non-size warnings
- [x] 5.2 `npx tsc --noEmit` — zero errors
- [x] 5.3 `npm run build` — completes successfully
- [x] 5.4 `npm run test:coverage` — zero failing tests, coverage reported
- [x] 5.5 `npm run test:e2e` — zero failing tests
