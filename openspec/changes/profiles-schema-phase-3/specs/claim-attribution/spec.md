## MODIFIED Requirements

### Requirement: Purchase rows SHALL record the claimer separately from the purchaser

The `purchases` table SHALL carry a nullable asserter reference (the authenticated caller who asserted the claim) alongside the purchaser reference (the party attributed as the buyer) and the existing `guest_name`. Both references are profile-valued — `claimed_by_profile_id` and `profile_id`. Valid row shapes are exactly:

| Shape | asserter (`claimed_by_profile_id`) | purchaser (`profile_id`) | `guest_name` |
| --- | --- | --- | --- |
| Self-claim | actor's self-profile | actor's self-profile | NULL |
| Attributed claim | actor's self-profile | linked profile | NULL |
| Authenticated guest-name claim | actor's self-profile | NULL | non-empty |
| Signed-out guest claim | NULL | NULL | non-empty |

The asserter SHALL always be the acting account's self-profile and never any other profile — a claim is a human act, so it does not follow whatever profile a later switcher lets an account act as. A self-claim's purchaser is the actor's self-profile for the same reason. An attributed claim's purchaser is a target rather than an actor and is not bound by that rule. The `profiles-data-model` capability owns the self-profile rule and the injectivity it buys; this requirement consumes it.

The migration SHALL backfill both profile columns through each account's self-profile. Existing guest rows remain all-NULL identities; their asserter is not retroactively recoverable. The purchaser SHALL NOT be read as "who acted" — asserter-meaning logic SHALL use the asserter column. The two columns keep their distinct meanings.

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

- **WHEN** the migration runs over a pre-existing row whose purchaser and asserter are both account X
- **THEN** the row ends with both profile columns set to X's self-profile

#### Scenario: Asserter is never a profile other than the actor's own

- **WHEN** any claim is recorded by an authenticated caller
- **THEN** the row's asserter is that caller's own self-profile

### Requirement: The eligible attributed-purchaser pool SHALL be the list owner's mutual follows, excluding block edges with the claimer

A profile B is eligible to be marked as the purchaser of an item on owner-profile O's list by claimer C if and only if: O's account follows B AND B's account follows O (rows in `user_follows` in both directions), AND no `user_blocks` row exists between B and C in either direction, AND B ≠ O.

Both follow legs resolve each side's account through the profile's `self` membership, because a follow edge runs from a human to a profile and a profile is never a follower. A profile with no account therefore satisfies neither leg: a managed profile's list yields an empty eligible pool, and a managed profile is never eligible to be marked. This falls out of the predicate rather than being special-cased, and the empty pool is the capability's existing empty-pool behavior — the free-text fallback. The block exclusion compares profiles on both sides. C is the claimer's own self-profile, since a claim is a human act.

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

### Requirement: The existing purchaser-uniqueness index SHALL be the concurrency backstop for double-marking

A partial unique index on `purchases (item_id, profile_id) WHERE profile_id IS NOT NULL` SHALL be the guarantee — under the no-transaction driver constraint — that a profile cannot be recorded twice as the purchaser of one item, whether by concurrent requests or by claimer and purchaser acting independently. When an insert conflicts because the viewer is already the recorded purchaser, the UI SHALL present this as the viewer's existing claim, not as an opaque error.

#### Scenario: Duplicate attribution resolves to a single row

- **WHEN** two requests race to mark the same profile B as purchaser of the same item
- **THEN** exactly one `purchases` row with purchaser B exists for that item

#### Scenario: Purchaser claiming after being attributed sees their existing claim

- **WHEN** B attempts to self-claim an item where a row with purchaser B's profile already exists
- **THEN** no second row is inserted and the UI shows B as already the recorded purchaser

### Requirement: The claim modal SHALL be a single screen with a one-tap self-claim and a searchable picker over the eligible pool with a guest-name fallback

The purchase modal SHALL present, on one screen with no intermediate screens: a store row directly below the header (owned by `item-store-links`' purchase-modal store-row requirement); a primary self-claim action ("Claim this gift") that records a claim in one tap; and a collapsed-by-default disclosure labeled "Claiming for someone else?" (owner variant: "Claiming for someone?") that expands inline — never a second screen — to reveal the attributed-claim picker. The disclosure trigger SHALL carry an avatar-stack hint (up to three pool members, populated when the pool data loads) and a chevron indicating expand/collapse state.

The expanded picker SHALL contain: a search input (placeholder reaffirming the owner-scoped pool, e.g. "Search {owner first name}'s circle…"; the owner sees "Search your circle…") that live-filters the eligible pool (per the eligibility requirement), presented as user rows (name and avatar) sorted with users who are also the claimer's own mutual follows first, then the owner's remaining mutuals, scrollable without a visible-row cap (the claimer's own row SHALL be omitted — their claim is the primary self-claim action, and a row labeled with their own name would record a claim that displays as "You"); and a free-text name entry ("Someone not listed?") as a fallback for purchasers without an account. Tapping a pool row SHALL toggle its selection (selected row indicated with a checkmark — rows are selection actions, not navigation, and carry no chevrons or arrows); selecting a row clears any free-text entry and vice versa. A confirm button labeled "Confirm — {name}" SHALL appear only once a target (pool row or non-empty free-text name) is chosen, and activating it SHALL record the attributed claim with no further confirmation step. Collapsing the disclosure SHALL reset search, selection, and free-text state. The search empty state SHALL direct the claimer to the free-text fallback.

The pool fetch SHALL begin when the modal opens (not deferred to expansion) so the avatar hint can populate; if the user expands before the fetch resolves, a loading row ("Loading {owner first name}'s circle…") SHALL render in place of the picker. User-facing copy SHALL use the existing claim vocabulary (claim/get), not "purchase" or "buy"; exact strings are recorded in this change's design D9. Mis-claim recovery is the modal's already-claimed state (the actor is always the row's `claimed_by_profile_id`); no additional confirmation surface is introduced. The pool read SHALL live in `lib/data/user.ts`, use `'use cache'`, and be tagged `user_follows`, `user_blocks`, and `profile_members`. The picker's inputs and CTAs SHALL compose existing primitive families (form-field, button — the search input follows the existing store-filter search pattern); pool rows and the disclosure trigger are purpose-built list rows styled in the modal's co-located stylesheet, since the menu family's `menuitem` role does not fit a filtered list picker.

#### Scenario: Self-claim is one tap

- **WHEN** an authenticated non-owner opens the claim modal and taps the primary "Claim this gift" action
- **THEN** a self-claim row is recorded with no intervening confirmation screen and no disclosure interaction required

#### Scenario: Attributed claim is select-then-confirm inside the disclosure

- **WHEN** C expands the "Claiming for someone else?" disclosure, taps an eligible user row, and activates "Confirm — {name}"
- **THEN** the attributed claim is recorded with no second screen, and the item's claimed state (with its unclaim affordance for C as `claimed_by_profile_id`) becomes visible

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
- **THEN** a second purchase row SHALL be recorded with the viewer as `claimed_by_profile_id` and the target as purchaser, and the item SHALL reflect both claims
