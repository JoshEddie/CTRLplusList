# item-decision-deck Delta

## ADDED Requirements

### Requirement: The linkless door SHALL enter the standard deck with no intro and no store step

Activating the URL entry state's linkless-door affordance (per `product-link-prefill`) SHALL enter the standard deck card flow — the same tracker, cards, gates, and completion routing as the fetch path, never a parallel flow — seeded from `blankItem()` with no URL. The door entry SHALL skip the intro card (it summarizes a fetch; nothing was fetched), SHALL pre-mark nothing done (every applicable step is tracked from zero), and SHALL include no store step or store fields anywhere in its flow. The photo card SHALL start with zero candidates, filled by the existing transient placeholder-thumb top-up with the first thumb pre-selected (per the zero-image photo-card rule) — the door SHALL NOT seed any image candidates. Price entry SHALL remain optional on this path per the tri-state rules (`item-store-links`): a valid price exits PRICED, an empty price exits BARE, and the existing tier gates govern with no door-specific special-casing. The price card SHALL NOT render a source-page link affordance when no product URL exists. Deck card copy SHALL NOT use fetch-framed language for linkless items — the photo, title, and price cards (and the title card's inline note helper) SHALL branch to linkless-appropriate copy, since nothing was scraped or fetched. The fetch-failure manual path is unaffected: it remains failure-only, link-seeded, and FULL-only.

#### Scenario: Door deck tracks every step from zero with no store step

- **WHEN** the user enters the deck via the linkless door
- **THEN** the deck SHALL open directly on the first card with no intro, the tracker SHALL show the photo, title, and price steps (plus note per the title rule) all incomplete, and no store step SHALL appear

#### Scenario: Door item saves without a price as BARE

- **WHEN** a door-entered item reaches Preview with a title and no price and the user activates Create
- **THEN** the save SHALL succeed with no store row content — the BARE state — with no store or price validation failure

#### Scenario: Door item saves with a price as PRICED

- **WHEN** a door-entered item reaches Preview with a title and a valid price and the user activates Create
- **THEN** the save SHALL succeed as the PRICED state (price present, no name or link)

#### Scenario: Door photo strip is all placeholders

- **WHEN** the door-entered deck shows the photo card
- **THEN** the strip SHALL carry only transient placeholder thumbs per the placeholder top-up rule, the first pre-selected on the stage, with no seeded candidates

#### Scenario: Door price card has no source link

- **WHEN** the door-entered deck shows the price card
- **THEN** no source-page link affordance SHALL render, since no product URL exists

### Requirement: Store-entry affordances SHALL be hidden for linkless items

An item is **linkless** when its store name and link are both empty — the single definition every surface derives from. A linkless item SHALL be offered no store name/link entry anywhere: the Preview SHALL NOT render its "Store" action row, and Triage SHALL omit the store row. An item with only one of the pair (e.g. an orphaned store name) is NOT linkless — its store affordances SHALL remain visible so the error-tier pair can be repaired or cleared. The lock SHALL be derived solely from the item's current state — no persisted flag or schema addition — so door-created items and legacy PRICED/BARE rows are treated identically. The price remains editable for linkless items via its own row/editor. Items with a store link keep every store affordance unchanged; the grouped Store editor itself is unmodified (link-field policy for linked items is #266's scope).

#### Scenario: Linkless edit shows no store affordance

- **WHEN** the owner edits a linkless item — store name and link both empty (a PRICED or BARE item)
- **THEN** the Preview SHALL show no "Store" action row and Triage SHALL list no store row, while the price row remains present and editable

#### Scenario: Linked items keep store affordances

- **WHEN** the owner edits an item whose store has a link
- **THEN** the Preview's "Store" action row and Triage's store row SHALL render as before

## MODIFIED Requirements

### Requirement: The photo card SHALL show whenever there is a choice or a problem

The photo step SHALL always be shown — placeholder art means every flow now carries a real choice (fetched images vs generated placeholders), so the former exactly-one-image bypass is removed and the intro card's remaining-step count SHALL always include the photo pick:

- **One or more images:** the `photo` card SHALL present a primary stage with previous/next navigation, a selectable thumbnail strip with a visible selected state, and an "add image by URL" affordance. With exactly one fetched image, that image SHALL still be pre-selected as active so accepting the default costs one advance.
- **Zero images:** the `photo` card SHALL render the same stage + strip presentation seeded entirely with placeholder thumbs (no "couldn't find any images" dead end); the add-by-URL affordance remains. The **first placeholder thumb SHALL be pre-selected** as the active image — the stage never renders an empty frame — so accepting the default art costs one advance, on both the fetch-zero and linkless-door paths. The saved item therefore always carries an image from the deck; the lazy-mint path of `item-placeholder-art` remains for items that become imageless outside the deck.

The thumbnail strip SHALL append `max(1, 4 − realPhotos)` **transient placeholder thumbs** after the real candidates, each generated from a distinct random seed via the preview action owned by `item-placeholder-art` (0 real → 4 placeholder thumbs, 1 → 3, 2 → 2, 3 or more → 1; a placeholder option always exists). Placeholder thumbs are distinguishable by their generated-art appearance itself (no additional badge or marker), SHALL never be persisted unless selected, and SHALL NOT count toward the candidate cap owned by `item-image-candidates`.

While a placeholder thumb is the current selection — and only then — the stage SHALL show a **reroll** control (a `button-system` button) that regenerates that thumb in place with a fresh random seed; rerolling SHALL NOT reorder the strip or change any other thumb.

Undersized candidates SHALL be pruned from display following the existing item-image-candidates behavior, while the active and main images remain visible; placeholder thumbs are never pruned. The selected photo (real or placeholder) SHALL become the active image on save. Every photo control (stage nav, thumbnails, add, reroll) SHALL meet the 44px touch-target floor or the documented small/link exception.

#### Scenario: Single image no longer bypasses the selector

- **WHEN** a fetch returns exactly one image
- **THEN** the photo card SHALL appear with that image pre-selected on the stage, the strip holding the real thumb plus three placeholder thumbs, and the intro's remaining-step count including the photo pick

#### Scenario: Zero images seeds an all-placeholder strip with the first pre-selected

- **WHEN** the deck opens with no real images (a fetch that returned none, or the linkless door)
- **THEN** the photo card SHALL appear with four placeholder thumbs, the first pre-selected on the stage, and the add-by-URL affordance

#### Scenario: Selecting a thumbnail updates the active photo

- **WHEN** the user activates a thumbnail other than the current one
- **THEN** that image SHALL become selected and be shown on the stage, and SHALL be the active image when the item is created

#### Scenario: Adding a photo by URL appends and selects it

- **WHEN** the user pastes a valid image URL into the add affordance and confirms
- **THEN** the URL SHALL be appended to the candidate pool and selected

#### Scenario: Reroll regenerates only the selected placeholder

- **WHEN** a placeholder thumb is selected and the user activates the reroll control
- **THEN** that thumb SHALL be replaced in place by art from a fresh random seed, the strip order and other thumbs SHALL be unchanged, and the reroll control SHALL NOT render while a real photo is selected

#### Scenario: Unselected placeholder thumbs leave no trace

- **WHEN** the user saves the item with a real photo selected
- **THEN** none of the placeholder preview URIs are persisted

### Requirement: The deck SHALL show every applicable step with status and open at the first incomplete step

After a successful fetch — or a linkless-door entry — the modal SHALL render a stepped deck whose **full applicable step set** is computed once at entry (never reshaped as the user edits), in the canonical membership rules below, and SHALL display every applicable step in the step tracker with a per-step status of done or needs-attention. The deck SHALL open at the **first incomplete** step; auto-satisfied steps SHALL render as **done** and remain reachable for backward navigation.

Step membership (which steps apply):
- `photo` SHALL apply when the candidate count is `0` (empty/error) or greater than `1` (a choice); when exactly one image was returned it is auto-selected and the photo step SHALL be marked done rather than omitted.
- `title` and `price` SHALL always apply; `store` SHALL apply unless the item is linkless (store name and link both empty, per the linkless-lock requirement) at entry — the fetch path always carries a link, the linkless door never does. A `good`-tier title, price, or applicable store SHALL be marked **done** (not hidden) — except a linkless item's empty price, which is a valid save state (BARE) but SHALL NOT be pre-marked done, so the door path still lands on the price card; step *validity* (the tracker's colour) SHALL still read the empty linkless price as valid. The step order SHALL be photo → title → price → store → note.
- `note` SHALL apply as a standalone step only when the title tier **is** `good`; when the title tier is not `good` the note editor is surfaced inline on the title step and the standalone note step SHALL NOT also appear.

A single `stepBlocked(step, item)` helper SHALL determine whether a step is incomplete/gated — for `store`, blocked while `storeTier` is `error` — and SHALL be the sole source consumed by both the step's continue affordance and the tracker's forward-navigation gate. The deck SHALL NOT offer any affordance that jumps straight to Preview bypassing incomplete steps — forward movement advances one step at a time (or via the tracker to an already-reached step), and no "Skip — straight to preview" affordance SHALL exist. Ordering SHALL place completed steps ahead of the first incomplete step.

#### Scenario: Auto-satisfied fields appear as done, not hidden

- **WHEN** a fetch returns a `good`-tier title, price, and store with multiple photos
- **THEN** the tracker SHALL show the title, price, and store steps marked done, the photo step as current/incomplete, and the deck SHALL open on the photo step

#### Scenario: A fetch without a store name surfaces the store step

- **WHEN** a fetch returns a price but no derivable store name
- **THEN** the store step SHALL be incomplete at entry and the deck SHALL stop there for a name before the note step

#### Scenario: Deck opens at the first incomplete step

- **WHEN** a fetch returns a `good` price, store, and single photo but a flagged (long) title
- **THEN** the price, store, and photo steps SHALL be marked done and the deck SHALL open on the title step, with the completed steps ordered ahead of it and reachable by backward navigation

#### Scenario: No affordance skips forward to Preview

- **WHEN** the deck is on any incomplete step
- **THEN** no control SHALL jump directly to Preview past an incomplete step, and forward advance SHALL move one step at a time

#### Scenario: Flagged title surfaces the inline note and drops the standalone note step

- **WHEN** the title tier is not `good`
- **THEN** the note editor SHALL be inline on the title step and no standalone `note` step SHALL appear in the tracker

#### Scenario: A linkless entry has no store step

- **WHEN** the deck is entered via the linkless door
- **THEN** the store step SHALL NOT be in the step set — not rendered as done, absent — and the tracker SHALL show photo → title → price (→ note)

### Requirement: Preview SHALL be the universal create/edit surface

The Preview SHALL render the item exactly as it appears on a list by reusing the production list card component itself (the real `ItemCard`, in the owner perspective, with its action area in `ItemActions` view-only mode per `item-actions`), not a separate lookalike — so there is zero divergence between the preview and the created item (layout, photo framing, price line, store affordance all identical). Gaps SHALL surface exactly as the live card surfaces them (a missing price is simply absent on the card); the "fill this in" nudges live off the card, on the action rows and Triage. The Preview SHALL be the entry surface for the fetch (after the deck) and edit paths, and the surface the Fill-manually shell advances into; manual entry SHALL NOT open the Preview directly. It SHALL expose: a "Need to change something?" entry to Triage; a "Store" entry opening the grouped Store editor **for non-linkless items only** (hidden for linkless items per the linkless-lock requirement) and a "Lists & quantity" entry opening its sheet; an "Add a note" entry when the description is empty; and a primary Create/Save action. The Create/Save action SHALL be disabled while the title tier is `error`, with an inline trim affordance and explanatory line, and while any store or price row is in the `error` tier per the tri-state rules — a linkless item with empty store fields (and an empty or good price) has no `error` tier and SHALL save. The Preview SHALL remain the sole save surface for every path. The previous `ItemForm` SHALL be retired in favor of this surface.

#### Scenario: Manual entry reaches Preview through the Fill-manually shell

- **WHEN** the Fill-manually shell advances
- **THEN** the Preview SHALL render seeded with the entered values, exposing the same entries and Create action as a fetched item, and SHALL be the only surface offering the Create action

#### Scenario: Edit opens Preview seeded from the item

- **WHEN** the user edits an existing item
- **THEN** Preview SHALL render seeded with the item's values (the primary store for a legacy multi-store item) and a "Save changes" action

#### Scenario: Error-tier name blocks create

- **WHEN** the name exceeds 100 characters on Preview
- **THEN** Create/Save SHALL be disabled with a trim affordance and an explanatory line

#### Scenario: Incomplete store blocks create

- **WHEN** the store row is in the `error` tier on Preview (e.g. a legacy item whose store has a name or link but not a valid pair)
- **THEN** Create/Save SHALL be disabled until the store is completed or cleared

#### Scenario: Store-less edit saves

- **WHEN** the owner edits an item with no store rows, leaves the store fields empty, and activates Save
- **THEN** the save SHALL succeed with no store validation failure

### Requirement: Triage SHALL let the user review and jump to every field

Triage — the **Review** shell — SHALL list every field applicable to the item (photo, name, note, price; store **only when the item is not linkless**, per the linkless-lock requirement) with its current value, its source/provenance, and a tier status: `good` fields marked as a glance-only confirmation, non-`good` fields stating the field's own issue (for example "No photo", a too-long name, a missing store name) rather than a generic "needs you" marker. The issue text SHALL come from the field's tier note, SHALL render identically on the Fill-manually shell, and SHALL NOT depend on whether the row has been visited. An empty note — the one optional field — SHALL keep the `good` tier's confirmation marker but state "Optional" rather than passing a verdict on absent content. Rows SHALL show a visible hover state (border and background shift on the existing card-hover tokens, matching the Preview action rows), not a cursor change alone. Activating a row SHALL open that field's Focus editor (or the grouped Store editor for the store row). A "Back to preview" action SHALL return to Preview.

#### Scenario: Tapping a flagged row opens its editor

- **WHEN** the user activates the store row in Triage with no store name set
- **THEN** the grouped Store editor SHALL open

#### Scenario: Green rows show as confirmed

- **WHEN** a field's tier is `good` in Triage
- **THEN** its row SHALL show a confirmation marker and its provenance, not an issue state

#### Scenario: An empty note reads Optional, not a verdict

- **WHEN** the note row renders with an empty description on either shell
- **THEN** it SHALL carry the `good` confirmation marker with the status text "Optional", and a non-empty in-cap note SHALL read "Looks good"

#### Scenario: Hovering a row highlights it

- **WHEN** a pointer hovers any field row on either shell
- **THEN** the row SHALL visibly change surface (border/background), not merely the cursor

#### Scenario: A flagged row names its own issue

- **WHEN** a row is in the `warn` or `error` tier on either shell
- **THEN** its status SHALL state that field's issue drawn from its tier note, and SHALL NOT read "Needs you"
