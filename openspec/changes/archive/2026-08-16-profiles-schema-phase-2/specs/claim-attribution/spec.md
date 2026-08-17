## MODIFIED Requirements

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
