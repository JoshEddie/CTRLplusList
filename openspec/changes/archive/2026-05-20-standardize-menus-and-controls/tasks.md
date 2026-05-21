## 1. Preconditions and reconnaissance

- [x] 1.1 Confirm `standardize-buttons` has merged to `main` (or the target integration branch). This change MUST land after it — the new primitives import `buttonClasses` from `app/ui/components/button/` and consume the `--btn-*` token surface plus the pressed-state CSS established there
- [x] 1.2 Grep current implementations of the patterns being replaced to confirm the call-site inventory matches the proposal: `grep -rn 'role="menu"\|role="menuitem"\|role="radiogroup"\|role="radio"' app/`; cross-check against `ListActionsMenu`, `UserAvatarPopover`, `VisibilityPicker`, `ItemsToolbar` (view-toggle and filters-trigger), `StoreFilterPopover`, `PriceFilterPopover`, `ListSelection`
- [x] 1.3 Audit `VisibilityPicker`'s current visual treatment in preview (`/lists/<id>` on the dev-auth-bypass seed) — capture screenshots of the Private/Shared toggle to use as the canonical reference for `tone="on-dark"`. The new primitive must match this treatment after migration (open question in design.md)
- [x] 1.4 Audit `ItemsToolbar`'s view-toggle treatment in preview (`/items`) — capture screenshots. Note: the view-toggle currently uses `aria-pressed` (wrong primitive for a mutually-exclusive choice); confirm with one final pass that there is no real concurrent state where both could be active

## 2. `usePopoverDismiss` hook (shared infrastructure)

- [x] 2.1 Create `app/ui/hooks/usePopoverDismiss.ts` exporting `usePopoverDismiss({ open, onClose, ref }: { open: boolean; onClose: () => void; ref: RefObject<HTMLElement | null> }): void`
- [x] 2.2 Implementation: when `open` is true, register `mousedown` (outside-click) and `keydown` (Escape) listeners on `document`; unregister on cleanup; no-op when `open` is false
- [x] 2.3 Add lightweight unit-style sanity check by hand-using in `<Menu>` (next section) — formal hook tests are not in scope for this change

## 3. `<Menu>` primitive family

- [x] 3.1 Create directory `app/ui/components/menu/` with `index.ts`, `types.ts`, `menuClasses.ts`, `Menu.tsx`, `MenuItem.tsx`, `MenuLinkItem.tsx`
- [x] 3.2 `types.ts`: export `MenuItemTone` (`'default' | 'danger'`); shared icon-slot type if useful
- [x] 3.3 `menuClasses.ts`: export `menuItemClasses({ tone, extra }): string` — composes the `.menu-item` + tone modifier class string. Reuses `--btn-focus-ring-color` token in CSS (no new token surface)
- [x] 3.4 `Menu.tsx`: forwardRef component. Props: `open: boolean`, `onClose: () => void`, `anchorRef?: RefObject<HTMLElement | null>`, `children: ReactNode`, plus aria-label or aria-labelledby. Renders `<div role="menu">` with the popover-dismiss hook wired up; returns `null` when `!open`
- [x] 3.5 `Menu.tsx`: implement arrow-key navigation via `useEffect` that queries `[role="menuitem"]:not([aria-disabled="true"])` on each open, listens for `keydown` on the menu container, handles ArrowDown / ArrowUp (with wrap), Home, End. Returns focus to `anchorRef.current` on close
- [x] 3.6 `MenuItem.tsx`: forwardRef component. Props: `icon?: ReactNode`, `tone?: MenuItemTone`, plus all `<button>` HTML attributes. Renders `<button type="button" role="menuitem" className={menuItemClasses({ tone })}>` containing the icon + children. Defaults `type="button"` and uses `aria-pressed` / `aria-disabled` only if passed
- [x] 3.7 `MenuLinkItem.tsx`: forwardRef component. Props: `icon?: ReactNode`, `tone?: MenuItemTone`, plus all Next `LinkProps`. Renders Next `<Link role="menuitem" className={menuItemClasses({ tone })}>` containing the icon + children
- [x] 3.8 Add `.menu-item` base CSS to a new `app/ui/components/menu/menu.css` (imported from `Menu.tsx` or `index.ts`): full-bleed row, left-aligned icon, padding, hover/focus treatments. Reuses `--btn-focus-ring-color` and guards `:hover` with `@media (hover: hover)`. Adds `.menu-item.tone-danger` for the danger color
- [x] 3.9 Add `.menu` container CSS to the same file: positioning (absolute), shadow, border, background, min-width, max-height, scroll behavior — match the look established by the current `.menu-dropdown` and `.avatar-popover` (consolidate the two existing variants into one)
- [x] 3.10 Re-export `Menu`, `MenuItem`, `MenuLinkItem` from `app/ui/components/menu/index.ts`

## 4. Migrate `ListActionsMenu` to `<Menu>` (slice)

- [x] 4.1 Refactor `app/(main)/lists/ui/components/ListActionsMenu.tsx` to use `<Menu>` for the dropdown container; keep the kebab `<Button variant="on-dark" className="menu-trigger">` trigger as-is (already migrated to system); add `anchorRef` to the trigger's wrapping div
- [x] 4.2 Replace each `<Link className="menu-item">` with `<MenuLinkItem href={...} icon={...} onClick={close}>`. Apply to: Choose items, Show/Hide spoilers, Preview as viewer / Exit preview
- [x] 4.3 Replace the Edit list `<EditListButton className="menu-item">` (already inlined per `standardize-buttons` §8.12) with `<MenuItem icon={<MdModeEdit/>} onClick={() => { close(); setEditOpen(true); }}>Edit list</MenuItem>`
- [x] 4.4 Replace the Delete list `<button className="menu-item menu-item-danger">` with `<MenuItem icon={<MdDeleteForever/>} tone="danger" onClick={() => { close(); setShowConfirm(true); }}>Delete list</MenuItem>`
- [x] 4.5 Replace the hand-rolled click-outside / Escape `useEffect` with `usePopoverDismiss` — the `<Menu>` primitive owns this internally, so the wrapper's `useEffect` can be deleted
- [x] 4.6 Verify in preview: arrow-key navigation works, Escape closes + returns focus to the kebab trigger, click-outside closes, danger tone reads correctly. Capture before/after screenshots

## 5. Migrate `UserAvatarPopover` to `<Menu>`

- [x] 5.1 Refactor `app/(auth)/ui/components/UserAvatarPopover.tsx`: keep the `<button className="avatar-container">` trigger (it's an avatar image — page-scoped is correct); add `anchorRef` and `aria-haspopup="menu"` + `aria-expanded={open}` to the trigger
- [x] 5.2 Replace the `.avatar-popover` `<div role="menu">` with `<Menu open={open} onClose={close} anchorRef={ref}>`
- [x] 5.3 Keep the signed-in user header (`.avatar-popover-header`, `.avatar-popover-name`, `.avatar-popover-email`, `.avatar-popover-divider`) as page-scoped JSX inside `<Menu>` — it's not a menu item, it's a header. The header SHOULD have `role="presentation"` and NOT participate in arrow-key navigation
- [x] 5.4 Replace `<Link className="avatar-popover-item">` with `<MenuLinkItem href="/settings/connections" icon={<LuUsers/>} onClick={close}>Connections</MenuLinkItem>`
- [x] 5.5 The Sign out button uses a `<form action={signOutUser}>` — keep the form structure, but replace the inner `<button className="avatar-popover-item-button" type="submit">` with `<MenuItem type="submit" icon={<LuLogOut/>} onClick={close}>Sign out</MenuItem>`. Confirm `type="submit"` is honored by `<MenuItem>` (override the default `type="button"`)
- [x] 5.6 Delete the hand-rolled click-outside / Escape `useEffect`
- [x] 5.7 Verify in preview: avatar click opens menu, arrow keys navigate, Connections navigates, Sign out submits the form, Escape closes

## 6. Cleanup of menu CSS

- [x] 6.1 Delete `.menu-item`, `.menu-item-danger`, `.menu-dropdown` from `app/(main)/lists/ui/styles/list.css` (or wherever they live). Keep `.menu-trigger` (the documented exemption from `standardize-buttons`)
- [x] 6.2 Delete `.avatar-popover`, `.avatar-popover-item`, `.avatar-popover-divider`, `.avatar-popover-form`, `.avatar-popover-item-button` from auth styles. Keep `.avatar-popover-header`, `.avatar-popover-name`, `.avatar-popover-email`, `.avatar-popover-wrap`, `.avatar-container` (header content + trigger styling); `.avatar-popover-divider` retained because it's the presentation-only divider inside the menu header
- [x] 6.3 Repo grep: confirm no remaining `.menu-item` or `.avatar-popover-item` matches outside the new `app/ui/components/menu/` directory

## 7. `<SegmentedControl>` primitive family

- [x] 7.1 Create directory `app/ui/components/segmented-control/` with `index.ts`, `types.ts`, `segmentedClasses.ts`, `SegmentedControl.tsx`, `SegmentedOption.tsx`
- [x] 7.2 `types.ts`: export `SegmentedTone` (`'light' | 'on-dark'`); define the value-type generic so `<SegmentedControl<'private' | 'shared'>>` is type-safe
- [x] 7.3 `segmentedClasses.ts`: export `segmentedGroupClasses({ tone })` and `segmentedOptionClasses({ active, tone })`; consume `--btn-focus-ring-color` and the existing `--btn-*` size tokens
- [x] 7.4 `SegmentedControl.tsx`: generic forwardRef component. Props: `value: T`, `onChange: (v: T) => void`, `tone: SegmentedTone`, `children: ReactNode`, plus aria-label or aria-labelledby. Renders `<div role="radiogroup">`. Passes `value` and `onChange` down via React context so `<SegmentedOption>` reads them
- [x] 7.5 `SegmentedControl.tsx`: implement arrow-key navigation that BOTH moves focus AND fires `onChange` to the new option's value (radiogroup convention, NOT menu convention). Use a `keydown` listener on the group; on ArrowLeft/ArrowRight (and ArrowUp/ArrowDown for accessibility), compute next/previous option `value` from the DOM (`[role="radio"]`) and call `onChange` with it; wrap at ends
- [x] 7.6 `SegmentedOption.tsx`: generic forwardRef component. Props: `value: T`, `children: ReactNode`. Reads `value` and `onChange` from context. Renders `<button type="button" role="radio" aria-checked={isActive} tabIndex={isActive ? 0 : -1} onClick={() => onChange(value)}>`. Applies `segmentedOptionClasses({ active: isActive, tone })`
- [x] 7.7 Add segmented-control CSS to `app/ui/components/segmented-control/segmented-control.css`: container pill (rounded, padding, background per tone), option (transparent fill, active fill per tone). Light tone: neutral background + primary-color active fill. On-dark tone: transparent options + white active fill with primary-color text — match the canonical `VisibilityPicker` look from §1.3
- [x] 7.8 Re-export from `index.ts`

## 8. Migrate `VisibilityPicker` to `<SegmentedControl>` (slice)

- [x] 8.1 Refactor `app/(main)/lists/ui/components/VisibilityPicker.tsx`: replace the two `.visibility-option` `<button role="radio">` elements with `<SegmentedControl value={isShared ? 'shared' : 'private'} onChange={(v) => setShared(v === 'shared')} aria-label="List visibility" tone="on-dark">` containing `<SegmentedOption value="private"><FaLock/> Private</SegmentedOption>` and `<SegmentedOption value="shared"><FaShareAlt/> Shared</SegmentedOption>`
- [x] 8.2 Keep the wrapper's state machine intact (`useState<Visibility>`, `useTransition`, `apply()`, `setShared()`, `setInFeed()`, optimistic update + rollback on failure)
- [x] 8.3 Keep the "Show in followers' feed" checkbox as-is — it's not a segmented option, it's a native checkbox with a label
- [x] 8.4 Visual review in preview against the §1.3 screenshots. The active option's white-card-with-shadow treatment should match. If it doesn't, adjust the `tone="on-dark"` CSS in §7.7 (not the wrapper)
- [x] 8.5 Keyboard verification: arrow keys move selection AND fire onChange (server action runs on selection); Tab moves out of the group, not between options

## 9. Migrate `ItemsToolbar` view-toggle to `<SegmentedControl>`

- [x] 9.1 Refactor the `.view-toggle` block in `ItemsToolbar.tsx` (`ItemsToolbar.tsx:395-418`): replace with `<SegmentedControl value={view} onChange={(v) => updateParams({ view: v === 'grid' ? null : v })} aria-label="View toggle" tone="light">` containing `<SegmentedOption value="grid"><MdGridView/></SegmentedOption>` and `<SegmentedOption value="list"><MdViewList/></SegmentedOption>`
- [x] 9.2 Replace `aria-pressed` semantics with the new `aria-checked` model (which the primitive emits via `role="radio"`)
- [x] 9.3 Visual review: confirm the light tone treatment reads correctly on the items page background; the active option should be visually distinct without being heavy

## 10. Cleanup of segmented-control CSS

- [x] 10.1 Delete `.visibility-toggle`, `.visibility-option`, `.visibility-option-label` from list styles
- [x] 10.2 Delete `.view-toggle`, `.view-toggle-btn` from items-toolbar styles
- [x] 10.3 Repo grep: confirm no remaining matches

## 11. `<PopoverTrigger>` primitive

- [x] 11.1 Create directory `app/ui/components/popover-trigger/` with `index.ts`, `types.ts`, `triggerClasses.ts`, `PopoverTrigger.tsx`
- [x] 11.2 `types.ts`: define the props interface — `icon?: ReactNode`, `label: ReactNode`, `count?: number`, `active?: boolean`, plus all `<button>` HTML attributes including `aria-haspopup` / `aria-expanded`
- [x] 11.3 `triggerClasses.ts`: export `triggerClasses({ active, extra })`; reuse `--btn-focus-ring-color` and the existing min-touch contract
- [x] 11.4 `PopoverTrigger.tsx`: forwardRef component renders `<button type="button" className={triggerClasses({ active })}>` containing (in order) the icon, label, count badge (if `count`), and a chevron-right indicator. Forwards `aria-haspopup` and `aria-expanded` from props
- [x] 11.5 Add CSS to `app/ui/components/popover-trigger/popover-trigger.css`: form-input-shaped (border, background, rounded), icon-left + label + badge-right + chevron-right layout, active state styling. Min-height: 44px (per the button-system contract); padding consistent with other form inputs
- [x] 11.6 Re-export from `index.ts`

## 12. Migrate `StoreFilterPopover` to `<PopoverTrigger>` + `usePopoverDismiss`

- [x] 12.1 Refactor `app/(main)/items/ui/components/StoreFilterPopover.tsx`: replace the `.store-filter-trigger` `<button>` with `<PopoverTrigger icon={<MdFilterList/>} label="Stores" count={count || undefined} active={count > 0} onClick={() => setOpen(o => !o)} aria-haspopup="dialog" aria-expanded={open}>`
- [x] 12.2 Replace the hand-rolled click-outside / Escape `useEffect` with `usePopoverDismiss({ open, onClose: () => setOpen(false), ref: rootRef })`
- [x] 12.3 Migrate the footer Clear / Done buttons to `<Button variant="ghost" size="sm">` (Clear) and `<Button variant="primary" size="sm">` (Done); these were `.store-filter-clear` / `.store-filter-done`
- [x] 12.4 Keep the popover panel body page-scoped: `.store-filter-panel`, `.store-filter-search`, `.store-filter-list`, `.store-filter-item`, `.store-filter-empty`, `.store-filter-footer` stay
- [x] 12.5 Delete `.store-filter-trigger`, `.store-filter-clear`, `.store-filter-done`, `.store-filter-badge` from the store-filter CSS

## 13. Migrate `PriceFilterPopover` to `<PopoverTrigger>` + `usePopoverDismiss`

- [x] 13.1 Refactor `app/(main)/items/ui/components/PriceFilterPopover.tsx`: replace its trigger button with `<PopoverTrigger icon={<MdAttachMoney/>} label="Price" count={activeCount || undefined} active={activeCount > 0} aria-haspopup="dialog" aria-expanded={open}>`
- [x] 13.2 Replace the hand-rolled click-outside / Escape `useEffect` with `usePopoverDismiss`. Note: `PriceFilterPopover` currently applies on click-outside (a UX choice); preserve this in the `onClose` callback (`onClose = () => { if (localMin !== min || localMax !== max) onApply(localMin, localMax); setOpen(false); }`). Both Escape AND click-outside now apply (slight behavior shift from prior "Escape reverts"); see proposal §10
- [x] 13.3 Migrate the Clear / Apply footer buttons to `<Button variant="ghost" size="sm">` and `<Button variant="primary" size="sm">`
- [x] 13.4 Keep the price-input body page-scoped: `.price-filter-panel`, `.price-filter-inputs`, `.price-filter-field` stay
- [x] 13.5 Confirm no additional CSS classes need deletion (the trigger class `.store-filter-trigger` is shared with §12 and already removed)

## 14. Migrate `ItemsToolbar` filters-trigger to `<PopoverTrigger>`

- [x] 14.1 Refactor the `.items-toolbar-filters-trigger` `<button>` in `ItemsToolbar.tsx:252` to `<PopoverTrigger icon={<MdTune/>} label="Filters" count={filterCount || undefined} active={filterCount > 0} aria-haspopup="dialog" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(true)}>`
- [x] 14.2 Scrim converted from `<button>` to `<div role="presentation" onClick>`; sheet close button (`.items-toolbar-filters-sheet-close`) left as raw `<button>` for now — not yet on the button system; tracked as follow-up
- [x] 14.3 Delete `.items-toolbar-filters-trigger`, `.items-toolbar-filters-badge` from items-toolbar CSS

## 15. Migrate `ListSelection` trigger to `<PopoverTrigger>`

- [x] 15.1 Refactor the `.if-lp-trigger` `<button>` in `app/(main)/items/ui/components/itemform/ListSelection.tsx` to `<PopoverTrigger label={selected.length === 0 ? placeholder : 'Add another list…'} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(o => !o)}>` — note `aria-haspopup="listbox"` per the listbox-vs-menu boundary (Decision 9)
- [x] 15.2 Replace the hand-rolled click-outside `useEffect` with `usePopoverDismiss({ open, onClose: () => setOpen(false), ref: wrapRef })`
- [x] 15.3 Keep the listbox body (`.if-lp-menu`, `.if-lp-opt`, `.if-lp-empty`) page-scoped — these are listbox options, deferred (Decision 9)
- [x] 15.4 Delete `.if-lp-trigger`, `.if-lp-trigger-label` from the item-form CSS

## 16. Verification

- [x] 16.1 Preview keyboard verification: `ListActionsMenu` opens via kebab (all 5 menuitems render with `role="menuitem"`, Delete in danger tone); `UserAvatarPopover` opens via avatar (header + Connections + Sign out, focus moves to first item); `VisibilityPicker` Private/Shared toggle uses `role="radiogroup"` with `aria-checked`, focus + selection move together via arrow keys; items view-toggle ArrowLeft from list → grid AND fires `onChange` (URL drops `?view=list`); Stores popover opens with form-input-shaped trigger and Escape returns focus + closes
- [x] 16.2 Touch emulation: deferred — `@media (hover: hover)` guards are in each new primitive's CSS (menu-item, segmented-option, popover-trigger), inherited from button-system contract
- [x] 16.3 Mobile viewport visual review: 375px screenshot of items page shows Filters PopoverTrigger renders as form-input-shaped pill, view-toggle SegmentedControl shows primary-color active grid icon, layout intact
- [x] 16.4 `:focus-visible` rings: every primitive CSS file declares `outline: 2px solid var(--btn-focus-ring-color)`; on-dark segmented control overrides to white; ring contract inherited from button-system
- [x] 16.5 `npx tsc --noEmit` passes; `npm run lint` shows only pre-existing errors (DeleteItemButton missing MdDeleteForever import, ChooseItemsForm `<Header>` missing, ListDetails `<Link>` missing, ChooseItemsForm dependency array shape) — none introduced by this change
- [x] 16.6 Grep confirms only a single doc-comment mention remains; all `.menu-item`/`.menu-dropdown`/`.avatar-popover-item`/`.visibility-option`/`.view-toggle-btn`/`.store-filter-trigger`/`.items-toolbar-filters-trigger`/`.if-lp-trigger` class definitions and usages are gone
- [x] 16.7 Note for the PR description: the renames `Menu.tsx → AppMenu.tsx` (nav component) and `.menu → .menu-popover` (popover container class) were necessary to avoid collisions with the new `app/ui/components/menu/` primitive directory on a case-insensitive macOS filesystem; flag the visual-treatment shifts (view-toggle keyboard model now radiogroup not toggle-pair, PriceFilterPopover Escape now applies-on-close to match click-outside) for review

## 17. Follow-up flagging

- [x] 17.1 If a second `<Listbox>` caller surfaces (e.g. a country picker, store picker, etc.), file a follow-up change `standardize-listbox` covering `ListSelection`'s `.if-lp-opt` rows + the new caller. Until then, listbox options stay page-scoped per Decision 9
- [x] 17.2 If a portal-based popover need surfaces (popover must escape `overflow:hidden` parent), file a follow-up change introducing `createPortal`-based positioning to the existing primitives — not addressed here per Non-Goals
- [x] 17.3 If `<MenuItem>` callers ever need keyboard-shortcut hints (right-aligned key labels like "⌘D"), file a follow-up. YAGNI for now
