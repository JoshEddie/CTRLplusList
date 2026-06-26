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

### Requirement: A failed or timed-out fetch SHALL fall through to manual entry

When the fetch fails, times out, or returns no usable product data, the modal SHALL transition to the **Timeout screen** (content owned by `item-decision-deck`): a non-alarming explanation that the link wouldn't load, a "Try a different link" action returning to URL entry, and a "Build it by hand" action opening the blank Preview with the pasted URL seeded into the first store row's Link field. The failure SHALL never surface fabricated or partial-garbage data as if fetched.

Rate limiting is the exception: a 429 / `rate_limited` response SHALL return the user to the URL entry state (pasted URL retained) with a friendly field-level error ("You've hit the fetch limit — try again in about a minute.") — retry-in-a-minute is the remedy, not manual entry.

#### Scenario: Timeout shows the Timeout screen

- **WHEN** a fetch exceeds the app-side timeout
- **THEN** the Timeout screen SHALL render with "Try a different link" and "Build it by hand" actions, and SHALL NOT auto-render a populated form

#### Scenario: Build-by-hand opens a blank Preview with the URL

- **WHEN** the user activates "Build it by hand" on the Timeout screen
- **THEN** a blank Preview SHALL open with the pasted URL seeded into the first store row's Link field

#### Scenario: Rate-limited fetch stays on URL entry

- **WHEN** the endpoint returns 429 `{ error: 'rate_limited' }`
- **THEN** the URL entry state SHALL render with the pasted URL retained and the slow-down field error, and neither the Timeout screen nor the Preview SHALL render

#### Scenario: Fetch failure shows the Timeout screen

- **WHEN** the endpoint returns a failure result
- **THEN** the Timeout screen SHALL render — no fabricated data and no dead-end state
