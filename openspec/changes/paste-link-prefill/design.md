# Design — paste-link-prefill

## Context

Issue [#142](https://github.com/JoshEddie/CTRLplusList/issues/142); wireframes from the `link-paste-auto-fill` design bundle (states 1, 2a, 3, 4). The New Item modal today opens directly into the split form (`ItemForm.tsx` inside `FormShell`, state managed by `useItemForm`, submit via `createItem` server action). There is no URL/metadata fetch anywhere in the codebase; the closest analog is `app/api/image-search/route.ts` (auth gate + per-user in-memory token bucket + external paid API).

`item_stores` rows are `{id, item_id, name, link, price (text), order}`. No provenance columns exist.

Chat-transcript intent locked during design iteration (binding UX decisions, not re-litigable at apply time):

- Loading state is spinner-only — no progress bar (nothing to time against), no skeleton fields, no time promises ("up to 30 seconds" rejected).
- Cycling messages every ~2.5s with fade, plus a static "This may take a moment." line below them.
- The pasted link populates the store row's Link field after fetch.

## Goals / Non-Goals

**Goals:**

- One-paste item creation: URL → fetched title/image/price prefill the existing form, all editable.
- Swappable `ProductFetcher` seam (tier 1 free parse → tier 2 Zyte → tier 3 manual) so vendors can change without touching UI.
- UI states factored so phase 2 (multi-URL pending cards) reuses pending/resolved/manual-fallback states without rework.
- Price provenance recorded (`price_fetched_at`, `canonical_url`, `currency`) for phase 2 dedupe/staleness.

**Non-Goals:**

- Multi-URL concurrent add, staleness refresh, stale/dead-link flag writes, image copying to own storage (all #141 phase 2).
- Editing flow changes — URL-first state appears only for *create*; edit opens the form directly as today.
- Currency display/conversion — currency is stored when known, display stays `$`-formatted as today.

## Decisions

### D1 — Endpoint: `POST /api/product-fetch` route handler, not a server action

Server actions queue serially per client and aren't cancelable; a route handler lets the client `AbortController`-cancel (Cancel button) and lets us set `export const maxDuration = 60` (comfortably above the ~20s app-side abort). Mirrors `image-search`'s auth + rate-limit shape, satisfying `server-endpoint-authorization` (auth at entry, per-user bucket → 429, body URL length-capped → 400, no cache revalidation on rejection). POST with JSON body (URLs routinely exceed query-string comfort; the spec's length-cap rule is applied to the body field — cap at 2048 chars).

Response: `{ ok: true, product: { title, description?, imageUrl?, price?, currency?, canonicalUrl?, store } }` or `{ ok: false, error: 'fetch_failed' | 'invalid_url' | 'rate_limited' | 'timeout' }`. `store` is derived from the final hostname (e.g. `amazon.com` → "Amazon") with a small known-retailer prettifier, falling back to bare hostname.

Rate limit: 10/min per user (paid Zyte quota; far above single-item paste cadence, low enough that a runaway client can't burn credit — tunable constant).

### D2 — `ProductFetcher` seam in `lib/product-fetch/`

`lib/product-fetch/index.ts` exports `fetchProduct(url, {signal}): Promise<ProductResult>` running the waterfall; `tier1.ts` (server-side `fetch` + JSON-LD/OpenGraph parse), `zyte.ts` (tier 2 client). Lives under `lib/` (not `lib/data/` — it's not a DB read/action module; `data-layer-organization` governs `lib/data/` only). Route handler is a thin wrapper. Alternate vendors (Apify) swap inside the seam.

Rejected: putting parse logic in the route file — untestable without HTTP and bloats toward the 400-line red band.

### D3 — Tier 1 parsing: `cheerio`-free, regex + JSON scan

Tier 1 fetches the page HTML (browser-like `User-Agent`, `redirect: 'follow'`, ~6s timeout) and extracts:

1. `<script type="application/ld+json">` blocks → parse JSON, find `@type: Product` (also inside `@graph` arrays) → `name`, `description`, `image`, `offers.price`/`priceCurrency`, canonical from `url`.
2. Fallback: OpenGraph metas (`og:title`, `og:description`, `og:image`, `product:price:amount`/`currency`) and `<link rel="canonical">` via targeted regex.

No new HTML-parsing dependency: JSON-LD is the high-value path and is plain JSON; the meta-tag fallback is regular enough for anchored regex. If tier 1 yields no title, fall to tier 2. Rejected: adding `cheerio`/`linkedom` — a real dependency for what is two extraction patterns; revisit if fallback regex proves brittle.

### D4 — Tier 2 Zyte: only when configured, single POST

`POST https://api.zyte.com/v1/extract`, basic auth `ZYTE_API_KEY`, body `{url, product: true, productOptions: {extractFrom: httpResponseBody}, followRedirect: true}`. Skipped entirely (waterfall: tier 1 → fail) when `ZYTE_API_KEY` is unset — local dev and e2e work without the key. Overall app-side abort at 20s across the whole waterfall; on abort/timeout the route returns `{ok: false, error: 'timeout'}` and the client falls to manual entry with the "couldn't fetch automatically" notice.

`followRedirect: true` is load-bearing: Amazon share links (`a.co/...`) redirect to the product page.

### D5 — UI: pre-form phase machine inside the existing modal

`ItemForm` gains a create-only phase: `'url' | 'fetching' | 'form'` (edit mode and prefilled-failure both start at `'form'`/manual). New page-scoped components in `app/(main)/items/ui/components/itemform/`:

- `UrlEntryStep` — `FormField` + `TextField type="url"` + `<Button variant="primary">Fetch Details</Button>`, "Fill in details manually →" as `button-system` `link` variant. Renders inside the same `FormShell` (narrow body), so shell dismiss/footer contracts are untouched.
- `FetchingStep` — `<LoadingIndicator size="rail">` (shared primitive, unmodified) with adjacent cycling-message text node (component-local `useEffect` interval, fade via opacity transition, `aria-live` handled by the indicator's existing status region — message text is decorative, cycling outside the live region to avoid SR spam), static "This may take a moment.", URL strip with "change" (returns to `'url'`), footer Cancel aborts the in-flight request (`AbortController`) and returns to `'url'`.
- Manual entry state = existing form, plus a "← Use a link instead" escape (link-variant button) shown only when create-mode arrived via manual/failure path.

On success: map product → `useItemForm` initial values (name, description, imageUrl, one store row `{name: store, price, link: pastedUrl}` + provenance fields held in hook state) and a "Fetched from {store}" badge above the form. The phase machine lives in the container so phase 2 can lift it out to drive multiple pending cards.

Rejected: skeleton split-layout loading (wireframe 2b) — explicitly rejected by user in design chat.

### D6 — Schema: three nullable columns on `item_stores`, no item-level columns

`price_fetched_at timestamp`, `canonical_url text`, `currency text` — all nullable, null for manual rows. Provenance belongs to the store row (the price/link live there), not `items`. Migration is additive-only → zero-downtime, no backfill, trivially rollback-safe. `lib/data/item.schema.ts` Zod store schema gains the optional fields; `item.associations.ts updateItemStores` passes them through; create/update actions unchanged otherwise (existing `updateTag('items')` covers freshness). Store validity rule (`item-store-links`) unchanged: name + link + numeric price.

"Price as of {date}": rendered where store price displays (owner item card/form), only when `price_fetched_at` non-null — delta spec on `item-store-links`.

### D7 — Config & local dev

`ZYTE_API_KEY` in Vercel env + gitignored `.env*.local` (never `e2e/.env`). E2e and unit tests never hit Zyte: unit tests fixture tier-1 HTML and mock `fetch`; any e2e touching the flow stubs `/api/product-fetch` via Playwright route interception. Under the dev bypass the session resolves to `dev-test-viewer`, so the route works in local preview.

## Risks / Trade-offs

- [Zyte latency tail 10–30s] → 20s app-side abort + `maxDuration = 60`; UX is honest (no time promises), Cancel always available.
- [Tier-1 regex fallback misparses exotic markup] → JSON-LD primary path is structured; fallback failures degrade to tier 2 or manual entry, never to wrong-but-silent data (price parsed strictly numeric, else dropped).
- [In-memory rate limit resets per serverless instance] → accepted, same as `image-search`; cost backstop is Zyte's per-success billing + low bucket size.
- [SSRF via user-supplied URL on tier 1] → validate http(s) scheme, reject literal IPs/localhost/private hosts before fetching; tier 2 fetches from Zyte's network, not ours.
- [Hostname→store-name prettifier drifts] → tiny constant map + hostname fallback; wrong names are user-editable in the form.
- [Phase machine entangles with `useItemForm`] → phases held in container above the hook; hook only gains optional initial values + provenance passthrough.

## Migration Plan

1. Additive Drizzle migration (3 nullable columns) — deployable independently, no code depends on it until UI ships.
2. Endpoint + seam land behind no flag (unreachable until UI references it).
3. UI change last. Rollback = revert UI commit; columns and endpoint are inert.

## Open Questions

- None blocking. Loading-message copy is placeholder-quality per design chat ("feel free to swap in whatever copy feels most natural") — final copy at apply time.
