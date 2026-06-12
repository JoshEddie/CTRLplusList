# claim-attribution — delta for restructure-claim-flow

## MODIFIED Requirements

### Requirement: The claim modal SHALL be a single screen with a one-tap self-claim and a searchable picker over the eligible pool with a guest-name fallback

The purchase modal SHALL present, on one screen with no intermediate screens: a store row directly below the header (owned by `item-store-links`' purchase-modal store-row requirement); a primary self-claim action ("Claim this gift") that records a claim in one tap; and a collapsed-by-default disclosure labeled "Claiming for someone else?" (owner variant: "Claiming for someone?") that expands inline — never a second screen — to reveal the attributed-claim picker. The disclosure trigger SHALL carry an avatar-stack hint (up to three pool members, populated when the pool data loads) and a chevron indicating expand/collapse state.

The expanded picker SHALL contain: a search input (placeholder reaffirming the owner-scoped pool, e.g. "Search {owner first name}'s circle…"; the owner sees "Search your circle…") that live-filters the eligible pool (per the eligibility requirement), presented as user rows (name and avatar) sorted with users who are also the claimer's own mutual follows first, then the owner's remaining mutuals, scrollable without a visible-row cap (the claimer's own row SHALL be omitted — their claim is the primary self-claim action, and a row labeled with their own name would record a claim that displays as "You"); and a free-text name entry ("Someone not listed?") as a fallback for purchasers without an account. Tapping a pool row SHALL toggle its selection (selected row indicated with a checkmark — rows are selection actions, not navigation, and carry no chevrons or arrows); selecting a row clears any free-text entry and vice versa. A confirm button labeled "Confirm — {name}" SHALL appear only once a target (pool row or non-empty free-text name) is chosen, and activating it SHALL record the attributed claim with no further confirmation step. Collapsing the disclosure SHALL reset search, selection, and free-text state. The search empty state SHALL direct the claimer to the free-text fallback.

The pool fetch SHALL begin when the modal opens (not deferred to expansion) so the avatar hint can populate; if the user expands before the fetch resolves, a loading row ("Loading {owner first name}'s circle…") SHALL render in place of the picker. User-facing copy SHALL use the existing claim vocabulary (claim/get), not "purchase" or "buy"; exact strings are recorded in this change's design D9. Mis-claim recovery is the modal's already-claimed state (the actor is always the row's `claimed_by`); no additional confirmation surface is introduced. The pool read SHALL live in `lib/data/user.ts`, use `'use cache'`, and be tagged `user_follows` and `user_blocks`. The picker's inputs and CTAs SHALL compose existing primitive families (form-field, button — the search input follows the existing store-filter search pattern); pool rows and the disclosure trigger are purpose-built list rows styled in the modal's co-located stylesheet, since the menu family's `menuitem` role does not fit a filtered list picker.

#### Scenario: Self-claim is one tap

- **WHEN** an authenticated non-owner opens the claim modal and taps the primary "Claim this gift" action
- **THEN** a self-claim row is recorded with no intervening confirmation screen and no disclosure interaction required

#### Scenario: Attributed claim is select-then-confirm inside the disclosure

- **WHEN** C expands the "Claiming for someone else?" disclosure, taps an eligible user row, and activates "Confirm — {name}"
- **THEN** the attributed claim is recorded with no second screen, and the item's claimed state (with its unclaim affordance for C as `claimed_by`) becomes visible

#### Scenario: Picker is collapsed by default

- **WHEN** an authenticated non-owner opens the claim modal
- **THEN** the search input and pool rows are not visible until the disclosure is expanded; the collapsed trigger shows the "Claiming for someone else?" label, avatar hint, and chevron

#### Scenario: Search filters the pool

- **WHEN** C types into the picker's search input
- **THEN** the visible rows narrow to pool members whose names match, with an explicit empty state directing to the free-text fallback when nothing matches

#### Scenario: Claimer does not appear in the picker

- **WHEN** C opens the picker on a list whose owner's mutuals include C
- **THEN** the pool rows do not include C — C's own claim is only expressible via the primary self-claim action

#### Scenario: Claimer's mutuals sort first

- **WHEN** C expands the picker and the pool contains users who are C's mutuals and users who are not
- **THEN** C's mutuals are listed before the rest of O's mutuals

#### Scenario: Guest fallback remains available

- **WHEN** the purchaser is not in the pool
- **THEN** C can enter a free-text name under "Someone not listed?" and confirm, recording an authenticated guest-name claim

#### Scenario: Selection and free-text are mutually exclusive

- **WHEN** C has a pool row selected and then types into the free-text field (or vice versa)
- **THEN** the other target is cleared, and the confirm button reflects the single current target

#### Scenario: Expanding before the pool loads shows a loading state

- **WHEN** C expands the disclosure before the pool fetch resolves
- **THEN** a loading row ("Loading {owner first name}'s circle…") renders, replaced by the picker when data arrives

#### Scenario: Pool read revalidates on follow-graph changes

- **WHEN** a follow or block mutation invalidates `user_follows` or `user_blocks`
- **THEN** a subsequent picker render reflects the updated pool without a server restart

### Requirement: Owner claim entry and master unclaim SHALL be surfaced only in the spoiler-enabled view

With spoilers disabled, the owner's view of their own list SHALL show no claim information and no claim or unclaim affordances; the owner's purchase modal in this state SHALL contain only the store row and a quiet "Your list" label — no claim UI and no claim data. With spoilers enabled, the owner SHALL additionally see a claim affordance on items with remaining claimable quantity, opening the purchase modal with the owner claim section ("I bought this myself" self-claim CTA plus the "Claiming for someone?" disclosure containing the attributed picker), and an unclaim affordance on existing claims. The spoiler gate is a UI surface only — server-side authorization for owner claims and master unclaim derives from item ownership, not from any spoiler parameter. Owner claims SHALL count toward `quantity_limit` identically to viewer claims.

#### Scenario: Spoilers off shows no owner claim affordances

- **WHEN** the owner views their list with spoilers disabled
- **THEN** no claim button, claim badge, or unclaim affordance renders, and the owner's purchase modal renders only the store row and the "Your list" label

#### Scenario: Spoilers on exposes claim entry on claimable items

- **WHEN** the owner views their list with spoilers enabled and an item has remaining claimable quantity
- **THEN** a claim affordance renders and opens the purchase modal with the "I bought this myself" CTA and the "Claiming for someone?" disclosure

#### Scenario: Owner self-claim counts toward quantity

- **WHEN** the owner self-claims an item with `quantity_limit = 1`
- **THEN** non-owner viewers subsequently see the item as fully claimed and cannot claim it

#### Scenario: Fully-claimed state is a visible condition, not a leaking error

- **WHEN** the owner, with spoilers enabled, views an item already fully claimed by hidden-to-default gifters
- **THEN** the existing claims are visible (spoilers are on) and no claim affordance renders — the owner never receives an "already claimed" rejection that would reveal otherwise-hidden state

## ADDED Requirements

### Requirement: The purchase modal SHALL present an already-claimed state with store access and claim removal

When the viewer opens the purchase modal on an item where they hold a removable claim (their own claim, or one they recorded for someone else), the modal SHALL render the already-claimed state: the store row, a confirmation banner ("✓ You claimed this", or naming the attributed person for a claim recorded on someone's behalf), and a "Remove my claim" action. This state replaces the previous confirm-only unclaim dialog — the claimer always retains store-link access from it, so claiming an item never locks the claimer out of the store links needed to buy it. Activating "Remove my claim" SHALL dispatch the removal with no additional confirmation step (the modal state itself is the deliberate surface). The unclaim authorization matrix (claimer, purchaser, owner master unclaim, guest exact-name path) is owned by the existing removal requirement and is unchanged.

#### Scenario: Claimer reaches store links after claiming

- **WHEN** a viewer who claimed an item opens the purchase modal (via "Manage your claim" or an undo affordance)
- **THEN** the store row renders with live store links and the "Remove my claim" action renders below it

#### Scenario: Remove my claim removes in one activation

- **WHEN** the viewer activates "Remove my claim" in the already-claimed state
- **THEN** `removePurchase` is dispatched for that claim with no intervening confirmation dialog, and the item returns to its claimable presentation

#### Scenario: Store-link click never routes to claim removal

- **WHEN** a viewer with an existing claim activates a store link in the already-claimed modal state
- **THEN** the store opens in a new tab and no unclaim dispatch or unclaim prompt occurs

### Requirement: Picker pool load failures SHALL render an error state distinct from the empty pool

When the eligible-pool fetch fails (network or server error), the picker area SHALL render an honest failure message (e.g. "Couldn't load {owner first name}'s circle") with a retry affordance that re-issues the fetch. A failed load SHALL NOT render the empty-pool presentation — a transient failure must be distinguishable from a genuinely empty circle, so the claimer is not silently steered into the free-text fallback when they intended an attributed claim. A genuinely empty pool (fetch succeeded, zero eligible users) SHALL render the free-text fallback as the only picker content.

#### Scenario: Fetch failure shows error with retry

- **WHEN** the pool fetch rejects and the viewer expands the disclosure
- **THEN** the picker area renders the failure message and a retry affordance, not the empty-pool message

#### Scenario: Retry recovers the picker

- **WHEN** the viewer activates retry and the refetch succeeds
- **THEN** the picker renders the pool rows normally

#### Scenario: Genuinely empty pool falls back to free-text

- **WHEN** the pool fetch succeeds with zero eligible users
- **THEN** the picker area renders the "Someone not listed?" free-text entry (no error message, no retry)
