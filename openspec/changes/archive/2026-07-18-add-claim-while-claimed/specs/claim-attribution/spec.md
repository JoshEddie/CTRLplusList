# claim-attribution delta — add-claim-while-claimed

## ADDED Requirements

### Requirement: The purchase modal's opening state SHALL be selected by the invoking affordance

The purchase modal SHALL open in the state named by the invoking affordance, carried as a second URL search param alongside `?purchaseItem=<id>`: `Add Claim` SHALL set `purchaseView=claim` and open the claim flow; `Manage claim` (and any opener that sets no `purchaseView`) SHALL open under the default rule — the viewer manage state when the viewer holds a removable claim, the claim flow otherwise, preserving the pre-existing behavior. An absent or unrecognized `purchaseView` value SHALL resolve through the default rule. Closing the modal SHALL clear both `purchaseItem` and `purchaseView` from the URL. The owner's modal and the guest modal are unaffected: their single viewer-appropriate state renders regardless of `purchaseView`. Card affordances are the only router between modal states — neither modal state SHALL offer navigation into the other.

#### Scenario: Add Claim opens the claim flow while the viewer holds a claim

- **WHEN** an authenticated non-owner who already holds a removable claim on a multi-quantity item with slots remaining activates the card's `Add Claim` affordance
- **THEN** the modal SHALL open in the claim flow (not the manage state), with `purchaseView=claim` present in the URL

#### Scenario: Manage claim opens the manage state

- **WHEN** the same viewer activates the card's `Manage claim` affordance
- **THEN** the modal SHALL open in the viewer manage state with no `purchaseView` param set

#### Scenario: Param-less open falls back to the default rule

- **WHEN** the modal is opened via a URL carrying only `?purchaseItem=<id>` (reload, deep link, or history navigation)
- **THEN** the modal SHALL render the manage state if the viewer holds a removable claim and the claim flow otherwise

#### Scenario: Close clears both params

- **WHEN** the viewer closes the modal from either state
- **THEN** both `purchaseItem` and `purchaseView` SHALL be removed from the URL

### Requirement: The claim flow SHALL suppress the self-claim action for a viewer who is already the recorded purchaser

When the claim flow renders for an authenticated non-owner who is already the recorded purchaser of one of the item's claims (a claim marked `'self'`), the one-tap self-claim CTA ("Claim this gift") SHALL NOT render; the "Claiming for someone else?" disclosure (collapsed by default, per the existing single-screen requirement) and its attributed picker and guest-name fallback SHALL be the available claim paths. A viewer who holds only claims recorded for others (they are the claimer but not the purchaser) SHALL keep the live self-claim CTA — their own self-claim remains permitted by the purchaser-uniqueness backstop. Recording a second claim for the same purchaser remains rejected by the existing purchaser-uniqueness requirement; multi-unit self-claims are out of scope (MAP #230).

#### Scenario: Recorded purchaser sees no self-claim CTA

- **WHEN** a viewer whose self-claim is among the item's claims opens the claim flow via `Add Claim`
- **THEN** no "Claim this gift" CTA SHALL render, and the disclosure with the attributed picker and guest fallback SHALL render collapsed

#### Scenario: Claimer-only viewer keeps the self-claim CTA

- **WHEN** a viewer who recorded a claim for someone else (and holds no self-claim) opens the claim flow via `Add Claim`
- **THEN** the "Claim this gift" CTA SHALL render and record their self-claim normally

#### Scenario: Additional attributed claim records from the claim flow

- **WHEN** a recorded purchaser opens the claim flow via `Add Claim` and confirms an eligible attributed target
- **THEN** a second purchase row SHALL be recorded with the viewer as `claimed_by` and the target as purchaser, and the item SHALL reflect both claims

### Requirement: The card claim banner SHALL enumerate all viewer-removable claims

The card's "You claimed this" banner SHALL name every claim the viewer can remove: the viewer's own claim rendered as "You claimed this" and each claim they recorded for someone else contributing "for {first name}", joined into one banner line via the existing claim-label derivation. The banner SHALL NOT present only the first-match claim when the viewer holds several. The banner's render predicate (any viewer-removable claim) and the `has-my-claim` container treatment are unchanged.

#### Scenario: Banner lists own and attributed claims together

- **WHEN** the viewer holds a self-claim and a claim they recorded for Grandma on the same item
- **THEN** the card banner SHALL name both ("You claimed this" and "for Grandma"), not just the first-recorded claim

## MODIFIED Requirements

### Requirement: The purchase modal SHALL present an already-claimed state with store access and claim removal

When the purchase modal opens in the viewer manage state (via `Manage claim`, or via the default rule when the viewer holds a removable claim), it SHALL render: the store row (owned by `item-store-links`), and a claims list under a "Claimed by" section label containing **every** claim on the item, with a removal action rendered only on rows the viewer may remove (their own claim and each claim they recorded for someone else). The same claims-list component SHALL serve the owner's `Manage claims` modal, where every row carries the removal action (master unclaim). The list presentation SHALL be uniform at every claim count, including a single claim (the former single-claim banner + full-width "Remove my claim" presentation is retired).

Each row SHALL render: the purchaser's avatar (their profile image when the purchaser is a linked account, initials derived from the display name otherwise), the claim label — the viewer's own claim as "{first name} (you)", falling back to plain "You" when no viewer name is available, and other claims as the purchaser's first name — the claim's relative date (from the row's `purchased_at`, via the shared relative-time derivation), and, for a claim whose asserter differs from its purchaser, a gender-neutral attribution line ("Added by you" when the viewer recorded it; "Added by {claimer first name}" in the owner's view). The "(you)" long-form label is scoped to this list — the card banner and spoiler banner retain the short "You" form. Removal actions SHALL carry per-claim accessible names distinguishing whose claim they remove. The list region SHALL scroll independently when claims overflow, keeping the modal header and store row in place.

The list SHALL order rows the viewer can remove ahead of all other claims, and SHALL initially render a bounded number of rows with a "See more" control (naming the remaining count) that reveals additional rows in batches — never the whole set at once — so an item with arbitrarily many claims (an unlimited-quantity item with a large audience) cannot render an unbounded list. The bound and batch size are design-recorded constants.

The claimer always retains store-link access from this state, so claiming an item never locks the claimer out of the store link needed to buy it. Activating a removal SHALL dispatch the removal for exactly that claim with no additional confirmation step (the modal state itself is the deliberate surface). Removing the last removable claim SHALL close the modal, returning the item to its viewer-appropriate presentation. The card affordance opening this state is `Manage claim` (owned by `item-actions`). The unclaim authorization matrix (claimer, purchaser, owner master unclaim, guest exact-name path) is owned by the existing removal requirement and is unchanged; listing another viewer's claim SHALL NOT render a removal action for it.

#### Scenario: Claimer reaches store links after claiming

- **WHEN** a viewer who claimed an item opens the purchase modal via `Manage claim`
- **THEN** the store row renders with the live store link and the claims list renders below it

#### Scenario: Manage state lists all claims with removal only on the viewer's own

- **WHEN** a viewer holding a self-claim and one claim recorded for another person opens the manage state on an item that also carries a third claim recorded by someone else
- **THEN** the claims list SHALL render three rows, the viewer's two rows SHALL carry removal actions, and the third row SHALL render without one

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
