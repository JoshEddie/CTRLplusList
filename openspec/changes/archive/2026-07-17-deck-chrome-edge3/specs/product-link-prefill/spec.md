## MODIFIED Requirements

### Requirement: The create-item modal SHALL open in a URL-first entry state

When the New Item modal opens in create mode (not edit mode), it SHALL render a URL entry state inside the **deck-owned shell** (`DeckScreen`, per `item-decision-deck`) before the item form: a pinned header carrying the title "Start with a link" and the hint subtitle ("Paste a product link, we'll pull the details, then walk you through anything that still needs attention."), a URL paste field rendered as a `TextField type="url"` inside a `FormField` (per `form-field-system`, labeled "Product link"), and a pinned footer stacking a primary "Fetch Details" `<Button>` (per `button-system`) over a "Fill in details manually →" link-variant affordance that switches to manual entry. Activating it SHALL open the Fill-manually shell owned by `item-decision-deck`, with no URL carried over from the paste field — a link the user abandoned without fetching SHALL NOT be seeded into the item. Edit mode SHALL open directly into the form as today. The dismissal (`useDismiss`, per `form-shell-system`) and navigation-context (`returnTo`, per `list-item-management`) contracts SHALL be preserved across all pre-form states, which render in the same deck-owned shell.

Leaving the Fill-manually shell for the URL entry state SHALL NOT itself discard entered values; the discard moment is re-entry. When the session holds an in-progress manual draft — user-entered name, description, photo, or store name/price; seeded values and untouched defaults do not count — activating either manual affordance (URL entry state or failure screen) SHALL first prompt via `confirm-dialog-system` to keep the draft or start over: keeping SHALL return to the Fill-manually shell with the draft's values and visit state intact; starting over SHALL discard the draft (blank from the URL entry state; `blankItem(pastedUrl)` from the failure screen, preserving that path's URL seeding — the two are never merged). With no draft in progress, both affordances SHALL open the shell immediately with no prompt, exactly as specified above.

This prompt guards in-memory state within one modal session only; durable drafts and cross-session resume belong to the `item_drafts` chain (#210), which MAY amend or replace this behavior.

#### Scenario: Create opens to URL entry

- **WHEN** the user opens the New Item modal in create mode
- **THEN** the URL entry state SHALL render in the deck-owned shell (paste field, "Fetch Details" button, manual-entry link) and the item form fields SHALL NOT render yet

#### Scenario: Edit skips URL entry

- **WHEN** the user opens the modal to edit an existing item
- **THEN** the form SHALL render directly with the item's values, with no URL entry or return-to-link affordance

#### Scenario: Manual link bypasses fetching

- **WHEN** the user activates "Fill in details manually →" from the URL entry state with no manual draft in progress
- **THEN** the Fill-manually shell SHALL render immediately, no fetch SHALL be issued, and its back action SHALL return to the URL entry state

#### Scenario: An in-progress draft prompts before discard

- **WHEN** the user has entered values on the Fill-manually shell, returned to the URL entry state, and activates "Fill in details manually →" again
- **THEN** a confirm dialog SHALL offer keeping the draft or starting over, and the shell SHALL NOT be silently re-blanked

#### Scenario: Keeping the draft restores it whole

- **WHEN** the user chooses to keep the draft from the prompt
- **THEN** the Fill-manually shell SHALL render with the previously entered values and prior visit state intact

#### Scenario: Starting over discards the draft

- **WHEN** the user chooses to start over from the prompt at the URL entry state
- **THEN** the Fill-manually shell SHALL render blank

#### Scenario: An unfetched pasted link is not carried into manual entry

- **WHEN** the user types a URL into the paste field and activates "Fill in details manually →" without fetching
- **THEN** the Fill-manually shell SHALL open with an empty store Link field

#### Scenario: Invalid URL is rejected client-side

- **WHEN** the user activates "Fetch Details" with a value that is not a valid http(s) URL
- **THEN** no request SHALL be sent and the URL field SHALL show a field-level validation error per `form-field-system`

### Requirement: The fetching state SHALL show an honest indeterminate loading treatment

While a fetch is in flight the modal SHALL render, in the deck-owned shell: a pinned header carrying the title "Fetching details" (mirroring the "Fetch Details" action that started it), the shared `<LoadingIndicator>` (per `loading-indicator-system` — no new spinner shape), a cycling status message that fades between entries roughly every 2.5 seconds (e.g. "Fetching item details…", "Looking up the price…", "Finding product images…", "Checking store info…", "Hang tight, almost there…"), a static "This may take a moment." line, and a URL strip showing the pasted URL (truncated) with a "change" affordance returning to URL entry. The state SHALL NOT render a progress bar, skeleton form fields, or any specific time promise. The footer SHALL contain only Cancel, which aborts the in-flight request and returns to URL entry. Cycling message text SHALL NOT be inside an `aria-live` region (the indicator's status region announces loading once; cycling text is visual reassurance only).

#### Scenario: Loading renders spinner and cycling messages

- **WHEN** a product fetch is in flight
- **THEN** the modal SHALL show the "Fetching details" title, the shared loading indicator, a cycling status message, the static "This may take a moment." line, and the URL strip — and SHALL NOT show a progress bar or skeleton fields

#### Scenario: Cancel aborts the fetch

- **WHEN** the user activates Cancel during a fetch
- **THEN** the in-flight request SHALL be aborted client-side and the modal SHALL return to the URL entry state with the pasted URL retained

#### Scenario: Change returns to URL entry

- **WHEN** the user activates "change" on the URL strip during a fetch
- **THEN** the request SHALL be aborted and the URL entry state SHALL render with the URL editable
