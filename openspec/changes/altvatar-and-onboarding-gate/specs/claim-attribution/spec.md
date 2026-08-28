## MODIFIED Requirements

### Requirement: The purchase modal SHALL present an already-claimed state with store access and claim removal

When the purchase modal opens in the viewer manage state (via `Manage claim`, or via the default rule when the viewer holds a removable claim), it SHALL render: the store row (owned by `item-store-links`), and a claims list under a "Claimed by" section label containing **every** claim on the item, with a removal action rendered only on rows the viewer may remove (their own claim and each claim they recorded for someone else). The same claims-list component SHALL serve the owner's `Manage claims` modal, where every row carries the removal action (master unclaim). The list presentation SHALL be uniform at every claim count, including a single claim (the former single-claim banner + full-width "Remove my claim" presentation is retired).

A signed-out guest whose claim is cookie-recognized (`claimedByViewer` set by `guest-claim-identity`'s overlay) SHALL reach this state through the same affordances and default rule as an authenticated viewer; their cookie-identified rows carry the removal action.

Each row SHALL render: the purchaser's avatar — for a purchaser that is a profile, resolved through `altvatar`'s chain (its Altvatar art where it has any, its initials otherwise); for a free-text purchaser, initials derived from the entered name. Whether an account backs the profile SHALL NOT govern what the row can show: a managed profile carries a face on the same terms as anyone else, and no branch decides between an account's image and a fallback. The row SHALL also render the claim label — the viewer's own claim as "{first name} (you)", falling back to plain "You" when no viewer name is available, and other claims as the purchaser's first name — the claim's relative date (from the row's `purchased_at`, via the shared relative-time derivation), and, for a claim whose asserter differs from its purchaser, a gender-neutral attribution line ("Added by you" when the viewer recorded it; "Added by {claimer first name}" in the owner's view). The "(you)" long-form label is scoped to this list — the card banner and spoiler banner retain the short "You" form. Removal actions SHALL carry per-claim accessible names distinguishing whose claim they remove. The list region SHALL scroll independently when claims overflow, keeping the modal header and store row in place.

The list SHALL order rows the viewer can remove ahead of all other claims, and SHALL initially render a bounded number of rows with a "See more" control (naming the remaining count) that reveals additional rows in batches — never the whole set at once — so an item with arbitrarily many claims (an unlimited-quantity item with a large audience) cannot render an unbounded list. The bound and batch size are design-recorded constants.

The claimer always retains store-link access from this state, so claiming an item never locks the claimer out of the store link needed to buy it. Activating a removal SHALL dispatch the removal for exactly that claim with no additional confirmation step (the modal state itself is the deliberate surface). Removing the last removable claim SHALL close the modal, returning the item to its viewer-appropriate presentation. The card affordance opening this state is `Manage claim` (owned by `item-actions`). The unclaim authorization matrix (claimer, purchaser, owner master unclaim, guest cookie path) is owned by the removal requirement; listing another viewer's claim SHALL NOT render a removal action for it.

#### Scenario: Claimer reaches store links after claiming

- **WHEN** a viewer who claimed an item opens the purchase modal via `Manage claim`
- **THEN** the store row renders with the live store link and the claims list renders below it

#### Scenario: Manage state lists all claims with removal only on the viewer's own

- **WHEN** a viewer holding a self-claim and one claim recorded for another person opens the manage state on an item that also carries a third claim recorded by someone else
- **THEN** the claims list SHALL render three rows, the viewer's two rows SHALL carry removal actions, and the third row SHALL render without one

#### Scenario: A profile purchaser's row renders that profile's art

- **WHEN** a claim's purchaser is a profile carrying Altvatar art
- **THEN** its row's avatar renders that art, whether or not an account backs the profile

#### Scenario: A free-text purchaser's row renders initials

- **WHEN** a claim's purchaser was entered as free text
- **THEN** its row's avatar renders initials derived from the entered name

#### Scenario: Own claim is labeled with the viewer's name

- **WHEN** the viewer's own claim renders in the claims list and their first name is available
- **THEN** the row label SHALL read "{first name} (you)", and a claim they recorded for someone else SHALL carry the "Added by you" attribution line

#### Scenario: Rows show the claim date

- **WHEN** a claim with a recorded `purchased_at` renders in the claims list
- **THEN** the row SHALL include that date rendered through the shared relative-time derivation

#### Scenario: Viewer-removable rows sort first

- **WHEN** the manage state opens on an item where the viewer's claims were recorded after several other claims
- **THEN** the viewer's removable rows SHALL render at the top of the list, ahead of every non-removable row

#### Scenario: Many claims render behind a See more control

- **WHEN** the claims list opens on an item whose claim count exceeds the initial render bound
- **THEN** only the initial batch of rows SHALL render, with a "See more" control naming the remaining count; activating it reveals the next batch, and the control disappears once every claim is rendered

#### Scenario: Per-claim removal removes only the activated claim

- **WHEN** the viewer activates the removal action on one claim among several
- **THEN** `removePurchase` is dispatched for that claim only, with no intervening confirmation dialog, and the remaining claims stay listed

#### Scenario: Removing the last claim closes the modal

- **WHEN** the viewer removes the only remaining removable claim from the manage state
- **THEN** the modal SHALL close and the item SHALL return to its claimable presentation

#### Scenario: Store-link click never routes to claim removal

- **WHEN** a viewer with an existing claim activates a store link in the manage state
- **THEN** the store opens in a new tab and no unclaim dispatch or unclaim prompt occurs

#### Scenario: Cookie-recognized guest manages their claim

- **WHEN** a signed-out guest whose `guest_claims` cookie lists their claim opens the purchase modal on that item
- **THEN** the modal opens in the manage state, the guest's cookie-identified row carries a removal action, and activating it removes the claim and returns the item to its claimable presentation
