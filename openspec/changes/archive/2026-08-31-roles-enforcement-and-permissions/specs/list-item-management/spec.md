## MODIFIED Requirements

### Requirement: removePurchase for guest callers SHALL require the purchase row id

`removePurchase` SHALL accept an input payload of `{ purchase_id: string }` (preferred) OR — for backwards compatibility with the legacy item-scoped flow — `{ item_id: string; guest_name?: string | null }` for authenticated callers only.

For an unauthenticated guest caller, the action SHALL require `purchase_id` and SHALL load that row to verify `purchases.profile_id IS NULL` AND `purchases.guest_name = payload.guest_name`. If either check fails, the action SHALL return `{ success: false, error: 'Not your claim' }` without deleting any row. The action SHALL NOT permit guest deletion by `(item_id, guest_name)` alone.

For an authenticated caller, the action SHALL resolve **both** of the caller's profiles and SHALL use each where that leg's meaning requires it. The two legs asking whether the claim belongs to this human — the row's asserter and the row's purchaser — SHALL compare the caller's **self-profile**, because a claim is a human act and does not follow the active-profile switcher. The leg asking whether the caller owns the item the claim targets SHALL compare the **profile the request acts as**, and SHALL additionally require an `owner`-or-`self` role on that profile, per `claim-attribution`. Guest_name SHALL be ignored on this path.

#### Scenario: Two guests with the same display name cannot revoke each other

- **WHEN** guest "Mom" (browser A) has claimed item X, and a different guest also typing "Mom" (browser B) invokes `removePurchase({ item_id: X, guest_name: 'Mom' })` without a `purchase_id`
- **THEN** the action returns `{ success: false, error: 'Missing identity' }` and the original guest's claim is unchanged

#### Scenario: Guest revokes their own claim with the purchase row id

- **WHEN** the guest who created a claim invokes `removePurchase({ purchase_id })` with the purchase row id surfaced by the UI for their own claim, and supplies the matching `guest_name`
- **THEN** the action deletes that row and returns `{ success: true }`

#### Scenario: Authenticated user revokes their own claim

- **WHEN** authenticated user A invokes `removePurchase({ item_id })` for an item they have claimed
- **THEN** the action deletes the row where `purchases.profile_id` is A's self-profile and `purchases.item_id = item_id`, and returns `{ success: true }`

#### Scenario: The owner leg takes the acting profile, not the self-profile

- **WHEN** an authenticated caller acting as a managed profile invokes `removePurchase` on a claim targeting an item that managed profile owns, holding `owner` on it
- **THEN** the action deletes the row, resolving the item-owner comparison against the acting profile rather than the caller's self-profile
