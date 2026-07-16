## MODIFIED Requirements

### Requirement: The create-item modal SHALL open in a URL-first entry state

When the New Item modal opens in create mode (not edit mode), it SHALL render a URL entry state inside the existing `FormShell` before the item form: a hint line ("Paste a product link to auto-fill details"), a URL paste field rendered as a `TextField type="url"` inside a `FormField` (per `form-field-system`), a primary "Fetch Details" `<Button>` (per `button-system`), and a "Fill in details manually →" link-variant affordance that switches to manual entry. Activating it SHALL open the Fill-manually shell owned by `item-decision-deck`, with no URL carried over from the paste field — a link the user abandoned without fetching SHALL NOT be seeded into the item. Edit mode SHALL open directly into the form as today. The `FormShell` dismissal and navigation-context (`returnTo`) contracts owned by `form-shell-system` and `list-item-management` SHALL be preserved across all pre-form states.

Leaving the Fill-manually shell for the URL entry state SHALL NOT itself discard entered values; the discard moment is re-entry. When the session holds an in-progress manual draft — user-entered name, description, photo, or store name/price; seeded values and untouched defaults do not count — activating either manual affordance (URL entry state or failure screen) SHALL first prompt via `confirm-dialog-system` to keep the draft or start over: keeping SHALL return to the Fill-manually shell with the draft's values and visit state intact; starting over SHALL discard the draft (blank from the URL entry state; `blankItem(pastedUrl)` from the failure screen, preserving that path's URL seeding — the two are never merged). With no draft in progress, both affordances SHALL open the shell immediately with no prompt, exactly as specified above.

This prompt guards in-memory state within one modal session only; durable drafts and cross-session resume belong to the `item_drafts` chain (#210), which MAY amend or replace this behavior.

#### Scenario: Create opens to URL entry

- **WHEN** the user opens the New Item modal in create mode
- **THEN** the URL entry state SHALL render (paste field, "Fetch Details" button, manual-entry link) and the item form fields SHALL NOT render yet

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

### Requirement: A failed or timed-out fetch SHALL fall through to the kind-aware failure screen

When the fetch fails, times out, or returns no usable product data, the modal SHALL transition to the **failure screen** (content and actions owned by `item-decision-deck`), passing the failure *kind* so the screen can label the cause honestly: a `timeout` result (the app-side abort budget was exceeded) SHALL route as the **timeout** kind, and a `fetch_failed` result (no usable product returned) SHALL route as the **failed** kind. A network/transport error with no result SHALL route as the **failed** kind. "Fill in details manually →" (available for every kind; treatment owned by `item-decision-deck`) SHALL open the Fill-manually shell with the pasted URL seeded into the first store row's Link field — the link was real enough to attempt, so it is kept. The failure SHALL never surface fabricated or partial-garbage data as if fetched.

Rate limiting is the exception: a 429 / `rate_limited` response SHALL return the user to the URL entry state (pasted URL retained) with a friendly field-level error ("You've hit the fetch limit — try again in about a minute.") — retry-in-a-minute is the remedy, and it SHALL NOT route to the failure screen.

#### Scenario: Timeout routes as the timeout kind

- **WHEN** a fetch exceeds the app-side timeout
- **THEN** the failure screen SHALL render as the timeout kind (retry re-fetches the same link) and SHALL NOT auto-render a populated form

#### Scenario: Fetch failure routes as the failed kind

- **WHEN** the endpoint returns a `fetch_failed` result, or the request errors with no result
- **THEN** the failure screen SHALL render as the failed kind (copy that does not blame the link), and SHALL NOT auto-render a populated form

#### Scenario: Manual entry from the failure screen opens the Fill-manually shell with the URL

- **WHEN** the user activates "Fill in details manually →" on the failure screen with no manual draft in progress
- **THEN** the Fill-manually shell SHALL render with the pasted URL seeded into the first store row's Link field, and the Preview SHALL NOT render

#### Scenario: A draft survives the failure-screen manual entry via the prompt

- **WHEN** a manual draft is in progress and the user activates "Fill in details manually →" on the failure screen
- **THEN** the confirm dialog SHALL offer keeping the draft (rendered unchanged, no URL merged in) or starting over (blank with the pasted URL seeded)

#### Scenario: Rate-limited fetch stays on URL entry

- **WHEN** the endpoint returns 429 `{ error: 'rate_limited' }`
- **THEN** the URL entry state SHALL render with the pasted URL retained and the slow-down field error, and neither the failure screen nor the Fill-manually shell SHALL render
