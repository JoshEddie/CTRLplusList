## MODIFIED Requirements

### Requirement: Lists SHALL support an optional subtitle field

The `lists` table SHALL include a nullable `subtitle` text column. The field SHALL be editable through the list create and update forms. When persisted, the subtitle SHALL render alongside the list name on the home rail card and on any list-card view of the list.

When `subtitle IS NULL`, no subtitle **text** SHALL be rendered. The list-card view (home rail / My Lists) MAY render a non-text, `aria-hidden` placeholder spacer (`list-card-subtitle-placeholder`) in place of the subtitle line to preserve vertical alignment across cards in a grid — this spacer carries no subtitle text and is not exposed to assistive technology. The list-hero view (`ListDetails`) SHALL render no subtitle node at all when `subtitle IS NULL`. The card-grid layout rationale for the placeholder spacer is owned by the `list-collections` capability; this requirement owns only the contract that the spacer carries no subtitle text and is `aria-hidden`.

#### Scenario: Subtitle persists through create

- **WHEN** an authenticated user creates a list with name "Christmas List 2025" and subtitle "Brandy Family"
- **THEN** the row's `subtitle` column stores "Brandy Family" and subsequent reads return it

#### Scenario: Subtitle persists through update

- **WHEN** the owner edits a list to set `subtitle = "Josh Family"`
- **THEN** the row's `subtitle` column is updated and subsequent reads return the new value

#### Scenario: Empty subtitle stores NULL

- **WHEN** the owner submits a list edit form with the subtitle field blank
- **THEN** the row's `subtitle` column is set to NULL (not an empty string)

#### Scenario: Subtitle renders on list cards

- **WHEN** a list with `subtitle = "Brandy Family"` is rendered as a card on the home digest or My Lists page
- **THEN** the card shows the subtitle text in a `list-card-subtitle` element below the list name and above the meta row

#### Scenario: Null subtitle renders a non-text placeholder spacer on the card

- **WHEN** a list with `subtitle = NULL` is rendered as a list card (home rail / My Lists)
- **THEN** no `list-card-subtitle` text element is rendered
- **AND** a `list-card-subtitle-placeholder` element is rendered in its place
- **AND** that placeholder element is `aria-hidden` and contains no subtitle text

#### Scenario: Null subtitle renders no node in the hero

- **WHEN** a list with `subtitle = NULL` is rendered in the list-hero view (`ListDetails`)
- **THEN** no subtitle node (`list-hero-subtitle` or its wrapper) is rendered at all

## ADDED Requirements

### Requirement: A blank or whitespace-only subtitle SHALL normalize to NULL

A subtitle submitted as an empty string, a whitespace-only string, or omitted entirely SHALL be persisted as SQL `NULL`, never as `''` or a whitespace string. This normalization SHALL be enforced as defense-in-depth at two layers: (a) the server-side `ListSchema.subtitle` zod validator, which trims/coerces an empty-or-null input to `null` via its `.transform`; and (b) the `ListForm` client, which trims the raw input and maps the empty result to `null` before invoking the action. Neither layer SHALL be removed in isolation on the assumption the other suffices — the server layer is the authority, and the client layer prevents a spurious empty-string round-trip.

#### Scenario: Empty-string subtitle normalizes to NULL at the validator

- **WHEN** a create or update payload carries `subtitle = ""`
- **THEN** the validated value is `null`
- **AND** the persisted column is SQL `NULL`, not an empty string

#### Scenario: Whitespace-only subtitle normalizes to NULL

- **WHEN** the list form's subtitle field contains only whitespace
- **THEN** the client trims it to an empty string and submits `subtitle = null`
- **AND** the persisted column is SQL `NULL`

#### Scenario: Omitted subtitle on create stores NULL

- **WHEN** a create payload omits `subtitle` entirely
- **THEN** the inserted row's `subtitle` column is SQL `NULL`

### Requirement: Subtitle SHALL be capped at 120 characters

A subtitle SHALL be at most 120 characters. The cap SHALL be enforced server-side by `ListSchema.subtitle.max(120, …)` (rejecting an over-length value with a validation error) and mirrored client-side by `maxLength={120}` on the subtitle input. A value exceeding 120 characters SHALL NOT be persisted.

#### Scenario: Over-length subtitle is rejected by the validator

- **WHEN** a create or update payload carries a `subtitle` longer than 120 characters
- **THEN** validation fails with a field error on `subtitle`
- **AND** no row is inserted or updated with the over-length value

#### Scenario: 120-character subtitle is accepted

- **WHEN** a payload carries a `subtitle` of exactly 120 characters
- **THEN** validation succeeds and the value is persisted

### Requirement: A partial list update SHALL distinguish an omitted subtitle from a cleared subtitle

`updateList` accepts a partial payload. An update that OMITS `subtitle` SHALL leave the stored value untouched (changing other fields SHALL NOT wipe an existing subtitle). An update that explicitly sets `subtitle = null` SHALL clear the stored value. The distinction SHALL be implemented by gating the write on `subtitle !== undefined` (omitted ⇒ `undefined` ⇒ not written; explicit null ⇒ written as NULL).

#### Scenario: Omitting subtitle preserves the stored value

- **WHEN** a list with `subtitle = "Brandy Family"` is updated with a payload that changes `name` and omits `subtitle`
- **THEN** the stored `subtitle` remains "Brandy Family"

#### Scenario: Explicit null subtitle clears the stored value

- **WHEN** a list with `subtitle = "Brandy Family"` is updated with a payload carrying `subtitle = null`
- **THEN** the stored `subtitle` becomes SQL `NULL`
