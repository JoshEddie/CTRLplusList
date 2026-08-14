## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: A failed or timed-out fetch SHALL fall through to the kind-aware failure screen

When the fetch fails, times out, or returns no usable product data, the modal SHALL transition to the **failure screen** (content and actions owned by `item-decision-deck`), passing the failure *kind* so the screen can label the cause honestly: a `timeout` result (the app-side abort budget was exceeded) SHALL route as the **timeout** kind, and a `fetch_failed` result (no usable product returned) SHALL route as the **failed** kind. A network/transport error with no result SHALL route as the **failed** kind. "Build it by hand" (available for every kind) SHALL open the blank Preview with the pasted URL seeded into the first store row's Link field. The failure SHALL never surface fabricated or partial-garbage data as if fetched.

Rate limiting is the exception: a 429 / `rate_limited` response SHALL return the user to the URL entry state (pasted URL retained) with a friendly field-level error ("You've hit the fetch limit — try again in about a minute.") — retry-in-a-minute is the remedy, and it SHALL NOT route to the failure screen.

#### Scenario: Timeout routes as the timeout kind

- **WHEN** a fetch exceeds the app-side timeout
- **THEN** the failure screen SHALL render as the timeout kind (retry re-fetches the same link) and SHALL NOT auto-render a populated form

#### Scenario: Fetch failure routes as the failed kind

- **WHEN** the endpoint returns a `fetch_failed` result, or the request errors with no result
- **THEN** the failure screen SHALL render as the failed kind (copy that does not blame the link), and SHALL NOT auto-render a populated form

#### Scenario: Build-by-hand opens a blank Preview with the URL

- **WHEN** the user activates "Build it by hand" on the failure screen
- **THEN** a blank Preview SHALL open with the pasted URL seeded into the first store row's Link field

#### Scenario: Rate-limited fetch stays on URL entry

- **WHEN** the endpoint returns 429 `{ error: 'rate_limited' }`
- **THEN** the URL entry state SHALL render with the pasted URL retained and the slow-down field error, and neither the failure screen nor the Preview SHALL render

## REMOVED Requirements

### Requirement: A failed or timed-out fetch SHALL fall through to manual entry

**Reason**: Falling through to a populated manual form is exactly the behavior this change removes. The old requirement mandated that any failure auto-render the manual item form with a "We couldn't fetch that automatically" notice; failures now route to a dedicated, kind-aware failure screen that labels the cause honestly (timeout vs. failed) and makes manual entry one explicit choice among three ("Build it by hand"), rather than the automatic destination. Its rate-limit exception carries forward unchanged into the replacement. The requirement is replaced wholesale rather than amended — its name, its central SHALL, and all three of its scenarios change — so it is removed and a new requirement added (see "A failed or timed-out fetch SHALL fall through to the kind-aware failure screen").
