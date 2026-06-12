# product-link-prefill (delta)

## ADDED Requirements

### Requirement: The create-item modal SHALL open in a URL-first entry state

When the New Item modal opens in create mode (not edit mode), it SHALL render a URL entry state inside the existing `FormShell` before the item form: a hint line ("Paste a product link to auto-fill details"), a URL paste field rendered as a `TextField type="url"` inside a `FormField` (per `form-field-system`), a primary "Fetch Details" `<Button>` (per `button-system`), and a "Fill in details manually →" link-variant affordance that switches to the manual form. Edit mode SHALL open directly into the form as today. The `FormShell` dismissal and navigation-context (`returnTo`) contracts owned by `form-shell-system` and `list-item-management` SHALL be preserved across all pre-form states.

#### Scenario: Create opens to URL entry

- **WHEN** the user opens the New Item modal in create mode
- **THEN** the URL entry state SHALL render (paste field, "Fetch Details" button, manual-entry link) and the item form fields SHALL NOT render yet

#### Scenario: Edit skips URL entry

- **WHEN** the user opens the modal to edit an existing item
- **THEN** the form SHALL render directly with the item's values, with no URL entry or "Use a link instead" affordance

#### Scenario: Manual link bypasses fetching

- **WHEN** the user activates "Fill in details manually" from the URL entry state
- **THEN** the empty item form SHALL render immediately and a "← Use a link instead" affordance SHALL return to the URL entry state

#### Scenario: Invalid URL is rejected client-side

- **WHEN** the user activates "Fetch Details" with a value that is not a valid http(s) URL
- **THEN** no request SHALL be sent and the URL field SHALL show a field-level validation error per `form-field-system`

### Requirement: The fetching state SHALL show an honest indeterminate loading treatment

While a fetch is in flight the modal SHALL render: the shared `<LoadingIndicator>` (per `loading-indicator-system` — no new spinner shape), a cycling status message that fades between entries roughly every 2.5 seconds (e.g. "Fetching item details…", "Looking up the price…", "Finding product images…", "Checking store info…", "Hang tight, almost there…"), a static "This may take a moment." line, and a URL strip showing the pasted URL (truncated) with a "change" affordance returning to URL entry. The state SHALL NOT render a progress bar, skeleton form fields, or any specific time promise. The footer SHALL contain only Cancel, which aborts the in-flight request and returns to URL entry. Cycling message text SHALL NOT be inside an `aria-live` region (the indicator's status region announces loading once; cycling text is visual reassurance only).

#### Scenario: Loading renders spinner and cycling messages

- **WHEN** a product fetch is in flight
- **THEN** the modal SHALL show the shared loading indicator, a cycling status message, the static "This may take a moment." line, and the URL strip — and SHALL NOT show a progress bar or skeleton fields

#### Scenario: Cancel aborts the fetch

- **WHEN** the user activates Cancel during a fetch
- **THEN** the in-flight request SHALL be aborted client-side and the modal SHALL return to the URL entry state with the pasted URL retained

#### Scenario: Change returns to URL entry

- **WHEN** the user activates "change" on the URL strip during a fetch
- **THEN** the request SHALL be aborted and the URL entry state SHALL render with the URL editable

### Requirement: A successful fetch SHALL prefill the item form with editable values

On a successful fetch the modal SHALL transition to the existing item form with: Name = fetched title; Description = fetched description (when present); Image URL = fetched image URL (when present); exactly one store row prefilled with store name derived from the product page's hostname, the fetched price, and the pasted URL as the store link. A "Fetched from {store}" badge SHALL render above the form with a truncated-URL "change" affordance returning to URL entry. Every prefilled field SHALL remain editable, and submission SHALL flow through the existing create action unchanged. The prefilled store row SHALL satisfy the store-validity rule owned by `item-store-links` (name + link + numeric price) whenever a numeric price was fetched; when no price was fetched the price field SHALL be left empty for the user.

#### Scenario: Fetched values land in the form

- **WHEN** a fetch resolves with title, image, price, and store
- **THEN** the form SHALL render with name, image URL, and one store row (store, price, pasted link) prefilled, all editable, plus the "Fetched from {store}" badge

#### Scenario: Partial result prefills what it has

- **WHEN** a fetch resolves with a title but no price or image
- **THEN** the form SHALL prefill the name and the store row's name + link, leaving price and image URL empty with no validation error until submit rules apply as today

#### Scenario: Created store row carries provenance

- **WHEN** the user submits a form whose store row came from a fetch with a numeric price
- **THEN** the created store row SHALL persist `price_fetched_at` (fetch time), `canonical_url` (when returned), and `currency` (when returned), per the `item-store-links` provenance requirement

#### Scenario: Provenance is dropped for user-overridden prices

- **WHEN** the user edits the prefilled price before submitting
- **THEN** the stored row SHALL NOT carry `price_fetched_at` (the price is no longer the fetched snapshot)

### Requirement: A failed or timed-out fetch SHALL fall through to manual entry

When the fetch fails, times out, or returns no usable product data, the modal SHALL transition to the manual item form with a non-blocking notice ("We couldn't fetch that automatically — fill in the details below."), the pasted URL prefilled into the first store row's Link field, and the "← Use a link instead" affordance available to retry with a different URL. The failure SHALL never surface fabricated or partial-garbage data as if fetched.

#### Scenario: Timeout falls to manual with notice

- **WHEN** a fetch exceeds the app-side timeout
- **THEN** the manual form SHALL render with the couldn't-fetch notice and the pasted URL in the store row's Link field

#### Scenario: Fetch failure falls to manual with notice

- **WHEN** the endpoint returns a failure result
- **THEN** the manual form SHALL render with the same notice and link prefill — no error modal or dead-end state

### Requirement: `POST /api/product-fetch` SHALL gate, validate, and rate-limit per server-endpoint-authorization

The endpoint SHALL `await auth()` at handler entry and return 401 JSON for unauthenticated callers; SHALL reject request bodies whose `url` field is missing, longer than 2048 characters, or not a valid http(s) URL with HTTP 400; SHALL enforce a per-user token bucket (10 requests/minute) returning HTTP 429 `{ error: 'rate_limited' }` when exceeded; and SHALL NOT invalidate any cache tags on any path (auth/rate-limit/validation rejections and successes alike — the endpoint is read-only). The endpoint SHALL reject URLs resolving to localhost, literal IP addresses, or private hosts before any server-side fetch (SSRF guard).

#### Scenario: Unauthenticated request is rejected

- **WHEN** a request arrives without an authenticated session
- **THEN** the handler SHALL return 401 before any external fetch and SHALL NOT call `updateTag`/`revalidateTag`

#### Scenario: Oversized or malformed URL is rejected

- **WHEN** the body `url` exceeds 2048 characters or is not a valid http(s) URL
- **THEN** the handler SHALL return 400 without fetching

#### Scenario: Rate limit returns 429

- **WHEN** an authenticated user exceeds 10 requests within a minute
- **THEN** the handler SHALL return 429 with `{ error: 'rate_limited' }`

#### Scenario: Private-network URL is refused

- **WHEN** the body `url` targets localhost, a literal IP, or a private hostname
- **THEN** the handler SHALL return 400 and SHALL NOT issue any server-side fetch to it

### Requirement: Product fetching SHALL run a tiered waterfall behind a swappable seam

A `fetchProduct(url, {signal})` seam SHALL encapsulate the fetch strategy: tier 1 — server-side fetch of the page following redirects, extracting schema.org JSON-LD `Product` data first and OpenGraph/meta fallbacks second; tier 2 — Zyte extract API (`product: true`, `followRedirect: true`, basic auth with `ZYTE_API_KEY`) attempted only when tier 1 yields no title AND the key is configured; tier 3 is the UI's manual fallback. The whole waterfall SHALL be bounded by an app-side abort timeout of ~20 seconds, and the route's `maxDuration` SHALL comfortably exceed it. The seam's result SHALL normalize to `{ title, description?, imageUrl?, price?, currency?, canonicalUrl?, store }` with price emitted only when strictly numeric. The route handler SHALL contain no parsing logic — vendors swap inside the seam.

#### Scenario: Structured-data site resolves at tier 1

- **WHEN** the URL serves schema.org `Product` JSON-LD with name and offer price
- **THEN** the result SHALL come from tier 1 with no Zyte call made

#### Scenario: Resistant site falls to Zyte

- **WHEN** tier 1 yields no title and `ZYTE_API_KEY` is configured
- **THEN** the seam SHALL call Zyte with `{url, product: true, followRedirect: true}` and normalize its product response

#### Scenario: Missing key skips tier 2

- **WHEN** tier 1 fails and `ZYTE_API_KEY` is unset
- **THEN** the seam SHALL return a failure result without attempting Zyte (local dev and e2e never require the key)

#### Scenario: Timeout aborts the waterfall

- **WHEN** the waterfall exceeds the app-side timeout
- **THEN** all in-flight fetches SHALL be aborted and the endpoint SHALL return `{ ok: false, error: 'timeout' }`

#### Scenario: Redirecting share links resolve

- **WHEN** the pasted URL is a redirecting share link (e.g. `a.co/...`)
- **THEN** redirects SHALL be followed so extraction runs against the final product page

#### Scenario: Non-numeric price is dropped, not passed through

- **WHEN** extraction produces a price value that does not coerce to a number
- **THEN** the normalized result SHALL omit `price` rather than emit a non-numeric value
