## MODIFIED Requirements

### Requirement: Each facet SHALL expose exactly one affordance per breakpoint

Stores and Price each SHALL render two affordances — the popover trigger that floats its panel in the desktop toolbar, and the sheet's row that drills into that facet — with exactly one of them `display: none` at any viewport. Because the hidden one is `display: none`, it SHALL be absent from the accessibility tree and the tab order, so only one instance of each facet's control is ever operable. The choice between them SHALL be made by CSS media query alone; no viewport or device detection in JavaScript.

There is no Claims facet in the sheet: claim visibility is adjusted from the list hero's Spoilers tile (`list-hero-header`) and, on the library, from the toggle beside the search field (`items-library-shell`) — neither of which is a toolbar filter facet.

#### Scenario: Only one store affordance is operable

- **WHEN** the viewport is at or below the sheet breakpoint
- **THEN** the sheet's Stores row is operable and the store popover trigger is `display: none`, and above the breakpoint the reverse holds

#### Scenario: The drilled state is unreachable from the desktop toolbar

- **WHEN** the viewport is above the sheet breakpoint
- **THEN** no affordance that sets the sheet's facet level is operable

### Requirement: The action bar SHALL be invariant across levels

The sheet SHALL render one action bar — Clear all and Done — identically at both levels, so neither control changes meaning as the user navigates. Done SHALL close the sheet. Clear all SHALL reset every filter the toolbar owns (sort, show, stores, price) in a single URL update and SHALL be disabled when no filter is active. Facet panels rendered inside the sheet SHALL NOT render their own Clear or Done; those remain on the popover surfaces the panels serve at desktop widths.

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
