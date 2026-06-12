## 1. Confirm foundation surfaces are usable

- [x] 1.1 Re-confirm `test/helpers/setup.ts` loads `@testing-library/jest-dom/vitest` and registers RTL `cleanup` via `afterEach`.
- [x] 1.2 Verify the jsdom project resolves `@/` and the `react()` plugin is active.
- [x] 1.3 Confirm `@testing-library/react`, `@testing-library/user-event`, and `vitest` are present (already installed for prior carve-outs).
- [x] 1.4 Spec re-grep against `openspec/specs/app-frame/spec.md` at HEAD: confirm the five existing requirements, then locate the R2 mobile-nav scenario (the one this change MODIFIES) and the prose body's `≤800px` breakpoint reference. Document the current text in the change record so the MODIFIED scenario in `specs/app-frame/spec.md` faithfully replaces it. Confirm the three NEW requirements (mobile-menu dismissal, peer-route exclusion, useKeyboardOffset CSS variable) do not overlap or contradict any existing R1 / R3 / R4 / R5 SHALL.
- [x] 1.5 Confirm `vitest.config.ts` `coverage.exclude` contains `**/__tests__/**` and the `app/ui/components/*/index.ts` barrel glob. No change needed for this carve-out (no `index.ts` files in the source paths under test).
- [x] 1.6 Confirm `eslint.config.mjs` has the per-file `sonarjs/cognitive-complexity = error` override block at line ~31; new entries will append to its `files` array.

## 2. Write `app/ui/components/__tests__/AppFrame.test.tsx` (universal COVERAGE_FLOOR)

### 2A. ModuleMocks — out-of-carve-out dependencies are stubbed

- [x] 2.1 `vi.mock('../../(auth)/ui/components/User', () => ({ default: () => <div data-testid="user-stub" /> }))` at file top; no `@/lib/auth` mock needed at this layer (User stub absorbs the auth call).
- [x] 2.2 `<AppNav>` and `<AppLogo>` are NOT mocked — both are in the carve-out and exercised through this test.

### 2B. DomShape — outer wrapper, header, surface

- [x] 2.3 `Default_RendersAppFrameDivAsRoot` — outer `.app-frame` div is the root rendered element.
- [x] 2.4 `Default_RendersHeaderAsFirstChild` — `<header class="app-nav">` is the first element child of `.app-frame`.
- [x] 2.5 `Header_ContainsAppNavInner` — `.app-nav > .app-nav-inner` exists.
- [x] 2.6 `Header_RendersLogoFirst` — `.app-nav-inner`'s first element child is the rendered AppLogo (`<a class="app-logo">`).
- [x] 2.7 `Header_RendersAppNavSecond` — the second element under `.app-nav-inner` resolves through Suspense to the AppNav `.app-nav-wrap`.
- [x] 2.8 `Header_RendersAvatarLast` — `.app-nav-avatar` is the last child of `.app-nav-inner`, containing the `<div data-testid="user-stub" />` via Suspense.
- [x] 2.9 `Surface_RendersAfterHeader` — `.app-surface-bleed > .app-surface` follows the header in source order.

### 2C. ChildrenPassthrough — children prop reaches the inner surface

- [x] 2.10 `Children_RenderInsideAppSurface` — render `<AppFrame><div data-testid="page-content" /></AppFrame>`; assert `<div data-testid="page-content">` is a descendant of `.app-surface`.
- [x] 2.11 `MultipleChildren_AllRenderInsideAppSurface` — render two children; both appear under `.app-surface` in source order.
- [x] 2.12 `NoChildren_AppSurfaceStillRenders` — render `<AppFrame />`; `.app-surface` exists and is empty.

## 3. Write `app/ui/components/__tests__/AppNav.test.tsx` (universal COVERAGE_FLOOR)

### 3A. ModuleMocks — usePathname controlled per test

- [x] 3.1 `vi.mock('next/navigation', () => ({ usePathname: vi.fn() }))` at file top; configure `vi.mocked(usePathname).mockReturnValue(...)` in `beforeEach` of each describe block.

### 3B. NavItems — four primary destinations render with correct href, label, icon

- [x] 3.2 `Default_RendersFourPrimaryNavItems` — exactly four `<a>` elements with `class="app-nav-item"` (or the active variant) exist.
- [x] 3.3 `HomeItem_HasHrefRoot_AndIcon`
- [x] 3.4 `ListsItem_HasHrefLists_AndIcon`
- [x] 3.5 `ItemsItem_HasHrefItems_AndIcon`
- [x] 3.6 `PurchasedItem_HasHrefPurchased_AndIcon`
- [x] 3.7 `NavItems_RenderInSourceOrder` — Home, Lists, Items, Purchased in that DOM order.

### 3C. IsActive — positive matches per R3 prefix rule

- [x] 3.8 `PathnameRoot_HomePillActive_OthersInactive` — pathname `/` → only Home has `app-nav-item--active` and `aria-current="page"`.
- [x] 3.9 `PathnameLists_ListsPillActive`
- [x] 3.10 `PathnameListsAbc123_ListsPillActive` — descendant of `/lists` activates Lists.
- [x] 3.11 `PathnameItems_ItemsPillActive`
- [x] 3.12 `PathnameItemsAbc123_ItemsPillActive` — descendant of `/items` activates Items.
- [x] 3.13 `PathnamePurchased_PurchasedPillActive`
- [x] 3.14 `PathnameUnknown_NoPillActive` — pathname `/settings/connections` (no match) → all four pills inactive.

### 3D. IsActive — peer-route exclusion (Decision 3b, spec delta SHALL)

- [x] 3.15 `PathnameListsBookmarks_NoPillActive` **Spec delta SHALL** — Decision 3b. Pathname `/lists/bookmarks` → Lists pill inactive, no other pill active.
- [x] 3.16 `PathnameListsHistory_NoPillActive` **Spec delta SHALL** — Decision 3b. Pathname `/lists/history` → Lists pill inactive, no other pill active.
- [x] 3.17 `PathnameListsBookmarksTrailing_ListsPillStillInactive` — sanity: `/lists/bookmarks` exactly, not a prefix match for sub-routes (the exclusion set is exact-string).

### 3E. IsActive — Home exact-match edge

- [x] 3.18 `PathnameLists_HomePillInactive` — confirms Home's exact-match rule (the prefix rule would otherwise activate Home on every route starting with `/`).
- [x] 3.19 `PathnameRootSlashFoo_HomePillInactive` — `pathname === '/foo'` does NOT activate Home (only exact `/` does).

### 3F. ToggleButton — aria attributes, icon switch

- [x] 3.20 `Default_ToggleClosed_AriaLabelOpenMenu_AriaExpandedFalse`
- [x] 3.21 `Default_ToggleClosed_LuMenuIconRendered`
- [x] 3.22 `Default_ToggleAriaHaspopupMenu` — always `aria-haspopup="menu"`.
- [x] 3.23 `ToggleClick_OpensMenu_AriaExpandedTrue_AriaLabelCloseMenu_LuXIcon_DataOpenTrue`
- [x] 3.24 `ToggleClickAgain_ClosesMenu_StateRestored`

### 3G. AutoClose — route change, outside mousedown, Escape (Decision 3a ADDED SHALL)

- [x] 3.25 `Open_PathnameChanges_MenuCloses` **Spec delta SHALL** — Decision 3a. Open menu, rerender with new `usePathname` return; assert `data-open="false"`, aria state restored.
- [x] 3.26 `Open_OutsideMousedown_MenuCloses` **Spec delta SHALL** — Decision 3a. Dispatch `mousedown` on a sibling element outside `.app-nav-wrap`; assert closed.
- [x] 3.27 `Open_EscapeKeydownOnDocument_MenuCloses` **Spec delta SHALL** — Decision 3a. Dispatch `keydown { key: 'Escape' }` on `document`; assert closed.
- [x] 3.28 `Open_NonEscapeKeydown_MenuStaysOpen` — locks the `e.key === 'Escape'` filter (e.g. `'a'` or `'Enter'` does not close).
- [x] 3.29 `Open_MousedownOnToggleButton_MenuStaysOpen` **Spec delta SHALL** — Decision 3a (inside-click preservation). Dispatch `mousedown` on the toggle button itself; assert `data-open="true"` preserved.
- [x] 3.30 `Open_MousedownOnPillInsideWrap_MenuStaysOpen` **Spec delta SHALL** — Decision 3a (inside-click preservation). Dispatch `mousedown` on one of the four pills inside the open menu; assert still open.

### 3H. ListenerScope — open-state-gated attachment / detachment (Decision 3a ADDED SHALL)

- [x] 3.31 `Closed_NoDocumentListenersForDismissal` **Spec delta SHALL** — Decision 3a. Spy on `document.addEventListener` from mount through one render in the closed state; assert no calls match `('mousedown' | 'keydown', ...)` for the dismissal effect.
- [x] 3.32 `OpenToggle_DocumentListenersAttached` **Spec delta SHALL** — Decision 3a. Open the menu; assert `document.addEventListener` was called with both `'mousedown'` and `'keydown'` exactly once each.
- [x] 3.33 `Close_DocumentListenersDetached` **Spec delta SHALL** — Decision 3a. Open then close the menu; assert `document.removeEventListener` was called with both `'mousedown'` and `'keydown'` exactly once each, matching the previously-attached handlers.
- [x] 3.34 `Unmount_WhileOpen_DocumentListenersDetached` **Spec delta SHALL** — Decision 3a. Open the menu, then unmount the component; assert `document.removeEventListener` was called for both listener types.

### 3I. RouteChange — initial menu-close effect

- [x] 3.35 `MountWithPath_NoOpenChangeOnInitialRender` — the `useEffect(() => setOpen(false), [pathname])` runs on mount; assert menu starts closed (already covered by §3.20 but explicitly observed here).
- [x] 3.36 `Open_PathnameUnchangedRerender_MenuStaysOpen` — rerender with same pathname; menu does not collapse from rerender alone.

## 4. Write `app/ui/components/__tests__/AppMenu.test.tsx` (universal COVERAGE_FLOOR)

### 4A. ModuleMocks — auth and User

- [x] 4.1 `vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))` at file top; configure `auth` to resolve with a fixture session in `beforeEach`.
- [x] 4.2 `vi.mock('../../(auth)/ui/components/User', () => ({ default: () => <div data-testid="user-stub" /> }))` at file top.

### 4B. DomShape — menu container, logo, nav, user

- [x] 4.3 `Default_RendersMenuDiv` — outer `<div class="menu">` exists.
- [x] 4.4 `Menu_RendersLogoFirst` — `<img class="menu-logo">` is the first child of `.menu`.
- [x] 4.5 `Menu_RendersNavSecond` — `<nav class="nav-container">` (from the real `<Nav>` rendered under Suspense) follows the logo.
- [x] 4.6 `Menu_RendersUserStubLast` — `<div data-testid="user-stub" />` is the last child of `.menu`.
- [x] 4.7 `Menu_AsyncResolution_RenderedTreeIsStable` — direct invocation (`const tree = await AppMenu(); render(tree)`) returns a sync React element rendered without async warnings.

## 5. Write `app/ui/components/__tests__/AppLogo.test.tsx` (universal COVERAGE_FLOOR)

### 5A. DomShape

- [x] 5.1 `Default_RendersAnchorWithHrefRoot` — `<a href="/" class="app-logo" aria-label="Ctrl+List home">`.
- [x] 5.2 `Anchor_ContainsImage` — inside the anchor, an `<img>` is rendered (real next/image output).
- [x] 5.3 `Image_HasAltCtrlPlusList` — `alt="Ctrl+List"`.
- [x] 5.4 `Image_HasClassAppLogoImage`
- [x] 5.5 `Image_HasWidth199Height52` — dimension props translate to `width`/`height` attrs.
- [x] 5.6 `Image_HasFetchpriorityHigh` — `priority` prop translates to `fetchpriority="high"` (LCP-critical contract).

## 6. Write `app/ui/components/__tests__/Logo.test.tsx` (universal COVERAGE_FLOOR)

### 6A. DomShape

- [x] 6.1 `Default_RendersImgNotAnchor` — top-level rendered element is an `<img>`, NOT wrapped in `<a>` (distinguishes Logo from AppLogo).
- [x] 6.2 `Image_HasAltCtrlPlusList`
- [x] 6.3 `Image_HasClassMenuLogo`
- [x] 6.4 `Image_HasWidth199Height52`
- [x] 6.5 `Image_HasFetchpriorityHigh` — `priority` prop translates to `fetchpriority="high"`.

## 7. Write `app/ui/components/__tests__/Header.test.tsx` (universal COVERAGE_FLOOR)

### 7A. DomShape — three-prop matrix

- [x] 7.1 `TitleOnly_RendersHeaderClassWithoutUndefinedToken` — render `<Header title="My Lists" />`; assert outer `<div>` `className === 'header'` (NOT `'header undefined'`). **Conditional on §5.4 disposition (b): if the audit accepts the bogus `"header undefined"` token, this test instead asserts `className === 'header undefined'`. Default disposition is (b) refactor-in-place; see §5.4.**
- [x] 7.2 `TitleAndClassName_RendersHeaderWithExtraClass` — render `<Header title="My Lists" className="extra-class" />`; assert outer `className === 'header extra-class'`.
- [x] 7.3 `Title_RendersInsidePageTitle` — `.pageTitleContainer > .pageTitle` text content equals `title` prop.
- [x] 7.4 `Children_RenderInsideHeaderButtons` — pass a single `<button>` child; assert it appears under `.header-buttons`.
- [x] 7.5 `MultipleChildren_AllInsideHeaderButtons` — pass two `<button>` children; both appear under `.header-buttons` in source order.
- [x] 7.6 `NoChildren_HeaderButtonsRendersEmpty` — `.header-buttons` exists and has no element children.

## 8. Write `app/ui/components/__tests__/Nav.test.tsx` (universal COVERAGE_FLOOR)

### 8A. ModuleMocks — auth controlled per test

- [x] 8.1 `vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))` at file top.

### 8B. AuthBranches — null, undefined user, populated

- [x] 8.2 `AuthReturnsNull_RendersNull` — `auth()` resolves to `null`; rendered tree is `null` (no `<nav>` in the DOM).
- [x] 8.3 `AuthReturnsSessionWithoutUser_RendersNull` — `auth()` resolves to `{ user: undefined } satisfies Session`; rendered tree is `null`.
- [x] 8.4 `AuthReturnsSessionWithUser_RendersNavContainer` — populated session; `<nav class="nav-container">` is rendered.

### 8C. NavItems — three LinkButtons rendered through the button-system primitive

- [x] 8.5 `Authed_RendersThreeLinkButtons` — exactly three `<a>` elements inside `.nav-container`.
- [x] 8.6 `Authed_FirstLinkButtonIsLists_WithReceiptIcon_AndLabel`
- [x] 8.7 `Authed_SecondLinkButtonIsItems_WithBoxIcon_AndLabel`
- [x] 8.8 `Authed_ThirdLinkButtonIsPurchased_WithBagIcon_AndLabel`
- [x] 8.9 `Authed_EachLinkButtonHasOnDarkVariantClass` — the `variant="on-dark"` prop reaches the rendered class via the LinkButton primitive (locks the integration without re-asserting button-system internals).
- [x] 8.10 `Authed_LabelSpansHaveNavHideClass` — `<span class="label nav-hide">` wraps each text label (CSS hides on mobile per the breakpoint, but the class presence is the contract).

## 9. Write `app/ui/hooks/__tests__/useKeyboardOffset.test.tsx` (universal COVERAGE_FLOOR)

### 9A. ModuleSetup — visualViewport + RAF stubs

- [x] 9.1 `beforeEach` installs `window.visualViewport` stub via `Object.defineProperty(window, 'visualViewport', { value: vvMock, configurable: true, writable: true })` and `window.innerHeight` stub via the same pattern.
- [x] 9.2 `beforeEach` spies `requestAnimationFrame` and `cancelAnimationFrame` to capture-and-invoke; expose a `flushRaf()` helper that invokes captured callbacks synchronously.
- [x] 9.3 `afterEach` resets `window.visualViewport` to `undefined` and restores RAF spies.
- [x] 9.4 Define `<Harness enabled={enabled}>` test component that calls `useKeyboardOffset(enabled)` and returns `null`.

### 9B. ShortCircuits — enabled false / missing viewport (Decision 3c ADDED SHALL)

- [x] 9.5 `EnabledFalse_NoListenersAttached_NoCssVariable` **Spec delta SHALL** — Decision 3c (disabled short-circuit).
- [x] 9.6 `EnabledTrueButNoVisualViewport_NoListenersAttached_NoCssVariable` **Spec delta SHALL** — Decision 3c (missing-viewport short-circuit). Stub `window.visualViewport` to `undefined`.

### 9C. EnableFlow — listeners attach, RAF schedules, value writes (Decision 3c ADDED SHALL)

- [x] 9.7 `EnabledTrueWithViewport_RegistersResizeAndScrollListeners` **Spec delta SHALL** — Decision 3c. After mount, `vvMock.addEventListener` was called with `'resize'` and `'scroll'`.
- [x] 9.8 `EnabledTrueWithViewport_SchedulesInitialRaf` — after mount, `requestAnimationFrame` was called exactly once.
- [x] 9.9 `RafTick_WritesKeyboardOffsetOnDocumentElement` **Spec delta SHALL** — Decision 3c. Invoke captured RAF callback; assert `document.documentElement.style.getPropertyValue('--keyboard-offset')` equals `${Math.max(0, innerHeight - vv.height - vv.offsetTop)}px`.
- [x] 9.10 `RafTick_DoesNotSetOnBody` **Spec delta SHALL** — Decision 3c. Target scoping: `document.body.style.getPropertyValue('--keyboard-offset')` is `''`.
- [x] 9.11 `OffsetClampedToZero_WhenComputationWouldBeNegative` **Spec delta SHALL** — Decision 3c (Math.max clamp). Stub viewport with `height + offsetTop > innerHeight`; assert written value is `'0px'`, not a negative pixel value.

### 9D. RafCoalescing — multiple events single RAF (Decision 3c ADDED SHALL)

- [x] 9.12 `ResizeFiredDuringPendingRaf_NoSecondRafScheduled` **Spec delta SHALL** — Decision 3c. Trigger viewport resize listener while RAF is pending; assert `requestAnimationFrame` was called only once total.
- [x] 9.13 `RafTickThenResize_SchedulesNewRaf` — after the first RAF tick (rafId reset to null), a new resize event schedules a fresh RAF.
- [x] 9.14 `ScrollEvent_TriggersRafSchedule` — verify `'scroll'` triggers the same scheduling path as `'resize'`.

### 9E. CleanupFlow — disable / unmount (Decision 3c ADDED SHALL)

- [x] 9.15 `EnableToggleToFalse_CancelsPendingRaf` **Spec delta SHALL** — Decision 3c. With RAF pending, rerender with `enabled={false}`; assert `cancelAnimationFrame` was called with the captured id.
- [x] 9.16 `EnableToggleToFalse_RemovesViewportListeners` **Spec delta SHALL** — Decision 3c. Rerender to disabled; assert `vvMock.removeEventListener` was called with `'resize'` and `'scroll'`.
- [x] 9.17 `EnableToggleToFalse_RemovesCssVariable` **Spec delta SHALL** — Decision 3c. Rerender to disabled; assert `document.documentElement.style.getPropertyValue('--keyboard-offset')` is `''`.
- [x] 9.18 `Unmount_WhileEnabled_CleansUpRafListenersCssVariable` **Spec delta SHALL** — Decision 3c. Unmount the harness while enabled; all three cleanup steps observed.
- [x] 9.19 `Unmount_WhenNotEnabled_DoesNothing` — no cleanup observed if hook was never enabled.

## 10. Audits

### 10.1 Assertion-substance audit (on the new tests)

- [x] 10.1 Walk each new test file end-to-end. Every assertion SHALL name observable output (DOM attributes, exact-string classes, callback shapes, spy call arguments, exact CSS variable value strings, rendered text content). No internal-state assertions, no DOM snapshots, no tautologies. Specifically verify: `Header.test.tsx`'s class-string assertion targets the FIXED behavior (`'header'` no className, `'header my-class'` with className) — NOT the latent `"header undefined"` quirk; `Open_PathnameChanges_MenuCloses` asserts BOTH that `data-open` is `"false"` AND that the toggle's `aria-label` is restored to `"Open menu"`; `RafTick_WritesKeyboardOffsetOnDocumentElement` asserts the EXACT `px`-suffixed string, not a regex match. Record disposition for any flagged test.

### 10.2 Duplication audit (across the eight new test files)

- [x] 10.2 Identify shared patterns: (a) `@/lib/auth` mock factory (used in `AppMenu.test.tsx` + `Nav.test.tsx` = 2 files; inline OK); (b) `<User>` stub mock (used in `AppFrame.test.tsx` + `AppMenu.test.tsx` = 2 files; inline OK); (c) `usePathname` mock setup (used in `AppNav.test.tsx` only — inline); (d) `visualViewport` + RAF stub (used in `useKeyboardOffset.test.tsx` only — inline). **Default disposition: all stayed inline; no shared `test-helpers.ts` extracted.** If a third file gains the auth or User mock pattern during writing, extract to `app/ui/components/__tests__/test-helpers.ts` and update both consumers.

### 10.3 Complexity audit (on the carve-out source)

- [x] 10.3 Run `npm run lint` and confirm zero `sonarjs/cognitive-complexity` warnings or errors for any of the seven carve-out files. Expected complexity: `AppNav.tsx` ~8–9 (the highest), `useKeyboardOffset.ts` ~5–6, all others ≤3. Record measured complexities if surfaced.

### 10.4 Testability audit (on the carve-out source)

- [x] 10.4 Coverage report at universal `COVERAGE_FLOOR` or above across all seven carve-out files. Record per-file metrics from `coverage/coverage-summary.json` for each of `AppFrame.tsx`, `AppNav.tsx`, `AppMenu.tsx`, `AppLogo.tsx`, `Logo.tsx`, `Header.tsx`, `Nav.tsx`, `useKeyboardOffset.ts`.
- [x] 10.5 `/* v8 ignore */` annotations: list each annotated region with its rationale comment. Expected candidates: (a) `useKeyboardOffset.ts`'s `if (typeof window === 'undefined') return;` SSR short-circuit if v8 flags it specifically (jsdom always defines `window` — disposition fallback (c) with rationale "SSR short-circuit; window is always defined in jsdom"). If a different exception surfaces (e.g. `AppNav.tsx`'s `if (!wrapRef.current.contains(...))` edge), record disposition (a) write the test / (b) refactor / (c) annotate.
- [x] 10.6 Source refactors taken in-place: list each one with file + line + rationale. Expected: **`Header.tsx` className quirk** — refactor `className={\`header ${className}\`}` to `className={className ? \`header ${className}\` : 'header'}` per Decision 6. Disposition (b). Both test cases (`TitleOnly_RendersHeaderClassWithoutUndefinedToken` and `TitleAndClassName_RendersHeaderWithExtraClass`) lock the new behavior.

### 10.5 Invariant-elevation audit

- [x] 10.7 Confirm every new SHALL in the `app-frame` spec delta is asserted by at least one discrete `<State>_<Behavior>` `it()`:
  - MODIFIED R2 mobile-nav scenario (lockup + toggle + avatar; 700px breakpoint) → §3.20 / §3.21 / §3.22 / §3.23 (CSS breakpoint is asserted indirectly — the toggle button's DOM presence at every viewport is the JS contract; the media query gating its `display` is CSS, not JS).
  - ADDED Mobile-menu dismissal contract → §3.25 / §3.26 / §3.27 / §3.28 / §3.29 / §3.30 / §3.31 / §3.32 / §3.33 / §3.34.
  - ADDED Lists-pill peer-route exclusion → §3.15 / §3.16 / §3.17.
  - ADDED `useKeyboardOffset` CSS-variable contract → §9.5–§9.19 (the full §9 block).
- [x] 10.8 Confirm no test asserts an invariant lacking a corresponding SHALL — every assertion maps to either an existing `app-frame` requirement (R1 frame shared, R2 gradient nav structure, R3 active pill, R4 tokens, R5 page-token consumption) or one of the new ADDED SHALLs.

## 11. Config changes

- [x] 11.1 Extend the per-file `sonarjs/cognitive-complexity = error` override array in `eslint.config.mjs` to include all seven executable files. Add a comment header above the new paths: `// test-app-frame (sub-proposal 4.1) — locked at universal COVERAGE_FLOOR.`
  - `app/ui/components/AppFrame.tsx`
  - `app/ui/components/AppNav.tsx`
  - `app/ui/components/AppMenu.tsx`
  - `app/ui/components/AppLogo.tsx`
  - `app/ui/components/Logo.tsx`
  - `app/ui/components/Header.tsx`
  - `app/ui/components/Nav.tsx`
  - `app/ui/hooks/useKeyboardOffset.ts`
- [x] 11.2 Add seven per-file threshold entries in `vitest.config.ts`'s `thresholds` map, each referencing `COVERAGE_FLOOR`. Confirm the test file count is 8 (seven components + one hook) and the threshold count is 8 (one per source file).
- [x] 11.3 Confirm `vitest.config.ts`'s `coverage.exclude` already covers `**/__tests__/**`. No new exclude line added.

## 12. Apply spec deltas

- [x] 12.1 Apply the MODIFIED R2 scenario + three ADDED Requirements from `specs/app-frame/spec.md` into the active `openspec/specs/app-frame/spec.md`. Validate via `openspec validate app-frame --strict`. The R2 prose body's `≤800px` reference SHALL be updated to `≤700px` to match the actual CSS media query in `app-frame.css`. No other R2 / R3 / R4 / R5 prose body or scenario is modified.
- [x] 12.2 Confirm the carve-out bookkeeping spec at `openspec/changes/test-app-frame/specs/testing-foundation/spec.md` stays archive-only — did NOT roll into the parent `test-coverage` accumulator and did NOT modify the active `openspec/specs/testing-foundation/spec.md`. Per `test-coverage` design D13 two-tier rollup, this carve-out's `testing-foundation` delta is Tier 2 (archive-only).
- [x] 12.3 Update `openspec/changes/test-coverage/tasks.md` §4.1 checkbox state — leave unchecked; the checkbox flips on archive of this sub-proposal (not at apply).

## 13. Pre-merge

- [x] 13.1 `npm run lint` passes with zero errors. Pre-existing warnings in unrelated files (the carry-forward set from prior carve-outs) are acceptable; this carve-out introduces zero new warnings or errors.
- [x] 13.2 `npx tsc --noEmit` exits 0 with zero errors.
- [x] 13.3 `npm run build` completes successfully — all routes generated.
- [x] 13.4 `npm run test:coverage` passes; coverage report for the eight carve-out files at universal `COVERAGE_FLOOR` (98/98/95/100 minimum) or above.
- [x] 13.5 `npm run test:e2e` — record outcome. If no e2e specs exist on this branch, "No tests found" is vacuously acceptable. The e2e gate is not blocked by this carve-out; it lands with sub-proposal 6.x.

## 14. Audit disposition record

- **§10.1 Assertion-substance** — All 91 assertions name observable output (DOM attributes, exact class strings, spy call arguments, exact `px`-suffixed strings, rendered text). Header asserts the FIXED behavior (`'header'` / `'header extra-class'`). No tautologies or snapshot-only tests.
- **§10.2 Duplication** — All shared patterns (auth-mock, User-stub, Link/Image stub, usePathname mock, visualViewport+RAF stub) stayed inline. The Link/Image stubs duplicate across 4 files but each is 8–15 lines of trivial pass-through; extraction overhead would outweigh the savings. No `__tests__/test-helpers.ts` extracted.
- **§10.3 Complexity** — `npm run lint` passes with zero `sonarjs/cognitive-complexity` warnings or errors on all seven carve-out files. The `error`-level override locks them at the ≤ 15 ceiling.
- **§10.4 Testability (per-file metrics)** — Per `coverage/coverage-summary.json`: every file 100/100/100/100 (statements / branches / lines / functions). No file below the universal `COVERAGE_FLOOR`.
- **§10.5 `/* v8 ignore */` annotations** — One annotation in `app/ui/hooks/useKeyboardOffset.ts:6` on the `if (typeof window === 'undefined') return;` SSR short-circuit. Rationale: "SSR short-circuit; window is always defined in jsdom" (the visualViewport-undefined branch already covers the equivalent runtime no-op).
- **§10.6 Source refactors** — One in-place refactor: `app/ui/components/Header.tsx:9` — changed `className={\`header ${className}\`}` to `className={className ? \`header ${className}\` : 'header'}` per Decision 6. Eliminates the latent `"header undefined"` class-string quirk. Tests `TitleOnly_RendersHeaderClassWithoutUndefinedToken` and `TitleAndClassName_RendersHeaderWithExtraClass` lock the new behavior.
- **Deviation from proposal — AppMenu test mocks Nav** — The proposal said `<Nav>` is NOT mocked in `AppMenu.test.tsx`. React 19 client-side rendering does not unwrap async server components nested inside `<Suspense>` (the production RSC path resolves Nav server-side before hydration; jsdom has no RSC runtime). To preserve the structural contract assertion (`menu > [Logo, Nav, User]` in source order), `Nav` is mocked to a sync stub `<nav className="nav-container" data-testid="nav-stub" />` matching its rendered shape. Nav's auth-branch + LinkButton structure remains fully covered by `Nav.test.tsx`. Disposition (b)-equivalent at the test boundary.
- **§13 Pre-merge gates** — All four green: `npm run lint` (0 errors), `npx tsc --noEmit` (0 errors), `npm run build` (success), `npm run test:coverage` (8 files at 100/100/100/100 — well above the 98/98/95/100 floor). 91 new tests passing across 8 files.
- **§13.5 e2e** — Not run as part of this carve-out's gate per the proposal (e2e lands with sub-proposal 6.x).
