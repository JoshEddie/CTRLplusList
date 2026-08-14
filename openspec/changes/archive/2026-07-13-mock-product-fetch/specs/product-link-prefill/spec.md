# product-link-prefill (delta)

## MODIFIED Requirements

### Requirement: `POST /api/product-fetch` SHALL gate, validate, and rate-limit per server-endpoint-authorization

The endpoint SHALL `await auth()` at handler entry and return 401 JSON for unauthenticated callers; SHALL reject request bodies whose `url` field is missing, longer than 2048 characters, or not a valid http(s) URL with HTTP 400; SHALL enforce a per-user token bucket (10 requests/minute) returning HTTP 429 `{ error: 'rate_limited' }` when exceeded; and SHALL NOT invalidate any cache tags on any path (auth/rate-limit/validation rejections and successes alike — the endpoint is read-only). The endpoint SHALL reject URLs resolving to localhost, literal IP addresses, or private hosts before any server-side fetch (SSRF guard).

The handler SHALL validate the request body before consuming a rate-limit token (auth → parse/validate → mock handling → bucket → seam), so rejected requests never spend bucket capacity. The sole sanctioned mock behavior in the route, active only in local mode (per `product-fetch-mock`) for validated `mock.test` URLs: such requests SHALL bypass the rate-limit bucket entirely (the bucket protects Zyte quota; mock requests never reach Zyte, and visual iteration must not lock itself out), and the `rate-limited` scenario SHALL return 429 `{ error: 'rate_limited' }` — this status originates in the route before the seam runs, so it cannot be mocked at the seam. Both behaviors SHALL be inert (dead-branch) outside local mode; no other mock logic may live in the route.

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

#### Scenario: Mocked rate-limit scenario returns 429 without spending a token

- **WHEN** local mode is active and an authenticated user submits `https://mock.test/rate-limited`
- **THEN** the handler SHALL return 429 `{ error: 'rate_limited' }` deterministically on the first request, leaving the user's real token bucket untouched

#### Scenario: Mock requests never consume the bucket

- **WHEN** local mode is active and an authenticated user submits 11+ `mock.test` scenario requests within a minute
- **THEN** every non-`rate-limited` scenario SHALL keep resolving normally — mock traffic SHALL NOT trip or drain the real bucket

#### Scenario: Invalid requests do not spend rate-limit tokens

- **WHEN** an authenticated user submits a request that fails body or URL validation
- **THEN** the handler SHALL return 400 without consuming a rate-limit token

### Requirement: Product fetching SHALL delegate to Zyte behind a thin seam

A `fetchProduct(url, {signal})` seam SHALL encapsulate the fetch strategy: in local mode with the URL's hostname `mock.test`, the seam SHALL return the selected scenario fixture per `product-fetch-mock` before any real-path logic (no retry, no timeout machinery, no outbound fetch); otherwise, when `ZYTE_API_KEY` is configured it SHALL call the Zyte extract API (`product: true` with `extractFrom: httpResponseBody` and `ai: true`, basic auth) and normalize the response; when the key is absent (local dev, e2e) or Zyte yields no title it SHALL return a failure result, and the UI's manual entry is the fallback. A no-title result SHALL be retried once automatically, server-side (bot-walled sites like Etsy extract intermittently — Zyte may hit a challenge page on one attempt and clean HTML on the next, and rotates IPs per call); both attempts share the abort signal so the retry stays inside the timeout budget. The retry is fully automatic — there is no user-facing "try again" control (a client re-request would cost a second rate-limit token and a full auth/DB round-trip for no extra reliability over the server-side re-roll). The system SHALL NOT do its own page fetching/HTML parsing — Zyte renders and extracts on its own infrastructure, so the app holds no SSRF surface for arbitrary user URLs (only the route's string-level `isPrivateHostname` pre-check remains). AI extraction (`ai: true`) recovers the full image gallery that rule-based extraction reduces to the main image alone. The fetch SHALL be bounded by an app-side abort timeout that sits under the route's `maxDuration` (on Vercel Hobby, `maxDuration` is the 60s hard cap), so it returns a graceful `timeout` before the platform kills the function; that budget is shared across the retry attempts. The exact duration is an implementation tuning value, not a figure this spec pins down. The seam's result SHALL normalize to `{ title, description?, imageUrl?, imageUrls?, price?, currency?, canonicalUrl?, store }` with price emitted only when strictly numeric. The route handler SHALL contain no extraction or parsing logic — it calls the seam, which encapsulates the vendor (today Zyte); changing or stacking vendors is a seam-internal change that does not touch the route (the guarded `rate-limited` mock check is the recorded exception, owned by the route requirement above).

`imageUrls`, when present, SHALL be an ordered, exact-string-deduped list of at most 10 http(s) URLs whose first element equals `imageUrl`, populated from `[mainImage.url, ...images[].url]`. `imageUrl` SHALL remain present and first whenever any image was extracted — the field addition is backward compatible.

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

- **WHEN** Zyte returns `mainImage` plus 14 `images` entries including duplicates of `mainImage.url`
- **THEN** the normalized `imageUrls` SHALL start with `mainImage.url`, contain no exact-string duplicates, and hold at most 10 entries; `imageUrl` SHALL equal its first entry
