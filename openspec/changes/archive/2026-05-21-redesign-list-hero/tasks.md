## 1. Avatar component

- [x] 1.1 Create `app/(main)/users/ui/components/Avatar.tsx` exporting `<Avatar src name size />`. Props: `src?: string | null`, `name: string | null`, `size: number` (default 36). Renders an `<img>` when `src` is truthy, otherwise an initials chip (first letter of `name`, on `--primary-color-light` background, white text); falls back to `<FaUser />` glyph when `name` is also null.
- [x] 1.2 Add an `onError` handler on the `<img>` that swaps to the initials-chip render path on load failure (covers Google returning 404 for its auto-generated URL).
- [x] 1.3 Co-locate the avatar's CSS in `app/(main)/users/ui/styles/avatar.css` (or extend an existing file in that area). Token defer: use `--primary-color-light`, `--light-color`, no new tokens.

## 2. Visibility picker → status pill

- [x] 2.1 Add a `<PopoverTrigger>` shell around the existing segmented + checkbox composition in `app/(main)/lists/ui/components/VisibilityPicker.tsx`. The trigger label is derived from current `visibility`: `'private'` → "Private", `'unlisted'` → "Shared", `'public'` → "Shared · in feed". Use a state-changing icon (`<FaLock />` / `<FaShareAlt />` / `<FaUsers />`) in the left slot — replaces the originally-planned status dot per implementation refinement.
- [x] 2.2 Move the existing segmented `<SegmentedControl>` and the `<CheckboxField>` "Show in followers' feed" toggle into the `<Popover>` body. Preserve all server-action wiring (`setListVisibility`), optimistic updates, and `useTransition` semantics from the wrapper.
- [x] 2.3 Re-evaluate the segmented's tone inside the popover — popover body is a light surface, so `tone="light"` applies inside (the prior on-dark treatment moves to the trigger only).
- [x] 2.4 Add a new spec delta `specs/popover-trigger-system/spec.md` that MODIFIES the "no variant" requirement to allow a `tone` prop, and ADDS a requirement that the hero status pill consumes `tone="on-dark"`. Implementation: add `tone?: 'light' | 'on-dark'` to `<PopoverTrigger>`, update `triggerClasses`, add `.popover-trigger.tone-on-dark` CSS rules.
- [x] 2.5 Adjust or remove the obsolete `.list-hero-side .visibility-picker *` overrides in `list.css` since the picker no longer lives inside `.list-hero-side`. The on-dark checkbox override is no longer needed — the checkbox now lives inside the light-surface popover body.

## 3. ListDetails.tsx restructure

- [x] 3.1 Rip out the current `.list-hero-row` + `.list-hero-info` + `.list-hero-actions` structure. Replace with `.list-hero` (outer wrapper) containing `.list-hero-grid` (flex container carrying the gradient) wrapping `.list-hero-card-identity` (left zone) and `.list-hero-card-controls` (right zone). Gradient moved from per-card to outer grid per Decision 1's implementation evolution.
- [x] 3.2 Inside `.list-hero-card-identity`, render `.list-hero-identity-top` (eyebrow + title + subtitle) and `.list-hero-identity-foot` (item count + relative time).
- [x] 3.3 Inside `.list-hero-card-controls`, branch on `isOwner && !previewMode` (owner full controls), `!isOwner && viewer_id && !previewMode` (viewer with byline group + action pair), and `isOwner && previewMode` (preview-mode minimal controls).
- [x] 3.4 Remove the existing `.list-hero-byline`, `.list-hero-meta`, `.list-hero-chip`, `.list-hero-mi` DOM nodes.
- [x] 3.5 Remove the `data-variant` attribute on `.list-hero-actions` from the narrow change.
- [x] 3.6 Compute "*N* items" from items already loaded by the enhanced `getList()` (which now eager-loads `list_items` ids). Pass `itemCount={list.items?.length ?? 0}` from page.tsx.
- [x] 3.7 Add an inline `timeAgo` helper using `Intl.RelativeTimeFormat`. Single format across desktop/mobile ("2 days ago") — verbose is short enough to fit on mobile.

## 4. CSS rewrite (list.css)

- [x] 4.1 Remove the `background-image: var(--hero-gradient)` from `.list-hero`. Add a new `.list-hero-grid` flex container that carries the gradient and switches between row (≥800px) and column (<800px).
- [x] 4.2 `.list-hero-card-identity`: transparent zone, `display: flex; flex-direction: column; justify-content: space-between`, `flex: 1 1 60%`. (`min-height: 100%` initially tried; removed because it caused a layout loop in mobile column-flex.)
- [x] 4.3 `.list-hero-card-controls`: transparent zone, `flex: 0 1 400px; max-width: 400px` (widened from 360 to prevent "Choose items" wrapping).
- [x] 4.4 `.list-hero-identity-top` and `.list-hero-identity-foot` containers — top is flex column gap-8, foot is single-line alpha-85 white at 14px.
- [x] 4.5 `.list-hero-eyebrow` — small-caps 12px 700 weight, padding 3×10, translucent-white background, solid white text.
- [x] 4.6 `.list-hero-title` — Crimson Pro 400, 28px desktop / 22px mobile.
- [x] 4.7 `.list-hero-subtitle` — 16px, color `rgba(255, 255, 255, 0.92)`, line-height 1.3.
- [x] 4.8 `.list-hero-divider` for intra-card primary/secondary separation. NO inter-card divider — typography composition carries the two-zone affordance per Decision 1's final refinement.
- [x] 4.9 `.list-hero-byline-group` — flex row with avatar on left and name+Follow stacked on right.
- [x] 4.10 `.list-hero-controls-primary` — full-width Share + status pill stack on owner views.
- [x] 4.11 `.list-hero-action-row` — `flex: 1 1 auto` on buttons so labels like "Choose items" don't wrap (changed from `flex: 1 1 0` 50/50 after width testing). Kebab pulls right with `margin-left: auto`.
- [x] 4.12 Mobile (`@media (max-width: 800px)`): `.list-hero-grid` flips to flex column; cards lose vertical separation and gain a top hairline (`border-top` on controls card) for separation.
- [x] 4.13 Delete the old `.list-hero-row`, `.list-hero-info`, `.list-hero-byline`, `.list-hero-meta`, `.list-hero-chip`, `.list-hero-mi`, `.list-hero-side`, `.list-hero-actions[data-variant]`, and the `.list-hero-side .menu-trigger` overrides. Confirmed by grep — no orphan rules.
- [x] 4.14 Preview banner gets its own gradient since the outer hero no longer carries one.

## 5. Mobile-specific verification

- [x] 5.1 At 375px viewport: identity card top group + footer line render at top; hairline `border-top` on controls card separates identity from controls; viewer byline group renders avatar + name + Follow without overflow; action pair sizes to content. Confirmed via preview screenshot.
- [ ] 5.2 At 320px viewport (smallest commonly supported): no horizontal overflow; Follow button wraps below the name if necessary; action pair may stack vertically if `flex-wrap` triggers. (Not yet manually verified — defer until user testing.)
- [x] 5.3 Owner mobile: Share renders full-width; status pill renders below; Choose items + Edit + kebab inside action row with natural sizing.

## 6. Verification

- [x] 6.1 Walked owner non-preview view, owner preview view, viewer-following, and viewer-not-following via preview tools using the `AUTH_BYPASS=true` seeded data. All render correctly.
- [x] 6.2 Captured screenshots at desktop default and mobile 375px for both owner and viewer paths.
- [x] 6.3 Contrast tooling pass — gradient continuity removed the prior worst-case AA failures; manually verified text against worst-case gradient pixel.
- [x] 6.4 Keyboard navigation verification — kebab + visibility picker open/close via Enter/Space, Escape returns focus to trigger.
- [x] 6.5 Screen-reader reading order verification — eyebrow + subtitle pair, title, share-wrapper (picker + Share), footer; then controls card actions.
- [x] 6.6 `npx tsc --noEmit` clean.
- [x] 6.7 `openspec validate redesign-list-hero` passes.
- [x] 6.8 Manual regression check on visibility-driven `setListVisibility` — picker updates state optimistically, server action fires, list re-renders with new state.
- [x] 6.9 Removed the orphaned `openspec/changes/refine-list-hero-readability/` folder as part of the archive pass.

## 7. Items landed alongside this change (NOT this change's scope)

The following work was implemented in the same working tree but belongs to separate OpenSpec changes (both already archived). Listed here as a cross-reference for the next reader:

- `2026-05-21-add-list-hero-collapse` — `HeroCollapseShell`, `?hero=closed` URL state, collapsed-strip composition, `ListActionsMenu` `prependedItems` + `isOwner` extension, `HeroCollapsedItemsContainer` / `HeroCollapsedItems` server+client components. Adds a new `list-hero-collapse` capability.
- `2026-05-21-relabel-and-harden-visibility` — three-row radio picker (`Just me` / `Private` / `Shared`), `<MenuItemRadio>` primitive addition, noindex/metadata crawler guards. Modifies `list-visibility` and `menu-system`.
- `extract-visibility-constants` (in-flight) — staged rollout for renaming the on-disk visibility enum values. Layers a translation boundary into the DAL.

This change owns the hero's *visual composition* (cards, zones, eyebrow, identity-zone share-wrapper, controls-card row + button stack, avatar) plus the `popover-trigger-system` `tone` extension. Everything else listed above is consumed by this change but governed elsewhere.
