# item-actions — delta

## MODIFIED Requirements

### Requirement: Every item card SHALL delegate its action area to the ItemActions state matrix

A single `ItemActions` component SHALL own the per-item action area on every surface that renders an item card or row. Given the viewer's relationship to the item (owner or not, authenticated or guest), the claim state (viewer holds a removable claim, slots remaining, fully claimed by others), the spoiler state, and the presence of a complete store (per `item-store-links`' validity rule), it SHALL render exactly the action set below — no surface SHALL branch on these states outside the component:

Rows compose: the no-complete-store row removes only store-navigating actions (`Buy & Claim ↗`, `View item ↗`, and any future store-gated action) from whichever claim-state row applies — the claim-state row decides the rest. When `Buy & Claim ↗` is removed by this rule, `Add Claim` returns to the primary top slot.

| State | Top slot | Below |
|---|---|---|
| Non-owner, authenticated, claimable | `Buy & Claim ↗` (primary) | `View item ↗` · `Add Claim` (2-up) |
| Non-owner, guest, claimable | `Add Claim` (primary) | `View item ↗` (full width) |
| Non-owner, authenticated, viewer claimed, slots remain | `Manage claim` | `View item ↗` · `Add Claim` (2-up) |
| Non-owner, authenticated, viewer claimed, no slots left | `Manage claim` | `View item ↗` (full width) |
| Non-owner, guest, viewer claimed (any slot state) | `Manage claim` | `View item ↗` (full width) |
| Non-owner, fully claimed by others | `Fully claimed` (status) | `View item ↗` (full width) |
| Any viewer, no complete store | `Add Claim` (full width) | — |
| Owner, spoilers off | `View item ↗` (full width) | — |
| Owner, spoilers on, claimable | `Add Claim` (owner modal) | `View item ↗` |
| Owner, spoilers on, has claims | `Manage claims` | `View item ↗` |

The "viewer claimed" rows apply to any non-owner whose claim on the item is viewer-recognized: an authenticated viewer via session identity, or a signed-out guest via `guest-claim-identity`'s cookie overlay (`claimedByViewer`). A cookie-recognized guest gets `Manage claim`, not the guest-claimable row — and never `Add Claim` alongside it: a guest cannot attribute a claim to another person, and a repeat guest self-claim on the same item is not offered (multi-unit claims are the per-list-quantity map's scope).

`Buy & Claim ↗` SHALL be offered only to an authenticated non-owner on a claimable item whose primary store has a navigable link (`!!store.link` — the same predicate that gates `View item ↗`); a priced-but-linkless (PRICED) or bare item has no navigable link and SHALL fall to the `Add Claim` row, never `Buy & Claim ↗`. A guest non-owner without a recognized claim keeps `Add Claim` as the primary top slot (guest one-click is out of scope for this capability's current form). `Add Claim`, `Manage claim`, and `Manage claims` SHALL open the existing purchase modal in the viewer-appropriate state (contract owned by `claim-attribution`). The owner SHALL never be offered a store-navigating claim action; owner `Add Claim` records a claim per the owner modal's existing semantics.

#### Scenario: Authenticated claimable non-owner sees Buy & Claim over the two-up row

- **WHEN** an authenticated non-owner views an unclaimed item with open slots and a complete store
- **THEN** the top slot SHALL render `Buy & Claim ↗` as a primary action and the secondary row SHALL render `View item ↗` and `Add Claim` side by side at equal weight

#### Scenario: Guest claimable non-owner keeps Add Claim primary

- **WHEN** an unauthenticated (guest) non-owner with no cookie-recognized claim views an unclaimed item with a complete store
- **THEN** the top slot SHALL render `Add Claim` as the primary action with a full-width `View item ↗` below it, and no `Buy & Claim ↗` SHALL render

#### Scenario: Store-less authenticated claimable non-owner falls back to Add Claim

- **WHEN** an authenticated non-owner views an unclaimed item with no complete store
- **THEN** `Add Claim` SHALL render full width, and neither `Buy & Claim ↗` nor `View item ↗` SHALL render

#### Scenario: Priced-but-linkless item never offers Buy & Claim

- **WHEN** an authenticated non-owner views a claimable item whose primary store has a price but no navigable link (a PRICED item)
- **THEN** `Add Claim` SHALL render full width, and neither `Buy & Claim ↗` nor `View item ↗` SHALL render

#### Scenario: Viewer with a claim and open slots gets the 2-up row

- **WHEN** an authenticated viewer holds a removable claim on a multi-quantity item with slots remaining
- **THEN** the top slot SHALL read `Manage claim` and the secondary row SHALL render `View item ↗` and `Add Claim` side by side at equal weight

#### Scenario: Cookie-recognized guest gets Manage claim

- **WHEN** a signed-out guest whose `guest_claims` cookie lists their claim on an item views that item — slots remaining or not
- **THEN** the top slot SHALL read `Manage claim` with `View item ↗` full width below, and neither `Buy & Claim ↗` nor `Add Claim` SHALL render

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
