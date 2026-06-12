## Context

Sub-proposal 4.8 of `test-coverage` (GitHub issue #47). The `list-hero-collapse` capability is implemented by a small cluster of modules under `app/(main)/lists/ui/components/`:

- `HeroCollapseShell.tsx` (client) — owns the expanded↔collapsed toggle, derives initial state from `useSearchParams().get('hero')`, and writes state to the URL via `window.history.replaceState` (never `pushState`). Renders the collapsed strip (chevron + title + kebab-in-exclusion-zone) or the expanded children + bottom collapse handle.
- `HeroCollapsedItems.tsx` (client) — four exported menu-item factories (`ShareMenuItem`, `VisibilityMenuItems`, `BookmarkMenuItem`, `FollowMenuItem`) that render as kebab `prependedItems` while collapsed. Each mirrors an expanded-hero counterpart's action and carries optimistic-update + rollback-on-failure state.
- `HeroCollapsedItemsContainer.tsx` (async server) — `HeroCollapsedOwnerItems` (Share + Visibility rows) and `HeroCollapsedViewerItems` (Share + Bookmark + block-gated Follow), the latter pre-fetching state via five `@/lib/dal` reads.
- `ListActionsMenu.tsx` (client) — the kebab. Accepts `prependedItems?: ReactNode` and `isOwner?: boolean` (default `true`); suppresses all owner-only items when `isOwner === false`.
- `visibility-rows.tsx` — the shared `VISIBILITY_ROWS` table + `rowFor()` helper, consumed by both `<VisibilityPicker>` (expanded) and `<VisibilityMenuItems>` (collapsed).

The capability already has a six-requirement active spec at `openspec/specs/list-hero-collapse/spec.md`. This change locks that contract with tests at the universal `COVERAGE_FLOOR`, corrects spec wording that never matched the source, and elevates one latent a11y invariant. No new capability; no runtime behavior change.

The `testing-foundation` rules (runner, `__tests__/` colocation, universal floor via `COVERAGE_FLOOR`, four-audit obligation, `<State>_<Behavior>` naming, three-role `describe()`, NextAuth-boundary mocking allowance, `sonarjs/cognitive-complexity` warn-globally/error-per-carve-out) apply verbatim.

## Goals / Non-Goals

**Goals:**

- Cover the five carve-out-owned executable files to the universal floor (`lines:98 / statements:98 / branches:95 / functions:100`).
- Lock the `list-hero-collapse` SHALLs against regression: the toggle + URL-state contract, the collapsed-strip content, the kebab `prependedItems`/`isOwner` extension, and the share-URL hero-param exclusion.
- Correct the spec scenarios whose menu-item labels and visibility-row ordering describe wording the source never emitted (`Share` → `Share List`; `Just me` → `Hidden`; fixed `Hidden / Private / Shared` order).
- Elevate the collapsed-strip keyboard-operability invariant the source enforces but no SHALL locks.
- Promote `sonarjs/cognitive-complexity` to `error` for the five files; add their per-file threshold entries.

**Non-Goals:**

- Testing `ListDetails.tsx` (the hero composer), the expanded-state counterparts (`ShareButton`, `VisibilityPicker`, `BookmarkButton`/`BookmarkContainer`, `FollowContainer`), the route shells (`page.tsx`, `ListHeroSection.tsx`), or the `menu-system` primitives — each owned by another carve-out.
- Asserting the normative behavior of the server actions (`setListVisibility`, `bookmarkList`, `followUser`, …) or DAL reads — those contracts belong to `list-visibility`, `list-collections`, and `following`. Here they are mocked at the module boundary.
- Asserting computed layout / CSS (touch-target sizing, gradient continuity, media-query visibility) — jsdom implements no layout.
- Any change to the `?hero` URL-state model, the share-URL construction, or any runtime behavior.

## Decisions

### D1 — Carve-out boundary: own the five collapse-primary files; defer the composer and counterparts

`HeroCollapseShell`, `HeroCollapsedItems`, `HeroCollapsedItemsContainer`, `ListActionsMenu`, and `visibility-rows` exist primarily to implement the collapsed state and its kebab extension, so 4.8 owns their test files and per-file thresholds. `ListDetails.tsx` composes BOTH the expanded hero and the collapsed shell — its primary purpose is the hero composition governed by `list-hero-header`, so it is deferred to 4.7. The expanded counterparts (`ShareButton`, `VisibilityPicker`, etc.) are deferred to their owning capabilities. The `menu-system` primitives are tested under 3.4.

**Alternative considered:** test `ListDetails.tsx` here because it wires the prepended items. Rejected — per-file coverage assigns a file to exactly one carve-out, and `ListDetails` is dominated by expanded-hero composition (the collapse wiring is a few lines). Splitting it would duplicate ownership and force 4.7 to re-cover it. Deferred to 4.7 with this boundary recorded so it isn't re-discovered.

### D2 — `ListActionsMenu.tsx` is owned here, tested in full

The `prependedItems`/`isOwner` extension is a `list-hero-collapse` SHALL (R3), so this capability is the natural owner of the file. Because per-file coverage can't be split, 4.8 tests the WHOLE component — including the base owner items (`Choose items`, `Edit list`, spoiler/preview toggles, `Delete list`) whose normative ownership lies with `list-item-management` (4.9) / `list-metadata` (4.10). Those downstream carve-outs inherit `ListActionsMenu` as already-tested and assert their actions at the action layer, not by re-rendering this menu.

**Alternative considered:** test only the `prependedItems`/`isOwner` paths and `/* v8 ignore */` the base items. Rejected — the no-backdoor rule forbids ignoring reachable branches without a named structural reason; the base items are trivially reachable, so they get real assertions.

### D3 — Spec-follows-source for the label/ordering drift; ADD the keyboard invariant

Three spec corrections, all source-authoritative:

1. **`Share` → `Share List`.** R3's scenarios enumerate a `Share` item; `<ShareMenuItem>` renders the text `Share List`. Correct the spec.
2. **`Just me` → `Hidden`, fixed order `Hidden / Private / Shared`.** R3's prose/scenarios say "Just me / Private / Shared" in one place and "Private / Just-me / Shared" in another — internally inconsistent. The source's single `VISIBILITY_ROWS` table (consumed by BOTH the expanded picker and the collapsed kebab) fixes the order as `OWNER`(`Hidden`) → `LINK`(`Private`) → `FOLLOWERS`(`Shared`). Because both surfaces share one table, the source labels are authoritative and already in lockstep; only the spec wording was stale. Correct the spec.
3. **ADD collapsed-strip keyboard operability.** R1 says the strip "activates" but no scenario locks the keyboard path. The source renders `role="button" tabIndex={0}` and handles `Enter`/`Space` `keydown` with `preventDefault`. ADD a SHALL so a refactor that drops `onKeyDown` (leaving the strip mouse-only) fails loudly.

The direction is spec-follows-source rather than source-follows-spec because the source's labels are the user-visible truth and are consistency-guaranteed by the shared table; rewording the source to "Just me" would be a gratuitous, untested change. Recorded so a reviewer disputing the direction sees the rationale.

### D4 — Module-boundary mocking for server actions, DAL, and `navigator` web APIs

The client factories call server actions (`@/app/actions/lists`, `@/app/actions/follows`); the async container calls `@/lib/dal`. For a client-component unit test these are the DB/network boundary — exactly the category the testing-foundation already carves out for NextAuth. Disposition: `vi.mock` the action/DAL modules at file scope and assert on call arguments + drive the success/failure branches via mock return values. No source refactor.

`ShareMenuItem` reads `navigator.share` / `navigator.clipboard`, unimplemented by jsdom. Disposition: stub via `Object.defineProperty(navigator, 'share'|'clipboard', { configurable: true, value: … })`, reset in `afterEach`. The `if (navigator.share)` fallback branch is exercised by toggling the stub between defined and `undefined`.

**Alternative considered:** a real DB-under-test render. Rejected — it contradicts the unit/integration split (DB-backed flows are the e2e tier, 6.x) and would make a pure UI assertion depend on Neon.

### D5 — Async server components tested by direct invocation

`HeroCollapsedOwnerItems` / `HeroCollapsedViewerItems` are async functions returning JSX. RTL's `render(<Composer />)` may not transparently resolve an async component depending on version. Disposition: `const tree = await HeroCollapsedOwnerItems({ … }); render(tree);` — call the function, await the tree, render the result. This also gives a clean seam to assert which child factories appear (Share/Visibility for owner; Share/Bookmark/[Follow] for viewer) and to drive the block-gating matrix via the mocked `isBlocked` returns.

### D6 — Optimistic-rollback is tested for coverage but NOT elevated to a `list-hero-collapse` SHALL

Each `HeroCollapsedItems` factory carries optimistic-update + revert-on-failure state. The `!result.success` branches are exercised to meet the floor, but the normative contract for what `setListVisibility` / `bookmarkList` / `followUser` do lives in `list-visibility` / `list-collections` / `following`. Per the specs rule "cross-capability constraints belong in the capability that owns the behavior," these are tested here without adding a collapse SHALL. The overlap is named so a future reader doesn't mistake the absence of a SHALL for missing coverage.

## Risks / Trade-offs

- **Async server-component resolution in React 19 + RTL** → direct invocation (D5) sidesteps `render`-time async ambiguity.
- **Server-action / DAL module-boundary mocking disputed as "mocking internals"** → framed (D4) as the DB/network boundary, consistent with the NextAuth allowance; alternative (real DB) rejected with rationale.
- **`navigator.share`/`clipboard` stub fragility** → `Object.defineProperty(..., { configurable: true })` + `afterEach` reset; both `if (navigator.share)` branches covered by toggling the stub.
- **Label/ordering drift is real** → the new collapsed-kebab tests fail against the spec's `Just me`/`Share` wording; the MODIFIED scenarios (D3) are the fix and assert source wording.
- **`ListActionsMenu` ownership overlap with 4.9/4.10** → resolved by D1/D2: 4.8 owns the file; downstream carve-outs inherit it tested and assert at the action layer.

## Migration Plan

Additive. New test files + config entries + spec edits; no runtime code changes (no source refactor expected). Rollback = revert the change. The parent `test-coverage` §4.8 checkbox flips on `openspec archive test-list-hero-collapse`.

## Open Questions

None blocking. If `npm run test:coverage` reveals an unreachable branch in `HeroCollapseShell`'s `typeof window === 'undefined'` SSR guard (jsdom always defines `window`), disposition is `/* v8 ignore */` with the named rationale "SSR-only guard, unreachable under jsdom" rather than lowering the floor — recorded in `tasks.md` §5.
