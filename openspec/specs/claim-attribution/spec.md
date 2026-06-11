# claim-attribution Specification

## Purpose

TBD - created by archiving change expand-claim-attribution. Update Purpose after archive.
## Requirements
### Requirement: Purchase rows SHALL record the claimer separately from the purchaser

The `purchases` table SHALL carry a nullable `claimed_by` user reference (the authenticated user who asserted the claim) alongside the existing `user_id`, whose meaning sharpens to "the purchaser" (the user attributed as the buyer), and the existing `guest_name`. Valid row shapes are exactly:

| Shape | `claimed_by` | `user_id` (purchaser) | `guest_name` |
| --- | --- | --- | --- |
| Self-claim | actor | actor | NULL |
| Attributed claim | actor | linked user | NULL |
| Authenticated guest-name claim | actor | NULL | non-empty |
| Signed-out guest claim | NULL | NULL | non-empty |

Existing rows with `user_id` set SHALL be backfilled with `claimed_by = user_id` (they were all self-claims). Existing guest rows remain all-NULL identities; their `claimed_by` is not retroactively recoverable. After this change, `user_id` SHALL NOT be read as "who acted" — asserter-meaning logic SHALL use `claimed_by`.

#### Scenario: Self-claim stores both roles as the actor

- **WHEN** an authenticated non-owner confirms "I purchased it"
- **THEN** the inserted row has `claimed_by` and `user_id` equal to the session-resolved actor id and `guest_name` NULL

#### Scenario: Attributed claim stores claimer and purchaser separately

- **WHEN** an authenticated caller marks an eligible user B as the purchaser
- **THEN** the inserted row has `claimed_by` = the caller and `user_id` = B, with `guest_name` NULL

#### Scenario: Authenticated guest-name claim carries the claimer

- **WHEN** an authenticated caller records a claim with a free-text name
- **THEN** the inserted row has `claimed_by` = the caller, `user_id` NULL, and `guest_name` set

#### Scenario: Migration backfills self-claims

- **WHEN** the migration runs over a pre-existing row with `user_id = X, guest_name = NULL`
- **THEN** the row ends with `claimed_by = X` and `user_id = X` unchanged

### Requirement: The eligible attributed-purchaser pool SHALL be the list owner's mutual follows, excluding block edges with the claimer

A user B is eligible to be marked as the purchaser of an item on owner O's list by claimer C if and only if: O follows B AND B follows O (rows in `user_follows` in both directions), AND no `user_blocks` row exists between B and C in either direction, AND B ≠ O. `createPurchase` SHALL re-verify eligibility server-side at claim time and reject ineligible targets; the client picker is presentation only. Eligibility is evaluated at claim time only — subsequent unfollows or blocks SHALL NOT invalidate an existing claim or its unclaim rights. The follow/block graph semantics themselves are owned by the `following` capability; this requirement only consumes them.

#### Scenario: Owner's mutual is markable by any claimer who can view the item

- **WHEN** C (who can view the item) marks B, where O and B mutually follow each other and no block exists between B and C
- **THEN** the claim succeeds with purchaser `user_id = B`

#### Scenario: Non-mutual of the owner is rejected server-side

- **WHEN** `createPurchase` is invoked with an attribution target that O does not follow, or that does not follow O
- **THEN** the action rejects without inserting a row

#### Scenario: Block edge between claimer and target excludes the target

- **WHEN** C attempts to mark B and a `user_blocks` row exists between B and C in either direction
- **THEN** the action rejects without inserting a row

#### Scenario: Owner cannot be the attributed target

- **WHEN** `createPurchase` is invoked with an attribution target equal to the list owner's id
- **THEN** the action rejects; owner self-purchase is only expressible as the owner's own self-claim

#### Scenario: Later unfollow does not revoke an existing claim

- **WHEN** O unfollows B after B was validly marked as a purchaser
- **THEN** the purchase row persists and B retains unclaim rights

### Requirement: The claim modal SHALL be a single screen with a one-tap self-claim and a searchable picker over the eligible pool with a guest-name fallback

The purchase modal SHALL present, on one screen with no intermediate or confirmation steps: a primary self-claim action that records a claim in one tap; below a divider that names the list owner and scopes the pool (e.g. "Claim for someone in {owner first name}'s circle:"), a search input (placeholder reaffirming the owner-scoped pool) that live-filters the eligible pool (per the previous requirement), presented as user rows (name and avatar) sorted with users who are also the claimer's own mutual follows first, then the owner's remaining mutuals, scrollable without a visible-row cap (the claimer's own row SHALL be omitted — their claim is the primary self-claim action, and a row labeled with their own name would record a claim that displays as "You"); and a free-text name entry as a fallback for purchasers without an account (expands inline and commits via its own submit, naming the entered person). The search empty state SHALL direct the claimer to the free-text fallback. Tapping a pool row SHALL record the attributed claim immediately — rows are actions, not navigation. User-facing copy SHALL use the existing claim vocabulary (claim/get), not "purchase" or "buy"; exact strings are recorded in design D9. Mis-claim recovery is the existing on-item unclaim affordance (the actor is always the row's `claimed_by`); no additional confirmation or undo surface is introduced. The pool read SHALL live in `lib/data/user.ts`, use `'use cache'`, and be tagged `user_follows` and `user_blocks`. The picker's inputs and primary CTA SHALL compose existing primitive families (form-field, button — the search input follows the existing store-filter search pattern); pool rows and the fallback toggle are purpose-built list rows styled in the modal's co-located stylesheet, since the menu family's `menuitem` role does not fit a filtered list picker.

#### Scenario: Self-claim is one tap

- **WHEN** an authenticated non-owner opens the claim modal and taps the primary "I'm buying this" action
- **THEN** a self-claim row is recorded with no intervening confirmation screen

#### Scenario: Tapping a pool row records the attributed claim immediately

- **WHEN** C taps an eligible user row in the picker
- **THEN** the attributed claim is recorded with no second screen or confirmation step, and the item's claimed state (with its unclaim affordance for C as `claimed_by`) becomes visible

#### Scenario: Search filters the pool

- **WHEN** C types into the picker's search input
- **THEN** the visible rows narrow to pool members whose names match, with an explicit empty state when nothing matches

#### Scenario: Claimer does not appear in the picker

- **WHEN** C opens the picker on a list whose owner's mutuals include C
- **THEN** the pool rows do not include C — C's own claim is only expressible via the primary self-claim action

#### Scenario: Claimer's mutuals sort first

- **WHEN** C opens the picker and the pool contains users who are C's mutuals and users who are not
- **THEN** C's mutuals are listed before the rest of O's mutuals

#### Scenario: Guest fallback remains available

- **WHEN** the purchaser is not in the pool
- **THEN** C can enter a free-text name and the claim is recorded as an authenticated guest-name claim

#### Scenario: Pool read revalidates on follow-graph changes

- **WHEN** a follow or block mutation invalidates `user_follows` or `user_blocks`
- **THEN** a subsequent picker render reflects the updated pool without a server restart

### Requirement: A claim SHALL be removable by its claimer, its purchaser, or the list owner

`removePurchase` SHALL authorize removal when the session-resolved viewer equals the row's `claimed_by`, OR equals the row's purchaser `user_id`, OR equals the `user_id` of the item the purchase targets (owner master unclaim). For unauthenticated callers, the existing guest path is unchanged: removal of a `claimed_by IS NULL` row requires supplying the exact stored `guest_name`. The authorization check SHALL load the target row and its item owner before any delete. Removal rights derive from the row and item ownership only — never from the live follow graph.

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

### Requirement: Owner claim entry and master unclaim SHALL be surfaced only in the spoiler-enabled view

With spoilers disabled, the owner's view of their own list SHALL show no claim information and no claim or unclaim affordances (unchanged from today). With spoilers enabled, the owner SHALL additionally see a claim affordance on items with remaining claimable quantity, opening the same single-screen purchase modal (self-claim CTA plus the attributed picker), and an unclaim affordance on existing claims. The spoiler gate is a UI surface only — server-side authorization for owner claims and master unclaim derives from item ownership, not from any spoiler parameter. Owner claims SHALL count toward `quantity_limit` identically to viewer claims.

#### Scenario: Spoilers off shows no owner claim affordances

- **WHEN** the owner views their list with spoilers disabled
- **THEN** no claim button, claim badge, or unclaim affordance renders — the view is identical to today's default

#### Scenario: Spoilers on exposes claim entry on claimable items

- **WHEN** the owner views their list with spoilers enabled and an item has remaining claimable quantity
- **THEN** a claim affordance renders and opens the single-screen purchase modal with the self-claim CTA and the attributed picker

#### Scenario: Owner self-claim counts toward quantity

- **WHEN** the owner self-claims an item with `quantity_limit = 1`
- **THEN** non-owner viewers subsequently see the item as fully claimed and cannot claim it

#### Scenario: Fully-claimed state is a visible condition, not a leaking error

- **WHEN** the owner, with spoilers enabled, views an item already fully claimed by hidden-to-default gifters
- **THEN** the existing claims are visible (spoilers are on) and no claim affordance renders — the owner never receives an "already claimed" rejection that would reveal otherwise-hidden state

### Requirement: Viewer-relative claim display SHALL key off the purchaser, with the owner's spoiler view able to identify the claimer

`sanitizePurchases` SHALL mark a claim `'self'` when the viewer equals the purchaser `user_id` (not `claimed_by`), so an attributed user sees the claim as their own — this preserves the existing `user_id`-keyed marking unchanged. Display names SHALL continue to resolve as: the purchaser user's name, else `guest_name`, else the existing fallback, rendered via the existing first-name derivation. In the owner's spoiler view, a claim whose `claimed_by` differs from its purchaser MAY additionally identify the claimer, letting the owner distinguish entries they or others recorded from direct gifter claims.

#### Scenario: Attributed user sees the claim as self

- **WHEN** B views an item where a row has purchaser `user_id = B` and `claimed_by = C`
- **THEN** the claim is presented as B's own claim

#### Scenario: Attributed claim displays the linked user's name

- **WHEN** any permitted viewer sees a claim with the purchaser `user_id` set
- **THEN** the displayed name derives from the linked user's stored name (first-name display), not from `guest_name`

### Requirement: The existing purchaser-uniqueness index SHALL be the concurrency backstop for double-marking

The partial unique index on `purchases (item_id, user_id) WHERE user_id IS NOT NULL` SHALL be retained as the guarantee — under the no-transaction driver constraint — that a user cannot be recorded twice as the purchaser of one item, whether by concurrent requests or by claimer and purchaser acting independently. When an insert conflicts because the viewer is already the recorded purchaser, the UI SHALL present this as the viewer's existing claim, not as an opaque error.

#### Scenario: Duplicate attribution resolves to a single row

- **WHEN** two requests race to mark the same B as purchaser of the same item
- **THEN** exactly one `purchases` row with purchaser `user_id = B` exists for that item

#### Scenario: Purchaser claiming after being attributed sees their existing claim

- **WHEN** B attempts to self-claim an item where a row with purchaser `user_id = B` already exists
- **THEN** no second row is inserted and the UI shows B as already the recorded purchaser
