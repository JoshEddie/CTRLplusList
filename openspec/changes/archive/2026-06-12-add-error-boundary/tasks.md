# Tasks — Add App-Level Error Boundary

## 1. (main) route boundary

- [x] 1.1 Create `app/(main)/error.tsx` (`'use client'`): friendly heading + message, `Button` retry calling `reset()`, `LinkButton` to `/`, digest line when `error.digest` present, no `error.message` rendered; styled with existing `global.css` tokens (no new tokens)

## 2. Root global-error fallback

- [x] 2.1 Create `app/global-error.tsx` (`'use client'`): self-contained `<html>`/`<body>`, plain-markup message, dependency-free retry button calling `reset()`, digest line when present

## 3. Tests (per TESTING.md)

- [x] 3.1 Unit tests for `(main)/error.tsx`: renders heading/message inside boundary, retry invokes `reset`, home link href `/`, digest shown when present and omitted when absent, raw `error.message` not rendered
- [x] 3.2 Unit tests for `global-error.tsx`: self-contained document renders, retry invokes `reset`, digest handling
- [x] 3.3 Unit tests for `dev-error/page.tsx`: throws under `USE_PG_DRIVER=1`, calls `notFound()` otherwise

## 4. Verification of boundary behavior

- [x] 4.1 Create permanent fixture route `app/(main)/dev-error/page.tsx`: throws on server render when `USE_PG_DRIVER === '1'`, `notFound()` otherwise (design D6)
- [x] 4.2 Playwright spec `e2e/error-boundary.auth.spec.ts`: `/dev-error` renders styled boundary (heading, retry, home link, digest) inside app frame, not Next's default page
- [x] 4.3 Verify in production build (`next build && next start` under local mode) that a thrown server render error in a `(main)` route shows the styled in-chrome boundary, not Next's default page

## 5. Pre-merge

- [x] 5.1 `npm run lint` — zero errors; only the two pre-existing yellow size advisories (tolerated class) on untouched files
- [x] 5.2 `npx tsc --noEmit` — zero errors
- [x] 5.3 `npm run build` — completes successfully
- [x] 5.4 `npm run test:coverage` — zero failing tests, coverage 100% statements/lines/functions
- [x] 5.5 `npm run test:e2e` — 35 passed, zero failing
