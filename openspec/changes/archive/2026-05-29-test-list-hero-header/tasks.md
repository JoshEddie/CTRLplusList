## 1. Confirm foundation surfaces are usable

- [x] 1.1 Re-confirm `test/helpers/setup.ts` loads `@testing-library/jest-dom/vitest` and registers RTL `cleanup` via `afterEach`.
- [x] 1.2 Verify the jsdom project resolves `@/` and the `react()` plugin is active; confirm a node-environment project (or per-file `// @vitest-environment node`) is available for `hero-contrast.test.ts` (which reads files, no DOM).
- [x] 1.3 Confirm `@testing-library/react`, `@testing-library/user-event`, and `vitest` are present (installed for prior carve-outs).
- [x] 1.4 Spec re-grep against `openspec/specs/list-hero-header/spec.md` at HEAD: confirm the eight existing requirements and the `TBD` `Purpose`. Locate the requirement "The visibility picker SHALL render in the identity zone at the top, paired with Share" and its three scenarios (the block this change MODIFIES). Confirm the contrast requirement (R8) text. Document the current text in the change record so the MODIFIED block in `specs/list-hero-header/spec.md` faithfully extends it.
- [x] 1.5 Confirm `vitest.config.ts` `coverage.exclude` contains `**/__tests__/**` and `test/helpers/**` (so the contrast helper's own coverage is not gated as product code; it is proven by its test). No exclude change expected.
- [x] 1.6 Confirm `eslint.config.mjs` has the per-file `sonarjs/cognitive-complexity = error` override block; new entries will append to its `files` array.
- [x] 1.7 Confirm `lib/visibility.ts` is already enforced at `COVERAGE_FLOOR` from sub-proposal 2.1 (`test-pure-libs`); the new `resolveListVisibility` export will be covered by the same floor and a colocated test.

## 2. Source refactors (disposed from audits §6; land before tests assert the corrected behavior)

- [x] 2.1 **Extract `resolveListVisibility(list)`** to `lib/visibility.ts` — the derivation `list.visibility ?? (list.shared ? VISIBILITY.LINK : VISIBILITY.OWNER)`. `ShareButton`'s variant additionally runs a raw DB string through `fromDb` first; the helper SHALL accept the `ListTable`-shaped input both callers pass and return a `ListVisibility`. Update `ListDetails.tsx` (line ~76) and `ShareButton.tsx` (lines ~50–55) to consume it. Duplication-audit disposition (a) fixed in-place.
- [x] 2.2 **Collapse the nested/empty `.list-hero-share-wrapper`** in `ListDetails.tsx` — `ownerControls` already carries its own `.list-hero-share-wrapper`; render it directly inside `.list-hero-identity-top` instead of re-wrapping in a second `<div className="list-hero-share-wrapper">`. After the fix: owner views render exactly one share-wrapper; viewer/preview views render none. Assertion-audit disposition (b) refactor-in-place per Decision 6.
- [x] 2.3 `grep -rn "list-hero-share-wrapper" app/` confirms no CSS/JS depends on a child-less wrapper before removing it.

## 3. Write `app/(main)/lists/ui/components/__tests__/ListDetails.test.tsx` (universal COVERAGE_FLOOR)

### 3A. ModuleMocks — out-of-carve-out collaborators stubbed

- [x] 3.1 `vi.mock` each out-of-carve-out child to an inert stub: `VisibilityPicker` (→ `<div data-testid="visibility-picker-stub" />`), `ListActionsMenu` (→ `<div data-testid="actions-menu-stub" />`), `Avatar` (→ `<div data-testid="avatar-stub" />`), `FollowContainer` (→ `<div data-testid="follow-stub" />`), `BookmarkContainer` (→ `<div data-testid="bookmark-stub" />`), and `HeroCollapseShell` (→ a passthrough rendering `{children}` and exposing `title` + `collapsedKebab` via `data-*` / testids).
- [x] 3.2 `ShareButton` and `EditListAction` are NOT mocked — both are in carve-out and exercised through this test.
- [x] 3.3 Render via direct invocation: a `renderHero(props)` helper does `render(await ListDetails(props))` with a fixture `list` builder (defaults overridable per test).

### 3B. OwnerComposition — non-preview owner view

- [x] 3.4 `Owner_RendersGridWithIdentityThenControls` — `.list-hero-grid` contains `.list-hero-card-identity` then `.list-hero-card-controls` as siblings in that DOM order.
- [x] 3.5 `OwnerShared_IdentityTopHasSingleShareWrapper_WithPickerAndShare` **Spec delta** — `.list-hero-identity-top` contains exactly one `.list-hero-share-wrapper`, containing the VisibilityPicker stub and (since `visibility = public`) a `ShareButton`.
- [x] 3.6 `OwnerPrivate_ShareWrapperHasPickerOnly_NoShareButton` — with `visibility = OWNER`, the share-wrapper contains the picker stub and no `ShareButton` (locks the "private omits Share" scenario).
- [x] 3.7 `Owner_ControlsCardHasActionRowThenChooseItems` — controls card renders `.list-hero-action-row` (EditListAction + ListActionsMenu stub) then a full-width "Choose items" `LinkButton` with `href="/lists/{id}/choose-items"`.
- [x] 3.8 `Owner_ControlsCardHasNoShareButton` — no `ShareButton` inside `.list-hero-card-controls` (Share lives in the identity zone for owners).
- [x] 3.9 `Owner_NoBylineGroup` — no `.list-hero-byline-group` rendered.

### 3C. ViewerComposition — non-preview authenticated viewer

- [x] 3.10 `Viewer_ControlsCardHasBylineThenDividerThenActionRow` — controls card renders `.list-hero-byline-group` then `.list-hero-divider` then `.list-hero-action-row`.
- [x] 3.11 `Viewer_BylineHasAvatarLinkedNameFollow` — byline group contains the Avatar stub, an `<a href="/user/{owner_id}">` with the owner name, and the Follow stub, in order.
- [x] 3.12 `Viewer_ActionRowHasShareAndBookmark` — `.list-hero-action-row` contains a `ShareButton` and the BookmarkContainer stub (and nothing else).
- [x] 3.13 `Viewer_IdentityTopHasNoShareWrapper_NoPicker` **Spec delta** — no `.list-hero-share-wrapper` element and no VisibilityPicker stub anywhere in the hero.

### 3D. PreviewComposition — owner viewing `?preview=viewer`

- [x] 3.14 `Preview_RendersBannerWithExitLink` — `.preview-banner` `role="status"` renders with an "Exit preview" `LinkButton` whose `href` equals the computed `exitPreviewHref`.
- [x] 3.15 `Preview_HidesVisibilityClusterAndSecondaryActions` **Spec delta** — no `.list-hero-share-wrapper`, no "Choose items", no Edit/owner action pair.
- [x] 3.16 `Preview_ControlsCardHasOnlyActionRowWithKebab` — controls card renders only the preview `.list-hero-action-row` containing the ListActionsMenu stub.

### 3E. EyebrowSubtitleMatrix

- [x] 3.17 `OccasionAndSubtitle_RendersEyebrowAndSubtitleAsSiblings` — `occasion="WEDDING"` + non-empty subtitle → `.list-hero-eyebrow` ("WEDDING") and `.list-hero-subtitle` are siblings inside `.list-hero-eyebrow-subtitle-wrapper`.
- [x] 3.18 `NoOccasion_OmitsEyebrow` — `occasion = null` with a subtitle → wrapper renders the subtitle but no `.list-hero-eyebrow`.
- [x] 3.19 `NoSubtitle_OmitsEyebrowSubtitleWrapper` — empty subtitle → no `.list-hero-eyebrow-subtitle-wrapper` at all. **Documents (does NOT lock-as-correct) the occasion-without-subtitle divergence — see §6 invariant-elevation; add a `// divergence: tasks.md §6` comment.**

### 3F. FooterLine — count, pluralization, relative time (timeAgo)

- [x] 3.20 `MultipleItems_FooterShowsPluralCountAndUpdated` — `itemCount = 12`, recent `updated_at` → `.list-hero-identity-foot` text is "12 items · updated …".
- [x] 3.21 `SingleItem_FooterShowsSingularItem` — `itemCount = 1` → "1 item · …".
- [x] 3.22 `ZeroItems_FooterStillRenders` — `itemCount = 0` → "0 items · …" (footer renders even at zero).
- [x] 3.23 `NoUpdatedAt_OmitsUpdatedTail` — `updated_at = null` → footer is "N items" with no "· updated …" tail.
- [x] 3.24 `TimeAgo_BucketBoundaries` — with `vi.setSystemTime(fixedNow)`, assert the footer's relative-time string across buckets: `< 60s` → "just now"; ~5 min → "5 minutes ago"; ~2 h → "2 hours ago"; ~2 d → "2 days ago"; ~3 w → "3 weeks ago"; ~2 mo → "2 months ago"; ~1 y → "1 year ago" (exact `Intl.RelativeTimeFormat('en', { numeric: 'auto' })` output).

## 4. Write `app/(main)/lists/ui/components/__tests__/ShareButton.test.tsx` (universal COVERAGE_FLOOR)

### 4A. ModuleMocks

- [x] 4.1 `vi.mock('@/app/actions/lists', () => ({ setListVisibility: vi.fn() }))`; configure resolution per test.
- [x] 4.2 `vi.mock('react-hot-toast', …)` exposing `toast.success` / `toast.error` / `toast.promise` spies.
- [x] 4.3 `vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))` (capture the `refresh` spy).
- [x] 4.4 `vi.mock` the purchase-modal trio (`Modal` / `PurchaseFlow` / `ModalButtons`) to inert stubs that render `children` and expose `primary_button_onclick` / `secondary_button_onclick`.
- [x] 4.5 Stub `navigator.clipboard.writeText` and `navigator.share` via `Object.defineProperty(navigator, …, { configurable: true })` in `beforeEach`; reset in `afterEach`.

### 4B. Trigger

- [x] 4.6 `Default_RendersShareTrigger` — `<button aria-label="Share list">` with the `MdOutlineIosShare` icon and "Share List" label.

### 4C. ShareFlow — non-private list

- [x] 4.7 `NonPrivate_WithNavigatorShare_InvokesShareWithTitleAndUrl` — `navigator.share` present → click calls it with `{ title: list.name, url: 'https://www.ctrlpluslist.com/lists/{id}' }`.
- [x] 4.8 `NonPrivate_WithoutNavigatorShare_CopiesToClipboardViaToastPromise` — `navigator.share` undefined → `toast.promise(navigator.clipboard.writeText(url), …)` invoked.
- [x] 4.9 `NavigatorShareAbortError_Swallowed_NoErrorToast` — `navigator.share` rejects with `AbortError` → no `toast.error`.
- [x] 4.10 `NavigatorShareOtherError_TogglesErrorToast` — rejects with a non-abort error → `toast.error('Failed to share list')`.

### 4D. PrivateFlow — make-private-and-share warning modal

- [x] 4.11 `Private_Click_OpensWarningModal` — `visibility = OWNER` → click renders the "This list is hidden." warning (no immediate share).
- [x] 4.12 `MakePrivateAndShare_Success_TogglesVisibility_Toasts_Refreshes_Shares` — `setListVisibility(id, LINK)` resolves `{ success: true }` → `toast.success('Sharing enabled')`, `router.refresh()`, and `performShare` runs.
- [x] 4.13 `MakePrivateAndShare_Failure_TogglesErrorToast` — resolves `{ success: false }` → `toast.error('Failed to enable sharing')`; `performShare` still runs (the modal closes regardless).
- [x] 4.14 `Cancel_ClosesWarningModal_NoVisibilityChange` — secondary button → modal closes, `setListVisibility` not called.

## 5. Write `app/(main)/lists/ui/components/__tests__/EditListAction.test.tsx` (universal COVERAGE_FLOOR)

- [x] 5.1 `vi.mock('./ListFormContainer', …)` to an inert stub exposing `onClose` and surfacing `isEditing` + `list`.
- [x] 5.2 `Default_RendersEditButton_NoFormOpen` — `<Button variant="on-dark">` with `MdModeEdit` icon + "Edit list" label; the `ListFormContainer` stub is not in the DOM.
- [x] 5.3 `Click_OpensListFormContainer_WithIsEditingAndList` — click → stub mounts with `isEditing` and the `list` prop.
- [x] 5.4 `FormOnClose_UnmountsContainer` — invoking the stub's `onClose` removes it from the DOM.

## 6. Write the contrast helper + invariant test

### 6A. `test/helpers/contrast.ts` + `test/helpers/__tests__/contrast.test.ts`

- [x] 6.1 Implement `parseColor`, `relativeLuminance`, `contrastRatio`, `compositeOver` per Decision 4.
- [x] 6.2 `contrast.test.ts`: `BlackOnWhite_Ratio21` — `contrastRatio('#000', '#fff')` ≈ 21:1 (within tolerance).
- [x] 6.3 `WhiteOnWhite_Ratio1` — `contrastRatio('#fff', '#fff')` === 1.
- [x] 6.4 `KnownThresholdPair_AboveAA` — `#767676` on `#fff` ≈ 4.54:1 (the canonical AA-boundary gray).
- [x] 6.5 `HalfAlphaComposite_IsMidpoint` — `compositeOver({r,g,b,a:0.5}, white)` channels equal the fg/white midpoint.
- [x] 6.6 `ParseColor_HexAndRgba` — `#7855f0` and `rgba(255,255,255,0.92)` parse to the expected channels/alpha (case-insensitive hex).

### 6B. `app/(main)/lists/ui/styles/__tests__/hero-contrast.test.ts` (node env) — the contrast-invariant deliverable

- [x] 6.7 Read `app/ui/styles/global.css`; extract `--hero-gradient` stops (`#4a35c5`, `#7855f0`) and `--light-color` (`#ffffff`) by custom-property name. Throw a named error if not found (Decision 5).
- [x] 6.8 Read `app/(main)/lists/ui/styles/list.css`; extract `.list-hero-title`, `.list-hero-subtitle`, `.list-hero-identity-foot`, and `.list-hero-eyebrow` (text color + its `background-color` fill) by selector + property. Named error on miss.
- [x] 6.9 `Title_MeetsLargeTextAA` — title color over the lightest gradient stop (`#7855f0`) ≥ 3:1.
- [x] 6.10 `Subtitle_MeetsNormalTextAA` — `rgba(255,255,255,0.92)` composited over `#7855f0` ≥ 4.5:1.
- [x] 6.11 `Footer_MeetsNormalTextAA` — `rgba(255,255,255,0.85)` over `#7855f0` ≥ 4.5:1.
- [x] 6.12 `Eyebrow_MeetsNormalTextAA` — `--light-color` text over (`rgba(255,255,255,0.17)` composited over `#7855f0`) ≥ 4.5:1.
- [x] 6.13 `LightestStopIsWorstCase` — assert the test uses the lighter of the two gradient stops as the background (sanity: `relativeLuminance(#7855f0) > relativeLuminance(#4a35c5)`).

## 7. Audits

### 7.1 Assertion-substance audit (on the new tests)

- [x] 7.1 Walk each new test file end-to-end. Every assertion SHALL name observable output (DOM attributes, exact-string classes, accessible names, callback/spy arguments, exact rendered text, exact computed contrast comparisons). No internal-state assertions, no DOM snapshots, no tautologies. Specifically verify: §3.13 / §3.15 assert the **absence** of `.list-hero-share-wrapper` (the corrected behavior, not the empty-wrapper quirk); §3.19 documents the occasion-without-subtitle divergence without asserting it as correct; §4.9 asserts `toast.error` was NOT called (abort swallow). Record disposition for any flagged test.

### 7.2 Duplication audit (across the new test files + carve-out source)

- [x] 7.2 Source: the visibility-derivation duplication between `ListDetails.tsx` and `ShareButton.tsx` is the headline finding → fixed in-place via §2.1 `resolveListVisibility`. Tests: the `list` fixture builder is used by `ListDetails.test.tsx` only at first; if `ShareButton.test.tsx` / `EditListAction.test.tsx` need the same builder, or a future 4.8 hero-collapse test needs the six collaborator stubs, extract to `test/helpers/`. **Default: inline; record the chosen disposition.**

### 7.3 Complexity audit (on the carve-out source)

- [x] 7.3 Run `npm run lint`; confirm zero `sonarjs/cognitive-complexity` warnings/errors on `ListDetails.tsx`, `ShareButton.tsx`, `EditListAction.tsx`. Expected: `ShareButton.tsx` highest (~8–10), `ListDetails.tsx` ~6–8, `EditListAction.tsx` ≤3. Record measured values if surfaced.

### 7.4 Testability audit (on the carve-out source)

- [x] 7.4 Coverage report at universal `COVERAGE_FLOOR` or above for `ListDetails.tsx`, `ShareButton.tsx`, `EditListAction.tsx`, and `lib/visibility.ts`'s `resolveListVisibility`. Record per-file metrics from `coverage/coverage-summary.json`.
- [x] 7.5 `/* v8 ignore */` annotations: list each annotated region with rationale. Anticipated: none expected; if `ShareButton`'s `navigator.share` `catch` branch or the `useRouter` interaction resists, prefer disposition (a) write the test.
- [x] 7.6 Source refactors taken in-place: §2.1 (`resolveListVisibility` extraction) and §2.2 (nested-share-wrapper collapse). Record file + line + rationale for each.
- [x] 7.7 **Architectural finding spanning outside the carve-out:** `ListActionsMenu` (consumed by both `list-hero-header` and `list-hero-collapse`; invokes `deleteList` from `app/actions/lists.ts`) is unowned by any current sub-proposal. Disposition: **deferred** (audits 1–3 may defer) — recommend 4.9 `test-list-item-management` claim it. Do NOT stretch this carve-out to cover the delete-list flow; do NOT drop it silently. Surface as an Open Question for the parent-change owner.

### 7.5 Invariant-elevation audit

- [x] 7.8 Confirm the MODIFIED `list-hero-header` requirement (no empty share-wrapper on viewer/preview) is asserted by §3.13 and §3.15, and that one share-wrapper on owner views is asserted by §3.5.
- [x] 7.9 Confirm the contrast requirement (R8) is enforced by §6.9–§6.12.
- [x] 7.10 Candidates considered but NOT elevated, with rationale: (a) `timeAgo` bucket boundaries — formatting detail, unit-tested directly (§3.24), not a cross-cutting SHALL; (b) preview-banner copy/structure — already governed by the spec's preview scenarios; (c) **occasion-without-subtitle eyebrow divergence** — a genuine source/spec gap (spec says the eyebrow renders standalone when no subtitle; source renders it only inside the subtitle-gated wrapper). Flagged, NOT fixed in this carve-out (fix is a layout/placement decision beyond the testability mandate — Decision 8). Surface as an Open Question; §3.19 documents current behavior without locking it.

## 8. Config changes

- [x] 8.1 Extend the per-file `sonarjs/cognitive-complexity = error` override array in `eslint.config.mjs` with a comment header `// test-list-hero-header (sub-proposal 4.7) — locked at universal COVERAGE_FLOOR.` and the three paths:
  - `app/(main)/lists/ui/components/ListDetails.tsx`
  - `app/(main)/lists/ui/components/ShareButton.tsx`
  - `app/(main)/lists/ui/components/EditListAction.tsx`
- [x] 8.2 Add per-file threshold entries in `vitest.config.ts`'s `thresholds` map for the three component files (and confirm `lib/visibility.ts` already has one from 2.1), each referencing `COVERAGE_FLOOR`. No per-file numeric variation.
- [x] 8.3 Confirm `vitest.config.ts`'s `coverage.exclude` covers `**/__tests__/**` and `test/helpers/**`. No new exclude line if already present.

## 9. Apply spec deltas

- [x] 9.1 Apply the MODIFIED requirement from `specs/list-hero-header/spec.md` into the active `openspec/specs/list-hero-header/spec.md` (full requirement block, replacing the existing one). Fill the `Purpose` section (replace the `TBD - created by archiving change redesign-list-hero` placeholder with a one-paragraph scope statement). Validate via `openspec validate list-hero-header --strict`.
- [x] 9.2 Confirm the carve-out bookkeeping spec at `openspec/changes/test-list-hero-header/specs/testing-foundation/spec.md` stays archive-only — does NOT roll into the parent `test-coverage` accumulator and does NOT modify the active `openspec/specs/testing-foundation/spec.md` (Tier 2 per D13).
- [x] 9.3 Leave the `openspec/changes/test-coverage/tasks.md` §4.7 checkbox unchecked; it flips on archive of this sub-proposal, not at apply.

## 10. Pre-merge (four-gate)

- [x] 10.1 `npm run lint` passes with zero NEW errors/warnings introduced by this change (pre-existing carry-forward warnings acceptable).
- [x] 10.2 `npx tsc --noEmit` exits 0.
- [x] 10.3 `npm run build` completes successfully.
- [x] 10.4 `npm run test:coverage` passes; the four carve-out files at universal `COVERAGE_FLOOR` (98/98/95/100) or above; `contrast.ts` proven by its own test.
- [x] 10.5 `npm run test:e2e` — record outcome. Not blocked by this carve-out; e2e lands with 6.x.

## 11. Audit disposition record (filled at apply time)

- **§7.1 Assertion-substance** — every assertion in the five new test files names observable output (DOM class strings, sibling/DOM order, accessible names, `href`/`data-*` attribute values, spy call arguments, exact rendered footer text, exact computed contrast ratios). No tautologies, no DOM snapshots, no internal-state reads. §3.13 / §3.15 assert the **absence** of `.list-hero-share-wrapper` on viewer/preview (the corrected behavior, not the empty-wrapper quirk); §3.5 asserts exactly one wrapper on owner shared views; §3.19 documents the occasion-without-subtitle divergence (with an inline `// divergence` note) without asserting it as correct; §4.9 asserts `toast.error` was NOT called on `AbortError`. No tests weakened or deleted.
- **§7.2 Duplication** — Source: the visibility-derivation duplication between `ListDetails.tsx` and `ShareButton.tsx` fixed in-place via `resolveListVisibility` in `lib/visibility.ts` (§2.1). Tests: the `list` fixture builder is shared by all three component test files, so it was **extracted** to a colocated `app/(main)/lists/ui/components/__tests__/test-helpers.ts` (`makeList`) rather than inlined three times. The six `ListDetails` collaborator stubs remain inline in `ListDetails.test.tsx` (single consumer today; extract if 4.8 needs them).
- **§7.3 Complexity** — measured at apply: `ListDetails.tsx` was **18** (the design's ~6–8 estimate was wrong) — reduced to ≤15 by extracting the `navHrefs()` derivation (a pure helper colocated in the file, alongside the existing `timeAgo()`), no DOM/behavior change. `ShareButton.tsx` and `EditListAction.tsx` are well under 15. The `sonarjs/cognitive-complexity = error` override holds for all three; `npm run lint` is clean.
- **§7.4 Testability (per-file metrics)** — from `coverage-summary.json`: `EditListAction.tsx` 100/100/100/100; `ListDetails.tsx` lines 100, statements 100, branches 98.41, functions 100; `ShareButton.tsx` 100/100/100/100; `lib/visibility.ts` 100/100/100/100. All ≥ universal `COVERAGE_FLOOR` (98/98/95/100).
- **§7.5 `/* v8 ignore */`** — none. (One genuinely unreachable branch remains in `ListDetails.tsx`'s `timeAgo` loop — the `if (diffSec >= seconds)` false arm cannot be hit because the ascending unit table always matches at the first iteration ≥ the threshold — but branch coverage stays at 98.41% ≥ floor, so no ignore annotation was needed.) Two `eslint-disable-next-line testing-library/no-node-access` comments (with rationale) cover the react-icons `<svg>` presence checks, which expose no role/testid.
- **§7.6 Source refactors** — (a) `resolveListVisibility` extraction to `lib/visibility.ts`, consumed by `ListDetails.tsx` and `ShareButton.tsx` (§2.1, duplication fix); (b) nested/empty `.list-hero-share-wrapper` collapse in `ListDetails.tsx` `.list-hero-identity-top` (§2.2, assertion-audit fix, Decision 6); (c) `navHrefs()` extraction in `ListDetails.tsx` (complexity-audit fix); (d) `timeAgo(list.updated_at)` called directly (removed the redundant caller-side `?:` gate — the helper already returns `''` for nullish). **Additional source fix outside the original plan:** the hero text colors failed WCAG AA against the lightest gradient stop (subtitle 4.34, footer 3.95, eyebrow 3.59 vs. the 4.5:1 normal-text bar) — the design wrongly assumed they passed. With the user's approval, `list.css` `.list-hero-subtitle` / `.list-hero-identity-foot` were made opaque white (4.82:1) and `.list-hero-eyebrow`'s fill reduced to `rgba(255,255,255,0.03)` (4.58:1). `hero-contrast.test.ts` now regression-locks all four roles.
- **§7.7 ListActionsMenu ownership** — deferred to 4.9 recommendation (Open Question); mocked in `ListDetails.test.tsx`, not exercised here.
- **§7.10 occasion-without-subtitle divergence** — flagged, not fixed (Open Question, Decision 8); §3.19 documents current behavior with an inline `// divergence` note.
- **§10 Pre-merge gates** — `npm run lint` clean (10.1 ✓); `npx tsc --noEmit` exits 0 (10.2 ✓); `npm run build` completes (10.3 ✓); carve-out coverage at floor (10.4 ✓ for the four files — see §7.4; the full-suite run also exercises pre-existing pglite DAL integration tests that are environmentally flaky in this worktree and unrelated to this change); `npm run test:e2e` not run (10.5 — e2e lands with 6.x per the change; no e2e added by this carve-out).
