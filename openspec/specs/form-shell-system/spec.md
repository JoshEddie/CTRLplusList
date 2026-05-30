# form-shell-system Specification

## Purpose
TBD - created by archiving change test-misc-primitives. Update Purpose after archive.
## Requirements
### Requirement: FormShell SHALL render an overlay-wrapped inner container with title, close, and children

The `<FormShell>` primitive at `app/ui/components/FormShell.tsx` SHALL render an outer `<div class="form-shell-overlay">` containing an inner `<div>` whose class composition is one of three exact-string values based on the `variant` prop. Inside the inner div, the shell SHALL render a header `<div class="form-shell-hd">` containing a `<span class="form-shell-title">` (with the `title` prop text) and a close `<button type="button" class="form-shell-close" aria-label="Close">` (containing an `<LuX>` icon); the children prop SHALL render as the inner div's content after the header.

#### Scenario: Overlay and inner wrap the header and children

- **WHEN** `<FormShell title="New list">child</FormShell>` is rendered
- **THEN** an outer element with class `form-shell-overlay` is present
- **AND** inside the overlay, an inner div contains a header (class `form-shell-hd`) followed by the child content
- **AND** the header contains a span (class `form-shell-title`) with text `"New list"`
- **AND** the header contains a button (class `form-shell-close`) with `aria-label="Close"`

#### Scenario: Close button is type=button to avoid form submission

- **WHEN** the close button is queried
- **THEN** its `type` attribute is exactly `"button"`

### Requirement: FormShell variant SHALL select one of three inner class strings

The inner `<div>` class SHALL be one of:
- `'form-shell'` when `variant === 'default'` OR the `variant` prop is omitted (the default).
- `'form-shell form-shell-wide'` when `variant === 'wide'`.
- `'form-shell form-shell-split'` when `variant === 'split'`.

The variant token SHALL be appended after the base `'form-shell'` (fixed order: base first, variant second).

#### Scenario: Default variant emits base class only

- **WHEN** `<FormShell title="t">child</FormShell>` is rendered with no `variant` prop
- **THEN** the inner div's `className` is exactly `"form-shell"`

#### Scenario: Wide variant appends form-shell-wide

- **WHEN** `<FormShell title="t" variant="wide">child</FormShell>` is rendered
- **THEN** the inner div's `className` is exactly `"form-shell form-shell-wide"`

#### Scenario: Split variant appends form-shell-split

- **WHEN** `<FormShell title="t" variant="split">child</FormShell>` is rendered
- **THEN** the inner div's `className` is exactly `"form-shell form-shell-split"`

### Requirement: FormShell overlay-self-click SHALL dismiss, child-click SHALL NOT

The overlay div's `onClick` handler SHALL invoke `dismiss()` IFF the click event's `target === currentTarget` (the click landed on the overlay element itself, not on a bubbled child element). Clicks on any descendant of the inner div SHALL NOT dismiss the shell. This guard prevents accidental dismissal when the user clicks inside the modal form.

#### Scenario: Click on overlay itself dismisses

- **WHEN** the overlay div is clicked directly (such that `event.target === event.currentTarget`)
- **THEN** the dismiss helper is invoked (verified via the `onClose` spy, OR via mocked `useRouter().back()` / `push()` per the useDismiss resolution)

#### Scenario: Click on child does not dismiss

- **WHEN** a descendant element of the inner div is clicked (such that the click bubbles to the overlay but `event.target !== event.currentTarget` at the overlay)
- **THEN** the dismiss helper is NOT invoked
- **AND** `onClose` is NOT called
- **AND** `router.back` / `router.push` (when mocked) are NOT called

#### Scenario: Close button click dismisses

- **WHEN** the close button is clicked
- **THEN** the dismiss helper is invoked

### Requirement: useDismiss SHALL resolve in three branches with onClose preferred over router.back over router.push

The internal `useDismiss(onClose, closeHref)` hook SHALL return a function that, when invoked, resolves dismiss in this priority order:

1. If `onClose` is provided (truthy), invoke `onClose()` and return.
2. Else, if `typeof window !== 'undefined'` AND `window.history.length > 1`, invoke `router.back()` and return.
3. Else, if `closeHref` is provided (truthy), invoke `router.push(closeHref)`.
4. If none of the above conditions fire, the dismiss is a no-op (no error thrown).

The `typeof window !== 'undefined'` guard is required for Next.js SSR safety. The `window.history.length > 1` guard prefers `router.back()` for intercepted-route modals (where the `@modal` parallel slot unmounts on back-navigation); the `closeHref` fallback handles direct-load cases where no history entry exists.

#### Scenario: onClose provided wins over router

- **WHEN** the dismiss helper is invoked with `useDismiss(onCloseSpy, '/somewhere')` and `router` is mocked
- **THEN** `onCloseSpy` is called exactly once
- **AND** `router.back` is NOT called
- **AND** `router.push` is NOT called

#### Scenario: No onClose and history available calls router.back

- **WHEN** `window.history.length > 1` AND no `onClose` is provided
- **AND** the dismiss helper is invoked
- **THEN** `router.back` is called exactly once
- **AND** `router.push` is NOT called

#### Scenario: No onClose, no history, closeHref provided calls router.push

- **WHEN** `window.history.length === 1` AND no `onClose` is provided AND `closeHref='/lists'`
- **AND** the dismiss helper is invoked
- **THEN** `router.push` is called exactly once with the argument `'/lists'`
- **AND** `router.back` is NOT called

#### Scenario: No onClose, no history, no closeHref is a no-op

- **WHEN** `window.history.length === 1` AND no `onClose` is provided AND no `closeHref` is provided
- **AND** the dismiss helper is invoked
- **THEN** `router.back` is NOT called
- **AND** `router.push` is NOT called
- **AND** no error is thrown

### Requirement: FormShellFooter SHALL render Cancel, optional deleteSlot, and Submit

The `<FormShellFooter>` companion SHALL render a `<div class="form-shell-ft">` containing, in DOM order:

1. A Cancel button rendered through `<Button variant="ghost">` with accessible name `"Cancel"`. Clicking Cancel SHALL invoke `useDismiss(onCancel, cancelHref)`'s resolution (independent of the shell's dismiss).
2. A right-aligned wrapper `<div class="form-shell-ft-right">` containing:
   - The `deleteSlot` ReactNode (when provided; otherwise nothing renders in its position).
   - A Submit button rendered through `<Button type="submit" variant="primary">` with the `submitLabel` prop as its accessible name. The Submit button SHALL receive `isLoading={isPending}` so the loading affordance from `button-system` surfaces while a transition is pending.

#### Scenario: Footer renders Cancel with ghost variant

- **WHEN** `<FormShellFooter submitLabel="Save" />` is rendered
- **THEN** a Cancel button is present, rendered through `<Button variant="ghost">`
- **AND** its accessible name is `"Cancel"`

#### Scenario: Footer Cancel click resolves independently from shell

- **WHEN** the Cancel button is clicked with `onCancel={cancelSpy}` provided
- **THEN** `cancelSpy` is called exactly once
- **AND** the shell's `onClose` spy (when provided to the parent `<FormShell>`) is NOT called

#### Scenario: Footer Submit is type=submit and variant=primary

- **WHEN** `<FormShellFooter submitLabel="Save" />` is rendered
- **THEN** the Submit button's `type` attribute is `"submit"`
- **AND** it is rendered through `<Button variant="primary">`
- **AND** its accessible name is `"Save"`

#### Scenario: Footer Submit isLoading mirrors isPending

- **WHEN** `<FormShellFooter submitLabel="Save" isPending={true} />` is rendered
- **THEN** the Submit button's `<Button>` receives `isLoading={true}` (surfacing whatever loading affordance `button-system` provides)

#### Scenario: Footer Submit isLoading false when isPending is false or undefined

- **WHEN** `<FormShellFooter submitLabel="Save" isPending={false} />` OR `<FormShellFooter submitLabel="Save" />` is rendered
- **THEN** the Submit button's `<Button>` receives `isLoading={false}` or `isLoading={undefined}`

#### Scenario: Footer deleteSlot renders between Cancel and Submit

- **WHEN** `<FormShellFooter submitLabel="Save" deleteSlot={<button data-testid="del">Delete</button>} />` is rendered
- **THEN** the DOM order inside the footer is Cancel button → form-shell-ft-right wrapper containing the delete element → Submit button
- **AND** the `data-testid="del"` element is a child of the `form-shell-ft-right` wrapper

#### Scenario: Footer with no deleteSlot renders only Cancel and Submit

- **WHEN** `<FormShellFooter submitLabel="Save" />` is rendered without a `deleteSlot` prop
- **THEN** the only buttons inside the footer are Cancel and Submit
- **AND** no element is rendered in the deleteSlot position inside the right wrapper

