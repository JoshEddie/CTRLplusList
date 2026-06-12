# list-item-management — delta for restructure-claim-flow

## MODIFIED Requirements

### Requirement: The purchase modal SHALL render the claim flow for the viewer's auth state and dispatch claims without a client-supplied user_id

The purchase/claim modal UI (`PurchaseFlowContainer` mounted by `Item.tsx` via `Modal`) SHALL select which claim flow it renders from the viewer's authentication state, and SHALL produce claim/un-claim dispatches that obey the identity contract owned by the `createPurchase` / `removePurchase` server-action requirements in this capability. Every variant opens with the modal header (item thumbnail, name, price, close affordance) and the store row (owned by `item-store-links`); below that:

- For an **unauthenticated** viewer, the modal SHALL render the guest flow: a "Your name" field and a "Claim as Guest" action disabled until the name is non-empty, with the sign-in affordance demoted to a footer line below the claim section — the store row SHALL never sit behind a sign-in step. The resulting `createPurchase` call SHALL carry `{ item_id, guest_name }` and SHALL NOT carry a `user_id`.
- For an **authenticated** viewer, the modal SHALL render the self-claim CTA plus the collapsed attributed-claim disclosure (anatomy owned by `claim-attribution`):
  - **claim for myself** — the primary CTA; the resulting `createPurchase` call SHALL carry `{ item_id, guest_name: null }` (identity resolved server-side from the session, recorded as a self-claim);
  - **attributed or guest-name claim** — reached by expanding the disclosure; confirming a free-text name produces a `createPurchase` call carrying `{ item_id, guest_name: <entered name> }`, and confirming a pool row produces the attributed-claim dispatch defined by `claim-attribution`'s eligibility contract.

  No branch SHALL carry a client-supplied `user_id`.
- For a viewer with a **removable claim**, the modal SHALL render the already-claimed state (store row + "Remove my claim", owned by `claim-attribution`). Un-claiming SHALL dispatch `removePurchase`; for a guest the dispatch SHALL carry the claim's `purchase_id` (never `(item_id, guest_name)` alone), and for an authenticated caller it SHALL carry the row reference for the session-authorized claim.

This requirement governs the **UI** that produces those payloads; the server-side enforcement of identity, capacity, and the partial-unique-index duplicate backstop is owned by this capability's `createPurchase` / `removePurchase` / capacity requirements (locked by the action-layer carve-out `test-list-item-management`). The no-client-`user_id` rule is the list-item-management-specific application of the cross-cutting `server-endpoint-authorization` contract; this requirement does not restate that cross-cutting SHALL, it binds the UI to it.

#### Scenario: Unauthenticated viewer claims as a guest

- **WHEN** an unauthenticated viewer opens the purchase modal on a claimable item, enters a display name, and confirms the claim
- **THEN** the modal calls `createPurchase` with `{ item_id, guest_name: <entered name> }` and no `user_id` field
- **AND** the modal also exposes a sign-in affordance below the claim section

#### Scenario: Guest sees store links without signing in

- **WHEN** an unauthenticated viewer opens the purchase modal on an item with valid stores
- **THEN** the store row renders above the guest-name field — no sign-in step gates it

#### Scenario: Unauthenticated viewer cannot claim with an empty guest name

- **WHEN** an unauthenticated viewer attempts to confirm a claim without entering a display name
- **THEN** the confirm affordance is disabled (or the claim is not dispatched) and no `createPurchase` call is made

#### Scenario: Authenticated viewer self-claims using session identity

- **WHEN** an authenticated viewer opens the purchase modal and activates the primary self-claim CTA
- **THEN** the modal calls `createPurchase` with `{ item_id, guest_name: null }` and no `user_id` field

#### Scenario: Authenticated viewer claims for a named non-user

- **WHEN** an authenticated viewer expands the disclosure, enters a name under "Someone not listed?", and confirms
- **THEN** the modal calls `createPurchase` with `{ item_id, guest_name: <entered name> }` and no `user_id` field
- **AND** the resulting claim is attributed to the named third party, not to the viewer

#### Scenario: Guest un-claim dispatches the purchase row id

- **WHEN** a guest revokes their own claim from the modal
- **THEN** the modal calls `removePurchase` carrying that claim's `purchase_id`, not `(item_id, guest_name)` alone

## ADDED Requirements

### Requirement: createPurchase SHALL return the inserted purchase row id and optimistic claim state SHALL use it

On success, `createPurchase` SHALL include the inserted `purchases` row's id in its return value (additive to the existing success shape). The client's optimistic claim state SHALL use that server-issued id for the appended row — it SHALL NOT fabricate a client-side id. Reconciliation between optimistic rows and server-refreshed rows SHALL key on the row id, so a claim is never rendered twice when the server snapshot arrives before or after the optimistic append. An unclaim dispatched immediately after a claim — before any server-driven re-render — SHALL therefore carry a real row id and succeed.

#### Scenario: Immediate unclaim after claim succeeds

- **WHEN** a viewer claims an item and, before any refresh, activates the claim's removal affordance
- **THEN** `removePurchase` receives the real inserted row id and the removal succeeds (no "Claim not found")

#### Scenario: Optimistic row does not duplicate against the server snapshot

- **WHEN** the server-driven re-render delivers the inserted row while an optimistic row with the same id is present
- **THEN** the claim renders exactly once

#### Scenario: Return shape is additive

- **WHEN** an existing caller reads only the previous success/error fields of `createPurchase`'s return value
- **THEN** it continues to work unchanged
