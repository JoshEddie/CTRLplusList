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
- [ ] 3.5 Add `'link'` to `ButtonVariant` union in `types.ts` (per Decision 12)

## 4. `.btn` base + variant CSS rewrite

- [x] 4.1 Rewrite `.btn` in `app/ui/styles/button.css` to consume the new tokens (replace hardcoded 12px padding, 16px font, 6px radius, 1px border) and apply `min-height: var(--btn-min-height); min-width: var(--btn-min-width)`
- [x] 4.2 Rewrite `.primary`, `.secondary`, `.ghost` (new — replaces `.outline`), `.danger`, `.on-dark` (new — replaces `.nav`) variants; scoped under `.btn.<variant>` so they don't collide with `.primary`-named utility classes elsewhere
- [x] 4.3 Add `.btn-sm` modifier consuming `--btn-sm-*` tokens
- [x] 4.4 Add pressed-state styling — `.btn.on-dark[aria-pressed="true"]` with hover counter-state
- [x] 4.5 Wrap every variant `:hover` rule in `@media (hover: hover)`
- [x] 4.6 Add `:focus-visible` styling using `--btn-focus-ring-color` (with override to white for `.on-dark`)
- [x] 4.7 Add `.btn-spinner` CSS (pure-CSS animated spinner)
- [x] 4.8 Removed the `@media (max-width: 1000px)` rules and the `.nav`/`.outline`/`.mobile-small` classes — call-site migration in section 8 replaces all remaining users
- [ ] 4.9 Extend pressed-state CSS beyond `on-dark` (per Decision 11). Add `.btn.<variant>[aria-pressed="true"]` for `primary`, `secondary`, `ghost`, `danger` — pattern: inverted treatment (filled-when-outlined or outlined-when-filled), `@media (hover: hover)` counter-state for each. Required by SpoilerToggle's migration in §8.7
- [ ] 4.10 Add `.btn.link` variant CSS (per Decision 12): transparent bg, no border, `padding: 0`, `color: var(--primary-color)`, `min-height/min-width` unset (text-button exemption), `@media (hover: hover)` adds `text-decoration: underline`. Document the WCAG 2.5.8 spacing-exception rationale inline in the CSS

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

- [ ] 6b.1 Create `app/ui/components/chip/` directory with `Chip.tsx`, `chipClasses.ts`, `index.ts`
- [ ] 6b.2 `Chip.tsx`: renders `<span class="chip">` containing the label (children) and a `<button class="chip-remove" aria-label="Remove {label-text}">×</button>`. Props: `onRemove: () => void`, `children: ReactNode`, optional `removeLabel?: string` override when children aren't a string
- [ ] 6b.3 `chipClasses.ts`: consumes `buttonClasses({ variant: 'secondary', size: 'xs' })` internally for the chip body's focus/hover/min-touch contract, then composes the chip-specific class. The remove `<button>` is a `<Button variant="ghost" size="xs">` under the hood OR a raw element that consumes `buttonClasses()` — pick based on which yields the cleaner DOM
- [ ] 6b.4 Add `.chip` and `.chip-remove` CSS to `app/ui/styles/button.css` (or a new `chip.css` imported alongside): pill shape, label color, remove-button hover treatment. Reuse `--btn-xs-*` tokens. **No new `--chip-*` tokens unless the design demands a distinct treatment.**
- [ ] 6b.5 Re-export `<Chip>` from a new `app/ui/components/chip/index.ts`

## 7. Slice migration + gut-check

- [x] 7.1 Slice migration done: Nav.tsx (on-dark Link), Empty.tsx (primary Link + button), DeleteListButton (danger), BookmarkButton (on-dark + pressed + aria-label), FollowButton (variant prop + pressed + aria-label)
- [x] 7.2 Slice verified in preview — `.btn.primary` "New List" computed min-height 44px, font-size 15px, transparent fill, primary color text. Token system live
- [~] 7.3 Focus-visible verification deferred to full visual review at section 11
- [~] 7.4 Mobile-width inspection deferred to section 11
- [x] 7.5 Go: tokens working, no console errors. Proceeded to sweep

## 8. Sweep remaining call sites

- [x] 8.1 Migrated FormShell.tsx (Cancel→ghost, Submit→primary with isLoading) + ChooseItemsForm sticky footer + DeleteListButton + DeleteItemButton (all form-shell-btn-* call sites)
- [x] 8.2 Migrated all remaining `.btn` className usages across the listed areas. Note: `ShareButton.tsx` was found via template-literal grep miss and migrated to `on-dark`
- [x] 8.3 BookmarkButton migrated to `<Button variant="on-dark" pressed={…} aria-label="Bookmark list" | "Remove bookmark">`. FollowButton already had aria-pressed; migrated to `<Button>` keeping its variant prop. **Visual change for bookmark**: was `.btn secondary` (light fill on purple) → now `on-dark` (transparent + white border on purple). Intentional per Decision 5
- [x] 8.4 All Link-styled-as-button call sites migrated to `<LinkButton>`: Nav, Empty, EmptyList, ListDetails (Exit preview, Choose items), ProfileHeader, SortItems
- [x] 8.5 Page-scoped one-off decisions: `items-page-btn` → `<Button variant="ghost"|"primary" size="sm">` with aria-current; `choose-items-new-btn` → `<Button variant="primary" size="sm">`; `list-hero-btn` → `<LinkButton variant="on-dark">` (no size since these aren't dense); `menu-trigger` → `<Button variant="on-dark" className="menu-trigger">` keeping the page-scoped 36px circular override (WCAG 2.5.8 spacing exception documented inline at list.css:244-246). `if-lp-chip button` is a single-press × remove inside a chip — not migrated (it's not styled as a .btn; already has aria-label)
- [x] 8.6 **StoreLinks migrated** per proposal expansion: `<LinkButton variant="primary" size="sm">` for buy-links (primary + extras), `<Button variant="ghost" size="sm">` for the +N expand toggle. Tried `sm` per the proposal's open question; `sm`'s 32px floor caused row-wrap height jumps inside item cards. Resolved via the documented "custom class exception" pattern: page-scoped `.btn.storeLinks-link` and `.btn.storeLinks-more` override the design-system min-height/padding/font/radius back to the original chip dimensions (~22px tall) AND override the variant colors with the original buy-link lavender CTA fill (`--buy-link-bg/-border/-text`) and a muted neutral chip fill for +N. Design system still owns base structure (display, focus-visible, hover-on-touch guards, aria handling); page-scoped CSS owns chip-specific size+color. No `xs` tier added. *(Update: superseded by `replace-storelinks-expand-with-popover`. The wrap problem the chip-dimension override addressed no longer exists — extras live in a `<Menu>` popover, the chip row is single-row grid, and the chips use the standard `sm` 32px dimensions without override. The Button/LinkButton primitive choice from this task remains valid.)*
- [ ] 8.7 Migrate `SpoilerToggle.tsx` from variant-switching (`.btn primary` ↔ `.btn secondary`) to single-variant `<Button pressed={showSpoilers}>`. Pick the variant during visual review (start with `secondary`, fall back to `ghost` if the pressed-fill doesn't read). The ON/OFF state-badge stays as page-scoped children inside the button. Requires §4.9 (pressed-state CSS for the chosen variant)
- [ ] 8.8 Migrate `ImageUrlInput.tsx` `.if-search-link` to `<Button variant="link">`. Delete the page-scoped `.if-search-link` CSS after migration
- [ ] 8.9 Migrate `CollapsibleRail.tsx` `.rail-see-all` from raw `<a>` to `<LinkButton variant="link">`. Delete the page-scoped `.rail-see-all` CSS after migration
- [ ] 8.10 Migrate `ItemsToolbar.tsx` active-filter chips from `.items-toolbar-chip` raw `<button>` to `<Chip onRemove={c.onClear}>{c.label}</Chip>`. Delete the page-scoped `.items-toolbar-chip` CSS after migration
- [ ] 8.11 Migrate `ListSelection.tsx` selected-list chips (the `.if-lp-chip` `<span>` + nested × `<button>`) to `<Chip onRemove={() => remove(s.value)}>{s.label}</Chip>`. Delete the page-scoped `.if-lp-chip` CSS (the chip body — NOT `.if-lp-trigger` or `.if-lp-opt`, which are deferred to `standardize-menus-and-controls`)
- [ ] 8.12 Inline `EditListButton`'s `useState`-and-modal pattern at its two call sites:
  - In `ListDetails.tsx`: replace the `<EditListButton list={list} user_id={list.user_id} className={buttonClasses({ variant: 'on-dark' })}>` with a local `[editOpen, setEditOpen]` + `<Button variant="on-dark" onClick={() => setEditOpen(true)}>` + conditional `<ListFormContainer>` render
  - In `ListActionsMenu.tsx`: replace the `<EditListButton list={list} user_id={list.user_id} className="menu-item" onOpen={close}>` with a local `[editOpen, setEditOpen]` + the existing `.menu-item`-styled `<button>` row (kept page-scoped — `.menu-item` is deferred to `standardize-menus-and-controls`) + conditional `<ListFormContainer>` render
  - Both call sites import `ListFormContainer` directly
- [ ] 8.13 Grep for `FormButton` callers across the codebase; migrate each to `<Button variant="primary" isLoading={…}>`. Typical pattern: a form submit button that was `<FormButton isLoading={…}>Save</FormButton>` becomes `<Button variant="primary" type="submit" isLoading={…}>Save</Button>`
- [ ] 8.14 Decide on `AppNav.tsx` `.app-nav-toggle` (hamburger) — migrate to `<Button variant="ghost" size="sm" aria-label={open ? 'Close menu' : 'Open menu'}>` for focus-ring/min-touch enforcement, OR keep page-scoped with documented exemption. Nav items (`.app-nav-item`) stay page-scoped regardless (Decision: documented exemption per recon 1.7)

## 9. Icon-only `aria-label` audit

- [x] 9.1 aria-labels confirmed: `ListActionsMenu` (already had "List actions"), `Pagination` (prev/next/page N — all already had aria-label), `DeleteListButton`/`DeleteItemButton` (text "Delete" — not icon-only, so no aria-label needed)
- [x] 9.2 `BookmarkButton`: state-aware aria-label "Bookmark list" / "Remove bookmark", pressed wired. `FollowButton`: state-aware aria-label using the dynamic `label` var ("Follow X" / "Following"), pressed wired
- [x] 9.3 `if-lp-chip button` is single-press (×-remove from multi-select), not a toggle. No `pressed` needed

## 10. Cleanup

- [x] 10.1 Deleted `.form-shell-btn-primary/-ghost/-delete` styles + mobile-shrink block from form-shell.css
- [x] 10.2 Deleted `.bookmark-button` and `.follow-button` color/layout rules from following-and-history.css
- [x] 10.3 Deleted `.items-page-btn` (+ `:hover`, `.active`, `:disabled` variants), `.choose-items-new-btn`, and `.buy-link*` (replaced with `.storeLinks-link*` animation-only hooks). Kept `.list-hero-actions .menu-trigger` (36px circular kebab) as a documented WCAG 2.5.8 spacing-exception override. *(Update: the "animation-only hooks" portion is superseded by `replace-storelinks-expand-with-popover` — the chip-row no longer animates anything, so the `.storeLinks-link*` rules are now static color/structure hooks only. The `.buy-link*` deletion described here remains valid.)*
- [x] 10.4 Old `app/ui/components/Button.tsx` deleted (had zero importers — no shim needed)
- [x] 10.5 Repo grep clean: no `className=".*\bbtn\b"` matches outside `app/ui/components/button/`, `.gsi-material-button`, and the page-scoped `menu-trigger` override
- [ ] 10.6 Delete `app/ui/components/Form/FormButton.tsx` (post §8.13). Verify zero remaining importers via grep
- [ ] 10.7 Delete `app/(main)/lists/ui/components/EditListButton.tsx` (post §8.12). Verify zero remaining importers via grep
- [ ] 10.8 Delete `.items-toolbar-chip` CSS (post §8.10) and `.if-lp-chip` CSS body — NOT `.if-lp-trigger`/`.if-lp-opt`, which stay (deferred to follow-up change)
- [ ] 10.9 Delete `.if-search-link` CSS (post §8.8) and `.rail-see-all` CSS (post §8.9)
- [ ] 10.10 Re-run repo grep: confirm no remaining `<FormButton>` or `<EditListButton>` JSX, and no remaining `.items-toolbar-chip` / `.if-lp-chip` / `.if-search-link` / `.rail-see-all` class references

## 11. Verification

- [ ] 11.1 Full visual review across the dev-auth-bypass preview: home, list detail (hero buttons), item detail, choose-items, item form, list form, settings/connections, history, following, profile — screenshot dense layouts and confirm intent matches design
- [ ] 11.2 For any layout broken by the 44px floor, promote the offender to `size="sm"` (or keep page-scoped with documented exemption)
- [ ] 11.3 Mobile-width inspection: `preview_inspect` confirms no standard button computes under 44px height/width
- [ ] 11.4 Keyboard-only walkthrough of one full page confirms `:focus-visible` rings on every interactive button
- [ ] 11.5 Touch emulation (DevTools or real iOS): tap a primary button and a bookmark button; confirm no sticky hover and that `aria-pressed` reads correctly in a screen reader
- [ ] 11.6 Run `npm run lint` and `npm run typecheck` (or project equivalents); resolve issues
- [ ] 11.7 If `redesign-home-and-tokens` references button surfaces, update its design.md or questions.md noting the shared `--btn-*` token surface now exists

## 12. Follow-up flagging

- [ ] 12.1 Note in the PR description that the list-hero `--hero-gradient` vs nav solid-color surface inconsistency is adjacent drift not fixed here, and belongs to `redesign-home-and-tokens` or a separate change
- [ ] 12.2 If `<LinkButton>` callers ever surface a need for a loading/navigating state, file a follow-up change rather than expanding scope here
- [ ] 12.3 File / write up the follow-up change `standardize-menus-and-controls` covering the deferred surfaces (per recon 1.8): `<Menu>` + `<MenuItem>` + `<MenuLinkItem>` family, `<SegmentedControl>` + `<SegmentedOption>`, `<PopoverTrigger>`. Note PR-description dependency: lands after this change, depends on `<Button>` / `buttonClasses` / token surface being in place
- [ ] 12.4 Note that `AppNav.tsx` nav items and `CollapsibleRail.tsx` `.rail-toggle` are documented exemptions, not gaps — they're separate DS primitives (nav-item, heading-button) that don't earn abstraction at one call site each. If a second call site of either pattern surfaces later, revisit
