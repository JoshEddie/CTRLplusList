# product-link-prefill Specification

## Purpose

The `product-link-prefill` capability lets users paste a product URL into the New Item modal and have name, image, price, and store auto-filled from the page. A tiered waterfall (schema.org JSON-LD → OpenGraph/meta → Zyte extract API) runs server-side behind a swappable seam, gated by auth and rate-limiting. Prefilled fields land in the existing item form fully editable; failures fall through to manual entry with the URL preserved.
## Requirements
### Requirement: The create-item modal SHALL open in a URL-first entry state

When the New Item modal opens in create mode (not edit mode), it SHALL render a URL entry state inside the **deck-owned shell** (`DeckScreen`, per `item-decision-deck`) before the item form: a pinned header carrying the title "Start with a link" and the hint subtitle ("Paste a product link, we'll pull the details, then walk you through anything that still needs attention."), a URL paste field rendered as a `TextField type="url"` inside a `FormField` (per `form-field-system`, labeled "Product link"), and a pinned footer containing a primary "Fetch Details" `<Button>` (per `button-system`). The URL entry state SHALL NOT carry a manual-entry affordance — a store link is required (owner decision on #234), so manual entry is reachable only from the fetch-failure screen (owned by `item-decision-deck`), where the pasted link seeds the store. Edit mode SHALL open directly into the form as today. The dismissal (`useDismiss`, per `form-shell-system`) and navigation-context (`returnTo`, per `list-item-management`) contracts SHALL be preserved across all pre-form states, which render in the same deck-owned shell.

Leaving the Fill-manually shell for the URL entry state SHALL NOT itself discard entered values; the discard moment is re-entry. When the session holds an in-progress manual draft — user-entered name, description, photo, or store name/price; seeded values and untouched defaults do not count — activating the failure screen's manual affordance SHALL first prompt via `confirm-dialog-system` to keep the draft or start over: keeping SHALL return to the Fill-manually shell with the draft's values and visit state intact; starting over SHALL discard the draft to `blankItem(pastedUrl)`, preserving the failure path's URL seeding. With no draft in progress, the affordance SHALL open the shell immediately with no prompt.

This prompt guards in-memory state within one modal session only; durable drafts and cross-session resume belong to the `item_drafts` chain (#210), which MAY amend or replace this behavior.

#### Scenario: Create opens to URL entry

- **WHEN** the user opens the New Item modal in create mode
- **THEN** the URL entry state SHALL render in the deck-owned shell (paste field and "Fetch Details" button) and SHALL NOT render a manual-entry affordance

#### Scenario: Edit skips URL entry

- **WHEN** the user opens the modal to edit an existing item
- **THEN** the form SHALL render directly with the item's values, with no URL entry or return-to-link affordance

#### Scenario: An in-progress draft prompts before discard

- **WHEN** the user has entered values on the Fill-manually shell, navigated away within the modal, and activates the failure screen's "Fill in details manually →" again
- **THEN** a confirm dialog SHALL offer keeping the draft or starting over, and the shell SHALL NOT be silently re-blanked

#### Scenario: Keeping the draft restores it whole

- **WHEN** the user chooses to keep the draft from the prompt
- **THEN** the Fill-manually shell SHALL render with the previously entered values and prior visit state intact

#### Scenario: Starting over discards the draft

- **WHEN** the user chooses to start over from the prompt
- **THEN** the Fill-manually shell SHALL render seeded from `blankItem(pastedUrl)` — the failure path's link seeding, not a merge with the discarded draft

#### Scenario: Invalid URL is rejected client-side

- **WHEN** the user activates "Fetch Details" with a value that is not a valid http(s) URL
- **THEN** no request SHALL be sent and the URL field SHALL show a field-level validation error per `form-field-system`

### Requirement: The fetching state SHALL show an honest indeterminate loading treatment

While a fetch is in flight the modal SHALL render, in the deck-owned shell: a pinned header carrying the title "Fetching details" (mirroring the "Fetch Details" action that started it), the shared `<LoadingIndicator>` (per `loading-indicator-system` — no new spinner shape), a cycling status message that fades between entries roughly every 2.5 seconds (e.g. "Fetching item details…", "Looking up the price…", "Finding product images…", "Checking store info…", "Hang tight, almost there…"), a static "This may take a moment." line, and a URL strip showing the pasted URL (truncated) with a "change" affordance returning to URL entry. The state SHALL NOT render a progress bar, skeleton form fields, or any specific time promise. The footer SHALL contain only Cancel, which aborts the in-flight request and returns to URL entry. Cycling message text SHALL NOT be inside an `aria-live` region (the indicator's status region announces loading once; cycling text is visual reassurance only).

#### Scenario: Loading renders spinner and cycling messages

- **WHEN** a product fetch is in flight
- **THEN** the modal SHALL show the "Fetching details" title, the shared loading indicator, a cycling status message, the static "This may take a moment." line, and the URL strip — and SHALL NOT show a progress bar or skeleton fields

#### Scenario: Cancel aborts the fetch

- **WHEN** the user activates Cancel during a fetch
- **THEN** the in-flight request SHALL be aborted client-side and the modal SHALL return to the URL entry state with the pasted URL retained

#### Scenario: Change returns to URL entry

- **WHEN** the user activates "change" on the URL strip during a fetch
- **THEN** the request SHALL be aborted and the URL entry state SHALL render with the URL editable

### Requirement: A successful fetch SHALL prefill the item form with editable values

On a successful fetch the modal SHALL transition to the **Decision Deck** (owned by `item-decision-deck`), seeding the item view-model with: Name = fetched title; the fetched image as the active image and the fetched image set as the candidate pool; exactly one store row with store name derived from the product page's hostname, the fetched price (when present as a strictly-positive value — a fetched `0`/non-positive price is treated as no price and SHALL NOT auto-populate `$0.00`; a user may still type `0` themselves), and the pasted URL as the store link. The Description SHALL be left empty — extracted descriptions are marketing copy at best and the wrong page block on some sites (e.g. Amazon book pages yield Editorial Reviews; see issue #157) — the user authors their own notes. The deck's `intro` card SHALL identify the source ("Auto-filled from {store}") and provide a "change"/return-to-URL-entry path; the deck mechanics, card selection, and validation tiers are owned by `item-decision-deck`. Every seeded field SHALL remain editable through the deck and Preview, and submission SHALL flow through the existing create action unchanged. The seeded store row SHALL satisfy the store-validity rule owned by `item-store-links` (name + link + numeric price); when no price was fetched, the deck's price card SHALL require one before the item can be created (price is no longer left silently empty).

When the fetch result carries `imageUrls`, the full candidate list SHALL be handed to the deck as the photo candidate pool so the deck's photo step (selector / single-image bypass / zero-image error, owned by `item-decision-deck`) can run and the list can be persisted with the created item; the candidate persistence semantics remain owned by `item-image-candidates`, not this capability.

#### Scenario: Fetched values seed the deck

- **WHEN** a fetch resolves with title, image, price, and store
- **THEN** the Decision Deck SHALL open with the view-model seeded (name, active image + candidate pool, one store row with store, price, pasted link), the Description empty, and the `intro` card identifying the source store

#### Scenario: Multi-image result seeds the deck's photo candidates

- **WHEN** a fetch resolves with `imageUrls` holding 5 candidates
- **THEN** the deck SHALL receive all 5 as the photo candidate pool (active = the first) and the photo step's selector SHALL be available per `item-decision-deck`

#### Scenario: Partial result routes flagged fields to cards

- **WHEN** a fetch resolves with a title but no price
- **THEN** the deck SHALL seed the name and the store row's name + link, and SHALL include the `price` card (no price → not `good` tier) so the user supplies a price before Preview

#### Scenario: Created store row carries provenance

- **WHEN** the user submits an item whose store row came from a fetch with a numeric price
- **THEN** the created store row SHALL persist `price_fetched_at` (fetch time), `canonical_url` (when returned), and `currency` (when returned), per the `item-store-links` provenance requirement

#### Scenario: Provenance is dropped for user-overridden prices

- **WHEN** the user edits the seeded price before submitting
- **THEN** the stored row SHALL NOT carry `price_fetched_at` (the price is no longer the fetched snapshot)

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

### Requirement: A failed or timed-out fetch SHALL fall through to the kind-aware failure screen

When the fetch fails, times out, or returns no usable product data, the modal SHALL transition to the **failure screen** (content and actions owned by `item-decision-deck`), passing the failure *kind* so the screen can label the cause honestly: a `timeout` result (the app-side abort budget was exceeded) SHALL route as the **timeout** kind, and a `fetch_failed` result (no usable product returned) SHALL route as the **failed** kind. A network/transport error with no result SHALL route as the **failed** kind. "Fill in details manually →" (available for every kind; treatment owned by `item-decision-deck`) SHALL open the Fill-manually shell with the pasted URL seeded into the first store row's Link field — the link was real enough to attempt, so it is kept. The failure SHALL never surface fabricated or partial-garbage data as if fetched.

Rate limiting is the exception: a 429 / `rate_limited` response SHALL return the user to the URL entry state (pasted URL retained) with a friendly field-level error ("You've hit the fetch limit — try again in about a minute.") — retry-in-a-minute is the remedy, and it SHALL NOT route to the failure screen.

#### Scenario: Timeout routes as the timeout kind

- **WHEN** a fetch exceeds the app-side timeout
- **THEN** the failure screen SHALL render as the timeout kind (retry re-fetches the same link) and SHALL NOT auto-render a populated form

#### Scenario: Fetch failure routes as the failed kind

- **WHEN** the endpoint returns a `fetch_failed` result, or the request errors with no result
- **THEN** the failure screen SHALL render as the failed kind (copy that does not blame the link), and SHALL NOT auto-render a populated form

#### Scenario: Manual entry from the failure screen opens the Fill-manually shell with the URL

- **WHEN** the user activates "Fill in details manually →" on the failure screen with no manual draft in progress
- **THEN** the Fill-manually shell SHALL render with the pasted URL seeded into the first store row's Link field, and the Preview SHALL NOT render

#### Scenario: A draft survives the failure-screen manual entry via the prompt

- **WHEN** a manual draft is in progress and the user activates "Fill in details manually →" on the failure screen
- **THEN** the confirm dialog SHALL offer keeping the draft (rendered unchanged, no URL merged in) or starting over (blank with the pasted URL seeded)

#### Scenario: Rate-limited fetch stays on URL entry

- **WHEN** the endpoint returns 429 `{ error: 'rate_limited' }`
- **THEN** the URL entry state SHALL render with the pasted URL retained and the slow-down field error, and neither the failure screen nor the Fill-manually shell SHALL render

