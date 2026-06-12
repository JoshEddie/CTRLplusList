## 1. CSS — mobile block (`app/(main)/items/ui/styles/item.css`, `@media (max-width: 599px)`)

- [x] 1.1 Span title and price to the card edge: `.itemName` and `.item-price-row` → `grid-column: 2 / -1` (all three variants: `.item-list`, `.item-grid`, `.sortable-item`)
- [x] 1.2 Non-owner claim affordances full-row: `.claim-cta-btn` / `.manage-claim-btn` → `grid-column: 1 / -1`, stretched to full row width (`width: 100%` / `justify-self: stretch`)
- [x] 1.3 Owner carve-out: `.item-container.owner` claim button and `.purchased-banner--spoiler` → `grid-column: 1 / 3`, kebab keeps col 3 (verify no remaining `1 / -1` span overlaps the kebab cell)
- [x] 1.4 Update the mobile-block layout comment (~line 1091) to describe the new spans

## 2. CSS — scope the 165px floor

- [x] 2.1 Wrap the `.claim-cta-btn` / `.manage-claim-btn` `min-width: 165px` rule (item.css ~1017) in `@media (min-width: 600px)`; confirm `.claimed-state`'s floor (~1080) keeps its ≥600px-only effect

## 3. Visual verification (375px viewport, dev:local seed)

- [ ] 3.1 Non-owner list view: title/price use full width; "Get this gift" and "Manage your claim" stretch full action row; fully-claimed pill unchanged
- [ ] 3.2 Owner list (sortable) view: kebab visible and operable; claim button and spoiler banner span `1 / 3` with no kebab overlap; storeLinks row unchanged
- [ ] 3.3 `/items` library and choose-items picker at mobile: no regressions from the shared reflow
- [ ] 3.4 ≥600px row view spot-check: no behavior change (165px floor still applies, spans unchanged)

## 4. Pre-merge

- [x] 4.1 `npm run lint` — zero errors (2 pre-existing file-size advisories, the tolerated warning class)
- [x] 4.2 `npx tsc --noEmit` — zero errors
- [x] 4.3 `npm run build` — completes successfully
- [x] 4.4 `npm run test:coverage` — zero failing tests
- [ ] 4.5 `npm run test:e2e` — zero failing tests
