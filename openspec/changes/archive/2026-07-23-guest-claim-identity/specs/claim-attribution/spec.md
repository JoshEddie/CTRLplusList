# claim-attribution — delta

## MODIFIED Requirements

### Requirement: A claim SHALL be removable by its claimer, its purchaser, or the list owner

`removePurchase` SHALL authorize removal when the session-resolved viewer equals the row's `claimed_by`, OR equals the row's purchaser `user_id`, OR equals the `user_id` of the item the purchase targets (owner master unclaim). For unauthenticated callers, removal SHALL be authorized only for a row with all-NULL identity (`claimed_by IS NULL AND user_id IS NULL`) whose id appears in the caller's valid `guest_claims` cookie (owned by `guest-claim-identity`); the former exact-`guest_name`-match authorization is retired, and `removePurchase` SHALL NOT accept a `guest_name` field on its payload. The authorization check SHALL load the target row and its item owner before any delete. Removal rights derive from the row, item ownership, and the guest cookie only — never from the live follow graph.

#### Scenario: Claimer removes their attributed claim

- **WHEN** C invokes `removePurchase` on a row where `claimed_by = C`
- **THEN** the row is deleted

#### Scenario: Purchaser removes a claim made on their behalf

- **WHEN** B invokes `removePurchase` on a row where the purchaser `user_id = B` and `claimed_by ≠ B`
- **THEN** the row is deleted

#### Scenario: Owner master unclaim removes any claim on their item

- **WHEN** the item's owner invokes `removePurchase` on any purchase row targeting that item — including a signed-out guest row with all-NULL identities
- **THEN** the row is deleted

#### Scenario: Unrelated authenticated user cannot remove a claim

- **WHEN** an authenticated user who is neither `claimed_by`, nor the purchaser, nor the item owner invokes `removePurchase`
- **THEN** the action rejects and the row is unchanged

#### Scenario: Authenticated creator of a guest-name claim can remove it

- **WHEN** an authenticated user who recorded a guest-name claim (row has `claimed_by` = them, `user_id` NULL) invokes `removePurchase` on it
- **THEN** the row is deleted (the legacy lockout where `user_id IS NULL` blocked the creator no longer applies)

#### Scenario: Guest removes their cookie-identified claim

- **WHEN** an unauthenticated caller invokes `removePurchase` on an all-NULL-identity row whose id appears in the request's valid `guest_claims` cookie
- **THEN** the row is deleted

#### Scenario: Guest cannot remove a claim outside their cookie

- **WHEN** an unauthenticated caller invokes `removePurchase` on an all-NULL-identity row whose id is not in the request's `guest_claims` cookie (or with no valid cookie at all)
- **THEN** the action rejects and the row is unchanged, regardless of any name the caller supplies

#### Scenario: Cookie ids never authorize removal of identity-bearing rows

- **WHEN** an unauthenticated caller's cookie lists a purchase id whose row has a non-NULL `claimed_by` or `user_id`
- **THEN** `removePurchase` rejects — the cookie path applies only to all-NULL-identity rows

### Requirement: Viewer-relative claim display SHALL key off the purchaser, with the owner's spoiler view able to identify the claimer

`sanitizePurchases` SHALL mark a claim `'self'` when the viewer equals the purchaser `user_id` (not `claimed_by`), so an attributed user sees the claim as their own — this preserves the existing `user_id`-keyed marking unchanged. For a signed-out viewer, `guest-claim-identity`'s post-cache overlay SHALL additionally mark the viewer's cookie-identified claims `'self'`, so a guest's own claim presents exactly as an authed self-claim ("You" forms, no "Added by you" attribution line — the guest is the purchaser, not an asserter for a third party). Display names SHALL continue to resolve as: the purchaser user's name, else `guest_name`, else the existing fallback, rendered via the existing first-name derivation. In the owner's spoiler view, a claim whose `claimed_by` differs from its purchaser MAY additionally identify the claimer, letting the owner distinguish entries they or others recorded from direct gifter claims.

#### Scenario: Attributed user sees the claim as self

- **WHEN** B views an item where a row has purchaser `user_id = B` and `claimed_by = C`
- **THEN** the claim is presented as B's own claim

#### Scenario: Attributed claim displays the linked user's name

- **WHEN** any permitted viewer sees a claim with the purchaser `user_id` set
- **THEN** the displayed name derives from the linked user's stored name (first-name display), not from `guest_name`

#### Scenario: Cookie-identified guest claim presents as the viewer's own

- **WHEN** a signed-out viewer whose `guest_claims` cookie lists claim P views the item P targets
- **THEN** P presents as the viewer's own claim ("You" in the card banner, "{first name} (you)" in the manage list) with no "Added by you" attribution line

### Requirement: The purchase modal SHALL present an already-claimed state with store access and claim removal

When the purchase modal opens in the viewer manage state (via `Manage claim`, or via the default rule when the viewer holds a removable claim), it SHALL render: the store row (owned by `item-store-links`), and a claims list under a "Claimed by" section label containing **every** claim on the item, with a removal action rendered only on rows the viewer may remove (their own claim and each claim they recorded for someone else). The same claims-list component SHALL serve the owner's `Manage claims` modal, where every row carries the removal action (master unclaim). The list presentation SHALL be uniform at every claim count, including a single claim (the former single-claim banner + full-width "Remove my claim" presentation is retired).

A signed-out guest whose claim is cookie-recognized (`claimedByViewer` set by `guest-claim-identity`'s overlay) SHALL reach this state through the same affordances and default rule as an authenticated viewer; their cookie-identified rows carry the removal action.

Each row SHALL render: the purchaser's avatar (their profile image when the purchaser is a linked account, initials derived from the display name otherwise), the claim label — the viewer's own claim as "{first name} (you)", falling back to plain "You" when no viewer name is available, and other claims as the purchaser's first name — the claim's relative date (from the row's `purchased_at`, via the shared relative-time derivation), and, for a claim whose asserter differs from its purchaser, a gender-neutral attribution line ("Added by you" when the viewer recorded it; "Added by {claimer first name}" in the owner's view). The "(you)" long-form label is scoped to this list — the card banner and spoiler banner retain the short "You" form. Removal actions SHALL carry per-claim accessible names distinguishing whose claim they remove. The list region SHALL scroll independently when claims overflow, keeping the modal header and store row in place.

The list SHALL order rows the viewer can remove ahead of all other claims, and SHALL initially render a bounded number of rows with a "See more" control (naming the remaining count) that reveals additional rows in batches — never the whole set at once — so an item with arbitrarily many claims (an unlimited-quantity item with a large audience) cannot render an unbounded list. The bound and batch size are design-recorded constants.

The claimer always retains store-link access from this state, so claiming an item never locks the claimer out of the store link needed to buy it. Activating a removal SHALL dispatch the removal for exactly that claim with no additional confirmation step (the modal state itself is the deliberate surface). Removing the last removable claim SHALL close the modal, returning the item to its viewer-appropriate presentation. The card affordance opening this state is `Manage claim` (owned by `item-actions`). The unclaim authorization matrix (claimer, purchaser, owner master unclaim, guest cookie path) is owned by the removal requirement; listing another viewer's claim SHALL NOT render a removal action for it.

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

#### Scenario: Cookie-recognized guest manages their claim

- **WHEN** a signed-out guest whose `guest_claims` cookie lists their claim opens the purchase modal on that item
- **THEN** the modal opens in the manage state, the guest's cookie-identified row carries a removal action, and activating it removes the claim and returns the item to its claimable presentation
