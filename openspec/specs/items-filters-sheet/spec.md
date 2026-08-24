# items-filters-sheet Specification

## Purpose

The `items-filters-sheet` capability SHALL govern how the items toolbar's filter controls behave when they collapse into the mobile bottom sheet — specifically that the sheet presents one level at a time (the filter list, or a single facet's panel), how its header and action bar compose at each level, how a facet is entered and left, and how the sheet contains scroll while it is open. It SHALL apply wherever `FiltersSheet` mounts (today: inside `ItemsToolbar` on every page that renders `ItemsBrowser`).

This capability SHALL NOT govern: the toolbar row layout or the breakpoint at which the sheet replaces the inline controls (owned by `items-browser-chrome`), the contents and commit behavior of the store and price panels themselves (owned by `store-filter` and `items-price-filter`), the trigger surface used for the facet rows (owned by `popover-trigger-system`), the `Button` primitive in its chrome (owned by `button-system`), or the translation of filter changes into URL search params (owned by `items-browser-chrome`). A behavior listed in those primitive/sibling capabilities remains binding under their spec; this capability composes them.

## Requirements

### Requirement: The sheet SHALL present one level at a time

The sheet SHALL be a two-level surface: a root level listing the filter controls, and a facet level showing exactly one facet's panel. Entering a facet SHALL replace the root level rather than expanding a panel within it, so the sheet's content height does not grow under the user's finger and no facet panel nests inside another scroll container. A facet's panel SHALL be rendered only while that facet is active. The sheet SHALL expose its current level so presentation can follow it.

#### Scenario: Entering a facet replaces the root level

- **WHEN** the user taps the Stores row at the root level
- **THEN** the store panel is rendered, the root filter rows are no longer visible, and the sheet's own height is unchanged

#### Scenario: Only the active facet's panel is rendered

- **WHEN** the sheet is at its root level
- **THEN** neither the store panel nor the price panel is rendered

#### Scenario: Reopening the sheet starts at the root level

- **GIVEN** the user drilled into a facet and then closed the sheet
- **WHEN** the user reopens it
- **THEN** the sheet shows the root level, not the facet it last displayed

### Requirement: Each facet SHALL expose exactly one affordance per breakpoint

Stores and Price each SHALL render two affordances — the popover trigger that floats its panel in the desktop toolbar, and the sheet's row that drills into that facet — with exactly one of them `display: none` at any viewport. Because the hidden one is `display: none`, it SHALL be absent from the accessibility tree and the tab order, so only one instance of each facet's control is ever operable. The choice between them SHALL be made by CSS media query alone; no viewport or device detection in JavaScript.

#### Scenario: Only one store affordance is operable

- **WHEN** the viewport is at or below the sheet breakpoint
- **THEN** the sheet's Stores row is operable and the store popover trigger is `display: none`, and above the breakpoint the reverse holds

#### Scenario: The drilled state is unreachable from the desktop toolbar

- **WHEN** the viewport is above the sheet breakpoint
- **THEN** no affordance that sets the sheet's facet level is operable

### Requirement: The header SHALL carry the level and the back affordance

The sheet header SHALL render the current level's title — "Filters" at the root level, the facet's name at a facet level — and this title SHALL also be the sheet's accessible name. A back affordance SHALL be rendered only at a facet level and SHALL return the sheet to the root level; the title and its arrow SHALL be one target, sized to the WCAG 2.5.5 44px floor, with a hover affordance. Its accessible name SHALL name its destination rather than the title it displays. The header SHALL carry no close affordance of its own: Done in the action bar closes the sheet from either level, so a second control that also means "close" would only compete with it.

#### Scenario: Header reflects the facet level

- **WHEN** the user drills into Price
- **THEN** the header title and the sheet's accessible name are "Price", and a back affordance is present

#### Scenario: Root level has no back affordance

- **WHEN** the sheet is at its root level
- **THEN** no back affordance is rendered

#### Scenario: A facet level offers back, not close

- **WHEN** the user drills into a facet
- **THEN** the header renders the back affordance and no close affordance

### Requirement: The action bar SHALL be invariant across levels

The sheet SHALL render one action bar — Clear all and Done — identically at both levels, so neither control changes meaning as the user navigates. Done SHALL close the sheet. Clear all SHALL reset every filter the toolbar owns (sort, purchases/show, stores, price) in a single URL update and SHALL be disabled when no filter is active. Facet panels rendered inside the sheet SHALL NOT render their own Clear or Done; those remain on the popover surfaces the panels serve at desktop widths.

#### Scenario: Clear all resets every facet

- **WHEN** the user activates Clear all with a sort, a store, and a price bound applied
- **THEN** all filter params are removed in one URL update, including from inside a facet panel

#### Scenario: Clear all is disabled when nothing is applied

- **WHEN** no non-default filter is active
- **THEN** Clear all is disabled

#### Scenario: Done closes from inside a facet

- **WHEN** the user drills into a facet and activates Done
- **THEN** the sheet closes without first returning to the root level

#### Scenario: A facet panel in the sheet carries no footer

- **WHEN** the user drills into Stores
- **THEN** the panel renders no Clear or Done of its own; the sheet's action bar is the only one

### Requirement: Leaving a facet SHALL commit its pending edits

Every path out of a facet panel — back, Done, close, Escape, scrim, and unmounting the sheet — SHALL commit a pending debounced edit exactly as dismissing the equivalent desktop popover does, and SHALL discard it when invalid. Clear all SHALL additionally discard any uncommitted edit in the active panel, so a value typed but not yet committed cannot survive the clear and apply itself afterwards.

#### Scenario: Back commits a price typed but not yet debounced

- **WHEN** the user types a Min bound and activates back before the debounce fires
- **THEN** the bound is committed to the URL

#### Scenario: Clear all discards an uncommitted price

- **WHEN** the user types a Min bound and activates Clear all before the debounce fires
- **THEN** no price is committed, then or after the debounce interval elapses

### Requirement: The sheet SHALL contain scroll while it is open

While the sheet is open, scrolling SHALL NOT chain out of it: the sheet SHALL set `overscroll-behavior: contain`, and the document behind it SHALL be locked so background content does not scroll under the scrim. The lock SHALL preserve the document's scroll position, and SHALL be released when the sheet closes.

#### Scenario: Background does not scroll under an open sheet

- **WHEN** the sheet is open and the user scrolls over it or over the scrim
- **THEN** the document behind the sheet does not scroll

#### Scenario: Scroll position survives the sheet

- **WHEN** the user opens the sheet partway down a list and then closes it
- **THEN** the page is still at the same scroll position

### Requirement: Focus SHALL follow the level

Entering a facet SHALL move focus to that facet's panel container rather than to an input inside it, so a soft keyboard does not open and shrink the sheet on entry. Returning to the root level SHALL restore focus to the row that was used to enter the facet, and closing the sheet SHALL restore focus to the toolbar's filters trigger.

#### Scenario: Entering a facet does not open the keyboard

- **WHEN** the user drills into Stores
- **THEN** focus is on the panel container and no text input is focused

#### Scenario: Focus returns to the originating row

- **WHEN** the user returns to the root level from a facet
- **THEN** focus is on the row that opened that facet

#### Scenario: Focus returns to the trigger on close

- **WHEN** the sheet closes
- **THEN** focus is on the toolbar's filters trigger
