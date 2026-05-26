## Context

Today the app expresses loading state in three different ways:

- **Route-segment `loading.tsx` files** under `app/(main)/items/`, `app/(main)/purchased/`, `app/(main)/lists/new/`, `app/(main)/lists/[id]/`.
- **Inline `<Suspense fallback={…}>` boundaries** inside `app/(main)/HomePage.tsx` (one per rail), `app/(main)/layout.tsx` (around `<MainShell>`), `app/(main)/items/ui/components/ItemsContainer.tsx`, `app/(main)/items/ui/components/SortItemsContainer.tsx`, and `app/(main)/items/[id]/layout.tsx`.
- **Layout-mimicking skeleton components** (`ListLoading`, `ItemLoading`, `ItemFormLoading`) backed by their own CSS files that try to draw the resolved page's shape ahead of resolution.

Two structural problems make this expensive to keep in sync:

1. The skeletons hard-code the _pre-redesign_ shape of each region — `ListLoading` draws an outlined-pill row + 3-column pulse grid that no longer resembles the home page's horizontally-scrolling rails of `ListCardRow` cards; `ItemLoading` draws a `auto-fill, minmax(350px, 1fr)` grid of 175px tiles which doesn't match the redesigned list-hero items area; `list-loading.css` references `--primary-color` for borders and hard-codes `#ffffff`, both stranded from earlier brand state. Every future redesign is paying a 2× cost to update both the page and the parallel skeleton.
2. The `(main)/layout.tsx` Suspense boundary wraps `<MainShell>` itself, so the `ListLoading` skeleton flashes across **every** route in the segment — including pages whose resolved layout looks nothing like a rail (e.g., `/items`, `/settings`).

Active specs that touch any of this:

- `app-frame` — defines the persistent shell, the gradient nav, and the token rules; says nothing about a Suspense boundary or skeleton shape (we can remove the boundary without a spec delta).
- `home-digest` — defines what each rail shows; says nothing about the in-flight rail visual (we can swap the fallback without a spec delta).
- `button-system` — owns `<Button isLoading>`'s inline spinner inside a button; **not** the surface-level "content is loading" indicator. The two concerns stay separate.

## Goals / Non-Goals

**Goals:**

- One shared `<LoadingIndicator>` primitive that every Suspense fallback and every `loading.tsx` in the app uses.
- Each fallback renders _inside the natural container of the content being awaited_ — a rail's spinner lives inside the rail box, a route segment's spinner fills the page surface, the edit-item form's spinner fills the form area.
- Each variant reserves a sensible min-height so the transition from spinner → resolved content doesn't visibly collapse / jump.
- Eliminate `ListLoading`, `ItemLoading`, `ItemFormLoading`, and their CSS so there is nothing left to drift.
- No new design tokens. Reuse `--primary-color` for the spinner stroke.

**Non-Goals:**

- A top-of-page progress bar (NProgress-style). Considered and rejected; would require wiring route-change events into the App Router and adds a dependency surface we don't otherwise have.
- A new "skeleton" primitive at the design-system level. The whole point is to stop shape-matching.
- Loading state for buttons / inline form controls. That is owned by `button-system` (`<Button isLoading>`) and is unchanged by this work.
- Removing per-rail Suspense boundaries on the home page. Streaming-in rails is the intended UX; we keep it.

## Decisions

### D1. One `<LoadingIndicator>` primitive with named size variants

Rather than letting each call site pass arbitrary heights, the primitive exposes a `size` prop with a fixed enum:

| `size`   | Min-height | Use case                                                                   |
| -------- | ---------- | -------------------------------------------------------------------------- |
| `inline` | `2rem`     | A spinner inline with text or a thin row                                   |
| `rail`   | `200px`    | Inside a `CollapsibleRail` body (matches a `ListCardRow`'s natural height) |
| `form`   | `400px`    | Inside the edit-item form layout                                           |
| `page`   | `60vh`     | Inside a route-segment `loading.tsx` that needs to fill the surface        |

Named sizes (not numeric props) keep call sites declarative and centralize the layout assumptions so a future redesign of e.g. `ListCardRow` only updates one constant.

**Alternative considered:** `<LoadingIndicator minHeight={200} />` taking arbitrary numbers. Rejected — pushes layout knowledge to every call site and reintroduces the drift problem in a different form.

### D2. Per-boundary placement, not per-page

Every `<Suspense>` keeps its existing position; the fallback simply changes from a layout-mimicking skeleton to `<LoadingIndicator size="rail|form|page" />`. The user-stated rule: "If there are 4 suspended objects on a page the spinner should be placed inside the container the object would inhabit." Concretely:

```
Before (HomePage.tsx, 4 rails):
  <CollapsibleRail …>
    <Suspense fallback={<ListLoading />}>   ← one rail-skeleton per rail
      <MyListsRail … />
    </Suspense>
  </CollapsibleRail>

After:
  <CollapsibleRail …>
    <Suspense fallback={<LoadingIndicator size="rail" />}>   ← spinner inside rail
      <MyListsRail … />
    </Suspense>
  </CollapsibleRail>
```

Rails continue to resolve independently — a cached rail renders instantly, an uncached rail shows its own rail-sized spinner. Four spinners visible simultaneously is acceptable: it reads honestly as "four things are loading," whereas the old shared skeleton implied a single page-level layout. In practice the rails stagger so all four are rarely visible at once.

### D3. Drop the `(main)/layout.tsx` Suspense wrapper around `<MainShell>`

`app/(main)/layout.tsx` currently wraps its child in `<Suspense fallback={<ListLoading />}>`. `MainShell` itself is not async (it's a client component that renders children) and no spec requires a layout-level fallback distinct from the route-segment `loading.tsx`. The wrapper exists as a legacy import path and is the largest single contributor to cross-route skeleton flash. Remove it. The route-level `loading.tsx` files (which we keep, with new fallbacks) continue to provide segment-level loading UX.

**Alternative considered:** Keep the wrapper, swap its fallback to `<LoadingIndicator size="page" />`. Rejected — the wrapper has no spec-mandated job and removing it eliminates a class of cross-route flash entirely.

**Follow-up discovered during implementation:** Removing the layout-level Suspense exposes Next 16's "uncached data accessed outside of `<Suspense>`" dev-mode warning for `app/(main)/page.tsx` — specifically because `HomePage` awaits `auth()` (dynamic, not cached) before any inner Suspense boundary. Fix is to add a page-level Suspense in `app/(main)/page.tsx` wrapping `<HomePage />` with `fallback={<LoadingIndicator size="page" />}`. This stays consistent with the spec because the prohibition is specifically against wrapping `<MainShell>` in `(main)/layout.tsx`, not against page-component Suspense usage. Additionally, add `app/(main)/loading.tsx` as a segment-level navigation fallback for routes in the `(main)` group that don't ship their own `loading.tsx` (e.g. `/settings`, `/following`, `/users`), so cross-group navigations have a Next-managed indicator instead of blocking on the page transition.

### D4. Spinner visual: pure CSS, no SVG/dep

The spinner is a 32px (`rail` / `form` / `page`) or 16px (`inline`) circle drawn with a CSS `border` + `border-top-color: var(--primary-color)` + `animation: spin 0.8s linear infinite`. No new dependency, no SVG asset, no Lucide/react-icons addition. Spinner sits inside the indicator's min-height box via flex centering. `aria-live="polite"` on the box and a visually-hidden "Loading…" label provide screen-reader support.

**Alternative considered:** Reuse a spinner SVG from `react-icons`. Rejected — adds a render-blocking import for a primitive we want everywhere.

### D5. `loading.tsx` for `/lists/new` keeps its `<Header title="Loading…" />`

`app/(main)/lists/new/loading.tsx` already shows a `<Header>` (not a skeleton) plus a sad container; we keep the header for context and swap the empty container for `<LoadingIndicator size="page" />`. This is a tiny route, but consistency with the other loaders matters more than the existing minimalism.

## Risks / Trade-offs

- **Risk:** Streaming home page renders four spinners at once when nothing is cached → reads as noisy. **Mitigation:** Rail spinners are deliberately quiet (small circle, no pulsing background). In practice rails resolve fast enough that you rarely see more than one or two simultaneously. If real-world feedback says it's noisy, we can lift the boundary up in a follow-up change — but that loses streaming and should be evaluated empirically, not pre-emptively.
- **Risk:** A `min-height` of `200px` per rail means an empty rail (no data, no error, content resolved) briefly _grows from spinner-height to its real height_. **Mitigation:** Rail empty-states (e.g., "No lists yet. Create your first one.") already render in roughly that vertical space; we'll size the variant to match the empty-state's natural height so the transition is visually quiet.
- **Risk:** `60vh` on `page` size is a lot of surface for short pages. **Mitigation:** It only renders during the (typically sub-second) `loading.tsx` window; once content resolves the value no longer matters.
- **Trade-off:** Users lose the "your data layout will look roughly like this" preview that skeletons provide. Acceptable: the preview was lying because the skeletons no longer match the resolved layout, and "honest spinner" beats "misleading skeleton."
- **Risk:** Deleting the legacy skeleton CSS could break a stray import we missed. **Mitigation:** `tsc --noEmit` plus a grep for the deleted symbols (`ListLoading`, `ItemLoading`, `ItemFormLoading`, `list-loading.css`, `item-loading.css`) before merge.

## Migration Plan

This is a single-PR migration; no feature flag needed.

1. Land `<LoadingIndicator>` and its CSS first as a no-op addition (no call-site swaps yet — verify it renders correctly in isolation via the dev bypass).
2. Swap call sites in dependency order: route-level `loading.tsx` first (lowest risk), then inline `<Suspense>` fallbacks, then the `(main)/layout.tsx` wrapper removal.
3. Delete the three skeleton components, their CSS files, and the `list-loading.css` import in `app/(main)/layout.tsx`.
4. Run `tsc --noEmit` + grep for stale references.
5. Verify with `AUTH_BYPASS=true` + `npm run db:seed:dev` that every previously-skeletoned surface now renders the spinner during load and the resolved content after.

**Rollback:** Single revert of the change PR restores the old skeleton components and CSS. No data or schema impact.

## Open Questions

None blocking implementation. One worth tracking for after the swap lands: do we want a top-of-page progress bar in addition to the per-boundary spinners for full-route navigations? Out of scope here; reopen in a separate proposal if real usage suggests it.
