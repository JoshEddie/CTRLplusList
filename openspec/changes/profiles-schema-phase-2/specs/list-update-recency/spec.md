## MODIFIED Requirements

### Requirement: Every mutation that advances updated_at SHALL revalidate the lists cache tag

Each mutation path that advances a list's `updated_at` SHALL call `updateTag('lists')` so cached list reads (hero footer, list cards, `getListsByProfile` ordering) reflect the new timestamp. This includes paths that today revalidate only `items` (`updateItemLists` via the item form, `deleteItem`).

#### Scenario: Item-form membership change refreshes list reads

- **WHEN** an item edit changes list membership and bumps the affected lists' `updated_at`
- **THEN** the `lists` cache tag is revalidated and a subsequent list read returns the new timestamp
