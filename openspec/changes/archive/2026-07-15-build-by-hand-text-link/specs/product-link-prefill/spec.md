# Delta: product-link-prefill

## MODIFIED Requirements

### Requirement: A failed or timed-out fetch SHALL fall through to the kind-aware failure screen

When the fetch fails, times out, or returns no usable product data, the modal SHALL transition to the **failure screen** (content and actions owned by `item-decision-deck`), passing the failure *kind* so the screen can label the cause honestly: a `timeout` result (the app-side abort budget was exceeded) SHALL route as the **timeout** kind, and a `fetch_failed` result (no usable product returned) SHALL route as the **failed** kind. A network/transport error with no result SHALL route as the **failed** kind. "Fill in details manually →" (available for every kind; treatment owned by `item-decision-deck`) SHALL open the blank Preview with the pasted URL seeded into the first store row's Link field. The failure SHALL never surface fabricated or partial-garbage data as if fetched.

Rate limiting is the exception: a 429 / `rate_limited` response SHALL return the user to the URL entry state (pasted URL retained) with a friendly field-level error ("You've hit the fetch limit — try again in about a minute.") — retry-in-a-minute is the remedy, and it SHALL NOT route to the failure screen.

#### Scenario: Timeout routes as the timeout kind

- **WHEN** a fetch exceeds the app-side timeout
- **THEN** the failure screen SHALL render as the timeout kind (retry re-fetches the same link) and SHALL NOT auto-render a populated form

#### Scenario: Fetch failure routes as the failed kind

- **WHEN** the endpoint returns a `fetch_failed` result, or the request errors with no result
- **THEN** the failure screen SHALL render as the failed kind (copy that does not blame the link), and SHALL NOT auto-render a populated form

#### Scenario: Manual entry from the failure screen opens a blank Preview with the URL

- **WHEN** the user activates "Fill in details manually →" on the failure screen
- **THEN** a blank Preview SHALL open with the pasted URL seeded into the first store row's Link field

#### Scenario: Rate-limited fetch stays on URL entry

- **WHEN** the endpoint returns 429 `{ error: 'rate_limited' }`
- **THEN** the URL entry state SHALL render with the pasted URL retained and the slow-down field error, and neither the failure screen nor the Preview SHALL render
