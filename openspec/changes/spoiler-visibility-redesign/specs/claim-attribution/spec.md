## ADDED Requirements

### Requirement: Claim affordances SHALL render independently of the resolved spoiler state

An item's claim and unclaim affordances SHALL be selected by the viewer's relationship to the item and its claim state alone, and SHALL NOT be gated on the viewer's resolved spoiler tier (`spoiler-visibility`). A viewer protected from claim information SHALL still reach the claim flow, and SHALL still reach removal of any claim they may remove — recording a purchase never requires leaving the page to change a setting first.

Server-side authorization for owner claims and master unclaim SHALL continue to derive from item ownership and the unclaim-rights matrix, never from any spoiler value. Owner claims SHALL count toward `quantity_limit` identically to viewer claims.

The affordance *set* is ungoverned; an affordance *label* that states claim state is not. `item-actions` owns which labels a given resolved tier may render.

#### Scenario: A fully protected viewer still reaches the claim flow

- **WHEN** a viewer whose resolved tier is `surprise` views an item on a list owned by a profile they are a member of
- **THEN** a claim affordance renders and opens the purchase modal

#### Scenario: A protected viewer still removes their own claim

- **WHEN** a viewer whose resolved tier is `surprise` views an item carrying a claim they may remove
- **THEN** the removal affordance renders and removes that claim

#### Scenario: Authorization does not consult spoiler state

- **WHEN** a claim or master unclaim is dispatched by a caller whose resolved tier withholds claim information
- **THEN** the action authorizes on item ownership and the unclaim matrix, and no spoiler value participates in the decision

### Requirement: A reveal from a concealing tier SHALL be confirmed before the purchase modal opens

When a viewer whose resolved tier conceals per-item claim state — `surprise` or `progress`, that is any tier below `claims` — activates an affordance that opens the purchase modal, the system SHALL first present a confirmation naming what will be revealed, and SHALL open the modal only on confirmation. Declining SHALL leave the page unchanged and disclose nothing. (`progress` discloses the list's aggregate claimed count but nothing per-item, so opening a single item's modal still reveals what that tier withholds.)

Confirming SHALL disclose **claims-level** information for that item alone — that it carries claims and what claim capacity remains — and SHALL NOT disclose any claiming party's identity. Identity remains reachable only by raising the tier through the per-list control or the viewer's baseline.

The page's own item read SHALL NOT carry that information. Below the `claims` tier the projection withholds the count and the remaining capacity (`list-item-management`), and a page whose payload already held them would be shipping to the client precisely what the passive surfaces must not show. Confirming SHALL therefore fetch the confirmed item's claim summary on demand — its claim count and its remaining capacity, and no identity — as a server read invoked from the modal, the way the attributed-purchaser picker is already fetched on demand from it. The fetch SHALL be scoped to that item: it SHALL NOT re-resolve the viewer's spoiler tier, SHALL NOT alter what the page's item payload carries, and SHALL NOT change what any other item discloses.

The confirmation SHALL be scoped to the invocation: it SHALL be presented on each such activation, SHALL NOT alter the page behind it, and SHALL NOT change the viewer's resolved tier for any other item or for the rest of the visit. A viewer whose resolved tier is `claims` or `identity` SHALL receive no confirmation, because opening the modal discloses nothing they are not already shown.

This is what makes the ungoverned affordance safe: a protected viewer who opens an item already claimed to capacity learns so only after agreeing to learn it, rather than receiving an "already claimed" rejection that would have revealed it unasked.

#### Scenario: Opening from a concealing tier asks first

- **WHEN** a viewer whose resolved tier is `surprise` activates the claim affordance
- **THEN** a confirmation naming the reveal is presented and the purchase modal does not open
- **AND WHEN** the viewer confirms
- **THEN** the modal opens showing that the item carries claims and what capacity remains

#### Scenario: Progress still asks before opening

- **WHEN** a viewer whose resolved tier is `progress` activates the claim affordance on an item claimed by others
- **THEN** a confirmation is presented, since `progress` discloses no per-item claim state

#### Scenario: Declining discloses nothing

- **WHEN** the viewer declines the confirmation
- **THEN** the modal does not open, the page is unchanged, and nothing about the item's claim state is disclosed

#### Scenario: Confirming does not reveal identity

- **WHEN** a viewer confirms the reveal on an item claimed by another party
- **THEN** the modal discloses the claim count and remaining capacity
- **AND** no claiming party is named

#### Scenario: Confirming does not persist

- **WHEN** a viewer confirms the reveal on one item and then activates the claim affordance on a second item in the same visit
- **THEN** the confirmation is presented again
- **AND** the cards behind the modal are unchanged throughout

#### Scenario: The reveal fetches what the page withheld

- **WHEN** a viewer whose resolved tier is `surprise` confirms the reveal on an item carrying two claims by other parties
- **THEN** that item's claim count and remaining capacity are fetched on demand and rendered
- **AND** the page's item payload is unchanged, and no other item's claim state is disclosed

#### Scenario: An unprotected viewer is not asked

- **WHEN** a viewer whose resolved tier is `claims` or `identity` activates the claim affordance
- **THEN** the purchase modal opens directly with no confirmation

### Requirement: Viewer-relative claim display SHALL key off the purchaser, with the identity tier able to identify the recorder

`sanitizePurchases` SHALL mark a claim `'self'` when the viewer's profile equals the row's purchaser (not its asserter), so an attributed party sees the claim as their own — this preserves the existing purchaser-keyed marking, resolved over profile ids. For a signed-out viewer, `guest-claim-identity`'s post-cache overlay SHALL additionally mark the viewer's cookie-identified claims `'self'`, so a guest's own claim presents exactly as an authed self-claim ("You" forms, no "Added by you" attribution line — the guest is the purchaser, not an asserter for a third party). Display names SHALL continue to resolve as: the purchaser profile's name, else `guest_name`, else the existing fallback, rendered via the existing first-name derivation.

At the `identity` tier, a claim whose asserter differs from its purchaser SHALL additionally identify the recorder, letting the viewer distinguish entries recorded on someone's behalf from direct gifter claims. This keys on the resolved tier and not on ownership, so a viewer holding no membership — who resolves to the maximal projection — reaches it on the same terms. That is a deliberate widening: a gifter can now tell a proxy-recorded claim from a direct one, which the ownership-keyed rule denied them.

A claim the viewer holds, as purchaser or as recorder, SHALL be marked and displayed in full at every tier, per `spoiler-visibility`.

#### Scenario: Attributed user sees the claim as self

- **WHEN** B views an item where a row's purchaser is B's profile and its asserter is C's profile
- **THEN** the claim is presented as B's own claim

#### Scenario: Attributed claim displays the linked user's name

- **WHEN** a viewer permitted to see identities sees a claim whose purchaser is set
- **THEN** the displayed name derives from the purchaser profile's stored name (first-name display), not from `guest_name`

#### Scenario: Cookie-identified guest claim presents as the viewer's own

- **WHEN** a signed-out viewer whose `guest_claims` cookie lists claim P views the item P targets
- **THEN** P presents as the viewer's own claim ("You" in the card banner, "{first name} (you)" in the manage list) with no "Added by you" attribution line

#### Scenario: A non-member sees the recorder named

- **WHEN** a viewer holding no membership on the owning profile views a claim whose asserter differs from its purchaser
- **THEN** both the purchaser and the recorder are named

#### Scenario: Below identity, no recorder is named

- **WHEN** a viewer whose resolved tier is `claims` views an item carrying another party's proxy-recorded claim
- **THEN** neither the purchaser nor the recorder is named

## MODIFIED Requirements
### Requirement: The purchase modal SHALL present an already-claimed state with store access and claim removal

When the purchase modal opens in the viewer manage state (via `Manage claim`, or via the default rule when the viewer holds a removable claim), it SHALL render: the store row (owned by `item-store-links`), and a claims list under a "Claimed by" section label containing **every** claim on the item the viewer's resolved spoiler tier permits, with a removal action rendered only on rows the viewer may remove (their own claim and each claim they recorded for someone else). The same claims-list component SHALL serve the owner's `Manage claims` modal, where every row carries the removal action (master unclaim). The list presentation SHALL be uniform at every claim count, including a single claim (the former single-claim banner + full-width "Remove my claim" presentation is retired).

Where the viewer's resolved tier is below `identity`, the claims list SHALL render the viewer's own removable rows in full and SHALL collapse every other party's claims into a **count** carrying no identity — no avatar, no name, no date, no attribution line and no removal action. This claims-level form is what a confirmed reveal discloses, and it is what the claim act needs: whether the item is claimed and what capacity remains. At `identity` the full rows below render for every claim.

A signed-out guest whose claim is cookie-recognized (`claimedByViewer` set by `guest-claim-identity`'s overlay) SHALL reach this state through the same affordances and default rule as an authenticated viewer; their cookie-identified rows carry the removal action.

Each identity-tier row SHALL render: the purchaser's avatar — for a purchaser that is a profile, resolved through `altvatar`'s chain (its Altvatar art where it has any, its initials otherwise); for a free-text purchaser, initials derived from the entered name. Whether an account backs the profile SHALL NOT govern what the row can show: a managed profile carries a face on the same terms as anyone else, and no branch decides between an account's image and a fallback. The row SHALL also render the claim label — the viewer's own claim as "{first name} (you)", falling back to plain "You" when no viewer name is available, and other claims as the purchaser's first name — the claim's relative date (from the row's `purchased_at`, via the shared relative-time derivation), and, for a claim whose asserter differs from its purchaser, a gender-neutral attribution line ("Added by you" when the viewer recorded it; "Added by {claimer first name}" otherwise). The "(you)" long-form label is scoped to this list — the card banner retains the short "You" form. Removal actions SHALL carry per-claim accessible names distinguishing whose claim they remove. The list region SHALL scroll independently when claims overflow, keeping the modal header and store row in place.

The list SHALL order rows the viewer can remove ahead of all other claims, and SHALL initially render a bounded number of rows with a "See more" control (naming the remaining count) that reveals additional rows in batches — never the whole set at once — so an item with arbitrarily many claims (an unlimited-quantity item with a large audience) cannot render an unbounded list. The bound and batch size are design-recorded constants.

The claimer always retains store-link access from this state, so claiming an item never locks the claimer out of the store link needed to buy it. Activating a removal SHALL dispatch the removal for exactly that claim with no additional confirmation step (the modal state itself is the deliberate surface). Removing the last removable claim SHALL close the modal, returning the item to its viewer-appropriate presentation. The card affordance opening this state is `Manage claim` (owned by `item-actions`). The unclaim authorization matrix (claimer, purchaser, owner master unclaim, guest cookie path) is owned by the removal requirement; listing another viewer's claim SHALL NOT render a removal action for it.

#### Scenario: Claimer reaches store links after claiming

- **WHEN** a viewer who claimed an item opens the purchase modal via `Manage claim`
- **THEN** the store row renders with the live store link and the claims list renders below it

#### Scenario: Manage state lists all claims with removal only on the viewer's own

- **WHEN** a viewer at tier `identity` holding a self-claim and one claim recorded for another person opens the manage state on an item that also carries a third claim recorded by someone else
- **THEN** the claims list SHALL render three rows, the viewer's two rows SHALL carry removal actions, and the third row SHALL render without one

#### Scenario: Below identity, other parties collapse to a count

- **WHEN** a viewer whose resolved tier is `claims` opens the manage state on an item carrying their own claim and two claims by other parties
- **THEN** their own row SHALL render in full with its removal action
- **AND** the other two SHALL be represented as a count with no name, avatar, date, attribution line or removal action

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

## REMOVED Requirements
### Requirement: Owner claim entry and master unclaim SHALL be surfaced only in the spoiler-enabled view

**Reason**: Its premise — that a spoiler toggle gates whether claim affordances render — is false under `spoiler-visibility`. Affordances are now ungoverned and only claim *information* is protected, so the requirement cannot be repaired in place: its name states the rule that has been reversed.

**Migration**: Replaced by "Claim affordances SHALL render independently of the resolved spoiler state" and "A reveal from a concealing tier SHALL be confirmed before the purchase modal opens", both added in this delta. Its "Owner self-claim counts toward quantity" scenario is carried into the first; its "Fully-claimed state is a visible condition, not a leaking error" scenario is carried into the second, where the confirmation — rather than a suppressed affordance — is what keeps the owner from receiving an unasked-for reveal.

### Requirement: Viewer-relative claim display SHALL key off the purchaser, with the owner's spoiler view able to identify the claimer

**Reason**: The purchaser-keyed marking it fixes is unchanged and still binding, but its name and its final clause both rest on "the owner's spoiler view", a state that no longer exists — claimer identification now keys on the resolved tier, which a non-member reaches without being an owner.

**Migration**: Replaced by "Viewer-relative claim display SHALL key off the purchaser, with the identity tier able to identify the recorder", added in this delta, which carries every scenario of the removed requirement unchanged and adds the tier-keyed cases.
