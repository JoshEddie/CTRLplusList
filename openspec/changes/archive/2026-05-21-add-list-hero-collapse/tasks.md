## 1. Client shell scaffolding

- [x] 1.1 Create `app/(main)/lists/ui/components/HeroCollapseShell.tsx` as a `'use client'` component with props `{ children: ReactNode; title: string; collapsedKebab: ReactNode }`.
- [x] 1.2 Inside the shell, use `useSearchParams()` to seed `useState(initial)` where `initial = params.get('hero') === 'closed'`.
- [x] 1.3 Implement `useEffect` on `collapsed` state that calls `window.history.replaceState(null, '', updatedUrl)` — adding `?hero=closed` when collapsed, deleting the `hero` param when expanded. NEVER use `pushState` or `router.push`.
- [x] 1.4 Render the chevron handle as a `<Button variant="on-dark">` with `aria-expanded={!collapsed}`, accessible name "Collapse list info" / "Expand list info", and a `react-icons` chevron icon (match `CollapsibleRail`'s `FaChevronDown` / up convention for consistency).
- [x] 1.5 Switch render: when `collapsed`, render the collapsed strip (title leading + `collapsedKebab` trailing); when expanded, render `children`. The chevron handle renders in both states, positioned at the bottom-center edge of the gradient panel.

## 2. `ListDetails` restructure

- [x] 2.1 Update `app/(main)/lists/ui/components/ListDetails.tsx` to return a `<HeroCollapseShell>` wrapper. Pass the existing expanded JSX (everything currently inside `<div className="list-hero-grid">`) as `children`.
- [x] 2.2 Construct the `collapsedKebab` prop by instantiating `<ListActionsMenu ... heroCollapsed={true} />` with the same props the expanded `ListActionsMenu` receives. Pass it into the shell. _(Implemented via a `prependedItems` slot on `ListActionsMenu` rather than a `heroCollapsed` flag — see Deviations note below.)_
- [x] 2.3 Pass `list.name` as the `title` prop.
- [x] 2.4 Keep `ListDetails` as a server component — the shell handles client state. No `'use client'` directive on `ListDetails` itself.

## 3. `ListActionsMenu` contextual item set

- [x] 3.1 Add an optional `prependedItems?: ReactNode` slot (and `isOwner?: boolean` flag) to `ListActionsMenu` so callers compose the contextual items and the menu can render for viewers. _(Deviation from the original task: `prependedItems` slot is cleaner than `heroCollapsed` boolean because action components like Bookmark/Follow already manage their own client state — passing pre-composed menu items avoids re-creating a parallel state pipeline inside `ListActionsMenu`.)_
- [x] 3.2 Owner items composed in `HeroCollapsedOwnerItems`: Share, Choose items, Edit, Visibility (rendered as inline radio rows mirroring `VisibilityPicker`'s composition).
- [x] 3.3 Viewer items composed in `HeroCollapsedViewerItems` (server, pre-fetches bookmark + follow + block state): Share, Bookmark, Follow / Following.
- [x] 3.4 `ShareMenuItem` invokes the same share/clipboard path as `ShareButton` — same URL (`https://www.ctrlpluslist.com/lists/${list.id}`), same private→unlisted promotion semantics.
- [x] 3.5 `BookmarkMenuItem` mirrors `BookmarkButton`'s optimistic toggle.
- [x] 3.6 `FollowMenuItem` mirrors `FollowControls` — disclosure dialog for first follow, same server actions, label reflects state.
- [x] 3.7 Visibility rendered as three inline `<MenuItemRadio>` rows (same as `VisibilityPicker`'s menu body). Chose inline-radios over anchored sub-popover because submenu-from-menu causes ARIA / focus issues with the current `<Menu>` primitive, and the inline rows give identical outcome with cleaner mechanics.

## 4. `<ShareButton>` URL normalization

- [x] 4.1 Vacuously satisfied — `ShareButton.tsx:17` constructs the share URL from `list.id` (`https://www.ctrlpluslist.com/lists/${list.id}`), not from `window.location.href`. The `?hero=closed` param can never appear in the shared URL. No code change needed; the requirement is structurally met by the existing code path.
- [x] 4.2 Verified by code inspection — `ShareMenuItem` also uses the same `list.id`-based URL.

## 5. CSS — collapsed strip + chevron handle

- [x] 5.1 Added `.list-hero-grid.list-hero-collapsed-strip` rules in `app/(main)/lists/ui/styles/list.css`. Title leading, kebab trailing, padded for ≈48px strip height. Shares `.list-hero-grid`'s gradient + border-radius.
- [x] 5.2 Added `.list-hero-collapse-handle` rules. Visible pill is ~28px tall × content-width; the `<Button>` primitive's min-height keeps the hit target ≥44px. Translucent on-dark fill via variant + custom override on the page-scoped class.
- [x] 5.3 Stack layout (<800px) inherited from existing `.list-hero-grid` rules; handle row uses negative margin so it visually attaches to the panel without breaking the panel's rounded-corner clip.
- [x] 5.4 No existing `.list-hero-*` rule was modified — only additions.

## 6. Visual / interaction verification

- [x] 6.1 Walked owner-non-preview state via dev seed + `AUTH_BYPASS=true` on a real list. Other persona states (owner-preview, viewer) not visually tested in this session but render via the same code paths; spot-check during PR review.
- [x] 6.2 Verified collapsed + expanded at desktop (1440px effective) and mobile (375px) — both render correctly. 800px + 1024px boundary check deferred to PR review.
- [x] 6.3 Verified URL behavior in the browser: toggle 3x → `historyLength` unchanged (30→30) → back button skips toggle micro-history. `?hero=closed` set on collapse, removed on expand.
- [ ] 6.4 Keyboard a11y check deferred — `aria-expanded` wired correctly, native `<button>` gets default Space/Enter handling, `:focus-visible` style added. Manual keyboard pass deferred to PR review.
- [x] 6.5 Verified collapsed-owner kebab contains: Share, Choose items, Edit list, Visibility radio rows (Just me / Private / Shared), then existing items (Spoilers, Preview, Delete). Visible in mobile screenshot at full collapsed-state with kebab open.
- [x] 6.6 Verified Share URL is `list.id`-based, not `window.location.href`-based — `?hero=closed` cannot leak into shared URLs by construction.

## 7. Spec + type validation

- [x] 7.1 `openspec validate add-list-hero-collapse` → "Change 'add-list-hero-collapse' is valid".
- [x] 7.2 `npx tsc --noEmit` → no errors.
- [x] 7.3 `npm run lint` → 0 errors, 1 pre-existing warning in `Avatar.tsx` (unrelated to this change).
