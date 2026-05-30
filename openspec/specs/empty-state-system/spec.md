# empty-state-system Specification

## Purpose
TBD - created by archiving change test-misc-primitives. Update Purpose after archive.
## Requirements
### Requirement: Empty SHALL render an empty-container with capitalized type-aware title and description

The `<Empty>` primitive at `app/ui/components/Empty.tsx` SHALL render a `<div class="empty-container">` containing an `<h3>` (title) and a `<p>` (description). The `type` prop SHALL be capitalized for display via `type.charAt(0).toUpperCase() + type.slice(1)` (first character uppercased; remainder preserved). The title and description SHALL branch on whether `type === 'purchase'`:

- When `type === 'purchase'`: title SHALL be exactly the string `"No Purchases Found"`; description SHALL be exactly the string `"You have not marked any items as purchased yet."`.
- When `type !== 'purchase'`: title SHALL be `` `No ${capitalizedType}s Found` `` (the capitalized type plus the literal suffix `s Found`); description SHALL be `` `Create your first ${capitalizedType} below.` ``.

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

- **WHEN** `<Empty type="item" setShowNewItem={fn} />` is rendered
- **THEN** the `<p>` text is exactly `"Create your first Item below."`

#### Scenario: type=purchase description is bespoke

- **WHEN** `<Empty type="purchase" />` is rendered
- **THEN** the `<p>` text is exactly `"You have not marked any items as purchased yet."`

### Requirement: Empty CTA SHALL branch on type and setShowNewItem presence

The `<Empty>` primitive SHALL render exactly one CTA element OR no CTA element, according to:

- When `type === 'purchase'`: NO CTA SHALL render (purchases are derived from items, not directly creatable).
- When `type !== 'purchase'` AND `setShowNewItem` is provided (truthy function): the CTA SHALL render as a `<Button variant="primary">` containing a `<FaPlus size={14}>` icon followed by the text `` `Create ${capitalizedType}` ``. Clicking the button SHALL invoke `setShowNewItem(true)` exactly once.
- When `type !== 'purchase'` AND `setShowNewItem` is NOT provided (undefined / falsy): the CTA SHALL render as a `<LinkButton variant="primary" href={`/${type}s/new`}>` containing a `<FaPlus size={14}>` icon followed by the text `` `Create ${capitalizedType}` ``. The href encodes the route convention `/{plural-type}/new`.

#### Scenario: type=purchase has no CTA

- **WHEN** `<Empty type="purchase" />` is rendered
- **THEN** no `<button>` is present inside the empty-container
- **AND** no `<a>` is present inside the empty-container

#### Scenario: type=item with setShowNewItem renders Button with primary variant

- **WHEN** `<Empty type="item" setShowNewItem={fn} />` is rendered
- **THEN** a `<Button variant="primary">` (rendered as a `<button>` per `button-system`) is present inside the empty-container
- **AND** the button's accessible name is `"Create Item"`
- **AND** an icon (`<svg>`, e.g. `<FaPlus>`) is rendered as the leading content inside the button

#### Scenario: type=item with setShowNewItem - button click invokes setter with true

- **WHEN** the CTA button is clicked
- **THEN** the `setShowNewItem` spy is called exactly once with the argument `true`

#### Scenario: type=item without setShowNewItem renders LinkButton

- **WHEN** `<Empty type="item" />` is rendered (no `setShowNewItem` prop)
- **THEN** an `<a>` (rendered by `<LinkButton variant="primary">` per `button-system`) is present inside the empty-container
- **AND** the link's `href` is exactly `"/items/new"`
- **AND** the link's accessible name is `"Create Item"`

#### Scenario: type=list without setShowNewItem - link href pluralizes

- **WHEN** `<Empty type="list" />` is rendered (no `setShowNewItem` prop)
- **THEN** the link's `href` is exactly `"/lists/new"`

#### Scenario: Empty renders title and description as heading and paragraph

- **WHEN** `<Empty>` is rendered (any type)
- **THEN** the title is rendered inside an `<h3>` element
- **AND** the description is rendered inside a `<p>` element
- **AND** both are descendants of the `<div class="empty-container">` wrapper

