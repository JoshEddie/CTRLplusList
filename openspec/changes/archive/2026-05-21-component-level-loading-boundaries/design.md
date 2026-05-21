## Context

The archived `replace-skeletons-with-spinners` change (May 21, 2026) introduced `loading-indicator-system` and removed `(main)/layout.tsx`'s catch-all `<Suspense>` wrapper around `<MainShell>`. The spec it created says fallbacks "SHALL render inside the same container the suspended content will occupy" and explicitly prohibits a layout-level boundary. The matching implementation work was completed for `/` (HomePage), the home rails, and the items grid — but **not** for the six other dynamic routes under `(main)/`. Those pages kept their original async `page.tsx` shape and silently depended on the layout boundary that no longer exists.

Under Next 16 with `cacheComponents: true` (set in [next.config.ts](next.config.ts)), every `await` on uncached data must sit inside a `<Suspense>` in the **static-prerenderable portion** of the route tree. The build fails today on:

```
> Export encountered errors on 5 paths:
	/(main)/items/[id]/page: /items/[id]
	/(main)/lists/[id]/choose-items/page: /lists/[id]/choose-items
	/(main)/lists/[id]/edit/page: /lists/[id]/edit
	/(main)/lists/[id]/page: /lists/[id]
	/(main)/user/[id]/page: /user/[id]
```

plus `HANGING_PROMISE_REJECTION` at `/settings/connections`. The traces all point at `app/(main)/layout.tsx:18` (`<MainShell>{children}</MainShell>`) — the exact line whose `<Suspense>` wrapper was removed.

`MainShell` is a client component (`'use client'`, uses `usePathname()` for variant classes), which means `loading.tsx` auto-injection lands *inside* the client boundary as a children prop — not in the server tree where Next 16 needs the Suspense to split the static shell from the dynamic stream. Therefore neither (a) the existing `app/(main)/lists/[id]/loading.tsx`, (b) the `app/(main)/items/loading.tsx`, nor (c) the existing async `app/(main)/items/[id]/layout.tsx` Suspense satisfy `cacheComponents`. The Suspense has to live in the **page.tsx** itself (synchronous server component, render-tree position above any `await`).

## Goals / Non-Goals

**Goals:**
- `next build` succeeds for every route under `(main)/` with `cacheComponents: true`.
- Every dynamic page renders its **static chrome** (Header, navigation rails) immediately; only the data-bearing sections suspend.
- Where a page has independent UI sections (e.g. profile header + lists grid; three connection lists; list-hero + items grid), each section streams independently with its own Suspense and its own container-sized fallback. Loading one section never blanks another.
- The (main) layout stays free of `<Suspense>`. The existing `loading-indicator-system` spec requirement is honored, not bypassed.
- No new size variants on `<LoadingIndicator>`; the existing `inline | rail | form | page` enum suffices.

**Non-Goals:**
- No new design tokens, no new dependencies, no new icon library, no spinner-shape changes.
- No DAL changes, no cache-tag changes, no DB changes. Existing `cache()`-wrapped DAL reads deduplicate per request.
- No changes to the home page (`/`), the items grid (`/items`, `/purchased`), the rails system, or the `<LoadingIndicator>` primitive itself.
- No new `loading.tsx` files. Where one already exists at a route segment (`items/`, `purchased/`, `lists/new/`, `lists/[id]/`), it stays as the navigation-level fallback; it is not the prerender boundary that the dynamic page relies on.

## Decisions

### D1. Each affected page becomes (synchronous `page.tsx` + Suspense) wrapping (async body component)

**What:** Every failing dynamic page is split:

- `page.tsx` becomes a synchronous server component. It renders the static chrome (Header, navigation rails) and one or more `<Suspense fallback={<LoadingIndicator size="…" />}>` wrappers around extracted async section components.
- Each async section component owns one cohesive data fetch (auth + DAL reads it actually uses) and renders the resolved UI.

**Why:**
- The `(main)/page.tsx` ↔ `HomePage.tsx` split already in the codebase is the model. Replicating it everywhere is the single highest-consistency option.
- Under `cacheComponents`, the synchronous `page.tsx` is statically prerenderable. The Suspense boundary is in the server tree, above all `await`s. Next can prerender the shell, stream the section.
- Putting the Suspense in `page.tsx` (not in a sibling `layout.tsx` and not in `loading.tsx`) avoids the `MainShell` client-boundary trap: `page.tsx` is rendered after `MainShell` resolves to its static HTML, so the Suspense it contains is unambiguously in the server tree from Next's prerender perspective.

**Alternatives considered:**
- **Restore the layout-level Suspense.** Rejected — directly violates the existing `loading-indicator-system` spec ("`(main)/layout.tsx` SHALL NOT contain a `<Suspense fallback={…}>` wrapper around `<MainShell>`"). Also produces a full-page blank during the brief `await auth()` phase, which is the exact UX the spec was written to avoid.
- **Convert `MainShell` to a server component so `loading.tsx` auto-injection works.** Would require moving `usePathname`-based variant detection into each route's own layout (7 layouts to add). Larger blast radius and doesn't actually deliver the desired *per-section* granularity — `loading.tsx` would still produce one page-level fallback for the whole route.
- **Add `'use client'` to MainShell's wrapper container and an inner server-component Suspense.** Not viable — Suspense boundaries inside a client component's children prop don't count as static-prerenderable boundaries under `cacheComponents`.
- **Make `items/[id]/layout.tsx` non-async (drop the gratuitous `async` keyword) and keep it as the Suspense host.** Possibly fixes that one route, but doesn't help the five others, and proliferates a `[id]/layout.tsx`-just-for-suspense pattern that adds a file per route without earning it. Single-page Suspense in `page.tsx` is the simpler shape.

### D2. Section-level Suspense where a page has independent sections; single-Suspense for one-form pages

**What:**
- `/user/[id]`: page.tsx renders `<ListCollectionsNav>` + `<Suspense size="rail"><ProfileHeaderSection id={id} viewerId={…} /></Suspense>` + `<Header title="Lists" />` + `<Suspense size="page"><ProfileListsSection id={id} /></Suspense>`. `ProfileHeaderSection` owns the `getProfileForUser` fetch; `ProfileListsSection` owns the `getPublicListsByUser` fetch. They stream independently — slow `getPublicListsByUser` doesn't delay header paint.
- `/settings/connections`: page.tsx renders `<Header title="Connections" />` + three `<ConnectionsSection>` shells, each wrapping its own `<Suspense size="rail">` around its data-fetching child (`<FollowingList />`, `<FollowersList />`, `<BlockedList />`). The section title + count chrome stays in the static shell; only the rows suspend.
- `/lists/[id]`: page.tsx renders `<Suspense size="rail"><ListHeroSection id={id} /></Suspense>` + `<Suspense fallback={<LoadingIndicator size="page" />}><ListItemsSection id={id} viewerId={…} /></Suspense>`. The existing `ItemsContainer` / `SortItemsContainer` keep their internal logic but are now wrapped at the page level so the hero and items are independently suspendable.
- `/items/[id]`, `/lists/[id]/edit`, `/lists/[id]/choose-items`: each is a single full-page form. page.tsx renders the persistent chrome (`<Header title="Edit Item" />` etc.) outside Suspense, and one `<Suspense fallback={<LoadingIndicator size="form" />}>` around the extracted form body.

**Why:**
- The user's stated principle: loading lives at the level of the component that's loading. A full-page spinner for one slow rail defeats the purpose of having independent rails.
- This is the same shape the home page already uses (4 independent rail Suspenses), generalized.
- The `loading-indicator-system` spec already encodes this rule: "Indicators SHALL NOT be lifted out into an outer container." The new scenarios make it enforceable per-route.

**Alternatives considered:**
- **One Suspense per page for every route.** Simpler to implement but loses the streaming-section benefit on multi-section pages. Particularly bad for `/settings/connections` (a single slow Blocked query would blank Following + Followers too) and `/user/[id]` (slow `getPublicListsByUser` would blank the profile header).
- **No section split — render-as-you-go inside the async body.** Would suspend the entire body for the slowest fetch. Same problem as one-Suspense-per-page.

### D3. Auth resolution duplicated across sections; rely on `cache()` for dedup

**What:** Each extracted section component calls `auth()` and `getUserIdByEmail()` independently (rather than the parent page resolving viewer once and passing it down). React `cache()` and NextAuth's per-request session caching dedupe the work — no extra DB round-trips.

**Why:**
- Keeps each section component self-contained: it owns its data requirements end-to-end, including authentication. That matches the rails-self-load principle.
- Avoids a render-prop / context shape just to pass `viewerId` from the parent (the parent would itself need to be async to resolve it, which would re-introduce the page-level Suspense problem we're trying to avoid).
- Verified that [getUserIdByEmail in lib/dal.ts](lib/dal.ts) is wrapped in `cache(async (email) => …)`, so multiple callers within one request share a single Promise.

**Alternatives considered:**
- **Resolve viewer in the synchronous page.tsx and pass `viewerId` to sections.** Not possible — `page.tsx` must stay synchronous to satisfy `cacheComponents`. Awaiting `auth()` in the wrapper would re-create the prerender error.
- **Resolve viewer once in a `Suspense`-wrapped async parent inside page.tsx, then pass viewerId via prop drilling.** Achievable but adds a layer of indirection and a wider Suspense boundary that defeats per-section streaming.

### D4. Delete `app/(main)/items/[id]/layout.tsx`; move its `<Header title="Edit Item" />` chrome into `page.tsx`

**What:** Remove the `[id]/layout.tsx` file entirely. The static chrome it currently renders inside its Suspense fallback (`<Header title="Edit Item" />`) moves into `page.tsx`'s static shell, outside the new Suspense.

**Why:**
- The layout exists solely to host a Suspense around an async page. With the new `page.tsx` shape, that Suspense is in the page itself; the layout would be a single-Suspense pass-through. Keep the surface area small.
- Deleting it eliminates the misleading `async` keyword on a layout that doesn't await anything — a snag that could re-trigger the same prerender confusion in the future.

**Alternatives considered:**
- **Keep `[id]/layout.tsx` and have it render `{children}` without a Suspense.** Functional but adds a file with no behavior beyond identity. Standard practice in this repo is to add a layout only when it provides per-route chrome.
- **Move the Header into a new shared `EditItemChrome.tsx` component.** Premature — Header is one line.

### D6. Delete `MainShell.tsx`; each page owns its `<main className="container [variant?]">` (added during apply)

**What:** During build verification of the original D1–D5 plan, all five `[id]` routes still failed prerender with `Uncached data accessed outside of <Suspense>` traces pointing at `app/(main)/layout.tsx:18:7` — `<MainShell>{children}</MainShell>`. A targeted experiment (temporarily removing `<MainShell>` from the layout) made the build pass instantly. Root cause: `MainShell` is a client component (`'use client'`) whose render reads `usePathname()` to pick a variant class. `usePathname()` for a `[id]` route returns a value that depends on the dynamic segment, which Next 16 with `cacheComponents: true` treats as uncached data access. Because `MainShell` is the topmost client boundary directly under `(main)/layout.tsx` (a server component), the dynamic access happens *above* every page-level `<Suspense>` in the tree — no page-level boundary can satisfy it.

Resolution:
- Delete `app/(main)/MainShell.tsx` entirely.
- `(main)/layout.tsx` renders `<AppFrame>{children}{modal}</AppFrame>` only — no `<main>`, no client wrapper.
- Each page under `(main)/` renders its own `<main className="container [variant?]">` as the outermost element of its return tree. Variant choice (`container--list-details`, `container--items-library`, `container--list-collections`, or none) lives with the page that owns the route.

**Why:**
- Removes the client/server boundary directly above the page tree, eliminating the URL-derived dynamic data leak.
- Keeps the `<main>` element where it's always been (no DOM-structure regression) — the CSS `>` selectors targeting `.container--variant > X` still resolve correctly because the variant class is on the `<main>` itself and the page's direct children remain the direct children.
- Co-locates variant choice with the route that needs it, instead of centralizing pathname-pattern matching in a wrapper. Adding a new variant route in the future is a one-line `className` edit in that route's page, not a regex update in a shared client component.
- Honors the original `loading-indicator-system` spec requirement that `(main)/layout.tsx` not wrap children in `<Suspense>` — no Suspense is needed at the layout level once the dynamic-pathname access is removed.

**Alternatives considered (and rejected):**
- **Re-add Suspense around MainShell in `(main)/layout.tsx`.** Pragmatic but directly violates the existing spec ("`(main)/layout.tsx` SHALL NOT contain a `<Suspense fallback={…}>` wrapper around `<MainShell>`") and produces a full-shell flash during URL resolution on every navigation, even with a `null` fallback.
- **Convert `MainShell` to a server component with `usePathname()` replaced by middleware-set `x-pathname` headers.** Adds middleware infrastructure just for variant detection. Server-side `headers()` is also dynamic data; would still need a Suspense boundary above any access. Doesn't actually fix the underlying problem.
- **Keep `MainShell` and wrap its variant logic in `useEffect`** so the initial server render uses a default class and client hydration applies the variant. Causes layout flicker (especially noticeable for `.container--list-details` with `height: calc(100vh - …)`) and triggers React hydration-mismatch warnings.
- **Apply variant via a child wrapper `<div className="container--variant">` inside `<main className="container">`.** Considered first. Breaks because `.container--list-details` etc. set `padding: 0; height: calc(100vh - var(--app-sticky-top))` that must override `<main class="container">`'s padding to anchor the fixed-height flex column to the viewport. With variant on a child div, the main's padding pushes the inner div inward and the absolute viewport math no longer aligns. Per-page `<main>` ownership avoids this without CSS refactoring.

**Touched files:** all 14 pages under `app/(main)/` (each now renders its own `<main>`), plus `app/(main)/layout.tsx` (simplified). `MainShell.tsx` deleted.

### D5. Keep existing route-segment `loading.tsx` files (`items/loading.tsx`, `purchased/loading.tsx`, `lists/new/loading.tsx`, `lists/[id]/loading.tsx`)

**What:** No changes to these files. They continue to serve as Next.js route-segment **navigation** fallbacks (visible when the user clicks a link and the new route's shell is being fetched).

**Why:**
- The `loading-indicator-system` spec requires every `loading.tsx` to render `<LoadingIndicator size="page" />`. The existing files already do, so they're in compliance.
- They serve a distinct purpose from page-level Suspense: navigation chrome between routes, not in-route streaming.
- Removing them would mean a blank flash during route transitions; keeping them is consistent with `(main)/loading.tsx` (the segment-wide navigation fallback the previous change added).

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| **Coordination with the in-flight `extract-visibility-constants` change**, which edits the literal string `'private'` / `'unlisted'` / `'public'` inside `app/(main)/lists/[id]/page.tsx`. My change extracts the async body of that same file into a new `ListPage.tsx`. Whichever lands second will need a one-time merge: the visibility-constant references must follow the extracted async body. | Call out explicitly in tasks.md. The merge is mechanical (the `VISIBILITY.X` references move from `page.tsx` to `ListPage.tsx` along with the rest of the async body). |
| **Each section calls `auth()` independently**, increasing the *number* of `auth()` invocations per request from 1 to N (N = number of sections, max 3 on `/settings/connections`). | NextAuth's `auth()` reads cookies and is cheap; `getUserIdByEmail` is `cache()`-wrapped so the DB hit happens once. Net cost: 2 extra cookie-decode operations on `/settings/connections`. Negligible vs. the streaming-section benefit. |
| **More files** — 4–6 new co-located components introduced. | Co-location inside the existing route folder keeps related code together; the new files match the existing `HomePage.tsx` ↔ `(main)/page.tsx` shape developers already navigate. No new top-level directories. |
| **Header / chrome duplication risk** — a route's static Header in `page.tsx` (outside Suspense) plus a re-render of the same Header in the resolved body could double up. | Convention: the **fallback** does NOT include a Header (the Header is in the static shell, always visible). Only `<LoadingIndicator size="…" />` goes in the fallback. The resolved body renders only the dynamic content, not the chrome. |
| **Section-level fallbacks could appear "shuffly"** on slow networks — Profile header pops in before the lists grid does, vs. one cleaner full-page transition. | Consistent with the home page's existing rails behavior, which the user explicitly endorsed. Independent streaming is the desired UX. |
| **`/lists/[id]/edit` and `/lists/[id]/choose-items` form fallbacks** show a generic `size="form"` spinner without any form-shaped chrome. The current archived `items/[id]/layout.tsx` also renders just `<Header>` + spinner; this matches that shape. | Acceptable — matches the existing edit-item flow's UX. If a future change wants a richer form skeleton, it would extend `<LoadingIndicator>` via a spec modification (the existing spec's "Unknown sizes are a type error" requirement enforces this). |
| **Build verification is only possible at `next build` time**, not in `next dev` (the bug only manifests during static prerender). | Tasks include a `npm run build` gate before considering the change done. |

## Migration / Rollout

This is a code-only refactor. No data migration. No feature flags. No environment changes.

- **Order of edits per route doesn't matter** — each route is independently broken under the current state, so each fix is independently green. Recommend implementing `/settings/connections` first (smallest blast radius, three-section pattern that other routes reuse) to validate the section-Suspense shape before touching the higher-traffic `/lists/[id]`.
- **Rollback:** `git revert` the change commit. The prior state (broken build) is recovered, but no user-visible regression — the build was already broken on `main`.

## Open Questions

None. The decisions above are concrete; the spec delta enumerates every per-route requirement.
