# claim-attribution Specification

## Purpose

The `claim-attribution` capability governs who may be recorded as an item's purchaser and who may undo that record. It defines the `claimed_by_profile_id` (asserter) plus `profile_id` (purchaser) row model, the eligible attributed-purchaser pool (the list owner's mutual follows, block-filtered, server-re-verified) with a free-text guest fallback, the unclaim-rights matrix (claimer, purchaser, or list-owner master unclaim), spoiler-gated owner claiming, and the viewer-relative claim display. It exists because a purchaser who is a real user needs a linked account, self-marking, and durable unclaim rights that the former free-text-only "someone else purchased it" flow could not provide.
## Requirements
### Requirement: Purchase rows SHALL record the claimer separately from the purchaser

The `purchases` table SHALL carry a nullable asserter reference (the authenticated caller who asserted the claim) alongside the purchaser reference (the party attributed as the buyer) and the existing `guest_name`. Both references are profile-valued — `claimed_by_profile_id` and `profile_id` — and the account-valued `claimed_by` and `user_id` columns they supersede remain in the table, unread and unwritten, until a later change drops them. Valid row shapes are exactly:

| Shape | asserter (`claimed_by_profile_id`) | purchaser (`profile_id`) | `guest_name` |
| --- | --- | --- | --- |
| Self-claim | actor's self-profile | actor's self-profile | NULL |
| Attributed claim | actor's self-profile | linked profile | NULL |
| Authenticated guest-name claim | actor's self-profile | NULL | non-empty |
| Signed-out guest claim | NULL | NULL | non-empty |

The asserter SHALL always be the acting account's self-profile and never any other profile — a claim is a human act, so it does not follow whatever profile a later switcher lets an account act as. A self-claim's purchaser is the actor's self-profile for the same reason. An attributed claim's purchaser is a target rather than an actor and is not bound by that rule. The `profiles-data-model` capability owns the self-profile rule and the injectivity it buys; this requirement consumes it.

The migration SHALL backfill both profile columns from their account-valued predecessors through each account's self-profile. Existing guest rows remain all-NULL identities; their asserter is not retroactively recoverable. The purchaser SHALL NOT be read as "who acted" — asserter-meaning logic SHALL use the asserter column. The two columns keep their distinct meanings; both are now profile-valued.

#### Scenario: Self-claim stores both roles as the actor

- **WHEN** an authenticated non-owner confirms "I purchased it"
- **THEN** the inserted row's asserter and purchaser are both the session-resolved actor's self-profile, and `guest_name` is NULL

#### Scenario: Attributed claim stores claimer and purchaser separately

- **WHEN** an authenticated caller marks an eligible profile B as the purchaser
- **THEN** the inserted row's asserter is the caller's self-profile and its purchaser is B, with `guest_name` NULL

#### Scenario: Authenticated guest-name claim carries the claimer

- **WHEN** an authenticated caller records a claim with a free-text name
- **THEN** the inserted row's asserter is the caller's self-profile, its purchaser is NULL, and `guest_name` is set

#### Scenario: Migration backfills self-claims

- **WHEN** the migration runs over a pre-existing row whose account-valued asserter and purchaser are both account X
- **THEN** the row ends with both profile columns set to X's self-profile, and both account-valued columns unchanged

#### Scenario: Asserter is never a profile other than the actor's own

- **WHEN** any claim is recorded by an authenticated caller
- **THEN** the row's asserter is that caller's own self-profile

### Requirement: The eligible attributed-purchaser pool SHALL be the list owner's mutual follows, excluding block edges with the claimer

A profile B is eligible to be marked as the purchaser of an item on owner-profile O's list by claimer C if and only if: O's account follows B AND B's account follows O (rows in `user_follows` in both directions), AND no `user_blocks` row exists between B and C in either direction, AND B ≠ O.

Both follow legs resolve each side's account through `profiles.user_id`, because a follow edge runs from a human to a profile and a profile is never a follower. A profile with no account therefore satisfies neither leg: a managed profile's list yields an empty eligible pool, and a managed profile is never eligible to be marked. This falls out of the predicate rather than being special-cased, and the empty pool is the capability's existing empty-pool behavior — the free-text fallback. The block exclusion compares profiles on both sides. C is the claimer's own self-profile, since a claim is a human act.

`createPurchase` SHALL re-verify eligibility server-side at claim time and reject ineligible targets; the client picker is presentation only. Eligibility is evaluated at claim time only — subsequent unfollows or blocks SHALL NOT invalidate an existing claim or its unclaim rights. The follow/block graph semantics themselves are owned by the `following` capability; this requirement only consumes them.

#### Scenario: Owner's mutual is markable by any claimer who can view the item

- **WHEN** C (who can view the item) marks B, where O's account and B's account each follow the other's profile and no block exists between B and C
- **THEN** the claim succeeds with purchaser B

#### Scenario: Non-mutual of the owner is rejected server-side

- **WHEN** `createPurchase` is invoked with an attribution target whose profile O's account does not follow, or whose account does not follow O
- **THEN** the action rejects without inserting a row

#### Scenario: Block edge between claimer and target excludes the target

- **WHEN** C attempts to mark B and a `user_blocks` row exists between profiles B and C in either direction
- **THEN** the action rejects without inserting a row

#### Scenario: Owner cannot be the attributed target

- **WHEN** `createPurchase` is invoked with an attribution target equal to the list's owning profile
- **THEN** the action rejects; owner self-purchase is only expressible as the owner's own self-claim

#### Scenario: Later unfollow does not revoke an existing claim

- **WHEN** O's account unfollows B after B was validly marked as a purchaser
- **THEN** the purchase row persists and B retains unclaim rights

#### Scenario: A managed profile's list yields an empty pool

- **WHEN** the eligible pool is computed for a list whose owning profile has no account
- **THEN** the pool is empty and the picker renders the free-text fallback as its only content, with no error state

#### Scenario: A managed profile is never an eligible target

- **WHEN** `createPurchase` is invoked with an attribution target that is a profile with no account
- **THEN** the action rejects without inserting a row, because neither follow leg can resolve

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

### Requirement: A claim SHALL be removable by its claimer, its purchaser, or the list owner

`removePurchase` SHALL authorize removal when the session-resolved viewer's profile equals the row's asserter, OR equals the row's purchaser, OR equals the owning profile of the item the purchase targets (owner master unclaim). Each of the three comparisons is a profile-id comparison; comparing a profile column against an account id would be silently always false. For unauthenticated callers, removal SHALL be authorized only for a row with all-NULL identity (asserter and purchaser both NULL) whose id appears in the caller's valid `guest_claims` cookie (owned by `guest-claim-identity`); the former exact-`guest_name`-match authorization is retired, and `removePurchase` SHALL NOT accept a `guest_name` field on its payload. The authorization check SHALL load the target row and its item owner before any delete. Removal rights derive from the row, item ownership, and the guest cookie only — never from the live follow graph.

#### Scenario: Claimer removes their attributed claim

- **WHEN** C invokes `removePurchase` on a row whose asserter is C's profile
- **THEN** the row is deleted

#### Scenario: Purchaser removes a claim made on their behalf

- **WHEN** B invokes `removePurchase` on a row whose purchaser is B's profile and whose asserter is not
- **THEN** the row is deleted

#### Scenario: Owner master unclaim removes any claim on their item

- **WHEN** the account owning the item's profile invokes `removePurchase` on any purchase row targeting that item — including a signed-out guest row with all-NULL identities
- **THEN** the row is deleted

#### Scenario: Unrelated authenticated user cannot remove a claim

- **WHEN** an authenticated user whose profile is neither the asserter, nor the purchaser, nor the item's owning profile invokes `removePurchase`
- **THEN** the action rejects and the row is unchanged

#### Scenario: Authenticated creator of a guest-name claim can remove it

- **WHEN** an authenticated user who recorded a guest-name claim (row's asserter is their profile, purchaser NULL) invokes `removePurchase` on it
- **THEN** the row is deleted (the legacy lockout where a null purchaser blocked the creator no longer applies)

#### Scenario: Guest removes their cookie-identified claim

- **WHEN** an unauthenticated caller invokes `removePurchase` on an all-NULL-identity row whose id appears in the request's valid `guest_claims` cookie
- **THEN** the row is deleted

#### Scenario: Guest cannot remove a claim outside their cookie

- **WHEN** an unauthenticated caller invokes `removePurchase` on an all-NULL-identity row whose id is not in the request's `guest_claims` cookie (or with no valid cookie at all)
- **THEN** the action rejects and the row is unchanged, regardless of any name the caller supplies

#### Scenario: Cookie ids never authorize removal of identity-bearing rows

- **WHEN** an unauthenticated caller's cookie lists a purchase id whose row has a non-NULL asserter or purchaser
- **THEN** `removePurchase` rejects — the cookie path applies only to all-NULL-identity rows

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

### Requirement: Viewer-relative claim display SHALL key off the purchaser, with the owner's spoiler view able to identify the claimer

`sanitizePurchases` SHALL mark a claim `'self'` when the viewer's profile equals the row's purchaser (not its asserter), so an attributed party sees the claim as their own — this preserves the existing purchaser-keyed marking, now resolved over profile ids. For a signed-out viewer, `guest-claim-identity`'s post-cache overlay SHALL additionally mark the viewer's cookie-identified claims `'self'`, so a guest's own claim presents exactly as an authed self-claim ("You" forms, no "Added by you" attribution line — the guest is the purchaser, not an asserter for a third party). Display names SHALL continue to resolve as: the purchaser profile's name, else `guest_name`, else the existing fallback, rendered via the existing first-name derivation. In the owner's spoiler view, a claim whose asserter differs from its purchaser MAY additionally identify the claimer, letting the owner distinguish entries they or others recorded from direct gifter claims.

#### Scenario: Attributed user sees the claim as self

- **WHEN** B views an item where a row's purchaser is B's profile and its asserter is C's profile
- **THEN** the claim is presented as B's own claim

#### Scenario: Attributed claim displays the linked user's name

- **WHEN** any permitted viewer sees a claim whose purchaser is set
- **THEN** the displayed name derives from the purchaser profile's stored name (first-name display), not from `guest_name`

#### Scenario: Cookie-identified guest claim presents as the viewer's own

- **WHEN** a signed-out viewer whose `guest_claims` cookie lists claim P views the item P targets
- **THEN** P presents as the viewer's own claim ("You" in the card banner, "{first name} (you)" in the manage list) with no "Added by you" attribution line

### Requirement: The existing purchaser-uniqueness index SHALL be the concurrency backstop for double-marking

A partial unique index on `purchases (item_id, profile_id) WHERE profile_id IS NOT NULL` SHALL be the guarantee — under the no-transaction driver constraint — that a profile cannot be recorded twice as the purchaser of one item, whether by concurrent requests or by claimer and purchaser acting independently. The account-valued partial unique it supersedes remains in place beside it for this phase and is dropped, with its column, by a later change; the two SHALL be created by addition rather than by a drop-and-recreate, so no window exists in which neither protects the concurrent-claim path. When an insert conflicts because the viewer is already the recorded purchaser, the UI SHALL present this as the viewer's existing claim, not as an opaque error.

#### Scenario: Duplicate attribution resolves to a single row

- **WHEN** two requests race to mark the same profile B as purchaser of the same item
- **THEN** exactly one `purchases` row with purchaser B exists for that item

#### Scenario: Purchaser claiming after being attributed sees their existing claim

- **WHEN** B attempts to self-claim an item where a row with purchaser B's profile already exists
- **THEN** no second row is inserted and the UI shows B as already the recorded purchaser

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
