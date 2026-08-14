## MODIFIED Requirements

### Requirement: Fixtures SHALL be compiler-checked against the seam's types and cover each downstream UI state

Fixtures SHALL be TypeScript values typed against `ProductResult`/`ProductData` (type drift is a compile error, not a runtime surprise). Fixture image URLs SHALL be deterministic, loadable images at least 200px on both axes (the seed's `https://picsum.photos/seed/<stable-id>/400/400` convention) so the client-side `prunePhotos` probe retains them. The scenario set SHALL cover: `success` (full product, several images), `success-single-image` (exactly one image — image-select flow skipped), `success-long-title` (title over `TITLE_MAX` → error tier, hard block), `success-title-warn` (title between `TITLE_SNAPPY` and `TITLE_MAX` → warn tier with its inline trim-suggest note), `success-long-desc` (API returns a long `description` — confirms the deck deliberately drops it, so the note starts empty per `seedFromFetch`), `success-no-price` (no `price` field → price step surfaces, triage shows "Not set" at the error tier), `success-no-image` (no image fields), `success-many-images` (10 images, the `MAX_IMAGE_CANDIDATES` cap), `fetch-failed` (`{ok:false,error:'fetch_failed'}`), `timeout` (`{ok:false,error:'timeout'}`), and `rate-limited` (route-level 429 per the `product-link-prefill` delta). No multi-store scenario exists — the seam seeds a single `store` string and #169 removes the multi-stores feature. No invalid-store scenario exists — `store` is a required non-empty string the seam always seeds, so the triage store-warn branch is unreachable from a fetch.

#### Scenario: Single-image fixture skips the selector

- **WHEN** `https://mock.test/success-single-image` is fetched
- **THEN** the result SHALL carry exactly one image candidate and the deck SHALL bypass the image-select step

#### Scenario: Many-images fixture fills the candidate cap

- **WHEN** `https://mock.test/success-many-images` is fetched
- **THEN** the result's `imageUrls` SHALL hold 10 loadable ≥200px entries whose first equals `imageUrl`, so the photo selector renders its overflow state after client-side pruning

#### Scenario: Each failure fixture reaches its own kind on the failure screen

- **WHEN** `https://mock.test/fetch-failed` or `https://mock.test/timeout` is fetched
- **THEN** the seam SHALL return the corresponding `{ ok: false }` result and the add-item flow SHALL show the kind-aware failure screen at the matching kind — `fetch-failed` at the failed kind, `timeout` at the timeout kind — so the two fixtures are distinguishable by the copy they produce, not merged into one screen

#### Scenario: Warn-tier title surfaces the inline trim note

- **WHEN** `https://mock.test/success-title-warn` is fetched, carrying a title between `TITLE_SNAPPY` and `TITLE_MAX` characters
- **THEN** the deck SHALL surface the title step at the `warn` tier with its inline trim-suggest note — distinct from `success-long-title`'s over-`TITLE_MAX` `error`-tier hard block

#### Scenario: Missing price surfaces the price step

- **WHEN** `https://mock.test/success-no-price` is fetched with no `price` field
- **THEN** `seedFromFetch` SHALL seed an empty price, the deck SHALL surface the price step, and triage SHALL show "Not set" at the `error` tier

#### Scenario: A fetched description is dropped, not rendered

- **WHEN** `https://mock.test/success-long-desc` is fetched, carrying a `description` past `DESCRIPTION_MAX`
- **THEN** `seedFromFetch` SHALL discard it and the deck SHALL open with an empty note — the fixture guards the deliberate drop, not a rendered long description
