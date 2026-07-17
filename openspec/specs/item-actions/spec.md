# item-actions Specification

## Purpose
The `item-actions` capability governs the per-item action area: a single `ItemActions` component that, given the viewer's relationship to the item, its claim state, spoiler state, and the presence of a complete store, renders exactly one defined action set — no surface branches on these states outside the component. It exists to replace action logic previously split across `ItemCard`/`Purchase`, whose divergent "valid store" definitions could disagree about the same store.
## Requirements
### Requirement: Every item card SHALL delegate its action area to the ItemActions state matrix

A single `ItemActions` component SHALL own the per-item action area on every surface that renders an item card or row. Given the viewer's relationship to the item (owner or not), the claim state (viewer holds a removable claim, slots remaining, fully claimed by others), the spoiler state, and the presence of a complete store (per `item-store-links`' validity rule), it SHALL render exactly the action set below — no surface SHALL branch on these states outside the component:

Rows compose: the no-complete-store row removes only store-navigating actions (`View item ↗`, and any future store-gated action) from whichever claim-state row applies — the claim-state row decides the rest.

| State | Top slot | Below |
|---|---|---|
| Non-owner, claimable | `Add Claim` (primary) | `View item ↗` (full width) |
| Non-owner, viewer claimed, slots remain | `Manage claim` | `View item ↗` · `Add Claim` (2-up) |
| Non-owner, viewer claimed, no slots left | `Manage claim` | `View item ↗` (full width) |
| Non-owner, fully claimed by others | `Fully claimed` (status) | `View item ↗` (full width) |
| Any viewer, no complete store | `Add Claim` (full width) | — |
| Owner, spoilers off | `View item ↗` (full width) | — |
| Owner, spoilers on, claimable | `Add Claim` (owner modal) | `View item ↗` |
| Owner, spoilers on, has claims | `Manage claims` | `View item ↗` |

`Add Claim`, `Manage claim`, and `Manage claims` SHALL open the existing purchase modal in the viewer-appropriate state (contract owned by `claim-attribution`). The owner SHALL never be offered a store-navigating claim action; owner `Add Claim` records a claim per the owner modal's existing semantics. The interim top slot for the claimable state is `Add Claim`; a later change introducing `Buy & Claim ↗` displaces it into the secondary row without altering this layout contract.

#### Scenario: Claimable non-owner sees Add Claim over View item

- **WHEN** a non-owner views an unclaimed item with a complete store
- **THEN** the action area SHALL render a primary `Add Claim` button opening the purchase modal, with a full-width `View item ↗` below it

#### Scenario: Viewer with a claim and open slots gets the 2-up row

- **WHEN** the viewer holds a removable claim on a multi-quantity item with slots remaining
- **THEN** the top slot SHALL read `Manage claim` and the secondary row SHALL render `View item ↗` and `Add Claim` side by side at equal weight

#### Scenario: Fully-claimed item keeps store access

- **WHEN** a non-owner views an item fully claimed by others
- **THEN** the top slot SHALL be the `Fully claimed` status, `View item ↗` SHALL render full width below it, and no purchase-modal-opening affordance SHALL render

#### Scenario: Store-less item offers only Add Claim

- **WHEN** any viewer with claim access views an item with no complete store
- **THEN** `Add Claim` SHALL render full width and no `View item ↗` SHALL render

#### Scenario: Owner with spoilers off sees only View item

- **WHEN** the owner views their item with spoilers off
- **THEN** the action area SHALL contain only a full-width `View item ↗` — no claim affordance and no claim information

#### Scenario: Owner with spoilers on manages claims

- **WHEN** the owner views an item that has claims with spoilers enabled
- **THEN** the top slot SHALL read `Manage claims` opening the purchase modal's owner management state, with `View item ↗` below

### Requirement: View item SHALL navigate to the primary store in a new tab without claiming

`View item ↗` SHALL render as a `<LinkButton target="_blank" rel="noreferrer">` (per `button-system`) pointing at the primary store — the lowest-priced complete store per `item-store-links`. It SHALL NOT record or modify any claim. The `↗` glyph (`MdOpenInNew`) SHALL be `aria-hidden`, with "opens in new tab" conveyed in the accessible name. Activating it SHALL NOT propagate the click to any enclosing row, card, or label handler (row selection, picker checkbox toggling, and navigation surfaces are unaffected).

#### Scenario: View item opens the store only

- **WHEN** the user activates `View item ↗`
- **THEN** the primary store URL SHALL open in a new tab and no claim state SHALL change

#### Scenario: Activation does not bubble to the enclosing surface

- **WHEN** `View item ↗` is activated inside a choose-items label or a clickable row
- **THEN** the enclosing surface's handler SHALL NOT fire — the checkbox does not toggle and the row does not navigate

#### Scenario: New-tab semantics are accessible

- **WHEN** `View item ↗` renders
- **THEN** the `↗` icon SHALL be `aria-hidden` and the control's accessible name SHALL convey that it opens in a new tab

### Requirement: Fully claimed SHALL be a status, not a button

The `Fully claimed` state SHALL render as a non-interactive element with `role="status"` — never as a disabled button — so the fully-claimed treatment does not present an inert control as an affordance.

#### Scenario: Status is not focusable or activatable

- **WHEN** an item renders in the fully-claimed-by-others state
- **THEN** the `Fully claimed` element SHALL carry `role="status"`, SHALL NOT be a `<button>`, and SHALL NOT open the purchase modal on activation attempts

### Requirement: The action layout SHALL degrade by slot count and survive zoom and text spacing

The layout SHALL be: one full-width primary slot on top; below it a two-up equal-weight secondary row that exists only when there are two secondaries — a lone secondary renders full width. All buttons SHALL flow through `button-system` primitives with no persistent fine-print subtext inside any button. Controls SHALL use `min-height` (never fixed heights) and flexible widths so labels survive 200% zoom (WCAG 1.4.4), increased text spacing (WCAG 1.4.12), and ~30% localized label expansion without clipping.

#### Scenario: Single secondary stretches full width

- **WHEN** a state yields one primary and one secondary action
- **THEN** the secondary SHALL render full width — no half-empty 2-up row

#### Scenario: Layout survives 200% zoom

- **WHEN** the action area renders at 200% zoom or with WCAG 1.4.12 text spacing applied
- **THEN** no label SHALL clip and no control SHALL collapse below its minimum target size

### Requirement: Preview surfaces SHALL render ItemActions in view-only mode

Non-interactive item renderings — the deck's Preview card, `<Item preview>` rows (choose-items picker, and any surface rendering the preview variant) — SHALL render `ItemActions` in a view-only mode: a full-width `View item ↗` when a complete store exists, nothing otherwise, and never a claim affordance or claim status. `View item ↗` SHALL remain a live anchor on picker rows so the user can verify destination URLs.

#### Scenario: Picker row shows only a live View item

- **WHEN** a choose-items row renders an item with a complete store
- **THEN** the action area SHALL contain exactly a live `View item ↗` anchor and no claim control

#### Scenario: View-only with no store renders nothing

- **WHEN** a preview surface renders an item with no complete store
- **THEN** the action area SHALL render no actions

