# Mobile card action row

## Why

At `<600px` the horizontal-card item layout (`64px 1fr auto` grid in `app/(main)/items/ui/styles/item.css`) wastes width and overlaps affordances: the title and price are confined to col 2 while col 3 — empty on rows 1–2 — is held wide by the row-4 claim button (whose `min-width: 165px` floor, spec'd for ≥600px row alignment in `item-store-links`, leaks into the mobile block because the rule sits outside the media query). Titles wrap and the price/store-metadata line ellipsizes next to dead space. Separately, the owner spoiler banner spans `1 / -1` on row 4 and slides under the owner-actions kebab — violating the `item-store-links` SHALL that "the kebab cell SHALL remain available at all viewports" and "the spoiler pill SHALL NOT overlap or obscure the kebab affordance."

Inherited constraints (from `openspec/specs/item-store-links/spec.md`):
- "At viewport widths below 600px the row layout SHALL reflow into a vertically-stacked horizontal-card" — title row 1, price row 2, description row 3, viewer-aware action row 4. This change refines cell spans within that anatomy; the row structure is unchanged.
- "Owner-actions kebab engages in the action row" (flush-right at `<600px`) — preserved.
- The `min-width: 165px` claim-affordance floor "so rows align across states" — its rationale is the ≥600px right-column alignment; this change scopes it to ≥600px explicitly.
- Button-system contract: no dimension/typography overrides on primitives; full-width stretch is page-scoped placement (grid-column + justify-self/width on the cell), which the button-system spec permits.

## What Changes

All within the `<600px` mobile block of `item.css`; applies equally to `.item-list`, `.item-grid` (grid-as-list at mobile), and `.sortable-item` variants:

- `.itemName` and `.item-price-row` span `2 / -1` instead of col 2 only — reclaims the phantom col-3 width on rows 1–2.
- Non-owner claim affordances (`.claim-cta-btn`, `.manage-claim-btn`) span the full action row (`1 / -1`) and stretch to full width — `<600px` only. storeLinks and the claim CTA never co-occur on the action row, so no conflict.
- Owner rows (`.item-container.owner`): claim button and `.purchased-banner--spoiler` span `1 / 3`, leaving col 3 row 4 to the kebab — fixes the spoiler-banner/kebab overlap.
- The `min-width: 165px` claim-affordance floor is scoped to `≥600px`.

No markup changes; CSS only.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `item-store-links`: the `<600px` horizontal-card requirement gains explicit cell-span behavior — title/price span to the card edge; claim affordances stretch the full action row for non-owners; owner rows reserve the action-row right cell for the kebab (claim button / spoiler banner span `1 / 3`); the `min-width: 165px` floor is scoped to ≥600px row view.

## Impact

- `app/(main)/items/ui/styles/item.css` — mobile (`max-width: 599px`) block plus scoping one base rule into the ≥600px range. Single file.
- Surfaces affected: `/items` library, `/lists/[id]` viewer and owner (sortable) rows, choose-items picker (inherits shared row reflow), all at `<600px`.
- No data layer, no markup, no primitive changes. GitHub issue: #152.
