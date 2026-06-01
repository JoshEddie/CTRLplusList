## 1. Confirm foundation surfaces are usable

- [x] 1.1 Confirm the `COVERAGE_FLOOR` constant and the per-file `thresholds` map exist in `vitest.config.ts`, and the jsdom/node two-project split routes `.test.tsx` → jsdom. **Confirmed** — `COVERAGE_FLOOR` at `vitest.config.ts:25`; `projects` split routes `**/*.test.tsx` → jsdom (`vitest.config.ts:41`).
- [x] 1.2 Confirm `test/helpers/setup.ts` is loaded for the jsdom project (RTL matchers, cleanup), and the async-RSC + DAL-mock pattern used by `app/(main)/following/__tests__/FollowingPage.test.tsx` is reusable here (`vi.mock('@/lib/auth')`, `vi.mock('@/lib/dal')`, the hoisted `redirect` sentinel mock). Confirm the per-file `sonarjs/cognitive-complexity = error` override array exists in `eslint.config.mjs`. **Confirmed** — `setupFiles: ['./test/helpers/setup.ts']` (jsdom project); `FollowingPage.test.tsx` mocks `@/lib/auth` + `@/lib/dal` + hoisted `redirect` sentinel; the `error`-level override array is at `eslint.config.mjs:31-139`.
- [x] 1.3 Confirm the carve-out boundary against the live tree: `ItemsBrowser.tsx`, `Items.tsx`, `ItemsToolbar` (and the rest of the chrome), `ItemFormContainer` / the `itemform/*` tree, the filter popovers, and the item-card files are NOT in this carve-out (they are owned by 4.5 / 4.9 / 4.16 / 4.17 and are module-mocked where the shell mounts them). The four IN-carve-out files are exactly `app/(main)/items/page.tsx`, `app/(main)/items/loading.tsx`, `app/(main)/items/ui/components/ItemsContainer.tsx`, `app/(main)/items/ui/components/ItemsPage.tsx`. **Confirmed** against the live tree.
- [x] 1.4 Confirm §4.13 coordination (design Decision 5): `server-endpoint-authorization`'s scope is `app/actions/**` + `app/api/**`; the page-RSC `redirect()` guard is owned by THIS carve-out. No requirement is duplicated across the two specs. **Confirmed** — `test-server-endpoint-authorization/proposal.md` §3 scopes itself to `app/actions/**` + `app/api/**`; no page-RSC coverage.

## 2. Write `app/(main)/items/__tests__/loading.test.tsx` (jsdom, universal COVERAGE_FLOOR)

- [x] 2.1 `Render` — `Default_RendersPageLoadingIndicator`: the route fallback renders a single `LoadingIndicator` with `size="page"` (assert via the rendered element / its props, mirroring `app/(main)/__tests__/page.test.tsx`'s fallback assertion).

## 3. Write `app/(main)/items/__tests__/page.test.tsx` (jsdom, universal COVERAGE_FLOOR)

- [x] 3.1 `ModuleMocks` — `@/lib/auth` `auth()` mocked; `@/lib/dal` reads (`getUserIdByEmail`, `getItemsByUser`, `getListsByUser`) mocked to fixtures; `next/navigation` `redirect()` mocked to throw the `REDIRECT:<url>` sentinel; `next/headers` `cookies()` mocked to a per-test store; `./ui/components/ItemsPage` module-mocked to a prop-surfacing stub (`data-active-count` / `data-archived-count` / `data-initial-page-size` / `data-user-name` / `data-lists-count`). Per `FollowingPage.test.tsx`.
- [x] 3.2 `AuthGuard` — `NoSessionEmail_RedirectsToRoot` and `EmailResolvesToNoUser_RedirectsToRoot` (sentinel: `await expect(Page({...})).rejects.toThrow('REDIRECT:/')`; `redirect` called with `/`); `ViewerResolved_RendersMainItemsLibraryWrappingItemsPage` (resolved viewer → `<main className="container container--items-library">` wraps the `ItemsPage` stub). (spec R1)
- [x] 3.3 `SpoilerParam` — `PurchasesReveal_ReadsWithShowSpoilersTrue`, `PurchasesOnly_ReadsWithShowSpoilersTrue`, `PurchasesHideOrAbsent_ReadsWithShowSpoilersFalse` (assert the spoiler-dependent read outcome against seeded rows, or the flag forwarded to the read). (spec R2)
- [x] 3.4 `PageSizeCookie` — `ValidOptionCookie_SeedsInitialPageSize` (e.g. `48`), `OffListOrAbsentCookie_NormalizesToDefault24` (assert `initialPageSize` on the stub). (spec R3)
- [x] 3.5 `DualLoad` — `Render_LoadsActiveAndArchivedSetsIndependently`: both sets are read and forwarded to the stub as distinct props; seeded active rows appear under active, archived under archived. (spec R4 load half)
- [x] 3.6 `ViewerDisplay` — `TwoTokenName_DerivesFirstAndLastInitial`, `OneTokenName_UsesFirstToken`, `NoName_DerivesEmpty`; `Render_ForwardsListsToItemsPage`.

## 4. Write `app/(main)/items/ui/components/__tests__/ItemsContainer.test.tsx` (jsdom, universal COVERAGE_FLOOR)

- [x] 4.1 `ModuleMocks` — `@/lib/auth` `auth()`; `@/lib/dal` reads (`getUserIdByEmail`, `getItemsByUser`, `getItemsByListId`) mocked to fixtures; `next/navigation` `redirect()` sentinel; `next/headers` `cookies()` per-test store; `./ItemsBrowser` and `./Items` module-mocked to prop-surfacing stubs (`data-mode` / `data-item-count` / `data-initial-page-size` / `data-user-name`). Per `FollowingPage.test.tsx`.
- [x] 4.2 `AuthGuard` — `NoListIdAndNoUser_RedirectsToRoot` (sentinel `/`). (spec R1 library branch)
- [x] 4.3 `LibraryBranch` — `NoListId_ReadsViewerItemsAndRendersItemsInsideSuspense` (real `getItemsByUser` against seeded rows; `Items` stub rendered inside `Suspense`). (spec R5 no-listId)
- [x] 4.4 `ListBranch` — `ListId_ReadsListScopedWithViewerOwnerSpoilerFlagsAndRendersListBrowser` (real `getItemsByListId`; `ItemsBrowser` stub with `mode="list"` + seeded `initialPageSize`; forwarded `viewerId`/`isListOwner`/`showSpoilers` honored). (spec R5 listId)
- [x] 4.5 `ListBranchUnauthenticated` — `ListIdNoViewer_DoesNotRedirectReadsWithNoViewerId` (no sentinel throw; list-scoped read proceeds with `viewerId` undefined). (spec R5 no-redirect clause)
- [x] 4.6 `Suspense` — `Render_FallbackIsPageLoadingIndicator` (both branches wrap their child in `Suspense` with a `LoadingIndicator size="page"` fallback); `ViewerDisplay_FirstLastInitialReachesChild`.

## 5. Write `app/(main)/items/ui/components/__tests__/ItemsPage.test.tsx` (jsdom, universal COVERAGE_FLOOR)

- [x] 5.1 `ModuleMocks` — `next/navigation` (`useRouter` / `usePathname` / `useSearchParams`) controlled per test; `./ItemsBrowser` and `./itemform/ItemFormContainer` module-mocked to prop-surfacing stubs (the form stub exposes an `onClose` button); real `Header`, `Button`, `Empty`.
- [x] 5.2 `TabSelection` — `TabArchivedParam_ShowsArchivedSet`, `TabActiveOrAbsent_ShowsActiveSet` (the rendered `ItemsBrowser` stub carries the matching set). (spec R4)
- [x] 5.3 `TabLabels` — `Tabs_RenderRoleTabWithCountsAndAriaSelected`: both controls are `role="tab"`; the active tab shows the active-set count, the archived tab the archived-set count; `aria-selected` reflects the current tab. (spec R4 count/labels)
- [x] 5.4 `TabSwitch` — `SwitchToArchived_ReplaceSetsTabRemovesPage`, `SwitchToActive_ReplaceRemovesTabAndPage` (`router.replace`, not `push`; `page` removed; `tab=archived` set or cleared). (spec R4 reset/replace)
- [x] 5.5 `EmptyStates` — `ActiveEmpty_RendersEmptyItemWithNewItemAffordance` (real `Empty type="item"` wired to the new-item toggle), `ArchivedEmpty_RendersDistinctMessageWithoutNewItemAffordance` (the custom "No archived items" block, NOT `Empty`). (spec R4 empty-state branch)
- [x] 5.6 `NonEmpty` — `NonEmptySet_RendersItemsBrowserWithModeItemsAndArchivedViewFlags` (`items` / `mode="items"` / `archivedView` / `showArchiveAction` forwarded per tab).
- [x] 5.7 `NewItemToggle` — `ClickNewItem_MountsItemFormContainerWithListsAndUser`, `FormOnClose_UnmountsItemForm` (open → close cycle via the stub's `onClose`).

## 6. Audits (performed and recorded BEFORE coverage validation)

### 6.1 Assertion-substance audit (on the four new test files)

- [x] 6.1 For each `it()`, record in one sentence the observable behavior asserted (the redirect sentinel / a forwarded prop surfaced by a stub / a real read's result against seeded rows / a `router.replace` argument / rendered DOM). Confirm no test asserts on a value the test itself constructed, a tautology, or a smoke-execute. Fix any finding in-place (assertion audit is always fixed in-place, never deferred).

  **Finding: PASS — 0 fixes.** Every assertion is observable: redirect tests assert the `REDIRECT:/` sentinel throw + `redirect` call arg; spoiler / dual-load / routing tests assert the DAL read's exact call arguments (`getItemsByUser`/`getItemsByListId` with `{ filter, showSpoilers }` / `{ viewerId, isOwner, showSpoilers }`); page-size / name / lists tests assert the value forwarded to the stubbed child via `data-*`; `ItemsPage` tests assert rendered tab roles + `aria-selected` + count labels, `router.replace` URL strings, the distinct empty-state DOM, and the form mount/unmount cycle; `utils.test.ts` asserts return values. No tautology, constructed-value, or bare execute-for-coverage.

### 6.2 Duplication audit

- [x] 6.2 Inspect cross-file and cross-source duplication (design Decision 6): the `firstLastInitial` derivation (verbatim in `page.tsx` and `ItemsContainer.tsx`) and the page-size cookie-read normalization (in both shells, mirroring `ItemsBrowser`'s client `normalizePageSize`). Dispose: extract the page-size normalization core into `paginationConstants.ts` as a pure `normalizePageSize(raw)` consumed by both server readers and the client writer, and the name derivation into a co-located `app/(main)/items/utils.ts`, OR record a named reason to keep separate. Also check the four test files for a reusable `auth()`-mock / viewer-seed factory or `ItemDisplay` fixture builder — extract to `test/helpers/` / `test/fixtures/` only if reused across 3+ files. Record the disposition (extract with file reference, or keep-separate with reason).

  **Finding: EXTRACTED.** The two verbatim duplications were extracted into a new co-located [app/(main)/items/utils.ts](app/(main)/items/utils.ts): `viewerDisplayName(name)` (the "First L" derivation, was duplicated in `page.tsx` + `ItemsContainer.tsx`) and `readItemsPageSize()` + the pure `normalizePageSize(raw)` (the cookie read + option-set normalization, was inline in `page.tsx` and `ItemsContainer.readPageSizeCookie`). Both shells now consume the helpers; the new tests prove behavior preservation. Covered by [app/(main)/items/__tests__/utils.test.ts](<app/(main)/items/__tests__/utils.test.ts>) at `COVERAGE_FLOOR`.

  **Deviation from design Decision 6 (recorded):** `normalizePageSize` was placed in the new `utils.ts` (which imports the option set from `paginationConstants.ts`) rather than added INTO `paginationConstants.ts`. Reason: `paginationConstants.ts` is an already-shipped, floored 4.5 file; keeping all new shared helpers in one carve-out-owned file avoids editing a sibling carve-out's source + test for no behavioral gain.

  **Non-merge (recorded):** `ItemsBrowser`'s client-side `normalizePageSize` (4.5) was deliberately NOT merged with the server `normalizePageSize`. They live on opposite sides of the cookie contract (client WRITE vs server READ) in separate floored files; unifying across the server/client boundary would couple two carve-outs for marginal gain. The shared *contract* (option set `{12,24,48,96}` + `DEFAULT_PAGE_SIZE`) already lives in the single `paginationConstants.ts` both sides import — the values are DRY; only the tiny parse-and-validate wrapper is mirrored.

  **Test-helper duplication:** none crossed the 3-file threshold — the `auth()` / `redirect` sentinel / `cookies()` mock setup differs per file (the client `ItemsPage` test mocks router hooks, not `auth`/`cookies`; `utils.test.ts` mocks only `cookies`); no shared factory or fixture builder extracted.

### 6.3 Complexity audit

- [x] 6.3 Measure cognitive-complexity for each function in the four files at the post-edit state. Confirm all are under the ceiling of 15 (Decision 6's extractions likely lower `page.tsx` / `ItemsContainer`). For any function ≥15, dispose in-place (single-file extraction, behavior preserved by the new tests) or via a named `// eslint-disable-next-line sonarjs/cognitive-complexity` with a reason — never by skipping the file or lowering the floor. Record the disposition.

  **Finding: all under 15; 0 disables.** `npm run lint` raises zero `sonarjs/cognitive-complexity` errors for the five carve-out files now under the `error`-level promotion (`Home`, `ItemsContainer`, `ItemsPage`, `Loading`, and the three `utils.ts` helpers). The §6.2 extraction trimmed `page.tsx` and `ItemsContainer` further.

  **Two coverage dispositions (recorded):** (1) `page.tsx` line 46 previously read `user?.id ? await getListsByUser(user.id) : []` — the `: []` branch is dead (`user` is non-null past the `if (!user) redirect('/')` guard), so it was simplified to `await getListsByUser(user.id)` (behavior-preserving). (2) `ItemsContainer`'s second `if (!user) redirect('/')` (in the no-`listId` else branch) is unreachable — the earlier `!listId && !user` guard already redirects that exact case — but it is retained to narrow `user` to non-null for `user.id` (TS does not narrow across the two separate guards), with a `/* v8 ignore next 3 -- … */` carrying that named reason. No floor lowered.

### 6.4 Invariant-elevation audit

- [x] 6.4 Confirm the five `items-library-shell` requirements (R1–R5) each pass the three-part elevation test (non-obvious from signature, survives reimplementation, protects a real failure mode) and are applied to the new capability spec. Record non-elevations with rationale: the exact `.container--items-library` class string and the precise "No archived items" copy (presentation incidentals, locked at DOM-presence level by the tests but not elevated as normative SHALLs). Confirm no shell invariant is left as a TODO/issue-only note.

  **Finding: five requirements elevated; spec delta applied.** R1 (viewer-auth guard), R2 (reveal-spoiler param), R3 (cookie-read normalization — the server READ half of `items-browser-chrome` R-D), R4 (active/archived dual-load + tab partition), R5 (list-vs-library routing) each pass the three-part test and are in [specs/items-library-shell/spec.md](specs/items-library-shell/spec.md) as a brand-new capability.

  **Non-elevations (recorded):** the exact `.container--items-library` wrapper class string and the precise "No archived items" / "Items you archive will appear here." copy are presentation incidentals — asserted by the tests at the DOM-presence level but NOT elevated as normative SHALLs (they would rot under a copy/markup refresh without a behavioral regression). No shell invariant remains a TODO/issue-only note.

## 7. Config changes

- [x] 7.1 `vitest.config.ts` — add per-file `thresholds` entries (each `= COVERAGE_FLOOR`), under a comment `// test-items-library-shell (sub-proposal 4.18) — locked at universal COVERAGE_FLOOR.`: the four carve-out files (`page.tsx`, `loading.tsx`, `ItemsContainer.tsx`, `ItemsPage.tsx`). If the duplication audit (6.2) adds a `normalizePageSize` to `paginationConstants.ts` (already floored under 4.5) or a co-located `utils.ts`, confirm those files remain floored.
- [x] 7.2 `eslint.config.mjs` — add the four executable paths to the per-file `sonarjs/cognitive-complexity = error` override array, under the matching comment. Include any new `utils.ts` if created by 6.2.

## 8. Apply spec deltas

- [x] 8.1 Apply the five ADDED requirements to the NEW capability spec at `openspec/specs/items-library-shell/spec.md` (via this change's `specs/items-library-shell/spec.md` ADDED delta): viewer-auth guard (R1); reveal-spoiler param (R2); cookie-read normalization (R3); active/archived dual-load + tab partition (R4); list-vs-library routing (R5). Confirm this CREATES a new capability and MODIFIES/REMOVES nothing in any existing spec.
- [x] 8.2 Confirm no requirement is added to or modified in `items-browser-chrome` (R-D referenced only) or `server-endpoint-authorization` (§4.13 referenced only) — the coordination is by complementary ownership, not cross-spec edits.
- [x] 8.3 Confirm the `testing-foundation` Tier-2 carve-out record stays in this change's delta dir only (archive-only) — NOT rolled into the parent `test-coverage` accumulator and NOT written to the active `openspec/specs/testing-foundation/spec.md`.

## 9. Coverage validation

- [x] 9.1 `npm test -- --coverage` — confirm each of the four carve-out files meets `lines ≥ 98 / statements ≥ 98 / branches ≥ 95 / functions = 100`. Close any gap via a test OR `/* v8 ignore */` with a named reason — never by lowering the floor.

## 10. Pre-merge (four-gate)

- [x] 10.1 `npm run lint` passes with zero errors (the `sonarjs/cognitive-complexity = error` promotion is in effect for the five carve-out files and raises nothing). `✖ 8 problems (0 errors, 8 warnings)` — all 8 are **pre-existing** warnings in files OUTSIDE this carve-out (`useItemForm.ts`, `ChooseItemsForm.tsx`, `ListDetails.tsx`, `Avatar.tsx`, `items.ts`, `lists.ts`, `seed-dev-users.ts` — all still at the global `warn` level, not yet carved out); none of this change's files appears. `eslint .` exits 0. This change introduces zero new lint issues.
- [x] 10.2 `npx tsc --noEmit` passes with zero errors.
- [~] 10.3 `npm run build` — **deferred to GitHub PR CI.** The build cannot run in this worktree: it fails during page-data collection for `/items/[id]` (a route NOT in this carve-out) with `No database connection string was provided to neon()` because the local `.env.local` has no `DATABASE_URL`/`POSTGRES_*` string. The five carve-out files are test/config/shell-only and import nothing that changes the build graph, so this is an environment limitation, not a code defect. **Disposition (owner-approved):** the build gate is verified by the GitHub PR CI pipeline at PR time rather than locally.
- [x] 10.4 `npm test` passes — the full suite is **1100 passed (92 files)** on a clean run. The five carve-out files contribute 46 green tests (jsdom for the four `.tsx`, node for `utils.test.ts`). The only intermittent failure observed was `test/helpers/db.test.ts > AfterMigration_SelectUsersReturnsEmpty`, a pre-existing pglite-migration-replay timeout (~6-7s) that **passes in isolation (3/3)** and is unrelated to this change (no `test/helpers/**` file was touched); it only times out under full-suite parallel CPU contention.

## 11. Audit disposition record

- [x] 11.1 Record the final disposition of every audit finding (6.1–6.4) in this file: each is fixed-in-place (with file reference) or deferred-as-new-sub-proposal (with the `test-coverage/tasks.md` §4 checkbox name). Confirm zero findings remain as TODO comments or unaddressed notes. Note explicitly that this carve-out closes the last of `test-items-browser-chrome` §9.6's three deferred boundaries (4.16 / 4.17 / 4.18), so no further items-directory deferral remains open.

  **Final disposition of every audit finding:**
  - **6.1 (assertion substance):** no findings — every assertion is observable-behavior; 0 fixes.
  - **6.2 (duplication):** **fixed-in-place by extraction** — `viewerDisplayName` + `readItemsPageSize`/`normalizePageSize` extracted to [app/(main)/items/utils.ts](<app/(main)/items/utils.ts>), consumed by both shells, tested at floor. `normalizePageSize` placed in `utils.ts` (not `paginationConstants.ts` per design D6) to avoid editing the shipped 4.5 file; the client `ItemsBrowser.normalizePageSize` deliberately not merged (server/client boundary). Recorded above.
  - **6.3 (complexity):** all functions < 15, 0 disables. Two coverage dispositions fixed-in-place: `page.tsx` dead `: []` branch simplified; `ItemsContainer`'s unreachable second redirect guard kept under `/* v8 ignore next 3 */` with a named TS-narrowing reason. Floor never lowered.
  - **6.4 (invariant elevation):** five requirements (R1–R5) ADDED to the new [items-library-shell](specs/items-library-shell/spec.md) capability; presentation-incidental non-elevations recorded above.
  - **No new deferred sub-proposals discovered.** This carve-out closes the **last** of `test-items-browser-chrome` §9.6's three deferred boundaries (4.16 `test-items-price-filter`, 4.17 `test-items-store-filter`, 4.18 `test-items-library-shell`); no further `app/(main)/items/` coverage-ownership deferral remains open.

  Zero findings remain as TODO comments or unaddressed notes.
