# Acceptance — guest-claim-identity

## Flows

### Flow: Guest claim is recognized as the guest's own

- **Given** a signed-out browser with no `guest_claims` cookie
- **And** a public list with a claimable item in view
- **When** the guest clicks `Add Claim`
- **And** enters a name in the guest modal
- **And** clicks `Claim as Guest`
- **Then** the claim is recorded on a `guest_claims` cookie
- **And** the card presents `Manage claim`
- **And** the claim's 'Claimed by' banner reads `You` in this browser
- **And** no `Add Claim` renders anywhere on the card
- **And** no attributed-claim candidate picker was offered at any point

### Flow: Recognition survives across requests

- **Given** a signed-out browser has a `guest_claims` cookie
- **And** an item the cookie claims is in view
- **When** the guest reloads the page
- **Then** the card still presents `Manage claim`

### Flow: Guest removes their own claim from the manage state

- **Given** a signed-out browser has a `guest_claims` cookie
- **And** an item the cookie claims is in view, its card presenting `Manage claim`
- **When** the guest clicks `Manage claim`
- **And** clicks `Remove` on their own row (labeled "{name} (you)", the only row carrying a `Remove` button)
- **Then** the claim is removed
- **And** the claim's id is pruned from the `guest_claims` cookie
- **And** the modal closes
- **And** the card returns to `Add Claim` as the primary action

### Flow: Second guest claim in the same browser extends recognition

- **Given** a signed-out browser has a `guest_claims` cookie holding one claim
- **And** a second claimable item in view on the same or another visible list
- **When** the guest clicks `Add Claim` on the second item
- **And** enters a name in the guest modal
- **And** clicks `Claim as Guest`
- **Then** both claimed items present `Manage claim` to this browser
- **And** each item's manage state offers removal only on that item's own cookie-listed claim

### Flow: A different browser cannot manage the guest's claim

- **Given** a guest claim recorded from browser A
- **And** a signed-out browser B whose `guest_claims` cookie (if any) does not hold that claim
- **When** browser B views the claimed item
- **Then** the card shows the claim as someone else's
- **And** no `Manage claim` is shown (the top slot is `Fully claimed` or `Add Claim` per slot state)
- **And** no removal action is reachable

### Flow: Authenticated viewer with a leftover guest cookie is unaffected

- **Given** a browser has a `guest_claims` cookie holding claim P
- **And** the browser's user now signed in
- **When** the signed-in user views the item P targets
- **Then** the card reflects the session identity only
- **And** P is not presented as the viewer's claim

### Flow: Owner master unclaim still covers guest rows

- **Given** the list owner with spoilers on
- **And** an item carrying a signed-out guest claim in view
- **When** the owner clicks `Manage claims`
- **And** clicks `Remove` on the guest row
- **Then** the guest claim is removed

## No manual path — fully automated

- Cookie attribute contract (`httpOnly`, `SameSite=Lax`, max-age, bounded id list, malformed-cookie replacement) — server-side cookie mechanics with no rendered surface; unit-asserted.
- Post-cache overlay cache purity (cookie never a `'use cache'` input; shared cached output across differing cookies) — internal caching behavior, not observable in a manual walk.
- Retired guest-name-match removal authorization — the path had no UI before or after; endpoint-level rejection is unit-asserted.
- Dormant `id`/`name` cookie fields — carried but never displayed or branched on; nothing to observe.
