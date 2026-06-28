# item-image-candidates

The per-item pool of image-URL candidates produced by product fetch, plus the picker UI that lets the user switch the active image among them. The active-image pointer lives in `item_images.active`; the legacy `items.image_url` column is retained inert during a soak and dropped by a later migration.

## ADDED Requirements

### Requirement: Image candidates SHALL be stored in an `item_images` table that also holds the active-image pointer

The system SHALL store image candidates in an `item_images` table — `id` (`serial` PK, which also serves as the display-order key so the extractor's main image sorts first), `item_id` (text, FK to `items.id` with `ON DELETE CASCADE`), `url` (text, not null), `active` (boolean, not null, default false). There SHALL be no separate `position` column (the serial id is the order) and no guessable/text id (`item_images` is not a public-URL surface). The active image SHALL be the row whose `active` is true; at most one row per item SHALL be active, enforced by the write path rather than a DB constraint, and reads SHALL resolve the active URL deterministically as `active ORDER BY id LIMIT 1` so a stray double-active still yields one URL and self-heals on the next write. The legacy `items.image_url` column SHALL be retained but inert (expand/contract) and dropped by a later migration; after this change nothing reads or writes it.

#### Scenario: Deleting an item cascades its pool

- **WHEN** an item with `item_images` rows is deleted
- **THEN** its `item_images` rows are removed by the FK cascade with no application-level cleanup

#### Scenario: Selecting a candidate re-points the active row

- **WHEN** the user sets a candidate as the active image
- **THEN** exactly one `item_images` row for that item is `active` (the chosen URL) and `items.image_url` is not written

### Requirement: The fetch flow SHALL persist the candidate pool and mark the active image

On create or update the server action SHALL persist the image set and mark the active image: the set is the submitted candidate list together with the chosen active URL (the form's `image_url`), which is always folded in — so a hand-entered URL outside the extractor set is saved too. The action SHALL delete the item's existing `item_images` rows, then batch-insert the set in order with exactly the active-URL row flagged `active`. On an update that carries no candidate list (a manual edit that did not refetch), the existing pool SHALL be read and preserved as the base while the active image is re-pointed. The candidate list SHALL be validated server-side (`item.schema.ts`): at most 10 entries, each a syntactically valid http(s) URL; invalid submissions are rejected by the existing form validation path. A crash between delete and insert leaves an empty pool; this residual is accepted — the next save repopulates.

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

- **WHEN** a submission carries more than 10 candidates or a non-http(s) entry
- **THEN** server-side validation rejects the submission and no pool rows are written

### Requirement: Pool reads SHALL ride the item read path and existing cache tags

The item detail read in `lib/data/item.ts` SHALL load the item's `item_images` ordered by `id` under the existing `'use cache'` + `cacheTag('items')` read. Pool mutations occur only inside the existing item create/update server actions, whose existing `updateTag('items')` call SHALL cover pool freshness; no new cache tag and no new server-action endpoint SHALL be introduced for candidates.

#### Scenario: Pool mutation invalidates item reads

- **WHEN** a fetched update replaces an item's pool
- **THEN** the action's `updateTag('items')` invalidates cached item reads and the next read returns the new pool

### Requirement: The item form SHALL surface the candidate pool as an inline grid, with the Image URL field demoted to a secondary affordance

When the form session has 2 or more image candidates (seeded from the in-flight fetch result on create, or from the item's stored pool on edit), `ImageUrlInput` SHALL render the candidates inline as a compact paginated grid (`ImageCandidateGrid`) with no click-to-reveal step. The grid SHALL show at most 4 candidates per page in a 2×2 layout (bounding vertical height) with previous/next arrow controls to page through the rest; the arrows SHALL NOT render when all candidates fit one page, and SHALL disable at the first/last page. A short final page SHALL be padded with empty cells to preserve the 2×2 footprint so the grid height and arrow positions do not shift between pages. The grid SHALL open on the page containing the active image. The active image SHALL be marked **in place** in extractor order — selecting a tile SHALL NOT reorder the grid (reordering causes a jumpy layout). Selecting a tile SHALL route the URL through the existing `image_url` change handler and its image-load validation — the same path a hand-typed URL takes. The inline grid is the primary selector; the Image URL `TextField` is the secondary affordance, hidden behind an "Edit image URL" link-variant `Button` (per `button-system`) and revealed only when the user activates it OR when surfacing it is forced (a validation error to show, or no candidate grid to fall back on). With fewer than 2 candidates no grid renders and the Image URL `TextField` is shown directly. `ImageCandidateGrid` is a dedicated component, not the dormant image-search `ImageResultsViewer` (the two presentations have diverged); the dormant image-search modal SHALL NOT be reachable from the item form.

The grid SHALL prune undersized candidates: each candidate's natural dimensions are probed client-side (image bytes are never fetched server-side, so size is only knowable in the browser) and any whose width or height falls below a minimum threshold SHALL be dropped from the grid, as extractors routinely include tiny thumbnails (e.g. Amazon's `_AC_US40_` 40px variant). A candidate that fails to load SHALL also be dropped. Two candidates SHALL be exempt from pruning so they stay reselectable: the currently active image (what is set) and the extractor's main image (position 0) — pruning a small main would make it unreselectable once the user picks another tile. Pruning affects display only; the stored pool is unchanged. The threshold count interacts with the 2-candidate floor: if pruning leaves fewer than 2 visible, the grid does not render and the Image URL field is shown.

#### Scenario: Inline grid appears after a multi-image fetch

- **WHEN** a fetch resolves with 5 image candidates and the form renders
- **THEN** the first 4 candidates render inline as a 2×2 grid with the prefilled first candidate marked current and a next-page arrow for the 5th, and the Image URL field is collapsed behind an "Edit image URL" affordance

#### Scenario: Short final page keeps a stable footprint

- **WHEN** 10 candidates paginate to a final page of 2
- **THEN** that page renders the 2 tiles plus empty filler cells so the 2×2 grid height and the flanking arrows stay in place

#### Scenario: Picking a candidate updates the active image without reordering

- **WHEN** the user clicks a different candidate tile in the inline grid
- **THEN** the active image becomes the selected URL, the existing image-load validation runs against it, and the clicked tile stays in its original grid position (no reorder)

#### Scenario: Editing an item with a stored pool re-offers the grid

- **WHEN** the user edits a previously fetched item whose pool holds 3 candidates
- **THEN** the inline grid renders without any refetch, listing the stored candidates with the current `image_url` first

#### Scenario: No grid without candidates

- **WHEN** the form renders for a manually created item with an empty pool
- **THEN** no candidate grid renders, the Image URL field is shown directly, and no image-search affordance renders either

#### Scenario: A candidate that fails to load surfaces its error

- **WHEN** a selected candidate fails image-load validation while the URL field is collapsed
- **THEN** the Image URL field is forced visible so its error is shown

#### Scenario: Undersized candidate is pruned from the grid

- **WHEN** a fetch returns candidates including a thumbnail whose natural size is below the minimum (e.g. an Amazon `_AC_US40_` 40px variant)
- **THEN** that thumbnail does not appear in the grid while the full-size candidates do, and the stored pool is unchanged

#### Scenario: Small main image stays reselectable after switching

- **WHEN** the extractor's main image (position 0) is undersized and the user switches the active image to a different candidate
- **THEN** the small main image remains in the grid (reselectable), while other undersized candidates are pruned
