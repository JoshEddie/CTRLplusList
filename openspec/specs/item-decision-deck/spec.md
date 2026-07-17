# item-decision-deck Specification

## Purpose

Governs the post-fetch item flow that replaced the all-fields-at-once item form: the stepped Decision Deck that surfaces only the fields a fetch left uncertain and confirms the rest, the Review and Fill-manually shells with the Focus editors and sheets behind them, and the Preview that serves as the universal create/edit surface and sole save point — entered from the fetch and edit paths directly, and from manual entry via the Fill-manually shell. It owns the deck's step selection, the name and price validation tiers with their editing affordances, the failure screen's kind-aware content and attempt behavior, the adapter mapping the view-model to the persisted item shape, and the accessibility and contrast floor for every control it renders. Routing into this flow — and which failure kind each fetch result maps to — is owned by `product-link-prefill`.
## Requirements
### Requirement: The intro card SHALL summarize what was pulled and what needs the user

The `intro` card SHALL show a heading, a subtitle carrying the fetch attribution ("Auto-filled from {store}" folded into the supporting line, with a store-less fallback) and setting the expectation of a final preview, a confirmed-summary list (photos found, name when its tier is `good`, store + link saved), and a single count line stating how many steps remain — the cards still to come (the photo pick, any flagged field, and an optional note), i.e. the computed step count excluding the intro itself. Its footer SHALL pair a secondary "Change link" affordance returning to the URL entry state (the intro is a pre-step overview outside the tracker, so this back affordance lives here and not on the field cards) with a primary "Let's go" advance to the first remaining card.

When the fetch returned zero images, the summary SHALL surface that gap as a **warning** row ("No photos found — add one") rather than omitting the photos line — the summary that shows what was pulled SHALL NOT stay silent about a missing photo. The severity is `warning`, not `error`: a null image is permitted, matching the Triage photo row's `warn` tier and the missing-price warning.

#### Scenario: Intro reflects confirmed and pending fields

- **WHEN** the deck opens with a clean price, a flagged title, and multiple images
- **THEN** the intro SHALL confirm photos and store, omit the name from the confirmed list, and indicate two remaining steps (the photo pick and the one flagged field)

#### Scenario: Intro flags a zero-image fetch as a warning

- **WHEN** the deck opens from a fetch that returned no images
- **THEN** the intro summary SHALL show a warning row indicating no photos were found, not omit the photos line

#### Scenario: Change link returns to URL entry

- **WHEN** the user activates "Change link" on the intro card
- **THEN** the URL entry state SHALL render, and the field cards themselves SHALL offer no standalone Back (backward navigation there is the tracker)

### Requirement: The photo card SHALL show whenever there is a choice or a problem

The photo step SHALL be shown whenever more than one image was returned (a real choice) or zero images were returned (a problem), and SHALL be bypassed when exactly one image was returned:
- **More than one image:** the `photo` card SHALL present a primary stage with previous/next navigation, a selectable thumbnail strip with a visible selected state, and an "add image by URL" affordance.
- **Exactly one image:** the photo card SHALL be skipped and the single image auto-selected as active; the deck SHALL continue through any remaining computed cards (the rest of the deck is not bypassed).
- **Zero images:** the `photo` card SHALL render in an empty/error state with a clear "we couldn't find any images" message and the add-by-URL affordance. The user MAY add an image or proceed without one (a null image is permitted by the model), but the absence SHALL be surfaced, not silently skipped.

Undersized candidates SHALL be pruned from display following the existing item-image-candidates behavior, while the active and main images remain visible. The selected photo SHALL become the active image on save. Every photo control (stage nav, thumbnails, add) SHALL meet the 44px touch-target floor or the documented small/link exception.

#### Scenario: Single image bypasses the selector

- **WHEN** a fetch returns exactly one image
- **THEN** the photo card SHALL NOT appear, that image SHALL be auto-selected as active, and the deck SHALL still run any remaining title/price/note cards

#### Scenario: Zero images shows an error state

- **WHEN** a fetch returns no images
- **THEN** the photo card SHALL appear with a "couldn't find any images" message and the add-by-URL affordance, and the user MAY proceed with no image

#### Scenario: Selecting a thumbnail updates the active photo

- **WHEN** more than one image was returned and the user activates a thumbnail other than the current one
- **THEN** that image SHALL become selected and be shown on the stage, and SHALL be the active image when the item is created

#### Scenario: Adding a photo by URL appends and selects it

- **WHEN** the user pastes a valid image URL into the add affordance and confirms
- **THEN** the URL SHALL be appended to the candidate pool and selected

### Requirement: Title validation SHALL use tiers at 50 (warn) and 100 (error)

A pure `titleTier(name)` helper SHALL classify the name: empty → `error` ("An item needs a name"); length < 3 → `error` (too short — `item.schema.ts` requires at least 3 characters); length > 100 → `error` (over the limit, cannot be saved); length > 50 → `warn` (longer than 50 characters — suggest trimming; extra detail belongs in a description); otherwise → `good`. The tier floor and ceiling SHALL match the `name` 3–100 bounds enforced in `item.schema.ts` so a too-short or too-long name is blocked inline at the deck/Preview gate rather than only at server-side validation. The title card and Focus editor SHALL show the tier note and a live character counter colored by tier. When the tier is not `good`, a one-tap "suggested trim" affordance SHALL offer a shortened name. The card's continue affordance SHALL be disabled while the tier is `error`, and labeled "Keep it anyway" while `warn`. The same helper SHALL gate the Create/Save action so the 100-character limit cannot be saved.

#### Scenario: Over-100 title blocks continue and save

- **WHEN** the name is 120 characters
- **THEN** `titleTier` SHALL return `error`, the title card's continue SHALL be disabled, and Create/Save SHALL be disabled with a trim prompt

#### Scenario: Under-3 title blocks continue and save

- **WHEN** the name is 2 characters
- **THEN** `titleTier` SHALL return `error` and Create/Save SHALL be disabled inline, matching the `item.schema.ts` `name.min(3)` floor rather than deferring to a server-side rejection

#### Scenario: 51–100 character title warns but allows continue

- **WHEN** the name is 70 characters
- **THEN** `titleTier` SHALL return `warn`, the note SHALL suggest trimming and point to the description, and continue SHALL be enabled labeled "Keep it anyway"

#### Scenario: Suggested trim applies a shorter name

- **WHEN** the title tier is not `good` and the user activates the suggested-trim affordance
- **THEN** the name SHALL be replaced with the shortened suggestion

### Requirement: A long title SHALL surface the note editor inline and SHALL NOT ask for it again

When the title tier is not `good`, the title card SHALL render the description/note editor inline beneath the name field, with copy steering size/color/variant detail into the description rather than the title. When the note is surfaced inline this way, the deck SHALL NOT also present a standalone note card — the same field is requested once. The description SHALL still be shown on Preview regardless.

#### Scenario: Long title reveals inline note and drops the note card

- **WHEN** the title card is shown with a name over 50 characters
- **THEN** the description/note editor SHALL be visible on the same card, no standalone `note` card SHALL follow in the deck, and the description SHALL still render on Preview

### Requirement: Name and description SHALL be capped together and the description SHALL always render in full

The name SHALL be capped at 100 characters and the description at 100 characters (`DESCRIPTION_MAX = 100`), both enforced in `item.schema.ts` and surfaced as live counters in their editors. Wherever the description is displayed — the Preview card and the item's display on a list — it SHALL be rendered in full with no truncation, clamping, or ellipsis. The two caps SHALL be tuned against a single item-card height budget so that removing the description clamp does not stretch a card past its ~2-line description budget; if the description cap is raised, the name cap SHALL be lowered to compensate. This overlaps with item display owned elsewhere; the caps are chosen so the full text fits its display region.

#### Scenario: Description over the cap is rejected at validation

- **WHEN** a create/edit submission carries a description longer than 100 characters
- **THEN** validation SHALL reject it with a field-level error

#### Scenario: Description renders without truncation

- **WHEN** an item with a 100-character description is displayed in the Preview card and on a list
- **THEN** the full description SHALL be visible with no ellipsis or line clamp, without stretching neighbouring cards beyond the shared height budget

### Requirement: The name field SHALL be labeled "Item name" everywhere and SHALL NOT trigger personal-name autofill

The field that holds the item's `name` SHALL carry the user-facing label **"Item name"** on every surface that names it — the deck `intro` confirmed-summary line, the title card, the Triage row, and the Focus editor heading — matching the label the editor's own field already uses. No surface SHALL present this field as the bare word "Name" or as "Title", so the same field is never given a different name on a different screen. The validation copy in `item.schema.ts` SHALL likewise refer to "Item name" (replacing the legacy "Title must be…" strings), matching the `name` field it guards.

The name input SHALL be rendered so the browser does not offer the signed-in person's given/family name as an autofill candidate: it SHALL set `autoComplete="off"` and SHALL NOT expose a DOM `name`/`id` of `"name"`. This requirement governs the **visible copy and DOM input attributes only**; the persisted column, the schema field, and the view-model property remain `name`, and the internal step/tier/editor identifiers (the `title` step, `titleTier`, `TitleEditor`) are an implementation detail outside its scope.

#### Scenario: The name field reads "Item name" on every surface

- **WHEN** one item flows through the intro summary, the title card, the Triage row, and the Focus editor
- **THEN** each surface SHALL label the field "Item name" — never "Name" or "Title"

#### Scenario: The name input does not offer personal-name autofill

- **WHEN** the name editor is rendered
- **THEN** its input SHALL carry `autocomplete="off"` and SHALL NOT expose a `name`/`id` of `"name"`, so the browser does not suggest the user's own name

#### Scenario: Validation copy names the field "Item name"

- **WHEN** a create/edit submission carries a name shorter than 3 or longer than 100 characters
- **THEN** the field-level error SHALL refer to "Item name" rather than "Title"

### Requirement: The price SHALL be required with a link to the source page, never silently zero

The `price` card SHALL NOT offer a "Skip" affordance. Its primary continue affordance SHALL be disabled until a non-empty numeric price is entered. The card SHALL show a `link`-variant affordance to open the pasted/store product page in a new tab so the user can check a price that was not pulled. An empty price SHALL never be persisted as `$0.00`; a store row carrying a name and link SHALL require a numeric price per `item-store-links`.

#### Scenario: Price card blocks until a price is entered

- **WHEN** the price card is shown with no fetched price
- **THEN** continue SHALL be disabled, no "Skip" SHALL be present, and a link to the product page SHALL be available

#### Scenario: Entered price enables continue

- **WHEN** the user types a numeric price
- **THEN** the price tier SHALL become `good` and continue SHALL be enabled

### Requirement: The note card SHALL collect an optional short description when the title is clean

The standalone `note` card SHALL appear only when the title tier is `good` (otherwise the note is surfaced inline on the title card per the inline-note requirement). It SHALL present the description editor with copy explaining that descriptions are not pulled and should be short and specific. The note SHALL be optional — the card's forward ("Continue") affordance SHALL advance to Preview with an empty description, requiring no text — and the editor SHALL show the description counter. A dedicated "Skip" control SHALL NOT be added: the note is the deck's last step, so "Continue" already advances to Preview without requiring input, and a separate Skip would duplicate it and cut against the deck's no-global-skip principle.

#### Scenario: Note card appears for a clean title and can be advanced with no text

- **WHEN** the title tier is `good` and the note card is shown with an empty description
- **THEN** the card's "Continue" affordance SHALL advance to Preview without requiring text

### Requirement: Manual entry SHALL open a dedicated Fill-manually shell

Manual entry SHALL open a **Fill-manually** screen — not the Preview. The screen SHALL render inside the **deck-owned shell** (the same shell every deck screen uses), carrying the flow-name eyebrow ("Add an item", so the chrome beside the close control does not change under the user mid-flow), an `<h2>` reading "Add the details", and a supporting line reading "Tap a field to fill it in.". It SHALL list every field using the same row unit as the Review shell (photo, item name, note, price, store — each with its current value, its provenance, and its tier status), and activating a row SHALL open that field's Focus editor, or the grouped Store editor for the store row. The store row covers the store name and link pair; the price row is its own field.

The Fill-manually screen and the Review screen SHALL be distinct surfaces that share the field-row unit, not one surface parameterized by entry path: they differ in shell title, heading, supporting line, back target, and advance behavior. Neither SHALL re-implement the row.

#### Scenario: Manual entry renders in the deck-owned shell with its own heading

- **WHEN** the user chooses manual entry
- **THEN** the Fill-manually screen SHALL render in the deck-owned shell with the flow-name eyebrow, an `<h2>` "Add the details", and the supporting line "Tap a field to fill it in."

#### Scenario: Activating a field row opens its Focus editor

- **WHEN** the user activates a field row on the Fill-manually screen
- **THEN** that field's Focus editor SHALL open (or the grouped Store editor for the store row)

### Requirement: The Fill-manually shell SHALL return to the URL entry state

The Fill-manually shell SHALL expose a back action returning to the URL entry state, so the link card is reachable from the manual path without dismissing the modal. This SHALL be the affordance `product-link-prefill` requires of the manual form; the Review shell's "Back to preview" SHALL NOT appear on the Fill-manually shell, and the Fill-manually back action SHALL NOT appear on the Review shell.

#### Scenario: Back returns to the link card

- **WHEN** the user activates the back action on the Fill-manually shell
- **THEN** the URL entry state SHALL render, and the modal SHALL NOT close

#### Scenario: The two shells do not share an exit

- **WHEN** the Review shell is rendered
- **THEN** its exit SHALL read "Back to preview" and SHALL return to Preview, not to the URL entry state

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

### Requirement: The edit entry SHALL read as an invitation, not an alarm

The Preview's Triage entry SHALL be labeled "Need to change something?" with a supporting line ("Fix anything that looks wrong") as an accent-variant action row — a white card resting on a `--buy-link-border` seam that lights to a `--buy-link-bg` fill on hover, reusing the buy-link token family with no new color tokens — using an edit affordance rather than a warning flag on a yellow surface. The supporting line SHALL NOT claim system authorship of the item's values ("we got wrong"): Preview is reached by the fetch, manual, and edit routes, and only the first has values the system authored.

#### Scenario: Triage entry is non-alarming

- **WHEN** the Preview is shown
- **THEN** the change-entry SHALL read "Need to change something?" as an accent action row on the buy-link tokens, not "Something's off" on yellow

#### Scenario: The supporting line fits every route

- **WHEN** the Preview is reached from the fetch, manual, or edit route
- **THEN** the Triage entry's supporting line SHALL read "Fix anything that looks wrong", identical across routes

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

### Requirement: Quantity SHALL default to 1 and appear in the Lists & quantity subtext

The item view-model SHALL initialize quantity to a limit of 1 (matching the `quantity_limit` column default). The Preview's "Lists & quantity" entry subtext SHALL include the quantity state alongside list membership (e.g. "Not on a list · Qty 1", "Birthday · Unlimited").

#### Scenario: New item defaults to quantity 1

- **WHEN** a new item reaches Preview
- **THEN** the quantity SHALL be a limit of 1 and the Lists & quantity subtext SHALL show "· Qty 1"

#### Scenario: Quantity reflected after change

- **WHEN** the user sets quantity to Unlimited
- **THEN** the Lists & quantity subtext SHALL reflect "· Unlimited"

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

### Requirement: The submit adapter SHALL map the view-model to the persisted item shape

A single adapter SHALL translate the deck/Preview view-model to the existing `ItemDetails` payload at submit: the selected photo SHALL become the active image and the photo pool SHALL become `image_candidates`; quantity SHALL map to `quantity_limit` (number or null); store rows SHALL preserve `price_fetched_at`/`canonical_url`/`currency` provenance; description SHALL pass through. The existing create/edit actions, associations, and the `items` cache tag SHALL be unchanged.

#### Scenario: View-model maps to ItemDetails on create

- **WHEN** the user creates an item from Preview
- **THEN** the active image SHALL be `photos[photoIndex]`, `image_candidates` SHALL be the photo pool, `quantity_limit` SHALL be the chosen quantity (1 by default), and store provenance SHALL be preserved — flowing through the existing `createItem` action

### Requirement: All deck and preview controls SHALL meet accessibility and contrast contracts

Every interactive control SHALL meet the WCAG 2.5.8 44px touch-target floor or the documented `sm`/`link` exception, render a `:focus-visible` indicator, and convey tier/state by text and icon rather than color alone. Standard buttons SHALL use the `button-system` `<Button>`/`<LinkButton>` primitives; text inputs and textareas SHALL use `form-field-system`. New text/background color pairs SHALL meet WCAG AA contrast, asserted by tests using `test/helpers/contrast.ts`.

#### Scenario: Composite controls meet the touch floor

- **WHEN** the photo navigation, thumbnails, stepper, and action rows are rendered
- **THEN** each SHALL be at least 44×44 CSS pixels (or satisfy the documented small/link spacing exception)

#### Scenario: New color pairs pass AA

- **WHEN** the deck/preview CSS color pairs are evaluated against their backgrounds
- **THEN** each text/background pair SHALL meet the WCAG AA ratio for its text size via the contrast test engine

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

### Requirement: Deck screens SHALL render in a deck-owned shell with pinned-header, scrolling-well, and pinned-footer regions

Every item-add deck screen SHALL render inside a deck-owned shell (`DeckShell`/`DeckScreen`) — an overlay-wrapped rounded container — rather than as a direct child of `<FormShell>`. Each screen SHALL be composed of three regions: a `flex:none` pinned header, a `flex:1; min-height:0; overflow-y:auto` scrolling well, and a `flex:none` pinned footer, so content past the fold is reachable and the primary action is never off-screen at any viewport. The shell SHALL compose the shared `useDismiss` primitive (per `form-shell-system`), and overlay-self-click SHALL dismiss while descendant clicks SHALL NOT. Preview's `container-type: inline-size` (driving its 520px two-column query) SHALL be preserved. The well content of each screen SHALL be the existing deck field editors/cards re-slotted into the well, not re-implemented.

Region padding SHALL be declared exactly once, on the shared `.deck-screen-*` region classes in `deck-screen.css` (the well and the pinned header/footer own their insets); no deck screen SHALL re-declare that padding on its own screen class, and surfaces rendered inside the well SHALL inherit its inset rather than carry one of their own. This supersedes the retired `.deck-body` shared-padding vocabulary.

#### Scenario: Tall content is reachable at all viewports

- **WHEN** any deck screen's content exceeds the viewport height (e.g. Preview with a long store list, or the title screen on a portrait phone)
- **THEN** the well SHALL scroll to reveal the overflow content, and the footer primary action SHALL remain visible and reachable

#### Scenario: Header and footer stay pinned while the well scrolls

- **WHEN** the user scrolls a deck screen's well
- **THEN** the header and footer SHALL remain fixed in place and only the well SHALL scroll

### Requirement: The deck shell SHALL present Edge 3.0 chrome using the app design system

The deck shell SHALL present no titled shell bar. It SHALL render a floating round close control mirroring the item-card kebab treatment (`.item-owner-actions-kebab`), an uppercase eyebrow carrying the flow name ("Add an item" / editing equivalent), and a per-screen title and optional subtitle pinned in the header. All colors, typography, and interactive controls SHALL use the app design system — `global.css` tokens, the app font stack, and existing components (`<Button variant="primary">` for the primary action, form-field-system inputs, the existing suggested-trim and error-tier renderings) — NOT the mock's raw hex, fonts, or inline-styled elements. A new design token SHALL be introduced only where the app has no existing token for a required role.

#### Scenario: Close control mirrors the item-card kebab

- **WHEN** a deck screen renders its shell chrome
- **THEN** the close control SHALL be a floating round button matching the `.item-owner-actions-kebab` treatment, with `aria-label="Close"`

#### Scenario: Primary action uses the button primitive

- **WHEN** a deck screen renders its footer primary action
- **THEN** it SHALL render through `<Button variant="primary">` rather than a page-scoped styled button, and SHALL NOT hardcode a brand color literal

### Requirement: A navigational step tracker SHALL occupy the footer with done, current, and future states

The footer SHALL contain a step tracker above a full-width primary action; the standalone Back button SHALL NOT be present (backward navigation is the tracker). A node's appearance SHALL be built from app tokens along two orthogonal axes: **colour tracks live validity** — a currently valid step is `var(--success-text)` (green, done); an invalid-but-reachable step is `var(--primary-color)` (purple, current); an unavailable step is `var(--neutral-border-color)` (grey, future) — and **fill tracks navigability** — the step on screen is a hollow outline in its status colour carrying `aria-current="step"`; a step that can be jumped to is a solid disc in its status colour; a locked step is grey and natively `disabled`. Validity SHALL be recomputed live so a step flips green the instant its field becomes valid, without leaving it, and an optional step that is valid from the moment it is reachable (e.g. an empty note within the length limit) SHALL read green rather than purple. Reach SHALL extend up to and including the working step (the first incomplete step), so validating it unlocks the next step as a jump target — the user MAY then either activate the primary action or click that step — while a step the user has skipped past (an un-picked photo, a warn title) SHALL stay reachable behind them, and reach SHALL never land past a `stepBlocked` step. Backward navigation SHALL remain open at any time (step data is preserved). The states SHALL be distinguishable without relying on colour alone (ring weight, fill, and label weight), each node SHALL carry an accessible label, the group SHALL expose an sr-only "Step N of M" reflecting the step on screen, the tracker SHALL NOT be placed in an `aria-live` region, and each node SHALL meet the 44px touch-target floor.

#### Scenario: Clicking a reachable node navigates to that step

- **WHEN** the user activates a reachable (solid) node in the tracker
- **THEN** the deck SHALL navigate to that step with its prior data intact

#### Scenario: Validating the working step flips it green and unlocks the next

- **WHEN** the user makes the working (current, purple) step valid — e.g. enters a required price
- **THEN** that node SHALL flip to done (green) in place and the next step SHALL become a reachable jump target, activatable by either the primary action or a click

#### Scenario: The on-screen step is outlined and locked steps are not navigable

- **WHEN** the current step is gated (e.g. an over-limit item name) and the user attempts to activate a later node
- **THEN** the on-screen step SHALL be the outlined `aria-current` node, that later node SHALL NOT be interactive, and the deck SHALL remain on the current step

#### Scenario: Breaking a completed step caps forward navigation

- **WHEN** the user navigates back to a completed step, edits it into a `stepBlocked` state, and then moves to a still-valid earlier step
- **THEN** the broken step SHALL read current (purple) and no node beyond it SHALL be navigable — the still-valid earlier card SHALL NOT re-open a path past it — until it is brought back into good standing

#### Scenario: States are distinguishable without color

- **WHEN** the tracker renders a current node and a future node
- **THEN** they SHALL differ by more than hue (e.g. fill, ring/label weight), each SHALL carry an accessible label, and the group SHALL expose an sr-only "Step N of M"

### Requirement: Deck screens SHALL collapse to a single scroller below a short viewport height

When the viewport height is below approximately 500px (e.g. a landscape phone), a deck screen SHALL collapse to a single root scroller: header, well, and footer scroll as one region (a sticky footer would eat most of the viewport), the floating close stays pinned, and the footer primary action is reachable by scrolling to the end.

#### Scenario: Landscape phone keeps the action reachable

- **WHEN** a deck screen renders at a viewport height below ~500px
- **THEN** the screen SHALL scroll as a single region with the footer primary action reachable and the floating close pinned

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

