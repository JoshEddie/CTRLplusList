# Paste-to-prefill: single-item product link import

GitHub issue: [#142](https://github.com/JoshEddie/CTRLplusList/issues/142) (sub-issue of #141). Design handoff bundle: `link-paste-auto-fill` (wireframes.html, chat transcript) — states 1, 2a, 3, 4 are in scope; the multi-URL state is future-only context.

## Why

Adding an item today means hand-typing name, description, image URL, store, price, and link — the most common real-world flow is "I found it on Amazon/Etsy/Target, here's the link." Pasting a product URL should auto-fill title, image, and price, cutting item creation to one paste plus review. Phase 2 (concurrent multi-URL add, staleness refresh) builds on this single-item flow, so its UI states (pending → resolved → manual-fallback) must be designed to extend without rework.

Inherited constraints found in active specs (binding on this change):

- `server-endpoint-authorization`: the new fetch endpoint must `await auth()` at entry (it consumes paid Zyte quota), apply a per-user rate limit returning 429, length-cap URL input with 400, and never revalidate caches on rejection.
- `form-shell-system`: the New Item modal structure, dismissal branches, and footer (`isLoading={isPending}`) contracts stay intact; the URL-entry/loading states render inside the existing `FormShell`.
- `form-field-system`: the URL paste field is a `TextField type="url"` inside `FormField` — token-driven chrome, 44px floor, ARIA wiring; no bespoke input.
- `button-system`: "Fetch Details" and "Fill in details manually" flow through `<Button>`/`<LinkButton>` variants; no page-scoped button classes.
- `loading-indicator-system`: the fetch spinner is the shared `<LoadingIndicator>` (CSS-only, `role="status"`); cycling status text renders adjacent to it, not as a new spinner shape.
- `list-item-management`: create-flow navigation context (`returnTo`) is preserved across the new pre-form states.
- `item-store-links`: a store remains valid only with name + link + numeric price; prefill must produce a valid store row.
- `data-layer-organization`: parsing/fetch helpers live outside `app/**` import paths reachable from `lib/data/`; any new action module follows the `<domain>.actions.ts` convention.

## What Changes

- **New Item modal gains a URL-first entry state**: paste field + "Fetch Details" button, with "Fill in details manually →" link to today's form (wireframe state 1).
- **Loading state** while fetching: shared spinner, cycling status messages every ~2.5s ("Fetching item details…" → …), static "This may take a moment." line, URL strip with "change", Cancel only (wireframe state 2a — no progress bar, no time promises, no skeletons).
- **Fetched result prefills the existing item form** (wireframe state 3): name, description, image URL, one store row (store name, price, the pasted link), plus a "Fetched from {store}" badge; all fields stay editable. Fetch failure/timeout falls through to manual entry with a "couldn't fetch automatically" notice.
- **Manual entry keeps an escape hatch back** to the URL entry state (wireframe state 4).
- **New server endpoint** `POST /api/product-fetch` behind a `ProductFetcher` seam: tier 1 free server-side fetch + schema.org JSON-LD / OpenGraph parse; tier 2 Zyte API (`product: true, followRedirect: true`) for resistant sites (Amazon); app-side abort timeout (~15–20s) with route `maxDuration` above it; tier 3 is the manual-entry fallback.
- **Schema additions** on `item_stores`: `price_fetched_at` (timestamp, nullable — enables "price as of {date}"), `canonical_url` (nullable — canonical URL/ASIN dedupe key for phase 2), `currency` (nullable). Manual rows leave them null. Stale/dead-link flag is deferred to phase 2.
- **Config**: `ZYTE_API_KEY` env var (Vercel; locally in gitignored `.env*.local`, never `e2e/.env`).

Out of scope: multi-URL concurrent add, price staleness refresh, copying images to own storage, stale/dead-link flag writes (all #141 phase 2).

## Capabilities

### New Capabilities

- `product-link-prefill`: the add-item URL-first flow — entry state, loading state with cycling messages, prefill mapping into the item form, manual fallback, and the `/api/product-fetch` endpoint contract (tiered fetch waterfall, timeout, auth + rate limit, response shape `{title, description?, imageUrl?, price?, currency?, canonicalUrl?, store}`).

### Modified Capabilities

- `item-store-links`: store rows gain optional fetched-price provenance (`price_fetched_at`, `canonical_url`, `currency`) and the owner-facing "price as of {date}" display requirement for fetched prices.

## Impact

- **UI**: `app/(main)/items/ui/components/itemform/` — `ItemForm.tsx`, `ItemFormContainer.tsx`, `useItemForm` hook gain pre-form states (URL entry / loading) and prefill plumbing; new small components for URL entry + loading live alongside.
- **API**: new `app/api/product-fetch/route.ts` (auth + per-user rate limit, mirroring `app/api/image-search/route.ts` patterns); new fetch/parse helpers (tier 1 parser, Zyte client) behind the `ProductFetcher` seam.
- **DB**: `db/schema.ts` `item_stores` columns + migration; `lib/data/item.actions.ts` / `item.associations.ts` / `item.schema.ts` pass the new optional store fields through create/update (cache tags unchanged: mutations already `updateTag('items')`).
- **Dependencies**: Zyte API (paid, pay-as-you-go) via plain `fetch`; tier 1 needs an HTML parse (JSON-LD/OG) — prefer dependency-free regex/`htmlparser`-class minimal approach decided in design.
- **Config/ops**: `ZYTE_API_KEY` env var; route `maxDuration` setting.
- **Tests**: unit tests for tier-1 parser + waterfall/timeout logic; form-state tests; e2e unaffected suites must stay green (fetch flow stubs the endpoint).
