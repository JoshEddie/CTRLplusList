# list-item-management — delta

## MODIFIED Requirements

### Requirement: The drag-reorder surface SHALL dispatch updatePriority with the resolved target and optimistically reorder

The list-items drag-reorder UI (`SortItems.tsx`, the capability's sole `@dnd-kit/core` + `@dnd-kit/sortable` consumer, mounted for the list owner via `SortItemsContainer`) SHALL, on a completed drag that lands the moved item on a different target row, (a) optimistically reorder the rendered list immediately via `arrayMove`, and (b) dispatch `updatePriority(item_id, target_id, listId)` where `item_id` is the dragged row and `target_id` is the row it was dropped onto. A drag that ends on the item's own position, or with no drop target, SHALL dispatch nothing and SHALL leave the rendered order unchanged.

Because the surface holds the rendered list in client state for the optimistic reorder, it SHALL re-seed that state from the `items` prop whenever any **displayed** item field changes — image, name, quantity, store fields, or purchase/claim state — keyed on those fields, not item identity alone, so that an item edited or claimed elsewhere is reflected without a full-page reload. A re-render that changes no displayed field SHALL NOT clobber an in-progress drag.

This requirement governs the **UI's target resolution and dispatch payload**; the server-side fractional-position algorithm, rebalance-on-collision, and owner-only authorization for `updatePriority` are owned by this capability's `updatePriority` requirement (locked by the action-layer carve-out `test-list-item-management`).

#### Scenario: Dropping on a different row reorders and dispatches

- **WHEN** the owner drags a list item and drops it onto a different row
- **THEN** the rendered list reorders immediately (optimistic `arrayMove`)
- **AND** `updatePriority` is called with `(draggedItemId, targetRowId, listId)`

#### Scenario: Dropping on the same position is a no-op

- **WHEN** a drag ends with the moved item over its own position, or with no drop target
- **THEN** `updatePriority` is not called and the rendered order is unchanged

#### Scenario: An item edit re-syncs the rendered grid

- **WHEN** the `items` prop changes because an item's image (or name, price, quantity) was edited elsewhere, with item identities unchanged
- **THEN** the surface re-seeds its rendered list from the new prop, so the edit is shown without a hard refresh

### Requirement: The image-search modal SHALL distinguish capacity errors from generic upstream failures in the UI

The image-search modal (`ImageSearch.tsx`) is **retained but unwired**: it has no caller in the item form (the `ImageUrlInput` affordance that opened it is replaced by the candidate picker owned by `item-image-candidates`), and it is kept — with its tests, `ImageResultsViewer`, `image-search.css`, and `GET /api/image-search` — for prospective reuse by a future generic-lists feature. While retained, the component SHALL keep its existing contract: it SHALL request results from `GET /api/image-search` and SHALL surface a **temporarily-unavailable** state — distinct from a generic load failure — for the endpoint's capacity errors: the per-user rate-limit (HTTP 429) and the upstream provider quota (`{ error: 'quota_exceeded' }`). Both capacity shapes map to the same retryable "temporarily unavailable — paste an image URL instead" message; any other failure (a non-ok response, a network error, or a malformed body) SHALL surface a generic "failed to load — try again later" message. A transient capacity error SHALL NOT be presented as a generic permanent failure, and vice versa.

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

#### Scenario: Item form no longer reaches image search

- **WHEN** the item form renders in create or edit mode
- **THEN** no affordance opens `ImageSearch.tsx`, and the component remains in the codebase with its tests passing
