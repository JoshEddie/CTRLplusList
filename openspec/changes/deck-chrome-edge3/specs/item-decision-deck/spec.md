## REMOVED Requirements

### Requirement: The deck SHALL surface only fields needing a human and offer no global skip

**Reason**: The Edge 3.0 redesign reverses the hide-satisfied model — the navigational step tracker's value is showing the *whole* journey (what is done, where you are, what remains), so auto-satisfied steps are shown as completed rather than omitted.

**Migration**: Superseded by "The deck SHALL show every applicable step with status and open at the first incomplete step" (below), which preserves the still-valid content rules (which steps apply, the photo single-image bypass, the inline-note-on-flagged-title rule, the no-forward-skip-to-Preview principle, and the not-`aria-live` progress indicator) while reversing visibility and adding backward navigation.

### Requirement: Every deck root screen SHALL take its padding from one shared class

**Reason**: The Edge 3.0 shell rework retires `.deck-body` and the per-screen padding vocabulary it governed. Screens no longer render as padded children of `<FormShell>`; they render inside the deck-owned shell, whose pinned-header/well/footer regions own their padding.

**Migration**: Superseded by the padding clause of "Deck screens SHALL render in a deck-owned shell with pinned-header, scrolling-well, and pinned-footer regions" (below): region padding is declared exactly once, on the `.deck-screen-*` classes in `deck-screen.css`, and no screen re-declares it.

### Requirement: Nested deck surfaces SHALL NOT carry the screen padding class

**Reason**: The screen padding class (`deck-body`) no longer exists; the double-inset hazard it guarded against is gone with it. Surfaces inside the shell's well inherit the well's padding by construction.

**Migration**: Subsumed by the deck-owned-shell requirement's padding clause (below).

## ADDED Requirements

### Requirement: The deck SHALL show every applicable step with status and open at the first incomplete step

After a successful fetch, the modal SHALL render a stepped deck whose **full applicable step set** is computed once at entry (never reshaped as the user edits), in the canonical membership rules below, and SHALL display every applicable step in the step tracker with a per-step status of done or needs-attention. The deck SHALL open at the **first incomplete** step; auto-satisfied steps SHALL render as **done** and remain reachable for backward navigation.

Step membership (which steps apply):
- `photo` SHALL apply when the candidate count is `0` (empty/error) or greater than `1` (a choice); when exactly one image was returned it is auto-selected and the photo step SHALL be marked done rather than omitted.
- `title` and `price` SHALL always apply; a `good`-tier title or price SHALL be marked **done** (not hidden).
- `note` SHALL apply as a standalone step only when the title tier **is** `good`; when the title tier is not `good` the note editor is surfaced inline on the title step and the standalone note step SHALL NOT also appear.

A single `stepBlocked(step, item)` helper SHALL determine whether a step is incomplete/gated, and SHALL be the sole source consumed by both the step's continue affordance and the tracker's forward-navigation gate. The deck SHALL NOT offer any affordance that jumps straight to Preview bypassing incomplete steps — forward movement advances one step at a time (or via the tracker to an already-reached step), and no "Skip — straight to preview" affordance SHALL exist. Ordering SHALL place completed steps ahead of the first incomplete step.

#### Scenario: Auto-satisfied fields appear as done, not hidden

- **WHEN** a fetch returns a `good`-tier title and price with multiple photos
- **THEN** the tracker SHALL show the title and price steps marked done, the photo step as current/incomplete, and the deck SHALL open on the photo step

#### Scenario: Deck opens at the first incomplete step

- **WHEN** a fetch returns a `good` price and single photo but a flagged (long) title
- **THEN** the price and photo steps SHALL be marked done and the deck SHALL open on the title step, with the completed steps ordered ahead of it and reachable by backward navigation

#### Scenario: No affordance skips forward to Preview

- **WHEN** the deck is on any incomplete step
- **THEN** no control SHALL jump directly to Preview past an incomplete step, and forward advance SHALL move one step at a time

#### Scenario: Flagged title surfaces the inline note and drops the standalone note step

- **WHEN** the title tier is not `good`
- **THEN** the note editor SHALL be inline on the title step and no standalone `note` step SHALL appear in the tracker

### Requirement: Deck screens SHALL render in a deck-owned shell with pinned-header, scrolling-well, and pinned-footer regions

Every item-add deck screen SHALL render inside a deck-owned shell (`DeckShell`/`DeckScreen`) — an overlay-wrapped rounded container — rather than as a direct child of `<FormShell>`. Each screen SHALL be composed of three regions: a `flex:none` pinned header, a `flex:1; min-height:0; overflow-y:auto` scrolling well, and a `flex:none` pinned footer, so content past the fold is reachable and the primary action is never off-screen at any viewport. The shell SHALL compose the shared `useDismiss` primitive (per `form-shell-system`), and overlay-self-click SHALL dismiss while descendant clicks SHALL NOT. Preview's `container-type: inline-size` (driving its 520px two-column query) SHALL be preserved. The well content of each screen SHALL be the existing deck field editors/cards re-slotted into the well, not re-implemented.

Region padding SHALL be declared exactly once, on the shared `.deck-screen-*` region classes in `deck-screen.css` (the well and the pinned header/footer own their insets); no deck screen SHALL re-declare that padding on its own screen class, and surfaces rendered inside the well SHALL inherit its inset rather than carry one of their own. This supersedes the retired `.deck-body` shared-padding vocabulary.

#### Scenario: Tall content is reachable at all viewports

- **WHEN** any deck screen's content exceeds the viewport height (e.g. Preview with a long store list, or the title screen on a portrait phone)
- **THEN** the well SHALL scroll to reveal the overflow content, and the footer primary action SHALL remain visible and reachable

#### Scenario: Header and footer stay pinned while the well scrolls

- **WHEN** the user scrolls a deck screen's well
- **THEN** the header and footer SHALL remain fixed in place and only the well SHALL scroll

### Requirement: The deck shell SHALL present Edge 3.0 chrome using the app design system

The deck shell SHALL present no titled shell bar. It SHALL render a floating round close control mirroring the item-card kebab treatment (`.item-owner-actions-kebab`), an uppercase eyebrow carrying the flow name ("Add an item" / editing equivalent), and a per-screen title and optional subtitle pinned in the header. All colors, typography, and interactive controls SHALL use the app design system — `global.css` tokens, the app font stack, and existing components (`<Button variant="primary">` for the primary action, form-field-system inputs, the existing suggested-trim and error-tier renderings) — NOT the mock's raw hex, fonts, or inline-styled elements. A new design token SHALL be introduced only where the app has no existing token for a required role.

#### Scenario: Close control mirrors the item-card kebab

- **WHEN** a deck screen renders its shell chrome
- **THEN** the close control SHALL be a floating round button matching the `.item-owner-actions-kebab` treatment, with `aria-label="Close"`

#### Scenario: Primary action uses the button primitive

- **WHEN** a deck screen renders its footer primary action
- **THEN** it SHALL render through `<Button variant="primary">` rather than a page-scoped styled button, and SHALL NOT hardcode a brand color literal

### Requirement: A navigational step tracker SHALL occupy the footer with done, current, and future states

The footer SHALL contain a step tracker above a full-width primary action; the standalone Back button SHALL NOT be present (backward navigation is the tracker). A node's appearance SHALL be built from app tokens along two orthogonal axes: **colour tracks live validity** — a currently valid step is `var(--success-text)` (green, done); an invalid-but-reachable step is `var(--primary-color)` (purple, current); an unavailable step is `var(--neutral-border-color)` (grey, future) — and **fill tracks navigability** — the step on screen is a hollow outline in its status colour carrying `aria-current="step"`; a step that can be jumped to is a solid disc in its status colour; a locked step is grey and natively `disabled`. Validity SHALL be recomputed live so a step flips green the instant its field becomes valid, without leaving it, and an optional step that is valid from the moment it is reachable (e.g. an empty note within the length limit) SHALL read green rather than purple. Reach SHALL extend up to and including the working step (the first incomplete step), so validating it unlocks the next step as a jump target — the user MAY then either activate the primary action or click that step — while a step the user has skipped past (an un-picked photo, a warn title) SHALL stay reachable behind them, and reach SHALL never land past a `stepBlocked` step. Backward navigation SHALL remain open at any time (step data is preserved). The states SHALL be distinguishable without relying on colour alone (ring weight, fill, and label weight), each node SHALL carry an accessible label, the group SHALL expose an sr-only "Step N of M" reflecting the step on screen, the tracker SHALL NOT be placed in an `aria-live` region, and each node SHALL meet the 44px touch-target floor.

#### Scenario: Clicking a reachable node navigates to that step

- **WHEN** the user activates a reachable (solid) node in the tracker
- **THEN** the deck SHALL navigate to that step with its prior data intact

#### Scenario: Validating the working step flips it green and unlocks the next

- **WHEN** the user makes the working (current, purple) step valid — e.g. enters a required price
- **THEN** that node SHALL flip to done (green) in place and the next step SHALL become a reachable jump target, activatable by either the primary action or a click

#### Scenario: The on-screen step is outlined and locked steps are not navigable

- **WHEN** the current step is gated (e.g. an over-limit item name) and the user attempts to activate a later node
- **THEN** the on-screen step SHALL be the outlined `aria-current` node, that later node SHALL NOT be interactive, and the deck SHALL remain on the current step

#### Scenario: Breaking a completed step caps forward navigation

- **WHEN** the user navigates back to a completed step, edits it into a `stepBlocked` state, and then moves to a still-valid earlier step
- **THEN** the broken step SHALL read current (purple) and no node beyond it SHALL be navigable — the still-valid earlier card SHALL NOT re-open a path past it — until it is brought back into good standing

#### Scenario: States are distinguishable without color

- **WHEN** the tracker renders a current node and a future node
- **THEN** they SHALL differ by more than hue (e.g. fill, ring/label weight), each SHALL carry an accessible label, and the group SHALL expose an sr-only "Step N of M"

### Requirement: Deck screens SHALL collapse to a single scroller below a short viewport height

When the viewport height is below approximately 500px (e.g. a landscape phone), a deck screen SHALL collapse to a single root scroller with a sticky footer, so the header scrolls with content while the footer primary action and the floating close remain reachable.

#### Scenario: Landscape phone keeps the action reachable

- **WHEN** a deck screen renders at a viewport height below ~500px
- **THEN** the screen SHALL scroll as a single region with the footer primary action reachable and the floating close pinned

## MODIFIED Requirements

### Requirement: Manual entry SHALL open a dedicated Fill-manually shell

Manual entry SHALL open a **Fill-manually** screen — not the Preview. The screen SHALL render inside the **deck-owned shell** (the same shell every deck screen uses), carrying the flow-name eyebrow ("Add an item", so the chrome beside the close control does not change under the user mid-flow), an `<h2>` reading "Add the details", and a supporting line reading "Tap a field to fill it in.". It SHALL list every field using the same row unit as the Review shell (photo, item name, note, price, store — each with its current value, its provenance, and its tier status), and activating a row SHALL open that field's Focus editor, or the Stores sheet for the store row.

The Fill-manually screen and the Review screen SHALL be distinct surfaces that share the field-row unit, not one surface parameterized by entry path: they differ in shell title, heading, supporting line, back target, and advance behavior. Neither SHALL re-implement the row.

#### Scenario: Manual entry renders in the deck-owned shell with its own heading

- **WHEN** the user chooses manual entry
- **THEN** the Fill-manually screen SHALL render in the deck-owned shell with the flow-name eyebrow, an `<h2>` "Add the details", and the supporting line "Tap a field to fill it in."

#### Scenario: Activating a field row opens its Focus editor

- **WHEN** the user activates a field row on the Fill-manually screen
- **THEN** that field's Focus editor SHALL open (or the Stores sheet for the store row)

### Requirement: The intro card SHALL summarize what was pulled and what needs the user

The `intro` card SHALL show a heading, a subtitle carrying the fetch attribution ("Auto-filled from {store}" folded into the supporting line, with a store-less fallback) and setting the expectation of a final preview, a confirmed-summary list (photos found, name when its tier is `good`, store + link saved), and a single count line stating how many steps remain — the cards still to come (the photo pick, any flagged field, and an optional note), i.e. the computed step count excluding the intro itself. Its footer SHALL pair a secondary "Change link" affordance returning to the URL entry state (the intro is a pre-step overview outside the tracker, so this back affordance lives here and not on the field cards) with a primary "Let's go" advance to the first remaining card.

When the fetch returned zero images, the summary SHALL surface that gap as a **warning** row ("No photos found — add one") rather than omitting the photos line — the summary that shows what was pulled SHALL NOT stay silent about a missing photo. The severity is `warning`, not `error`: a null image is permitted, matching the Triage photo row's `warn` tier and the missing-price warning.

#### Scenario: Intro reflects confirmed and pending fields

- **WHEN** the deck opens with a clean price, a flagged title, and multiple images
- **THEN** the intro SHALL confirm photos and store, omit the name from the confirmed list, and indicate two remaining steps (the photo pick and the one flagged field)

#### Scenario: Intro flags a zero-image fetch as a warning

- **WHEN** the deck opens from a fetch that returned no images
- **THEN** the intro summary SHALL show a warning row indicating no photos were found, not omit the photos line

#### Scenario: Change link returns to URL entry

- **WHEN** the user activates "Change link" on the intro card
- **THEN** the URL entry state SHALL render, and the field cards themselves SHALL offer no standalone Back (backward navigation there is the tracker)

### Requirement: The edit entry SHALL read as an invitation, not an alarm

The Preview's Triage entry SHALL be labeled "Need to change something?" with a supporting line ("Fix anything that looks wrong") as an accent-variant action row — a white card resting on a `--buy-link-border` seam that lights to a `--buy-link-bg` fill on hover, reusing the buy-link token family with no new color tokens — using an edit affordance rather than a warning flag on a yellow surface. The supporting line SHALL NOT claim system authorship of the item's values ("we got wrong"): Preview is reached by the fetch, manual, and edit routes, and only the first has values the system authored.

#### Scenario: Triage entry is non-alarming

- **WHEN** the Preview is shown
- **THEN** the change-entry SHALL read "Need to change something?" as an accent action row on the buy-link tokens, not "Something's off" on yellow

#### Scenario: The supporting line fits every route

- **WHEN** the Preview is reached from the fetch, manual, or edit route
- **THEN** the Triage entry's supporting line SHALL read "Fix anything that looks wrong", identical across routes
