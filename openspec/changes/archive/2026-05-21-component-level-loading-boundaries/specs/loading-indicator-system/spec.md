## MODIFIED Requirements

### Requirement: The `(main)` route group SHALL NOT wrap its children in a Suspense boundary with a loading-indicator fallback

`app/(main)/layout.tsx` SHALL NOT contain a `<Suspense fallback={…}>` wrapper around the segment children (or around any wrapper component that holds them). Segment-level loading UX for routes under `(main)/` SHALL come from Next.js route-segment `loading.tsx` files (route-level or group-level) and/or from `<Suspense>` boundaries placed inside individual `page.tsx` files — NOT from a layout-level boundary in `(main)/layout.tsx`. The `(main)/layout.tsx` file SHALL NOT import or reference `LoadingIndicator` or any legacy skeleton component.

#### Scenario: Layout file is free of Suspense+fallback wrappers

- **WHEN** `app/(main)/layout.tsx` is read
- **THEN** it does not contain `<Suspense fallback={…}>` around `{children}` or any wrapper element that contains `{children}`

#### Scenario: Cross-route flash is gone

- **WHEN** a user navigates between two routes under `(main)/` (e.g., `/` to `/settings`)
- **THEN** no rail-shaped or page-shaped loading indicator briefly renders at the layout level between the two route contents; only the destination route's own `loading.tsx` (or a closer `<Suspense>` boundary) participates in the transition

#### Scenario: A page may use an inline Suspense at the page-component level

- **WHEN** a page under `(main)/` needs to wrap an in-component `await` (e.g., `app/(main)/page.tsx` wrapping `<HomePage />` in a page-level `<Suspense>`)
- **THEN** that boundary is permitted; the prohibition applies only to a Suspense wrapper at the `(main)/layout.tsx` level

## ADDED Requirements

### Requirement: `app/(main)/MainShell.tsx` SHALL NOT exist

The variant-class detection previously implemented in `app/(main)/MainShell.tsx` (a client component that read `usePathname()`) SHALL be removed. The file SHALL NOT exist. Variant-class selection SHALL live with each route's own page or layout (see "Each page under `(main)/` SHALL render its own `<main className=…>`" below). Under Next.js `cacheComponents: true`, `usePathname()` in a client component above the page tree accesses dynamic URL state for `[id]` routes, which cannot be satisfied by any page-level `<Suspense>`; removing the centralized client wrapper is the structural fix.

#### Scenario: MainShell file is absent

- **WHEN** the filesystem is inspected at `app/(main)/`
- **THEN** no file named `MainShell.tsx` exists in that directory

#### Scenario: `(main)/layout.tsx` does not reference MainShell

- **WHEN** `app/(main)/layout.tsx` is read
- **THEN** it contains no `import` of `MainShell` and renders no element named `<MainShell>`

### Requirement: Each page under `(main)/` SHALL render its own `<main className="container [variant?]">`

`app/(main)/layout.tsx` SHALL NOT render a `<main>` element. Each page file under `app/(main)/` (whether `page.tsx` directly or a co-located `*Page.tsx` it delegates to) SHALL render `<main className="container">` as the outermost element of its return tree. Pages whose route belongs to a variant family SHALL include the variant token in the same className:

- `container--list-details` — exactly the `/lists/[id]` route.
- `container--items-library` — `/items` and `/purchased`.
- `container--list-collections` — `/lists`, `/lists/bookmarks`, `/lists/history`, `/following`.
- (no variant token) — all other routes.

#### Scenario: Layout renders no `<main>`

- **WHEN** `app/(main)/layout.tsx` is read
- **THEN** its returned JSX contains no `<main>` element

#### Scenario: Variant routes carry their variant token

- **WHEN** any of `/lists/[id]`, `/items`, `/purchased`, `/lists`, `/lists/bookmarks`, `/lists/history`, or `/following` is requested
- **THEN** the response HTML contains exactly one `<main>` element whose `class` attribute matches the variant tokens specified above (e.g. `"container container--list-details"` for `/lists/[id]`)

#### Scenario: Non-variant routes use the plain `container` class

- **WHEN** any of `/`, `/items/[id]`, `/lists/[id]/edit`, `/lists/[id]/choose-items`, `/lists/new`, `/user/[id]`, or `/settings/connections` is requested
- **THEN** the response HTML contains exactly one `<main>` element whose `class` attribute is `"container"` (no variant token)

### Requirement: Every dynamic page under `(main)/` SHALL host its `<Suspense>` boundaries inside its own `page.tsx`

For each dynamic page under `app/(main)/` that performs `await` on uncached data (auth, DAL reads, `params`, `searchParams`), the `page.tsx` SHALL be a **synchronous server component** that renders the page's static chrome (including its `<main className="container [variant?]">`) and wraps each async data-fetching child component in a `<Suspense fallback={<LoadingIndicator size="…" />}>` boundary. Async data-fetching SHALL NOT occur directly in `page.tsx`'s default export; the page-level Suspense MUST be present in the static-prerenderable portion of the route tree. Equivalent Suspense placement in a sibling `layout.tsx` or a route-segment `loading.tsx` does NOT satisfy this requirement under Next.js `cacheComponents: true`.

#### Scenario: Synchronous page.tsx, async body extracted

- **WHEN** any dynamic page.tsx under `app/(main)/` (e.g. `items/[id]/page.tsx`, `lists/[id]/page.tsx`, `user/[id]/page.tsx`, `settings/connections/page.tsx`) is read
- **THEN** its default export is declared without the `async` keyword, contains no top-level `await`, and renders one or more `<Suspense>` boundaries whose children are the route's data-fetching components

#### Scenario: Build succeeds for every dynamic route

- **WHEN** `npm run build` is run with `cacheComponents: true` enabled in `next.config.ts`
- **THEN** static prerender succeeds for every route, including `/items/[id]`, `/lists/[id]`, `/lists/[id]/edit`, `/lists/[id]/choose-items`, `/user/[id]`, and `/settings/connections`, with no `Uncached data was accessed outside of <Suspense>` or `HANGING_PROMISE_REJECTION` errors

### Requirement: `/items/[id]` SHALL place its single `<Suspense>` inside `page.tsx` with no sibling `layout.tsx`

The `/items/[id]` route SHALL render its persistent `<Header title="Edit Item" />` directly in `page.tsx` outside any Suspense boundary, and SHALL wrap the form's data-fetching body in exactly one `<Suspense fallback={<LoadingIndicator size="form" />}>` inside the same `page.tsx`. The file `app/(main)/items/[id]/layout.tsx` SHALL NOT exist; the route SHALL inherit its layout chain from `(main)/layout.tsx` alone.

#### Scenario: No `[id]/layout.tsx` file

- **WHEN** the filesystem is inspected at `app/(main)/items/[id]/`
- **THEN** no file named `layout.tsx` exists in that directory

#### Scenario: Header is static chrome above the Suspense

- **WHEN** `/items/[id]` is in its loading state (form body unresolved)
- **THEN** `<Header title="Edit Item" />` is present in the DOM outside the Suspense boundary, and the `<LoadingIndicator size="form" />` fallback is rendered below it inside the same content well the resolved `<ItemForm>` will occupy

### Requirement: `/lists/[id]/edit` SHALL place a single `<Suspense>` inside `page.tsx`

The `/lists/[id]/edit` route's `page.tsx` SHALL be a synchronous server component that wraps the extracted async edit-list body in exactly one `<Suspense fallback={<LoadingIndicator size="form" />}>` boundary. No `layout.tsx` or `loading.tsx` is required for this route to satisfy the prerender contract.

#### Scenario: Edit-list form fallback is form-sized

- **WHEN** `/lists/[id]/edit` is in its loading state
- **THEN** `<LoadingIndicator size="form" />` is the only loading indicator in the rendered route, placed inside the same form container the resolved `<ListForm>` will occupy

### Requirement: `/lists/[id]/choose-items` SHALL place a single `<Suspense>` inside `page.tsx`

The `/lists/[id]/choose-items` route's `page.tsx` SHALL be a synchronous server component that wraps the extracted async choose-items body in exactly one `<Suspense fallback={<LoadingIndicator size="form" />}>` boundary.

#### Scenario: Choose-items form fallback is form-sized

- **WHEN** `/lists/[id]/choose-items` is in its loading state
- **THEN** `<LoadingIndicator size="form" />` is the only loading indicator in the rendered route, placed inside the same container the resolved `<ChooseItemsForm>` will occupy

### Requirement: `/user/[id]` SHALL render two independent section Suspenses for profile header and lists grid

The `/user/[id]` route's `page.tsx` SHALL render `<ListCollectionsNav>` as static chrome, then a `<Suspense fallback={<LoadingIndicator size="rail" />}>` around an extracted `<ProfileHeaderSection>` (responsible for `getProfileForUser` and the `<ProfileHeader>` + optional `<FollowPrompt>` render), then a static `<Header title="Lists" />`, then a `<Suspense fallback={<LoadingIndicator size="page" />}>` around an extracted `<ProfileListsSection>` (responsible for `getPublicListsByUser` and the `<PublicListsGrid>` render). The two sections SHALL stream independently — a slow `getPublicListsByUser` SHALL NOT delay the profile-header section's resolution.

#### Scenario: Profile header streams before lists grid resolves

- **WHEN** `/user/[id]` is loading and `getPublicListsByUser` is slower than `getProfileForUser`
- **THEN** the profile header section paints first with the resolved `<ProfileHeader>`, while the lists section still shows `<LoadingIndicator size="page" />` in the lists-grid container

#### Scenario: Two section spinners, not one page spinner

- **WHEN** `/user/[id]` is loading and neither section has resolved
- **THEN** two `<LoadingIndicator>` elements are visible: one at `size="rail"` inside the profile-header container, one at `size="page"` inside the lists-grid container. No single page-level spinner is rendered above them.

### Requirement: `/settings/connections` SHALL render one Suspense per `ConnectionsSection`

The `/settings/connections` route's `page.tsx` SHALL render `<Header title="Connections" />` as static chrome, then three `<ConnectionsSection>` shells (Following / Followers / Blocked), each wrapping its own `<Suspense fallback={<LoadingIndicator size="rail" />}>` around an extracted section-body component that owns its own `getFollowingByUser` / `getFollowersOfUser` / `getBlockedByUser` data fetch. The three sections SHALL stream independently — a slow Blocked query SHALL NOT delay the Following or Followers sections.

#### Scenario: Three independent section spinners

- **WHEN** `/settings/connections` is loading and no section has resolved
- **THEN** three `<LoadingIndicator size="rail" />` elements are visible, one inside each `<ConnectionsSection>` body. The section titles and counts (if statically known) render as part of the static shell above each spinner.

#### Scenario: Sections stream independently

- **WHEN** the Following query resolves before Followers and Blocked
- **THEN** the Following section paints its rows while the Followers and Blocked sections still show their rail-sized spinners

### Requirement: `/lists/[id]` SHALL render a list-hero Suspense and an items-container Suspense as two independent sections

The `/lists/[id]` route's `page.tsx` SHALL render two top-level `<Suspense>` boundaries: one wrapping an extracted `<ListHeroSection>` (responsible for `getList`, `getUserById`, `guardListViewable`, and the `<ListDetails>` render) with a `<LoadingIndicator size="rail" />` fallback, and one wrapping the existing `<ItemsContainer>` or `<SortItemsContainer>` selection logic with a `<LoadingIndicator size="page" />` fallback. The `<ListPrivate>` early-return path (when visibility is OWNER and viewer is not the owner) continues to occur inside the hero section's resolved render — no Suspense is needed for the private-list path because it short-circuits before the items section renders.

#### Scenario: Hero streams before items grid

- **WHEN** `/lists/[id]` is loading and the items query is slower than the list-metadata query
- **THEN** the `<ListDetails>` hero paints first while the items container still shows `<LoadingIndicator size="page" />`

#### Scenario: Private-list path renders without items Suspense

- **WHEN** `/lists/[id]` resolves to a visibility-OWNER list whose viewer is not the owner
- **THEN** `<ListPrivate>` renders inside the hero section's slot and no items-container Suspense is mounted

### Requirement: Page-level `<Suspense>` fallbacks SHALL NOT duplicate the page's static chrome

The `<Suspense fallback={…}>` boundary in each dynamic page's `page.tsx` SHALL render only the `<LoadingIndicator size="…" />` (and optional layout container needed for the indicator's size to be honored). It SHALL NOT include the page's persistent `<Header>`, navigation rails, or other chrome — those elements live outside the Suspense boundary in the static shell and are always visible during loading.

#### Scenario: Header not duplicated in fallback

- **WHEN** any dynamic page's `page.tsx` is inspected
- **THEN** any `<Header>` it renders is positioned outside (above or alongside) the `<Suspense>` boundary, not inside the `fallback` prop

#### Scenario: Fallback is minimal

- **WHEN** any dynamic page's `<Suspense fallback={…}>` expression is inspected
- **THEN** the fallback expression contains only `<LoadingIndicator size="…" />` (optionally wrapped in a layout-only container the indicator needs for sizing) — no headers, no nav, no skeleton structures
