## ADDED Requirements

### Requirement: `VisibilityPicker` SHALL apply visibility optimistically and roll back on failure

When the list owner selects a visibility row, `VisibilityPicker` SHALL advance its local trigger state to the selected value immediately (optimistic update), close the menu, and invoke `setListVisibility(listId, next)` inside a React transition. The optimistic update guarantees the trigger pill never displays a visibility the owner did not just choose while the request is in flight.

On a **failed** result (`{ success: false }`), the picker SHALL roll the trigger state back to the value it held before the selection and surface `toast.error(result.message)`. It SHALL NOT call `router.refresh()` on the failure path — a failed change leaves the persisted visibility unchanged, so the on-screen pill SHALL be restored to match, never left showing the un-applied value.

On a **successful** result (`{ success: true }`), the picker SHALL surface the selected row's success toast (`rowFor(next).toast` — e.g. "Shared — your followers can now find it" for the Shared row) and call `router.refresh()` to revalidate the page against the new visibility.

While a change is pending, the menu rows SHALL be disabled so a second selection cannot race the in-flight transition. (Re-selecting the row whose value already matches the current visibility is a no-op, owned by the existing three-item-radio-menu requirement; this requirement governs only the apply/rollback path for an actual change.)

#### Scenario: Successful apply keeps the optimistic value and refreshes

- **WHEN** the owner selects a different visibility row and `setListVisibility` returns `{ success: true }`
- **THEN** `setListVisibility(listId, next)` is invoked with the selected row's value
- **AND** the trigger pill shows the selected row's label
- **AND** the selected row's success toast is shown and `router.refresh()` is called

#### Scenario: Failed apply rolls the pill back and toasts the error

- **WHEN** the owner selects a different visibility row and `setListVisibility` returns `{ success: false, message }`
- **THEN** the trigger pill is restored to the visibility it showed before the selection
- **AND** `toast.error(message)` is shown
- **AND** `router.refresh()` is NOT called

#### Scenario: A pending change disables the menu rows

- **WHEN** a visibility change is in flight (the transition has not resolved)
- **THEN** the menu rows are disabled
