# item-actions delta

## MODIFIED Requirements

### Requirement: View item SHALL navigate to the primary store in a new tab without claiming

`View item ↗` SHALL render as a `<LinkButton target="_blank" rel="noreferrer">` (per `button-system`) pointing at the primary store — the item's DAL-provided scalar `store`, selected once at the read boundary per `item-store-links`, gated complete by the shared validity predicate. The component SHALL NOT run its own primary-store selection over an array. It SHALL NOT record or modify any claim. The `↗` glyph (`MdOpenInNew`) SHALL be `aria-hidden`, with "opens in new tab" conveyed in the accessible name. Activating it SHALL NOT propagate the click to any enclosing row, card, or label handler (row selection, picker checkbox toggling, and navigation surfaces are unaffected).

#### Scenario: View item opens the store only

- **WHEN** the user activates `View item ↗`
- **THEN** the primary store URL SHALL open in a new tab and no claim state SHALL change

#### Scenario: Activation does not bubble to the enclosing surface

- **WHEN** `View item ↗` is activated inside a choose-items label or a clickable row
- **THEN** the enclosing surface's handler SHALL NOT fire — the checkbox does not toggle and the row does not navigate

#### Scenario: New-tab semantics are accessible

- **WHEN** `View item ↗` renders
- **THEN** the `↗` icon SHALL be `aria-hidden` and the control's accessible name SHALL convey that it opens in a new tab
