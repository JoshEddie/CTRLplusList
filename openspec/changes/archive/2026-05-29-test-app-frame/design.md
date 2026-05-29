## Context

Sub-proposal 4.1 of the `test-coverage` initiative — the FIRST capability-flow carve-out. All six primitive-family carve-outs (3.1 button, 3.2 chip, 3.3 form-field, 3.4 menu, 3.5 popover-trigger, 3.6 segmented-control) and the foundation work (1.1 spike, 1.2 foundation, 0.1 housekeeping, 2.1 pure-libs) are archived. The `testing-foundation` capability is established and hardened: `__tests__/` colocation is the convention, the universal per-file floor is `lines:98 / statements:98 / branches:95 / functions:100` referenced from a single `COVERAGE_FLOOR` constant in `vitest.config.ts`, and the four-audit + invariant-elevation obligations are stable. This is the seventh test carve-out and the first to target a `(main)/`-page-rendering capability rather than a primitive family.

Unlike the primitive carve-outs, this carve-out elevates against an **already-substantive** spec (`app-frame`, created by archiving `redesign-home-and-tokens` with five real requirements, not the "TBD" placeholder Purpose seen in `menu-system` and `segmented-control-system`). The spec edits here are a mix: ONE MODIFIED scenario where the spec has drifted behind the source, and THREE ADDED requirements that lock invariants the source enforces today but no requirement currently states.

Carve-out (per parent `test-coverage` tasks.md §4.1):

| File | LOC | Char | Tested how |
|---|---|---|---|
| `app/ui/components/AppFrame.tsx` | 27 | Pure server component. Renders `<div.app-frame>` → `<header.app-nav>` → `<AppLogo />` + `<Suspense><AppNav /></Suspense>` + `<div.app-nav-avatar><Suspense><User /></Suspense></div>` → `<div.app-surface-bleed><div.app-surface>{children}</div></div>`. | jsdom + RTL; `User` import module-mocked (out of carve-out) |
| `app/ui/components/AppNav.tsx` | 93 | `'use client'`. The heaviest file: `usePathname()` + `useState(open)` + `useRef(wrapRef)` + two `useEffect` blocks (one closes the menu on route change; one attaches `mousedown` + `keydown` document listeners while `open === true` and removes them on close / unmount). `isActive()` with route-prefix matching, `/` exact-match exception, and the `LISTS_PEERS_EXCLUDED_FROM_ACTIVE` set carving out `/lists/bookmarks` and `/lists/history`. Renders the four `NAV_ITEMS` (`Home` / `Lists` / `Items` / `Purchased`) as `<Link class="app-nav-item">` with `aria-current="page"` on the active pill. | jsdom + RTL + userEvent + `next/navigation` module mock for `usePathname` |
| `app/ui/components/AppMenu.tsx` | 20 | Async server component. Renders `<div.menu>` with `<Logo />` + `<Suspense><Nav /></Suspense>` + `<Suspense><User /></Suspense>`. | jsdom + direct invocation (`const tree = await AppMenu()`); `User` mocked (out of carve-out); `@/lib/auth`'s `auth()` mocked (transitively via `Nav`) |
| `app/ui/components/AppLogo.tsx` | 18 | Pure presentational. `<Link href="/" class="app-logo" aria-label="Ctrl+List home">` wrapping a `<next/image>` with `priority`, `width=199`, `height=52`. | jsdom + RTL |
| `app/ui/components/Logo.tsx` | 16 | Pure presentational. `<next/image class="menu-logo" priority width=199 height=52>` — the inside-menu variant, no link wrapper. | jsdom + RTL |
| `app/ui/components/Header.tsx` | 16 | Pure presentational. Three props (`title`, `className?`, `children?`); renders `<div class="header ${className}"><div class="pageTitleContainer"><div class="pageTitle">{title}</div></div><div class="header-buttons">{children}</div></div>`. **Source quirk: the className is composed via template literal without the `className ?` guard, so the rendered class is `"header undefined"` when no `className` is passed.** | jsdom + RTL |
| `app/ui/components/Nav.tsx` | 28 | Async server component. `await auth()` then conditional render: if `session?.user` truthy, renders `<nav.nav-container>` with three `<LinkButton variant="on-dark">` (Lists / Items / Purchased); else returns `null`. | jsdom + direct invocation OR RTL async; `@/lib/auth` module mocked |
| `app/ui/hooks/useKeyboardOffset.ts` | 36 | Hook: `useKeyboardOffset(enabled: boolean): void`. Reads `window.visualViewport`; on `enabled` + viewport present, schedules a RAF-coalesced update that writes `--keyboard-offset` to `document.documentElement.style` as `${Math.max(0, innerHeight - vv.height - vv.offsetTop)}px`. Listens on `'resize'` and `'scroll'` of `visualViewport`. Cleanup cancels RAF, removes listeners, removes the CSS variable. | jsdom + harness component; `window.visualViewport` stubbed; `requestAnimationFrame` stubbed to capture-and-invoke |

Coverage floor: universal `COVERAGE_FLOOR` per `test-housekeeping` (98 / 98 / 95 / 100). Per-file thresholds are added by-name in `vitest.config.ts`, referencing the constant.

Bound by:

- `testing-foundation` — `__tests__/` colocation, universal `COVERAGE_FLOOR`, no-backdoor rule, four-gate pre-merge, four-audit + invariant-elevation obligations, assertion-substance bar, complexity ≤ 15, `<State>_<Behavior>` shape, three-role `describe()`, observable-behavior-over-execution, NextAuth-as-network-boundary mocking allowance.
- `app-frame` (active) — owns five existing SHALLs. This sub-proposal MODIFIES one scenario (R2 mobile-nav drift) and ADDS three SHALLs (Decisions 3a / 3b / 3c below). No requirements are REMOVED; the R1, R4, and R5 prose bodies + scenarios are unchanged.
- `button-system` (active) — `Nav.tsx` renders three `<LinkButton variant="on-dark">`. The primitive itself is already tested under `test-button-system`; this carve-out does not assert button-system SHALLs directly.

## Goals / Non-Goals

**Goals:**

- Land eight colocated test files (all jsdom) at the universal `COVERAGE_FLOOR`.
- Exercise every observable branch of every file — no execute-for-coverage renders, no tautological assertions, no snapshot-only tests.
- Promote `sonarjs/cognitive-complexity` from `warn` to `error` for all seven executable files via `eslint.config.mjs` per-file overrides.
- MODIFY the `app-frame` spec's R2 mobile-nav scenario to match source (lockup + toggle + avatar; 700px breakpoint).
- ADD three call-time SHALLs to the `app-frame` spec (mobile-menu dismissal contract; `/lists/bookmarks` + `/lists/history` peer-route exclusion from the Lists-pill active match; `useKeyboardOffset` `--keyboard-offset` CSS-variable contract).
- Complete the four-audit obligation (duplication / complexity / testability on source; assertion audit on the new tests) AND the invariant-elevation audit, recording dispositions in `tasks.md`.

**Non-Goals:**

- No source refactors anticipated. **One conditional disposition:** if the assertion-substance audit flags `Header.tsx`'s `"header undefined"` class-string quirk (when `className` is undefined), an in-place refactor lands as part of this change. Otherwise no source changes.
- No coverage of `User.tsx` (out of carve-out — lives at `app/(auth)/ui/components/User.tsx`; will be covered by a future auth-related sub-proposal).
- No coverage of `app/(main)/layout.tsx` (call site — not in carve-out).
- No coverage of `app/ui/components/AuthPage.tsx` (call site of `AppMenu` — not in carve-out).
- No coverage of `app/(main)/items/ui/components/ItemsToolbar.tsx`'s use of `useKeyboardOffset` (call site — covered by 4.5 `test-items-browser-chrome`).
- No coverage of `app-frame.css` directly (CSS not in JS coverage report; behavior-driven assertions via DOM attributes + JS state are the proxy).
- No e2e. The full keyboard-offset flow (mobile Safari pulls up the soft keyboard → `visualViewport` height changes → `--keyboard-offset` updates → `ItemsToolbar` filter sheet's `bottom` adjusts) is e2e territory and belongs to 6.x.
- No real upstream network call. `auth()` is mocked at the `@/lib/auth` boundary per `testing-foundation`'s NextAuth allowance. No real Google OAuth handshake.
- No DOM-snapshot tests. Every assertion names a specific attribute, class string, accessible name, callback shape, rendered text content, spied call argument, or CSS variable value.
- No re-verification of `redesign-home-and-tokens`'s archived migration scenarios (token introduction, gradient adoption). Those are historical migration outcomes verified at archive of that change; the spec requirements stand. This carve-out exercises the structural and behavioral contracts only.

## Decisions

### Decision 1: One `.test.tsx` per executable source file; tests live under `__tests__/` directories mirroring the source layout.

The carve-out has seven `.tsx`/`.ts` source files in two directories (`app/ui/components/` and `app/ui/hooks/`). Each gets its own test file colocated under a `__tests__/` directory per the `test-housekeeping` convention.

Test file locations:

- `app/ui/components/__tests__/AppFrame.test.tsx`
- `app/ui/components/__tests__/AppNav.test.tsx`
- `app/ui/components/__tests__/AppMenu.test.tsx`
- `app/ui/components/__tests__/AppLogo.test.tsx`
- `app/ui/components/__tests__/Logo.test.tsx`
- `app/ui/components/__tests__/Header.test.tsx`
- `app/ui/components/__tests__/Nav.test.tsx`
- `app/ui/hooks/__tests__/useKeyboardOffset.test.tsx`

**Alternatives considered:**

- *One mega `app-frame.test.tsx` covering all seven components plus the hook.* Rejected — destroys per-source-file coverage attribution and degrades failure output. Same reasoning as every prior carve-out.
- *Group the four pure presentational files (`AppLogo`, `Logo`, `Header`, plus a subset of `AppFrame`) into a single `presentational.test.tsx`.* Rejected — even though four files are similarly tiny, per-file thresholds in `vitest.config.ts` enumerate by source path, and per-file failure attribution is load-bearing for the eight-week test-coverage initiative's debuggability.
- *Combine `AppLogo.test.tsx` and `Logo.test.tsx` since they differ only in the link wrapper.* Rejected — they are separate exports with separate consumers (AppFrame uses AppLogo at the top of the gradient nav; AppMenu uses Logo inside the menu shell). Separate tests assert each contract independently.
- *Hook test under `app/ui/components/__tests__/` to keep all eight together.* Rejected — `useKeyboardOffset.ts` lives at `app/ui/hooks/useKeyboardOffset.ts`. The colocation convention requires tests next to source; relocating the test would break the rule. The hook's `__tests__/` directory creation is the first under `app/ui/hooks/` — this is correct.

### Decision 2: `Nav.tsx` and `AppMenu.tsx` are tested by mocking `@/lib/auth`'s `auth()` at file scope; `<User>` is mocked when imported transitively by carve-out files.

`Nav.tsx` and `AppMenu.tsx` are async server components that call `await auth()` from `@/lib/auth`. The `testing-foundation` requirement "Tests SHALL NOT call rate-limited external services" explicitly names "NextAuth Google OAuth" as a network boundary to mock. `@/lib/auth` is the thin wrapper around NextAuth's `auth()` export (it adds the dev-bypass branch and re-exports the route-handler overload). Mocking `@/lib/auth` IS mocking at the NextAuth boundary — NOT mocking an internal application module (the testing-foundation prohibits the latter, allows the former).

**Mock shape** for the two files that consume auth:

```ts
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// In a beforeEach, configure the return:
vi.mocked(auth).mockResolvedValue({
  user: { name: 'Test User', image: null, email: 't@example.com' },
  expires: new Date(Date.now() + 86400000).toISOString(),
} satisfies Session);
```

The session shape matches NextAuth's `Session` type. Tests vary the mock return (`null`, `{ user: undefined } as Session`, or a populated session) to exercise each branch:

- `Nav.tsx`: when `session === null`, returns `null`; when `session.user === undefined`, returns `null`; when populated, renders the three LinkButtons.
- `AppMenu.tsx`: structure is unconditional; `auth()` is read by the transitively rendered `<Nav>` and `<User>`. Mock the session populated for the structural test.

**`<User>` import:** `AppFrame.tsx` and `AppMenu.tsx` both import `User` from `app/(auth)/ui/components/User.tsx`. `<User>` is OUT of carve-out and itself calls `auth()`. For tests of AppFrame and AppMenu, mock the `User` module to a tiny stub that renders `<div data-testid="user-stub" />`:

```ts
vi.mock('../../(auth)/ui/components/User', () => ({
  default: () => <div data-testid="user-stub" />,
}));
```

This keeps the test focused on the carve-out's own behavior (structure / composition) without exercising `<User>`'s internals.

**Alternatives considered:**

- *Refactor `Nav.tsx` and `AppMenu.tsx` to accept a `session` prop and have the callers thread `await auth()` through.* Rejected — the call-site change spreads beyond the carve-out (every place that renders `<Nav />` or `<AppMenu />` would need to pass a session) and changes the public API of two server components for the sake of testing. The carve-out's testability authority is single-file, in-place; cross-file API changes are deferred per `testing-foundation`'s refactor-scope rule.
- *Refactor `Nav.tsx` to extract a pure `NavMarkup` component that takes `session` as a prop; keep the auth-calling shell.* Rejected for the same scope reason — the in-place test mock achieves the same coverage without API churn. The `Nav` shell IS the auth-calling shell by intent; testing it requires either mocking auth (this approach) or refactoring (rejected). The `Header.tsx` `className` template-literal quirk is the only refactor likely to land in this carve-out.
- *Mock `next-auth` directly (the upstream package) instead of `@/lib/auth`.* Rejected — `next-auth`'s `auth()` export is a higher-order function with multiple call signatures (zero-arg, request-context, route-handler-wrapped). Mocking `@/lib/auth` (which exports a single resolved `auth` of the zero-arg form) is more targeted and matches the file-under-test's import path. Same precedent as future actions tests will follow.

### Decision 3: MODIFY one R2 scenario, ADD three call-time SHALLs to `app-frame`. Leave R1, R3 (in part — refined by 3b), R4, R5 unchanged.

The invariant-elevation audit (per `testing-foundation`) gates each invariant the tests assert against three-part criteria (non-obvious / survives reimplementation / protects real failure mode). The audit also surfaces drift between source and spec — when the source enforces a behavior the spec contradicts, the spec is the artifact updated (the source is the design intent), per the precedent set by every prior test-* carve-out's invariant-elevation step.

#### Decision 3a (MODIFIED + ADDED): R2 mobile-nav scenario is corrected, AND a NEW Requirement locks the mobile-menu dismissal contract.

The current R2 prose body reads "On mobile (≤800px, matching the existing `nav-hide` breakpoint) the primary nav pills SHALL be hidden, leaving only the lockup and avatar." The current R2 scenario "Mobile nav drops the pill row" reads:

> **WHEN** the viewport is 800px wide or narrower
> **THEN** the gradient nav shows only the brand lockup at left and the avatar circle at right

The source at HEAD does NOT match. `AppNav.tsx` renders a `LuMenu` / `LuX` toggle button (`.app-nav-toggle`), and `app-frame.css` declares `@media (max-width: 700px)` (not 800px) with the toggle's `display: inline-flex` (visible on mobile) and the pill row's `display: none` by default → `display: flex` when `.app-nav-wrap[data-open='true']`. The mobile chrome is: lockup + toggle + avatar (three elements), with the toggle revealing the pills as a vertical popover-style menu.

**MODIFIED R2 prose** updates the breakpoint reference: "On mobile (≤700px) the primary nav pills SHALL collapse behind a toggle button, leaving the lockup, toggle, and avatar visible by default."

**MODIFIED R2 scenario** "Mobile nav drops the pill row" → "Mobile nav collapses pills behind a toggle":

> **WHEN** the viewport is 700px wide or narrower
> **THEN** the gradient nav shows the brand lockup, a toggle button (closed state: `LuMenu`, `aria-label="Open menu"`, `aria-expanded="false"`), and the avatar circle
> **AND** the primary nav pills are NOT visible
> **AND WHEN** the toggle is clicked
> **THEN** the toggle's `aria-expanded` flips to `"true"`, its `aria-label` flips to `"Close menu"`, its icon flips to `LuX`
> **AND** the four primary nav pills render as a vertical popover anchored below the toggle

**ADDED Requirement** locks the dismissal contract:

> ### Requirement: The mobile AppNav menu SHALL auto-close on route change, outside pointer-down, and Escape
>
> When the AppNav toggle menu is open (`data-open="true"`), it SHALL close (set `data-open="false"`, restore the `LuMenu` icon and `"Open menu"` aria-label) on any of three triggers: (a) the `pathname` returned by `usePathname()` changes (route navigation); (b) a `mousedown` event fires on an element outside the `.app-nav-wrap` container; (c) a `keydown` event fires with `key === 'Escape'` anywhere in the document. The outside-pointer and Escape listeners SHALL be attached to `document` only while the menu is open, and SHALL be removed when the menu closes or the component unmounts. A `mousedown` inside the `.app-nav-wrap` container SHALL NOT close the menu (the `wrapRef.current.contains(e.target)` guard preserves the click on the toggle button and on any pill within the menu).
>
> #### Scenario: Route change closes the menu
>
> - **WHEN** the menu is open and `usePathname()` returns a new path
> - **THEN** the menu transitions to closed (`data-open="false"`)
>
> #### Scenario: Outside mousedown closes the menu
>
> - **WHEN** the menu is open and a `mousedown` event fires on an element that is NOT a descendant of `.app-nav-wrap`
> - **THEN** the menu transitions to closed
>
> #### Scenario: Escape keydown closes the menu
>
> - **WHEN** the menu is open and a `keydown` event with `key === 'Escape'` fires on `document`
> - **THEN** the menu transitions to closed
>
> #### Scenario: Inside mousedown does NOT close the menu
>
> - **WHEN** the menu is open and a `mousedown` event fires on the toggle button or on a pill inside `.app-nav-wrap`
> - **THEN** the menu remains open
>
> #### Scenario: Listeners are scoped to open state
>
> - **WHEN** the menu is closed
> - **THEN** no `mousedown` or `keydown` listener is attached to `document` for the dismissal contract
> - **AND WHEN** the menu opens
> - **THEN** both listeners attach
> - **AND WHEN** the menu closes or the component unmounts
> - **THEN** both listeners detach

Non-obvious (the dismissal triggers and the listener-scoping-by-open-state are not in the existing spec; a naive implementation might attach listeners globally and never remove them). Survives reimplementation (any rewrite of the menu state machine has to preserve the three close triggers — they're the load-bearing UX contract that makes the mobile menu usable). Protects real failure modes: (a) menu stays open after navigation looks broken on mobile; (b) menu traps focus when user clicks elsewhere; (c) Escape is the keyboard a11y standard for popover dismissal; (d) leaked listeners accumulate across mount/unmount cycles. Elevated.

#### Decision 3b (ADDED): `/lists/bookmarks` and `/lists/history` SHALL NOT activate the Lists nav pill.

The source `LISTS_PEERS_EXCLUDED_FROM_ACTIVE` set at HEAD:

```ts
const LISTS_PEERS_EXCLUDED_FROM_ACTIVE = new Set([
  '/lists/bookmarks',
  '/lists/history',
]);

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  if (href === '/lists' && LISTS_PEERS_EXCLUDED_FROM_ACTIVE.has(pathname)) {
    return false;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
```

The active R3 scenarios cover the positive cases (`/` activates Home, `/lists` and `/lists/abc123` activate Lists, `/settings/connections` activates nothing). The peer-route exclusion is encoded only in source; no scenario currently locks it. Per the active spec's R3 prose body, "Matching SHALL use route prefix: ... `/lists` (and any `/lists/...` descendant) matches Lists" — which is FALSE for `/lists/bookmarks` and `/lists/history` (they match the prefix but are excluded by the source set).

**ADDED Requirement**:

> ### Requirement: The Lists nav pill SHALL NOT activate on `/lists/bookmarks` or `/lists/history`
>
> The active-pill prefix rule for the Lists destination (`pathname === '/lists' || pathname.startsWith('/lists/')`) SHALL be carved with an explicit exclusion set containing exactly `/lists/bookmarks` and `/lists/history` (the bookmark and visit-history peer collections, which belong to the `list-collections` capability and have their own page-level sub-nav as the canonical "where am I?" signal). When `pathname` is one of these two exact strings, the Lists pill SHALL render in the inactive state and no pill in the four primary destinations SHALL render active. New peer routes added under `/lists/` SHALL be added to the exclusion set by the same edit that adds them, unless their page intent is to behave AS a list-detail view.
>
> #### Scenario: Bookmarks route does not activate Lists pill
>
> - **WHEN** the viewer is on `/lists/bookmarks`
> - **THEN** the Lists pill renders inactive (no `app-nav-item--active` class, no `aria-current="page"`)
> - **AND** no other primary nav pill renders active
>
> #### Scenario: History route does not activate Lists pill
>
> - **WHEN** the viewer is on `/lists/history`
> - **THEN** the Lists pill renders inactive
> - **AND** no other primary nav pill renders active
>
> #### Scenario: List detail route still activates Lists pill
>
> - **WHEN** the viewer is on `/lists/abc123` (a list detail, NOT a peer collection)
> - **THEN** the Lists pill renders active (the exclusion set does not affect non-listed paths)

Non-obvious (the prefix rule is general; the exclusion is a specific carve-out the source contains but the spec does not). Survives reimplementation (any future contributor who rewrites `isActive` without the exclusion would silently break the UX — the test names the regression specifically). Protects a real failure mode: a user on `/lists/bookmarks` sees the Lists pill highlighted, infers "I'm in my owned-lists view", but is actually in a different collection — confusing and a real reported UX defect class. Elevated.

#### Decision 3c (ADDED): `useKeyboardOffset` SHALL surface the offset as `--keyboard-offset` on `document.documentElement`.

The source at HEAD:

```ts
const root = document.documentElement;
// ...
root.style.setProperty('--keyboard-offset', `${offset}px`);
// ...
root.style.removeProperty('--keyboard-offset');
```

The CSS variable name `--keyboard-offset` and the target element `document.documentElement` (i.e. `:root`) are a cross-file API: `ItemsToolbar`'s filter sheet reads `var(--keyboard-offset, 0px)` in its `bottom` calculation (in `app/(main)/items/ui/styles/item.css`). A rename, scope change (e.g. setting on `body` instead of `:root`), or unit change (e.g. emitting raw pixel count without `px`) silently breaks the floating filter sheet's mobile keyboard offset.

**ADDED Requirement**:

> ### Requirement: useKeyboardOffset SHALL surface the soft-keyboard inset as `--keyboard-offset` on `:root`
>
> The `useKeyboardOffset(enabled)` hook at `app/ui/hooks/useKeyboardOffset.ts` SHALL set the CSS custom property `--keyboard-offset` on `document.documentElement` (NOT on `document.body`, NOT on any consumer-passed element) while the hook is enabled and `window.visualViewport` is available. The value SHALL be a `px`-suffixed string computed as `${Math.max(0, window.innerHeight - vv.height - vv.offsetTop)}px`. The hook SHALL register `'resize'` and `'scroll'` listeners on `window.visualViewport` to recompute on viewport changes. Multiple rapid viewport events SHALL be coalesced through `requestAnimationFrame` so the property updates at most once per animation frame. On disable (`enabled` transitions to `false`) and on unmount, the hook SHALL (a) cancel any pending RAF, (b) remove the `'resize'` and `'scroll'` listeners from `visualViewport`, and (c) remove the `--keyboard-offset` property from `document.documentElement` (so consumers see the fallback `0px` from `var(--keyboard-offset, 0px)`). When `enabled === false`, when `typeof window === 'undefined'` (SSR), or when `window.visualViewport === undefined`, the hook SHALL NOT install any listener and SHALL NOT set the CSS property.
>
> #### Scenario: Enabled with viewport sets the property on :root
>
> - **WHEN** `useKeyboardOffset(true)` is called and `window.visualViewport` exists
> - **THEN** `document.documentElement.style.getPropertyValue('--keyboard-offset')` returns a `px`-suffixed string equal to `${Math.max(0, innerHeight - vv.height - vv.offsetTop)}px`
> - **AND** `document.body.style.getPropertyValue('--keyboard-offset')` returns `''` (the property is NOT set on body)
>
> #### Scenario: Viewport event triggers RAF-coalesced update
>
> - **WHEN** the hook is enabled and a viewport `'resize'` event fires
> - **THEN** a `requestAnimationFrame` is scheduled
> - **AND** if a second `'resize'` event fires BEFORE the RAF tick, no second RAF is scheduled (the `rafId !== null` guard short-circuits)
> - **AND** on the RAF tick, `--keyboard-offset` updates to the new computed value
>
> #### Scenario: Disable cancels RAF and removes the property
>
> - **WHEN** the hook is enabled with a pending RAF, then `enabled` transitions to `false` (or the consumer unmounts)
> - **THEN** the pending RAF is cancelled (`cancelAnimationFrame` is called with the captured id)
> - **AND** both viewport listeners are removed
> - **AND** `document.documentElement.style.getPropertyValue('--keyboard-offset')` returns `''`
>
> #### Scenario: SSR / missing-viewport short-circuit
>
> - **WHEN** `useKeyboardOffset(true)` is called in an environment where `typeof window === 'undefined'` OR `window.visualViewport === undefined`
> - **THEN** no listener is registered, no RAF is scheduled, and `--keyboard-offset` is not set
>
> #### Scenario: Disabled short-circuit
>
> - **WHEN** `useKeyboardOffset(false)` is called
> - **THEN** no listener is registered, no RAF is scheduled, and `--keyboard-offset` is not set

Non-obvious (the name `--keyboard-offset`, the target `:root`, the `Math.max(0, ...)` clamp, and the RAF coalescing are implementation details a casual reader would not infer from the hook's signature). Survives reimplementation (the cross-file API is the variable name + target; any rewrite has to preserve them or coordinate a CSS edit). Protects real failure modes: silent keyboard-offset regression on mobile Safari for the `ItemsToolbar` filter sheet (the variable's only consumer at HEAD); listener leaks if cleanup is miswritten; layout thrash if RAF coalescing is removed. Elevated.

**Alternatives considered for 3c:**

- *Don't elevate the RAF coalescing — only elevate the variable name and target.* Rejected — the coalescing is what keeps the variable from being written multiple times per visual viewport burst (browsers fire `resize` repeatedly during keyboard show animations). Removing coalescing would not break correctness but would cause layout thrash. The spec is small enough to cover both contracts; bundling them is cleaner than splitting.
- *Elevate the `Math.max(0, ...)` clamp as a separate SHALL.* Rejected — folded into the main SHALL's value-computation clause. The clamp prevents a negative offset from being emitted when `vv.offsetTop > 0` (e.g. when the page is scrolled and the browser address bar collapses). One requirement covers it.
- *Move the SHALL to a new `keyboard-offset-system` capability spec.* Rejected — `useKeyboardOffset` is owned by the `app-frame` capability (it ships with the frame's mobile chrome, and the only consumer at HEAD is `ItemsToolbar`, a capability-flow under `app-frame`-rendered routes). Creating a new capability for a 36-line hook is overkill.

### Decision 4: Async server components (`AppMenu`, `Nav`) are tested via direct invocation, NOT via RTL `render`.

React 19 + Vitest + RTL has incomplete support for rendering async server components transparently via `render(<AsyncComp />)`. The reliable pattern is:

```tsx
import AppMenu from '../AppMenu';
// ...
const tree = await AppMenu();
render(tree);
// Now assert on the synchronous tree
```

This works because the async component returns a JSX tree (a `ReactElement`), and `render` accepts a `ReactElement`. The async-await happens outside React's render cycle; once resolved, the tree is fully sync and rendered into jsdom normally.

For `AppNav.tsx` (which is `'use client'` and NOT async), the standard `render(<AppNav />)` pattern works. For `AppFrame.tsx` (which is sync but has async children via `<Suspense>`), `render(<AppFrame>{children}</AppFrame>)` works — `<Suspense>` resolves the `<AppNav>` and `<User>` (mocked) children synchronously in jsdom.

**Alternatives considered:**

- *Use RTL's `renderAsync` or wait for `findByText` to handle the async-component resolution.* Rejected — there is no `renderAsync` in RTL stable. `findBy*` queries wait for elements to appear after a render call, but the issue here is the COMPONENT FUNCTION itself is async, not that the rendered tree is async. Direct invocation is correct.
- *Convert `AppMenu.tsx` and `Nav.tsx` to sync components by lifting the `await auth()` to a parent.* Rejected — same scope reason as Decision 2's refactor alternative. Cross-file API change is out of scope.
- *Skip testing `AppMenu.tsx` and `Nav.tsx` until React 19 + RTL stabilizes async-component support.* Rejected — the direct-invocation pattern is stable, well-documented, and gives the same observable assertions. No reason to defer.

### Decision 5: `useKeyboardOffset` test stubs `window.visualViewport` and `requestAnimationFrame`; both are reset in `afterEach`.

jsdom does not implement `window.visualViewport`. The hook's `if (!vv) return;` short-circuit makes the production code SSR-safe AND test-safe — but to exercise the positive paths, the test must install a stub.

```ts
let vvListeners: Record<string, EventListener[]>;
let vv: { height: number; offsetTop: number; addEventListener: ReturnType<typeof vi.fn>; removeEventListener: ReturnType<typeof vi.fn> };

beforeEach(() => {
  vvListeners = { resize: [], scroll: [] };
  vv = {
    height: 800,
    offsetTop: 0,
    addEventListener: vi.fn((type: string, l: EventListener) => vvListeners[type].push(l)),
    removeEventListener: vi.fn((type: string, l: EventListener) => {
      vvListeners[type] = vvListeners[type].filter((x) => x !== l);
    }),
  };
  Object.defineProperty(window, 'visualViewport', { value: vv, configurable: true, writable: true });
  Object.defineProperty(window, 'innerHeight', { value: 1000, configurable: true, writable: true });
});

afterEach(() => {
  Object.defineProperty(window, 'visualViewport', { value: undefined, configurable: true, writable: true });
});
```

`requestAnimationFrame` is also stubbed (jsdom's default implementation runs async; for deterministic tests we capture-and-invoke):

```ts
let rafCallbacks: FrameRequestCallback[];
let rafId = 0;
beforeEach(() => {
  rafCallbacks = [];
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
    rafCallbacks.push(cb);
    return ++rafId;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
});

// Helper: flushRaf() invokes captured callbacks
function flushRaf() {
  const cbs = rafCallbacks.splice(0);
  cbs.forEach((cb) => cb(performance.now()));
}
```

The test harness component:

```tsx
function Harness({ enabled }: { enabled: boolean }) {
  useKeyboardOffset(enabled);
  return null;
}
```

The test asserts on `document.documentElement.style.getPropertyValue('--keyboard-offset')` after each step. The viewport's listeners are invoked manually via the captured `vvListeners` map.

**Alternatives considered:**

- *Use a real `visualViewport` polyfill in jsdom.* Rejected — no widely-adopted polyfill matches the actual browser API, and the stub gives precise control over height/offsetTop transitions.
- *Use `vi.useFakeTimers()` to control RAF.* Rejected — `useFakeTimers` does not by default control `requestAnimationFrame` (it controls `setTimeout`/`setInterval`); a separate `vi.advanceTimersToNextFrame` exists but couples the test to vitest's timer internals. The capture-and-invoke stub is simpler and explicit.
- *Test only the SSR / disabled / missing-viewport short-circuits (which need no stubs).* Rejected — leaves the load-bearing logic (RAF coalescing, listener attachment, value computation, cleanup) unexercised, failing the universal `COVERAGE_FLOOR`.

### Decision 6: `Header.tsx`'s `"header undefined"` class-string quirk is fixed in-place IF the assertion-substance audit flags it.

The source at HEAD:

```tsx
export default function Header({ title, className, children }: HeaderProps) {
  return (
    <div className={`header ${className}`}>
      ...
    </div>
  );
}
```

When `className` is not passed, React renders `className="header undefined"` (the template literal interpolates the string `"undefined"`). This is observably wrong — the literal class name `"undefined"` is not in `app-frame.css`, but it pollutes the DOM and could collide with any future `.undefined` selector. The behavior is "technically not broken" today (no `.undefined` selector exists), but it's a latent bug.

**Disposition path** (per `testing-foundation`'s no-backdoor rule):

1. The first test draft will assert `expect(div.className).toBe('header undefined')` to lock the OBSERVED behavior — this is the assertion-substance bar in action.
2. The assertion-substance audit (§5.1) will flag the test: "the assertion locks broken behavior; the rendered class string is a latent bug, not a contract."
3. Disposition: **(b) refactor-in-place** to `<div className={className ? \`header ${className}\` : 'header'}>` — single-file change, preserves the `header` class always present, drops the bogus `undefined` token when no className is passed.
4. The test is updated to assert `expect(div.className).toBe('header')` (no className case) and `expect(div.className).toBe('header my-class')` (className case).

The refactor IS in-place inside the carve-out (single file, single line). It IS allowed by `testing-foundation`'s "Sub-proposals SHALL refactor code in their carve-out as needed for testability" (the testability-or-correctness pivot is documented in the same requirement). Both old and new behavior are exercised by the new tests; the only visible change is the rendered class string, which no existing consumer depends on (`grep -r '\\.header undefined' app/` returns zero matches; no CSS selector targets the bogus token).

**Alternative considered:** *Leave the quirk in place and assert against `"header undefined"` to lock the current behavior.* Rejected — the universal "tests assert observable behavior, not execution" rule requires the assertion to constrain *correct* behavior. Locking a quirk that no consumer relies on but every reader recognizes as wrong fails the assertion-substance bar. The fix-in-place disposition is the right call.

### Decision 7: `<Link>` (next/link) and `<Image>` (next/image) render real anchors and images in jsdom; NOT mocked.

`AppLogo.tsx`, `AppNav.tsx`, and `Logo.tsx` import `next/link` and `next/image`. In jsdom under React 19, both render their underlying HTML elements (`<a>` for Link, `<img>` for Image) with the props mapped predictably. Tests assert against the rendered HTML attributes (`href`, `aria-label`, `alt`, `width`, `height`, `fetchpriority`), not against Next-specific behavior (route prefetching, image optimization, blur placeholders — none of which are observable in jsdom).

**Alternatives considered:**

- *Mock `next/link` and `next/image` to simpler stubs.* Rejected — the real implementations work in jsdom for the props this carve-out tests, and mocking them would lose coverage of the integration (e.g. that `priority` on `<Image>` becomes `fetchpriority="high"` on `<img>` — a Next behavior we want to assert).
- *Test against the Next-specific behaviors directly (route prefetching, image optimization).* Rejected — those are Next-internals, not part of this carve-out's contract. The tests assert the consumer-facing HTML output.

### Decision 8: A shared `__tests__/test-helpers.ts` (under `app/ui/components/__tests__/`) is allowed if the auth-mock factory is reused across 3+ files; otherwise inline.

Anticipated duplication patterns:

- "Mock `@/lib/auth`'s `auth()` to return a fixture session" — used by `Nav.test.tsx`, `AppMenu.test.tsx`, and possibly `AppFrame.test.tsx` (the latter transitively via `<User>` if we choose to render the real `<User>` instead of mocking it). The factory is ~5 lines (`vi.mock` + a `beforeEach` setting the return); inline duplication is acceptable for 2 files. If 3+ files use it, extract to `app/ui/components/__tests__/test-helpers.ts` exporting `function setupAuthMock(session = defaultFixture) { ... }`.
- "Mock `<User>` import to a stub" — used by `AppFrame.test.tsx` and `AppMenu.test.tsx`. Identical 3-line `vi.mock` call; inline is the right level (extraction adds indirection for two lines saved).
- "Stub `window.visualViewport` + `requestAnimationFrame`" — used ONLY by `useKeyboardOffset.test.tsx`. Stays inline; no cross-file duplication.
- "Render a `next/navigation`-mocked AppNav with a controlled pathname" — used ONLY by `AppNav.test.tsx`. Stays inline as a local helper function.

If extracted, `test-helpers.ts` lives at `app/ui/components/__tests__/test-helpers.ts` and is excluded from coverage via the existing `**/__tests__/**` glob in `vitest.config.ts`'s `coverage.exclude`. The §5.2 audit records the chosen disposition.

### Decision 9: The active `app-frame` spec's R4 / R5 (token-related) requirements are NOT re-exercised by this carve-out.

R4 ("`global.css` SHALL declare the design-token set used by the frame") and R5 ("Pages under `(main)/` SHALL consume design tokens rather than literal theme values") are CSS-level contracts. CSS is not in the JS coverage report; jsdom doesn't compute style. Asserting against R4/R5 would require either:

- Parsing `global.css` text and grepping for declared custom properties — possible but couples the test to file parsing, not behavior.
- Running a Playwright test that loads the page and reads computed styles — out of scope (this is a unit-test carve-out; e2e belongs to 6.x).

The R4/R5 contracts stand archived as satisfied (verified at archive of `redesign-home-and-tokens`). This carve-out does NOT re-verify them. If a future change touches token consumption, the relevant capability sub-proposal owns that re-verification.

**Alternative considered:** *Add a `global.css` token-presence test that parses the file and asserts each enumerated custom property is declared.* Rejected — premature; no current change adds or removes tokens. If a future contributor edits `global.css` and the parse-test would catch a regression, the test belongs to a token-system carve-out (which is not in `test-coverage/tasks.md`). Out of scope here.

## Risks / Trade-offs

- **The R2 mobile-nav scenario MODIFICATION is the first time a test-* carve-out has updated (not just ADDED to) an existing spec.** The other six primitive carve-outs only added new SHALLs or left the spec alone. This sets a precedent: when tests surface that the source has evolved past the spec, the spec is the artifact updated (the source is the design intent). The MODIFICATION direction must be clear in the change record — a reviewer who reads only the spec delta should understand that the toggle is the current design, the spec was stale. → Mitigation: `proposal.md`'s "What Changes" and this `design.md`'s Decision 3a explicitly state "source-follows-spec was rejected" and document the rationale (mobile usability is the design intent).
- **Async server-component testing in React 19 + RTL is less well-trodden than client-component testing.** The direct-invocation pattern (Decision 4) works but is unfamiliar. → Mitigation: the pattern is documented inline in each test file's setup comment; if RTL ever ships first-class async support, the tests can migrate without changing assertions.
- **`window.visualViewport` stubbing relies on `Object.defineProperty` with `configurable: true`.** Some test environments (older jsdom, certain Vitest configurations) cache `window` properties at initialization; the `configurable: true` flag may or may not be honored. → Mitigation: the test sets the property fresh in every `beforeEach` (not just once), and resets to `undefined` in `afterEach`. If the property cannot be redefined, the test fails on the first assertion and the failure is loud and named.
- **AppNav's outside-click + Escape effect re-attaches both listeners every `open` toggle.** Spying on `document.addEventListener` / `removeEventListener` must filter to the events this component cares about (`'mousedown'`, `'keydown'`). Other components (or RTL internals) may also attach listeners during the test. → Mitigation: spy filters on `(type, _l) => type === 'mousedown' || type === 'keydown'`; assertions count calls that match the filter, not total spy calls. Same pattern as `Menu.test.tsx`'s document-listener spy.
- **`useKeyboardOffset`'s SSR short-circuit (`typeof window === 'undefined'`) cannot be reached in jsdom** because `window` is always defined under jsdom. → Disposition: per the no-backdoor rule, this branch is exercised by extracting the `if (typeof window === 'undefined') return;` line into a logically-equivalent path testable via the `visualViewport` undefined stub — OR `/* v8 ignore next */` with rationale "SSR short-circuit; window is always defined in jsdom". The visualViewport-undefined stub covers the equivalent runtime behavior (no listener attached, no property set) without ignoring the line; default to disposition (a). If v8 still flags the SSR line specifically, fall back to (c) `/* v8 ignore next */` with rationale. Recorded in `tasks.md` §5.4.
- **`AppMenu.tsx` and `Nav.tsx` are async server components.** RTL's `render` doesn't natively handle async functions returning JSX (Decision 4). → Mitigation: direct-invocation pattern (`const tree = await Comp(); render(tree);`). If a future RTL release adds native async support, the tests migrate without assertion changes.
- **The `<User>` import in `AppFrame.tsx` and `AppMenu.tsx` is out of carve-out and itself calls `auth()`.** Without a mock, every test of those two files transitively exercises the `<User>` rendering pipeline. → Mitigation: `vi.mock` the User module to a stub at each test file's top level. Documented in Decision 2.
- **The `--keyboard-offset` CSS variable contract is a cross-file API the carve-out's test cannot fully verify.** The hook sets the variable; the `ItemsToolbar` filter sheet's CSS reads it. The carve-out test verifies the SET side only. → Accepted: the READ side is verified by 4.5 `test-items-browser-chrome` when that carve-out runs. The new ADDED SHALL (Decision 3c) names the variable and target so a renaming on either side surfaces immediately at the contract level.
- **Cognitive-complexity promotion locks the ceiling at 15 for `AppNav.tsx` (the most complex file).** Measured complexity at HEAD: expected ~8–9 from the toggle state + `isActive` matcher + two effects. → Accepted: the ceiling has comfortable buffer. If a future change pushes the file over 15, the failure is "extract a helper" — the right escape valve.
- **The active `app-frame` spec was created by archiving `redesign-home-and-tokens`, which also rewrote R4 / R5 (the token requirements).** Those token requirements remain stable and are out of scope (Decision 9). → Accepted: this carve-out does not exercise R4 / R5; they are governed by their CSS-presence-in-file contracts which are visible to code review but not unit-testable.
- **The carve-out spans two directories (`app/ui/components/` and `app/ui/hooks/`).** This is the first carve-out with a `__tests__/` directory under `app/ui/hooks/`. → Accepted: the convention is uniform — colocation under `__tests__/` next to the source, regardless of directory.
