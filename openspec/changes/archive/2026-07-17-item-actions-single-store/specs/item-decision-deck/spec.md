# item-decision-deck Delta

## ADDED Requirements

### Requirement: The store step SHALL collect the store name and link

The deck SHALL include a `store` step whose card presents the store name and link fields — the same grouped Store editor the shells open (store name `TextField`, link `TextField type="url"`). Its continue affordance SHALL be disabled while the store tier is `error` (missing name or invalid link). On the fetch path the link is the pasted URL, so the step's live gap is normally the store name a fetch failed to derive.

#### Scenario: Store step blocks until name and link are complete

- **WHEN** the store card is shown with an empty store name
- **THEN** continue SHALL be disabled until a name is entered alongside a valid link

#### Scenario: Fetched store name premarks the step

- **WHEN** a fetch derives a store name and the link is the pasted URL
- **THEN** the store step SHALL be marked done at deck entry and remain reachable for backward navigation

### Requirement: The grouped Store editor SHALL edit the store name and link in place

A grouped Store editor SHALL edit the item's store name and link as one two-field surface, replacing the retired Stores sheet. It SHALL follow the Focus-editor contract: "Done" always enabled (error-tier values are caught by the shells' advance gates and Preview's save gate, not by trapping the user in the editor). There SHALL be no add-store or remove-store affordance — an item carries exactly one store (cap owned by `item-store-links`). The price SHALL NOT be edited here; it belongs solely to the price row/editor. The Lists & quantity sheet is unchanged.

#### Scenario: Store editor edits name and link only

- **WHEN** the user opens the Store editor
- **THEN** it SHALL present exactly the store name and link fields — no price field, no "Add another store"

#### Scenario: Done never traps

- **WHEN** the Store editor is open with an empty name (error tier)
- **THEN** "Done" SHALL be enabled and return to the calling shell, where the row states the issue

### Requirement: Focus editors and the Lists & quantity sheet SHALL edit fields in place

Per-field Focus editors (photo, title, price, note) SHALL reuse the same editor components as the deck. "Done" SHALL always be enabled: the editors write into the item as the user types, so gating "Done" cannot keep an `error`-tier value out of the item — it can only trap the user on a field they may have no value for. Error-tier values SHALL instead be caught where they can be surfaced in context: the Fill-manually shell SHALL NOT advance while any row is in the `error` tier, and Preview's Create/Save SHALL remain disabled while any gating tier is `error`. The Lists & quantity sheet SHALL toggle list membership and set quantity via a `segmented-control-system` Unlimited/Limit control plus a ≥44px stepper.

#### Scenario: Focus editor never traps the user

- **WHEN** the price Focus editor is open on an item with no price, leaving the field in the `error` tier
- **THEN** "Done" SHALL be enabled and SHALL return the user to the shell they came from

#### Scenario: An error-tier name still cannot be saved

- **WHEN** the user leaves the title Focus editor with a name over 100 characters
- **THEN** the row SHALL state the issue, and Preview's Create/Save SHALL be disabled with a trim affordance

## MODIFIED Requirements

### Requirement: Manual entry SHALL open a dedicated Fill-manually shell

Manual entry SHALL open a **Fill-manually** screen — not the Preview. The screen SHALL render inside the **deck-owned shell** (the same shell every deck screen uses), carrying the flow-name eyebrow ("Add an item", so the chrome beside the close control does not change under the user mid-flow), an `<h2>` reading "Add the details", and a supporting line reading "Tap a field to fill it in.". It SHALL list every field using the same row unit as the Review shell (photo, item name, note, price, store — each with its current value, its provenance, and its tier status), and activating a row SHALL open that field's Focus editor, or the grouped Store editor for the store row. The store row covers the store name and link pair; the price row is its own field.

The Fill-manually screen and the Review screen SHALL be distinct surfaces that share the field-row unit, not one surface parameterized by entry path: they differ in shell title, heading, supporting line, back target, and advance behavior. Neither SHALL re-implement the row.

#### Scenario: Manual entry renders in the deck-owned shell with its own heading

- **WHEN** the user chooses manual entry
- **THEN** the Fill-manually screen SHALL render in the deck-owned shell with the flow-name eyebrow, an `<h2>` "Add the details", and the supporting line "Tap a field to fill it in."

#### Scenario: Activating a field row opens its Focus editor

- **WHEN** the user activates a field row on the Fill-manually screen
- **THEN** that field's Focus editor SHALL open (or the grouped Store editor for the store row)

### Requirement: The Fill-manually shell SHALL advance to Preview once no field is in error and every warning field has been seen

The Fill-manually shell SHALL advance to the Preview when no row is in the `error` tier **and** every row in the `warn` tier has been visited at least once. A row counts as visited once its Focus editor (or, for the store row, the grouped Store editor) has been opened and closed. The predicate SHALL be evaluated when a Focus editor closes — not on each edit — so the advance cannot fire mid-edit.

The predicate SHALL be expressed in terms of tiers alone and SHALL NOT special-case any individual field, so a field whose tier changes in a later change is governed without amendment here. Visit state SHALL gate this predicate only; it SHALL NOT alter any row's tier or its rendering.

The Review shell SHALL NOT auto-advance; it leaves only by its own "Back to preview" action.

#### Scenario: Advance fires when nothing is left to do

- **WHEN** the last `warn` row's editor closes on the Fill-manually shell, no row is in the `error` tier, and every `warn` row has been visited
- **THEN** the Preview SHALL render, seeded with the entered values, exposing the same entries and Create action it exposes for a fetched item

#### Scenario: An unvisited warning row holds the shell

- **WHEN** the item name, price, and store are `good`, the photo row is `warn`, and the photo row has never been opened
- **THEN** the Fill-manually shell SHALL remain rendered and the Preview SHALL NOT render

#### Scenario: An error-tier row holds the shell

- **WHEN** every `warn` row has been visited but the store row is in the `error` tier (no store name yet)
- **THEN** the Fill-manually shell SHALL remain rendered and the Preview SHALL NOT render

#### Scenario: A visited warning row does not become good

- **WHEN** the user opens the photo row on an item with no photo and closes it without adding one
- **THEN** the photo row SHALL remain in the `warn` tier and SHALL render as a `warn` row

#### Scenario: The Review shell never auto-advances

- **WHEN** every row on the Review shell is in the `good` tier
- **THEN** the Review shell SHALL remain rendered until the user activates "Back to preview"

### Requirement: Photo and store tiers SHALL come from pure tier helpers

Pure `photoTier(photos)` and `storeTier(store)` helpers SHALL classify those two fields alongside the existing `titleTier` and `priceTier`, each returning a tier plus a note stating the field's issue. `storeTier` SHALL cover the store name + link pair only (price is owned by `priceTier`): `error` with a naming note when the store name is empty; `error` with a link note when the link is empty or fails `isValidProductUrl`; `good` otherwise. There is no `warn` tier for the store — a link is required (owner decision on #234; first-class non-link items are tracked separately). No surface SHALL derive a photo or store tier inline. The tier helpers remain the single source for these rules so they cannot drift between the deck, the shells, the Focus editors, and Preview.

#### Scenario: A photo-less item is warned, not errored

- **WHEN** an item has no photos
- **THEN** `photoTier` SHALL return the `warn` tier with a note stating that the item has no photo

#### Scenario: A nameless store is an error

- **WHEN** the store has a link but no name
- **THEN** `storeTier` SHALL return the `error` tier with a note that the store needs a name

#### Scenario: An invalid link is an error

- **WHEN** the store's link is empty or fails `isValidProductUrl`
- **THEN** `storeTier` SHALL return the `error` tier with a note that the store needs a valid link

#### Scenario: Tiers are not derived at the row

- **WHEN** a field row renders a photo or store tier status
- **THEN** it SHALL read the tier from the tier helper rather than computing it from the field's value

### Requirement: The deck SHALL show every applicable step with status and open at the first incomplete step

After a successful fetch, the modal SHALL render a stepped deck whose **full applicable step set** is computed once at entry (never reshaped as the user edits), in the canonical membership rules below, and SHALL display every applicable step in the step tracker with a per-step status of done or needs-attention. The deck SHALL open at the **first incomplete** step; auto-satisfied steps SHALL render as **done** and remain reachable for backward navigation.

Step membership (which steps apply):
- `photo` SHALL apply when the candidate count is `0` (empty/error) or greater than `1` (a choice); when exactly one image was returned it is auto-selected and the photo step SHALL be marked done rather than omitted.
- `title`, `price`, and `store` SHALL always apply; a `good`-tier title, price, or store SHALL be marked **done** (not hidden). The step order SHALL be photo → title → price → store → note.
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

### Requirement: Preview SHALL be the universal create/edit surface

The Preview SHALL render the item exactly as it appears on a list by reusing the production list card component itself (the real `ItemCard`, in the owner perspective, with its action area in `ItemActions` view-only mode per `item-actions`), not a separate lookalike — so there is zero divergence between the preview and the created item (layout, photo framing, price line, store affordance all identical). Gaps SHALL surface exactly as the live card surfaces them (a missing price is simply absent on the card); the "fill this in" nudges live off the card, on the action rows and Triage. The Preview SHALL be the entry surface for the fetch (after the deck) and edit paths, and the surface the Fill-manually shell advances into; manual entry SHALL NOT open the Preview directly. It SHALL expose: a "Need to change something?" entry to Triage; a "Store" entry opening the grouped Store editor and a "Lists & quantity" entry opening its sheet; an "Add a note" entry when the description is empty; and a primary Create/Save action. The Create/Save action SHALL be disabled while the title tier is `error`, with an inline trim affordance and explanatory line, and while any store or price row is in the `error` tier (an item cannot be saved without a complete store). The Preview SHALL remain the sole save surface for every path. The previous `ItemForm` SHALL be retired in favor of this surface.

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

- **WHEN** the store row is in the `error` tier on Preview (e.g. a legacy item whose store has no link, opened for edit)
- **THEN** Create/Save SHALL be disabled until the store is completed

### Requirement: Triage SHALL let the user review and jump to every field

Triage — the **Review** shell — SHALL list every field (photo, name, note, price, store) with its current value, its source/provenance, and a tier status: `good` fields marked as a glance-only confirmation, non-`good` fields stating the field's own issue (for example "No photo", a too-long name, a missing store name) rather than a generic "needs you" marker. The issue text SHALL come from the field's tier note, SHALL render identically on the Fill-manually shell, and SHALL NOT depend on whether the row has been visited. An empty note — the one optional field — SHALL keep the `good` tier's confirmation marker but state "Optional" rather than passing a verdict on absent content. Rows SHALL show a visible hover state (border and background shift on the existing card-hover tokens, matching the Preview action rows), not a cursor change alone. Activating a row SHALL open that field's Focus editor (or the grouped Store editor for the store row). A "Back to preview" action SHALL return to Preview.

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

### Requirement: A failed fetch SHALL show a kind-aware, attempt-aware failure screen

When `product-link-prefill` routes a failure to the deck flow, the modal SHALL show a single failure screen whose copy and actions are keyed to the failure *kind*, so a slow fetch and an unreadable link are not labeled identically. The routing of failures (and which kind each result maps to) is owned by `product-link-prefill`; this requirement owns the screen's content, actions, and attempt behavior. Rate-limit responses are out of scope here (they stay on URL entry per `product-link-prefill`).

- **Timeout kind:** the screen SHALL explain the fetch was slow ("This is taking longer than expected") and offer **"Try again"** (re-fetch the *same* link) as the primary action, plus "Try a different link" (return to URL entry) and the manual-entry link. It SHALL NOT imply the link is bad.
- **Failed kind:** the screen SHALL explain the fetch returned no usable product without blaming the link ("We couldn't load that link — it might be the link, or a hiccup on our end") and offer **"Try again"** (same link), **"Try a different link"** (return to URL entry), and the manual-entry link.

The manual-entry escape SHALL NOT render as a stacked button: it SHALL be the "Fill in details manually →" link-variant affordance (`variant="link"` per `button-system`, default size), rendered below the button stack — this screen is the sole manual-entry entry point (the URL entry state no longer carries one, per `product-link-prefill`). This treatment SHALL be uniform across all three screen states (timeout, failed, and retry-capped) and SHALL remain keyboard operable with a visible focus indicator, AA contrast, and spacing to neighboring targets satisfying the WCAG 2.5.8 spacing exception.

Both kinds SHALL offer "Try a different link" from the first failure: a timeout is the slowest failure to observe, so a user who pasted the wrong link SHALL NOT have to spend the retry cap to return to URL entry. The kinds differ in copy and in which action leads, not in the escape paths offered.

The screen SHALL be attempt-aware to prevent same-link "Try again" from grinding into the rate limit: a per-link retry counter (reset when a different URL is entered, and when the link fetches successfully) SHALL permit the same-link "Try again" for the first two failures of a given link, after which the "Try again" action SHALL be withdrawn and the copy SHALL harden ("That link keeps failing — try a different one, or fill in the details manually"), leaving only "Try a different link" and the manual-entry link.

#### Scenario: Timeout kind offers retry-same, a different link, and manual

- **WHEN** a fetch times out (timeout kind) on a link not yet past its retry cap
- **THEN** the failure screen SHALL render with a "taking longer than expected" message, a "Try again" action that re-fetches the same link, a "Try a different link" returning to URL entry, and "Fill in details manually →" opening the Fill-manually shell

#### Scenario: Failed kind admits uncertainty and offers both paths

- **WHEN** a fetch returns no usable product (failed kind) on a link not yet past its retry cap
- **THEN** the failure screen SHALL render with copy that does not blame the link, a "Try again" (same link), a "Try a different link" returning to URL entry, and "Fill in details manually →"

#### Scenario: Manual entry renders as the link affordance below the stack, uniformly

- **WHEN** the failure screen renders in any of its three states (timeout, failed, or retry-capped)
- **THEN** "Fill in details manually →" SHALL render via the `link` button variant below the button stack — not as a stacked peer button — keyboard operable and focus-visible

#### Scenario: Retry cap withdraws Try again and hardens copy

- **WHEN** the same link has failed twice and the failure screen renders a third time for that link
- **THEN** the "Try again" action SHALL NOT be offered, the copy SHALL state the link keeps failing ("try a different one, or fill in the details manually"), and only "Try a different link" and "Fill in details manually →" SHALL remain

#### Scenario: A different link resets the retry cap

- **WHEN** the user enters a different URL after a link exhausted its retry cap
- **THEN** the new link's failure screen SHALL again offer "Try again" from the first failure

#### Scenario: A successful fetch resets the retry cap for that link

- **WHEN** a link that previously failed fetches successfully, and the user returns to URL entry and fetches the same link again
- **THEN** the retry counter SHALL have restarted, so the link SHALL again offer "Try again" for its first two failures rather than carrying its pre-success failures

## REMOVED Requirements

### Requirement: Focus editors and the Stores and Lists & quantity sheets SHALL edit fields in place

**Reason**: The Stores sheet is retired with the multi-store model — store name and link are edited by the grouped Store editor, price by its own editor, and there are no add/remove-store affordances under the single-store cap.

**Migration**: The Focus-editor contract ("Done" always enabled; error tiers caught at the shells' advance gates and Preview's save gate) and the Lists & quantity sheet behavior are re-stated by the ADDED "grouped Store editor" requirement and the existing quantity requirement; per-field editors are unchanged.
