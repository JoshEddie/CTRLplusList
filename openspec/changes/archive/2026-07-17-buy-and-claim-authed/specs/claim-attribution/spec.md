## ADDED Requirements

### Requirement: Buy & Claim SHALL surface an undo popup on the recorded claim

When an authenticated non-owner records a self-claim via `Buy & Claim ↗` (owned by `item-actions`), the client SHALL open an undo popup in the wishlist tab once the claim is confirmed by `createPurchase`. The popup SHALL be a controlled modal built on the shared `Modal` primitive — a surface distinct from the `Manage claim` already-claimed modal state — presenting:

- a title "You've claimed this";
- a quantity-agnostic message conveying that the claim can be undone if the purchase did not happen (wrong price, sold out, changed mind), releasing the item for someone else;
- a left action rendered through `<Button variant="ghost">` labeled "No — undo claim" that SHALL dispatch `removePurchase` on the just-recorded claim with no additional confirmation step, releasing the item to its claimable presentation;
- a right action rendered through `<Button variant="primary">` labeled "Yes, I purchased it" that SHALL dismiss the popup with the claim intact.

The popup SHALL NOT be rendered through `confirm-dialog-system`'s `ConfirmDialog` (whose Cancel/Confirm slots and destructive-confirm variant lock cannot express a left ghost action with a right primary dismissal). The popup's open state SHALL be ephemeral consumer state — a page reload SHALL NOT re-open it, and the persistent `Manage claim` affordance (owned by the existing already-claimed-state requirement) remains the durable path to release the claim. The popup SHALL open only after `createPurchase` succeeds; a rejected claim SHALL NOT open it.

#### Scenario: Successful Buy & Claim opens the undo popup

- **WHEN** an authenticated non-owner's `Buy & Claim ↗` self-claim is confirmed by `createPurchase`
- **THEN** an undo popup SHALL open with the title "You've claimed this", a left `ghost` "No — undo claim" button, and a right `primary` "Yes, I purchased it" button

#### Scenario: No — undo claim releases the item

- **WHEN** the viewer activates "No — undo claim" in the undo popup
- **THEN** `removePurchase` SHALL be dispatched for the just-recorded claim with no intervening confirmation, and the item SHALL return to its claimable presentation

#### Scenario: Yes, I purchased it keeps the claim

- **WHEN** the viewer activates "Yes, I purchased it" in the undo popup
- **THEN** the popup SHALL dismiss, the claim SHALL persist, and the item SHALL present the viewer's `Manage claim` state

#### Scenario: A rejected claim opens no popup

- **WHEN** the `Buy & Claim ↗` self-claim is rejected by `createPurchase`
- **THEN** no undo popup SHALL render and the item SHALL remain in its claimable presentation

#### Scenario: Reload does not re-open the popup

- **WHEN** the viewer reloads the page after a `Buy & Claim ↗` self-claim without acting on the popup
- **THEN** the undo popup SHALL NOT re-open, and the viewer's claim SHALL be reachable via the `Manage claim` affordance
