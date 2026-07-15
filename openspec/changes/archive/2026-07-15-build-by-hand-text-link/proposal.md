# Proposal: build-by-hand-text-link

## Why

On the deck's fetch-failure screen, "Build it by hand" renders as a `secondary` `<Button>` stacked as a visual peer of "Try again" / "Try a different link" (`FetchFailure.tsx`). Manual entry is the last resort — a peer-weight button invites users to abandon the fetch path prematurely. The app already has the right idiom one screen earlier: URL entry renders "Fill in details manually →" as a `variant="link"` text affordance below the primary "Fetch Details" button (`UrlEntryStep.tsx`, bound by `product-link-prefill`). The failure screen adopts that same treatment and language, replacing the map's original "forgot-password idiom" framing (issue #205 settled: not a button; floor = keyboard operability + focus-visible + AA contrast + WCAG 2.5.8 spacing exception).

Inherited binding constraints:

- `item-decision-deck` — owns the failure screen's content, actions, and attempt behavior; its requirement currently names "Build it by hand" as a stacked action and its capped-state copy reads "try a different one, or build it by hand". Also owns the deck's accessibility and contrast floor.
- `product-link-prefill` — names "Build it by hand" in its failure-routing requirement and scenario; binds the behavior (opens the blank Preview with the pasted URL seeded into the first store row's Link field), which is unchanged. Also owns the URL-entry "Fill in details manually →" affordance being mirrored.
- `button-system` — the `link` variant is the spec'd text-button affordance (no border/background/horizontal padding, primary text, hover underline; 44px-floor opt-out via the 2.5.8 spacing exception). Used as-is, default size — no variant, size, or token change, so no `button-system` delta.

## What Changes

- `FetchFailure` renders its manual-entry action as `<Button variant="link">` with the text "Fill in details manually →" — identical string and treatment to URL entry — placed below the button stack, uniform across timeout, failed, and retry-capped states.
- Capped-state sub-copy updates to match: "Try a different one, or fill in the details manually."
- Behavior unchanged: activating it opens the blank Preview with the pasted URL seeded.
- No changes to the `link` variant or any button CSS; de-emphasis comes from the existing text-link treatment and placement.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `item-decision-deck`: the failure-screen requirement changes the manual-entry action from a stacked "Build it by hand" button to the "Fill in details manually →" link-variant affordance below the button stack, uniform across all three states, and updates the capped-state copy.
- `product-link-prefill`: its failure-screen references rename "Build it by hand" to "Fill in details manually →"; the bound behavior (blank Preview, seeded URL) is unchanged.

## Impact

- `app/(main)/items/ui/components/itemform/deck/FetchFailure.tsx` — variant, text, and placement.
- `app/(main)/items/ui/components/itemform/deck/deck.css` — spacing for the below-stack link if the existing `.deck-failure-actions` column needs it.
- Tests: `FetchFailure.test.tsx` and `ItemFormContainer.test.tsx` assertions naming "Build it by hand".
- No data layer, schema, routes, or cache tags involved.
