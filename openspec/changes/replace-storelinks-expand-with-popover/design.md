## Context

Today's `StoreLinks.tsx` orchestrates a hover-driven expand/collapse of extra buy-links inside the chip row. The implementation is built on:

- `flex-wrap: wrap` on `.storeLinks`
- A `max-width: 0 ↔ natural` transition on `.storeLinks-link--extra` to animate extras in/out
- A reciprocal `max-width: natural ↔ 0` on the `+N` chip so the trigger collapses as the extras appear
- A `cardRef`-scoped pointer-boundary so moving the cursor from the chip up to the item name doesn't snap the row shut, with a 220ms `COLLAPSE_DELAY_MS` grace period before close
- An `expanded` state used to gate `tabIndex`, `aria-hidden`, and pointer-events on the inert extras

When the expanded row's combined chip width exceeds the card's inner width, `flex-wrap: wrap` kicks in and produces a second flex line. The card grows by ~32px (one chip height); `grid-auto-rows: min-content` on `.item-grid` propagates that growth to every card in the same grid row. The visual result is a jarring synchronized jolt.

The chip-row sits at the bottom of `.item-info`, which sits inside `.item-container { overflow: hidden; border-radius: 10px; }`. The container's `overflow: hidden` is required because the item image fills the top of the card edge-to-edge — without clipping, the image's top corners wouldn't follow the card's rounded corners.

A new menu primitive family (`<Menu>`, `<MenuItem>`, `<MenuLinkItem>`, `usePopoverDismiss`) is being introduced by `standardize-menus-and-controls`, which is in flight. This change is the first non-trivial consumer of `<Menu>` outside the wrappers `standardize-menus-and-controls` itself re-shapes.

## Goals / Non-Goals

**Goals:**
- Card height is invariant to store count and to popover open/close state. No card in any grid row should change height when its neighbor's popover opens.
- The chip row is always exactly one line tall, regardless of viewport width.
- Hover-to-reveal is preserved as a desktop affordance — the existing UX of "glance at the chip → extras appear → glance away → they disappear" stays intact.
- Click and keyboard activation of the `+N` trigger work via `<Menu>`'s built-in model (no parallel keyboard implementation).
- The popover panel renders **inside the card's DOM subtree** (no React portal); the card's clipping behavior is restructured to allow this without artifacts.
- Zero parallel popover infrastructure: dismiss (click-outside, Escape, focus return) flows through `usePopoverDismiss` from `menu-system`.

**Non-Goals:**
- Redesigning the popover panel's interior (already specified by `<MenuLinkItem>` from `menu-system`).
- Changing the primary buy-link's variant, sizing, or color treatment.
- Reworking the `Purchase` button, claim-counter, or purchased-banner.
- Building any new menu/popover infrastructure — full reliance on `standardize-menus-and-controls`'s primitives.
- Animated open/close on the popover panel — match the existing `<Menu>` treatment (instant show/hide).
- Touch/mobile bottom-sheet variant for the panel — `<Menu>`'s default positioning is sufficient for 1–10 store entries.

## Decisions

### Decision 1: Single-row grid layout, not flex-wrap

Replace `.storeLinks { display: flex; flex-wrap: wrap; gap: 5px; }` with a CSS grid whose template-columns key off the presence of extras:

```css
.storeLinks {
  display: grid;
  grid-template-columns: 1fr;          /* single store — primary stretches */
  gap: 5px;
  width: 100%;
}

.storeLinks.has-extras {
  grid-template-columns: 1fr auto;     /* multi-store — primary stretches, +N hugs */
}
```

The `has-extras` class is set explicitly on `.storeLinks` by `StoreLinks.tsx` when `extras.length > 0`. Grid (not flex) is chosen because grid template-columns express the "1fr / auto" intent declaratively — flex would need a `flex: 1 1 auto` on the primary plus a `flex-shrink: 0` on the trigger, which expresses the same shape with less clarity.

**Alternative considered**: keep flex with `flex-wrap: nowrap; overflow: hidden;` and rely on the popover to surface hidden chips. Rejected — overflow-clipped chips visible in the row (if any aren't fully clipped) would be confusing; the grid `1fr auto` layout is cleaner.

**Alternative considered**: use `:has(.storeLinks-more)` selector instead of an explicit `.has-extras` class. Rejected — `:has()` browser support is fine but explicit class is more readable in JSX and easier to grep for at the call site.

### Decision 2: Drop `overflow: hidden` from `.item-container`; move clipping to leaf surfaces

The image-clip and bottom-banner-clip responsibilities move from the container to the surfaces that need them:

```css
.item-container {
  /* border-radius: 10px; border: 1.5px solid ...; — UNCHANGED */
  /* overflow: hidden; — REMOVED */
}

.item-image-container {
  /* aspect-ratio: 4/3; overflow: hidden; — UNCHANGED */
  border-top-left-radius: 10px;        /* NEW */
  border-top-right-radius: 10px;       /* NEW */
}

.purchased-banner {
  /* existing rules — UNCHANGED */
  border-bottom-left-radius: 10px;     /* NEW */
  border-bottom-right-radius: 10px;    /* NEW */
}
```

This restores the rounded-corner visual at the surfaces that actually touch the card boundary. The card's body content (`.item-info`) sits between the image and the banner (or card bottom) and never extends edge-to-edge, so it doesn't need its own clipping.

When `.purchased-banner` is absent (active item, viewer not seeing spoiler), the card's bottom-edge is the bottom of `.item-info`, whose background is inherited from `.item-container`'s `--light-color`. The card's `border-radius: 10px` border still describes the visual corner; content inside `.item-info` doesn't visually overlap the rounded region in any current layout.

**Alternative considered**: keep `overflow: hidden` and portal the popover to `document.body` with `getBoundingClientRect()`-driven positioning. Rejected by the user as "last resort" — portaling adds scroll/resize re-positioning logic, breaks event bubbling (which the existing `e.stopPropagation()` calls on chip clicks rely on), and introduces a popover-positioning architecture mismatch with the rest of the codebase (`StoreFilterPopover`, `ListActionsMenu`, `UserAvatarPopover` all render their popovers inside their wrapper's DOM subtree — `standardize-menus-and-controls` non-goal #5 explicitly leans against portals).

**Risk acknowledged**: any future card-internal element that needed `overflow: hidden`-style clipping must clip at its own surface. This is a one-time architectural shift; existing card content has been audited (image, owner-actions overlay top-right, item-info text, claim-counter, purchased-banner) and none rely on container-level clipping.

### Decision 3: Wrapper owns state; trigger and panel are sibling JSX inside the chip row

`StoreLinks.tsx` retains its role as orchestrator. It owns the `open` state, the anchor ref (for the panel's positioning), and the hover-boundary logic. The `<Menu>` primitive is rendered as a sibling of the `+N` trigger, anchored to it:

```tsx
<div className={`storeLinks${extras.length > 0 ? ' has-extras' : ''}`}>
  <LinkButton variant="primary" size="sm" className="storeLinks-link" href={primary.link} target="_blank" rel="noreferrer">
    {primary.name} <MdOpenInNew aria-hidden />
  </LinkButton>
  {extras.length > 0 && (
    <div ref={anchorRef} className="storeLinks-more-anchor">
      <Button
        variant="ghost"
        size="sm"
        className="storeLinks-more"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Show ${extras.length} more store${extras.length === 1 ? '' : 's'}`}
        onClick={() => setOpen(o => !o)}
        onMouseEnter={cancelCollapseAndOpen}
      >
        +{extras.length}
      </Button>
      <Menu open={open} onClose={() => setOpen(false)} anchorRef={anchorRef} aria-label="More stores">
        {extras.map(store => (
          <MenuLinkItem key={store.name} href={store.link} target="_blank" rel="noreferrer" icon={<MdOpenInNew aria-hidden />}>
            {store.name}
          </MenuLinkItem>
        ))}
      </Menu>
    </div>
  )}
</div>
```

The anchor wrapper (`<div ref={anchorRef}>`) is needed because the `+N` `<Button>` is a styled DOM element and accepting a ref through it would force a `forwardRef` change on `<Button>` that isn't in scope for this change. A wrapper `<div>` adds one DOM node per multi-store card — acceptable.

**Alternative considered**: pass `anchorRef` directly to `<Button>`. Rejected — would require `<Button>` to support `forwardRef`, which is a `standardize-buttons` concern and not in this change's scope.

### Decision 4: Hover-open layered on top of `<Menu>`'s click-to-open default

`<Menu>` from `menu-system` is controlled (Decision 3 of `standardize-menus-and-controls`): the wrapper sets `open`, the menu calls `onClose`. The wrapper is free to set `open=true` from any signal — click, hover, keyboard.

The hover-open behavior is wired entirely in `StoreLinks.tsx`:

- `onMouseEnter` on the `+N` trigger: cancel any pending collapse timer, set `open=true`.
- `onMouseLeave` on the anchor wrapper (`.storeLinks-more-anchor` — which contains both the trigger AND the panel because the panel renders as a child of `<Menu>` anchored here): schedule a 220ms collapse via the existing pattern. Re-using `COLLAPSE_DELAY_MS = 220` from today's implementation.
- The hover-boundary is now the **anchor wrapper**, not the card. This is a deliberate tightening: the current `cardRef`-based boundary is loose (the whole card stays "open"), which made sense when the chips lived inside the card; with a popover, the user's cursor path is trigger → panel, and the anchor wrapper covers both.

Click-outside dismiss and Escape-to-close come "for free" via `<Menu>`'s internal `usePopoverDismiss` integration. The wrapper does not duplicate that logic.

**Alternative considered**: drop hover-open entirely; click-only matches existing menus (`ListActionsMenu`, `UserAvatarPopover`). Rejected — the existing UX uses hover and the user has explicitly noted this fixes the hover-collapse pageshift problem (not removes it). Keeping hover preserves the affordance.

**Alternative considered**: open on `onMouseOver` (which fires on every descendant cross). Rejected — `onMouseEnter` only fires when crossing the element boundary, which is what we want.

### Decision 5: Touch / mobile behavior — click-only, no special-casing

On touch devices `onMouseEnter` doesn't fire reliably (`hover` media query is `none`). The click-toggle on the `+N` trigger is the universal interaction. `<Menu>` handles outside-tap dismissal via the same `usePopoverDismiss` `mousedown` listener that handles desktop click-outside.

No bottom-sheet variant is built. For 1–5 store entries (the realistic upper bound based on item data), a small absolute-positioned panel is adequate at all viewport widths. If a future caller needs many-option support with mobile sheet semantics, that's a `menu-system` concern, not this change's.

### Decision 6: Edge-flip placement is `<Menu>`'s responsibility, not ours

If the panel would render below the viewport edge (e.g. item in the last grid row), `<Menu>` is expected to flip to upward placement. The current `standardize-menus-and-controls/design.md` doesn't yet specify edge-flip explicitly, but the primitive owns positioning by design (Decision 3 of that change makes `<Menu>` responsible for positioning given an `anchorRef`).

If `<Menu>` ships without edge-flip, that's a `menu-system` follow-up — not a blocker for this change. The worst case is a partially-clipped panel at the bottom of the grid, which is the same behavior `StoreFilterPopover` exhibits today.

**Open question**: does `<Menu>` in `standardize-menus-and-controls` actually implement edge-flip in its v1? If not, file a follow-up there before this change ships.

### Decision 7: Remove the `prefers-reduced-motion` carve-out for storeLinks animations

The current `prefers-reduced-motion: reduce` block exists specifically to disable the `max-width` and `transform` transitions on extras. With those transitions removed entirely, the carve-out has nothing to do. Delete it.

**Note**: the `<Menu>` primitive's own open/close behavior is instant (per Decision 7 of `standardize-menus-and-controls`'s design: no animation), so no reduced-motion handling is required there either.

## Risks / Trade-offs

- **Risk**: Removing `overflow: hidden` from `.item-container` reveals an unanticipated visual artifact in some card state. → Mitigation: visual review at every viewport tier (2-col mobile, 3-col tablet, 4-col laptop, 6-col wide desktop) and in every card state (active, owner, archived/dimmed, purchased-banner-visible, spoiler-banner-visible). Specifically check: hover transform `translateY(-2px)` + `box-shadow` (does shadow render correctly on un-clipped container?); owner-actions overlay (top-right, 8px offset, well clear of corners); image hover scaling (none in current CSS, but verify).
- **Risk**: `<Menu>` from `standardize-menus-and-controls` ships without an edge-flip behavior, and items in the last grid row render the panel clipped off the bottom of the viewport. → Mitigation: file a follow-up against `menu-system` before this change applies; in the interim accept the same UX as today's `StoreFilterPopover` (worst-case partial clip at viewport bottom).
- **Risk**: The hover-collapse 220ms grace period feels too aggressive once the chip row is denser (primary stretches `1fr`, so the cursor's vertical travel from primary to `+N` is shorter). → Mitigation: tune via preview; the constant is one named value, easy to adjust.
- **Trade-off**: One extra DOM node per multi-store card (the anchor wrapper). → Accepted — clearer than retrofitting `forwardRef` on `<Button>`.
- **Trade-off**: This change depends on `standardize-menus-and-controls` having merged. → Accepted explicitly per user direction; we wait. The proposal/design/specs/tasks are written assuming `<Menu>`, `<MenuLinkItem>`, and `usePopoverDismiss` exist and behave per their spec.

## Migration Plan

- This change has no runtime data migration. It is purely a UI/interaction refactor.
- Roll-out is a single PR landing after `standardize-menus-and-controls`.
- Rollback strategy: revert the PR. The pre-change behavior (in-row expand with height jump) is intact at HEAD before this change.
- Cross-change coordination: after this change's PR is opened, add referencing comments to `openspec/changes/standardize-buttons/proposal.md` (the bullet that describes "keeping StoreLinks.tsx as the orchestrator that owns expand/collapse choreography") and `tasks.md` §8.6 / §10.3, noting that `replace-storelinks-expand-with-popover` supersedes the expand-choreography piece. The Button/LinkButton/Chip-ghost migration in §8.6 remains valid.

### Decision 8: Row-view layout redesign (D3 / M1-icons / M1-kebab)

The list view and sortable owner-edit view share `.item-list` / `.sortable-item` CSS. This change redesigns that layout away from the inherited grid-view-shaped flex stack toward a compact two-row row with a tall right-side pill.

Outer grid (applies to both `.item-list .item-container` and `.sortable-item .item-container`):

```
grid-template-columns: 52px 1fr auto auto auto;
grid-template-rows: auto auto;

col1  col2                col3       col4   col5
img   name (row1)         tall pill  +N     right-col
      price+leader (row2) (rows 1/3) (1/3)  (1/3)
```

Children are flattened into the outer grid via `.item, .item-info { display: contents }` — the existing `.item` rule already does this; `.item-info` is extended to match in row view only.

**Right-column (col5) is viewer-aware:**

| Viewer state | col5 content |
|---|---|
| Owner, no spoilers | edit + archive icons |
| Owner, with spoilers + claimed | (absorbed — see wide-pill rule below) |
| Non-owner, unclaimed | "Claim this gift" button |
| Anyone, claimed/fully-claimed/spoiler | (absorbed — wide pill spans cols 3 → 5) |

**Wide claimed-pill rule:** when the row's state is claimed (you/others), fully-claimed, or owner-spoiler, a single `.claimed-state` element gets `grid-column: 3 / -1` so it spans the buy-pill + +N + action slots. The `<StoreLinks>` chip row is already hidden in these states (`showStores={!showPurchased && !showSpoilerInfo}`); the wide pill takes the visual real estate.

**Visual treatment:**
- Wide claimed pill: same `--success-bg` / `--success-border` / `--success-text` as today's `.claimed-state`, but `min-height` matches the tall buy-link pill (~64px) for vertical alignment with the leader-dot row.
- "You claimed this · Undo" → text label + small right-aligned Undo button.
- "Claimed by [names]" or "Fully claimed by [names]" — combines state + attribution. Achieved by extending Item.tsx's `fullyClaimedLabel` prop to carry `Claimed by ${claimSummary}` (was just `'Fully claimed'`) and lifting the `isClaimed && !myClaim` branch to NOT render the Undo button.
- Owner spoiler: same green pill body, copy says "Spoilers: N/M · names".

**`.purchased-banner` footer is hidden in row view only** (`.item-list .purchased-banner, .sortable-item .purchased-banner { display: none }`). The info is folded into the wide pill. Grid view keeps the banner.

**Tall buy-link pill (page-scoped exception):**
```css
.item-list .btn.storeLinks-link,
.sortable-item .btn.storeLinks-link {
  align-self: stretch;
  min-height: 64px;
  max-width: 180px;
  white-space: normal;
  word-break: break-word;
}
```
Page-scoped override on the design-system primitive. Risk acknowledged (could shadow future `<LinkButton>` changes) but acceptable — the override touches min-height/max-width only; functional changes to LinkButton would still flow through.

**Leader dots:**
```css
.item-list .item-price-row,
.sortable-item .item-price-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.item-list .item-price-row::after,
.sortable-item .item-price-row::after {
  content: '';
  flex: 1;
  border-bottom: 1px dotted var(--card-border-color);
  margin-bottom: 6px;
}
```
Pseudo-elements are already not in the accessibility tree, so `aria-hidden` isn't needed.

### Decision 9: Mobile owner-actions strategy (two-stage)

Three viewport tiers in row view:

```
≥600px           D3 — two-row content, leader dots, edit/archive icons visible
400–599px        M1-icons — single-row content (no leader), icons still visible
<400px           M1-kebab — single-row, kebab opens <Menu>(Edit, Archive)
```

The kebab is rendered in DOM **for all owner rows** regardless of viewport; CSS gates visibility:

```css
/* default (grid view, large viewports): hide kebab */
.item-owner-actions-mobile { display: none; }

/* row view: show kebab only at <400px; hide inline icons */
@media (max-width: 399px) {
  .item-list .item-owner-actions,
  .sortable-item .item-owner-actions { display: none; }
  .item-list .item-owner-actions-mobile,
  .sortable-item .item-owner-actions-mobile { display: flex; }
}
```

The kebab `<Menu>` contains:
- `<MenuLinkItem href={editHref} icon={<MdModeEdit/>}>Edit</MenuLinkItem>`
- `<MenuItem icon={<MdArchive/>} onClick={archive}>Archive</MenuItem>` (when `showArchiveAction`)

Delete is **intentionally excluded** — Archive preserves other users' claim history; encouraging Delete would lose that. This is a product decision, not just a UX simplification.

### Decision 10: Single-row M1 layout (<600px)

Below 600px the two-row D3 layout (name top, price+leader bottom) collapses. New shape:

```
[img] [name (truncates) + price stacked vertically (no leader)] [tall pill] [+N] [Claim/icons/kebab]
```

The leader dots `::after` is removed at <600px via a media query (it doesn't make sense visually when name+price are stacked in a tight column). Implementation: `display: none` on the pseudo at <600px.

## Open Questions

- Does `<Menu>` ship with edge-flip positioning in `standardize-menus-and-controls`'s v1? If not, file a `menu-system` follow-up before applying this change. (Not a blocker — at worst, last-row items get a clipped panel, matching today's `StoreFilterPopover` behavior.)
- Should the primary store also appear inside the popover as a convenience repeat? Default answer: no (it's already visible in the row; repeating it is duplicate UI). If user testing post-launch shows confusion, revisit.
- Confirm `<MenuLinkItem>` from `menu-system` accepts `target` and `rel` attributes that pass through to the underlying `<a>`. The spec implies yes (it wraps Next `<Link>` and all link props pass through), but verify against the implemented primitive before applying.
