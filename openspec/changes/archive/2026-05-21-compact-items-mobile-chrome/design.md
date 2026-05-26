## Context

The items library (`/items`) and list-details pages share an `ItemsBrowser` composition of three flex-stacked regions inside `.container--items-library` (and `.container--list-details`):

```
.container--items-library  (height: 100vh - sticky-top, flex column)
├── header                  (flex-shrink: 0)
├── tabs                    (flex-shrink: 0)
└── .items-browser          (flex: 1, min-h: 0, flex column)
    ├── .items-toolbar      (flex-shrink: 0)
    ├── .item-grid-container  (flex: 1, overflow-y: auto)
    │     └── .item-grid OR .item-list  ← view-mode switch
    └── .items-pagination   (flex-shrink: 0, border-top)
```

At ≤599px today, `.items-toolbar-row` renders as a two-row grid (`'search search' / 'filters view'`), and `.items-pagination` consumes a permanent slice at the bottom of the viewport. After the 1.0 redesign added a 2-line description clamp, multi-claim counter, and store-popover preview to each card, mobile users see ~95–110px of chrome above the first card and another ~50px below before content begins.

The grid view mode at <300px container width falls back to 1-col anyway, and at 300–599px renders 2-col tiles too narrow to show the new card content legibly. The view toggle on mobile is therefore offering a worse layout as one of its two options.

The primitives in use (`SearchField`, `PopoverTrigger`, `SegmentedControl`) all have governing specs that forbid page-scoped re-implementation. Any wrapper-level layout adaptation must work by composing the existing primitives — not by adding variants or replacing them.

## Goals / Non-Goals

**Goals:**

- Reclaim mobile viewport: cut the toolbar from two rows to one, and let pagination float over content instead of consuming a permanent strip.
- Eliminate the worse-of-two-options grid view at mobile widths by forcing list layout and hiding the toggle.
- Preserve desktop UI byte-for-byte (≥600px renders identically before and after this change).
- Keep all existing primitives untouched — no SegmentedControl variant, no PopoverTrigger prop addition, no SearchField API change.

**Non-Goals:**

- Shrinking individual item cards (description clamp, claim counter row, purchase banner remain). If after this change cards still feel tall, that's a separate follow-up.
- Changing the filters bottom-sheet UX. The Filters trigger still opens the same bottom sheet — only its row-mate and conditional visibility change.
- Removing the `?view=` URL parameter. Desktop users still toggle freely; mobile just renders list regardless of the param's value.
- Adding any `useIsMobile` hook or JavaScript-based viewport detection. The codebase is media-query-only and we stay aligned with that.
- Server-side rendering branches by viewport. SSR output is identical; mobile presentation is achieved via CSS only.

## Decisions

### Decision 1: Force list view on mobile via CSS, not via component state

**Choice:** Override `.item-grid` at `@media (max-width: 599px)` to use the same grid-template-columns and gap as `.item-list` (single column, full-width rows). Leave the `?view=` URL param flowing through unchanged.

**Rationale:** The codebase has no `useIsMobile` hook and uses pure CSS media queries throughout ([item.css:343](<app/(main)/items/ui/styles/item.css:343>), [item.css:438](<app/(main)/items/ui/styles/item.css:438>)). Adding JS-driven viewport detection just to clamp one component's state would be a new pattern, would require a hydration-safe implementation, and would break SSR consistency. CSS-only:

- Preserves the user's desktop `?view=grid` preference across viewport changes (resize → list, resize back → grid).
- Requires no React tree changes.
- Is reversible by deleting the media query block.

**Alternatives considered:**

- _Component-level clamp via `useIsMobile`_: rejected. Pattern-divergent, hydration risk, extra state.
- _Pass `showGridToggle={false}` from ItemsBrowser conditionally on a `window.matchMedia`_: rejected for the same hydration reason.
- _Server-side viewport sniffing via headers_: rejected. Brittle, and we don't currently do this anywhere.

### Decision 2: Hide the view-toggle cell on mobile via CSS

**Choice:** Add `.items-toolbar-cell--view { display: none }` at `@media (max-width: 599px)`. Do NOT remove the conditional `{showGridToggle && ...}` rendering in `ItemsToolbar.tsx` — the prop still controls call sites where the toggle is intentionally absent (e.g., the choose-items picker, per existing usage).

**Rationale:** Mirrors the existing pattern at [item.css:403,452](<app/(main)/items/ui/styles/item.css:403>) — the mobile Filters trigger is `display: none` desktop and `display: inline-flex` mobile. We're doing the exact inverse for the view toggle. Specificity is straightforward (single-class selector).

**Spec alignment:** [segmented-control-system spec.md:62](openspec/specs/segmented-control-system/spec.md:62) requires the view toggle to BE a `SegmentedControl tone="light"`. Hiding the cell that contains it does not violate the requirement — the primitive is still mounted and would still render if CSS were stripped. The spec doesn't mandate visibility at every viewport.

### Decision 3: Compact-icon filters trigger via CSS, not focus-expand

**Choice:** At `@media (max-width: 599px)`, the toolbar grid is `1fr auto` (search 1fr, filters auto-width), the filters `PopoverTrigger` gets `width: auto`, and its `.popover-trigger-label` span is `display: none`. The MdTune icon (with chevron and optional count badge) stands alone as the affordance.

```css
@media (max-width: 599px) {
  .items-toolbar-row {
    grid-template-columns: 1fr auto;
    grid-template-areas: 'search filters';
  }
  .popover-trigger.items-toolbar-cell--filters {
    width: auto;
  }
  .popover-trigger.items-toolbar-cell--filters .popover-trigger-label {
    display: none;
  }
}
```

**Rationale:** The earlier proposed approach was a `:has()`-driven search-expand state (toolbar collapses to single full-width search when the input is focused or has a value, hiding the filters trigger). The user's framing during implementation was simpler: "the icon is universal enough that we can just drop the word filters, let it be width: auto." That recognizes that with the text label removed, the trigger shrinks to ~40-50px and search already has nearly the full row width — no focus-driven layout change needed.

Benefits of this simpler approach:

- No CSS state changes during interaction — the toolbar layout is static.
- No `:has()` selector dependency (a moderate browser-baseline requirement).
- No risk of layout thrash when the user dismisses the keyboard with a query active.
- The filters affordance remains visible and tappable while the user is searching — useful when refining search results with a filter.

**Accessibility:** The `<button>` carries `aria-label="Open filters"` already ([ItemsToolbar.tsx:266](<app/(main)/items/ui/components/ItemsToolbar.tsx:266>)), which becomes the button's accessible name and takes precedence over visible text-content children. Hiding the `.popover-trigger-label` span via `display: none` has zero accessibility impact — the accessible name is already supplied by `aria-label`.

**Spec compliance:** [popover-trigger-system spec.md:74](openspec/specs/popover-trigger-system/spec.md:74) normatively requires the call site to render `<PopoverTrigger icon={<MdTune />} label="Filters" ... />`. This change keeps that call site unchanged — `label="Filters"` is still passed; only the rendered DOM is visually compacted via wrapper-scoped CSS. The primitive spec governs the call-site contract, not visibility decisions made by the wrapping layout.

**Alternatives considered:**

- _`:has()` focus-expand (the previously-designed approach)_: rejected during implementation as overkill once the icon-only filter trigger frees up enough horizontal room without any state change. Captured here so the constraint isn't re-discovered.
- _Pass `label=""` to the primitive_: rejected as a spec violation. The popover-trigger-system spec mandates `label="Filters"` for this specific call site.
- _Modify the PopoverTrigger primitive to support an icon-only mode_: rejected as out-of-scope. This is a wrapper-layout decision, not a primitive-API decision. Other primitive consumers may want this in the future, at which point a primitive-spec modification is the right path.

### Decision 4: Pagination as `position: absolute` inside the container — at all viewports

**Choice:** Apply the floating-overlay pagination treatment unconditionally (originally scoped to mobile, widened during implementation per user feedback for cross-viewport consistency):

- `.container--items-library { position: relative }` and `.container--list-details { position: relative }`
- `.container--{items-library,list-details} .items-pagination { position: absolute; left: 0; right: 0; bottom: 0; margin: 0; }` with a translucent background (`background-color: color-mix(in srgb, var(--light-color) 90%, transparent)`) and a soft top shadow.
- `.container--{items-library,list-details} .item-grid-container { padding-bottom: var(--items-pagination-overlay-height, 96px) }` so the last row of items remains scrollable into view above the floating bar at all widths.
- Remove the `border-top` on `.items-pagination` for both surfaces (the translucent overlap reads as the visual separator).
- Rules live in the same file as each surface's desktop container rules so source-order tie-breaking works without specificity hacks — `.container--items-library` rules in `item.css`, `.container--list-details` rules in `list.css`.

**Rationale:** Two viable alternatives exist:

| Approach                                                   | Pro                                                                                                              | Con                                                                                                                                  |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **A. position: absolute on container** (chosen)            | DOM unchanged, scoped to mobile media query, container already has fixed height so absolute child sits naturally | Need to add bottom padding to grid container so last row isn't permanently obscured                                                  |
| **B. Move pagination INTO scroller, use position: sticky** | More semantic ("pagination follows content")                                                                     | Requires React tree restructure (Pagination becomes a child of the scrolling div, not a sibling). Cross-cuts the Items component.    |
| **C. position: fixed to viewport**                         | Simplest CSS                                                                                                     | Bypasses the items-browser-container scope. Would overlap unrelated UI (kebab menu, mobile bottom nav if any). Coupled to app shell. |

(A) wins on minimum-blast-radius: zero DOM change, zero React change, zero impact on the choose-items picker or list-details surfaces (which use the same chrome — they get the floating pagination treatment "for free").

The padding-bottom on `.item-grid-container` is the trickiest detail. Pagination height on mobile is roughly 44px (one row of small buttons + page-size select with gap-6px, padding 12px). Use a CSS variable (`--items-pagination-mobile-height: 56px` with safe headroom) so the magic number lives in one place.

**Rejected without prejudice:** sticky-inside-scroller (B) is a perfectly reasonable alternative if a future change adds long-scrolling pagination contexts. We could revisit. Captured here so the constraint isn't re-discovered.

### Decision 5: Scope the new capability to items-browser chrome only, not generalize to other browsers

**Choice:** Name the capability `items-browser-chrome` and bind it to `.container--items-library` and `.container--list-details` (the two consumers of `ItemsBrowser`). Don't try to absorb the home-digest carousel chrome or future browser surfaces.

**Rationale:** Different browsers have different chrome contracts (home-digest cards have their own toolbar-less treatment, choose-items has its own bottom action bar). A generalized "browser-chrome" capability would attract requirements that don't apply uniformly. Keep this narrow.

### Decision 6 (rejected): Reduce card content density to recover height

**Considered:** trim the description from 2-line to 1-line clamp on mobile, inline the claim counter with the item name.

**Rejected for this change:** the user's explicit framing was "make the chrome less restrictive so the existing card content has more room to breathe." Density tuning is a separate decision that should be made AFTER seeing how the page feels with the chrome changes in place. If kept here, it'd risk premature optimization and conflate the diff. Captured here so it isn't re-discovered as novel.

## Risks / Trade-offs

- **`:has()` browser support floor** → Already required by container queries elsewhere. No new constraint, but documented so a future browser-baseline downgrade discussion knows about this dependency.
- **`:not(:placeholder-shown)` requires placeholder attribute on SearchField input** → Currently satisfied. If the SearchField primitive ever drops the placeholder, the search-expand condition degrades to focus-only (filters button reappears when keyboard dismisses with a query active). Acceptable degradation, not silent breakage.
- **Pagination overlay obscures last items briefly** → Mitigated by `padding-bottom` on `.item-grid-container` equal to overlay height. Test that the last row scrolls fully clear.
- **iOS Safari translucent overlay + scrollbar interaction** → On iOS Safari the scroller has no visible scrollbar, so the overlay should look clean. On desktop the change is no-op (media query gates it). No expected regression.
- **Choose-items picker (`/lists/[id]/choose-items`) shares this chrome** → It already calls `ItemsToolbar` with `showGridToggle={false}` (the picker is list-only). The new mobile rules will simply also hide the view-cell (already hidden by the prop) and apply the search-expand. Verified no regression by reading the picker page.
- **List-details items section** → Renders the same toolbar + pagination. Gets the floating pagination treatment automatically, which is the intended outcome.
- **Reversibility** → All changes live in one media-query block in [item.css](<app/(main)/items/ui/styles/item.css>). Reverting is a single-file diff.

## Migration Plan

Pure presentational change with no data, API, or feature-flag involvement. Deploy plan:

1. Land the CSS changes.
2. Verify with the dev preview bypass (`AUTH_BYPASS=true` + `npm run db:seed:dev`) at three viewports: 375px (small phone), 414px (large phone), 599px (just under tablet boundary). Confirm desktop 1024px is unchanged.
3. No rollback artifact needed — CSS revert is sufficient.

## Open Questions

- _Page-size select inside the floating pagination — does the dropdown's panel clip against the viewport bottom on mobile?_ The select is a native `<select>` (per the form-field-system spec), so the dropdown is platform-native and shouldn't clip. Worth a visual check.
- _Should the pagination overlay also apply at the 600–800px tablet breakpoint?_ Probably not — at that size the page padding shrinks ([item.css:343](<app/(main)/items/ui/styles/item.css:343>)) but the toolbar still has its tablet 2-row layout, and there's more vertical room. Keep the overlay scoped to ≤599px unless feedback says otherwise.
- _Is the 90% alpha the right opacity?_ The user specified 90%. Will visually verify it reads as "content faintly visible underneath" without being so transparent it's hard to read pagination affordances against busy item content. Tunable via a single token.
