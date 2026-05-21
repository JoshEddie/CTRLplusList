## Context

The list-detail hero at `/lists/[id]` is undergoing a composition redesign (`redesign-list-hero`, 35/41 tasks complete) that lands a strong two-card identity-plus-controls layout. That redesign is the *visual* answer to "the hero is poorly composed." This change is the *behavioral* answer to "the hero, even well-composed, is intro material and shouldn't permanently occupy half the mobile viewport."

Today the redesigned hero on mobile is a stacked single gradient panel: identity card on top (eyebrow + title + subtitle + visibility pill + footer line) and controls card below (Share + secondary actions for owner; byline + Share/Bookmark pair for viewer). On a 670px-tall phone viewport the panel takes ~380–450px depending on owner/viewer state and optional fields. That's a lot of real estate for orientation chrome that the user has internalized after first read.

Earlier exploration discarded three alternatives:
- *Further redesign to shrink.* The fields the hero shows are all spec-mandated or load-bearing for orientation. The only way to shrink is to hide.
- *Auto-collapse on scroll.* Substantial design surface (sticky vs not, hysteresis policy, popover-during-scroll interactions). High implementation cost, only marginally better discovery than an explicit affordance. Deferred as v2.
- *localStorage / cookie persistence across sessions.* Tempting but invites discoverability bugs ("why is my hero hidden on a list I've never seen before?") if the key isn't list-scoped, and accumulating cruft if it is. The chosen URL-param model gives "refresh respects, back-button respects" without persisting beyond the current navigation context.

Binding upstream constraints (verified, see proposal):
- `following`: Follow button colocated with linked owner name in a byline sub-row of the hero. The collapsed state has no byline at all — vacuously satisfied. Follow moves into the kebab while collapsed.
- `list-visibility`: Private/Shared + feed checkbox composition is normative for the picker. The picker is unchanged; only its entry-point relocates (status pill while expanded, kebab item while collapsed).
- `menu-system`: `ListActionsMenu` already uses the `<Menu>` / `<MenuItem>` / `<MenuLinkItem>` primitives. This change extends its `items` content conditionally, no new menu primitive.
- `redesign-list-hero` (in-flight): defines the expanded composition this change wraps. No `.list-hero-*` rule produced by that change is modified here.
- `button-system`: the chevron handle is a `<Button variant="on-dark">` with an icon child; no new variant.

## Goals / Non-Goals

**Goals:**
- A single chevron handle on the bottom-center edge of the hero's gradient panel toggles between expanded and collapsed at all widths.
- Collapsed state is a one-line strip inside the same gradient panel: title (leading) + kebab (trailing). No other content renders.
- All actions remain reachable when collapsed via the existing `ListActionsMenu` kebab.
- URL param `?hero=closed` reflects the state. Refresh and browser-back-to-the-list restore it. Fresh links (no param) render expanded.
- `history.replaceState` keeps toggle interactions out of the browser history stack so back-button always takes the user to the previous page, never unwinds toggles.
- The `<ShareButton>` strips `hero` from the URL when copying / invoking `navigator.share` so a sharee never opens a list pre-collapsed.
- Zero changes to the redesigned expanded layout. Toggle is purely additive.

**Non-Goals:**
- No auto-collapse-on-scroll or sticky behaviors.
- No cross-session persistence (localStorage / sessionStorage / cookie). URL is the only persistence channel.
- No animation / CSS transition on toggle. Instant swap.
- No new design-system primitives. Chevron handle is a page-scoped class on `<Button variant="on-dark">`.
- No changes to `<VisibilityPicker>`, `<ShareButton>` (other than the URL-normalization one-liner), or the actions available — only the *surface* through which they're reached.
- No mobile-only gate. The toggle exists at all widths (see Decision 4).

## Decisions

### Decision 1: Collapsed state = title + kebab only (Flavor 3)

Earlier exploration weighed three "what stays visible" cuts: title strip only (F1), title + primary action + chevron (F2), and title + kebab (F3). F3 was selected.

**Rationale:** F2 preserves the owner's Share at one-tap depth but introduces a per-persona branch in the collapsed strip (Share for owner, Bookmark for viewer), and obligates a *second* always-visible action region in addition to the kebab. F3 is the cleanest visual answer — a single strip with one trailing kebab handles every persona uniformly. The cost is that Share goes from one-tap (expanded) to two-tap (collapsed: open kebab, tap Share). That cost was explicitly accepted by the user during exploration: the collapse is *opt-in*, so users who depend on one-tap Share simply stay expanded.

**Alternatives kept rejected:**
- F1 (title only): No action access while collapsed. Forces re-expand for any interaction; defeats the "compress without losing function" goal.
- F2 (title + primary action + chevron): Better one-tap depth for the most common action but adds visual complexity to the strip (one persona shows Share, the other shows Bookmark) and creates a second always-visible region competing with the kebab. The clean uniformity of F3 won out.

### Decision 2: URL param + `history.replaceState` (not pushState, not localStorage)

State is reflected in `?hero=closed`. Initial render reads the URL via `useSearchParams()`. Toggling updates state via `useState` (instant) AND silently updates the URL via `window.history.replaceState(null, '', updatedUrl)`.

```
User journey: /lists → /lists/A → toggle ×3 → click link to /lists/B → back
History stack after the journey:
  [/lists, /lists/A?hero=closed, /lists/B]
Press back → /lists/A?hero=closed → renders collapsed ✓
Press back → /lists ✓
```

`replaceState` mutates the current history entry, so no toggle creates a new history checkpoint. Back-button behavior matches user intent: it returns to the previous *page*, not to a previous *UI toggle state* of the same page.

**Rationale:** Refreshing a list page should preserve the user's collapse choice (it's expensive in tap depth to re-collapse on every refresh). Navigating away and back via a fresh link should reset to expanded (the user is arriving at the list anew). Browser back-button should restore the URL the user last left, including its collapse state. URL + `replaceState` is the only persistence mechanism that satisfies all three at once without introducing client-side storage.

**Alternatives considered:**
- *`useState` only.* Simpler (~3 lines). Refresh resets. Earlier exploration confirmed the user wanted refresh to respect the choice.
- *`router.push` / `pushState`.* Each toggle creates a history entry. Tapping the chevron 3 times then pressing back unwinds 3 toggles before leaving the page. Unacceptable UX.
- *`router.replace`.* Functionally identical to `history.replaceState` for this case, but routes through Next's router, triggering a re-render. `history.replaceState` is a no-op for React state and keeps the toggle perceptually instant.
- *localStorage / sessionStorage.* Persists too long (across page navigations, across tabs) or in confusing scopes. Particularly bad for the "fresh link to a list I've never seen" case where someone collapsed a different list and the new one inherits collapsed-by-default. URL state is naturally scoped to navigation.
- *Cookie.* Same issues as localStorage plus a server-side surface area we don't need.

### Decision 3: Toggle lives in a client shell wrapper, expanded hero stays server-rendered

`ListDetails.tsx` remains a server component. A new client component `HeroCollapseShell` wraps it. The shell:
- Receives the expanded hero tree as `children` and the collapsed-strip props (title + the same `ListActionsMenu` instance configured for `heroCollapsed=true`) as discrete props.
- Owns `useState`, seeded from `useSearchParams().get('hero') === 'closed'`.
- Owns the `useEffect` that calls `window.history.replaceState` whenever state changes.
- Renders the chevron handle.
- Renders either `children` (expanded) or the collapsed strip (collapsed).

**Rationale:** `useSearchParams` and `window.history` are client-only APIs. Wrapping the smallest possible part of the tree in `'use client'` preserves server-rendering for the expensive content (the expanded hero with its avatars, byline, visibility picker, etc.). The expanded subtree is passed in as `children`, which Next's client/server bridge handles natively — the server-rendered JSX serializes and the client component just shows or hides it.

**Alternatives considered:**
- *Convert `ListDetails` to a client component.* Larger client bundle, loses server-side rendering of any expensive children. Worse for first-paint LCP.
- *Lift collapse state into the page component.* Page is a server component; can't hold React state. Would force the entire page tree client-side.

### Decision 4: Toggle is available at all viewport widths (not mobile-only)

The chevron handle renders at all widths. No `@media` gate on the toggle itself.

**Rationale:** A mobile-only toggle creates a resize footgun:
```
1. User on phone collapses → URL = ?hero=closed
2. Same user opens on iPad landscape (≥800px breakpoint)
3. The toggle doesn't render at desktop. Either:
   - Page renders collapsed with no way to expand (stranded), OR
   - Page renders expanded, silently ignoring the URL param (overrides user choice)
```
Always-available avoids the footgun: the URL param is honored at every width, the toggle is always there to flip it. The desktop hero is well-composed and short (~180px) — the toggle is rarely needed there, but a small chevron at the bottom edge costs near-zero visual weight when unused. Power users on small laptop screens or split-window setups benefit.

**Trade-off accepted:** A small amount of chrome on desktop that most desktop users won't notice or use.

### Decision 5: `ListActionsMenu` accepts a `heroCollapsed` prop and contextually expands its items

When `heroCollapsed=false` (or omitted), `ListActionsMenu` renders today's item set unchanged (Spoilers toggle, Preview, Delete for owner; Spoilers for viewer when applicable).

When `heroCollapsed=true`, it prepends the actions normally rendered in the controls zone of the expanded hero:
- Owner: Share, Choose items, Edit, Visibility (`<MenuItem>` with current state label, opens existing picker), then existing items.
- Viewer: Share, Bookmark, Follow / Following, then existing items.

**Rationale:** A single kebab handles both states — no parallel "collapsed kebab" component. The contextual item set mirrors the visible controls zone of the expanded hero, so the user's mental model is "the kebab now contains what the row above me used to show." Visibility is the trickiest: it's a stateful control in expanded mode (status pill → popover). In collapsed mode it becomes a `<MenuItem>` that, when clicked, opens the same picker popover anchored to the kebab item. Implementation detail under "Migration Plan" below.

**Alternative considered:**
- *Render a separate `<HeroCollapsedActionsMenu>` component.* Duplicates the kebab's keyboard handling, focus management, and visual treatment. `ListActionsMenu`'s contextual items keep one source of truth.

### Decision 6: `<ShareButton>` strips the `hero` param when copying / sharing

Before invoking `navigator.share` or clipboard write, normalize:
```ts
const url = new URL(window.location.href);
url.searchParams.delete('hero');
const shareUrl = url.toString();
```

**Rationale:** Sharing a `?hero=closed` URL would open the list pre-collapsed for the recipient — bad for first impressions of a list the sharee has never seen. The `hero` param is purely viewer-local UI state, never something the sharer is trying to communicate.

**Alternative considered:**
- *Don't use `window.location.href` at all; reconstruct from `list.id` and `window.location.origin`.* Cleaner but redundant — the only "extra" param this surface adds is `?hero`. The `preview` and `spoilers` params are owner-only modes that aren't reachable when the share button is enabled (the share button is hidden in preview mode by the existing component). One-line `delete` is fine.

### Decision 7: Chevron handle visual placement — bottom-center edge of the gradient panel

The handle sits flush against the bottom edge of the hero's gradient panel, horizontally centered, with the chevron pointing down when expanded (`⌃` = "click to hide / move me up") and up when collapsed (`⌄` = "click to show / move me down"). Wait — flip: down chevron suggests "expand" (open accordion convention). Settled: expanded shows `⌃` (collapse upward), collapsed shows `⌄` (expand downward).

The handle is small (≈32×24px), visually quiet (translucent on-dark background, white icon), and has `aria-expanded` + `aria-controls` wiring per the menu/popover-trigger conventions in the codebase.

**Rationale:** Bottom-center edge is the iOS Stocks / Apple Music / drawer-bottom-sheet convention — well understood as "this surface has more state, drag/tap to toggle." Placing it on the trailing edge of the panel (vs. inside the controls zone or above the items grid) communicates "this affordance belongs to the hero, not the items below."

**Alternatives considered:**
- *Trailing-corner chevron (top-right or bottom-right of the panel).* Crowds the kebab in collapsed mode; visual conflict.
- *Inline chevron next to the kebab.* Too easy to mistake for a sub-menu trigger; the chevron and kebab need clear semantic distance.
- *A separate "Hide list info" link / `<Button variant="link">` below the hero.* Heavier visual weight, breaks the gradient-panel containment.

### Decision 8: Collapsed strip uses the same gradient panel (no separate compact treatment)

The collapsed strip renders *inside* the same `.list-hero-grid` gradient container. Padding is reduced (collapsed strip is ~48px tall vs. the expanded card's ~380–450px), but the gradient, border-radius, and outer dimensions are unchanged.

**Rationale:** Brand continuity. Decision 9 of `redesign-list-hero` locked "gradient lives on the outer `.list-hero-grid`, zones are transparent." Keeping the gradient on collapse maintains that decision and visually says "same surface, less content."

**Alternative considered:**
- *Solid color compact bar.* Lighter visually but loses brand presence on the surface. Re-discovered the same trade-off the redesign already settled.

### Decision 9: Default is expanded on first visit (no `?hero` param)

When the URL has no `?hero` param, the hero renders expanded. Only `?hero=closed` collapses. No `?hero=open` value — open is the absence of the param. The shell removes the `hero` param entirely when toggling back to expanded.

**Rationale:** Clean URLs by default. The user's intent ("I want this list expanded") is the absence of a preference, not an explicit one. The `hero` param is only present when the user has actively collapsed.

**Alternative considered:**
- *Two-value param (`?hero=open` / `?hero=closed`).* Verbose. The "no param = default" convention matches `preview` and `spoilers` on this page.

## Risks / Trade-offs

- **[Risk]** Collapsed-by-URL means a sharee with a `?hero=closed` link sees the list collapsed on arrival. → **Mitigation:** Decision 6 — `<ShareButton>` strips the param. Manual link sharing (copy from address bar) still carries the param, accepted as a rare edge case.
- **[Risk]** `useSearchParams()` returns a snapshot — toggling our own URL via `history.replaceState` does NOT cause `useSearchParams` to re-fire (`replaceState` is invisible to Next's router). This is intentional (we don't want a re-render on toggle) but means the URL and the React state can briefly diverge if a second mechanism updates the URL behind our backs. → **Mitigation:** No other mechanism updates `hero` on this surface. If a future feature needs to set it externally, that feature owns syncing.
- **[Risk]** Owners using the visibility status pill heavily lose its glance-value when collapsed (it becomes a `<MenuItem>` row hidden behind the kebab). → **Mitigation:** Owners who care about glance-status stay expanded. The collapsed state is opt-in.
- **[Risk]** `ListActionsMenu`'s expanded item set may grow long enough that the menu pops outside the viewport on small phones. → **Mitigation:** Verify visually at 390px width during implementation. If overflow occurs, `<Menu>` should already handle internal scrolling per `menu-system` (verify the spec; if not, that's a separate primitive bug, not our concern here).
- **[Risk]** Folding Visibility into a `<MenuItem>` that opens a popover anchored to the menu item creates a popover-from-popover situation. → **Mitigation:** Spec the picker to render as a small in-line `<Popover>` anchored to the menu item, NOT a modal. If anchoring is unreliable, fall back to a small modal dialog (one extra primitive use, but it ships). Decide at implementation under real interaction testing.
- **[Trade-off]** Owner Share goes from one-tap (expanded) to two-tap (collapsed). Accepted because collapse is opt-in; users who depend on one-tap Share simply don't collapse.
- **[Trade-off]** Browser back-button to a previously-collapsed list URL restores the collapsed view. Some users might expect back to always feel like a "fresh arrival" (expanded). Accepted — back-button restoration of UI state is standard browser behavior (matches scroll position, form values, etc.) and the user confirmed this is desired in exploration.
- **[Trade-off]** Always-available toggle puts a small handle on desktop where the hero is already short. Accepted for the resize-footgun mitigation and for power users.

## Migration Plan

Single-PR shipment.

1. **Build `HeroCollapseShell.tsx`** under `app/(main)/lists/ui/components/`. Client component. Props: `children` (expanded tree), `title`, `collapsedActions` (the `<ListActionsMenu heroCollapsed>` element). Owns `useState`, `useSearchParams`-seeded init, `useEffect` for `history.replaceState`, and the chevron handle render. Reads/writes `?hero=closed`.
2. **Restructure `ListDetails.tsx`** so its return value is wrapped in `<HeroCollapseShell>`. The expanded tree is passed as `children`; the collapsed-strip pieces (title text, kebab element) are passed as discrete props.
3. **Extend `ListActionsMenu.tsx`** to accept `heroCollapsed?: boolean` (default `false`). When true, prepend the contextual items per Decision 5. Read existing Share/Bookmark/Follow/etc. components and render them as `<MenuItem>` rows with their `onClick` semantics preserved.
4. **Add `<MenuItem>` for Visibility (owner, collapsed)** that opens the existing `<VisibilityPicker>` popover. Implementation detail: the picker's `<PopoverTrigger>` may need a programmatic-open prop, or we render the picker's body directly inside a popover anchored to the menu item. Decide at implementation; preserve the picker's segmented + checkbox composition per `list-visibility`.
5. **Update `ShareButton.tsx`** to strip `hero` from the URL before share (one-line normalization in the share handler).
6. **Add `.list-hero-collapsed-strip` and `.list-hero-collapse-handle` CSS** in `app/(main)/lists/ui/styles/list.css`. The strip uses the existing gradient panel; the handle is a small `<Button variant="on-dark">` positioned at the bottom-center edge of `.list-hero-grid`.
7. **Manual walk:** dev seed → bypass → render all four states (owner-non-preview, owner-preview, viewer-following, viewer-not-following) at 1440px, 1024px, 800px (just-above + just-below), 390px. Toggle in each state; verify URL updates without history entries; refresh; back-button journey through a multi-list flow.
8. **Type check + openspec validate.**

Rollback: revert the PR. Any `?hero=closed` URLs already shared silently degrade to expanded (unknown param ignored).

## Open Questions

- **Chevron icon choice.** `react-icons` has `FaChevronUp` / `FaChevronDown` (used in `CollapsibleRail`) and `MdExpandMore` / `MdExpandLess`. Match `CollapsibleRail` for consistency? Default = yes; revisit if the visual review wants something heavier.
- **Visibility-in-kebab interaction model.** Open in-menu via anchored popover, or close menu then open picker in a small modal? Anchored popover keeps the action one-click deep but stacks two floating surfaces (menu + popover). Decide under real interaction testing.
- **Where exactly does the handle sit on desktop two-card layout?** The expanded desktop hero is a single flex row; bottom-center of the outer `.list-hero-grid` is still meaningful, but it lands between the cards visually. Verify at 1024px and 1440px in implementation. If awkward, an alternative is "bottom-trailing edge" (bottom-right corner) — but that conflicts with kebab placement on the controls card.
- **Chevron handle's hit target.** Spec calls for ≥44×44px (WCAG 2.5.5). The visible handle is ~32×24px; expand the hit area via padding while keeping the visual smaller. Standard pattern.
