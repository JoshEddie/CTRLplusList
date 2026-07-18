# e2e-critical-flows delta — add-claim-while-claimed

## ADDED Requirements

### Requirement: Item-action and claim-lifecycle flows SHALL be covered by end-to-end tests

The Playwright suite under `e2e/` SHALL cover the following flows through the running application against the seeded development database, driving real user-visible affordances and asserting observable outcomes — rendered content, persisted state reflected on reload, or navigation — NOT mere execution. Removing or disabling coverage of any listed flow SHALL be a violation of this requirement. These flows consolidate the e2e coverage deferred from the `Buy & Claim` change (#235) with this change's affordance routing, covering the #234/#235/#260 surface together:

1. **Buy & Claim records a claim and surfaces the undo popup — kept path** — an authenticated non-owner activates `Buy & Claim ↗` on a claimable linked item; the undo popup opens; activating "Yes, I purchased it" dismisses it with the claim intact (card shows `Manage claim` and the viewer's claim banner, persisted on reload).
2. **Buy & Claim undo releases the claim** — same entry; activating "No — undo claim" removes the just-recorded claim and the item returns to its claimable action set.
3. **Add Claim opens the claim flow while the viewer holds a claim** — on a multi-quantity item where the seeded viewer already holds a claim and slots remain, `Add Claim` opens the claim flow (not the manage state) and an additional attributed or guest-name claim is recorded and displayed.
4. **Manage claim lists claims with per-claim removal** — a viewer holding multiple removable claims opens `Manage claim`, sees each claim as its own row, removes one, and the remaining claim stays listed and persisted.
5. **ItemActions matrix spot-checks** — an authenticated non-owner's claimable linked item renders `Buy & Claim ↗` as the primary top slot with `View item ↗` · `Add Claim` below; a guest's claimable item renders `Add Claim` primary with no `Buy & Claim ↗` (guest project).

#### Scenario: Buy and Claim kept path persists the claim

- **WHEN** the authenticated suite activates `Buy & Claim ↗` on a seeded claimable item and confirms "Yes, I purchased it" in the undo popup
- **THEN** the popup dismisses, the card presents `Manage claim` with the viewer's claim banner, and the claim survives a page reload

#### Scenario: Buy and Claim undo path releases the claim

- **WHEN** the authenticated suite activates `Buy & Claim ↗` and then "No — undo claim" in the undo popup
- **THEN** the just-recorded claim is removed and the item presents its claimable action set again

#### Scenario: Add Claim while claimed records an additional claim

- **WHEN** the authenticated suite opens `Add Claim` on a seeded partial-claimed item where the viewer already holds a claim and records a claim for another person
- **THEN** the claim flow (not the manage state) is the opened surface and both claims are subsequently visible on the item

#### Scenario: Per-claim removal from the manage list

- **WHEN** the authenticated suite opens `Manage claim` on an item where the viewer holds two removable claims and removes one
- **THEN** the removed claim disappears, the other remains listed, and the removal persists on reload

#### Scenario: Matrix spot-checks render the specified action sets

- **WHEN** the authenticated suite views a seeded claimable linked item and the guest suite views a claimable item
- **THEN** the authenticated card renders `Buy & Claim ↗` primary with `View item ↗` · `Add Claim` below, and the guest card renders `Add Claim` primary with no `Buy & Claim ↗`
