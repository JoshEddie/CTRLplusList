## ADDED Requirements

### Requirement: Menu popover flips upward when it would overflow the bottom viewport edge

The `<Menu>` popover SHALL open below its trigger by default. On open, the menu SHALL measure whether its rendered height fits in the viewport space below the trigger; when it does not fit below and the space above the trigger can contain it, the menu SHALL open upward instead (anchored above the trigger with the same 6px gap), applied before first paint so no downward-positioned frame is visible. The flip decision is computed once per open. The existing `max-height: 80vh; overflow-y: auto` behavior SHALL be retained for the case where the menu fits on neither side. Flipping SHALL NOT alter the dismiss (Escape / outside click), open-focus, or keyboard-navigation contracts.

#### Scenario: Menu fits below the trigger

- **WHEN** the menu opens and the viewport space below the trigger is at least the menu's rendered height plus the gap
- **THEN** the menu opens below the trigger (default placement, no upward modifier applied)

#### Scenario: Menu would overflow the bottom viewport edge

- **WHEN** the menu opens with the trigger near the bottom of the viewport, such that the menu's rendered height does not fit below but does fit above
- **THEN** the menu opens upward, anchored above the trigger, and is fully within the viewport

#### Scenario: Menu fits on neither side

- **WHEN** the menu opens in a viewport where neither the space below nor above the trigger can contain the menu's full height
- **THEN** the menu remains bounded by `max-height: 80vh` and scrolls internally via `overflow-y: auto`

#### Scenario: Flipped menu keeps the dismiss and focus contracts

- **WHEN** the menu opens upward and the user presses Escape or clicks outside
- **THEN** `onClose` is called exactly as in the downward placement, and on open the first non-disabled item received focus with `{ preventScroll: true }`
