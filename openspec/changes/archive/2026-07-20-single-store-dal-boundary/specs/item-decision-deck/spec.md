# item-decision-deck delta

## ADDED Requirements

### Requirement: The deck view model SHALL carry a single store

The deck view model SHALL hold one scalar `store` (never an array): `seedFromItem` SHALL consume the item's DAL-provided scalar `store` directly — the DAL selection rule (lowest-priced complete, else first row for repair, else null) is upstream, so the view model performs no selection and carries no fallback of its own; an item whose scalar is `null` SHALL seed the empty store shape. The store setter SHALL be `setStore(field, value)` with no index parameter, and no deck surface (cards, Focus/Store editors, Triage, Preview, adapter) SHALL access a store by position.

#### Scenario: Edit seeds from the DAL scalar

- **WHEN** the deck opens for edit on an item whose read returned a store (complete or repair-fallback)
- **THEN** the view model's `store` SHALL be that scalar, with no selection or fallback computed in the deck

#### Scenario: Store-less item seeds the empty store

- **WHEN** the deck opens for an item whose scalar `store` is `null`
- **THEN** the view model SHALL seed the empty store shape and the store/price rows SHALL show their error tiers as today

#### Scenario: Setter is index-free

- **WHEN** any deck editor updates the store name, link, or price
- **THEN** it SHALL call `setStore(field, value)` and the single `store` SHALL update

## MODIFIED Requirements

### Requirement: The submit adapter SHALL map the view-model to the persisted item shape

A single adapter SHALL translate the deck/Preview view-model to the existing `ItemDetails` payload at submit: the selected photo SHALL become the active image and the photo pool SHALL become `image_candidates`; quantity SHALL map to `quantity_limit` (number or null); the single `store` SHALL be emitted as the payload's scalar `store` object, preserving `price_fetched_at`/`canonical_url`/`currency` provenance; description SHALL pass through. The existing create/edit actions, associations, and the `items` cache tag SHALL be unchanged apart from the scalar store input.

#### Scenario: View-model maps to ItemDetails on create

- **WHEN** the user creates an item from Preview
- **THEN** the active image SHALL be `photos[photoIndex]`, `image_candidates` SHALL be the photo pool, `quantity_limit` SHALL be the chosen quantity (1 by default), and the scalar `store` with preserved provenance SHALL flow through the existing `createItem` action
