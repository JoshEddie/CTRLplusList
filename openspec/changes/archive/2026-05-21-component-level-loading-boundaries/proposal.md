## Why

The archived `replace-skeletons-with-spinners` change established `loading-indicator-system` and removed the `(main)/layout.tsx` Suspense wrapper on the principle that each route would own its own Suspense at the smallest reasonable container. In practice only `/` (HomePage) was migrated to wrap its async body in a page-level `<Suspense>`. Six other dynamic routes — `/items/[id]`, `/lists/[id]`, `/lists/[id]/edit`, `/lists/[id]/choose-items`, `/user/[id]`, and `/settings/connections` — still call `await auth()` (and downstream DAL reads) directly from an `async page.tsx` with no inner Suspense, leaning on the (now-removed) layout-level catch-all. Under Next 16's `cacheComponents: true`, this produces `HANGING_PROMISE_REJECTION` and `Uncached data was accessed outside of <Suspense>` errors during static prerender — `next build` fails on all six routes.

The existing `loading-indicator-system` spec already requires fallbacks to render "inside the **same** layout container as the content [they are] awaiting" and forbids a layout-level Suspense around `<MainShell>`. The spec is not the problem; the implementation never finished. This change finishes it by (a) enumerating the per-route component-level boundaries in the spec and (b) refactoring each affected page to match. Loading granularity is at the component boundary — the rails-self-load principle, applied uniformly.

## What Changes

> **Implementation note (added during apply):** the original proposal assumed `(main)/layout.tsx` would continue to render `<MainShell>{children}</MainShell>` and that fixing the six dynamic pages was sufficient. Build verification revealed `MainShell` itself was the prerender blocker — its `usePathname()` call accesses URL state that is dynamic for `[id]` routes, and as a client component above the page tree it cannot be sat behind a page-level `<Suspense>`. The change therefore also deletes `MainShell.tsx` and moves `<main className="container [variant?]">` ownership into each page under `(main)/`. See Decision D6 in design.md.

- **Page-level Suspense, component-level fallbacks.** For each of the six affected routes, extract the async data-fetching body into a co-located component (mirroring `HomePage.tsx` ↔ `(main)/page.tsx`). The `page.tsx` becomes a synchronous server component that renders the static shell (where there is one) and wraps each async section in its own `<Suspense>` with a `<LoadingIndicator>` sized to that section.
- **Section-level granularity where the page has independent sections:**
  - `/user/[id]`: separate Suspense for the profile-header section (`size="rail"`) and the lists-grid section (`size="page"`). `ListCollectionsNav` and the `Lists` `<Header>` stay outside Suspense as static shell.
  - `/settings/connections`: separate Suspense per `ConnectionsSection` (Following / Followers / Blocked, each `size="rail"`). `<Header title="Connections" />` stays outside as static shell.
  - `/lists/[id]`: separate Suspense for list-details / hero (`size="rail"`) and the items-container (existing `size="page"` inside `ItemsContainer` / `SortItemsContainer`).
- **Single Suspense where the page is one form:**
  - `/items/[id]`: page.tsx wraps `<ItemFormBody>` in one `<Suspense fallback={<LoadingIndicator size="form" />}>`, below a persistent `<Header title="Edit Item" />`. The redundant `app/(main)/items/[id]/layout.tsx` is deleted (its only purpose was to host the Suspense for the previously-async page).
  - `/lists/[id]/edit`: page.tsx wraps `<EditListBody>` in one Suspense (`size="form"`).
  - `/lists/[id]/choose-items`: page.tsx wraps `<ChooseItemsBody>` in one Suspense (`size="form"`).
- **BREAKING (internal):** delete `app/(main)/items/[id]/layout.tsx`. The route's static chrome (Header) moves into `page.tsx` outside the Suspense.
- **No new size variants.** The existing `inline | rail | form | page` enum covers every container in scope.
- **No layout-level Suspense.** `(main)/layout.tsx` stays free of `<Suspense>` per the existing spec requirement.

## Capabilities

### New Capabilities

<!-- None. -->

### Modified Capabilities

- `loading-indicator-system`: Add per-route requirements (and scenarios) for the component-level Suspense boundaries on the six previously-uncovered dynamic routes. Each new scenario names the route, the suspended component, the container it occupies, and the chosen `size` variant. The existing requirement "fallback SHALL render inside the same container the suspended content will occupy" stays binding; the new scenarios are concrete enforcements of it.

## Impact

- **Refactored pages (6):** `app/(main)/items/[id]/page.tsx`, `app/(main)/lists/[id]/page.tsx`, `app/(main)/lists/[id]/edit/page.tsx`, `app/(main)/lists/[id]/choose-items/page.tsx`, `app/(main)/user/[id]/page.tsx`, `app/(main)/settings/connections/page.tsx`. Each goes from `async export default` to a synchronous wrapper + a co-located async body component.
- **New co-located components (6):** one per refactored page (e.g., `ItemFormBody.tsx`, `EditListBody.tsx`, `ChooseItemsBody.tsx`; `ProfilePage.tsx` and `ConnectionsPage.tsx` already exist and are reused; `ListPage.tsx` is extracted from `lists/[id]/page.tsx`).
- **Deleted files (1):** `app/(main)/items/[id]/layout.tsx` (now redundant).
- **Section-level Suspense additions** inside `ProfilePage.tsx` (split into `<ProfileHeaderSection>` and `<ProfileListsSection>`), `ConnectionsPage.tsx` (split into `<FollowingSection>`, `<FollowersSection>`, `<BlockedSection>`), and `lists/[id]/page.tsx` (split into `<ListHeroSection>` and the existing `<ItemsContainer>` / `<SortItemsContainer>` which already own their internal Suspense).
- **No DB, server-action, cache-tag, or DAL impact.** Existing reads (`getUserIdByEmail`, `getList`, `getItemById`, `getProfileForUser`, `getFollowingByUser`, etc.) are already wrapped in `cache()`, so calling `auth()` + `getUserIdByEmail()` independently inside each section deduplicates per request — no extra DB round-trips.
- **No new dependencies, no new tokens, no new size variants on `LoadingIndicator`.**
- **No interactive-surface primitive impact** (button-system, form-field-system, menu-system, popover-trigger-system, segmented-control-system are untouched).
- **Build outcome:** `next build` succeeds for all 21 routes under `cacheComponents: true`. Each `[id]` route prerenders its static shell (Header + outer containers) and streams sections independently.
