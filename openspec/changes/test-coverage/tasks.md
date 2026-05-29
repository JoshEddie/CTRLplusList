Each numbered top-level checkbox below represents a sub-proposal — its own OpenSpec change, created with `/opsx:propose <name>` at the time it's started. A checkbox is checked when the corresponding sub-proposal archives via `openspec archive <name>`. This governing change archives only after every sub-proposal below is archived. New sub-proposals discovered mid-flight (per the audit deferral rule in the `testing-foundation` spec) are added here as additional top-level checkboxes.

## 0. Foundation amendments (governance edits to `testing-foundation` discovered mid-flight)

- [x] 0.1 `test-housekeeping` — replaces the in-flight `testing-foundation` colocation requirement (flat → `__tests__/` directory, matching the convention `test-button-system` adopted and `TESTING.md` documents); replaces the tiered per-file coverage table with a single universal floor `lines:98 / statements:98 / branches:95 / functions:100`; adds the no-backdoor disposition rule (write the test OR `/* v8 ignore */` with named rationale — never lower the floor); adds the `COVERAGE_FLOOR` single-constant rule for `vitest.config.ts`. Relocates the six pre-`__tests__/` test files; raises every enumerated file to the new floor.

## 1. Foundation (sequential — blocks all other sub-proposals)

- [x] 1.1 `test-foundation-spike` — DB-under-test option comparison (pglite vs testcontainers vs Neon branch) with a PoC against one DAL function and one server action; CI provider choice; negative-case audit of `scripts/seed-dev-users.ts`; chosen runner.
- [x] 1.2 `test-foundation` — install runner + RTL + Playwright + `eslint-plugin-sonarjs`; create `test/fixtures/`, `test/helpers/`, `e2e/`; land CI workflow running the four-gate pre-merge; add `test`/`test:watch`/`test:e2e`/`test:coverage` scripts; configure per-file coverage floors per the testing-foundation spec; land `sonarjs/cognitive-complexity` at threshold 15 severity `warn`; extend or parallel the seed per the spike's audit; edit `openspec/config.yaml` `tasks` rule to add the fourth `test` gate; add header comment to `scripts/seed-dev-users.ts` declaring it versioned-as-fixture.

## 2. Pure libs (may draft in parallel with foundation; applies after foundation archives)

- [x] 2.1 `test-pure-libs` — `lib/visibility.ts`, `lib/listAccess.ts`, `lib/types.ts` (zod validators); app-wide hook `hooks/use-media-query.ts`; pure helpers extracted from primitives that don't require a render harness (e.g., `app/ui/components/button/buttonClasses.ts`). Floors: 95% per file.

## 3. Primitive families (independent; any order after foundation)

- [x] 3.1 `test-button-system` — `app/ui/components/button/` (Button.tsx, LinkButton.tsx, types.ts, index.ts; `buttonClasses.ts` covered by 2.1). Elevate non-obvious invariants to `button-system` spec.
- [x] 3.2 `test-chip-system` — `app/ui/components/chip/`. Elevate to chip-system spec if one exists, else create one as part of this proposal.
- [x] 3.3 `test-form-field-system` — `app/ui/components/field/`. Elevate to `form-field-system` spec.
- [x] 3.4 `test-menu-system` — `app/ui/components/menu/`. Elevate to `menu-system` spec.
- [x] 3.5 `test-popover-trigger-system` — `app/ui/components/popover-trigger/` and component-scoped hook `app/ui/hooks/usePopoverDismiss.ts`. Elevate to `popover-trigger-system` spec.
- [x] 3.6 `test-segmented-control-system` — `app/ui/components/segmented-control/`. Elevate to `segmented-control-system` spec.
- [x] 3.7 `test-loading-indicator-system` — `app/ui/components/LoadingIndicator.tsx` and `app/ui/components/loading-indicator.css` testable behavior. Elevate to `loading-indicator-system` spec.
- [ ] 3.8 `test-misc-primitives` — `ConfirmDialog.tsx`, `TooltipWrapper.tsx`, `Empty.tsx`, `FormShell.tsx`. Creates minimal family specs for each as part of this proposal. Strict cap: a fifth genuinely-ungoverned primitive gets its own sub-proposal added below, not added to this bucket.

## 4. Capability flows (independent; any order after foundation)

- [ ] 4.1 `test-app-frame` — DAL/action/UI covering `app-frame` capability, including `AppFrame.tsx`, `AppNav.tsx`, `AppMenu.tsx`, `AppLogo.tsx`, `Logo.tsx`, `Header.tsx`, `Nav.tsx`, component-scoped hook `app/ui/hooks/useKeyboardOffset.ts`.
- [x] 4.2 `test-following` — DAL `getFollowing*` / `getFollowers*`, `app/actions/follows.ts`, page UI under `app/(main)/following/` and `app/(main)/users/`. Race: follow/unfollow toggle dupes (partial unique index backstop).
- [x] 4.3 `test-home-digest` — DAL reads powering `app/(main)/HomePage.tsx`, page UI, recency sorting.
- [x] 4.4 `test-item-store-links` — store-links UI and any associated reads; covers `item-store-links` capability.
- [ ] 4.5 `test-items-browser-chrome` — items browser chrome under `app/(main)/items/`.
- [ ] 4.6 `test-list-collections` — `list-collections` capability + `ListCard.tsx`, `ListCardRow.tsx`, `MoreCard.tsx`, `ListCollectionsNav.tsx` page-UI.
- [ ] 4.7 `test-list-hero-header` — `list-hero-header` capability including contrast invariants.
- [ ] 4.8 `test-list-hero-collapse` — `list-hero-collapse` capability behavior.
- [ ] 4.9 `test-list-item-management` — `app/actions/items.ts`, `app/actions/lists.ts`, item-management UI. **HIGH stakes**: claim under `quantity_limit` race (partial unique index backstop), reorder via `@dnd-kit/sortable`. MAY split mid-flight into `-part-1` (CRUD + reorder) and `-part-2` (claim flow + races).
- [ ] 4.10 `test-list-metadata` — `list-metadata` capability (2 requirements; expected small).
- [ ] 4.11 `test-list-visibility` — **HIGH stakes**: three-state visibility (private | unlisted | public) enforcement in DAL and server actions. Privacy-leak class of bug.
- [ ] 4.12 `test-pwa-shell` — `app/manifest.ts` shape, `ServiceWorkerRegistration.tsx`. Service worker (`app/sw.ts`) is excluded from unit coverage; covered by 6.2.
- [ ] 4.13 `test-server-endpoint-authorization` — **HIGH stakes**: every server action and API route is authorized for every caller class (owner / authenticated non-owner / unauthenticated). Aligns with the in-flight `harden-remaining-server-actions` change.
- [ ] 4.14 `test-visit-history` — `visit-history` capability + visit dedupe race (partial unique index backstop).
- [ ] 4.15 `test-user-actions` — `app/actions/user.ts` and any user-settings UI under `app/(main)/settings/` / `app/(main)/user/`. Carve-out determined at proposal time.
- [ ] 4.16 `test-items-price-filter` — `PriceFilterPopover.tsx` against the existing `items-price-filter` spec. Deferred boundary from `test-items-browser-chrome` §9.6.
- [ ] 4.17 `test-items-store-filter` — `StoreFilterPopover.tsx`; create/elevate a `store-filter` family spec. Deferred boundary from `test-items-browser-chrome` §9.6.
- [ ] 4.18 `test-items-library-shell` — `ItemsContainer.tsx`, `ItemsPage.tsx`, `app/(main)/items/page.tsx`, `app/(main)/items/loading.tsx`; coordinate the `redirect()`-on-unauthenticated paths with §4.13. Deferred boundary from `test-items-browser-chrome` §9.6.

## 5. API routes (independent; after foundation)

- [ ] 5.1 `test-image-search-api` — `app/api/image-search/route.ts` auth gate, per-user 30/min token bucket, error-shape distinction (`rate_limited` vs `quota_exceeded`). Upstream provider mocked at the `fetch` boundary — real upstream MUST NOT be called from tests or CI.

## 6. End-to-end (after capability flows are established enough to assert against)

- [ ] 6.1 `test-e2e-critical-flows` — Playwright suite against `AUTH_BYPASS=true` + seeded DB. Flows: sign-in (with bypass), create list, add items, set visibility, share, friend claim with spoiler hiding, owner sees claim. AuthPage sign-in UI covered here.
- [ ] 6.2 `test-e2e-pwa-offline` — Playwright PWA install detection, offline list view, service worker registration. Recent regressions (PWA top-bar, safe-area padding, pagination) inform the test set.

## 7. Governance close-out

- [ ] 7.1 Audit every sub-proposal above for completion. For any unchecked: confirm intentional non-goal (and remove with rationale) or complete it.
- [ ] 7.2 Promote `sonarjs/cognitive-complexity` from `warn` to `error` globally in `eslint.config.mjs` (only the carve-out-promoted files are at `error` until this point; this final step universalizes the gate).
- [ ] 7.3 Generate a repo-wide coverage report and record it in this change's archive notes as the "all sub-proposals complete" baseline.
- [ ] 7.4 Reconcile the `openspec/config.yaml` "zero warnings" pre-merge gate with the `sonarjs/cognitive-complexity` warn-globally policy. Per-file carve-out promotion (per the `testing-foundation` spec) leaves global `warn` results outside the promoted files, so every test-* sub-proposal independently rediscovers the conflict (first surfaced in `test-pure-libs` §9.1). Likely resolution: scope the warning-zero gate to "no new warnings introduced by this change" until 7.2 universalizes the rule. SHALL resolve no later than 7.2.
- [ ] 7.5 At archive time, create `openspec/specs/testing-foundation/spec.md` from the parent accumulator at `openspec/changes/test-coverage/specs/testing-foundation/spec.md` (Tier 1 rollup per design D13). Verify the active spec did NOT exist before this step; if a stub was left behind by an earlier sub-proposal error, delete it first. The active spec at archive-end contains the foundation rules accumulated across all sub-proposals; no carve-out bookkeeping requirements appear in it (those stay archive-only per D13).
- [ ] 7.6 Per-sub-proposal rollup-tier audit: for every archived sub-proposal that contributed a `testing-foundation` delta, confirm the delta classification (Tier 1 or Tier 2) recorded in its `proposal.md` / `tasks.md` matches where the content actually landed. Tier 1 deltas should be visible in the parent accumulator (`openspec/changes/test-coverage/specs/testing-foundation/spec.md`); Tier 2 deltas should be archive-only. Mismatches indicate an authoring error to correct before this governing change archives.
- [ ] 7.7 **Define the `lib/dal.ts` per-file coverage-attribution strategy.** vitest gates coverage per-file (`perFile: true`) but `testing-foundation` intends per-*function* floors for the 708-line `lib/dal.ts`; first surfaced by `test-home-digest` (4.3), which behavior-tests `getUserIdByEmail` against PGlite but does NOT enumerate `lib/dal.ts` in `vitest.config.ts` thresholds (the per-file gate cannot isolate one function of a shared multi-capability module). Resolution options: split `lib/dal.ts` into per-capability modules; adopt per-function coverage tooling; or enumerate `lib/dal.ts` at `COVERAGE_FLOOR` only at this §7 close-out once every function is covered across the sibling carve-outs (4.2/4.6/4.9/4.11/4.14). (Audit deferral: `test-home-digest` §9.7.)
- [ ] 7.8 **Resolve the My-Lists sort drift** — owned by 4.6 `test-list-collections` (which owns `getListsByUser`): the `home-digest` spec says the My Lists rail shows owned lists "ordered by `updated_at DESC`" but `getListsByUser` orders by `created_at DESC`. 4.6 SHALL resolve (correct the spec to match source, or fix the source). `test-home-digest` could not assert a sibling-owned read's sort, so its rail tests avoid sort assertions. (Audit deferral: `test-home-digest` §9.11.)
- [ ] 7.9 **Reconcile the Following "public"-vs-`FOLLOWERS` wording** — owned by 4.2 `test-following` (which owns `getFollowing*`): the `home-digest` spec's Following-sort prose says followees' "`'public'` lists" but `getFollowingFeedUsers` filters `VISIBILITY.FOLLOWERS` (which `visibilityDbValues` expands to the legacy DB string `'public'` plus the canonical `'followers'`). 4.2 SHALL reconcile the spec vocabulary with the visibility taxonomy. (Audit deferral: `test-home-digest` §9.11.)

## 8. Pre-merge

- [ ] 8.1 `npm run lint` passes with zero errors and zero warnings.
- [ ] 8.2 `npx tsc --noEmit` passes with zero errors.
- [ ] 8.3 `npm run build` completes successfully.
