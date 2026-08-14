# claim-attribution Delta

## MODIFIED Requirements

### Requirement: The purchase modal SHALL present an already-claimed state with store access and claim removal

When the viewer opens the purchase modal on an item where they hold a removable claim (their own claim, or one they recorded for someone else), the modal SHALL render the already-claimed state: the store row, a confirmation banner ("✓ You claimed this", or naming the attributed person for a claim recorded on someone's behalf), and a "Remove my claim" action. This state replaces the previous confirm-only unclaim dialog — the claimer always retains store-link access from it, so claiming an item never locks the claimer out of the store link needed to buy it. Activating "Remove my claim" SHALL dispatch the removal with no additional confirmation step (the modal state itself is the deliberate surface). The card affordance opening this state is `Manage claim` (owned by `item-actions`; the former "Manage your claim" label is retired). The unclaim authorization matrix (claimer, purchaser, owner master unclaim, guest exact-name path) is owned by the existing removal requirement and is unchanged.

#### Scenario: Claimer reaches store links after claiming

- **WHEN** a viewer who claimed an item opens the purchase modal (via `Manage claim` or an undo affordance)
- **THEN** the store row renders with the live store link and the "Remove my claim" action renders below it

#### Scenario: Remove my claim removes in one activation

- **WHEN** the viewer activates "Remove my claim" in the already-claimed state
- **THEN** `removePurchase` is dispatched for that claim with no intervening confirmation dialog, and the item returns to its claimable presentation

#### Scenario: Store-link click never routes to claim removal

- **WHEN** a viewer with an existing claim activates a store link in the already-claimed modal state
- **THEN** the store opens in a new tab and no unclaim dispatch or unclaim prompt occurs
