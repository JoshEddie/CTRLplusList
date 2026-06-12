## MODIFIED Requirements

### Requirement: Saving SHALL apply the add+remove diff against list_items in a single action

Submitting the page SHALL invoke a server action that computes the diff between the user's current selection and the list's stored `list_items`, deletes rows for unchecked items, and inserts rows for newly checked items. The action SHALL be authorized to owners only and SHALL invalidate the `items` and `lists` cache tags on success. When the diff is non-empty, the action SHALL advance the list's `updated_at` (per `list-update-recency`); a no-op save SHALL leave `updated_at` unchanged.

#### Scenario: Mixed add and remove

- **WHEN** the owner unchecks two previously-checked items and checks three new items, then clicks **Save changes**
- **THEN** the two unchecked items' rows are deleted from `list_items` for this list, three new `list_items` rows are inserted for the newly checked items, and a success toast reports the counts
- **AND** the list's `updated_at` is set to the time of the save

#### Scenario: No-op save

- **WHEN** the owner clicks **Save changes** without changing the selection
- **THEN** the Save button is disabled (or the action is a no-op) and `list_items` is unchanged
- **AND** the list's `updated_at` is unchanged

#### Scenario: Non-owner submission is rejected

- **WHEN** a request to set list items is made by a user who is not the list owner
- **THEN** the action returns an unauthorized response and `list_items` is unchanged

### Requirement: updatePriority SHALL reorder list items via fractional positions with rebalance on collision

The `updatePriority(item_id, target_id, listId)` server action SHALL move an item to the position of a target item within a single list, owner-only, using integer fractional indexing over the `list_items.position` column. New `list_items` rows SHALL be appended at `MAX(position) + 65536` (base spacing 65536). On a move, the new position SHALL be computed as the integer midpoint between the target's position and the neighboring row on the side the moved item is travelling from:

- Moving an item from a higher position toward a lower target: `new = floor((prevLowerNeighbor + targetPosition) / 2)`, or `floor(targetPosition / 2)` when the target is already the lowest row (no lower neighbor).
- Moving an item from a lower position toward a higher target: `new = floor((nextHigherNeighbor + targetPosition) / 2)`, or `targetPosition + 65536` when the target is already the highest row (no higher neighbor).

After applying the move, the action SHALL check the two highest positions on the list; when their difference is below a minimum gap of `0.001`, the action SHALL rebalance the entire list by rewriting every row's position to `(index + 1) * 65536` in ascending position order, restoring uniform spacing. The action SHALL invalidate the `items` cache tag on success.

Reorders are presentation-order changes, not list-content changes: neither a move nor a rebalance SHALL advance the list's `updated_at` (per `list-update-recency`).

The action SHALL guard inputs: a caller who is not the list owner SHALL receive an unauthorized response and no write SHALL occur; when either `item_id` or `target_id` is not a member of `listId`, the action SHALL return `{ success: false, error: 'Item or target not found on this list' }`; when the moved item already occupies the target's exact position, the action SHALL return `{ success: false, error: 'Item is already at the target position' }` and no write SHALL occur.

#### Scenario: Move computes the integer midpoint between target and neighbor

- **WHEN** the owner moves an item to sit next to a target that has a neighboring row on the travel side
- **THEN** the moved item's `list_items.position` is updated to the integer floor of the midpoint between the target's position and that neighbor's position
- **AND** the relative order of the other rows is unchanged

#### Scenario: Move to the front edge halves the target position

- **WHEN** the owner moves an item ahead of the current lowest-position row (the target has no lower neighbor)
- **THEN** the moved item's position is set to `floor(targetPosition / 2)`

#### Scenario: Move past the back edge adds base spacing

- **WHEN** the owner moves an item past the current highest-position row (the target has no higher neighbor)
- **THEN** the moved item's position is set to `targetPosition + 65536`

#### Scenario: Collision below min gap triggers full rebalance

- **WHEN** a move would leave the two highest positions on the list differing by less than `0.001`
- **THEN** every `list_items` row on the list is rewritten to `(index + 1) * 65536` in ascending order, restoring 65536 spacing
- **AND** the displayed order is preserved

#### Scenario: Reorder leaves updated_at unchanged

- **WHEN** the owner moves an item via `updatePriority`, including a move that triggers a full rebalance
- **THEN** the list's `updated_at` is unchanged

#### Scenario: Moving to the same position is a no-op

- **WHEN** the owner invokes `updatePriority` with an `item_id` whose position already equals the target's position
- **THEN** the action returns `{ success: false, error: 'Item is already at the target position' }` and no `list_items` row is updated

#### Scenario: Non-member item or target is rejected

- **WHEN** the owner invokes `updatePriority` where `item_id` or `target_id` is not a member of `listId`
- **THEN** the action returns `{ success: false, error: 'Item or target not found on this list' }` and no row is updated

#### Scenario: Non-owner reorder is rejected

- **WHEN** a user who does not own `listId` invokes `updatePriority`
- **THEN** the action returns an unauthorized response and no `list_items` row is updated
