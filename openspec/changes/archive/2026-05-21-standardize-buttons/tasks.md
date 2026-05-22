## 1. Reconnaissance

- [x] 1.1 Read `openspec/changes/redesign-home-and-tokens/design.md` and `questions.md` — no `--btn-*` tokens or focus-ring token exist; the list-hero gradient is intentional (Stage 4 token, not slated for removal). Both nav surface (primary/secondary gradient over black) and hero (purple gradient) are saturated dark → `on-dark` variant works for both
- [x] 1.2 Grep for `<Link.*className=.*btn` — call sites: `Nav.tsx` (×3 nav→on-dark), `Empty.tsx`, `EmptyList.tsx` (primary), `ListDetails.tsx` (base .btn — exit preview), `ProfileHeader.tsx` (secondary), `SortItems.tsx` (primary)
- [x] 1.3 `.if-lp-chip button` is a single-press × remove inside multi-select chips — NOT a toggle. Already has `aria-label`. Sm-size candidate. The sibling `if-lp-trigger` and `if-lp-opt` are form-input-styled, not button-styled, and stay as-is
- [x] 1.4 `FollowButton.tsx` already has `aria-pressed` + variant prop (primary|secondary). `BookmarkButton.tsx` also already has `aria-pressed`. Both migrate to `<Button pressed={…}>`; FollowButton keeps a variant prop since it's used in both hero and non-hero contexts
- [x] 1.5 Follow-up audit (explore mode) found surfaces missed in the initial recon. In-scope additions:
  - `SpoilerToggle` is a variant-switching toggle (`.btn primary` ↔ `.btn secondary`) — migrate to single-variant `<Button pressed={…}>` (Decision 11)
  - `ImageUrlInput`'s `.if-search-link` and `CollapsibleRail`'s `.rail-see-all` are text-button affordances — add `variant="link"` (Decision 12)
  - `ItemsToolbar` `.items-toolbar-chip` and `ListSelection` `.if-lp-chip` are label + remove-× chips — introduce `<Chip>` primitive (Decision 13)
- [x] 1.6 Audit confirms in-scope deletions: `app/ui/components/Form/FormButton.tsx` (duplicate of new `<Button isLoading>`); `app/(main)/lists/ui/components/EditListButton.tsx` (className-passthrough wrapper feeding two semantically-different call sites — inline at each site)
- [x] 1.7 Documented exemptions (not migrated, not deferred): `AppNav.tsx` nav items (separate DS primitive — icon-above-label, `aria-current="page"` pill); `CollapsibleRail.tsx` `.rail-toggle` (heading-button: whole heading + chevron expands a section). The hamburger button (`.app-nav-toggle`) MAY migrate to `<Button variant="ghost">` for focus-ring/min-touch enforcement — decide during sweep
- [x] 1.8 Deferral list for follow-up change `standardize-menus-and-controls`: `<Menu>`/`<MenuItem>` family (`ListActionsMenu` `.menu-item` rows, `UserAvatarPopover` `.avatar-popover-item` rows); `<SegmentedControl>` (`VisibilityPicker` Private/Shared, `ItemsToolbar` view-toggle grid/list); `<PopoverTrigger>` (`StoreFilterPopover`, `PriceFilterPopover`, `ItemsToolbar` `.items-toolbar-filters-trigger`, `ListSelection` `.if-lp-trigger`). Wrapper components stay as-is here

## 2. Tokens

- [x] 2.1 Add to `app/ui/styles/global.css`: `--btn-radius`, `--btn-padding-y`, `--btn-padding-x`, `--btn-font-size`, `--btn-font-weight`, `--btn-min-height: 44px`, `--btn-min-width: 44px`, `--btn-focus-ring-color`
- [x] 2.2 Add small-size siblings: `--btn-sm-padding-y`, `--btn-sm-padding-x`, `--btn-sm-font-size`, `--btn-sm-min-height` (≥24px), `--btn-sm-min-width` (≥24px)

## 3. Shared component infrastructure

- [x] 3.1 Create directory `app/ui/components/button/`
- [x] 3.2 Create `types.ts` exporting `ButtonVariant` (`'primary' | 'secondary' | 'ghost' | 'danger' | 'on-dark'`), `ButtonSize` (`'sm' | 'md'`), and any shared prop interface
- [x] 3.3 Create `buttonClasses.ts` exporting `buttonClasses({ variant, size, extra }): string` — `pressed` lives on the component (it sets aria-pressed, which CSS reads via attribute selector); class composition itself doesn't need it
- [x] 3.4 Focus-ring decision: default `--btn-focus-ring-color: var(--primary-color)` for light-surface variants; per-variant CSS override for `.btn.on-dark` to white. Implementation in section 4
- [x] 3.5 Added `'link'` to `ButtonVariant` union in `types.ts`

## 4. `.btn` base + variant CSS rewrite

- [x] 4.1 Rewrite `.btn` in `app/ui/styles/button.css` to consume the new tokens (replace hardcoded 12px padding, 16px font, 6px radius, 1px border) and apply `min-height: var(--btn-min-height); min-width: var(--btn-min-width)`
- [x] 4.2 Rewrite `.primary`, `.secondary`, `.ghost` (new — replaces `.outline`), `.danger`, `.on-dark` (new — replaces `.nav`) variants; scoped under `.btn.<variant>` so they don't collide with `.primary`-named utility classes elsewhere
- [x] 4.3 Add `.btn-sm` modifier consuming `--btn-sm-*` tokens
- [x] 4.4 Add pressed-state styling — `.btn.on-dark[aria-pressed="true"]` with hover counter-state
- [x] 4.5 Wrap every variant `:hover` rule in `@media (hover: hover)`
- [x] 4.6 Add `:focus-visible` styling using `--btn-focus-ring-color` (with override to white for `.on-dark`)
- [x] 4.7 Add `.btn-spinner` CSS (pure-CSS animated spinner)
- [x] 4.8 Removed the `@media (max-width: 1000px)` rules and the `.nav`/`.outline`/`.mobile-small` classes — call-site migration in section 8 replaces all remaining users
- [x] 4.9 Added `.btn.primary[aria-pressed="true"]` (filled treatment) + `@media (hover: hover)` counter-state. Narrow scope — `secondary`/`ghost`/`danger` deferred (no current consumer; SpoilerToggle dropped per §8.7, FollowButton's primary variant is the only live pressed-state caller)
- [x] 4.10 Added `.btn.link` variant CSS: transparent bg, no border, `padding: 0`, `color: var(--primary-color)`, `min-height/min-width: 0` (text-button exemption documented inline citing WCAG 2.5.8 spacing exception). Underline on `@media (hover: hover)`

## 5. `<Button>` component

- [x] 5.1 Created `app/ui/components/button/Button.tsx` with forwardRef, accepting `variant`, `size`, `isLoading`, `pressed`, and forwarding all native `<button>` HTML attributes
- [x] 5.2 Uses `buttonClasses()`; caller-supplied `className` merged via `extra`
- [x] 5.3 `isLoading` sets `disabled` + `aria-busy="true"` + renders `<span className="btn-spinner" aria-hidden />` alongside children
- [x] 5.4 `pressed === undefined` → no `aria-pressed` attribute; defined → emits `aria-pressed={pressed}`
- [x] 5.5 Index file created at `app/ui/components/button/index.ts`. The old `app/ui/components/Button.tsx` had zero imports across the codebase — deleted outright (no re-export shim needed)

## 6. `<LinkButton>` component

- [x] 6.1 Created `app/ui/components/button/LinkButton.tsx` wrapping Next `<Link>` via forwardRef
- [x] 6.2 Uses `buttonClasses()` — identical helper as `<Button>`
- [x] 6.3 `pressed` handled identically to `<Button>`; no `isLoading` prop
- [x] 6.4 Re-exported from index

## 6b. `<Chip>` primitive (per Decision 13)

- [x] 6b.1 Created `app/ui/components/chip/` directory with `Chip.tsx`, `chipClasses.ts`, `index.ts`
- [x] 6b.2 `Chip.tsx` renders `<span class="chip">` containing the label children and `<button class="chip-remove" aria-label="Remove {label-text}">×</button>`. Props: `onRemove`, `children`, `removeLabel?`, `disabled?`, `className?`
- [x] 6b.3 `chipClasses.ts` exports a small helper returning `'chip'` (+ optional `extra`). Remove `<button>` is a raw element with its own `.chip-remove` class consuming the button-system focus/hover/disabled pattern — cleaner DOM than nesting a full `<Button>` inside a `<span>`
- [x] 6b.4 Added `.chip` and `.chip-remove` CSS to `app/ui/styles/button.css`. Introduced `--chip-padding-y/-x/-font-size/-radius/-gap` tokens (in lieu of an `xs` button tier, since no other surface consumes that size) — matches the pre-existing chip dimensions across `.items-toolbar-chip` and `.if-lp-chip`
- [x] 6b.5 Re-exported `<Chip>` from `app/ui/components/chip/index.ts`

## 7. Slice migration + gut-check

- [x] 7.1 Slice migration done: Nav.tsx (on-dark Link), Empty.tsx (primary Link + button), DeleteListButton (danger), BookmarkButton (on-dark + pressed + aria-label), FollowButton (variant prop + pressed + aria-label)
- [x] 7.2 Slice verified in preview — `.btn.primary` "New List" computed min-height 44px, font-size 15px, transparent fill, primary color text. Token system live
- [~] 7.3 Focus-visible verification deferred to full visual review at section 11
- [~] 7.4 Mobile-width inspection deferred to section 11
- [x] 7.5 Go: tokens working, no console errors. Proceeded to sweep

## 8. Sweep remaining call sites

- [x] 8.1 Migrated FormShell.tsx (Cancel→ghost, Submit→primary with isLoading) + ChooseItemsForm sticky footer + DeleteListButton + DeleteItemButton (all form-shell-btn-\* call sites)
- [x] 8.2 Migrated all remaining `.btn` className usages across the listed areas. Note: `ShareButton.tsx` was found via template-literal grep miss and migrated to `on-dark`
- [x] 8.3 BookmarkButton migrated to `<Button variant="on-dark" pressed={…} aria-label="Bookmark list" | "Remove bookmark">`. FollowButton already had aria-pressed; migrated to `<Button>` keeping its variant prop. **Visual change for bookmark**: was `.btn secondary` (light fill on purple) → now `on-dark` (transparent + white border on purple). Intentional per Decision 5
- [x] 8.4 All Link-styled-as-button call sites migrated to `<LinkButton>`: Nav, Empty, EmptyList, ListDetails (Exit preview, Choose items), ProfileHeader, SortItems
- [x] 8.5 Page-scoped one-off decisions: `items-page-btn` → `<Button variant="ghost"|"primary" size="sm">` with aria-current; `choose-items-new-btn` → `<Button variant="primary" size="sm">`; `list-hero-btn` → `<LinkButton variant="on-dark">` (no size since these aren't dense); `menu-trigger` → `<Button variant="on-dark" className="menu-trigger">` keeping the page-scoped 36px circular override (WCAG 2.5.8 spacing exception documented inline at list.css:244-246). `if-lp-chip button` is a single-press × remove inside a chip — not migrated (it's not styled as a .btn; already has aria-label)
- [x] 8.6 **StoreLinks migrated** per proposal expansion: `<LinkButton variant="primary" size="sm">` for buy-links (primary + extras), `<Button variant="ghost" size="sm">` for the +N expand toggle. Tried `sm` per the proposal's open question; `sm`'s 32px floor caused row-wrap height jumps inside item cards. Resolved via the documented "custom class exception" pattern: page-scoped `.btn.storeLinks-link` and `.btn.storeLinks-more` override the design-system min-height/padding/font/radius back to the original chip dimensions (~22px tall) AND override the variant colors with the original buy-link lavender CTA fill (`--buy-link-bg/-border/-text`) and a muted neutral chip fill for +N. Design system still owns base structure (display, focus-visible, hover-on-touch guards, aria handling); page-scoped CSS owns chip-specific size+color. No `xs` tier added. _(Update: superseded by `replace-storelinks-expand-with-popover`. The wrap problem the chip-dimension override addressed no longer exists — extras live in a `<Menu>` popover, the chip row is single-row grid, and the chips use the standard `sm` 32px dimensions without override. The Button/LinkButton primitive choice from this task remains valid.)_
- [x] 8.7 Deleted `SpoilerToggle.tsx` and its `.spoiler-toggle` / `.state-badge` CSS (zero importers — replaced upstream by `MenuLinkItem`-driven spoiler hrefs in `ListActionsMenu.tsx`)
- [x] 8.8 Migrated `ImageUrlInput.tsx` `.if-search-link` → `<Button variant="link">`. Page-scoped `.if-search-link` CSS deleted
- [x] 8.9 Migrated `CollapsibleRail.tsx` `.rail-see-all` raw `<a>` → `<LinkButton variant="link">`. Page-scoped `.rail-see-all` CSS deleted (the uppercase/arrow flourish was dropped in favor of the design-system link treatment)
- [x] 8.10 Migrated `ItemsToolbar.tsx` active-filter chips → `<Chip onRemove={c.onClear}>{c.label}</Chip>` with `removeLabel={`Remove filter: ${c.label}`}`. Page-scoped `.items-toolbar-chip` CSS deleted (the `.items-toolbar-chips` grid wrapper stays — it's the row container, not the chip)
- [x] 8.11 Migrated `ListSelection.tsx` selected-list chips → `<Chip onRemove={() => remove(s.value)}>{s.label}</Chip>` with `disabled={isPending}`. Page-scoped `.if-lp-chip` body CSS deleted; `.if-lp-trigger`/`.if-lp-opt` left in place (deferred to `standardize-menus-and-controls`)
- [x] 8.12 ListDetails is a server component, so the `useState` pattern can't be inlined there. Instead, extracted a single-purpose client component `EditListAction.tsx` that owns the `[open, setOpen]` + `<Button variant="on-dark">` + conditional `<ListFormContainer>`. Replaces the className-passthrough antipattern with a purposeful client wrapper for the one remaining call site
- [x] 8.13 Deleted `app/ui/components/Form/FormButton.tsx` AND `app/ui/components/Form/CancelSubmitButtons.tsx` (zero callers; the empty `Form/` directory was removed too)
- [x] 8.14 Decision: keep `.app-nav-toggle` page-scoped with documented exemption per recon 1.7 — it's a nav primitive (38px circular, different from the standard button shape) with all required ARIA already wired (aria-label, aria-expanded, aria-haspopup). Migration would have required overriding `.btn`'s 44px floor + padding back to the existing 38px treatment, no real benefit

## 9. Icon-only `aria-label` audit

- [x] 9.1 aria-labels confirmed: `ListActionsMenu` (already had "List actions"), `Pagination` (prev/next/page N — all already had aria-label), `DeleteListButton`/`DeleteItemButton` (text "Delete" — not icon-only, so no aria-label needed)
- [x] 9.2 `BookmarkButton`: state-aware aria-label "Bookmark list" / "Remove bookmark", pressed wired. `FollowButton`: state-aware aria-label using the dynamic `label` var ("Follow X" / "Following"), pressed wired
- [x] 9.3 `if-lp-chip button` is single-press (×-remove from multi-select), not a toggle. No `pressed` needed

## 10. Cleanup

- [x] 10.1 Deleted `.form-shell-btn-primary/-ghost/-delete` styles + mobile-shrink block from form-shell.css
- [x] 10.2 Deleted `.bookmark-button` and `.follow-button` color/layout rules from following-and-history.css
- [x] 10.3 Deleted `.items-page-btn` (+ `:hover`, `.active`, `:disabled` variants), `.choose-items-new-btn`, and `.buy-link*` (replaced with `.storeLinks-link*` animation-only hooks). Kept `.list-hero-actions .menu-trigger` (36px circular kebab) as a documented WCAG 2.5.8 spacing-exception override. _(Update: the "animation-only hooks" portion is superseded by `replace-storelinks-expand-with-popover` — the chip-row no longer animates anything, so the `.storeLinks-link_`rules are now static color/structure hooks only. The`.buy-link*` deletion described here remains valid.)*
- [x] 10.4 Old `app/ui/components/Button.tsx` deleted (had zero importers — no shim needed)
- [x] 10.5 Repo grep clean: no `className=".*\bbtn\b"` matches outside `app/ui/components/button/`, `.gsi-material-button`, and the page-scoped `menu-trigger` override
- [x] 10.6 Folded into §8.13 (FormButton + CancelSubmitButtons deletion happens there since there's nothing to migrate first)
- [x] 10.7 Deleted `EditListButton.tsx` (post §8.12). Zero importers verified via grep
- [x] 10.8 Deleted `.items-toolbar-chip` and `.if-lp-chip` body CSS (post §8.10/§8.11). `.if-lp-trigger`/`.if-lp-opt` retained per deferral
- [x] 10.9 Deleted `.if-search-link` and `.rail-see-all` CSS (post §8.8/§8.9)
- [x] 10.10 Repo grep clean: zero matches for `FormButton`/`EditListButton`/`SpoilerToggle` (JSX or imports) and zero matches for the deleted classes. Only `.items-toolbar-chips` row container remains (intentional — it wraps the new `<Chip>` instances)

## 11. Verification

- [x] 11.1 Verified in preview against dev-auth-bypass: home (CollapsibleRail "See all" → `.btn.link` purple, transparent, no min-height ✓), list detail hero on Alice's "Baby on the Way" (Share/Choose items/Edit list all `.btn.on-dark`, computed 44px tall ✓; kebab 36×36 page-scoped exemption holds ✓), items grid (Claim CTA 44px, Fully claimed pill 44px gray-700/secondary-bg, You-claimed pill 44px green-700/success-bg — all newly aligned ✓), items toolbar Active filters chip (`<span class="chip">` + `<button class="chip-remove" aria-label="Remove filter: …">×</button>`, 999px radius, purple-on-card-accent ✓). ImageUrlInput / ListSelection chip use the same exported primitives so the CSS contract is proven without re-triggering the modal flow
- [x] 11.2 No layout broke under the 44px floor on inspected surfaces. The only sub-floor surfaces are documented exemptions (kebab `.menu-trigger` 36px, `.btn.link` text-button exemption, `.chip-remove` per WCAG 2.5.8 spacing)
- [x] 11.3 `preview_inspect` confirmed: `.btn.primary` claim CTA 44px, `.btn.on-dark` hero buttons 44px, `.claimed-state` pills 44px (raised to match)
- [x] 11.4 `:focus-visible` rules verified live in cascade: `.btn:focus-visible { outline: 2px solid var(--btn-focus-ring-color); outline-offset: 2px }` and `.btn.on-dark:focus-visible { outline-color: rgb(255, 255, 255) }`. `:focus-visible` can't be simulated programmatically (browser security), but the rules are loaded and will fire on real keyboard Tab
- [x] 11.5 Hover styles verified guarded by `@media (hover: hover)` (confirmed in button.css). `aria-pressed` verified on BookmarkButton + FollowButton + the new claimed pill via inspection (BookmarkButton: aria-pressed wires bookmarked state; claimed pill: aria-label="Remove your claim" + whole-pill click target replaces the inner Undo button)
- [x] 11.6 `npm run lint` and `tsc --noEmit` both pass clean after the full sweep
- [x] 11.7 `redesign-home-and-tokens` only mentions buttons in passing ("brand colors drive buttons") — no `--btn-*` references, no button-surface decisions. No cross-change update needed

## 12. Follow-up flagging

- [x] 12.1 PR-description note captured: list-hero `--hero-gradient` vs nav solid-color surface inconsistency is adjacent drift not fixed here; belongs to `redesign-home-and-tokens` or a separate change
- [x] 12.2 PR-description note captured: `<LinkButton>` deliberately ships without a loading/navigating state. If a real caller needs one, file a follow-up change rather than retrofitting
- [x] 12.3 No follow-up `standardize-menus-and-controls` change needed — all three primitives already landed during the 1.0 sweep alongside this work: `app/ui/components/menu/` (`<Menu>` + `<MenuItem>` + `<MenuLinkItem>`, used by `ListActionsMenu`, `UserAvatarPopover` via `AppMenu`), `app/ui/components/segmented-control/` (`<SegmentedControl>` + `<SegmentedOption>`, used by `VisibilityPicker`, `ItemsToolbar` view-toggle), `app/ui/components/popover-trigger/` (`<PopoverTrigger>`, used by `StoreFilterPopover`, `PriceFilterPopover`, `ItemsToolbar` filters trigger, `ListSelection` trigger). All consume the same `--btn-*` token surface and focus/hover/min-touch contract from this change
- [x] 12.4 PR-description note captured: `AppNav.tsx` nav items + `CollapsibleRail.tsx` `.rail-toggle` are documented exemptions, not gaps. Each is a separate DS primitive (nav-item, heading-button) with a single call site — abstraction not earned. Revisit if a second call site appears
