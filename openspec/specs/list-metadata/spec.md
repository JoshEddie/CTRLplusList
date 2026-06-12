# list-metadata Specification

## Purpose

The `list-metadata` capability owns the optional `lists.subtitle` field: a single nullable text column on the `lists` table, editable through the list create and edit forms, and rendered alongside the list name on the list-card views (home rail / My Lists) and the list-hero view (`ListDetails`). It defines the subtitle's persistence contract (normalization to NULL, the 120-character cap, and the omitted-vs-cleared distinction on partial updates) and its render contract (subtitle text when present; a non-text `aria-hidden` placeholder spacer on cards and no node in the hero when absent).

## Requirements

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

### Requirement: Existing lists SHALL NOT be backfilled with derived subtitles

The migration that adds `lists.subtitle` SHALL leave the column NULL for every existing row. The system SHALL NOT auto-parse or derive subtitle values from existing list names or owner relationships.

#### Scenario: Migration leaves existing rows unchanged

- **WHEN** the `subtitle` migration runs over a database with existing list rows
- **THEN** every existing row has `subtitle = NULL` after the migration, regardless of name contents

#### Scenario: Existing lists render identically until edited

- **WHEN** an existing list (created before this change) is viewed without being edited
- **THEN** the card renders with name only (no subtitle slot)

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

### Requirement: The list form SHALL dispatch create vs update by mode and navigate per outcome

The shared `ListForm` component drives both list creation and editing. It SHALL select its server action and its post-success navigation by mode, and SHALL gate dispatch on client-side date validation.

In **create** mode (`isEditing` is false/absent), a successful submit SHALL invoke `createList(data)` and, on a `{ success: true }` result, navigate to `/lists/{id}/choose-items?new=1` (routing the owner into the item-picking funnel for the newly-created list).

In **edit** mode (`isEditing` is true) rendered **as a modal** (an `onClose` callback is provided), a successful submit SHALL invoke `updateList(id, data)` and, on success, call `onSuccess?.()`, then `onClose()`, then `router.refresh()` — closing the modal and revalidating in place with no route change.

In **edit** mode rendered **as a page** (no `onClose` callback), a successful submit SHALL invoke `updateList(id, data)` and, on success, navigate to `/lists/{id}`.

In **edit** mode, the form SHALL snapshot its serialized field values when it opens and compare them at submit time: when the values are unchanged (pristine), the form SHALL NOT invoke `updateList` and SHALL proceed as if the action had succeeded (close/refresh in modal mode, navigate in page mode). This client-side check is a UX short-circuit only; the server-side no-op guard on `updateList` (owned by `list-update-recency`) remains the authority.

The submitted payload SHALL carry the normalized fields `{ name, subtitle, occasion, date }`, where `subtitle` is the trimmed-or-`null` value per the subtitle-normalization requirement and `date` is the parsed `Date`. Client-side date validation SHALL run **before** the action is invoked: an unparseable date string SHALL block the dispatch, surface a field error, and the form SHALL NOT call `createList`/`updateList`. On a failed action result (`{ success: false }`), the form SHALL remain mounted, render the returned message, and SHALL NOT navigate.

#### Scenario: Create-mode success routes into the item-picking funnel

- **WHEN** an authenticated user submits the form in create mode and `createList` returns `{ success: true, id }`
- **THEN** `createList` is invoked with the normalized `{ name, subtitle, occasion, date }` payload
- **AND** the router navigates to `/lists/{id}/choose-items?new=1`

#### Scenario: Edit-as-modal success closes and refreshes without navigating

- **WHEN** the form is rendered in edit mode with an `onClose` callback and `updateList` returns `{ success: true }`
- **THEN** `updateList` is invoked with `(list.id, payload)`
- **AND** `onSuccess` (if provided) is called, then `onClose` is called, then `router.refresh()` is called
- **AND** no `router.push` navigation occurs

#### Scenario: Edit-as-page success navigates to the list

- **WHEN** the form is rendered in edit mode with no `onClose` callback and `updateList` returns `{ success: true, id }`
- **THEN** `updateList` is invoked with `(list.id, payload)`
- **AND** the router navigates to `/lists/{id}`

#### Scenario: Pristine edit submit skips the server action

- **WHEN** the form is submitted in edit mode with every field equal to its value when the form opened
- **THEN** `updateList` is NOT invoked
- **AND** the form proceeds through its success path (close/refresh in modal mode, navigation in page mode)

#### Scenario: Failed action result keeps the form mounted

- **WHEN** a submit returns `{ success: false, message }`
- **THEN** the form remains rendered and displays `message`
- **AND** no navigation, `onClose`, or `router.refresh()` occurs

#### Scenario: Invalid date blocks the action

- **WHEN** the date field holds an unparseable value at submit time
- **THEN** the form surfaces a date field error and does NOT invoke `createList` or `updateList`
