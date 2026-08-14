# Acceptance — actor-resolution-consolidation

<!-- Given/When/(And…)/Then user-journey flows for this change.
     One atom per row: a single action or a single assertion. Stages in
     strict order of appearance — any stage recurring after a later one
     (When after Then, Given after When) = a new flow; split it.
     Drafted at propose time from the change's scenarios + pre-existing
     canonical-spec links; refined at apply time with literal handles
     (real button text, real routes) — refine, not rewrite.
     Contract: the acceptance artifact instruction in schema.yaml. -->

This change is a consolidation refactor; the flows below are the walks that
prove observable behavior held across the ten converted call sites. Each flow
names the converted site it pins.

## Flows

### Flow: Signed-out guest claims an item — `resolveClaimIdentity` guest branch

- **Given** a signed-out visitor views a public list they do not own
- **And** the list holds an unclaimed item with a complete store
- **When** the visitor clicks `Add Claim` on the item card
- **And** enters a guest name in the claim form
- **And** confirms the claim
- **Then** the item's top action reads `Manage claim`
- **And** the claim banner reads `You`
- **And** no `Add Claim` action renders on that item
- **And** no `Buy & Claim ↗` action renders on that item
- **And** no sign-in prompt appears

### Flow: Signed-out guest removes their claim — `removePurchase` cookie path

- **Given** a signed-out visitor whose guest claim on an item was recorded from this browser
- **When** the visitor clicks `Manage claim` on that item
- **And** activates the removal control on their own claim row
- **Then** the claim row is removed
- **And** the modal closes when that was the last claim
- **And** the item's top action returns to `Add Claim`

### Flow: Authenticated self-claim — `resolveClaimIdentity` authenticated branch

- **Given** an authenticated non-owner views an unclaimed item with a complete store on another user's list
- **When** the viewer clicks `Add Claim`
- **And** taps `Claim this gift`
- **Then** the claim is recorded with no intervening confirmation screen
- **And** the item's top action reads `Manage claim`

### Flow: Authenticated claim for a named non-user — `createPurchase` guest-name path

- **Given** an authenticated non-owner has the claim modal open on a claimable item
- **When** the viewer expands `Claiming for someone else?`
- **And** enters a free-text name under `Someone not listed?`
- **And** activates `Confirm — {name}`
- **Then** the claim is recorded with the entered name
- **And** the item's top action reads `Manage claim` for this viewer as its claimer

### Flow: Product link fetch seeds the deck — product-fetch `POST`

- **Given** an authenticated user has the New Item modal open in create mode
- **When** the user pastes a product URL into the paste field
- **And** clicks `Fetch Details`
- **Then** the Decision Deck opens seeded with the fetched name, image, price, and store row
- **And** the intro card identifies the source store

### Flow: Owner creates an item — `createItem`

- **Given** an authenticated user is on `/items` with a filter applied
- **When** the user clicks `Create new item`
- **And** fills out the form
- **And** clicks `Create`
- **Then** the user is routed back to the same filtered `/items` view
- **And** the newly created item is visible when it matches the filter

### Flow: Owner edits an item — `updateItem`, `updateItemStores`, `updateItemLists`

- **Given** an owner is viewing `/items` with sort and filter params applied
- **When** the owner activates the Edit entry in an item's kebab menu
- **And** makes a change
- **And** clicks `Update`
- **Then** a success toast appears
- **And** the user is routed back to the same filtered `/items` view

### Flow: Owner archives an item — `archiveItem`

- **Given** an owner views one of their active items on `/items`
- **When** the owner activates the Archive affordance in the item's kebab menu
- **Then** the archival is performed immediately
- **And** a success toast confirms it
- **And** no modal dialog is presented
- **And** the item leaves the `/items` Active tab

### Flow: Delete on an active item offers Archive instead — `deleteItem` entry

- **Given** an owner is on the edit form of an active (non-archived) item
- **When** the owner clicks `Delete`
- **Then** a confirmation dialog titled `Delete this item?` renders
- **And** it shows a full-width `Archive instead` button above a Cancel | Delete row

### Flow: Confirming Delete removes the item — `deleteItem`

- **Given** an owner has the Delete confirmation dialog open for an item reached with a `returnTo` context
- **When** the owner clicks `Delete` in the dialog
- **Then** a success toast appears
- **And** the user is routed to the `returnTo` view
- **And** the deleted item is absent from that view

### Flow: Owner reshapes a list — `setListItems`

- **Given** an owner's list contains two active items
- **When** the owner opens `/lists/[id]/choose-items`
- **And** unchecks the two previously-checked items
- **And** checks three new items
- **And** clicks `Save changes`
- **Then** a success toast reports the counts

## No manual path — fully automated

- Both unresolvable-actor causes reject identically (`server-endpoint-authorization`, added) — requires a session whose email matches no `users` row; not producible in a UI walk. Unit-asserted per design D7.
- A stale session does not become a guest (`server-endpoint-authorization`, added) — same stale-session precondition; pinned by the `purchase.actions` unit test and the e2e guest-claim flow.
- Endpoint resolves the actor without querying the users table (`server-endpoint-authorization`, added) — source inspection, no runtime surface.
- Route handler gating on identity is governed (`server-endpoint-authorization`, added) — the add-item UI is reachable only signed in; the unauthenticated 401 branch is direct-HTTP only.
- Forged `user_id` in payload is impossible to express (`server-endpoint-authorization`) — type-level, code inspection.
- All three `data-layer-organization` scenarios (no app imports, cross-domain import, route-handler import) — import-graph inspection.
- `message` normalization on `createItem`/`updateItem`/`archiveItem` — excluded from the contract by the spec delta, and the affected unauthenticated failure paths are not UI-reachable.
