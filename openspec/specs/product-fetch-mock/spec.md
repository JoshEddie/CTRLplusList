# product-fetch-mock Specification

## Purpose

Deterministic, localhost-guarded mock for the product-fetch seam whose primary purpose is on-demand **visual** inspection of every downstream add-item UI state — the class of defect (missing padding, broken truncation, ugly overflow) that unit tests and functional e2e never flag — with deterministic deck-flow e2e as the secondary win. No Zyte quota spent, no live-site nondeterminism. Scenario selection happens per-request through a magic URL pasted into the normal add-item flow; the mock is structurally unable to engage against a real deployment.

## Requirements

### Requirement: The mock SHALL be part of local mode, with no flag or surface of its own

The mock SHALL activate exactly when local mode is active (`USE_PG_DRIVER=1` — the same flag `npm run dev:local` and the e2e servers already set), introducing no new environment variable, npm script, or boot guard. Outside local mode the product-fetch path SHALL be byte-for-byte the real one: a `mock.test` URL takes the real path and fails like any dead link. Deploy safety is inherited — deployed environments cannot enter local mode past `USE_PG_DRIVER`'s existing localhost boot guard.

#### Scenario: Local mode serves mock scenarios

- **WHEN** the app is started via `npm run dev:local` and a `https://mock.test/<scenario>` URL is pasted into the add-item flow
- **THEN** the scenario's fixture result SHALL drive the downstream UI with no outbound Zyte call

#### Scenario: Outside local mode the mock does not exist

- **WHEN** `USE_PG_DRIVER` is unset and a `mock.test` URL is fetched
- **THEN** `fetchProduct` SHALL behave exactly per `product-link-prefill`'s real path, returning a failure like any unreachable host

### Requirement: Scenario selection SHALL be a per-request magic URL

In local mode, a request whose URL hostname is `mock.test` SHALL resolve to the fixture named by the URL's first path segment, with no server restart between scenarios. Hostnames other than `mock.test` SHALL take the real path even in local mode — real-Zyte behavior stays reachable per-request when a key is configured. An unrecognized scenario name on `mock.test` SHALL return `{ ok: false, error: 'fetch_failed' }`.

#### Scenario: Scenario toggles per request

- **WHEN** `https://mock.test/success` and then `https://mock.test/timeout` are fetched against the same running server
- **THEN** each request SHALL return its own scenario's fixture

#### Scenario: Non-mock host passes through

- **WHEN** local mode is active and a real product URL is fetched
- **THEN** the seam SHALL take the real Zyte path unchanged

#### Scenario: Unknown scenario fails like a dead link

- **WHEN** `https://mock.test/no-such-scenario` is fetched in local mode
- **THEN** the seam SHALL return `{ ok: false, error: 'fetch_failed' }`

### Requirement: Fixtures SHALL be compiler-checked against the seam's types and cover each downstream UI state

Fixtures SHALL be TypeScript values typed against `ProductResult`/`ProductData` (type drift is a compile error, not a runtime surprise). Fixture image URLs SHALL be deterministic, loadable images at least 200px on both axes (the seed's `https://picsum.photos/seed/<stable-id>/400/400` convention) so the client-side `prunePhotos` probe retains them. The scenario set SHALL cover: `success` (full product, several images), `success-single-image` (exactly one image — image-select flow skipped), `success-long-title` (title over `TITLE_MAX` → error tier, hard block), `success-title-warn` (title between `TITLE_SNAPPY` and `TITLE_MAX` → warn tier with its inline trim-suggest note), `success-long-desc` (API returns a long `description` — confirms the deck deliberately drops it, so the note starts empty per `seedFromFetch`), `success-no-price` (no `price` field → price step surfaces, triage shows "Not set" at the error tier), `success-no-image` (no image fields), `success-many-images` (10 images, the `MAX_IMAGE_CANDIDATES` cap), `fetch-failed` (`{ok:false,error:'fetch_failed'}`), `timeout` (`{ok:false,error:'timeout'}`), and `rate-limited` (route-level 429 per the `product-link-prefill` delta). No multi-store scenario exists — the seam seeds a single `store` string and #169 removes the multi-stores feature. No invalid-store scenario exists — `store` is a required non-empty string the seam always seeds, so the triage store-warn branch is unreachable from a fetch.

#### Scenario: Single-image fixture skips the selector

- **WHEN** `https://mock.test/success-single-image` is fetched
- **THEN** the result SHALL carry exactly one image candidate and the deck SHALL bypass the image-select step

#### Scenario: Many-images fixture fills the candidate cap

- **WHEN** `https://mock.test/success-many-images` is fetched
- **THEN** the result's `imageUrls` SHALL hold 10 loadable ≥200px entries whose first equals `imageUrl`, so the photo selector renders its overflow state after client-side pruning

#### Scenario: Failure fixtures reach the timeout screen

- **WHEN** `https://mock.test/fetch-failed` or `https://mock.test/timeout` is fetched
- **THEN** the seam SHALL return the corresponding `{ ok: false }` result and the add-item flow SHALL show the timeout screen

#### Scenario: Warn-tier title surfaces the inline trim note

- **WHEN** `https://mock.test/success-title-warn` is fetched, carrying a title between `TITLE_SNAPPY` and `TITLE_MAX` characters
- **THEN** the deck SHALL surface the title step at the `warn` tier with its inline trim-suggest note — distinct from `success-long-title`'s over-`TITLE_MAX` `error`-tier hard block

#### Scenario: Missing price surfaces the price step

- **WHEN** `https://mock.test/success-no-price` is fetched with no `price` field
- **THEN** `seedFromFetch` SHALL seed an empty price, the deck SHALL surface the price step, and triage SHALL show "Not set" at the `error` tier

#### Scenario: A fetched description is dropped, not rendered

- **WHEN** `https://mock.test/success-long-desc` is fetched, carrying a `description` past `DESCRIPTION_MAX`
- **THEN** `seedFromFetch` SHALL discard it and the deck SHALL open with an empty note — the fixture guards the deliberate drop, not a rendered long description
