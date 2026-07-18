# product-link-prefill (delta)

## MODIFIED Requirements

### Requirement: Product fetching SHALL delegate to Zyte behind a thin seam

A `fetchProduct(url, {signal})` seam SHALL encapsulate the fetch strategy: in local mode with the URL's hostname `mock.test`, the seam SHALL return the selected scenario fixture per `product-fetch-mock` before any real-path logic (no retry, no timeout machinery, no outbound fetch); otherwise, when `ZYTE_API_KEY` is configured it SHALL call the Zyte extract API (`product: true` with `extractFrom: httpResponseBody` and `ai: true`, basic auth) and normalize the response; when the key is absent (local dev, e2e) or Zyte yields no title it SHALL return a failure result, and the UI's manual entry is the fallback. A no-title result SHALL be retried once automatically, server-side (bot-walled sites like Etsy extract intermittently — Zyte may hit a challenge page on one attempt and clean HTML on the next, and rotates IPs per call); both attempts share the abort signal so the retry stays inside the timeout budget. The retry is fully automatic — there is no user-facing "try again" control (a client re-request would cost a second rate-limit token and a full auth/DB round-trip for no extra reliability over the server-side re-roll). The system SHALL NOT do its own page fetching/HTML parsing — Zyte renders and extracts on its own infrastructure, so the app holds no SSRF surface for arbitrary user URLs (only the route's string-level `isPrivateHostname` pre-check remains). AI extraction (`ai: true`) recovers the full image gallery that rule-based extraction reduces to the main image alone. The fetch SHALL be bounded by an app-side abort timeout that sits under the route's `maxDuration` (on Vercel Hobby, `maxDuration` is the 60s hard cap), so it returns a graceful `timeout` before the platform kills the function; that budget is shared across the retry attempts. The exact duration is an implementation tuning value, not a figure this spec pins down. The seam's result SHALL normalize to `{ title, description?, imageUrl?, imageUrls?, price?, currency?, canonicalUrl?, store }` with price emitted only when strictly numeric. The route handler SHALL contain no extraction or parsing logic — it calls the seam, which encapsulates the vendor (today Zyte); changing or stacking vendors is a seam-internal change that does not touch the route (the guarded `rate-limited` mock check is the recorded exception, owned by the route requirement above).

`imageUrls`, when present, SHALL be an ordered, exact-string-deduped list of at most 15 http(s) URLs whose first element equals `imageUrl`, populated from `[mainImage.url, ...images[].url]` (15 matches the shared `MAX_IMAGE_CANDIDATES` cap owned by `item-image-candidates`). `imageUrl` SHALL remain present and first whenever any image was extracted — the field addition is backward compatible.

#### Scenario: Configured site resolves via Zyte

- **WHEN** a URL is fetched and `ZYTE_API_KEY` is configured
- **THEN** the seam SHALL call Zyte with `{url, product: true, productOptions: {extractFrom: httpResponseBody, ai: true}, followRedirect: true}` and normalize its product response

#### Scenario: Missing key returns failure

- **WHEN** `ZYTE_API_KEY` is unset and the mock is not engaged
- **THEN** the seam SHALL return a failure result without any outbound fetch (local dev and e2e never require the key)

#### Scenario: Mock branch precedes the real path

- **WHEN** local mode is active and a `mock.test` URL is fetched
- **THEN** the seam SHALL return the scenario fixture with no Zyte call, no retry, and no timeout scheduling; any other hostname SHALL take the real path unchanged

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

- **WHEN** Zyte returns `mainImage` plus 19 `images` entries including duplicates of `mainImage.url`
- **THEN** the normalized `imageUrls` SHALL start with `mainImage.url`, contain no exact-string duplicates, and hold at most 15 entries; `imageUrl` SHALL equal its first entry
