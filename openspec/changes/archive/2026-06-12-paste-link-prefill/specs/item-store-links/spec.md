# item-store-links (delta)

## ADDED Requirements

### Requirement: Store rows SHALL carry optional fetched-price provenance

The `item_stores` table SHALL carry three nullable columns: `price_fetched_at` (timestamp — when the stored price was captured by an automated product fetch), `canonical_url` (text — the canonical product URL or vendor key, e.g. an ASIN-bearing URL, for future dedupe), and `currency` (text). Manually entered store rows SHALL leave all three null. These fields SHALL be optional passthroughs in the store create/update path and SHALL NOT participate in the store-validity rule (a store remains valid solely on name + link + numeric price).

#### Scenario: Manual store rows have null provenance

- **WHEN** a user creates or edits a store row by hand
- **THEN** `price_fetched_at`, `canonical_url`, and `currency` SHALL persist as null

#### Scenario: Provenance does not affect validity

- **WHEN** a store row has name, link, and numeric price but null provenance columns
- **THEN** it SHALL be a valid store for every rendering and sorting rule in this capability

### Requirement: Fetched prices SHALL display their capture date to the owner

Where a store row's price is displayed on owner-facing editing surfaces (the item form's store rows), a store whose `price_fetched_at` is non-null SHALL render a muted "price as of {date}" annotation using the capture date. Stores with null `price_fetched_at` SHALL render no annotation. Viewer-facing price displays (cards, metadata lines, purchase modal) are unchanged by this requirement.

#### Scenario: Fetched price shows capture date in the form

- **WHEN** the owner edits an item whose store row has `price_fetched_at` set
- **THEN** the store row SHALL render a muted "price as of {date}" annotation

#### Scenario: Manual price shows no annotation

- **WHEN** the owner edits an item whose store row has null `price_fetched_at`
- **THEN** no "price as of" annotation SHALL render
