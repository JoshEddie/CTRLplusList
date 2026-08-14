## ADDED Requirements

### Requirement: Manual entry SHALL open a dedicated Fill-manually shell

Manual entry SHALL open a **Fill-manually** shell — not the Preview. The shell SHALL render inside the existing `FormShell` with the title "Add an item" (the same title the URL entry state carries, so the chrome beside the close control does not change under the user mid-flow), an `<h2>` reading "Add the details", and a supporting line reading "Tap a field to fill it in.". It SHALL list every field using the same row unit as the Review shell (photo, item name, note, price, store — each with its current value, its provenance, and its tier status), and activating a row SHALL open that field's Focus editor, or the Stores sheet for the store row.

The Fill-manually shell and the Review shell SHALL be distinct surfaces that share the field-row unit, not one surface parameterized by entry path: they differ in shell title, heading, supporting line, back target, and advance behavior. Neither SHALL re-implement the row.

The shell title SHALL flow through the `title` prop `form-shell-system` already owns; no new shell variant is introduced.

#### Scenario: Manual entry renders the Fill-manually shell

- **WHEN** the user chooses manual entry from the URL entry state or the failure screen
- **THEN** the Fill-manually shell SHALL render with the `FormShell` title "Add an item", the heading "Add the details", the line "Tap a field to fill it in.", and a row per field — and the Preview SHALL NOT render

#### Scenario: Activating a row opens its editor

- **WHEN** the user activates the item name row on the Fill-manually shell
- **THEN** the item name Focus editor SHALL open

#### Scenario: Store row opens the Stores sheet

- **WHEN** the user activates the store row on the Fill-manually shell
- **THEN** the Stores sheet SHALL open rather than a Focus editor

### Requirement: The Fill-manually shell SHALL return to the URL entry state

The Fill-manually shell SHALL expose a back action returning to the URL entry state, so the link card is reachable from the manual path without dismissing the modal. This SHALL be the affordance `product-link-prefill` requires of the manual form; the Review shell's "Back to preview" SHALL NOT appear on the Fill-manually shell, and the Fill-manually back action SHALL NOT appear on the Review shell.

#### Scenario: Back returns to the link card

- **WHEN** the user activates the back action on the Fill-manually shell
- **THEN** the URL entry state SHALL render, and the modal SHALL NOT close

#### Scenario: The two shells do not share an exit

- **WHEN** the Review shell is rendered
- **THEN** its exit SHALL read "Back to preview" and SHALL return to Preview, not to the URL entry state

### Requirement: The Fill-manually shell SHALL advance to Preview once no field is in error and every warning field has been seen

The Fill-manually shell SHALL advance to the Preview when no row is in the `error` tier **and** every row in the `warn` tier has been visited at least once. A row counts as visited once its Focus editor (or, for the store row, the Stores sheet) has been opened and closed. The predicate SHALL be evaluated when a Focus editor or sheet closes — not on each edit — so the advance cannot fire mid-edit.

The predicate SHALL be expressed in terms of tiers alone and SHALL NOT special-case any individual field, so a field whose tier changes in a later change is governed without amendment here. Visit state SHALL gate this predicate only; it SHALL NOT alter any row's tier or its rendering.

The Review shell SHALL NOT auto-advance; it leaves only by its own "Back to preview" action.

#### Scenario: Advance fires when nothing is left to do

- **WHEN** the last `warn` row's editor closes on the Fill-manually shell, no row is in the `error` tier, and every `warn` row has been visited
- **THEN** the Preview SHALL render, seeded with the entered values, exposing the same entries and Create action it exposes for a fetched item

#### Scenario: An unvisited warning row holds the shell

- **WHEN** the item name and price are `good`, the photo row is `warn`, and the photo row has never been opened
- **THEN** the Fill-manually shell SHALL remain rendered and the Preview SHALL NOT render

#### Scenario: An error-tier row holds the shell

- **WHEN** every `warn` row has been visited but the price row is in the `error` tier
- **THEN** the Fill-manually shell SHALL remain rendered and the Preview SHALL NOT render

#### Scenario: A visited warning row does not become good

- **WHEN** the user opens the photo row on an item with no photo and closes it without adding one
- **THEN** the photo row SHALL remain in the `warn` tier and SHALL render as a `warn` row

#### Scenario: The Review shell never auto-advances

- **WHEN** every row on the Review shell is in the `good` tier
- **THEN** the Review shell SHALL remain rendered until the user activates "Back to preview"

### Requirement: Photo and store tiers SHALL come from pure tier helpers

Pure `photoTier(photos)` and `storeTier(store)` helpers SHALL classify those two fields alongside the existing `titleTier` and `priceTier`, each returning a tier plus a note stating the field's issue. No surface SHALL derive a photo or store tier inline. The tier helpers remain the single source for these rules so they cannot drift between the deck, the shells, the Focus editors, and Preview.

#### Scenario: A photo-less item is warned, not errored

- **WHEN** an item has no photos
- **THEN** `photoTier` SHALL return the `warn` tier with a note stating that the item has no photo

#### Scenario: Tiers are not derived at the row

- **WHEN** a field row renders a photo or store tier status
- **THEN** it SHALL read the tier from the tier helper rather than computing it from the field's value

## MODIFIED Requirements

### Requirement: Preview SHALL be the universal create/edit surface

The Preview SHALL render the item exactly as it appears on a list by reusing the production list card component itself (the real `ItemCard`, in the owner perspective), not a separate lookalike — so there is zero divergence between the preview and the created item (layout, photo framing, store affordance, `+N` store menu all identical). Gaps SHALL surface exactly as the live card surfaces them (a missing price is simply absent on the card); the "fill this in" nudges live off the card, on the action rows and Triage. The Preview SHALL be the entry surface for the fetch (after the deck) and edit paths, and the surface the Fill-manually shell advances into; manual entry SHALL NOT open the Preview directly. It SHALL expose: a "Need to change something?" entry to Triage; "Store links" and "Lists & quantity" entries opening their sheets; an "Add a note" entry when the description is empty; and a primary Create/Save action. The Create/Save action SHALL be disabled while the title tier is `error`, with an inline trim affordance and explanatory line. The Preview SHALL remain the sole save surface for every path. The previous `ItemForm` SHALL be retired in favor of this surface.

#### Scenario: Manual entry reaches Preview through the Fill-manually shell

- **WHEN** the Fill-manually shell advances
- **THEN** the Preview SHALL render seeded with the entered values, exposing the same entries and Create action as a fetched item, and SHALL be the only surface offering the Create action

#### Scenario: Edit opens Preview seeded from the item

- **WHEN** the user edits an existing item
- **THEN** Preview SHALL render seeded with the item's values and a "Save changes" action

#### Scenario: Error-tier name blocks create

- **WHEN** the name exceeds 100 characters on Preview
- **THEN** Create/Save SHALL be disabled with a trim affordance and an explanatory line

### Requirement: The edit entry SHALL read as an invitation, not an alarm

The Preview's Triage entry SHALL be labeled "Need to change something?" with a supporting line ("Fix anything that looks wrong") on a light-violet (lavender) surface mapped to an existing token, using an edit affordance rather than a warning flag on a yellow surface. The supporting line SHALL NOT claim system authorship of the item's values ("we got wrong"): Preview is reached by the fetch, manual, and edit routes, and only the first has values the system authored.

#### Scenario: Triage entry is non-alarming

- **WHEN** the Preview is shown
- **THEN** the change-entry SHALL read "Need to change something?" on a lavender surface, not "Something's off" on yellow

#### Scenario: The supporting line fits every route

- **WHEN** the Preview is reached from the fetch, manual, or edit route
- **THEN** the Triage entry's supporting line SHALL read "Fix anything that looks wrong", identical across routes

### Requirement: Triage SHALL let the user review and jump to every field

Triage — the **Review** shell — SHALL list every field (photo, name, note, price, store) with its current value, its source/provenance, and a tier status: `good` fields marked as a glance-only confirmation, non-`good` fields stating the field's own issue (for example "No photo", a too-long name, a missing store link) rather than a generic "needs you" marker. The issue text SHALL come from the field's tier note, SHALL render identically on the Fill-manually shell, and SHALL NOT depend on whether the row has been visited. An empty note — the one optional field — SHALL keep the `good` tier's confirmation marker but state "Optional" rather than passing a verdict on absent content. Rows SHALL show a visible hover state (border and background shift on the existing card-hover tokens, matching the Preview action rows), not a cursor change alone. Activating a row SHALL open that field's Focus editor (or the Stores sheet for the store row). A "Back to preview" action SHALL return to Preview.

#### Scenario: Tapping a flagged row opens its editor

- **WHEN** the user activates the price row in Triage with no price set
- **THEN** the price Focus editor SHALL open

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

### Requirement: Focus editors and the Stores and Lists & quantity sheets SHALL edit fields in place

Per-field Focus editors (photo, title, price, note) SHALL reuse the same editor components as the deck. "Done" SHALL always be enabled: the editors write into the item as the user types, so gating "Done" cannot keep an `error`-tier value out of the item — it can only trap the user on a field they may have no value for. Error-tier values SHALL instead be caught where they can be surfaced in context: the Fill-manually shell SHALL NOT advance while any row is in the `error` tier, and Preview's Create/Save SHALL remain disabled while the title tier is `error`. The Stores sheet SHALL edit the primary (auto-fetched) and additional store rows (name, link, price) and add/remove rows, preserving store validity and provenance. The Lists & quantity sheet SHALL toggle list membership and set quantity via a `segmented-control-system` Unlimited/Limit control plus a ≥44px stepper.

#### Scenario: Focus editor never traps the user

- **WHEN** the price Focus editor is open on an item with no price, leaving the field in the `error` tier
- **THEN** "Done" SHALL be enabled and SHALL return the user to the shell they came from

#### Scenario: An error-tier name still cannot be saved

- **WHEN** the user leaves the title Focus editor with a name over 100 characters
- **THEN** the row SHALL state the issue, and Preview's Create/Save SHALL be disabled with a trim affordance

#### Scenario: Stores sheet edits the fetched store

- **WHEN** the user opens the Stores sheet
- **THEN** the auto-fetched store SHALL be editable and additional stores SHALL be addable/removable, with each store requiring name + link + numeric price to be valid
