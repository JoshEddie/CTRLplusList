## Context

Sub-proposal 4.4 of the `test-coverage` initiative (GitHub issue #43) — a capability-flow carve-out for `item-store-links`. The foundation work (1.1 spike, 1.2 foundation, 0.1 housekeeping, 2.1 pure-libs), all six primitive-family carve-outs (3.1–3.6), the misc primitives (3.8), and the first capability flow (4.1 `test-app-frame`) are archived. The `testing-foundation` capability is established and hardened: `__tests__/` colocation is the convention, the universal per-file floor is `lines:98 / statements:98 / branches:95 / functions:100` referenced from a single `COVERAGE_FLOOR` constant in `vitest.config.ts`, and the four-audit + invariant-elevation obligations are stable.

The carve-out is a single client component:

| File | LOC | Char | Tested how |
|---|---|---|---|
| `app/(main)/items/ui/components/StoreLinks.tsx` | 184 | `'use client'`. Receives `item: ItemDisplay` (+ `showStores?`, `children?`). Computes `validStores` (filter on `name && link && numeric price`) → `sortedStores` (price ascending) → `lowestPrice` (= `primary`). When no valid store, early-returns `children` in `.item-action-row` or `null`. Otherwise renders `.item-price-row` (lowest `$X.XX`) and, when `showStores`, the `.storeLinks` block: a primary `<LinkButton variant="primary">` buy-link plus, when ≥2 valid stores, a `.storeLinks-more-anchor` containing a `<Button variant="ghost">` `+N` trigger and a `<Menu>` popover of all stores. State: `useState(open)`, `useState(placement)`, `useRef(triggerRef)`, `useRef(collapseTimer)`. Hover open/close with a 220 ms grace (`cancelCollapseAndOpen` / `scheduleCollapse`). `computePlacement` walks scroll-clipping ancestors and picks `above`/`below`. Both the buy-link `onClick` and the `+N` `onClick` call `e.stopPropagation()`. | jsdom + RTL + userEvent; `<Menu>` / `<LinkButton>` / `<Button>` rendered through the real (already-tested) primitives; `getBoundingClientRect` + `getComputedStyle` stubbed for `computePlacement`; `vi.useFakeTimers()` for the hover grace |

"Associated reads" per the parent §4.4 line resolve to **none** — `StoreLinks` reads no server data; `item.stores` is populated by item reads owned by the items-browser-chrome (4.5) and list-item-management (4.9) flows. This carve-out is UI-only, single-file.

Coverage floor: universal `COVERAGE_FLOOR` per `test-housekeeping` (98 / 98 / 95 / 100). The per-file threshold is added by-name in `vitest.config.ts`, referencing the constant.

Bound by:

- `testing-foundation` — `__tests__/` colocation, universal `COVERAGE_FLOOR`, no-backdoor rule, four-gate pre-merge, four-audit + invariant-elevation obligations, assertion-substance bar, complexity ≤ 15, `<State>_<Behavior>` shape, three-role `describe()`, observable-behavior-over-execution.
- `item-store-links` (active) — owns ~11 requirements; this carve-out MODIFIES the placeholder Purpose, ADDS three requirements (Decisions 4a/4b/4c), and LOCKS the two JS-testable existing requirements (`+N` `<Menu>` popover; hover-open). CSS-anatomy requirements are untouched and out of carve-out.
- `menu-system`, `button-system` (active) — the `<Menu>`/`<MenuLinkItem>`/`<LinkButton>`/`<Button>` primitives are already tested under their own carve-outs; rendered through, not mocked. No primitive SHALL is asserted directly.

## Goals / Non-Goals

**Goals:**

- Land one colocated test file (`app/(main)/items/ui/components/__tests__/StoreLinks.test.tsx`, jsdom) at the universal `COVERAGE_FLOOR`.
- Exercise every observable branch of `StoreLinks.tsx` — store-validity filtering, ascending sort, primary/price selection, empty-state fallback (children / null), `showStores` gate, single-vs-multi store, the `+N` `<Menu>` popover (open/close/toggle, all stores incl. primary, prices, `target`/`rel`, row order), hover open/close with the 220 ms grace + cancel, `computePlacement` (`above`/`below`), and click-isolation.
- Promote `sonarjs/cognitive-complexity` from `warn` to `error` for `StoreLinks.tsx` via an `eslint.config.mjs` per-file override.
- MODIFY the `item-store-links` spec's placeholder Purpose into a real one.
- ADD three call-time SHALLs to the `item-store-links` spec (store-validity predicate; empty-state fallback; click-isolation).
- Complete the four-audit obligation + the invariant-elevation audit, recording dispositions in `tasks.md`.

**Non-Goals:**

- No source refactor anticipated. Both testability attention points (jsdom has no layout; the hover-grace timer) are handled in-test.
- No coverage of `Item.tsx` — the shared row/card that renders `<StoreLinks>` is owned by 4.5 / 4.9.
- No coverage of `store-links.css` / `item.css` — CSS is not in the JS coverage report. The grid-anatomy / breakpoint-reflow / corner-radius / choose-items-reuse requirements of the `item-store-links` spec are CSS contracts owned by 4.5 / 4.9 and verified by code review (and the reflow behaviors by e2e in 6.x). This carve-out asserts the JS contracts only; where a JS proxy exists for a CSS contract (e.g. the `has-extras` class as the proxy for the single-line two-column grid), the test asserts the class, not the computed layout.
- No DAL/action coverage — there are no store-specific reads.
- No DOM-snapshot tests. Every assertion names a specific attribute, class string, accessible name, rendered text, anchor `href`/`target`/`rel`, spy call argument, or popover row count/order.
- No assertion on the `<Menu>` primitive's internals (focus management, arrow-key nav, `preventScroll`) — those are owned by `test-menu-system`. This carve-out asserts only that `StoreLinks` mounts the popover with the right rows when open and unmounts it when closed.

## Decisions

### Decision 1: One `.test.tsx` for the one executable source file, under `__tests__/` mirroring the source layout.

The carve-out is a single file. Its test lives at `app/(main)/items/ui/components/__tests__/StoreLinks.test.tsx` — the first `__tests__/` directory under `app/(main)/items/ui/components/`, per the `test-housekeeping` colocation convention.

**Alternatives considered:**

- *Co-test `StoreLinks` together with `Item.tsx` in one file.* Rejected — `Item.tsx` is out of carve-out (owned by 4.5 / 4.9). Per-source-file coverage attribution and the single-file threshold entry require the test to target `StoreLinks.tsx` alone.
- *Place the test flat next to the source (`StoreLinks.test.tsx`).* Rejected — `test-housekeeping` moved the repo to `__tests__/` directories; flat colocation is the superseded convention.

### Decision 2: Primitives (`<Menu>`, `<MenuLinkItem>`, `<LinkButton>`, `<Button>`) are rendered through, NOT mocked.

`StoreLinks` composes four already-tested primitives. The `testing-foundation` prohibits mocking internal application modules; these are internal UI primitives with no network boundary, and each is covered at the floor by its own archived carve-out. Rendering through them asserts the real integration: that the primary buy-link is an `<a>` with the right `href`/`target`/`rel`, that the `+N` trigger is a `<button>` with the right aria wiring, and that the `<Menu>` mounts the `<MenuLinkItem>` rows when open. The `<Menu>` returns `null` when closed (verified in `test-menu-system`), so popover-content assertions are gated on the open state.

**Alternatives considered:**

- *Mock `<Menu>` to a passthrough that always renders children.* Rejected — would lose the open/closed mount contract (the most load-bearing behavior of the `+N` interaction) and would violate the no-internal-mock rule.
- *Mock `<LinkButton>` / `<Button>` to bare `<a>` / `<button>`.* Rejected — the real primitives map `variant`/`className` to the rendered class; asserting through them locks the integration the same way `test-app-frame`'s `Nav.test.tsx` renders real `<LinkButton>`s.

### Decision 3: `computePlacement` is exercised by stubbing `getBoundingClientRect` and `getComputedStyle`; the hover grace uses fake timers.

jsdom implements neither layout nor scroll geometry: `Element.prototype.getBoundingClientRect()` returns an all-zero `DOMRect`, and `window.getComputedStyle(el).overflowY` returns `'visible'` for everything. `computePlacement` reads both. To drive its two non-trivial branches — the scroll-clipping-ancestor walk (`while (el && el !== document.body)` with the `overflowY ∈ {auto, scroll, hidden}` check) and the placement ternary (`roomAbove >= panelHeight || roomAbove >= roomBelow ? 'above' : 'below'`) — the test stubs both APIs:

```ts
vi.spyOn(window, 'getComputedStyle').mockImplementation(
  (el) => ({ overflowY: clippingAncestors.has(el) ? 'auto' : 'visible' }) as CSSStyleDeclaration,
);
vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
  return rectFor(this); // per-element rect from a test-controlled map
});
```

- **`'above'` (default) path:** with no stub overriding geometry (all-zero rects, `'visible'` overflow), `containerTop = 0`, `containerBottom = window.innerHeight`, `roomAbove = 0`, and `panelHeight > 0`, so `0 >= panelHeight` is false but `0 >= roomBelow` (`0 >= innerHeight`) is also false → resolves `'below'`? No — the fallback is `roomAbove >= roomBelow`; with both `0`, `0 >= 0` is **true** → `'above'`. So the un-stubbed default deterministically yields `placement-above`.
- **`'below'` flip path:** stub a clipping ancestor whose rect leaves little room above the trigger and ample room below (`roomAbove < panelHeight` AND `roomAbove < roomBelow`) → resolves `'below'`. This locks the existing spec scenario "Popover flips below for top-row items with insufficient room above."

The 220 ms hover grace (`COLLAPSE_DELAY_MS`) is deferred via `setTimeout`. The test uses `vi.useFakeTimers()` and `vi.advanceTimersByTime(220)` to fire the close deterministically, and asserts the cancel path by dispatching `mouseenter` before advancing (the `clearTimeout` in `cancelCollapseAndOpen`). `afterEach` restores real timers and the geometry spies.

**Alternatives considered:**

- *Skip the `'below'` branch and accept a `/* v8 ignore */` on the flip.* Rejected — the flip is a real spec scenario; the no-backdoor rule prefers the test over the ignore, and stubbing geometry is a well-trodden jsdom pattern (precedent: the `<Menu>` placement tests under `test-menu-system`).
- *Use real timers with `await waitFor(...)` for the hover close.* Rejected — couples the test to a 220 ms wall-clock wait and is flaky; fake timers are deterministic and instant.

### Decision 4: MODIFY the placeholder Purpose; ADD three call-time SHALLs to `item-store-links`. Leave all existing requirements' scenarios unchanged.

The invariant-elevation audit (per `testing-foundation`) gates each invariant the tests assert against the three-part criteria (non-obvious / survives reimplementation / protects real failure mode). Reading `StoreLinks.tsx` at HEAD surfaces three load-bearing behaviors the spec does not currently lock, plus the placeholder Purpose the spec explicitly invites updating.

The Purpose update is applied as a **direct edit to the active spec's `## Purpose` section at apply time** (it is not a `### Requirement:` block, so it is not expressible as a Requirement delta op; the `specs/item-store-links/spec.md` delta file carries only the three ADDED requirements). This is recorded in `tasks.md` §Apply.

#### Decision 4a (ADDED): store-validity predicate.

Source:

```ts
const validStores = useMemo(
  () => stores.filter((s) => s?.name && s?.link && !Number.isNaN(Number(s.price))),
  [stores],
);
```

The spec uses the phrase "valid store" throughout (the `+N` requirement says "one `<MenuLinkItem>` per valid store on the item — including the primary") but never DEFINES validity. The predicate is the gate that decides what renders at all: a store missing `name`, missing `link`, or with a non-numeric `price` (`Number(s.price)` is `NaN`) is dropped from both the primary selection and the popover. Non-obvious (a reader would not infer the exact three-part predicate from the rendered output), survives reimplementation (any rewrite of the filter must preserve all three clauses or it changes what renders), protects a real failure mode (a broken-data store with a `null`/`""` price would otherwise render a `$NaN` chip or a dead buy-link). Elevated.

#### Decision 4b (ADDED): empty-state fallback.

Source:

```ts
if (!lowestPrice) {
  return children ? <div className="item-action-row">{children}</div> : null;
}
```

When no valid store survives, `StoreLinks` does NOT render the price row or any chip. Instead it renders its `children` (the claim/purchase affordance that `Item.tsx` passes through) wrapped in a `.item-action-row`, or `null` when no children are supplied. This contract keeps the "Claim this gift" / purchase button visible for store-less items — without it, a gift with no buy-link would lose its claim affordance entirely. Non-obvious (the `children`-in-`.item-action-row` wrapper vs `null` is a two-branch fallback a reader would miss), survives reimplementation, protects a real failure mode (losing the claim affordance on store-less items). Elevated.

#### Decision 4c (ADDED): click-isolation.

Source: both the primary `<LinkButton onClick={(e) => e.stopPropagation()}>` and the `+N` `<Button onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}>` stop propagation. `StoreLinks` renders inside a clickable card/row (`Item.tsx` is wrapped in row-level click handlers for selection / navigation in several surfaces, and the choose-items picker wraps each row in a selecting `<label>`). Without `stopPropagation`, clicking a buy-link or toggling the popover would ALSO trigger the row's selection / navigation. The `item-store-links` spec's choose-items requirement states this at the picker level ("clicking a chip SHALL open the store URL ... without toggling the row's selection state") but no requirement locks it as a `StoreLinks`-level contract. Non-obvious, survives reimplementation (a rewrite that drops `stopPropagation` reintroduces the bug across every surface), protects a real failure mode (clicking "buy" also selects/navigates the row). Elevated as a component-level SHALL.

**Alternatives considered for Decision 4:**

- *Leave the Purpose as "TBD".* Rejected — the placeholder explicitly says "Update Purpose after archive"; this carve-out is the natural point, and a real Purpose aids future readers.
- *Fold all three ADDED invariants into one "StoreLinks rendering contract" requirement.* Rejected — they protect three independent failure modes (bad data → bad chip; no data → lost affordance; click bubbling → wrong row action) and read more clearly as three requirements with their own scenarios.
- *ADD a requirement for the placement heuristic itself.* Rejected — the existing spec already covers placement ("opens upward when room", "flips below for top-row items"); the tests LOCK those existing scenarios rather than ADD a duplicate.

## Risks / Trade-offs

- **jsdom has no layout engine** → Mitigation: stub `Element.prototype.getBoundingClientRect` and `window.getComputedStyle` (Decision 3) to drive `computePlacement`'s ancestor walk and placement ternary through both `'above'` and `'below'`; reset in `afterEach`. If a stub leaks across tests, the failure is loud (wrong placement class) and named.
- **The 220 ms hover-grace timer** → Mitigation: `vi.useFakeTimers()` + `vi.advanceTimersByTime(220)`; assert the cancel path by re-entering before advancing. `afterEach` restores real timers.
- **The `<Menu>` primitive is rendered un-mocked and attaches `document` `mousedown`/`keydown` listeners while open** → Mitigation: this is the intended integration target (precedent: `test-menu-system`). Assertions are on the popover's mount/unmount and the rendered `<MenuLinkItem>` anchors, not on `menu-system` internals. RTL `cleanup` (registered in `test/helpers/setup.ts`) unmounts between tests, detaching the listeners.
- **`computePlacement` resolves `'above'` for the all-zero-rect default** → Accepted and locked: the `roomAbove >= roomBelow` fallback with both values `0` yields `'above'`, which matches the user-stated default ("cover the item"). The test asserts this deterministically rather than treating it as incidental.
- **The store-validity predicate is a behavioral claim worth defending** → A future contributor relaxing `!Number.isNaN(Number(s.price))` (e.g. to allow `null`/`""` prices) changes what renders. The ADDED SHALL (Decision 4a) + the validity tests name the regression specifically; the `test` gate fails loudly.
- **Cognitive-complexity promotion locks `StoreLinks.tsx` at the ≤15 ceiling** → Accepted: measured complexity at HEAD is expected comfortably under 15 (the `computePlacement` ancestor walk is the peak). If a future change pushes it over, the escape valve is "extract a helper."
- **Single-file carve-out, no shared fixture** → Accepted: the `ItemDisplay`-with-stores builder stays inline as a local `makeItem(stores)` helper. Extraction to `test/fixtures/` is deferred until a second consumer needs the same builder (recorded in the §duplication audit).
