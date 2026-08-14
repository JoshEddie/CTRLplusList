# product-link-prefill Delta

## MODIFIED Requirements

### Requirement: The create-item modal SHALL open in a URL-first entry state

When the New Item modal opens in create mode (not edit mode), it SHALL render a URL entry state inside the **deck-owned shell** (`DeckScreen`, per `item-decision-deck`) before the item form: a pinned header carrying the title "Start with a link" and the hint subtitle ("Paste a product link, we'll pull the details, then walk you through anything that still needs attention."), a URL paste field rendered as a `TextField type="url"` inside a `FormField` (per `form-field-system`, labeled "Product link"), and a pinned footer containing a primary "Fetch Details" `<Button>` (per `button-system`). The URL entry state SHALL NOT carry a manual-entry affordance — a store link is required (owner decision on #234), so manual entry is reachable only from the fetch-failure screen (owned by `item-decision-deck`), where the pasted link seeds the store. Edit mode SHALL open directly into the form as today. The dismissal (`useDismiss`, per `form-shell-system`) and navigation-context (`returnTo`, per `list-item-management`) contracts SHALL be preserved across all pre-form states, which render in the same deck-owned shell.

Leaving the Fill-manually shell for the URL entry state SHALL NOT itself discard entered values; the discard moment is re-entry. When the session holds an in-progress manual draft — user-entered name, description, photo, or store name/price; seeded values and untouched defaults do not count — activating the failure screen's manual affordance SHALL first prompt via `confirm-dialog-system` to keep the draft or start over: keeping SHALL return to the Fill-manually shell with the draft's values and visit state intact; starting over SHALL discard the draft to `blankItem(pastedUrl)`, preserving the failure path's URL seeding. With no draft in progress, the affordance SHALL open the shell immediately with no prompt.

This prompt guards in-memory state within one modal session only; durable drafts and cross-session resume belong to the `item_drafts` chain (#210), which MAY amend or replace this behavior.

#### Scenario: Create opens to URL entry

- **WHEN** the user opens the New Item modal in create mode
- **THEN** the URL entry state SHALL render in the deck-owned shell (paste field and "Fetch Details" button) and SHALL NOT render a manual-entry affordance

#### Scenario: Edit skips URL entry

- **WHEN** the user opens the modal to edit an existing item
- **THEN** the form SHALL render directly with the item's values, with no URL entry or return-to-link affordance

#### Scenario: An in-progress draft prompts before discard

- **WHEN** the user has entered values on the Fill-manually shell, navigated away within the modal, and activates the failure screen's "Fill in details manually →" again
- **THEN** a confirm dialog SHALL offer keeping the draft or starting over, and the shell SHALL NOT be silently re-blanked

#### Scenario: Keeping the draft restores it whole

- **WHEN** the user chooses to keep the draft from the prompt
- **THEN** the Fill-manually shell SHALL render with the previously entered values and prior visit state intact

#### Scenario: Starting over discards the draft

- **WHEN** the user chooses to start over from the prompt
- **THEN** the Fill-manually shell SHALL render seeded from `blankItem(pastedUrl)` — the failure path's link seeding, not a merge with the discarded draft

#### Scenario: Invalid URL is rejected client-side

- **WHEN** the user activates "Fetch Details" with a value that is not a valid http(s) URL
- **THEN** no request SHALL be sent and the URL field SHALL show a field-level validation error per `form-field-system`
