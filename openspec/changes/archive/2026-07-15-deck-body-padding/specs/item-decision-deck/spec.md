## ADDED Requirements

### Requirement: Every deck root screen SHALL take its padding from one shared class

Padding for the region below the `<FormShell>` chrome SHALL be declared exactly once, as `.deck-body { padding: 8px 24px 24px; }` in `deck.css`, and SHALL be applied by adding `deck-body` to the root element's class list. No deck screen SHALL declare that padding on its own screen class.

The members SHALL be the root elements `ItemFormContainer.body()` returns whose padding is the shared value: `.deck` (the guided card deck and the URL-entry step), `.deck-triage`, `.deck-focus`, `.deck-sheet`, and `.deck-failure`.

`deck-body` SHALL also confer the deck's shared column layout (`display: flex; flex-direction: column; gap: 16px`), so that membership of that layout is declared once rather than re-listed per screen class. The remaining members of the shared layout rule SHALL be exactly the surfaces that do not carry `deck-body`: `.deck-card`, `.deck-preview`, `.deck-stores`, and `.deck-lists`. Screen classes left without any declaration of their own (`.deck`, `.deck-triage`, `.deck-focus`, `.deck-sheet`) SHALL remain in the markup as screen markers; their absence from `deck.css` is correct, not an omission.

Two roots keep independent values and SHALL NOT carry `deck-body`: `.deck-preview` (`18px 24px`, whose rule also carries `container-type: inline-size`) and `.prefill-fetching-step` (`32px 24px 0`, owned by `product-link-prefill`).

Padding SHALL NOT be moved into `<FormShell>`: `form-shell-system` fixes the shell's DOM, rendering children directly after `form-shell-hd` with no body wrapper, and that capability owns any change to it.

#### Scenario: Triage renders with screen padding

- **WHEN** the Review-anything screen renders
- **THEN** its root element carries `deck-body` and its content is inset from the modal edges rather than flush

#### Scenario: The focus editor behind a triage row renders with screen padding

- **WHEN** a triage row is tapped and the focus editor for that field renders
- **THEN** its root element carries `deck-body` and its content is inset from the modal edges

#### Scenario: The stores and lists sheets render with screen padding

- **WHEN** the Stores sheet or the Lists/quantity sheet opens
- **THEN** the sheet wrapper carries `deck-body` and its content is inset from the modal edges

#### Scenario: The shared value has exactly one home

- **WHEN** `deck.css` is grepped for the shared padding value
- **THEN** `8px 24px 24px` appears only in the `.deck-body` rule, and neither `.deck` nor `.deck-failure` declares padding of its own

#### Scenario: The shared column layout is declared once

- **WHEN** `deck.css`'s shared `display: flex; flex-direction: column; gap: 16px` rule is read
- **THEN** its members are `.deck-body` and the four surfaces that do not carry `deck-body` — `.deck-card`, `.deck-preview`, `.deck-stores`, `.deck-lists` — and no screen class that carries `deck-body` is listed a second time

#### Scenario: Screens with deliberate values are unaffected

- **WHEN** the Preview screen or the fetching screen renders
- **THEN** neither root carries `deck-body`, Preview retains `18px 24px` and its `container-type: inline-size`, and the fetching step retains `32px 24px 0`

### Requirement: Nested deck surfaces SHALL NOT carry the screen padding class

Surfaces rendered inside a padded root SHALL inherit that root's padding and SHALL NOT carry `deck-body`, which would inset them twice. This applies at least to `.deck-card` (inside `.deck`) and to `.deck-stores` and `.deck-lists` (inside `.deck-sheet`). The absence of a padding rule on these classes is correct, not an omission.

#### Scenario: A card inside the guided deck is padded once

- **WHEN** any step card of the guided deck renders inside `.deck`
- **THEN** `.deck-card` does not carry `deck-body`, and the card's inset comes solely from its `.deck` root

#### Scenario: A sheet's body is padded once

- **WHEN** `.deck-stores` or `.deck-lists` renders inside the `.deck-sheet` wrapper
- **THEN** it does not carry `deck-body`, and its inset comes solely from the wrapper
