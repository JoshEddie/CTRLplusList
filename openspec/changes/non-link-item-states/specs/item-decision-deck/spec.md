# Delta: item-decision-deck

## MODIFIED Requirements

### Requirement: Photo and store tiers SHALL come from pure tier helpers

Pure `photoTier(photos)` and `storeTier(store)` helpers SHALL classify those two fields alongside the existing `titleTier` and `priceTier`, each returning a tier plus a note stating the field's issue. `storeTier` SHALL cover the store name + link pair only (price is owned by the price tier rules) with symmetric coupling: both fields empty → `good` with an empty note (linkless is a supported state, not a gap — owner decision on #256); a non-empty name with an empty link → `error` with a note that a store name needs a link; a link that is non-empty and fails `isValidProductUrl`, or a link present without a name → `error` with the existing naming/link notes. There is no `warn` tier for the store. No surface SHALL derive a photo or store tier inline. The tier helpers remain the single source for these rules so they cannot drift between the deck, the shells, the Focus editors, and Preview.

#### Scenario: A photo-less item is warned, not errored

- **WHEN** an item has no photos
- **THEN** `photoTier` SHALL return the `warn` tier with a note stating that the item has no photo

#### Scenario: An empty store pair is good

- **WHEN** the store's name and link are both empty
- **THEN** `storeTier` SHALL return the `good` tier — the store step/row SHALL NOT block saving

#### Scenario: A nameless store is an error

- **WHEN** the store has a link but no name
- **THEN** `storeTier` SHALL return the `error` tier with a note that the store needs a name

#### Scenario: A name without a link is an error

- **WHEN** the store has a name but an empty link
- **THEN** `storeTier` SHALL return the `error` tier with a note that a store name needs a link

#### Scenario: An invalid non-empty link is an error

- **WHEN** the store's link is non-empty and fails `isValidProductUrl`
- **THEN** `storeTier` SHALL return the `error` tier with a note that the store needs a valid link

#### Scenario: Tiers are not derived at the row

- **WHEN** a field row renders a photo or store tier status
- **THEN** it SHALL read the tier from the tier helper rather than computing it from the field's value

### Requirement: The price SHALL be required with a link to the source page, never silently zero

A price SHALL be required whenever the store carries a link: the `price` card SHALL NOT offer a "Skip" affordance, and its primary continue affordance SHALL be disabled until a non-empty numeric price is entered. The card SHALL show a `link`-variant affordance to open the store product page in a new tab so the user can check a price that was not pulled. When the store's name and link are both empty (a linkless item — reached today via the edit path or by clearing the store fields), an empty price SHALL be `good` with a neutral note ("No price — saves without one") at every gate that consumes the price state (step blocking, row tiers, the Fill-manually advance, Preview's save gate) — the price format check itself (`priceTier`/`PRICE_PATTERN`) is unchanged and a non-empty malformed price SHALL remain an `error` regardless of link presence. An empty price SHALL never be persisted as `$0.00`; a store row carrying a name and link SHALL require a numeric price per `item-store-links`.

#### Scenario: Price card blocks until a price is entered

- **WHEN** the price card is shown with no fetched price (fetch path — the store carries a link)
- **THEN** continue SHALL be disabled, no "Skip" SHALL be present, and a link to the product page SHALL be available

#### Scenario: Entered price enables continue

- **WHEN** the user types a numeric price
- **THEN** the price tier SHALL become `good` and continue SHALL be enabled

#### Scenario: Empty price on a linkless item does not block

- **WHEN** an item whose store name and link are both empty has an empty price
- **THEN** the price state SHALL be `good` with the neutral note and no advance or save gate SHALL block on it

#### Scenario: Malformed price is an error even when linkless

- **WHEN** a linkless item's price is non-empty and fails `PRICE_PATTERN`
- **THEN** the price state SHALL be `error` and the save gate SHALL block

### Requirement: Preview SHALL be the universal create/edit surface

The Preview SHALL render the item exactly as it appears on a list by reusing the production list card component itself (the real `ItemCard`, in the owner perspective, with its action area in `ItemActions` view-only mode per `item-actions`), not a separate lookalike — so there is zero divergence between the preview and the created item (layout, photo framing, price line, store affordance all identical). Gaps SHALL surface exactly as the live card surfaces them (a missing price is simply absent on the card); the "fill this in" nudges live off the card, on the action rows and Triage. The Preview SHALL be the entry surface for the fetch (after the deck) and edit paths, and the surface the Fill-manually shell advances into; manual entry SHALL NOT open the Preview directly. It SHALL expose: a "Need to change something?" entry to Triage; a "Store" entry opening the grouped Store editor and a "Lists & quantity" entry opening its sheet; an "Add a note" entry when the description is empty; and a primary Create/Save action. The Create/Save action SHALL be disabled while the title tier is `error`, with an inline trim affordance and explanatory line, and while any store or price row is in the `error` tier per the tri-state rules — a linkless item with empty store fields (and an empty or good price) has no `error` tier and SHALL save. The Preview SHALL remain the sole save surface for every path. The previous `ItemForm` SHALL be retired in favor of this surface.

#### Scenario: Manual entry reaches Preview through the Fill-manually shell

- **WHEN** the Fill-manually shell advances
- **THEN** the Preview SHALL render seeded with the entered values, exposing the same entries and Create action as a fetched item, and SHALL be the only surface offering the Create action

#### Scenario: Edit opens Preview seeded from the item

- **WHEN** the user edits an existing item
- **THEN** Preview SHALL render seeded with the item's values (the primary store for a legacy multi-store item) and a "Save changes" action

#### Scenario: Error-tier name blocks create

- **WHEN** the name exceeds 100 characters on Preview
- **THEN** Create/Save SHALL be disabled with a trim affordance and an explanatory line

#### Scenario: Incomplete store blocks create

- **WHEN** the store row is in the `error` tier on Preview (e.g. a legacy item whose store has a name or link but not a valid pair)
- **THEN** Create/Save SHALL be disabled until the store is completed or cleared

#### Scenario: Store-less edit saves

- **WHEN** the owner edits an item with no store rows, leaves the store fields empty, and activates Save
- **THEN** the save SHALL succeed with no store validation failure
