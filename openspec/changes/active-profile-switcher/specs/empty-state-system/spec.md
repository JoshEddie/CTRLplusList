## ADDED Requirements

### Requirement: Empty SHALL accept an optional secondary action rendered after its CTA

The `<Empty>` primitive SHALL accept an optional secondary action — a destination and its label — and SHALL render it as a `<LinkButton variant="secondary">` immediately after the CTA, inside the same `empty-container`. When no secondary action is supplied, the empty-container's contents SHALL be exactly what the sibling requirements describe, so every existing consumer is unchanged.

The secondary action SHALL be available only where a CTA renders, which is where `type !== 'purchase'`. The purchased view has nothing to create and nothing to switch between — it is scoped to the human rather than to a profile — so `type === 'purchase'` SHALL continue to render no interactive element at all, and SHALL reject a secondary action rather than rendering one.

The primitive SHALL NOT decide when a secondary action is warranted or what it says. It renders what its consumer supplies; the profile-scoped surfaces that supply one, and the condition under which they do, are governed by `active-profile`.

#### Scenario: A supplied secondary action renders after the CTA

- **WHEN** `<Empty type="item" setShowNewItem={fn} />` is rendered with a secondary action
- **THEN** the empty-container holds the CTA followed by an `<a>` rendered by `<LinkButton variant="secondary">`, whose accessible name is the supplied label and whose `href` is the supplied destination

#### Scenario: No secondary action leaves the empty-container unchanged

- **WHEN** `<Empty type="list" />` is rendered with no secondary action
- **THEN** the empty-container holds its title, description and CTA, and no additional interactive element

#### Scenario: The purchase type renders no secondary action

- **WHEN** `<Empty type="purchase" />` is rendered with a secondary action supplied
- **THEN** no `<button>` and no `<a>` is present inside the empty-container
