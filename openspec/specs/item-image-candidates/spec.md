# item-image-candidates Specification

## Purpose
TBD - created by archiving change item-image-candidates. Update Purpose after archive.
## Requirements
### Requirement: Image candidates SHALL be stored in an `item_images` table that also holds the active-image pointer

The system SHALL store image candidates in an `item_images` table — `id` (`serial` PK, which also serves as the display-order key so the extractor's main image sorts first), `item_id` (text, FK to `items.id` with `ON DELETE CASCADE`), `url` (text, not null), `active` (boolean, not null, default false). There SHALL be no separate `position` column (the serial id is the order) and no guessable/text id (`item_images` is not a public-URL surface). The active image SHALL be the row whose `active` is true; at most one row per item SHALL be active, enforced by the write path rather than a DB constraint, and reads SHALL resolve the active URL deterministically as `active ORDER BY id LIMIT 1` so a stray double-active still yields one URL and self-heals on the next write. The legacy `items.image_url` column SHALL be retained but inert (expand/contract) and dropped by a later migration; after this change nothing reads or writes it.

#### Scenario: Deleting an item cascades its pool

- **WHEN** an item with `item_images` rows is deleted
- **THEN** its `item_images` rows are removed by the FK cascade with no application-level cleanup

#### Scenario: Selecting a candidate re-points the active row

- **WHEN** the user sets a candidate as the active image
- **THEN** exactly one `item_images` row for that item is `active` (the chosen URL) and `items.image_url` is not written

### Requirement: The fetch flow SHALL persist the candidate pool and mark the active image

On create or update the server action SHALL persist the image set and mark the active image: the set is the submitted candidate list together with the chosen active URL (the form's `image_url`), which is always folded in — so a hand-entered URL outside the extractor set is saved too. The action SHALL delete the item's existing `item_images` rows, then batch-insert the set in order with exactly the active-URL row flagged `active`. On an update that carries no candidate list (a manual edit that did not refetch), the existing pool SHALL be read and preserved as the base while the active image is re-pointed. The candidate list SHALL be validated server-side (`item.schema.ts`): at most 15 entries that are each a syntactically valid http(s) URL, plus at most **one** placeholder entry — a URI matching the placeholder prefix exported by `item-placeholder-art`, size-capped to protect the text column — which is exempt from the 15 (a placeholder never displaces a real fetched image). Any other `data:` URI is invalid. Invalid submissions are rejected by the existing form validation path. A crash between delete and insert leaves an empty pool; this residual is accepted — the next save repopulates.

#### Scenario: Fetched create persists the pool

- **WHEN** a user creates an item from a successful product fetch that returned 4 image candidates
- **THEN** 4 `item_images` rows persist in extractor order and the row matching the user's chosen (default: first) candidate is the one flagged `active`

#### Scenario: Refetch replaces the pool

- **WHEN** a user edits an item via a fresh link fetch that returns a different candidate set
- **THEN** the old pool rows are gone and only the new candidates remain

#### Scenario: Manual edit preserves the pool and folds in the active URL

- **WHEN** a user edits an item without refetching and sets `image_url` to a URL outside the existing pool
- **THEN** the existing `item_images` rows are preserved and the hand-entered URL is appended as the active row

#### Scenario: Oversized or malformed candidate list is rejected

- **WHEN** a submission carries more than 15 http(s) candidates, more than one placeholder URI, an oversized placeholder URI, or a non-placeholder `data:` entry
- **THEN** server-side validation rejects the submission and no pool rows are written

#### Scenario: Selected placeholder persists through the normal pool path

- **WHEN** a user saves an item with a placeholder preview selected as the active image alongside 15 real candidates
- **THEN** the submission validates (the placeholder is exempt from the 15), and the placeholder URI persists as the `active` row

### Requirement: Pool reads SHALL ride the item read path and existing cache tags

The item detail read in `lib/data/item.ts` SHALL load the item's `item_images` ordered by `id` under the existing `'use cache'` + `cacheTag('items')` read. Pool mutations occur only inside the existing item create/update server actions, whose existing `updateTag('items')` call SHALL cover pool freshness; no new cache tag and no new server-action endpoint SHALL be introduced for candidates.

#### Scenario: Pool mutation invalidates item reads

- **WHEN** a fetched update replaces an item's pool
- **THEN** the action's `updateTag('items')` invalidates cached item reads and the next read returns the new pool

