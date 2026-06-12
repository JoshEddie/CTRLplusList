## ADDED Requirements

### Requirement: The purchase modal SHALL render the claim flow for the viewer's auth state and dispatch claims without a client-supplied user_id

The purchase/claim modal UI (`PurchaseFlowContainer` mounted by `Item.tsx` via `Modal`) SHALL select which claim flow it renders from the viewer's authentication state, and SHALL produce claim/un-claim dispatches that obey the identity contract owned by the `createPurchase` / `removePurchase` server-action requirements in this capability:

- For an **unauthenticated** viewer, the modal SHALL render a guest flow that captures a non-empty display name before claiming and SHALL expose a sign-in affordance; the resulting `createPurchase` call SHALL carry `{ item_id, guest_name }` and SHALL NOT carry a `user_id`.
- For an **authenticated** viewer, the modal SHALL render a self-vs-other branch (claim for myself / mark bought for someone else); the resulting `createPurchase` call SHALL carry `{ item_id, guest_name: null }` (identity is resolved server-side from the session) and SHALL NOT carry a `user_id`.
- Un-claiming SHALL dispatch `removePurchase`; for a guest the dispatch SHALL carry the claim's `purchase_id` (never `(item_id, guest_name)` alone), and for an authenticated caller it SHALL carry the item reference for the session-owned row.

This requirement governs the **UI** that produces those payloads; the server-side enforcement of identity, capacity, and the partial-unique-index duplicate backstop is owned by this capability's `createPurchase` / `removePurchase` / capacity requirements (locked by the action-layer carve-out `test-list-item-management`). The no-client-`user_id` rule is the list-item-management-specific application of the cross-cutting `server-endpoint-authorization` contract; this requirement does not restate that cross-cutting SHALL, it binds the UI to it.

#### Scenario: Unauthenticated viewer claims as a guest

- **WHEN** an unauthenticated viewer opens the purchase modal on a claimable item, enters a display name, and confirms the claim
- **THEN** the modal calls `createPurchase` with `{ item_id, guest_name: <entered name> }` and no `user_id` field
- **AND** the modal also exposes a sign-in affordance

#### Scenario: Unauthenticated viewer cannot claim with an empty guest name

- **WHEN** an unauthenticated viewer attempts to confirm a claim without entering a display name
- **THEN** the confirm affordance is disabled (or the claim is not dispatched) and no `createPurchase` call is made

#### Scenario: Authenticated viewer claims using session identity

- **WHEN** an authenticated viewer opens the purchase modal and confirms a claim for themselves
- **THEN** the modal calls `createPurchase` with `{ item_id, guest_name: null }` and no `user_id` field

#### Scenario: Guest un-claim dispatches the purchase row id

- **WHEN** a guest revokes their own claim from the modal
- **THEN** the modal calls `removePurchase` carrying that claim's `purchase_id`, not `(item_id, guest_name)` alone

### Requirement: The drag-reorder surface SHALL dispatch updatePriority with the resolved target and optimistically reorder

The list-items drag-reorder UI (`SortItems.tsx`, the capability's sole `@dnd-kit/core` + `@dnd-kit/sortable` consumer, mounted for the list owner via `SortItemsContainer`) SHALL, on a completed drag that lands the moved item on a different target row, (a) optimistically reorder the rendered list immediately via `arrayMove`, and (b) dispatch `updatePriority(item_id, target_id, listId)` where `item_id` is the dragged row and `target_id` is the row it was dropped onto. A drag that ends on the item's own position, or with no drop target, SHALL dispatch nothing and SHALL leave the rendered order unchanged.

This requirement governs the **UI's target resolution and dispatch payload**; the server-side fractional-position algorithm, rebalance-on-collision, and owner-only authorization for `updatePriority` are owned by this capability's `updatePriority` requirement (locked by the action-layer carve-out `test-list-item-management`).

#### Scenario: Dropping on a different row reorders and dispatches

- **WHEN** the owner drags a list item and drops it onto a different row
- **THEN** the rendered list reorders immediately (optimistic `arrayMove`)
- **AND** `updatePriority` is called with `(draggedItemId, targetRowId, listId)`

#### Scenario: Dropping on the same position is a no-op

- **WHEN** a drag ends with the moved item over its own position, or with no drop target
- **THEN** `updatePriority` is not called and the rendered order is unchanged

### Requirement: The image-search modal SHALL distinguish capacity errors from generic upstream failures in the UI

The item-form image-search modal (`ImageSearch.tsx`) SHALL request results from `GET /api/image-search` and SHALL surface a **temporarily-unavailable** state — distinct from a generic load failure — for the endpoint's capacity errors: the per-user rate-limit (HTTP 429) and the upstream provider quota (`{ error: 'quota_exceeded' }`). Both capacity shapes map to the same retryable "temporarily unavailable — paste an image URL instead" message; any other failure (a non-ok response, a network error, or a malformed body) SHALL surface a generic "failed to load — try again later" message. A transient capacity error SHALL NOT be presented as a generic permanent failure, and vice versa.

This requirement governs the **UI's consumption** of the endpoint; the endpoint's session gate and the 30-requests-per-minute token bucket are owned by `server-endpoint-authorization` (and exercised by the API-route carve-out `test-image-search-api`). The UI test mocks `fetch` at the boundary and asserts the rendered state per error shape; it does not assert the route's auth or bucket SHALLs. (Implementation note: the source intentionally collapses the 429 rate-limit and the `quota_exceeded` quota into one capacity state rather than two — this requirement binds the UI to that behaviour, not to a finer rate-limit-vs-quota split.)

#### Scenario: Rate-limited response shows the temporarily-unavailable state

- **WHEN** the image-search request resolves with HTTP 429
- **THEN** the modal surfaces the temporarily-unavailable state (retryable, advising the user to paste an image URL), distinct from the generic load-failure state

#### Scenario: Quota-exceeded response shows the same temporarily-unavailable state

- **WHEN** the image-search request resolves with `{ error: 'quota_exceeded' }`
- **THEN** the modal surfaces the same temporarily-unavailable state it shows for a rate-limit

#### Scenario: Other failures show a generic error

- **WHEN** the image-search request fails for any other reason (a non-ok response, a network error, or a malformed body)
- **THEN** the modal surfaces a generic load-failure state, not the temporarily-unavailable capacity state
