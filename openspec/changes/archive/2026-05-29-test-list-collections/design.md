## Context

Sub-proposal 4.6 of the `test-coverage` initiative — a capability-flow carve-out. The foundation work (1.1 spike, 1.2 foundation, 0.1 housekeeping, 2.1 pure-libs), all six primitive-family carve-outs (3.1–3.8), and the first capability-flow carve-out (4.1 `test-app-frame`) are archived. The `testing-foundation` capability is established and hardened: `__tests__/` colocation is the convention, the universal per-file floor is `lines:98 / statements:98 / branches:95 / functions:100` referenced from a single `COVERAGE_FLOOR` constant in `vitest.config.ts`, and the four-audit + invariant-elevation obligations are stable.

Like `test-app-frame`, this carve-out elevates against an **already-substantive** spec (`list-collections`, created by archiving `redesign-home-and-tokens` with four real requirements, not a "TBD" placeholder). Unlike `test-app-frame` — which had genuine source/spec drift requiring a MODIFIED scenario — the `list-collections` source matches its existing sub-nav requirements; the spec edits here are purely ADDED requirements for the card-rendering invariants that no requirement currently states.

Carve-out (per parent `test-coverage` tasks.md §4.6):

| File | LOC | Char | Tested how |
|---|---|---|---|
| `app/ui/components/ListCard.tsx` | 61 | Pure presentational server component. Renders `<Link class="list-card" href="/lists/${id}">` wrapping a `.list-card-head` (name span with `title` attr; conditional `<FaBookmark aria-label="Bookmarked">`; conditional `.list-card-byline` with `<FaUser aria-hidden>` when `showOwner && user?.name`; `.list-card-subtitle` OR `.list-card-subtitle-placeholder[aria-hidden]`) and a `.list-card-meta` (occasion span + date span formatted with `timeZone:'UTC'`). | jsdom + RTL; `next/link` → `MockNextLink` |
| `app/ui/components/ListCardRow.tsx` | 41 | Pure presentational. Empty-state branch (`lists.length === 0` → `.list-card-row-empty`); otherwise `<div class="list-card-row" role="list">` mapping each list to a `.list-card-row-item[role=listitem]` wrapping `<ListCard>` (threading `showOwner` + `bookmarked={bookmarkedIds?.has(id) ?? false}`); conditional trailing `<MoreCard>` gated on `moreCount > 0 && seeAllHref`. | jsdom + RTL; composes real `ListCard` + `MoreCard` |
| `app/ui/components/MoreCard.tsx` | 21 | Pure presentational. `<Link class="more-card" href aria-label="${moreCount} more — see all">` wrapping `<span class="more-card-text">+{moreCount} more <span aria-hidden="true">→</span></span>`. | jsdom + RTL; `next/link` → `MockNextLink` |
| `app/ui/components/ListCollectionsNav.tsx` | 43 | `'use client'`. `usePathname()` + a static `TABS` array (My Lists `/lists`, Bookmarks `/lists/bookmarks`, Recently visited `/lists/history`, Following `/following`). Renders `<div class="list-collections-nav"><nav class="list-collections-tabs" aria-label="List collections">` of four `<Link>` tabs with `active = pathname === href` (exact match) → active class + `aria-current="page"`; optional `.list-collections-actions` slot when `children` provided. | jsdom + RTL + `next/navigation` module mock for `usePathname`; `next/link` → `MockNextLink` |

Coverage floor: universal `COVERAGE_FLOOR` per `test-housekeeping` (98 / 98 / 95 / 100). Per-file thresholds are added by-name in `vitest.config.ts`, referencing the constant.

Bound by:

- `testing-foundation` — `__tests__/` colocation, universal `COVERAGE_FLOOR`, no-backdoor rule, four-gate pre-merge, four-audit + invariant-elevation obligations, assertion-substance bar, complexity ≤ 15, `<State>_<Behavior>` shape, three-role `describe()`, observable-behavior-over-execution.
- `list-collections` (active) — owns four existing SHALLs. This sub-proposal ADDS three SHALLs (Decisions 3a / 3b / 3c) and regression-locks R2 + R3 at the component level. No requirements are MODIFIED or REMOVED.
- `app-frame` (active) — owns the "Lists nav pill SHALL NOT activate on `/lists/bookmarks` or `/lists/history`" requirement (added by `test-app-frame`). That global-nav contract is the same concern as `list-collections` R4; this carve-out does NOT re-assert it (the `ListCollectionsNav` component does not render the global app-nav).

## Goals / Non-Goals

**Goals:**

- Land four colocated test files (all jsdom) at the universal `COVERAGE_FLOOR`.
- Exercise every observable branch of every file — no execute-for-coverage renders, no tautological assertions, no snapshot-only tests.
- Promote `sonarjs/cognitive-complexity` from `warn` to `error` for all four files via `eslint.config.mjs` per-file overrides.
- Regression-lock the `list-collections` spec's R2 (tab strip + active marking) and R3 (right-side actions slot) at the component level via `ListCollectionsNav.test.tsx`.
- ADD three card-rendering SHALLs to the `list-collections` spec (Decisions 3a / 3b / 3c).
- Complete the four-audit obligation (duplication / complexity / testability on source; assertion audit on the new tests) AND the invariant-elevation audit, recording dispositions in `tasks.md`.

**Non-Goals:**

- No source refactors anticipated (no observed latent quirks; contrast `test-app-frame`'s `Header.tsx` fix). If the assertion-substance audit surfaces one, it lands in-place per the no-backdoor rule.
- No coverage of the call sites — home rails, `MyListsPage`, `BookmarksPage`, `HistoryPage`, `FollowingPage`, `ProfilePage`, `UserCardGrid`. Those belong to `home-digest` / `following` / page-level `list-collections` carve-outs.
- No coverage of `list-collections` R1 (which routes render the sub-nav) or the R2 "active tab IS the page heading / no separate `<Header>`" clause — both are page-composition contracts, not reachable from the `ListCollectionsNav` component in isolation (Decision 5).
- No re-assertion of `list-collections` R4 / `app-frame`'s peer-route exclusion — already locked by `test-app-frame` (Decision 5).
- No coverage of CSS. The horizontal-scroll row layout and mobile tab wrap are CSS; jsdom does not compute layout. Behavior-driven assertions (DOM structure + classes + roles) are the proxy.
- No e2e. Full navigation flows (clicking a tab navigates; clicking a card opens the list) are e2e territory and belong to 6.x.
- No DOM-snapshot tests. Every assertion names a specific attribute, class string, accessible name, rendered text content, or element presence/absence.

## Decisions

### Decision 1: One `.test.tsx` per source file; tests live under `app/ui/components/__tests__/`.

All four source files live in `app/ui/components/`. Each gets its own colocated test under the existing `app/ui/components/__tests__/` directory per the `test-housekeeping` convention.

Test file locations:

- `app/ui/components/__tests__/ListCard.test.tsx`
- `app/ui/components/__tests__/ListCardRow.test.tsx`
- `app/ui/components/__tests__/MoreCard.test.tsx`
- `app/ui/components/__tests__/ListCollectionsNav.test.tsx`

**Alternatives considered:**

- *One `list-collections.test.tsx` covering all four.* Rejected — destroys per-source-file coverage attribution and degrades failure output. Same reasoning as every prior carve-out.
- *Fold `MoreCard.test.tsx` into `ListCardRow.test.tsx` since the row composes the card.* Rejected — `MoreCard` is a separate export with its own accessible-name contract and is rendered directly by the row; per-file thresholds in `vitest.config.ts` enumerate by source path, and per-file failure attribution is load-bearing. `ListCardRow.test.tsx` exercises `MoreCard` as an integration (it renders the real child), but `MoreCard.test.tsx` independently locks the `MoreCard` contract.

### Decision 2: `ListCollectionsNav` is tested by mocking `next/navigation`'s `usePathname`; cards render through `MockNextLink`.

`ListCollectionsNav.tsx` is a `'use client'` component whose only external dependency is `usePathname()` from `next/navigation`. The test mocks `next/navigation` at file scope and sets the return per test, exactly as `AppNav.test.tsx` does:

```ts
vi.mock('next/navigation', () => ({ usePathname: vi.fn() }));
// per describe/it:
vi.mocked(usePathname).mockReturnValue('/lists/bookmarks');
```

All four files import `next/link`. The repo already has a shared `MockNextLink` in `app/ui/components/__tests__/test-helpers.tsx` (used by the `app-frame` tests). Each test mocks `next/link` to that helper, which renders a real `<a href>` in jsdom:

```ts
vi.mock('next/link', async () => ({
  default: (await import('./test-helpers')).MockNextLink,
}));
```

This keeps the assertions on consumer-facing HTML (`href`, `class`, `aria-*`, text), not Next-internal behavior (prefetching).

**Alternatives considered:**

- *Render `ListCollectionsNav` inside a Next `AppRouterContext` provider instead of mocking `usePathname`.* Rejected — the provider plumbing is heavier and couples the test to Next internals; the `usePathname` module mock is the established repo pattern (`AppNav.test.tsx`) and gives precise per-test pathname control.
- *Don't mock `next/link`; rely on its jsdom rendering directly.* Acceptable in principle (Next's `Link` renders a real anchor in jsdom), but the repo standardized on `MockNextLink` for the `app-frame` carve-out to avoid Next's link-prefetch console noise and version coupling. This carve-out follows the established precedent for consistency.

### Decision 3: ADD three card-rendering SHALLs to `list-collections`. Leave R1–R4 unchanged; regression-lock R2 + R3 at the component level.

The invariant-elevation audit (per `testing-foundation`) gates each invariant the tests assert against three-part criteria: non-obvious / survives reimplementation / protects a real failure mode. The `ListCollectionsNav` source matches the existing R2 / R3 sub-nav requirements (no drift), so those are locked by tests without a spec change. The card components (`ListCard` / `ListCardRow` / `MoreCard`) enforce invariants no requirement currently states; issue #45 designates `list-collections` as the elevation target. Three requirements are ADDED.

#### Decision 3a (ADDED): `ListCard` link + name/`title` + occasion + UTC date + subtitle placeholder.

The source at HEAD renders the date via:

```tsx
{list.date.toLocaleDateString('en-US', {
  year: 'numeric', month: 'short', day: '2-digit', timeZone: 'UTC',
})}
```

and the subtitle slot via:

```tsx
{list.subtitle
  ? <div className="list-card-subtitle">{list.subtitle}</div>
  : <div className="list-card-subtitle-placeholder" aria-hidden />}
```

**ADDED Requirement** locks: the card is a link to `/lists/${list.id}`; the name renders in `<span class="list-card-name-text" title={list.name}>` (the `title` attribute is the native-tooltip-on-truncation contract); the occasion renders in `.list-card-occasion`; the date renders in `.list-card-date` formatted in the **UTC** time zone (so the displayed calendar day does not drift by the runner's / viewer's local zone); when a subtitle is present, `.list-card-subtitle` renders and the placeholder does not; when absent, the `aria-hidden` `.list-card-subtitle-placeholder` renders in its place (preserving uniform card height across a row of mixed-subtitle cards).

Non-obvious (`timeZone: 'UTC'` is a single option easily dropped in a "cleanup"; the placeholder is an empty div whose only job is layout height and looks deletable). Survives reimplementation (any rewrite has to keep the UTC pin and the height-preserving placeholder or the row visibly misaligns / dates shift). Protects real failure modes: off-by-one date display (a list dated `Jan 1` showing as `Dec 31` for users west of UTC) and ragged card heights in the horizontal row. Elevated.

#### Decision 3b (ADDED): `ListCard` conditional bookmark indicator + owner byline.

The source:

```tsx
{bookmarked && <FaBookmark className="list-card-bookmark-indicator" aria-label="Bookmarked" />}
// ...
const ownerName = showOwner ? list.user?.name : null;
{ownerName && <div className="list-card-byline"><FaUser aria-hidden /> {ownerName}</div>}
```

**ADDED Requirement** locks: the bookmark indicator renders ONLY when `bookmarked` is true, and carries the accessible label `"Bookmarked"` (the only a11y signal that an otherwise-decorative icon conveys saved-state); the owner byline renders ONLY when `showOwner` is true AND `list.user?.name` is a non-empty value — `showOwner` false OR a null user/name yields no byline (the `<FaUser>` is `aria-hidden`, so the byline's accessible content is the name text alone).

Non-obvious (the byline is doubly gated — both the `showOwner` prop AND the optional-chained name must be truthy; a naive reimplementation might render an empty byline when `showOwner` is true but the name is null). Survives reimplementation (the gating is the contract that keeps owner identity off own-list surfaces and prevents an empty byline). Protects real failure modes: an empty/blank byline row, or showing an owner attribution on a surface (`showOwner={false}`) that should present the card as the viewer's own. Elevated.

#### Decision 3c (ADDED): `ListCardRow` empty state + dual-condition more-affordance + `MoreCard` label.

The source:

```tsx
if (lists.length === 0) return <div className="list-card-row-empty">{emptyMessage}</div>;
const showMore = moreCount > 0 && seeAllHref;
// ... role="list" / role="listitem" ... {showMore && <MoreCard moreCount={moreCount} href={seeAllHref} />}
```

and `MoreCard`'s `aria-label={`${moreCount} more — see all`}` with the arrow in an `aria-hidden` span.

**ADDED Requirement** locks: an empty `lists` array renders the `.list-card-row-empty` message branch (and NOT the `role="list"` container); a non-empty array renders `role="list"` with one `role="listitem"` per card in order; the "+N more" affordance renders ONLY when BOTH `moreCount > 0` AND `seeAllHref` is provided (either condition false → no affordance), and when rendered it is the trailing item; `MoreCard`'s accessible name is exactly `${moreCount} more — see all` and the visible `→` glyph is `aria-hidden` (so screen-reader users hear the count + intent, not a bare arrow).

Non-obvious (the more-affordance is gated on TWO independent conditions, not just a count; the empty-state is a wholly separate render branch; the arrow's `aria-hidden` is the difference between an accessible and a confusing announcement). Survives reimplementation (any rewrite must preserve the dual gate or the affordance appears with a broken/empty href, and must keep the list/listitem roles for assistive-tech list semantics). Protects real failure modes: a "+N more" link with no destination (`seeAllHref` undefined but count > 0), a missing empty-state, and a screen-reader announcement of a meaningless arrow glyph. Elevated.

**Alternatives considered for Decision 3:**

- *Create a new `list-card-system` capability spec for the three card files.* Rejected — issue #45 explicitly designates `list-collections` as the elevation target ("MAY elevate latent invariants to the `list-collections` spec"), and spinning up a new capability for three small presentational files is overkill (same calibration as `test-app-frame` Decision 3c rejecting a `keyboard-offset-system` capability for a 36-line hook).
- *Don't elevate anything; just lock behavior with tests.* Rejected — the four-audit + invariant-elevation obligation requires disposing of each surfaced invariant; the UTC-date, subtitle-placeholder, byline-gating, and dual-condition-more invariants all clear the non-obvious / survives-reimplementation / real-failure-mode bar, so the correct disposition is elevation (matching every prior carve-out that found genuine latent invariants).
- *Fold all three into a single mega "ListCard rendering" requirement.* Rejected — `ListCardRow` + `MoreCard` are a separate composition concern from the single-card rendering; and splitting `ListCard` into "core fields" (3a) vs "conditional affordances" (3b) keeps each requirement's scenarios focused and its failure attribution clear.

### Decision 4: The card SHALLs are owned by `list-collections` even though the cards render in other capabilities.

`ListCard` / `ListCardRow` / `MoreCard` are shared UI: they render in the `home-digest` rails (`MyListsRail`, `FollowingRail`, `BookmarksRail`, `RecentlyVisitedRail`), in `following` surfaces, in `ProfilePage`, and in `UserCardGrid` — not only on the four `list-collections` peer routes. Despite this, the parent `test-coverage` tasks.md §4.6 assigns their test coverage to this carve-out, and issue #45 designates `list-collections` as the elevation target. The ADDED card SHALLs therefore live in `list-collections`; consuming capabilities inherit them as a shared-component contract.

**Alternatives considered:**

- *Split the card coverage across the capability carve-outs that consume them (some in `home-digest`, some here).* Rejected — splits one component's tests across multiple sub-proposals, breaking per-file coverage ownership and inviting double-coverage or gaps. The parent assigned them here as a unit.
- *Defer the card SHALLs until a future shared-UI capability exists.* Rejected — no such capability is planned in `test-coverage/tasks.md`, and the invariants are load-bearing now. `list-collections` is the designated home per the issue.

### Decision 5: `list-collections` R1 (page set), R2's "active tab IS the page heading" clause, and R4 (global nav) are NOT exercised by this component carve-out.

Three existing `list-collections` contracts are page-composition or global-nav concerns, not properties of the `ListCollectionsNav` component in isolation:

- **R1** ("the four peer routes render the sub-nav; other `(main)/` routes do NOT") — this is about WHICH pages render `<ListCollectionsNav />`, asserted by the page modules, not the component. The component renders the same tab strip regardless of route.
- **R2's heading clause** ("the active tab serves as the page heading; pages SHALL NOT render a separate `<Header title>` duplicating the tab label") — a cross-component page-composition contract (the component renders tabs; whether a sibling `<Header>` also renders is the page's concern).
- **R4** ("the global app-nav SHALL NOT show an active pill on the collection peers") — concerns the `AppNav` component (owned by `app-frame`), already regression-locked by `test-app-frame`'s ADDED "Lists nav pill SHALL NOT activate on `/lists/bookmarks` or `/lists/history`" requirement.

This mirrors `test-app-frame` Decision 9 (CSS-level R4/R5 not re-exercised from a component carve-out). The component test DOES lock the component-level slice of R2 (tab strip, exact-match active marking, `aria-current`) and R3 (the actions slot).

**R1 drift note:** `ProfilePage` at `/user/[id]` renders `<ListCollectionsNav />`, but R1's exclusion scenario lists `/u/[id]` (stale route spelling) as a page that SHALL NOT render the sub-nav. This is a page-composition divergence — the component itself behaves correctly on a non-peer pathname (no active tab, which `ListCollectionsNav.test.tsx` locks). Reconciling R1's page enumeration requires a product decision about whether `ProfilePage` should render the nav, which is outside this component carve-out. Disposition: recorded as a deferred invariant-elevation finding in `tasks.md` §5.5 — flagged for the owning page capability, NOT silently modified here.

**Alternatives considered:**

- *Modify R1 to add `/user/[id]` to the set of routes that render the sub-nav.* Rejected — that's a product/page-composition decision (should the profile page show the collections nav at all?), not a test-coverage call. Modifying R1 from a component test carve-out would overstep the carve-out's authority. Deferred as a finding.
- *Parse the page modules to assert R1's page set from this change.* Rejected — couples the carve-out to page-file parsing across multiple capability surfaces, far outside the four-file carve-out. The page set belongs to the page capabilities' own coverage.

### Decision 6: A `makeList(overrides)` fixture builder is extracted to `test-helpers.tsx` only if reused across `ListCard.test.tsx` and `ListCardRow.test.tsx`; otherwise inline.

Both `ListCard.test.tsx` and `ListCardRow.test.tsx` need `ListCardData` fixtures. The shape is small (`id`, `name`, `subtitle?`, `occasion`, `date`, `user?`). If the same builder is used in both files (2 files), the duplication audit (§5.2) decides between inline (acceptable for 2 files) and extraction to the existing `app/ui/components/__tests__/test-helpers.tsx` (which already exports `MockNextLink` and is excluded from coverage via the `**/__tests__/**` glob). Default leaning: extract a one-line `makeList(overrides: Partial<ListCardData> = {}): ListCardData` since the date field needs a deterministic fixed `Date` and centralizing it avoids drift between the two files' UTC-date expectations.

**Alternatives considered:**

- *Always inline the fixtures.* Acceptable, but the UTC-date contract (Decision 3a) is asserted in both files against the same fixed `Date`; a shared builder keeps the two expectations from drifting. The audit makes the final call.
- *Add a `test/fixtures/` module for list data.* Rejected as premature — `test/fixtures/` is for cross-suite reuse (per `testing-foundation`); a builder used by two colocated component tests belongs in the colocated `__tests__/test-helpers.tsx`, not the global fixtures dir.

## Risks / Trade-offs

- **The UTC-date assertion must be runner-timezone-independent.** Because the source pins `timeZone: 'UTC'`, the formatted output is deterministic regardless of the CI runner's `TZ`. The test asserts the exact formatted string for a fixed UTC instant. → Mitigation: pick a `Date` whose UTC and local days differ (e.g. `new Date('2025-01-01T00:30:00Z')`) so the test would fail if a future edit drops the `timeZone: 'UTC'` option (reverting to local-time formatting). The assertion is on the source's pinned-UTC contract, not on the runner's zone.
- **`ListCard` is shared UI elevated into `list-collections`.** The SHALLs describe component behavior; consumers in `home-digest` / `following` inherit them (Decision 4). → Accepted: no competing spec, and the issue designates `list-collections` as the home.
- **R1 page-set drift surfaced but not fixed here.** `ProfilePage` renders the nav against R1's exclusion list. → Accepted/deferred: component behavior is correct and locked; the page-set reconciliation is a product decision for the owning page capability (Decision 5, `tasks.md` §5.5).
- **`ListCardRow.test.tsx` renders real `ListCard` + `MoreCard` children (integration, not isolation).** A bug in `ListCard` could surface in the row test as well as its own. → Accepted: this is the right boundary — the row's contract is that it composes the real children with the right props; mocking the children would lose the integration assertion (that `bookmarkedIds`/`showOwner` actually thread through). `MoreCard.test.tsx` and `ListCard.test.tsx` independently pin their own contracts, so a failure localizes.
- **Cognitive-complexity promotion locks the ceiling at 15 for all four files.** Measured complexity at HEAD is low (`ListCardRow` highest at ~4–5). → Accepted: comfortable buffer; a future change pushing a file over 15 fails with the "extract a helper" escape valve.
- **No e2e for the navigation/click flows.** Clicking a tab navigating, or a card opening its list, is asserted only as the rendered `href` here. → Accepted: the full navigation flow is e2e territory (6.x); the unit contract is the correct `href` / `aria-current`, which these tests lock.
