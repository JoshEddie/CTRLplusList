## 1. Pre-apply gating

- [x] 1.1 Verify `standardize-menus-and-controls` has merged. `<Menu>`, `<MenuLinkItem>`, and `usePopoverDismiss` MUST be importable from their final locations (`app/ui/components/menu/`, `app/ui/hooks/usePopoverDismiss`). If not merged, halt — this change is explicitly blocked-by that change.
- [x] 1.2 Confirm `<MenuLinkItem>` passes through `target` and `rel` to the underlying `<a>` (per design.md Open Question). If it doesn't, file a follow-up against `menu-system` and pause this change.
- [x] 1.3 Confirm `<Menu>` implements edge-flip placement (panel flips upward if downward placement would clip below viewport). If it doesn't, accept the same UX as today's `StoreFilterPopover` (partial bottom-clip) and file a `menu-system` follow-up — not a blocker. **Confirmed not implemented in v1**: `.menu-popover` is hard-pinned `top: calc(100% + 6px); right: 0;`. Last-row cards will exhibit the same bottom-clip behavior as today's filter popovers — acceptable per design.md. Follow-up will be linked in the PR description (§10.3).

## 2. Card container clipping restructure

- [x] 2.1 In `app/(main)/items/ui/styles/item.css`, remove `overflow: hidden` from `.item-container`.
- [x] 2.2 Add `border-top-left-radius: 10px` and `border-top-right-radius: 10px` to `.item-image-container`. (It already has `overflow: hidden`, so the image clips at the new corner radii.)
- [x] 2.3 Add `border-bottom-left-radius: 10px` and `border-bottom-right-radius: 10px` to `.purchased-banner`.
- [ ] 2.4 Visual smoke-test in dev preview (with `AUTH_BYPASS=true`, seeded test user): item grid at 2-col mobile, 3-col tablet, 4-col laptop, 6-col wide desktop. Confirm corners look identical to pre-change at every breakpoint and in every card state (active, owner, archived/dimmed, purchased-banner-visible, spoiler-banner-visible).
- [ ] 2.5 Hover smoke-test: confirm `.item-container:hover` transform `translateY(-2px)` + `box-shadow` renders without artifacts past the rounded corners.

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
  .item-owner-actions-mobile { display: none; }
  @media (max-width: 399px) {
    .item-list .item-owner-actions,
    .sortable-item .item-owner-actions { display: none; }
    .item-list .item-owner-actions-mobile,
    .sortable-item .item-owner-actions-mobile { display: flex; grid-column: 5; grid-row: 1 / 3; align-self: center; }
  }
  ```
- [x] 11.12 Single-row M1 collapse at `<600px`: remove leader-dot pseudo via `display: none`; stack name+price vertically in col 2; shorten Claim button label from "Claim this gift" to "Claim" at this breakpoint. Implement via CSS media query.
- [x] 11.13 Verify the sortable-item drag handle (`.drag-handle` 30px column) still renders correctly with the new inner grid. The drag handle lives in `.sortable-item`'s 30px+1fr outer grid; the inner item-container is in the 1fr slot. No structural conflict but verify visually.
- [x] 11.14 Preview verification at three breakpoints:
  - [x] 11.14.1 ≥600px: D3 layout — list view at `/items?view=list` shows two-row content + leader dots + icons. Sortable owner view at `/lists/[ownedId]` same shape with drag handle on the left.
  - [x] 11.14.2 400–599px: M1-icons — single-row content, no leader dots, icons still visible.
  - [x] 11.14.3 <400px: M1-kebab — single-row, kebab opens menu with Edit + Archive. Test owner kebab opens correctly and Edit/Archive both work.
- [x] 11.15 Preview verification of all four claim states at `/lists/dev-list-alice-wedding?view=list`:
  - [x] 11.15.1 Unclaimed item: tall pill (Etsy/Target/etc), +N (when extras), Claim button on right
  - [x] 11.15.2 You-claimed item: wide green pill "✓ You claimed this · Undo" spans cols 3–5; no footer banner
  - [x] 11.15.3 Fully-claimed-by-someone-else item: wide green pill "Claimed by Dave" with lock icon; no footer banner
  - [x] 11.15.4 Owner spoiler view at `/lists/[ownedId]?spoilers=on` with someone-claimed item: wide green spoiler pill **Reason**: a hover-opened menu whose first item is offscreen (e.g. StoreLinks popover opening upward at the top of a scroll container) caused the browser to auto-scroll into view, shifting the trigger out from under the cursor and breaking the hover affordance. The fix benefits all `<Menu>` consumers (action menus, avatar popovers, etc.) — keyboard navigation still works because arrow-key moves do bring focused items into view via the native focus-scroll behavior on subsequent keypresses. Coordinate with `standardize-menus-and-controls` archive: this becomes part of the menu-system spec's accessibility contract.

## 9. Verification

- [x] 9.1 Repo-wide grep clean: zero matches for `is-expanded`, `storeLinks-link--extra`, `collapseBoundaryRef`. `COLLAPSE_DELAY_MS` still appears twice inside `StoreLinks.tsx` (the constant is now used by the popover hover-collapse timer — legitimate new usage, not legacy).
- [x] 9.2 Type-check: `npx tsc --noEmit` passes clean.
- [x] 9.3 Lint: `npm run lint` — this change introduces zero new errors/warnings. Pre-existing errors in `app/ui/components/AppNav.tsx` and `app/api/image-search/route.ts` are unrelated and outside this change's scope.
- [ ] 9.4 Preview verification (dev-auth bypass: `AUTH_BYPASS=true`, `npm run db:seed:dev`):
  - [ ] 9.4.1 Items grid at 2-col mobile (≤500px width): 1-store, 2-store, 3-store, and 5-store cards in the same row all render at identical height. Confirm with `preview_snapshot` and `preview_screenshot`.
  - [ ] 9.4.2 Hover on a multi-store card's `+N` trigger: popover opens, panel appears below the chip row (or flipped above if near viewport bottom). Card height does not change.
  - [ ] 9.4.3 Move cursor away from trigger and panel: popover schedules close at 220ms and dismisses cleanly.
  - [ ] 9.4.4 Click `+N` on a touch viewport (resize to mobile, simulate tap via `preview_click`): popover opens; tap outside closes it.
  - [ ] 9.4.5 Keyboard test: focus the `+N` trigger, press Enter, confirm popover opens and arrow keys move between menu items per `<Menu>` contract; press Escape, confirm popover closes and focus returns to the trigger.
  - [ ] 9.4.6 Confirm no neighbor-card height jump on popover open/close (compare snapshots before/after open).
  - [ ] 9.4.7 List view (`/items?view=list`): chip row renders correctly inside the row layout's grid; popover still opens without clipping.
  - [ ] 9.4.8 Owner view of own list (`/lists/[ownedId]`): same checks; confirm `.item-list .storeLinks` and `.sortable-item .storeLinks` selectors (which inherit from base) work with the new grid layout.
  - [ ] 9.4.9 Purchased card (use a seeded user where Alice has claimed an item): purchased-banner renders with rounded bottom corners; chip row is hidden via `showStores={false}` path (no regression).
  - [ ] 9.4.10 Spoiler-on owner view: spoiler-banner renders correctly with rounded bottom corners.
- [ ] 9.5 No browser console errors during any preview interaction (`preview_console_logs`).
- [ ] 9.6 No network 404s or unexpected requests during popover interactions (`preview_network`).

## 10. Documentation & follow-ups

- [ ] 10.1 In the PR description, link the `standardize-menus-and-controls` PR as a dependency and note that this change cannot ship before it.
- [ ] 10.2 In the PR description, reference §8.1 / §8.2 / §8.3 cross-change edits to `standardize-buttons`.
- [ ] 10.3 If a `menu-system` edge-flip follow-up was filed in §1.3, link it from the PR description.
- [ ] 10.4 Archive this change via `/opsx:archive` once merged.
