# item-decision-deck Specification

## Purpose

Governs the post-fetch item flow that replaced the all-fields-at-once item form: the stepped Decision Deck that surfaces only the fields a fetch left uncertain and confirms the rest, the Review and Fill-manually shells with the Focus editors and sheets behind them, and the Preview that serves as the universal create/edit surface and sole save point — entered from the fetch and edit paths directly, and from manual entry via the Fill-manually shell. It owns the deck's step selection, the name and price validation tiers with their editing affordances, the failure screen's kind-aware content and attempt behavior, the adapter mapping the view-model to the persisted item shape, and the accessibility and contrast floor for every control it renders. Routing into this flow — and which failure kind each fetch result maps to — is owned by `product-link-prefill`.
## Requirements
### Requirement: The deck SHALL surface only fields needing a human and offer no global skip

After a successful fetch, the modal SHALL render a stepped card deck whose steps are computed from the fetched item, in order `intro → photo → title → price → note`:
- `intro` SHALL always be first.
- `photo` SHALL be included when the candidate count is `0` (empty/error state) or greater than `1` (a choice to make), and SHALL be skipped when exactly one image was returned (auto-selected) — see the photo requirement.
- `title` SHALL be included only when the title tier is not `good`.
- `price` SHALL be included only when the price tier is not `good`.
- `note` SHALL be included only when the title tier **is** `good`; when the title tier is not `good` the note editor is surfaced inline on the title card and the standalone note card SHALL NOT also appear.

Validated ("good") title and price SHALL NOT get their own card but SHALL be listed as confirmed on the `intro` summary. The deck SHALL NOT offer any affordance that jumps straight to Preview bypassing the remaining cards — the only forward action is advancing one card at a time. The previous "Skip — straight to preview" link SHALL NOT exist. A progress indicator SHALL reflect the number of computed steps and the current position, and SHALL NOT be placed in an `aria-live` region.

#### Scenario: Clean fields get no card but are confirmed

- **WHEN** a fetch returns a title ≤ 50 characters, a numeric price, and multiple images
- **THEN** the deck SHALL contain `intro`, `photo`, and `note` only, and the `intro` summary SHALL list the name and price as confirmed

#### Scenario: Flagged fields each get a card and the note is not duplicated

- **WHEN** a fetch returns a title over 100 characters, no price, and multiple images
- **THEN** the deck SHALL contain `intro`, `photo`, `title`, and `price` — with the note editor inline on the title card and NO standalone `note` card

#### Scenario: No global skip exists

- **WHEN** the `intro` card is shown
- **THEN** the only forward affordance SHALL advance to the next card, and no control SHALL jump directly to Preview

### Requirement: The intro card SHALL summarize what was pulled and what needs the user

The `intro` card SHALL show an "Auto-filled from {store}" eyebrow, a heading, a confirmed-summary list (photos found, name when its tier is `good`, store + link saved), and a single count line stating how many steps remain — the cards still to come (the photo pick, any flagged field, and an optional note), i.e. the computed step count excluding the intro itself. Its only action SHALL be a primary "Let's go" advance to the first remaining card.

When the fetch returned zero images, the summary SHALL surface that gap as a **warning** row ("No photos found — add one") rather than omitting the photos line — the summary that shows what was pulled SHALL NOT stay silent about a missing photo. The severity is `warning`, not `error`: a null image is permitted, matching the Triage photo row's `warn` tier and the missing-price warning.

#### Scenario: Intro reflects confirmed and pending fields

- **WHEN** the deck opens with a clean price, a flagged title, and multiple images
- **THEN** the intro SHALL confirm photos and store, omit the name from the confirmed list, and indicate two remaining steps (the photo pick and the one flagged field)

#### Scenario: Intro flags a zero-image fetch as a warning

- **WHEN** the deck opens from a fetch that returned no images
- **THEN** the intro summary SHALL show a warning row indicating no photos were found, not omit the photos line

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

### Requirement: Preview SHALL be the universal create/edit surface

The Preview SHALL render the item exactly as it appears on a list by reusing the production list card component itself (the real `ItemCard`, in the owner perspective), not a separate lookalike — so there is zero divergence between the preview and the created item (layout, photo framing, store affordance, `+N` store menu all identical). Gaps SHALL surface exactly as the live card surfaces them (a missing price is simply absent on the card); the "fill this in" nudges live off the card, on the action rows and Triage. The Preview SHALL be the entry surface for the fetch (after the deck), manual, and edit paths. It SHALL expose: a "Need to change something?" entry to Triage; "Store links" and "Lists & quantity" entries opening their sheets; an "Add a note" entry when the description is empty; and a primary Create/Save action. The Create/Save action SHALL be disabled while the title tier is `error`, with an inline trim affordance and explanatory line. The previous `ItemForm` SHALL be retired in favor of this surface.

#### Scenario: Manual entry opens a blank Preview

- **WHEN** the user chooses manual entry
- **THEN** an empty Preview SHALL render (no deck), editable via its sheets and focus editors

#### Scenario: Edit opens Preview seeded from the item

- **WHEN** the user edits an existing item
- **THEN** Preview SHALL render seeded with the item's values and a "Save changes" action

#### Scenario: Error-tier name blocks create

- **WHEN** the name exceeds 100 characters on Preview
- **THEN** Create/Save SHALL be disabled with a trim affordance and an explanatory line

### Requirement: The edit entry SHALL read as an invitation, not an alarm

The Preview's Triage entry SHALL be labeled "Need to change something?" with a supporting line ("Fix anything we got wrong") on a light-violet (lavender) surface mapped to an existing token, using an edit affordance rather than a warning flag on a yellow surface.

#### Scenario: Triage entry is non-alarming

- **WHEN** the Preview is shown
- **THEN** the change-entry SHALL read "Need to change something?" on a lavender surface, not "Something's off" on yellow

### Requirement: Triage SHALL let the user review and jump to every field

Triage SHALL list every field (photo, name, note, price, store) with its current value, its source/provenance, and a tier status: `good` fields marked as a glance-only confirmation, non-`good` fields marked as needing the user. Activating a row SHALL open that field's Focus editor (or the Stores sheet for the store row). A "Back to preview" action SHALL return to Preview.

#### Scenario: Tapping a flagged row opens its editor

- **WHEN** the user activates the price row in Triage with no price set
- **THEN** the price Focus editor SHALL open

#### Scenario: Green rows show as confirmed

- **WHEN** a field's tier is `good` in Triage
- **THEN** its row SHALL show a confirmation marker and its provenance, not a "needs you" state

### Requirement: Focus editors and the Stores and Lists & quantity sheets SHALL edit fields in place

Per-field Focus editors (photo, title, price, note) SHALL reuse the same editor components as the deck and SHALL block "Done" when the field is in an `error` tier. The Stores sheet SHALL edit the primary (auto-fetched) and additional store rows (name, link, price) and add/remove rows, preserving store validity and provenance. The Lists & quantity sheet SHALL toggle list membership and set quantity via a `segmented-control-system` Unlimited/Limit control plus a ≥44px stepper.

#### Scenario: Focus title editor blocks Done on error

- **WHEN** the title Focus editor holds a name over 100 characters
- **THEN** "Done" SHALL be disabled until the name is trimmed

#### Scenario: Stores sheet edits the fetched store

- **WHEN** the user opens the Stores sheet
- **THEN** the auto-fetched store SHALL be editable and additional stores SHALL be addable/removable, with each store requiring name + link + numeric price to be valid

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

The manual-entry escape SHALL NOT render as a stacked button: it SHALL be the "Fill in details manually →" link-variant affordance (`variant="link"` per `button-system`, default size — the same treatment and string as the URL entry state's manual affordance owned by `product-link-prefill`), rendered below the button stack. This treatment SHALL be uniform across all three screen states (timeout, failed, and retry-capped) and SHALL remain keyboard operable with a visible focus indicator, AA contrast, and spacing to neighboring targets satisfying the WCAG 2.5.8 spacing exception.

Both kinds SHALL offer "Try a different link" from the first failure: a timeout is the slowest failure to observe, so a user who pasted the wrong link SHALL NOT have to spend the retry cap to return to URL entry. The kinds differ in copy and in which action leads, not in the escape paths offered.

The screen SHALL be attempt-aware to prevent same-link "Try again" from grinding into the rate limit: a per-link retry counter (reset when a different URL is entered, and when the link fetches successfully) SHALL permit the same-link "Try again" for the first two failures of a given link, after which the "Try again" action SHALL be withdrawn and the copy SHALL harden ("That link keeps failing — try a different one, or fill in the details manually"), leaving only "Try a different link" and the manual-entry link.

#### Scenario: Timeout kind offers retry-same, a different link, and manual

- **WHEN** a fetch times out (timeout kind) on a link not yet past its retry cap
- **THEN** the failure screen SHALL render with a "taking longer than expected" message, a "Try again" action that re-fetches the same link, a "Try a different link" returning to URL entry, and "Fill in details manually →" opening the blank Preview

#### Scenario: Failed kind admits uncertainty and offers both paths

- **WHEN** a fetch returns no usable product (failed kind) on a link not yet past its retry cap
- **THEN** the failure screen SHALL render with copy that does not blame the link, a "Try again" (same link), a "Try a different link" returning to URL entry, and "Fill in details manually →"

#### Scenario: Manual entry renders as the link affordance below the stack, uniformly

- **WHEN** the failure screen renders in any of its three states (timeout, failed, or retry-capped)
- **THEN** "Fill in details manually →" SHALL render via the `link` button variant below the button stack — not as a stacked peer button — with the identical string used on URL entry, keyboard operable and focus-visible

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

### Requirement: Every deck root screen SHALL take its padding from one shared class

Padding for the region below the `<FormShell>` chrome SHALL be declared exactly once, as `.deck-body { padding: 8px 24px 24px; }` in `deck.css`, and SHALL be applied by adding `deck-body` to the root element's class list. No deck screen SHALL declare that padding on its own screen class.

The members SHALL be the root elements `ItemFormContainer.body()` returns whose padding is the shared value: `.deck` (the guided card deck and the URL-entry step), `.deck-triage`, `.deck-focus`, `.deck-sheet`, and `.deck-failure`.

`deck-body` SHALL also confer the deck's shared column layout (`display: flex; flex-direction: column; gap: 16px`), so that membership of that layout is declared once rather than re-listed per screen class. The remaining members of the shared layout rule SHALL be exactly the surfaces that do not carry `deck-body`: `.deck-card`, `.deck-preview`, `.deck-stores`, and `.deck-lists`. Screen classes left without any declaration of their own (`.deck`, `.deck-triage`, `.deck-focus`, `.deck-sheet`) SHALL remain in the markup as screen markers; their absence from `deck.css` is correct, not an omission.

Two roots keep independent values and SHALL NOT carry `deck-body`: `.deck-preview` (`18px 24px`, whose rule also carries `container-type: inline-size`) and `.prefill-fetching-step` (`32px 24px 0`, owned by `product-link-prefill`).

Padding SHALL NOT be moved into `<FormShell>`: `form-shell-system` fixes the shell's DOM, rendering children directly after `form-shell-hd` with no body wrapper, and that capability owns any change to it.

#### Scenario: Triage renders with screen padding

- **WHEN** the Review-anything screen renders
- **THEN** its root element carries `deck-body` and its content is inset from the modal edges rather than flush

#### Scenario: The focus editor behind a triage row renders with screen padding

- **WHEN** a triage row is tapped and the focus editor for that field renders
- **THEN** its root element carries `deck-body` and its content is inset from the modal edges

#### Scenario: The stores and lists sheets render with screen padding

- **WHEN** the Stores sheet or the Lists/quantity sheet opens
- **THEN** the sheet wrapper carries `deck-body` and its content is inset from the modal edges

#### Scenario: The shared value has exactly one home

- **WHEN** `deck.css` is grepped for the shared padding value
- **THEN** `8px 24px 24px` appears only in the `.deck-body` rule, and neither `.deck` nor `.deck-failure` declares padding of its own

#### Scenario: The shared column layout is declared once

- **WHEN** `deck.css`'s shared `display: flex; flex-direction: column; gap: 16px` rule is read
- **THEN** its members are `.deck-body` and the four surfaces that do not carry `deck-body` — `.deck-card`, `.deck-preview`, `.deck-stores`, `.deck-lists` — and no screen class that carries `deck-body` is listed a second time

#### Scenario: Screens with deliberate values are unaffected

- **WHEN** the Preview screen or the fetching screen renders
- **THEN** neither root carries `deck-body`, Preview retains `18px 24px` and its `container-type: inline-size`, and the fetching step retains `32px 24px 0`

### Requirement: Nested deck surfaces SHALL NOT carry the screen padding class

Surfaces rendered inside a padded root SHALL inherit that root's padding and SHALL NOT carry `deck-body`, which would inset them twice. This applies at least to `.deck-card` (inside `.deck`) and to `.deck-stores` and `.deck-lists` (inside `.deck-sheet`). The absence of a padding rule on these classes is correct, not an omission.

#### Scenario: A card inside the guided deck is padded once

- **WHEN** any step card of the guided deck renders inside `.deck`
- **THEN** `.deck-card` does not carry `deck-body`, and the card's inset comes solely from its `.deck` root

#### Scenario: A sheet's body is padded once

- **WHEN** `.deck-stores` or `.deck-lists` renders inside the `.deck-sheet` wrapper
- **THEN** it does not carry `deck-body`, and its inset comes solely from the wrapper

