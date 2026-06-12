## ADDED Requirements

### Requirement: A store SHALL be considered valid only when it has a name, a link, and a numeric price

`<StoreLinks>` SHALL treat a store as renderable only when it has a non-empty `name`, a non-empty `link`, and a `price` that coerces to a number (`Number(price)` is not `NaN`). Stores failing any of the three clauses SHALL be excluded from primary-buy-link selection, from the lowest-price computation, and from the `+N` popover. Only valid stores SHALL participate in the price-ascending sort.

#### Scenario: Store missing a name is excluded

- **WHEN** an item's `stores` array contains an entry with a falsy `name` (and other entries are valid)
- **THEN** that entry SHALL NOT appear as the primary buy-link, SHALL NOT appear in the `+N` popover, and SHALL NOT count toward the `+N` count

#### Scenario: Store missing a link is excluded

- **WHEN** an item's `stores` array contains an entry with a falsy `link`
- **THEN** that entry SHALL be excluded from the rendered primary chip and the popover

#### Scenario: Store with a non-numeric price is excluded

- **WHEN** an item's `stores` array contains an entry whose `price` does not coerce to a number (`Number(price)` is `NaN`)
- **THEN** that entry SHALL be excluded; no `$NaN` chip or popover row SHALL render

#### Scenario: Only valid stores are sorted and counted

- **WHEN** an item has a mix of valid and invalid store entries
- **THEN** the primary buy-link SHALL be the cheapest VALID store, the `.item-price` SHALL show that store's price, and the `+N` count SHALL equal the number of valid stores beyond the primary

### Requirement: With no valid store, StoreLinks SHALL render its children in an action-row wrapper or null

When an item has no valid store (no `lowestPrice`), `<StoreLinks>` SHALL NOT render the price row or any store chip. Instead it SHALL render its `children` wrapped in a single `<div className="item-action-row">`, or return `null` when no `children` are supplied. This preserves the claim/purchase affordance passed through by the parent for store-less items.

#### Scenario: Store-less item with children renders the action row

- **WHEN** `<StoreLinks>` receives an item with no valid store AND non-empty `children`
- **THEN** it SHALL render `<div className="item-action-row">` containing those `children`
- **AND** it SHALL NOT render `.item-price-row` or `.storeLinks`

#### Scenario: Store-less item without children renders nothing

- **WHEN** `<StoreLinks>` receives an item with no valid store AND no `children`
- **THEN** it SHALL render `null` (no `.item-action-row`, no `.item-price-row`, no `.storeLinks`)

### Requirement: Activating a buy-link or the +N trigger SHALL NOT propagate to the enclosing row

The primary buy-link `<LinkButton>` and the `+N` `<Button>` trigger SHALL each call `stopPropagation()` on their click event so that activating them does not bubble to the click handler of the enclosing card/row (which, depending on surface, selects the row, navigates, or toggles a picker checkbox). Toggling the `+N` popover SHALL still flip its open state; opening a buy-link SHALL still follow the anchor.

#### Scenario: Clicking the primary buy-link does not trigger the row handler

- **WHEN** `<StoreLinks>` is rendered inside an element with a click handler and the user clicks the primary buy-link
- **THEN** the enclosing element's click handler SHALL NOT fire

#### Scenario: Clicking the +N trigger does not trigger the row handler

- **WHEN** `<StoreLinks>` is rendered inside an element with a click handler and the user clicks the `+N` trigger
- **THEN** the enclosing element's click handler SHALL NOT fire
- **AND** the `+N` popover's open state SHALL toggle
