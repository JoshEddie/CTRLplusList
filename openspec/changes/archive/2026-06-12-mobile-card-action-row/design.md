# Design — mobile-card-action-row

## Context

The `<600px` horizontal-card layout in `app/(main)/items/ui/styles/item.css` (mobile block, ~line 1102) uses `grid-template-columns: 64px 1fr auto`. Three defects, one root cause — the `auto` col 3 is sized by row-4 occupants while rows 1–2 leave it empty:

1. Title (`grid-column: 2`) and price row (`grid-column: 2`) are squeezed by a phantom col-3 track ≥165px wide (the claim-affordance `min-width: 165px` floor at item.css ~1017 sits outside any media query and leaks into mobile).
2. Claim buttons ("Get this gift" / "Manage your claim" / owner "Mark as claimed") occupy col 3 only instead of using the full action row.
3. `.purchased-banner--spoiler` spans `1 / -1` on row 4, overlapping the owner kebab (also col 3 row 4) — violating the item-store-links SHALL that the kebab never be obscured.

`item-store-links` governs this region; the delta spec in this change updates its `<600px` requirement. Affected variants: `.item-list`, `.item-grid` (grid-as-list at mobile), `.sortable-item`, choose-items picker (inherits).

## Goals / Non-Goals

**Goals:**
- Title and price use the full card width at `<600px`.
- Non-owner claim affordances stretch the full action row at `<600px` (large tap target, mirrors the existing full-row `.claimed-state` pill).
- Owner action row: left content spans `1 / 3`; kebab keeps col 3 exclusively — no overlap in any state (storeLinks, claim button, spoiler banner).
- `min-width: 165px` floor applies only at ≥600px, per its spec rationale (right-column row alignment).

**Non-Goals:**
- No markup / component changes (`Item.tsx` untouched).
- No ≥600px row-view behavior changes.
- No button-system primitive changes — full-width is cell placement (`grid-column` + `width`/`justify-self` on the placed element), permitted page-scoped placement under the button-system contract.
- No grid-view (desktop card) changes.

## Decisions

### D1 — Span title/price `2 / -1` rather than removing col 3

Alternative considered: collapse col 3 at mobile (2-col grid) and place the kebab via a different mechanism. Rejected — the kebab and `+N` trigger legitimately need a right cell on row 4, and the 3-col template is spec'd anatomy. Spanning `2 / -1` on rows 1–2 keeps the template stable and is a 2-declaration fix.

### D2 — Owner discrimination via existing `.item-container.owner` class

The container already carries `.owner` (used at item.css ~971 and ~1036). Use `.item-container.owner .claim-cta-btn { grid-column: 1 / 3 }` etc. rather than `:has(.item-owner-actions-mobile)`. Rationale: class is already the established viewer-awareness signal in this file; `:has()` adds selector cost and a second idiom for the same fact.

### D3 — Full-width via `grid-column: 1 / -1` + `width: 100%` on the cell

Stretch the button itself to fill its cell (`width: 100%; justify-self: stretch`) inside the mobile block only. The button-system spec permits page-scoped placement; dimension floors/typography remain untouched (no `min-height` overrides — `width` here is placement, matching how `.claimed-state` already takes the full row).

### D4 — Scope the 165px floor with a `min-width: 600px` media query

Move/wrap the existing `.claim-cta-btn`/`.manage-claim-btn` `min-width: 165px` rule (and the `.claimed-state` floor if needed) into `@media (min-width: 600px)`. Alternative — overriding with `min-width: 0` in the mobile block — rejected: override-on-override is harder to read and the spec rationale ("rows align across states" in the ≥600px right column) names the correct scope directly.

### D5 — Spoiler banner `1 / 3` only on owner rows

At mobile the spoiler banner only renders for owners (spoilers are an owner affordance), but scope the carve-out under `.owner` anyway, consistent with D2 — if a non-owner spoiler surface ever appears, it gets the full row by default.

## Risks / Trade-offs

- [Selector-specificity collisions: the mobile block already has `1 / -1` and col-3 rules for these elements] → New rules placed inside the same `@media (max-width: 599px)` block, after the rules they refine, editing existing declarations where possible instead of stacking overrides.
- [`.sortable-item` rows sit inside an outer `30px 1fr` drag-handle grid; inner card grid unchanged, but visual QA needed on owner sortable view] → e2e/preview check of `/lists/[id]` owner edit at 375px.
- [Choose-items picker inherits the reflow; checkbox leading column must stay aligned] → covered by the same preview pass; no picker-specific rules change.
- [Full-row "Get this gift" increases visual weight] → matches existing full-row `.claimed-state` pill; user-directed.

## Migration Plan

CSS-only, single file; ship with the branch (`issue-152`). Rollback = revert commit.

## Open Questions

(none)
