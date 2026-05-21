# loading-indicator-system Specification

## Purpose

Define a single shared loading-indicator primitive that provides every loading state in the app — used as the only `<Suspense>` fallback and the only rendered output of Next.js route-segment `loading.tsx` files under `app/(main)/`.

## Requirements

### Requirement: A single shared `<LoadingIndicator>` primitive SHALL provide every loading state in the app

The system SHALL expose exactly one shared loading-indicator primitive at `app/ui/components/LoadingIndicator.tsx`. This primitive SHALL be the only component used as a `<Suspense>` fallback or as the rendered output of a Next.js route-segment `loading.tsx` anywhere under `app/(main)/`. No page-scoped or feature-scoped loading-skeleton component SHALL exist alongside it.

#### Scenario: Every Suspense fallback uses the primitive

- **WHEN** any source file under `app/(main)/` contains a `<Suspense fallback={…}>` boundary
- **THEN** the `fallback` expression is either `<LoadingIndicator … />` (with a size variant) or `null`

#### Scenario: Every loading.tsx uses the primitive

- **WHEN** any `loading.tsx` file under `app/(main)/` is rendered by Next during route-segment loading
- **THEN** its top-level rendered output is `<LoadingIndicator size="page" />` (optionally inside a `<Header>` wrapper for routes that show a static page header during load)

#### Scenario: No competing skeleton primitive exists

- **WHEN** the codebase is searched for component names matching `*Loading.tsx` or stylesheets matching `*-loading.css` under `app/(main)/`
- **THEN** no such files exist other than the route-segment `loading.tsx` files themselves and `LoadingIndicator.tsx`

### Requirement: The `<LoadingIndicator>` primitive SHALL expose a fixed enum of size variants

The primitive SHALL accept a single required prop `size` whose type is the union `'inline' | 'rail' | 'form' | 'page'`. Each variant SHALL resolve to a fixed min-height for the indicator's outer box (`inline: 2rem`, `rail: 200px`, `form: 400px`, `page: 60vh`) and a fixed spinner diameter (`inline: 16px`, all others: 32px). The primitive SHALL NOT accept an arbitrary numeric height or arbitrary spinner-size prop; new shapes are added by extending the enum in this spec.

#### Scenario: Size variants resolve to declared min-heights

- **WHEN** `<LoadingIndicator size="rail" />` is rendered
- **THEN** its outer box has `min-height: 200px` and the spinner inside is 32px in diameter

#### Scenario: Inline variant uses a smaller spinner

- **WHEN** `<LoadingIndicator size="inline" />` is rendered
- **THEN** the outer box has `min-height: 2rem` and the spinner is 16px in diameter

#### Scenario: Unknown sizes are a type error

- **WHEN** a developer attempts `<LoadingIndicator size="huge" />`
- **THEN** TypeScript reports a type error and the build fails

### Requirement: The fallback SHALL render inside the same container the suspended content will occupy

For each `<Suspense>` boundary in the app, the `<LoadingIndicator>` fallback SHALL be placed such that it renders inside the **same** layout container as the content it is awaiting. Indicators SHALL NOT be lifted out into an outer container (e.g., a single page-level spinner cannot replace four rail-level Suspense fallbacks on the home page).

#### Scenario: Each home rail spinner lives inside its rail

- **WHEN** the home page (`/`) loads with four rails and no rail data is cached
- **THEN** each `CollapsibleRail` renders its own `<LoadingIndicator size="rail" />` inside the rail body — four independent spinners, not one shared spinner above the rails

#### Scenario: Edit-item form spinner lives inside the form layout

- **WHEN** the edit-item route (`/items/[id]`) loads
- **THEN** the `<LoadingIndicator size="form" />` renders inside the same form layout box that the resolved `<ItemForm>` will occupy, below the persistent `<Header title="Edit Item" />`

#### Scenario: Items grid spinner lives inside the items surface

- **WHEN** `app/(main)/items/loading.tsx` (or any route using `ItemsContainer`) is in its loading state
- **THEN** the `<LoadingIndicator size="page" />` renders inside the same `.app-surface` content well that the resolved items grid will occupy

### Requirement: The spinner SHALL be implemented in pure CSS using the existing `--primary-color` token

The spinner SHALL be rendered as a CSS-only animated element (a circle with a transparent border whose top color resolves from `var(--primary-color)`, rotated by a keyframe animation). The implementation SHALL NOT import an SVG asset, an icon-library spinner, or any new third-party dependency. No new color token SHALL be added to `global.css`; the spinner SHALL consume the existing `--primary-color`.

#### Scenario: Spinner stroke resolves from the brand token

- **WHEN** the spinner element is inspected
- **THEN** its `border-top-color` resolves to `var(--primary-color)` (not a literal hex value)

#### Scenario: No icon library is imported

- **WHEN** `LoadingIndicator.tsx` is read
- **THEN** the file contains no `import` from `react-icons`, `lucide-react`, or any equivalent

#### Scenario: No new design tokens are introduced

- **WHEN** `global.css` is diffed against its pre-change state
- **THEN** no new custom property is added on `:root` for the loading-indicator primitive

### Requirement: The `<LoadingIndicator>` SHALL be accessible to assistive technology

The primitive's outer box SHALL have `role="status"` and `aria-live="polite"`, and SHALL contain a visually-hidden text label "Loading…" so that screen-reader users receive an announcement when the indicator mounts. The spinner element itself SHALL have `aria-hidden="true"` so it is not announced separately from the text label.

#### Scenario: Screen reader announces loading

- **WHEN** a screen-reader user navigates to a page whose route segment is in its loading state
- **THEN** the assistive tech announces "Loading…" once when the indicator mounts

#### Scenario: Spinner element is hidden from a11y tree

- **WHEN** the spinner element is inspected via the accessibility tree
- **THEN** it has `aria-hidden="true"` and is not announced separately from the parent `role="status"` box

### Requirement: The `(main)` route group SHALL NOT wrap `<MainShell>` in a Suspense boundary with a loading-indicator fallback

`app/(main)/layout.tsx` SHALL NOT contain a `<Suspense fallback={…}>` wrapper around its `<MainShell>` child. Segment-level loading UX for routes under `(main)/` SHALL come from Next.js route-segment `loading.tsx` files (route-level or group-level) and/or from `<Suspense>` boundaries placed inside individual `page.tsx` files — NOT from a layout-level boundary in `(main)/layout.tsx`. The `(main)/layout.tsx` file SHALL NOT import or reference `LoadingIndicator` or any legacy skeleton component.

#### Scenario: Layout file is free of Suspense+fallback wrappers

- **WHEN** `app/(main)/layout.tsx` is read
- **THEN** it does not contain `<Suspense fallback={…}>` around `<MainShell>` or its children

#### Scenario: Cross-route flash is gone

- **WHEN** a user navigates between two routes under `(main)/` (e.g., `/` to `/settings`)
- **THEN** no rail-shaped or page-shaped loading indicator briefly renders at the layout level between the two route contents; only the destination route's own `loading.tsx` (or a closer `<Suspense>` boundary) participates in the transition

#### Scenario: A page may use an inline Suspense at the page-component level

- **WHEN** a page under `(main)/` needs to wrap an in-component `await` (e.g., `app/(main)/page.tsx` wrapping `<HomePage />` in a page-level `<Suspense>`)
- **THEN** that boundary is permitted; the prohibition applies only to a Suspense wrapper around `<MainShell>` in `(main)/layout.tsx`
