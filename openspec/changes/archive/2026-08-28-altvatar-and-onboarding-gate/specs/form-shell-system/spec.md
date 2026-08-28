## MODIFIED Requirements

### Requirement: FormShell SHALL render an overlay-wrapped inner container with title, close, and children

The `<FormShell>` primitive at `app/ui/components/FormShell.tsx` SHALL render an outer `<div class="form-shell-overlay">` containing an inner `<div>` whose class composition the variant requirement below governs. Inside the inner div, the shell SHALL render a header `<div class="form-shell-hd">` containing a `<span class="form-shell-title">` (with the `title` prop text) and the shared `<CloseButton>`, which renders `<button type="button" class="close-button close-button--in-flow" aria-label="Close">` (containing an `<LuX>` icon); the children prop SHALL render as the inner div's content after the header.

The shell SHALL also accept a `header` node in place of that title bar, for a consumer whose header carries something other than a title. Where one is supplied the shell SHALL render it instead of `form-shell-hd`, and SHALL render neither `form-shell-title` nor a close button of its own — a header given here owns its own close affordance, because the shell cannot know where in someone else's chrome the control belongs. `title` is therefore optional, and a consumer SHALL supply exactly one of the two. The shell offers this rather than growing a slot per header part: the alternative is one prop per element the consumer might want to move, each with a default the shell has to keep rendering.

#### Scenario: Overlay and inner wrap the header and children

- **WHEN** `<FormShell title="New list">child</FormShell>` is rendered
- **THEN** an outer element with class `form-shell-overlay` is present
- **AND** inside the overlay, an inner div contains a header (class `form-shell-hd`) followed by the child content
- **AND** the header contains a span (class `form-shell-title`) with text `"New list"`
- **AND** the header contains a button (class `close-button`) with `aria-label="Close"`

#### Scenario: Close button is type=button to avoid form submission

- **WHEN** the close button is queried
- **THEN** its `type` attribute is exactly `"button"`

#### Scenario: A supplied header replaces the shell's title bar

- **WHEN** a `header` node is supplied to the shell
- **THEN** that node renders inside the inner div ahead of the children
- **AND** no `form-shell-hd`, no `form-shell-title` and no close button of the shell's own is rendered

### Requirement: FormShell overlay-self-click SHALL dismiss, child-click SHALL NOT

The overlay div's `onClick` handler SHALL invoke `dismiss()` IFF the click event's `target === currentTarget` (the click landed on the overlay element itself, not on a bubbled child element). Clicks on any descendant of the inner div SHALL NOT dismiss the shell. This guard prevents accidental dismissal when the user clicks inside the modal form.

A surface that must offer no route out SHALL NOT be built by suppressing this shell's dismissal. `FormShell` is the shell for a form the viewer may leave; a blocking surface renders its own, because the two share no behaviour once every exit is removed.

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
