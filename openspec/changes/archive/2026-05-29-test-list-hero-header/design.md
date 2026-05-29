## Context

Sub-proposal 4.7 of the `test-coverage` initiative — a capability-flow carve-out for `list-hero-header`, following the `test-app-frame` (4.1) pattern. The `testing-foundation` capability is established and hardened: `__tests__/` colocation, the universal per-file floor `lines:98 / statements:98 / branches:95 / functions:100` referenced from a single `COVERAGE_FLOOR` constant in `vitest.config.ts`, the four-audit + invariant-elevation obligations, the assertion-substance bar, and the `sonarjs/cognitive-complexity` warn-globally / error-per-carve-out policy.

The `list-hero-header` capability is rendered entirely by `app/(main)/lists/ui/components/ListDetails.tsx` — the spec's eight requirements all map to its JSX composition (single gradient panel, identity/controls zones, occasion eyebrow, visibility-picker placement, owner/viewer/preview action sets, footer line, no-page-scoped-override, and WCAG-AA contrast). `ListDetails` is rendered by the page-level `ListHeroSection.tsx` ([id]/ListHeroSection.tsx), which does the auth + DAL + visit-recording and passes the hero all its data via props.

Carve-out (the hero-header's own modules — collaborators owned by other capabilities are excluded, see Decision 2):

| File | LOC | Char | Tested how |
|---|---|---|---|
| `app/(main)/lists/ui/components/ListDetails.tsx` | ~245 | `export default async function` (awaits nothing). Composes the hero: `.list-hero` → optional `.preview-banner` → `.list-hero-grid` → `.list-hero-card-identity` (share-wrapper + title + eyebrow/subtitle + footer) + `.list-hero-card-controls` (owner: action-row + Choose-items; viewer: byline-group + divider + Share/Bookmark; preview: action-row only). Inlines the pure `timeAgo()` relative-time helper. | jsdom + direct invocation (`render(await ListDetails(props))`); six out-of-carve-out children module-mocked |
| `app/(main)/lists/ui/components/ShareButton.tsx` | ~110 | `'use client'`. Share affordance: `navigator.share` → fallback `navigator.clipboard` via `toast.promise`; private lists open a "make private & share" warning modal that calls `setListVisibility(id, LINK)` then shares. | jsdom + userEvent; `setListVisibility`, `react-hot-toast`, `useRouter`, purchase-modal trio mocked; `navigator.share`/`navigator.clipboard` stubbed |
| `app/(main)/lists/ui/components/EditListAction.tsx` | ~27 | `'use client'`. Owner Edit trigger: a `<Button>` that toggles a `ListFormContainer` modal. | jsdom + userEvent; `ListFormContainer` mocked |
| `lib/visibility.ts` (new `resolveListVisibility` export) | +~6 | Pure helper extracted from the duplicated `list.visibility ?? (list.shared ? LINK : OWNER)` derivation. | colocated/`test-pure-libs`-style unit test |
| `test/helpers/contrast.ts` (new shared helper) | ~50 | WCAG sRGB relative-luminance, contrast ratio, alpha compositing, color parsing. | `test/helpers/__tests__/contrast.test.ts` against WCAG reference pairs |
| `app/(main)/lists/ui/styles/__tests__/hero-contrast.test.ts` (new) | — | Parses `global.css` + `list.css`, computes per-role contrast vs the lightest gradient stop, asserts each hero text role clears AA. | node environment |

Coverage floor: universal `COVERAGE_FLOOR` per `test-housekeeping` (98 / 98 / 95 / 100), enforced on `ListDetails.tsx`, `ShareButton.tsx`, `EditListAction.tsx`, and `lib/visibility.ts`'s new export.

Bound by: `testing-foundation` (all rules verbatim); `list-hero-header` (active, 8 requirements — one MODIFIED, Purpose filled); `list-visibility` / `following` / `list-collections` / `list-hero-collapse` / `list-item-management` (own the mocked collaborators); `button-system` / `menu-system` (consumed via public API only — no page-scoped override).

## Goals / Non-Goals

**Goals:**

- Land five test files at the universal `COVERAGE_FLOOR`: `ListDetails.test.tsx`, `ShareButton.test.tsx`, `EditListAction.test.tsx`, the shared `contrast.ts` + its test, and `hero-contrast.test.ts`.
- Exercise every observable branch — owner / viewer / owner-preview compositions; private-vs-shared share affordance; eyebrow/subtitle presence matrix; footer pluralization + relative-time buckets; ShareButton's share/clipboard/private-promote flows. No execute-for-coverage renders, no tautologies, no machine-generated snapshot-only tests.
- Deliver the "including contrast invariants" mandate as an enforceable automated check that reads the actual gradient + text-color tokens from CSS and verifies WCAG AA against the worst-case (lightest) gradient pixel.
- Fix two source findings in-place: the nested/empty `.list-hero-share-wrapper`, and the duplicated visibility derivation.
- MODIFY the `list-hero-header` spec's visibility-picker-placement requirement to lock the wrapper-absent-on-viewer behavior; fill the `Purpose`.
- Promote `sonarjs/cognitive-complexity` from `warn` to `error` for the three carve-out component files.
- Complete the four-audit + invariant-elevation obligations, recording dispositions in `tasks.md`.

**Non-Goals:**

- No coverage of out-of-carve-out collaborators: `VisibilityPicker` (→ 4.11), `ListActionsMenu` (→ recommend 4.9), `Avatar`/`FollowContainer` (→ 4.2), `BookmarkContainer`/`BookmarkButton` (→ 4.6), `HeroCollapseShell`/`HeroCollapsedItems*` (→ 4.8). All mocked.
- No coverage of `ListHeroSection.tsx` (the page entry — auth/DAL/visit-recording belong to their own flows: 4.11 visibility gate, 4.14 visit-history).
- No coverage of `ListPrivate.tsx` (the visibility-denied view — owned by 4.11 `test-list-visibility`).
- No layout verification (the single-panel gradient continuity, side-by-side-vs-stacked zones, `space-between` height-matching, hairline divider) — jsdom has no layout engine. DOM-structure assertions + the contrast check are the unit-level proxy; full layout is e2e (6.x). See Decision 7.
- No fix for the occasion-without-subtitle eyebrow divergence (invariant-elevation candidate c) — flagged for a focused follow-up, see Decision 8.
- No real network / OAuth. `ShareButton` mocks `setListVisibility` (a server action) at its import boundary — this is mocking the carve-out's collaborator action, not the file under test; the action's own behavior is owned by 4.9/4.11.
- No DOM-snapshot tests. Every assertion names a specific attribute, class string, accessible name, rendered text, callback shape, or computed contrast value.

## Decisions

### Decision 1: One `.test.tsx` per executable carve-out source file; tests colocate under `__tests__/`.

`ListDetails`, `ShareButton`, `EditListAction` each get a colocated test under `app/(main)/lists/ui/components/__tests__/`. The pure `resolveListVisibility` helper is tested next to `lib/visibility.ts`'s existing tests. The contrast helper lives at `test/helpers/contrast.ts` with its test under `test/helpers/__tests__/`. The hero-contrast invariant test — a cross-cutting CSS contract, not bound to a single source file — colocates with the CSS it guards at `app/(main)/lists/ui/styles/__tests__/hero-contrast.test.ts` (the same "tests live next to what they assert" principle that puts e2e under `e2e/`).

**Alternatives considered:**

- *One mega `list-hero.test.tsx`.* Rejected — destroys per-file coverage attribution; same reasoning as every prior carve-out.
- *Put `hero-contrast.test.ts` under `test/`.* Rejected — it asserts a `list.css`/`global.css` invariant; colocating with the styles directory makes the dependency discoverable and keeps it from being mistaken for a generic helper test.

### Decision 2: The carve-out is the hero-header's own modules; collaborators owned by other capabilities are mocked and excluded.

The `list-hero-header` spec governs the **composition** of the hero — which elements render, in what order, for which viewer class. The collaborators it places are each owned by another capability:

- `VisibilityPicker` → `list-visibility` (the spec is explicit: the hero governs only its *placement*).
- `Avatar`, `FollowContainer` → `following` (avatar resolution + Follow button are `following`'s contract).
- `BookmarkContainer`/`BookmarkButton` → `list-collections` (the bookmark collection).
- `HeroCollapseShell`, `HeroCollapsedItems*` → `list-hero-collapse` (4.8) — mocked to a children-passthrough that also exposes its `title` + `collapsedKebab` props so the hero's hand-off to the collapse shell is assertable without exercising collapse behavior.

`ShareButton` and `EditListAction` ARE in carve-out: they are the hero's own affordances and **no other sub-proposal claims them** in the parent `tasks.md`. Excluding them would orphan two files; including them is the right level (both are small and hero-hosted).

**`ListActionsMenu` is the contested case.** It is consumed by BOTH `list-hero-header` and `list-hero-collapse` (as `collapsedKebab`), and it invokes `deleteList` from `app/actions/lists.ts` — a `list-item-management` (4.9) action. The hero spec treats it as a consumed `Menu` primitive (public API), not as hero-header-owned behavior. Disposition: **OUT of this carve-out, mocked.** Per the four-audit rule, an architectural finding spanning outside the carve-out is deferred — `tasks.md` §5 recommends 4.9 `test-list-item-management` claim it, rather than silently dropping it or stretching this carve-out to cover a delete-list flow.

**Alternatives considered:**

- *Pull `ListActionsMenu` into this carve-out.* Rejected — it would drag `deleteList`, `ConfirmDialog`, and the spoiler/preview toggle matrix (list-lifecycle concerns) into a hero-composition carve-out, and it is equally a `list-hero-collapse` collaborator. Cleaner to let 4.9 own it.
- *Pull `VisibilityPicker` in because the hero renders it.* Rejected — the spec explicitly delegates its composition to `list-visibility`; the hero owns placement only.

### Decision 3: `ListDetails` (async server component, no awaits) is tested via direct invocation.

`ListDetails` is declared `async` but performs no `await` (all data arrives via props). Per `test-app-frame` Decision 4, the reliable React-19 + RTL pattern for async components is:

```tsx
const tree = await ListDetails({ isOwner: true, list, owner_name, /* … */ });
render(tree);
```

The async resolves outside React's render cycle; the returned `ReactElement` renders synchronously into jsdom. The six out-of-carve-out children are `vi.mock`ed at the top of the file to inert stubs (`() => <div data-testid="…-stub" />`), with the `HeroCollapseShell` stub rendering `{children}` and surfacing `title`/`collapsedKebab` so the wrapper hand-off is assertable.

**Alternatives considered:**

- *`render(<ListDetails {...props} />)`.* Rejected — RTL stable does not transparently render an async component function; direct invocation is the established pattern.
- *Refactor `ListDetails` to a sync component + a thin async data shell.* Rejected — cross-file API change beyond the carve-out; the direct-invocation mock achieves the same coverage without churn.

### Decision 4: Build a reusable WCAG contrast helper under `test/helpers/`; the hero-contrast test reads colors from CSS.

`testing-foundation` requires shared helpers to live under `test/helpers/`. There is no existing luminance utility, so this carve-out creates `test/helpers/contrast.ts`:

- `parseColor(str)` — hex (`#rrggbb`, case-insensitive) and `rgba(r,g,b,a)` → `{ r, g, b, a }`.
- `relativeLuminance({r,g,b})` — the standard sRGB formula (linearize each channel, weight `0.2126/0.7152/0.0722`).
- `contrastRatio(fg, bg)` — `(Llighter + 0.05) / (Ldarker + 0.05)`.
- `compositeOver(rgba, opaqueBg)` — alpha compositing (`c = α·fg + (1−α)·bg`) so translucent text/fills are evaluated against the composited result, per the spec's R8 wording.

`hero-contrast.test.ts` reads the two CSS files, extracts the gradient stops (`#4a35c5`, `#7855f0`), `--light-color` (`#ffffff`), and the per-role colors, then for each hero text role composites (where translucent) over the **lightest** gradient stop (`#7855f0`, worst case) and asserts:

- `.list-hero-title` (`#fff`, 28px regular → large text) ≥ **3:1**.
- `.list-hero-subtitle` (`rgba(255,255,255,0.92)`, normal) ≥ **4.5:1**.
- `.list-hero-identity-foot` (`rgba(255,255,255,0.85)`, normal) ≥ **4.5:1**.
- `.list-hero-eyebrow` (`#fff` text over its own `rgba(255,255,255,0.17)` fill, which is itself over the gradient; normal) ≥ **4.5:1**.

This is the literal "including contrast invariants" deliverable and matches R8's "computed via the standard sRGB relative-luminance formula … worst-case (lightest) pixel … composited result."

**Alternatives considered:**

- *Hard-code the color values as fixtures in the test.* Rejected — the test would pass forever even if someone lightened the gradient in CSS; reading from CSS makes it a real regression guard.
- *Run a Playwright test that reads computed styles / rasterizes the gradient.* Rejected — out of scope for a unit-test carve-out; the pixel-exact gradient evaluation is e2e/visual-regression territory (6.x). The worst-case-lightest-stop approximation is the conservative, browserless check the spec's "lightest pixel" wording sanctions.
- *Pull in an npm contrast library (e.g. `wcag-contrast`).* Rejected — adds a dependency for ~50 lines of well-specified math; the hand-written helper is testable against WCAG reference pairs and reusable.

### Decision 5: The CSS parser is tolerant and self-tested.

`hero-contrast.test.ts` parses CSS text, which couples it to formatting. Mitigations: the parser is case-insensitive on hex, whitespace-insensitive, and accepts both `rgb()`/`rgba()`; it locates values by CSS custom-property name (`--hero-gradient`, `--light-color`) and by selector + property (`.list-hero-title { … color: … }`) rather than by line number. If a value cannot be located, the helper throws a **named** error (`Could not find --hero-gradient in global.css`) so a formatting change fails loudly rather than as a silent false-pass. The `parseColor`/`compositeOver` paths are covered by `contrast.test.ts`.

### Decision 6: Fix the nested/empty `.list-hero-share-wrapper` in-place; lock it with a MODIFIED spec scenario.

Source at HEAD (`ListDetails.tsx`):

```tsx
// ownerControls is ITSELF a .list-hero-share-wrapper (or null for viewers)
let ownerControls = showOwnerControls ? (
  <div className="list-hero-share-wrapper">
    <VisibilityPicker … /> {visibility !== OWNER && <ShareButton … />}
  </div>
) : null;
// …then, unconditionally inside identity-top:
<div className="list-hero-share-wrapper">{ownerControls}</div>
```

This double-wraps for owners and emits an **empty** `.list-hero-share-wrapper` for viewers/preview — contradicting the spec's "picker hidden on viewer" intent (a stray empty grid container still occupies the identity-top). The first test draft would assert the empty wrapper (locking a bug); the assertion-substance audit flags it. Disposition: **refactor-in-place** — render `ownerControls` directly (it already carries the wrapper), so the wrapper appears once for owners and not at all for viewers. The spec's visibility-picker-placement requirement is MODIFIED to add a scenario asserting the wrapper element is absent on viewer/preview views, making the corrected behavior normative.

**Alternative considered:** *Keep the wrapper and assert `"header undefined"`-style against the empty node.* Rejected — same reasoning as `test-app-frame` Decision 6: the assertion-substance bar requires locking *correct* behavior, not a stray empty element no consumer relies on (`grep` confirms no CSS or JS targets a child-less `.list-hero-share-wrapper`).

### Decision 7: Layout-only requirements are not unit-tested; DOM structure + contrast are the proxy.

R1 (single continuous gradient panel; ≥800px side-by-side, <800px stacked + hairline divider), the identity-card `space-between` height-matching, and the divider geometry are **CSS layout** contracts. jsdom computes no layout, so these are not unit-testable. The carve-out asserts the testable substrate: the elements exist (`.list-hero-grid`, both cards, `.list-hero-divider`), carry the right classes, and render in the right DOM order and viewer-class composition. The contrast test covers the color half of R8. Full layout (the gradient-continuity and side-by-side behavior) is e2e (6.x).

This mirrors `test-app-frame` Decision 9 (R4/R5 token CSS not unit-tested). The R1 prose's `≥800px / <800px` boundary is slightly off versus the CSS `@media (max-width: 800px)` (at exactly 800px the source stacks), but the spec's scenarios use `≥1024px` / `≤480px` and never hit the boundary; reconciling the prose is not unit-testable and is left for a layout/e2e pass.

### Decision 8: The occasion-without-subtitle eyebrow divergence is flagged, not fixed.

The spec says the occasion eyebrow renders "standalone above the title when no subtitle exists." The source renders the eyebrow ONLY inside the `subtitle`-gated `.list-hero-eyebrow-subtitle-wrapper`, so a list with a non-empty `occasion` but an empty `subtitle` shows **no** eyebrow — a genuine source/spec divergence. Fixing it changes eyebrow placement (a layout + `list-visibility`-adjacent concern) and warrants a deliberate, focused change rather than scope-creep inside a test carve-out. Disposition: the invariant-elevation audit **records the divergence** and `tasks.md` §5 recommends a follow-up; the `ListDetails` test documents the current behavior (asserts no eyebrow in the occasion-only case) **without** asserting it as correct, and adds a `// divergence: see tasks.md §5` note so the test is not mistaken for locking the bug.

**Alternative considered:** *Fix it in-place like the share-wrapper.* Rejected — the share-wrapper fix is a pure DOM cleanup with no visual-placement decision; the eyebrow fix requires deciding where a standalone eyebrow sits relative to the title and how it composes with the visibility cluster — a design call beyond this carve-out's testability mandate.

## Risks / Trade-offs

- **Six child mocks in `ListDetails.test.tsx`.** → Mitigation: one `vi.mock` per child at file top; if a future hero-collapse test (4.8) needs the same stubs, extract to `test/helpers/`. The §5 duplication audit records the call. The mock surface is broad but each stub is 1–3 lines.
- **The nested-share-wrapper fix is a source change.** → It corrects a spec-conformance bug; direction is source-follows-spec, locked by the new viewer-composition assertion and the MODIFIED scenario. No consumer depends on the empty node (grep-confirmed).
- **`hero-contrast.test.ts` parses CSS text.** → Tolerant parser + named-error-on-miss (Decision 5); `contrast.test.ts` covers the math. A formatting change fails loudly, not silently.
- **The worst-case-lightest-stop contrast approximation is not pixel-exact.** → Accepted: R8's wording sanctions evaluating against the lightest pixel; the gradient's lightest stop (`#7855f0`) is that worst case for a two-stop linear gradient. Pixel-exact rasterization is e2e (6.x).
- **`ShareButton`'s `navigator.share`/`navigator.clipboard` stubbing.** → Stub on the jsdom `navigator` via `Object.defineProperty(..., { configurable: true })`, reset in `afterEach`; the `AbortError`-swallow and non-abort-error-toast branches are exercised by making the stub reject with each error shape.
- **`ListActionsMenu` is left unowned.** → Accepted + flagged: `tasks.md` §5 recommends 4.9 claim it. Deferring (not dropping) is the sanctioned disposition for an out-of-carve-out architectural finding.
- **The occasion-without-subtitle divergence is left unfixed.** → Flagged in §5 with a recommended follow-up; the test documents-without-locking the current behavior so a reviewer is not misled.
- **Cognitive-complexity promotion locks the ceiling at 15 for `ShareButton.tsx`** (the branchiest file, ~8–10 at HEAD). → Accepted: comfortable buffer; a future overrun escape-valves to "extract a helper."

## Open Questions

- **Should `ListActionsMenu` be added to the parent `tasks.md` as an explicit sub-proposal/checkbox, or folded into 4.9's "item-management UI"?** This carve-out recommends folding into 4.9 and flags it in §5, but the parent-change owner may prefer an explicit line. (Does not block this sub-proposal.)
- **Should the occasion-without-subtitle eyebrow divergence (Decision 8) become its own micro-change, or ride along with a future hero layout pass?** Flagged for the owner; out of scope here.
