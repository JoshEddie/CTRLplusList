# Delta: item-decision-deck

## MODIFIED Requirements

### Requirement: A failed fetch SHALL show a kind-aware, attempt-aware failure screen

When `product-link-prefill` routes a failure to the deck flow, the modal SHALL show a single failure screen whose copy and actions are keyed to the failure *kind*, so a slow fetch and an unreadable link are not labeled identically. The routing of failures (and which kind each result maps to) is owned by `product-link-prefill`; this requirement owns the screen's content, actions, and attempt behavior. Rate-limit responses are out of scope here (they stay on URL entry per `product-link-prefill`).

- **Timeout kind:** the screen SHALL explain the fetch was slow ("This is taking longer than expected") and offer **"Try again"** (re-fetch the *same* link) as the primary action, plus "Try a different link" (return to URL entry) and the manual-entry link. It SHALL NOT imply the link is bad.
- **Failed kind:** the screen SHALL explain the fetch returned no usable product without blaming the link ("We couldn't load that link — it might be the link, or a hiccup on our end") and offer **"Try again"** (same link), **"Try a different link"** (return to URL entry), and the manual-entry link.

The manual-entry escape SHALL NOT render as a stacked button: it SHALL be the "Fill in details manually →" link-variant affordance (`variant="link"` per `button-system`, default size — the same treatment and string as the URL entry state's manual affordance owned by `product-link-prefill`), rendered below the button stack. This treatment SHALL be uniform across all three screen states (timeout, failed, and retry-capped) and SHALL remain keyboard operable with a visible focus indicator, AA contrast, and spacing to neighboring targets satisfying the WCAG 2.5.8 spacing exception.

Both kinds SHALL offer "Try a different link" from the first failure: a timeout is the slowest failure to observe, so a user who pasted the wrong link SHALL NOT have to spend the retry cap to return to URL entry. The kinds differ in copy and in which action leads, not in the escape paths offered.

The screen SHALL be attempt-aware to prevent same-link "Try again" from grinding into the rate limit: a per-link retry counter (reset when a different URL is entered, and when the link fetches successfully) SHALL permit the same-link "Try again" for the first two failures of a given link, after which the "Try again" action SHALL be withdrawn and the copy SHALL harden ("That link keeps failing — try a different one, or fill in the details manually"), leaving only "Try a different link" and the manual-entry link.

#### Scenario: Timeout kind offers retry-same, a different link, and manual

- **WHEN** a fetch times out (timeout kind) on a link not yet past its retry cap
- **THEN** the failure screen SHALL render with a "taking longer than expected" message, a "Try again" action that re-fetches the same link, a "Try a different link" returning to URL entry, and "Fill in details manually →" opening the blank Preview

#### Scenario: Failed kind admits uncertainty and offers both paths

- **WHEN** a fetch returns no usable product (failed kind) on a link not yet past its retry cap
- **THEN** the failure screen SHALL render with copy that does not blame the link, a "Try again" (same link), a "Try a different link" returning to URL entry, and "Fill in details manually →"

#### Scenario: Manual entry renders as the link affordance below the stack, uniformly

- **WHEN** the failure screen renders in any of its three states (timeout, failed, or retry-capped)
- **THEN** "Fill in details manually →" SHALL render via the `link` button variant below the button stack — not as a stacked peer button — with the identical string used on URL entry, keyboard operable and focus-visible

#### Scenario: Retry cap withdraws Try again and hardens copy

- **WHEN** the same link has failed twice and the failure screen renders a third time for that link
- **THEN** the "Try again" action SHALL NOT be offered, the copy SHALL state the link keeps failing ("try a different one, or fill in the details manually"), and only "Try a different link" and "Fill in details manually →" SHALL remain

#### Scenario: A different link resets the retry cap

- **WHEN** the user enters a different URL after a link exhausted its retry cap
- **THEN** the new link's failure screen SHALL again offer "Try again" from the first failure

#### Scenario: A successful fetch resets the retry cap for that link

- **WHEN** a link that previously failed fetches successfully, and the user returns to URL entry and fetches the same link again
- **THEN** the retry counter SHALL have restarted, so the link SHALL again offer "Try again" for its first two failures rather than carrying its pre-success failures
