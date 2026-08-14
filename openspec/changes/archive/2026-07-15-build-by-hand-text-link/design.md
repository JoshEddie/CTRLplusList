# Design: build-by-hand-text-link

## Context

`FetchFailure.tsx` renders three actions in `.deck-failure-actions` (column flex, 8px gap, full width): "Try again" (when under the retry cap), "Try a different link", and "Build it by hand" as a `secondary` button. One screen earlier, `UrlEntryStep.tsx` renders the manual-entry escape as `<Button variant="link">Fill in details manually →</Button>` below the primary button inside `.prefill-url-actions` (same column/8px-gap shape). Issue #205 settled the accessibility floor; the owner settled during propose that the failure screen mirrors the URL-entry idiom exactly — same component usage, same string.

## Goals / Non-Goals

**Goals:**
- One manual-entry idiom across URL entry and failure screen: `variant="link"`, string "Fill in details manually →".
- Uniform treatment across timeout, failed, and retry-capped states.
- Hold the settled floor: keyboard operable, focus-visible, AA contrast, 2.5.8 spacing exception.

**Non-Goals:**
- No change to what the action does (blank Preview, seeded URL — `product-link-prefill`'s contract).
- No change to the `link` variant, button tokens, or `button.css`.
- No per-state divergence (the map considered capped-state legitimacy; settled uniform).

## Decisions

1. **Reuse `variant="link"` at default size — no `size="sm"`, no `button-system` delta.** The propose grilling initially settled "extend button-system with link+sm"; the owner superseded that on discovering the URL-entry affordance already embodies the target idiom at default size. Matching it exactly beats a second, slightly-smaller idiom (rejected: `size="sm"` — would make the two manual-entry links inconsistent; rejected: new text-link primitive family — duplicates the link-variant contract).
2. **Link renders as the last child of `.deck-failure-actions`.** The column already centers content full-width with 8px gap, mirroring `.prefill-url-actions`; "below the button stack" falls out of source order. The link variant's zeroed padding relies on the surrounding 8px gap plus the buttons' 44px height for the 2.5.8 spacing exception — same layout math as URL entry. Only if visual review during apply shows the link needs more separation does `deck.css` gain a margin on that slot; no other CSS anticipated.
3. **String is byte-identical to URL entry ("Fill in details manually →").** Both copies are 1-line, no structure, divergence fails loudly in tests — per CLAUDE.md's DRY rule they stay inline; no shared constant is extracted.
4. **Capped-state sub-copy follows the rename** ("Try a different one, or fill in the details manually.") so copy never names an action the screen doesn't show.

## Risks / Trade-offs

- [Link variant's zero hit-padding shrinks the tap target vs the old 44px button] → the 2.5.8 spacing exception is already the spec'd contract for `variant="link"`; the 8px gap below a 44px button keeps 24px-circle separation, same as the URL-entry precedent.
- [De-emphasis could hide the only escape in the capped state] → capped-state copy explicitly points at the link ("…or fill in the details manually.").

## Migration Plan

Pure UI + copy change inside one component and two spec deltas; no data, routing, or deploy considerations. Rollback = revert.

## Open Questions

None.
