## 1. Mobile toolbar layout (search + compact filters icon)

- [x] 1.1 In `app/(main)/items/ui/styles/item.css` at the `@media (max-width: 599px)` block, replace the existing `.items-toolbar-row` grid-template (`'search search' / 'filters view'`) with a single-row `1fr auto` template using `grid-template-areas: 'search filters'`
- [x] 1.2 Consolidate the `.hide-grid-toggle .items-toolbar-row` mobile override into the same single-row template (kept for specificity safety)
- [x] 1.3 Compact the filters trigger to icon-only at mobile: add `.popover-trigger.items-toolbar-cell--filters { width: auto }` and `.popover-trigger.items-toolbar-cell--filters .popover-trigger-label { display: none }` so the button shrinks to its MdTune icon while keeping `aria-label="Open filters"` as the accessible name
- [x] 1.4 (Superseded by 1.3 — earlier search-expand design replaced with compact-icon approach. No focus-expand state needed since the icon-only trigger already leaves nearly the full row for search.)
- [x] 1.5 Visually verify with the dev preview at 375px viewport: search takes most of the row width; filters trigger renders as a compact icon-only button (MdTune + chevron + optional count badge) with no visible "Filters" text; tapping the filters icon opens the existing bottom sheet

## 2. Hide view toggle and force list layout on mobile

- [x] 2.1 In `app/(main)/items/ui/styles/item.css` at the `@media (max-width: 599px)` block, add `.items-toolbar-cell--view { display: none }` so the SegmentedControl wrapping cell is hidden
- [x] 2.2 Confirm the cell is no longer included in the toolbar grid-template-areas at mobile (it should already be absent after task 1.1)
- [x] 2.3 In the same media-query block, add an override making `.item-grid` use the single-column full-row layout that `.item-list` uses today — copy the existing `.item-list` `grid-template-columns` / `gap` rules and apply them to both selectors at this breakpoint
- [x] 2.4 Visually verify with `?view=grid` set in the URL at 375px viewport: items render as full-width single-column rows, identical to `?view=list`; verify at 1024px the same URL renders the grid layout unchanged

## 3. Pagination overlay (all viewports)

- [x] 3.1 Add `position: relative` to `.container--items-library` (in `item.css`) and `.container--list-details` (in `list.css`) — at all widths, not gated by media query — so the floating pagination's positioning context is the container itself, giving it full container width
- [x] 3.2 Edit the desktop `.container--items-library .items-pagination` rule in `item.css` AND the `.container--list-details .items-pagination` rule in `list.css` (each in its own file so source-order naturally wins over earlier same-file rules) to be the overlay version directly: `position: absolute; left: 0; right: 0; bottom: 0; margin: 0; padding: 12px 16px calc(12px + env(safe-area-inset-bottom)); background-color: color-mix(in srgb, var(--light-color) 90%, transparent); border-top: none; box-shadow: 0 -4px 12px rgba(0,0,0,0.08); z-index: 1`
- [x] 3.3 Add `padding-bottom: var(--items-pagination-overlay-height, 96px)` to `.container--items-library .item-grid-container` (item.css) and `.container--list-details .item-grid-container` (list.css) at all widths so the scroller has clearance for the floating overlay
- [ ] 3.4 (Deferred — backdrop-filter polish.) `backdrop-filter: blur(6px)` is optional. Add only after confirming no jitter on iOS Safari and acceptable desktop performance.
- [x] 3.5 Visually verify the pagination overlay at three viewports — mobile 375px, tablet 768px, and desktop 1280px: pagination sits at the bottom spanning full container width with items faintly visible behind it; scrolling to the end of the list reveals the last item row above the floating bar; all pagination buttons and the page-size select remain clickable

## 4. Capability spec promotion (post-implementation, before archive)

- [ ] 4.1 After implementation merges and is verified, when archiving this change confirm the new `items-browser-chrome` capability spec is promoted into `openspec/specs/items-browser-chrome/spec.md` (handled by the archive workflow; this task exists as a reminder to verify it lands correctly)

## 5. Cross-surface verification

- [x] 5.1 Verify the list-details page (`/lists/[id]`) at 375px viewport gets the same mobile chrome treatment automatically (same `ItemsToolbar` + `Pagination` composition shares the styling)
- [x] 5.2 Verify the choose-items picker (`/lists/[id]/choose-items`) at 375px viewport renders correctly: `showGridToggle={false}` was already hiding the view cell there, so the only visible change is the toolbar collapsing to one row and the search-expand behavior
- [x] 5.3 Verify desktop (≥1024px) is visually byte-identical for `/items`, `/lists/[id]`, and `/lists/[id]/choose-items` before vs. after these changes — no regressions in toolbar layout, grid view, or pagination positioning at desktop widths (note: pagination treatment intentionally widened to all viewports per user feedback during implementation — desktop is NOT byte-identical for pagination, all other areas are)
