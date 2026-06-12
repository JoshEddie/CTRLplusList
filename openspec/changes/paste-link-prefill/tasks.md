# Tasks — paste-link-prefill

## 1. Schema & data layer

- [ ] 1.1 Add nullable `price_fetched_at` (timestamp), `canonical_url` (text), `currency` (text) to `item_stores` in `db/schema.ts`; generate the additive Drizzle migration (read DATABASE.md first — neon-http, no transactions)
- [ ] 1.2 Extend the store Zod schema in `lib/data/item.schema.ts` with the three optional provenance fields (null/omitted for manual rows)
- [ ] 1.3 Pass provenance fields through `updateItemStores` in `lib/data/item.associations.ts` and the create/update paths in `lib/data/item.actions.ts` (no new cache tags — `updateTag('items')` already covers freshness)

## 2. ProductFetcher seam (`lib/product-fetch/`)

- [ ] 2.1 Create `lib/product-fetch/types.ts` with the normalized result `{ title, description?, imageUrl?, price?, currency?, canonicalUrl?, store }` and error shapes
- [ ] 2.2 Implement `tier1.ts`: server-side fetch (browser-like UA, follow redirects, ~6s timeout) + JSON-LD `Product` extraction (incl. `@graph`) with OpenGraph/meta + `<link rel="canonical">` regex fallback; price emitted only when strictly numeric
- [ ] 2.3 Implement `zyte.ts`: `POST https://api.zyte.com/v1/extract` with basic auth `ZYTE_API_KEY`, body `{url, product: true, followRedirect: true}`; skipped when key unset; normalize response
- [ ] 2.4 Implement `index.ts` `fetchProduct(url, {signal})` waterfall (tier 1 → tier 2 when no title) under one ~20s abort, plus hostname→store-name prettifier (small known-retailer map, hostname fallback)
- [ ] 2.5 Unit tests (per TESTING.md): JSON-LD fixtures (plain + `@graph`), OG fallback, non-numeric price dropped, missing-key skips Zyte, timeout abort, redirect handling, store-name derivation

## 3. API endpoint

- [ ] 3.1 Create `app/api/product-fetch/route.ts` (POST): `await auth()` → 401; body `url` length-cap 2048 + http(s) validation → 400; SSRF guard (localhost / literal IP / private hosts) → 400; per-user token bucket 10/min → 429 `{error:'rate_limited'}`; `export const maxDuration = 60`; no cache revalidation on any path
- [ ] 3.2 Route tests: 401 unauthenticated, 400 oversized/malformed/private URL, 429 over-limit, success and `{ok:false,error:'timeout'}` passthrough from a mocked seam

## 4. Modal UI states

- [ ] 4.1 Add the create-only phase machine (`'url' | 'fetching' | 'form'`) in `ItemFormContainer.tsx` / `ItemForm.tsx`; edit mode opens straight to `'form'`; `FormShell` dismiss + `returnTo` plumbing untouched
- [ ] 4.2 Build `UrlEntryStep` (FormField + TextField `type="url"`, primary "Fetch Details" Button, "Fill in details manually →" link variant, client-side URL validation error)
- [ ] 4.3 Build `FetchingStep` (`<LoadingIndicator size="form">`, cycling messages ~2.5s with fade outside any live region, static "This may take a moment.", URL strip with "change", footer Cancel aborting via `AbortController` and returning to `'url'`)
- [ ] 4.4 Wire success: map result into `useItemForm` initial values (name, description, imageUrl, one store row `{name: store, price, link: pastedUrl}` + provenance), render "Fetched from {store}" badge with change affordance; drop `price_fetched_at` when the user edits the prefilled price
- [ ] 4.5 Wire failure/timeout: manual form with "couldn't fetch automatically" notice, pasted URL prefilled into store-row Link, "← Use a link instead" escape back to `'url'`
- [ ] 4.6 CSS for the new states using existing `global.css` / `--field-*` tokens (no new one-off interactive-surface classes)
- [ ] 4.7 Component tests for the phase machine: create opens at `'url'`, edit skips it, manual toggle both directions, cancel/change abort, success prefill mapping, failure fallback with notice

## 5. Price-as-of display

- [ ] 5.1 Render the muted "price as of {date}" annotation on item-form store rows when `price_fetched_at` is non-null (owner-facing form only); test annotation present/absent per provenance

## 6. Config & docs

- [ ] 6.1 Add `ZYTE_API_KEY` handling: read from env in `zyte.ts`, document in CLAUDE.md-adjacent env docs that it lives in Vercel env + gitignored `.env*.local` (never `e2e/.env`)
- [ ] 6.2 Confirm e2e suites unaffected (no e2e hits Zyte; any flow test stubs `/api/product-fetch` via Playwright route interception)

## 7. Pre-merge

- [ ] 7.1 `npm run lint` — zero errors, zero warnings (file-size bands respected)
- [ ] 7.2 `npx tsc --noEmit` — zero errors
- [ ] 7.3 `npm run build` — completes successfully
- [ ] 7.4 `npm run test:coverage` — zero failing tests, coverage reported
- [ ] 7.5 `npm run test:e2e` — zero failing tests
