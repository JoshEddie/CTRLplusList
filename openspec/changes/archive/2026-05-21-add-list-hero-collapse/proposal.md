## Why

The redesigned list hero (per the in-flight `redesign-list-hero` change) gives `/lists/[id]` a strong, composed identity panel — but on mobile it still consumes ~50–65% of the viewport on first paint (~380–450px) once you stack the identity card over the controls card. The page's job is to show _items_; the hero is intro material the user has internalized after the first read. No further re-composition can shrink it without hiding information that the spec already deems load-bearing (occasion, title, subtitle, visibility status, item count, byline, primary actions).

The right lever is **opt-in collapsibility**: let the user shrink the hero to a one-line strip whenever they want. The expanded state stays untouched (no regression to the redesign's typographic hierarchy); the collapsed state hides everything behind the existing kebab.

**Inherited constraints (preserved by this change):**

- The `following` spec ([openspec/specs/following/spec.md](openspec/specs/following/spec.md)) requires the Follow button to be rendered in a byline sub-row of the list hero adjacent to the owner's name on viewer views. The expanded state continues to satisfy this verbatim. The collapsed state does NOT render a byline sub-row at all — the entire hero compresses to title + kebab — so the placement constraint is vacuously preserved (there is no surface on which Follow could be mis-placed). The Follow action moves into the kebab as a `<MenuItem>` while collapsed.
- The `list-visibility` spec requires the Private/Shared two-state toggle + "Show in followers' feed" checkbox composition for visibility changes. The expanded state continues to host this via the existing `<VisibilityPicker>` (status pill → popover). In the collapsed state, the visibility status reduces to a `<MenuItem>` row in the kebab labeled with the current state ("Visibility: Private", etc.); selecting it opens the same picker UI (popover or a small dialog — see design). The picker's control composition is unchanged.
- The `menu-system` spec is the primitive used by `ListActionsMenu`. The collapsed kebab is the SAME `ListActionsMenu` component — this change extends its `items` content, it does NOT introduce a new menu primitive or a parallel kebab.
- The `redesign-list-hero` change is the _visual composition_ this change layers atop. The collapse toggle does not modify any `.list-hero-*` class produced by that change; it adds a wrapper-level state plus a single chevron handle at the bottom edge of the gradient panel.

## What Changes

- **New collapse affordance.** A chevron handle (`⌃` to hide, `⌄` to show) sits at the bottom-center edge of the hero's gradient panel at all viewport widths. Tapping it toggles the hero between expanded (current redesigned composition) and collapsed (single strip).
- **Collapsed state composition.** The collapsed strip renders inside the same gradient panel (continuity of brand surface preserved). Content: `[ Title ]` on the leading edge, `[ ⋯ kebab ]` on the trailing edge. No eyebrow, no subtitle, no footer line, no byline, no visibility pill, no primary action buttons. The kebab is the same `ListActionsMenu` component; while collapsed, it absorbs the actions normally rendered in the controls zone.
- **Kebab item set expands while collapsed.** When the hero is collapsed, `ListActionsMenu` renders a contextually expanded item set:
  - Owner: Share · Choose items · Edit · Visibility (`<MenuItem>` showing current state, opens the existing picker) · existing kebab items (Spoilers, Preview, Delete).
  - Viewer: Share · Bookmark · Follow / Following · existing kebab items (Spoilers — none for viewer).
  - When the hero is expanded, `ListActionsMenu` reverts to its current (pre-collapse) item set — the redundant items are removed because they're rendered as first-class affordances above.
- **URL-driven default + history-safe sync.** Collapsed state is reflected in a `?hero=closed` search param. The initial state is derived from the URL on first render; toggling updates the URL via `window.history.replaceState` (NOT `pushState` / `router.push`) so back-button navigation skips toggle micro-history and goes to the previous page. The user behaviors this targets:
  - Refresh → respects last state (URL preserves through reload).
  - Browser back from another page → returns to the list with the URL the user left it at, so collapsed-state is restored.
  - Fresh link to the list (no `?hero` param) → renders expanded.
- **Default = expanded.** First-ever visit with no URL param renders expanded.
- **Share button strips the `hero` param when copying.** `<ShareButton>` currently shares `window.location.href`. It SHALL normalize the URL to remove the `hero` param before copy / `navigator.share` so a sharee never opens a stranger's list pre-collapsed.
- **No animation in scope.** Toggling is instantaneous (no CSS height transition). A future polish change can add motion; out of scope here.

## Capabilities

### New Capabilities

- `list-hero-collapse`: Behavior contract for the collapse affordance — the chevron handle's placement and labeling, the collapsed strip's content composition (title + kebab only), the contextual expansion of `ListActionsMenu`'s item set while collapsed, the URL param naming and `replaceState`-based sync, the `<ShareButton>` normalization of the URL on copy, the default-expanded contract on fresh URLs, and the at-all-widths availability (no breakpoint-gated rendering of the toggle).

### Modified Capabilities

<!-- None. The collapse behavior is purely additive: it does not change any requirement in
     `following`, `list-visibility`, `menu-system`, `button-system`, or the in-flight
     `list-hero-header` capability. The expanded state continues to render exactly per
     `list-hero-header`; the collapsed state hides that composition entirely without
     restructuring it. -->

## Impact

**Cross-cutting primitives consumed (no primitive modifications):**

- `<Menu>` / `<MenuItem>` / `<MenuLinkItem>` from `menu-system` for the kebab — the same primitives `ListActionsMenu` already uses. The contextual item-set expansion is implemented inside `ListActionsMenu` by reading a new `heroCollapsed: boolean` prop and conditionally rendering the additional items.
- `<Button variant="on-dark">` from `button-system` for the chevron handle. It's a single icon button with `aria-expanded` / `aria-controls` wiring; no new variant.

**Files touched (estimate):**

- `app/(main)/lists/ui/components/ListDetails.tsx` — currently a server component. A small client shell `HeroCollapseShell.tsx` wraps the existing rendered hero so the toggle / URL sync can live in client land. `ListDetails` stays server-rendered for the expanded content; the shell receives both the expanded tree and the collapsed strip (title + kebab) as `children` / props.
- `app/(main)/lists/ui/components/HeroCollapseShell.tsx` — new client component. Owns the `useState` seeded from `useSearchParams`, the `history.replaceState` effect on state change, the chevron handle's render, and the switch between expanded children and collapsed strip.
- `app/(main)/lists/ui/components/ListActionsMenu.tsx` — accepts a new `heroCollapsed?: boolean` prop. When true, prepends Share / Choose items (owner) / Edit (owner) / Bookmark (viewer) / Follow (viewer) / Visibility (owner) items to its item list. The expanded existing kebab items follow.
- `app/(main)/lists/ui/components/ShareButton.tsx` — strip `hero` param from the URL before clipboard copy / `navigator.share`. One-line normalization at the top of the share handler.
- `app/(main)/lists/ui/styles/list.css` — add `.list-hero-collapsed` strip layout (title + trailing kebab inside the existing gradient panel), `.list-hero-collapse-handle` (chevron handle at the bottom-center edge), and the at-all-widths visibility of the handle. The existing `.list-hero-*` rules are unchanged.

**Server-side reads / cache:** none changed. The hero's data comes from `getList(id)`, items from `getItemsByListId(...)`, both already tagged (`'lists'`, `'items'`). Collapse is a pure client-side UI state with optional URL serialization; no DAL touch, no cache tag.

**Server-side rendering nuance:** `useSearchParams()` requires `'use client'`. The toggle and URL-init logic live inside `HeroCollapseShell` (client). The expanded hero tree is server-rendered and passed as `children` — no payload bloat, no auth-context loss.

**Out of scope (separate changes):**

- Auto-collapse-on-scroll or sticky-compact-strip behaviors. The chevron is the only collapse trigger in this change.
- Cross-device persistence (localStorage / sessionStorage / cookie). URL-only persistence is the deliberate choice here; if user research later shows users want collapse to carry across devices, that's a follow-up change with its own privacy + sync trade-off.
- CSS transitions / animation on toggle.
- A separate primitive for the chevron handle — for N=1 caller (the list hero) it's a page-scoped class on a `<Button variant="on-dark">`, not a new design-system primitive.
- Modifying any `list-hero-header` capability requirement — see Modified Capabilities note above; this change is purely additive.

**Visual regression surface:** `/lists/[id]` exclusively. No other surface consumes `.list-hero-*` classes or `ListActionsMenu`.

**Rollback:** revert the PR. The `?hero=closed` URLs in the wild after revert silently degrade — the search param is just ignored by an expanded-only hero. No data migration, no token deprecation, no feature flag.
