## MODIFIED Requirements

### Requirement: A claim SHALL be removable by its claimer, its purchaser, or the list owner

`removePurchase` SHALL authorize removal when the session-resolved viewer's **self-profile** equals the row's asserter, OR their **self-profile** equals the row's purchaser, OR the **profile the request acts as** equals the owning profile of the item the purchase targets AND the acting account's role on that profile is `self` or `owner` (owner master unclaim). Each of the three comparisons is a profile-id comparison; comparing a profile column against an account id would be silently always false.

The three legs deliberately take different profiles. The first two ask whether the claim is this human's, and a claim is a human act that does not follow the profile switcher, so they compare the self-profile. The third is an ownership comparison, so it compares the profile the request acts as — and, because master unclaim destroys a third party's row, it carries the `owner` floor that `profile-permissions` defines. A `manager` acting as the item's owning profile SHALL be refused the master-unclaim leg, while keeping both self-profile legs: a manager may always remove a claim that is their own.

For unauthenticated callers, removal SHALL be authorized only for a row with all-NULL identity (asserter and purchaser both NULL) whose id appears in the caller's valid `guest_claims` cookie (owned by `guest-claim-identity`); the former exact-`guest_name`-match authorization is retired, and `removePurchase` SHALL NOT accept a `guest_name` field on its payload. The authorization check SHALL load the target row and its item owner before any delete. Removal rights derive from the row, item ownership, the acting role, and the guest cookie only — never from the live follow graph.

#### Scenario: Claimer removes their attributed claim

- **WHEN** C invokes `removePurchase` on a row whose asserter is C's self-profile
- **THEN** the row is deleted

#### Scenario: Purchaser removes a claim made on their behalf

- **WHEN** B invokes `removePurchase` on a row whose purchaser is B's self-profile and whose asserter is not
- **THEN** the row is deleted

#### Scenario: Owner master unclaim removes any claim on their item

- **WHEN** an account holding `self` or `owner`, acting as the item's owning profile, invokes `removePurchase` on any purchase row targeting that item — including a signed-out guest row with all-NULL identities
- **THEN** the row is deleted

#### Scenario: A manager cannot master-unclaim

- **WHEN** an account holding `manager`, acting as the item's owning profile, invokes `removePurchase` on a row that is neither their own claim nor their own purchase
- **THEN** the action rejects and the row is unchanged

#### Scenario: A manager may still remove their own claim

- **WHEN** an account holding `manager` on the item's owning profile invokes `removePurchase` on a row whose asserter or purchaser is their self-profile
- **THEN** the row is deleted, because that leg compares the self-profile and carries no role floor

#### Scenario: Unrelated authenticated user cannot remove a claim

- **WHEN** an authenticated user whose self-profile is neither the asserter nor the purchaser, and whose acting profile is not the item's owning profile, invokes `removePurchase`
- **THEN** the action rejects and the row is unchanged

#### Scenario: Authenticated creator of a guest-name claim can remove it

- **WHEN** an authenticated user who recorded a guest-name claim (row's asserter is their self-profile, purchaser NULL) invokes `removePurchase` on it
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
