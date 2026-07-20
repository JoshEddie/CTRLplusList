# item-actions Specification

## Purpose
The `item-actions` capability governs the per-item action area: a single `ItemActions` component that, given the viewer's relationship to the item, its claim state, spoiler state, and the presence of a complete store, renders exactly one defined action set — no surface branches on these states outside the component. It exists to replace action logic previously split across `ItemCard`/`Purchase`, whose divergent "valid store" definitions could disagree about the same store.
## Requirements
### Requirement: Every item card SHALL delegate its action area to the ItemActions state matrix

A single `ItemActions` component SHALL own the per-item action area on every surface that renders an item card or row. Given the viewer's relationship to the item (owner or not, authenticated or guest), the claim state (viewer holds a removable claim, slots remaining, fully claimed by others), the spoiler state, and the presence of a complete store (per `item-store-links`' validity rule), it SHALL render exactly the action set below — no surface SHALL branch on these states outside the component:

Rows compose: the no-complete-store row removes only store-navigating actions (`Buy & Claim ↗`, `View item ↗`, and any future store-gated action) from whichever claim-state row applies — the claim-state row decides the rest. When `Buy & Claim ↗` is removed by this rule, `Add Claim` returns to the primary top slot.

| State | Top slot | Below |
|---|---|---|
| Non-owner, authenticated, claimable | `Buy & Claim ↗` (primary) | `View item ↗` · `Add Claim` (2-up) |
| Non-owner, guest, claimable | `Add Claim` (primary) | `View item ↗` (full width) |
| Non-owner, viewer claimed, slots remain | `Manage claim` | `View item ↗` · `Add Claim` (2-up) |
| Non-owner, viewer claimed, no slots left | `Manage claim` | `View item ↗` (full width) |
| Non-owner, fully claimed by others | `Fully claimed` (status) | `View item ↗` (full width) |
| Any viewer, no complete store | `Add Claim` (full width) | — |
| Owner, spoilers off | `View item ↗` (full width) | — |
| Owner, spoilers on, claimable | `Add Claim` (owner modal) | `View item ↗` |
| Owner, spoilers on, has claims | `Manage claims` | `View item ↗` |

`Buy & Claim ↗` SHALL be offered only to an authenticated non-owner on a claimable item whose primary store has a navigable link (`!!store.link` — the same predicate that gates `View item ↗`); a priced-but-linkless (PRICED) or bare item has no navigable link and SHALL fall to the `Add Claim` row, never `Buy & Claim ↗`. A guest non-owner keeps `Add Claim` as the primary top slot (guest one-click is out of scope for this capability's current form). `Add Claim`, `Manage claim`, and `Manage claims` SHALL open the existing purchase modal in the viewer-appropriate state (contract owned by `claim-attribution`). The owner SHALL never be offered a store-navigating claim action; owner `Add Claim` records a claim per the owner modal's existing semantics.

#### Scenario: Authenticated claimable non-owner sees Buy & Claim over the two-up row

- **WHEN** an authenticated non-owner views an unclaimed item with open slots and a complete store
- **THEN** the top slot SHALL render `Buy & Claim ↗` as a primary action and the secondary row SHALL render `View item ↗` and `Add Claim` side by side at equal weight

#### Scenario: Guest claimable non-owner keeps Add Claim primary

- **WHEN** an unauthenticated (guest) non-owner views an unclaimed item with a complete store
- **THEN** the top slot SHALL render `Add Claim` as the primary action with a full-width `View item ↗` below it, and no `Buy & Claim ↗` SHALL render

#### Scenario: Store-less authenticated claimable non-owner falls back to Add Claim

- **WHEN** an authenticated non-owner views an unclaimed item with no complete store
- **THEN** `Add Claim` SHALL render full width, and neither `Buy & Claim ↗` nor `View item ↗` SHALL render

#### Scenario: Priced-but-linkless item never offers Buy & Claim

- **WHEN** an authenticated non-owner views a claimable item whose primary store has a price but no navigable link (a PRICED item)
- **THEN** `Add Claim` SHALL render full width, and neither `Buy & Claim ↗` nor `View item ↗` SHALL render

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

### Requirement: Buy & Claim SHALL navigate to the primary store in a new tab and record a self-claim

`Buy & Claim ↗` SHALL render as a `<LinkButton variant="primary" target="_blank" rel="noreferrer">` (per `button-system`) pointing at the primary store's link — the lowest-priced complete store per `item-store-links`, the same destination as `View item ↗`. It SHALL render only when that primary store has a navigable link (keyed on `!!store.link`, identical to `View item ↗`), so a priced-but-linkless (PRICED) or bare item never renders it. The `↗` glyph (`MdOpenInNew`) SHALL be `aria-hidden`, with "opens in new tab" conveyed in the accessible name. Activating it SHALL open the store URL in a new tab via the real anchor (the browser's native new-tab navigation) — never a timer-fired `window.open`, so the trusted user gesture and the wishlist tab survive. The same activation SHALL record a self-claim for the viewer through the existing claim path (`createPurchase` self-claim, owned by `claim-attribution`), awaiting the result; on success the undo popup (owned by `claim-attribution`) SHALL open in the wishlist tab, and on failure no popup SHALL open and the item SHALL remain claimable. The store-navigation activation SHALL NOT propagate the click to any enclosing row, card, or label handler.

#### Scenario: Buy & Claim opens the store and records a self-claim

- **WHEN** an authenticated non-owner activates `Buy & Claim ↗` on a claimable item with a complete store
- **THEN** the primary store URL SHALL open in a new tab AND a self-claim SHALL be recorded for the viewer

#### Scenario: A rejected claim leaves the item claimable with no popup

- **WHEN** the self-claim recorded by `Buy & Claim ↗` is rejected server-side (for example, the item raced to fully claimed)
- **THEN** no undo popup SHALL open and the item SHALL continue to present its claimable action set

#### Scenario: Navigation is a real anchor, not a timer

- **WHEN** `Buy & Claim ↗` renders
- **THEN** it SHALL be an anchor carrying `target="_blank" rel="noreferrer"` and its store navigation SHALL NOT depend on a JavaScript timer or a scripted `window.open`

#### Scenario: New-tab semantics are accessible

- **WHEN** `Buy & Claim ↗` renders
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

