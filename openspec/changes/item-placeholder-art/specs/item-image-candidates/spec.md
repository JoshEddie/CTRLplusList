# item-image-candidates (delta)

## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: The item form SHALL surface the candidate pool as an inline grid, with the Image URL field demoted to a secondary affordance

**Reason**: Superseded by the landed decision-deck rework — `ImageUrlInput` and `ImageCandidateGrid` no longer exist; the deck's photo card (stage + thumbnail strip + add-by-URL, owned by `item-decision-deck`) is the item form's image surface. The requirement described a UI that is no longer in the tree; its surviving concerns (undersized-candidate pruning, active/main exemption) are already restated in `item-decision-deck`'s photo card requirement.

**Migration**: None — behavior is owned by `item-decision-deck`'s "The photo card SHALL show whenever there is a choice or a problem" requirement, modified in this change.
