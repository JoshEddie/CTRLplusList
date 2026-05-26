# items-price-filter Specification

## Purpose

The `items-price-filter` capability SHALL govern the behavior of the price-range filter popover in the items toolbar — specifically when Min/Max edits commit to the URL (`price_min` / `price_max`), how an inverted pair (`max < min`) is communicated to the user, and how the popover panel's Clear/Done footer behaves. It SHALL apply wherever `PriceFilterPopover` mounts (today: inside `ItemsToolbar` on every page that renders `ItemsBrowser`).

This capability SHALL NOT govern: the layout of the items toolbar row (owned by `items-browser-chrome`), the trigger button surface (owned by `popover-trigger-system`), the `PriceField` input chrome / `FieldError` error-display contract (owned by `form-field-system`), or the behavior of other filter popovers such as `StoreFilterPopover`. A behavior listed in those primitive/sibling capabilities remains binding under their spec; this capability composes them.

## Requirements

### Requirement: Price filter popover commits edits via trailing-edge debounce, not an Apply button

The `PriceFilterPopover` component SHALL commit local Min/Max edits to the URL (`price_min` / `price_max` search params) via a trailing-edge debounce of 400ms after the last keystroke in either input, mirroring the search-field debounce pattern at [ItemsToolbar.tsx:72-98](app/(main)/items/ui/components/ItemsToolbar.tsx). The component SHALL NOT render an explicit Apply button. Every keystroke restarts the timer; the commit fires exactly once when the user stops typing for at least 400ms. The commit SHALL be performed by calling the `onApply(min, max)` prop passed down from `ItemsToolbar`; this prop's signature and the URL parameter names SHALL NOT change.

The component MAY (and per the design SHOULD) flush any pending debounce timer immediately when the popover closes through any path (the Done button, outside click, Escape, or `usePopoverDismiss`), provided the local state passes the validity check defined by the "max < min surfaces an inline error" requirement below. If the local state is invalid at close time, the pending edit SHALL be discarded silently rather than committed.

#### Scenario: Fast typing commits exactly once

- **WHEN** the user types `19999` into the Max input within 400ms of total elapsed time
- **THEN** `onApply` is called exactly once, with `max="19999"`, approximately 400ms after the final keystroke — not five times during typing

#### Scenario: Pause longer than debounce commits intermediate value

- **WHEN** the user types `1` into the Max input, pauses for more than 400ms, then continues typing `9999`
- **THEN** `onApply` is called once with `max="1"` after the first pause, then again with `max="19999"` after the user stops typing

#### Scenario: Apply button is not rendered

- **WHEN** the `PriceFilterPopover` panel is open
- **THEN** the rendered footer contains a Clear button and a Done button only — no element labeled "Apply" exists in the panel

#### Scenario: Done button does not commit, it only closes

- **WHEN** the user clicks the Done button while the local Min/Max differ from the URL values and no debounce timer has fired yet
- **THEN** the popover closes; if local state is valid the pending edit is flushed and `onApply` is called once; if local state is invalid the edit is discarded silently and `onApply` is not called

### Requirement: An inverted Min/Max pair surfaces an inline FieldError under the most-recently-edited input and suppresses URL commit

When the debounce timer fires (or a close-time flush is attempted) and both Min and Max are non-empty with `max < min` (equivalently `min > max` — strict inversion; equal values are valid), the `PriceFilterPopover` SHALL render a `<FieldError>` via the `error` prop on `<PriceField>` under exactly one of the two inputs — whichever input the user most recently edited via keystroke / paste in the popover — and SHALL NOT call `onApply`. The error MUST flow through the existing `<PriceField error="...">` plumbing governed by `form-field-system` — it MUST NOT use a tooltip, popover, role=alert, or any hover/focus-gated UI to convey the error, and MUST NOT introduce a panel-level error banner. The error MUST NOT be attached to both inputs simultaneously.

The error copy MUST identify the offending field directly:

- When the error is attached to the Min input (because the user just raised Min above Max), the copy MUST identify Min as the offender (e.g., "Min must be at most Max").
- When the error is attached to the Max input (because the user just lowered Max below Min), the copy MUST identify Max as the offender (e.g., "Max must be at least Min").

The error timing SHALL be asymmetric: it SHALL first appear only when the debounce timer fires on an inverted pair — NOT on the keystroke that produced the inversion. This prevents transient mid-typing inversions (e.g., the user typing `5` toward an intended `500` while Min=`100`) from flashing an error message between keystrokes. Once the error is rendered, however, the validity check SHALL re-evaluate on every subsequent keystroke (not only on debounce fire), and the error SHALL be cleared the moment the pair becomes valid or either field is cleared. After the error has been cleared live, surfacing it again SHALL require another debounce fire (so re-breaking the pair starts the "wait for typing to stop" gate fresh).

The error SHALL also move to the other input if the user subsequently edits that other input in a way that keeps the pair inverted (e.g., the error is showing under Max because the user typed `max=50` with `min=100`; the user then raises Min to `200` — the pair is still inverted but the active field is now Min, so the error attaches to Min instead). The next debounce fire after the pair becomes valid SHALL commit the values to the URL as normal.

#### Scenario: User lowers Max below existing Min — error appears under Max

- **WHEN** the user has Min=`100` already entered, types `50` into Max, and the debounce timer fires
- **THEN** a `<FieldError>` is rendered under the Max input with copy identifying Max as the offending field (e.g., "Max must be at least Min"); no error is rendered under the Min input; the URL `price_min` and `price_max` params are not modified; `onApply` is not called

#### Scenario: Error does not appear during typing — only after debounce fires

- **WHEN** the user has Min=`100` already entered and is mid-typing into Max (any sequence of keystrokes whose post-keystroke state is inverted), with less than DEBOUNCE_MS elapsed since the last keystroke
- **THEN** no `<FieldError>` is rendered under either input; the URL is not modified — the error remains suppressed until the user stops typing for at least DEBOUNCE_MS

#### Scenario: Re-breaking the pair after a live-clear requires a fresh debounce fire

- **WHEN** the error was previously surfaced and then cleared by the user fixing the pair (e.g., Min=`100`/Max=`50` → error shown → Max raised to `500` → error cleared live), and the user then re-breaks the pair (e.g., lowers Max back to `50`)
- **THEN** the error does NOT re-appear on the keystroke that re-breaks the pair; it re-appears only after the user stops typing for at least DEBOUNCE_MS and the debounce timer fires on the new inverted pair

#### Scenario: User raises Min above existing Max — error appears under Min

- **WHEN** the user has Max=`50` already entered, types `100` into Min, and the debounce timer fires
- **THEN** a `<FieldError>` is rendered under the Min input with copy identifying Min as the offending field (e.g., "Min must be at most Max"); no error is rendered under the Max input; the URL `price_min` and `price_max` params are not modified; `onApply` is not called

#### Scenario: Error moves to the other input on subsequent edit

- **WHEN** an error is currently displayed under Max (because the user just typed Max=`50` with Min=`100` already there) and the user subsequently edits Min to be `200` (pair is still inverted)
- **THEN** the error moves: it is now rendered under the Min input with copy identifying Min as the offender, and no error is rendered under the Max input

#### Scenario: Equal Min and Max is valid

- **WHEN** the user has typed `min=20` and `max=20` and the debounce timer fires
- **THEN** no error is rendered under either input, and `onApply` is called with `min="20"`, `max="20"`

#### Scenario: Either field empty hides the error

- **WHEN** an error is currently displayed (because Min=`100`, Max=`50`) and the user clears the Max input to be empty
- **THEN** the error is removed on the keystroke that emptied the field, without waiting for the next debounce fire; the next debounce fire commits only the non-empty bound

#### Scenario: Error clears the moment the pair becomes valid

- **WHEN** an error is currently displayed (because Min=`100`, Max=`50`) and the user continues typing into the Max field so it becomes `500`
- **THEN** the error is removed on the keystroke that made the pair valid; a debounce timer then fires 400ms after that final keystroke and commits `min="100"`, `max="500"`

#### Scenario: Error display flows through the FieldError primitive

- **WHEN** the popover is in an error state with the error attached to either input
- **THEN** the rendered DOM contains a `<p class="field_error">` element associated to that input via `aria-describedby` per form-field-system; no tooltip wrapper, popover, or `role="alert"` element is used to render the error

### Requirement: Invalid local state is never committed to the URL

The `PriceFilterPopover` SHALL never call `onApply` with a Min/Max pair where `max < min`. This holds for all commit paths — debounce fire, popover dismiss via `usePopoverDismiss`, Done click, outside click, Escape — so the URL `price_min` / `price_max` params, the active-filter chip below the toolbar, and the items grid result always reflect a valid (or empty) bound pair.

If the user opens the popover while a valid filter is already applied (e.g., URL has `price_min=10&price_max=50`), edits one bound into an invalid state, and then closes the popover without fixing it, the URL SHALL retain `price_min=10&price_max=50` unchanged.

#### Scenario: Closing the popover while invalid preserves the prior valid URL state

- **WHEN** the URL has `?price_min=10&price_max=50`, the user opens the popover, changes Max to `5` (now invalid), and then closes the popover via any path
- **THEN** the URL still has `?price_min=10&price_max=50`; `onApply` was not called with the invalid pair; the active-filter chip below the toolbar still reads `$10–$50`

#### Scenario: Reopening the popover after invalid-and-close starts from URL values

- **WHEN** the popover was closed while invalid (per the preceding scenario) and the user reopens it
- **THEN** the Min input reads `10` and the Max input reads `50` (sourced from the URL); no error is shown; local state has been freshly initialized from props

### Requirement: External URL changes while the popover is open do not stomp in-progress edits

The `PriceFilterPopover` SHALL handle the case where its `min` / `max` props change while the popover is open (e.g., a Clear-all action elsewhere in the toolbar) by remounting the inner panel keyed on the incoming prop values, so the local edit state resets to the new props rather than silently overriding them via a sync effect. This preserves the behavior of the existing `key={\`${min}|${max}\`}` pattern at [PriceFilterPopover.tsx:134](app/(main)/items/ui/components/PriceFilterPopover.tsx).

#### Scenario: External clear-all resets open popover panel

- **WHEN** the popover is open with local edits in progress and an external action (outside the popover) updates the URL such that `price_min` and `price_max` are both removed
- **THEN** the inner panel remounts; the Min and Max inputs both render as empty; any in-progress error is cleared

### Requirement: Footer matches the Store filter popover (Clear + primary Done)

The `PriceFilterPopover` footer SHALL render exactly two buttons in the same shape as `StoreFilterPopover` ([StoreFilterPopover.tsx:83-95](app/(main)/items/ui/components/StoreFilterPopover.tsx)): a ghost Clear button on the left and a primary Done button on the right. The Clear button SHALL clear both Min and Max in local state and SHALL call the `onClear` prop. The Done button SHALL close the popover and nothing more; it MUST NOT carry its own commit logic, since commits already flow through the debounce path and the close-time flush.

The Clear button SHALL be disabled when there is nothing to clear — both the prop `min`/`max` are empty AND the local in-progress Min/Max are empty.

#### Scenario: Footer renders Clear and Done in the expected shape

- **WHEN** the price popover panel is open
- **THEN** the footer contains exactly two buttons: a ghost-variant Clear button on the left and a primary-variant Done button on the right; no other footer buttons exist

#### Scenario: Clear empties local state and clears the URL filter

- **WHEN** the user clicks Clear while a filter is applied
- **THEN** the local Min and Max inputs become empty, `onClear` is called, and the URL `price_min` / `price_max` params are removed

#### Scenario: Done closes the popover without altering URL state beyond a flush

- **WHEN** the user clicks Done while local state matches the URL state (no pending edit)
- **THEN** the popover closes; no URL change occurs; `onApply` is not called
