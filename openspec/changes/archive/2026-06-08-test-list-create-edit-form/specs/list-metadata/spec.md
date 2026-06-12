## ADDED Requirements

### Requirement: The list form SHALL dispatch create vs update by mode and navigate per outcome

The shared `ListForm` component drives both list creation and editing. It SHALL select its server action and its post-success navigation by mode, and SHALL gate dispatch on client-side date validation.

In **create** mode (`isEditing` is false/absent), a successful submit SHALL invoke `createList(data)` and, on a `{ success: true }` result, navigate to `/lists/{id}/choose-items?new=1` (routing the owner into the item-picking funnel for the newly-created list).

In **edit** mode (`isEditing` is true) rendered **as a modal** (an `onClose` callback is provided), a successful submit SHALL invoke `updateList(id, data)` and, on success, call `onSuccess?.()`, then `onClose()`, then `router.refresh()` — closing the modal and revalidating in place with no route change.

In **edit** mode rendered **as a page** (no `onClose` callback), a successful submit SHALL invoke `updateList(id, data)` and, on success, navigate to `/lists/{id}`.

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

#### Scenario: Failed action result keeps the form mounted

- **WHEN** a submit returns `{ success: false, message }`
- **THEN** the form remains rendered and displays `message`
- **AND** no navigation, `onClose`, or `router.refresh()` occurs

#### Scenario: Invalid date blocks the action

- **WHEN** the date field holds an unparseable value at submit time
- **THEN** the form surfaces a date field error and does NOT invoke `createList` or `updateList`
