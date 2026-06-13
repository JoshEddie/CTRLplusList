# product-link-prefill — delta

## ADDED Requirements

### Requirement: Product fetching SHALL delegate to Zyte behind a thin seam

A `fetchProduct(url, {signal})` seam SHALL encapsulate the fetch strategy: when `ZYTE_API_KEY` is configured it SHALL call the Zyte extract API (`product: true` with `extractFrom: httpResponseBody` and `ai: true`, basic auth) and normalize the response; when the key is absent (local dev, e2e) or Zyte yields no title it SHALL return a failure result, and the UI's manual entry is the fallback. A no-title result SHALL be retried once automatically, server-side (bot-walled sites like Etsy extract intermittently — Zyte may hit a challenge page on one attempt and clean HTML on the next, and rotates IPs per call); both attempts share the abort signal so the retry stays inside the timeout budget. The retry is fully automatic — there is no user-facing "try again" control (a client re-request would cost a second rate-limit token and a full auth/DB round-trip for no extra reliability over the server-side re-roll). The system SHALL NOT do its own page fetching/HTML parsing — Zyte renders and extracts on its own infrastructure, so the app holds no SSRF surface for arbitrary user URLs (only the route's string-level `isPrivateHostname` pre-check remains). AI extraction (`ai: true`) recovers the full image gallery that rule-based extraction reduces to the main image alone. The fetch SHALL be bounded by an app-side abort timeout that sits under the route's `maxDuration` (on Vercel Hobby, `maxDuration` is the 60s hard cap), so it returns a graceful `timeout` before the platform kills the function; that budget is shared across the retry attempts. The exact duration is an implementation tuning value, not a figure this spec pins down. The seam's result SHALL normalize to `{ title, description?, imageUrl?, imageUrls?, price?, currency?, canonicalUrl?, store }` with price emitted only when strictly numeric. The route handler SHALL contain no extraction or parsing logic — it calls the seam, which encapsulates the vendor (today Zyte); changing or stacking vendors is a seam-internal change that does not touch the route.

`imageUrls`, when present, SHALL be an ordered, exact-string-deduped list of at most 10 http(s) URLs whose first element equals `imageUrl`, populated from `[mainImage.url, ...images[].url]`. `imageUrl` SHALL remain present and first whenever any image was extracted — the field addition is backward compatible.

#### Scenario: Configured site resolves via Zyte

- **WHEN** a URL is fetched and `ZYTE_API_KEY` is configured
- **THEN** the seam SHALL call Zyte with `{url, product: true, productOptions: {extractFrom: httpResponseBody, ai: true}, followRedirect: true}` and normalize its product response

#### Scenario: Missing key returns failure

- **WHEN** `ZYTE_API_KEY` is unset
- **THEN** the seam SHALL return a failure result without any outbound fetch (local dev and e2e never require the key; e2e stubs the route)

#### Scenario: Nameless Zyte response is retried then fails

- **WHEN** Zyte responds without a product name on both attempts
- **THEN** the seam SHALL call Zyte twice and return `{ ok: false, error: 'fetch_failed' }`

#### Scenario: Retry recovers an intermittent failure

- **WHEN** the first Zyte attempt yields no title but the retry returns a product
- **THEN** the seam SHALL return the retry's normalized product

#### Scenario: Timeout aborts the fetch

- **WHEN** the fetch exceeds the app-side timeout
- **THEN** the in-flight request SHALL be aborted and the endpoint SHALL return `{ ok: false, error: 'timeout' }`

#### Scenario: Redirecting share links resolve

- **WHEN** the pasted URL is a redirecting share link (e.g. `a.co/...`)
- **THEN** redirects SHALL be followed (`followRedirect: true`) so extraction runs against the final product page

#### Scenario: Non-numeric price is dropped, not passed through

- **WHEN** extraction produces a price value that does not coerce to a number
- **THEN** the normalized result SHALL omit `price` rather than emit a non-numeric value

#### Scenario: Zyte multi-image response yields a capped, deduped candidate list

- **WHEN** Zyte returns `mainImage` plus 14 `images` entries including duplicates of `mainImage.url`
- **THEN** the normalized `imageUrls` SHALL start with `mainImage.url`, contain no exact-string duplicates, and hold at most 10 entries; `imageUrl` SHALL equal its first entry

## MODIFIED Requirements

### Requirement: A successful fetch SHALL prefill the item form with editable values

On a successful fetch the modal SHALL transition to the existing item form with: Name = fetched title; Image URL = fetched image URL (when present); exactly one store row prefilled with store name derived from the product page's hostname, the fetched price, and the pasted URL as the store link. The Description field SHALL be left empty — extracted descriptions are marketing copy at best and the wrong page block on some sites (e.g. Amazon book pages yield Editorial Reviews; see issue #157) — the user authors their own notes. A "Fetched from {store}" badge SHALL render above the form with a truncated-URL "change" affordance returning to URL entry. Every prefilled field SHALL remain editable, and submission SHALL flow through the existing create action unchanged. The prefilled store row SHALL satisfy the store-validity rule owned by `item-store-links` (name + link + numeric price) whenever a numeric price was fetched; when no price was fetched the price field SHALL be left empty for the user.

When the fetch result carries `imageUrls`, the full candidate list SHALL be handed to the form session so the candidate-picker affordance can render and the list can be persisted with the created item; the affordance, picker behavior, and persistence semantics are owned by `item-image-candidates`, not this capability.

#### Scenario: Fetched values land in the form

- **WHEN** a fetch resolves with title, description, image, price, and store
- **THEN** the form SHALL render with name, image URL, and one store row (store, price, pasted link) prefilled, all editable, plus the "Fetched from {store}" badge — and the Description field SHALL be empty

#### Scenario: Partial result prefills what it has

- **WHEN** a fetch resolves with a title but no price or image
- **THEN** the form SHALL prefill the name and the store row's name + link, leaving price and image URL empty with no validation error until submit rules apply as today

#### Scenario: Created store row carries provenance

- **WHEN** the user submits a form whose store row came from a fetch with a numeric price
- **THEN** the created store row SHALL persist `price_fetched_at` (fetch time), `canonical_url` (when returned), and `currency` (when returned), per the `item-store-links` provenance requirement

#### Scenario: Provenance is dropped for user-overridden prices

- **WHEN** the user edits the prefilled price before submitting
- **THEN** the stored row SHALL NOT carry `price_fetched_at` (the price is no longer the fetched snapshot)

#### Scenario: Multi-image result seeds the form's candidate list

- **WHEN** a fetch resolves with `imageUrls` holding 5 candidates
- **THEN** the form session receives all 5 (Image URL prefilled with the first) and the candidate affordance defined by `item-image-candidates` becomes available

## REMOVED Requirements

### Requirement: Product fetching SHALL run a tiered waterfall behind a swappable seam

**Reason**: Tier 1 (our own server-side JSON-LD/OpenGraph fetch) was winning for every structured-data site — Shopify and most retailers — and returning its bare extraction (typically a single `og:image`), short-circuiting the higher-quality Zyte path before it ran. Product fetch is now Zyte-only (see the added "delegate to Zyte" requirement): `lib/product-fetch/tier1.ts` and the DNS-rebinding SSRF guard it needed are deleted, and Zyte AI extraction (`ai: true`) recovers the full image gallery. The requirement is replaced wholesale rather than amended, so it is removed and a new requirement added.
