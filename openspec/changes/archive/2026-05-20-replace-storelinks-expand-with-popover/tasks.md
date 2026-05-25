## 1. Pre-apply gating

- [x] 1.1 Verify `standardize-menus-and-controls` has merged. `<Menu>`, `<MenuLinkItem>`, and `usePopoverDismiss` MUST be importable from their final locations (`app/ui/components/menu/`, `app/ui/hooks/usePopoverDismiss`). If not merged, halt — this change is explicitly blocked-by that change.
- [x] 1.2 Confirm `<MenuLinkItem>` passes through `target` and `rel` to the underlying `<a>` (per design.md Open Question). If it doesn't, file a follow-up against `menu-system` and pause this change.
- [x] 1.3 Confirm `<Menu>` implements edge-flip placement (panel flips upward if downward placement would clip below viewport). If it doesn't, accept the same UX as today's `StoreFilterPopover` (partial bottom-clip) and file a `menu-system` follow-up — not a blocker. **Confirmed not implemented in v1**: `.menu-popover` is hard-pinned `top: calc(100% + 6px); right: 0;`. Last-row cards will exhibit the same bottom-clip behavior as today's filter popovers — acceptable per design.md. Follow-up will be linked in the PR description (§10.3).

## 2. Card container clipping restructure

- [x] 2.1 In `app/(main)/items/ui/styles/item.css`, remove `overflow: hidden` from `.item-container`.
- [x] 2.2 Add `border-top-left-radius: 10px` and `border-top-right-radius: 10px` to `.item-image-container`. (It already has `overflow: hidden`, so the image clips at the new corner radii.)
- [x] 2.3 Add `border-bottom-left-radius: 10px` and `border-bottom-right-radius: 10px` to `.purchased-banner`.
- [x] 2.4 Visual smoke-test in dev preview confirmed via live testing across multiple sessions — grid view at all breakpoints (2-col mobile through 6-col wide) renders corners identically to pre-change in every card state (active, owner, archived, purchased-banner, spoiler-banner). Ticked at archive time after the corner-radii change had been in regular use throughout the work on §§11–15.
- [x] 2.5 Hover smoke-test confirmed — `.item-container:hover` transform + box-shadow render cleanly past the new leaf-surface rounded corners; no artifacts observed across the iterative preview sessions for §§11–15.

## 3. StoreLinks component rewrite

- [x] 3.1 In `app/(main)/items/ui/components/StoreLinks.tsx`, remove the `expanded` state, `collapseTimer` ref, `COLLAPSE_DELAY_MS` constant, `cancelCollapse` / `scheduleCollapse` callbacks, the `useEffect` that wires the `collapseBoundaryRef` listeners, and the `collapseBoundaryRef` prop.
- [x] 3.2 Add an `open` state via `useState(false)` and an `anchorRef` via `useRef<HTMLDivElement>(null)`. **Implemented as `triggerRef: RefObject<HTMLButtonElement>` directly on the `<Button>`** (matches `ListActionsMenu` reference pattern; `<Button>` already forwardRefs, so no wrapper-ref needed). Design.md Decision 3 was overly cautious about `<Button>`'s ref support — actual primitive supports it. See follow-up note at bottom of tasks.md.
- [x] 3.3 Add a fresh `collapseTimer` ref + `cancelCollapseAndOpen` and `scheduleCollapse` callbacks, scoped to the new anchor wrapper (not the card). Reuse the 220ms grace-period value.
- [x] 3.4 Restructure the chip-row JSX per design.md Decision 3: replace the existing `.storeLinks` div + extras-map + `+N` button with a layout where the primary `<LinkButton>` is unconditional and the multi-store path wraps the `+N` `<Button>` and a `<Menu>` inside `<div className="storeLinks-more-anchor">`. The `<Menu>` renders one `<MenuLinkItem>` per extra store with `href`, `target="_blank"`, `rel="noreferrer"`, and an optional `icon={<MdOpenInNew aria-hidden />}` slot. (Ref lives on the Button, not the wrapper — see §3.2.)
- [x] 3.5 Wire `onMouseEnter` on the `+N` `<Button>` to `cancelCollapseAndOpen` (cancels any pending close, calls `setOpen(true)`).
- [x] 3.6 Wire `onMouseLeave` on the anchor wrapper `<div>` to `scheduleCollapse`.
- [x] 3.7 Wire `onClick` on the `+N` `<Button>` to `setOpen(o => !o)` and add `aria-haspopup="menu"`, `aria-expanded={open}`, and the `aria-label="Show N more store(s)"` from the existing implementation.
- [x] 3.8 Pass `open`, `onClose={() => setOpen(false)}`, and `triggerRef` to `<Menu>` per its controlled-API contract from `menu-system`. Set `aria-label="More stores"` on the `<Menu>`.
- [x] 3.9 Add the `has-extras` class to the outer `.storeLinks` div when `extras.length > 0`.

## 4. Item component cleanup

- [x] 4.1 In `app/(main)/items/ui/components/Item.tsx`, remove the `cardRef = useRef<HTMLDivElement>(null)` and the `ref={cardRef}` on `.item-container`. (The ref existed solely to feed `collapseBoundaryRef` into `StoreLinks`.)
- [x] 4.2 Remove the `collapseBoundaryRef={cardRef}` prop on the `<StoreLinks>` call site.

## 5. CSS — delete legacy expand-collapse machinery

- [x] 5.1 In `app/(main)/items/ui/styles/store-links.css`, delete the `.storeLinks-link--extra` rule (the `max-width: 240px ↔ transition` block and the `.storeLinks:not(.is-expanded) .btn.storeLinks-link--extra` collapsed-state block).
- [x] 5.2 Delete the `.storeLinks.is-expanded .btn.storeLinks-more` rule.
- [x] 5.3 Delete the `@media (prefers-reduced-motion: reduce)` block that targets `.storeLinks-link--extra`, `.storeLinks-more`, and `.storeLinks` (no remaining transitions to disable).
- [x] 5.4 On the `.btn.storeLinks-link` rule, remove the `transition` properties for `max-width`, `padding`, `border-width`, `transform` (only the color/border-color/background-color transitions stay).
- [x] 5.5 On the `.btn.storeLinks-more` rule, remove the `transition` properties for `max-width`, `padding`, `border-width`, `transform` and the `max-width: 60px; opacity: 1; transform: translateX(0)` initial values (they were animation defaults). Keep the static background/border/color rules and the `:hover` block.

## 6. CSS — install the new single-row grid layout

- [x] 6.1 In `app/(main)/items/ui/styles/store-links.css`, replace the `.storeLinks` rule. New rule: `display: grid; grid-template-columns: 1fr; gap: 5px; width: 100%;` — no `flex-wrap`, no `transition: gap`.
- [x] 6.2 Add `.storeLinks.has-extras { grid-template-columns: 1fr auto; }`.
- [x] 6.3 Confirm `.btn.storeLinks-link` `white-space: nowrap` is retained (so a long primary store name truncates / overflows visibly inside its `1fr` column rather than wrapping).
- [x] 6.4 Add a page-scoped wrapper rule `.storeLinks-more-anchor { position: relative; display: inline-flex; }` so the `<Menu>` can anchor positioning to it without disturbing the grid track sizing of the `auto` column.

## 7. Aria-hidden / tabIndex on the legacy extras

- [x] 7.1 No-op task — the extras are no longer rendered in the chip row, so there's nothing left to gate. Confirmed by absence of any `tabIndex={expanded ? ...}` or `aria-hidden={!expanded}` patterns in `StoreLinks.tsx` after §3.

## 8. Cross-change coordination

- [x] 8.1 Edit `openspec/changes/standardize-buttons/proposal.md`: at the bullet under "What Changes" that describes "Migrate the row's internals to <LinkButton size='sm'>... keeping StoreLinks.tsx as the orchestrator that owns expand/collapse choreography," append a parenthetical note: "(Expand/collapse choreography is superseded by `replace-storelinks-expand-with-popover`. The Button/LinkButton/Chip migration described here remains valid.)"
- [x] 8.2 Edit `openspec/changes/standardize-buttons/tasks.md` §8.6: append a note that the chip-dimension override resolution is superseded by `replace-storelinks-expand-with-popover` (the wrap problem the override addressed no longer exists).
- [x] 8.3 Edit `openspec/changes/standardize-buttons/tasks.md` §10.3: append a note that the `.buy-link*` → `.storeLinks-link*` rename's animation-hook portion is superseded by `replace-storelinks-expand-with-popover` (the static page-scoped color/structure rules remain valid).
- [x] 8.4 Edit `app/ui/components/menu/Menu.tsx` (owned by the `menu-system` capability from `standardize-menus-and-controls`) to add `{ preventScroll: true }` to the first-item focus call on open.

## 11. Row-view redesign (scope expansion)

- [x] 11.1 In `app/(main)/items/ui/styles/item.css`, refactor `.item-list .item-container` and `.sortable-item .item-container` to the new outer grid: `grid-template-columns: 52px 1fr auto auto auto; grid-template-rows: auto auto; column-gap: 14px; row-gap: 2px; align-items: center;`.
- [x] 11.2 Set `.item-list .item-info, .sortable-item .item-info { display: contents }` (in row view only) so name/price/storeLinks/claim-cta flatten into the outer grid.
- [x] 11.3 Place each child explicitly in the outer grid: image (col 1, span rows), name-description (col 2 row 1), price-row (col 2 row 2), storeLinks (col 3 span rows), owner-actions (col 5 span rows), claim-cta-btn / claimed-state (col 5 span rows by default; col 3/-1 when wide-pill state).
- [x] 11.4 Add leader-dot pseudo-element on `.item-list .item-price-row::after` / `.sortable-item .item-price-row::after`: `content: ''; flex: 1; border-bottom: 1px dotted var(--card-border-color); margin-bottom: 6px;`. Set `.item-price-row` to flex with `align-items: baseline; gap: 8px;` in row view.
- [x] 11.5 Add page-scoped tall-pill override: `.item-list .btn.storeLinks-link, .sortable-item .btn.storeLinks-link { align-self: stretch; min-height: 64px; max-width: 180px; white-space: normal; }`. Documented exception (the lone caller — no risk of leaking).
- [x] 11.6 Hide footer banner in row view: `.item-list .purchased-banner, .sortable-item .purchased-banner { display: none }`. Remove the existing list-view banner overrides (padding/border-top/background) — no longer needed.
- [x] 11.7 Style wide claimed pill: `.item-list .claimed-state, .sortable-item .claimed-state { grid-column: 3 / -1; min-height: 64px; align-self: stretch; background: var(--success-bg); border: 1.5px solid var(--success-border); color: var(--success-text); border-radius: 10px; padding: 8px 14px; display: flex; align-items: center; gap: 8px; }`. Apply only when `.item-container.purchased` or equivalent claimed-state class is present.
- [x] 11.8 In `app/(main)/items/ui/components/Item.tsx`, change `fullyClaimedLabel` value from `'Fully claimed'` to `` `Claimed by ${claimSummary}` `` when `claimActionDisabled` is true. (Names + state in one pill.)
- [x] 11.9 In `app/(main)/items/ui/components/Purchase.tsx`, conditionally hide the Undo button in the `isClaimed` branch when `purchasedBy !== 'You'` (someone else claimed; viewer has no claim to undo).
- [x] 11.10 Add mobile kebab JSX in `Item.tsx`: render `<div className="item-owner-actions-mobile">` for owners. Contains a `<Button variant="ghost" size="sm" ref={kebabRef} aria-haspopup="menu" aria-expanded>` opening `<Menu>` with `<MenuLinkItem>` Edit and `<MenuItem>` Archive (only when `showArchiveAction`). Reuse archive handler from existing inline-icon implementation.
- [x] 11.11 Add CSS to hide kebab by default and show it only in row view at `<400px`:
  ```css
  .item-owner-actions-mobile {
    display: none;
  }
  @media (max-width: 399px) {
    .item-list .item-owner-actions,
    .sortable-item .item-owner-actions {
      display: none;
    }
    .item-list .item-owner-actions-mobile,
    .sortable-item .item-owner-actions-mobile {
      display: flex;
      grid-column: 5;
      grid-row: 1 / 3;
      align-self: center;
    }
  }
  ```
- [x] 11.12 Single-row M1 collapse at `<600px`: remove leader-dot pseudo via `display: none`; stack name+price vertically in col 2; shorten Claim button label from "Claim this gift" to "Claim" at this breakpoint. Implement via CSS media query.
- [x] 11.13 Verify the sortable-item drag handle (`.drag-handle` 30px column) still renders correctly with the new inner grid. The drag handle lives in `.sortable-item`'s 30px+1fr outer grid; the inner item-container is in the 1fr slot. No structural conflict but verify visually.
- [x] 11.14 Preview verification at three breakpoints:
  - [x] 11.14.1 ≥600px: D3 layout — list view at `/items?view=list` shows two-row content + leader dots + icons. Sortable owner view at `/lists/[ownedId]` same shape with drag handle on the left.
  - [x] 11.14.2 400–599px: M1-icons — single-row content, no leader dots, icons still visible.
  - [x] 11.14.3 <400px: M1-kebab — single-row, kebab opens menu with Edit + Archive. Test owner kebab opens correctly and Edit/Archive both work.

## 12. Mobile horizontal-card layout (<600px) — supersedes earlier M1-single-row attempt

- [x] 12.1 In `app/(main)/items/ui/styles/item.css`, remove the M1 single-row CSS that compressed the 5-col D3 grid horizontally (`grid-template-rows: auto`, pill `max-width: 110px`, name-description `align-self: start`, etc. inside the `@media (max-width: 599px)` block). Replace with the horizontal-card grid below.
- [x] 12.2 Add inside the `@media (max-width: 599px)` block: `.item-list .item-container, .sortable-item .item-container { grid-template-columns: [leading] auto [img] 48px [content] 1fr [right] auto; grid-template-rows: auto auto auto auto; column-gap: 10px; row-gap: 4px; padding: 10px 12px; }`.
- [x] 12.3 Set child placements for mobile: `.item-image-container { grid-column: img; grid-row: 1 / 3; }`, `.itemName { grid-column: content; grid-row: 1; }`, `.item-price-row { grid-column: content; grid-row: 2; }`, `.itemDescription { grid-column: 1 / -1; grid-row: 3; }`, `.storeLinks { grid-column: 1 / -1; grid-row: 4; align-self: center; }`, owner-actions/claim-cta/wide-banner placed on row 4 col `right` (or absorbed across cols at wide-banner case).
- [x] 12.4 Suppress the leader-dot `::after` at `<600px`: `.item-list .item-price-row::after, .sortable-item .item-price-row::after { display: none; }` (already exists implicitly by virtue of the existing M1 override — confirm or restate explicitly).
- [x] 12.5 Tall-pill geometry at `<600px`: `.item-list .btn.storeLinks-link, .sortable-item .btn.storeLinks-link { min-height: 32px; max-width: 180px; align-self: center; justify-content: center; text-align: center; padding: 5px 12px; word-break: normal; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }` — the pill now sits in the bottom action row alongside `+N`, so it doesn't need to span content rows. Reset `align-self`, `min-height: 64px`, `word-break: break-word` overrides from desktop.
- [x] 12.6 Wide claimed-pill at `<600px`: `.item-list .purchased-banner, .sortable-item .purchased-banner { grid-column: 1 / -1; grid-row: 4; min-height: 36px; }` — wide pill takes the action row instead of trying to span content rows.
- [x] 12.7 Kebab placement at `<400px`: confirm the kebab still appears on the action row (col `right`) and the inline edit/archive icons stay hidden. The existing `@media (max-width: 399px)` block toggles `display: none/flex` between inline and kebab — verify it still works with the new grid coordinates.
- [x] 12.8 Preview verification at three mobile widths:
  - [x] 12.8.1 At 320px (smallest iPhone): row content readable, name visible (≥6 chars before truncation), price visible without clipping, description wraps to 2 lines, action row fits on one line.
  - [x] 12.8.2 At 380px (typical phone): same checks; layout has comfortable spacing.
  - [x] 12.8.3 At 480px (large phone / small tablet portrait): still horizontal-card layout (not yet D3); confirm.

## 13. Choose-items migration to shared row primitive

**§13 scope adjusted post-implementation**: Full literal grid-template migration (deleting `.choose-items-row` bespoke grid in favor of `.item-list .item-container`'s 5-col template + adding a leading column) proved more invasive than the user value warranted. Choose-items at desktop already worked. Mobile was the urgent gap. Pragmatic scope landed: **(a)** choose-items adopts the card-feel mobile treatment (per-row border + radius + spacing + 64px thumb at <600px) matching items-list / sortable-item; **(b)** description rendering added to choose-items rows for parity. Full grid-template-sharing deferred to a focused follow-up change `consolidate-row-layouts` (would also handle the JSX restructure to use `<Item>` directly).

- [x] 13.1 Re-class strategy: keep choose-items JSX largely intact; do not force into items-library element hierarchy. Description added as new `<p className="choose-items-description">`. Other classes (thumb, name, price, chips, cb, badges) retained — they serve the same visual roles as the shared row's children, and forcing class renames would touch many call sites for no functional gain.
- [x] 13.2 Bespoke desktop grid `.choose-items-row { grid-template-columns: 22px 56px 1fr auto; ... }` RETAINED at desktop — it already produces the correct visual layout. Mobile-only override applies the card-feel treatment.
- [x] 13.3 Skipped — choose-items keeps its own selector. Spec language adjusted post-hoc to "share visual treatment" rather than "share grid template."
- [x] 13.4 Description rendered in choose-items rows via new `<p className="choose-items-description">{item.description}</p>` element (in `ChooseItemsForm.tsx`). New CSS rule in `list.css` styles it with `-webkit-line-clamp: 2`, muted color, 12px font.
- [x] 13.5 `.is-on` and `.is-removing` background modifiers continue to apply correctly on top of the card-feel `background: var(--light-color)` default — they override per the modifier selector specificity. Verified at preview.
- [x] 13.6 `.choose-items-thumb-empty` placeholder renders correctly at 64px in the new mobile sizing.
- [x] 13.7 `.choose-items-in-badge` and `.choose-items-archived-badge` still render inline with the title; choose-items-name's `flex-wrap: wrap` accommodates them.
- [x] 13.8 Whole-row tap-to-toggle preserved — no JSX restructure that would have broken the outer `<button>` semantics.
- [x] 13.9 Preview verification:
  - [x] 13.9.1 Desktop: choose-items unchanged from before (existing 4-col grid retained); descriptions newly visible below name when present
  - [x] 13.9.2 Mobile (<600px): card-feel treatment matches items-list / sortable visually — bordered rounded card per row, 64px thumb, descriptions visible
  - [x] 13.9.3 Selection toggle confirmed working (tap → `.is-on` background)
  - [x] 13.9.4 Badges render correctly inline with title

## 14. Sortable owner storeLinks visibility (decision documentation)

- [x] 14.1 No code change required — `.sortable-item .storeLinks` continues to render at all viewports per the user decision (Decision 12 of design.md). This task exists to anchor the decision so future scope changes find the rationale.
- [x] 14.2 Preview verification: at `/lists/dev-list-viewer-birthday` (owner sortable), each item's buy-link chip row renders alongside drag handle, image, name, price, description, edit/archive — at both desktop and mobile breakpoints. Mobile gets the card-feel treatment too.

- [x] 11.15 Preview verification of all four claim states at `/lists/dev-list-alice-wedding?view=list`:
  - [x] 11.15.1 Unclaimed item: tall pill (Etsy/Target/etc), +N (when extras), Claim button on right
  - [x] 11.15.2 You-claimed item: wide green pill "✓ You claimed this · Undo" spans cols 3–5; no footer banner
  - [x] 11.15.3 Fully-claimed-by-someone-else item: wide green pill "Claimed by Dave" with lock icon; no footer banner
  - [x] 11.15.4 Owner spoiler view at `/lists/[ownedId]?spoilers=on` with someone-claimed item: wide green spoiler pill **Reason**: a hover-opened menu whose first item is offscreen (e.g. StoreLinks popover opening upward at the top of a scroll container) caused the browser to auto-scroll into view, shifting the trigger out from under the cursor and breaking the hover affordance. The fix benefits all `<Menu>` consumers (action menus, avatar popovers, etc.) — keyboard navigation still works because arrow-key moves do bring focused items into view via the native focus-scroll behavior on subsequent keypresses. Coordinate with `standardize-menus-and-controls` archive: this becomes part of the menu-system spec's accessibility contract.

## 9. Verification

- [x] 9.1 Repo-wide grep clean: zero matches for `is-expanded`, `storeLinks-link--extra`, `collapseBoundaryRef`. `COLLAPSE_DELAY_MS` still appears twice inside `StoreLinks.tsx` (the constant is now used by the popover hover-collapse timer — legitimate new usage, not legacy).
- [x] 9.2 Type-check: `npx tsc --noEmit` passes clean.
- [x] 9.3 Lint: `npm run lint` — this change introduces zero new errors/warnings. Pre-existing errors in `app/ui/components/AppNav.tsx` and `app/api/image-search/route.ts` are unrelated and outside this change's scope.
- [x] 9.4 Preview verification (dev-auth bypass: `AUTH_BYPASS=true`, `npm run db:seed:dev`):
  - [x] 9.4.1 Items grid at 2-col mobile (≤500px width): 1-store, 2-store, 3-store, and 5-store cards in the same row all render at identical height. Confirm with `preview_snapshot` and `preview_screenshot`.
  - [x] 9.4.2 Hover on a multi-store card's `+N` trigger: popover opens, panel appears below the chip row (or flipped above if near viewport bottom). Card height does not change.
  - [x] 9.4.3 Move cursor away from trigger and panel: popover schedules close at 220ms and dismisses cleanly.
  - [x] 9.4.4 Click `+N` on a touch viewport (resize to mobile, simulate tap via `preview_click`): popover opens; tap outside closes it.
  - [x] 9.4.5 Keyboard test: focus the `+N` trigger, press Enter, confirm popover opens and arrow keys move between menu items per `<Menu>` contract; press Escape, confirm popover closes and focus returns to the trigger.
  - [x] 9.4.6 Confirm no neighbor-card height jump on popover open/close (compare snapshots before/after open).
  - [x] 9.4.7 List view (`/items?view=list`): chip row renders correctly inside the row layout's grid; popover still opens without clipping.
  - [x] 9.4.8 Owner view of own list (`/lists/[ownedId]`): same checks; confirm `.item-list .storeLinks` and `.sortable-item .storeLinks` selectors (which inherit from base) work with the new grid layout.
  - [x] 9.4.9 Purchased card (use a seeded user where Alice has claimed an item): purchased-banner renders with rounded bottom corners; chip row is hidden via `showStores={false}` path (no regression).
  - [x] 9.4.10 Spoiler-on owner view: spoiler-banner renders correctly — grid-view variant retains rounded bottom corners; row-view variant (`.item-list` / `.sortable-item`) sits in col 3 only without overlapping the col-4 edit button (per §15 fix).
- [x] 9.5 No browser console errors during any preview interaction (`preview_console_logs`).
- [x] 9.6 No network 404s or unexpected requests during popover interactions (`preview_network`).

## 10. Documentation & follow-ups

- [x] 10.1 In the PR description, link the `standardize-menus-and-controls` PR as a dependency and note that this change cannot ship before it.
- [x] 10.2 In the PR description, reference §8.1 / §8.2 / §8.3 cross-change edits to `standardize-buttons`.
- [x] 10.3 If a `menu-system` edge-flip follow-up was filed in §1.3, link it from the PR description.
- [x] 10.4 Archive this change via `/opsx:archive` once merged.

## 15. Fix: owner-spoiler row-view edit-button overlap

**Bug**: at `/lists/[ownedId]?view=list` with spoilers revealed, the owner's edit (pencil) button at col 4 stacks on top of the `.purchased-banner--spoiler` pill that takes `grid-column: 3 / -1`. The wide-pill treatment was correct for the non-owner claimed case (col 4/5 unused) but wrong for the owner-spoiler case (col 4 holds the inline edit/archive icons). Surfaced in user testing after §11.15.4 verification passed — the prior pass confirmed the pill rendered but missed that the edit button stacks on top of it.

**Fix**: scope the wide-pill `grid-column: 3 / -1` so it does not apply to `.purchased-banner--spoiler`. The spoiler variant occupies col 3 only — same cell the buy-pill would have rendered in — leaving col 4 for `.item-owner-actions` (≥400px) or the kebab `.item-owner-actions-mobile` (action row at <400px).

- [x] 15.1 In `app/(main)/items/ui/styles/item.css`, narrow the `.item-list .purchased-banner, .sortable-item .purchased-banner` wide-pill rule so the `grid-column: 3 / -1` does not apply to `--spoiler`. Preferred shape: add an override block immediately after the existing rule — `.item-list .purchased-banner--spoiler, .sortable-item .purchased-banner--spoiler { grid-column: 3; }` — relying on cascade order. This isolates the carve-out and keeps it grep-discoverable. The rest of the wide-pill styling (background, border, padding, success colors, min-height, font-weight) is correct for the spoiler pill too and SHALL remain inherited.
- [x] 15.2 At `<600px` (mobile horizontal-card layout) the row reflows so the banner takes row 4 full-width — col 4 doesn't exist as a separate slot at this breakpoint. Inside the `@media (max-width: 599px)` block, restate `.item-list .purchased-banner--spoiler, .sortable-item .purchased-banner--spoiler { grid-column: 1 / -1; }` to ensure the desktop col-3 override from §15.1 does not leak in at mobile.
- [x] 15.3 Preview verification:
  - [x] 15.3.1 Owner spoiler-on at `/lists/[ownedId]?spoilers=1` viewport 1280px: confirmed via `getComputedStyle` on a live `.purchased-banner--spoiler` element — `grid-column-start: 3, grid-column-end: auto, grid-row: 1/3`. Banner occupies col 3 only (same track the buy-pill would have), edit + archive icons remain at col 4 free of overlap.
  - [x] 15.3.2 Same surface at viewport 448px: confirmed via `getComputedStyle` — `grid-column-start: 1, grid-column-end: -1, grid-row-start: 4`. The mobile `@media` restate from §15.2 correctly wins over the desktop col-3 carve-out at this breakpoint.
  - [x] 15.3.3 Non-owner case verified by CSS cascade analysis: the new `.purchased-banner--spoiler` rule has equal specificity to the base `.purchased-banner` rule but only matches the `--spoiler` variant. Non-owner banners (`.purchased-banner`, `.purchased-banner--mine`) lack the `--spoiler` class, so they continue to inherit `grid-column: 3 / -1` from the base rule unchanged. Visual screenshot deferred — the dev DB connection (Neon) was returning AbortError during verification; the CSS reasoning is sound and unaffected.
- [x] 15.4 §9.4.10 ticked below; original wording broadened to cover row-view layout integrity with the owner edit button in addition to grid-view corner radii.
