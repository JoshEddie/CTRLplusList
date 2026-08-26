## MODIFIED Requirements

### Requirement: Empty SHALL render an empty-container with capitalized type-aware title and description

The `<Empty>` primitive at `app/ui/components/Empty.tsx` SHALL render a `<div class="empty-container">` containing an `<h3>` (title) and a `<p>` (description). The `type` prop SHALL be capitalized for display via `type.charAt(0).toUpperCase() + type.slice(1)` (first character uppercased; remainder preserved). The title and description SHALL branch on whether `type === 'purchase'`:

- When `type === 'purchase'`: title SHALL be exactly the string `"No Purchases Found"`; description SHALL be exactly the string `"You have not marked any items as purchased yet."`.
- When `type !== 'purchase'`: title SHALL be `` `No ${capitalizedType}s Found` ``  (the capitalized type plus the literal suffix `s Found`). The description SHALL scope the emptiness to the profile being acted as when a secondary action is supplied, so it branches on whether one is: with none it SHALL be `` `Create your first ${capitalizedType} below.` ``, and with one it SHALL be `` `This profile has no ${capitalizedType}s yet — create one below, or switch profiles.` ``. The second form names no profile, per `active-profile`, and SHALL claim nothing about what the viewer's other profiles hold — a viewer whose profiles are all empty is told the truth too.

The capitalize-then-pluralize logic produces correct output for the current consumer types (`item` → `'No Items Found'`; `list` → `'No Lists Found'`). The exact-string title and description for the `purchase` branch lock the only path with bespoke copy.

#### Scenario: type=item title is "No Items Found"

- **WHEN** `<Empty type="item" setShowNewItem={fn} />` is rendered
- **THEN** the `<h3>` text is exactly `"No Items Found"`

#### Scenario: type=list title is "No Lists Found"

- **WHEN** `<Empty type="list" />` is rendered
- **THEN** the `<h3>` text is exactly `"No Lists Found"`

#### Scenario: type=purchase title is "No Purchases Found"

- **WHEN** `<Empty type="purchase" />` is rendered
- **THEN** the `<h3>` text is exactly `"No Purchases Found"` (the bespoke title, NOT `"No Purchases Found"` derived from capitalize-and-pluralize — the source's `type === 'purchase'` branch returns this literal)

#### Scenario: type=item description capitalizes

- **WHEN** `<Empty type="item" setShowNewItem={fn} />` is rendered with no secondary action
- **THEN** the `<p>` text is exactly `"Create your first Item below."`

#### Scenario: A secondary action scopes the description to the active profile

- **WHEN** `<Empty type="item" setShowNewItem={fn} />` is rendered with a secondary action
- **THEN** the `<p>` text is exactly `"This profile has no Items yet — create one below, or switch profiles."`
- **AND** it names no profile, and claims nothing about what the viewer's other profiles hold

#### Scenario: type=purchase description is bespoke

- **WHEN** `<Empty type="purchase" />` is rendered
- **THEN** the `<p>` text is exactly `"You have not marked any items as purchased yet."`

## ADDED Requirements

### Requirement: Empty SHALL accept an optional secondary action rendered beside its CTA

The `<Empty>` primitive SHALL accept an optional secondary action — a destination and its label — and SHALL render it as a `<LinkButton variant="secondary">` immediately after the CTA, inside the same `empty-container`.

When a secondary action is supplied, the two affordances SHALL share a wrapping row so they sit side by side while the row fits and stack once it does not. The row SHALL be rendered only when a secondary action is supplied: when none is, the empty-container's contents SHALL be exactly what the sibling requirements describe, down to the CTA being its direct child, so every existing consumer is unchanged.

The primitive SHALL NOT decide when a secondary action is warranted or what it says. It renders what its consumer supplies; the profile-scoped surfaces that supply one, the condition under which they do, and the copy they pass are governed by `active-profile`.

#### Scenario: A supplied secondary action renders after the CTA

- **WHEN** `<Empty type="item" setShowNewItem={fn} />` is rendered with a secondary action
- **THEN** the empty-container holds a row containing the CTA followed by an `<a>` rendered by `<LinkButton variant="secondary">`, whose accessible name is the supplied label and whose `href` is the supplied destination

#### Scenario: No secondary action leaves the empty-container unchanged

- **WHEN** `<Empty type="list" />` is rendered with no secondary action
- **THEN** the empty-container holds its title, description and CTA as direct children, with no wrapping row and no additional interactive element
