## Context

Sub-proposal 3.4 of the `test-coverage` initiative. The `testing-foundation` capability is established and hardened by `test-housekeeping`: `__tests__/` colocation is the convention, the universal per-file floor is `lines:98 / statements:98 / branches:95 / functions:100` referenced from a single `COVERAGE_FLOOR` constant in `vitest.config.ts`, the no-backdoor disposition rule is in effect, and `test-button-system` (3.1) + `test-chip-system` (3.2) + `test-form-field-system` (3.3) proved the foundation works against primitive families of widely varying size. This is the fourth primitive carve-out — the menu family — medium-sized at five executable files with one heavy file (`Menu.tsx`) carrying document-level event-listener and focus-management logic.

Like `test-form-field-system`, this carve-out elevates against an **already-existing** spec (`menu-system`, created by archiving `standardize-menus-and-controls`). No new capability spec is created. The spec edits here are ADDITIVE: four new requirements that lock call-time invariants the source enforces today but the spec does not state explicitly.

Carve-out (per parent `test-coverage` tasks.md §3.4):

| File | LOC | Char | Tested how |
|---|---|---|---|
| `app/ui/components/menu/Menu.tsx` | 118 | `forwardRef` + `useImperativeHandle`; controlled popover (`open: boolean` → `null` when false, `<div role="menu" class="menu-popover">` when true); two `useEffect` bodies — (a) document `mousedown` + `keydown` for outside-click + Escape dismissal, ignoring clicks on the anchor; (b) container `keydown` for arrow / Home / End navigation across `[role^="menuitem"]:not([aria-disabled="true"])` with wrap, plus initial-focus `{ preventScroll: true }` on first non-disabled item | jsdom + RTL + `vi.spyOn` on `focus`, `addEventListener`, `removeEventListener`; `fireEvent.keyDown` / synthetic KeyboardEvent + dispatch on `document` |
| `app/ui/components/menu/MenuItem.tsx` | 29 | `forwardRef`; renders `<button type='button' role='menuitem'>` with class via `menuItemClasses({ tone, extra: className })`; `icon` then `children` in DOM order; pass-through of all standard `<button>` props | jsdom + RTL |
| `app/ui/components/menu/MenuLinkItem.tsx` | 31 | `forwardRef`; renders Next `<Link role='menuitem'>` with class via `menuItemClasses({ tone, extra: className })`; `icon` then `children` | jsdom + RTL + foundation's existing `next/link` mock |
| `app/ui/components/menu/MenuItemRadio.tsx` | 57 | `forwardRef`; renders `<button type='button' role='menuitemradio' aria-checked={checked}>`; `onClick?.(e); if (!e.defaultPrevented) onSelect();` selection gate; icon span (conditional), label span (always), description span (conditional), indicator span (always — text `'✓'` when checked, `''` when not) | jsdom + RTL + `vi.fn()` spies |
| `app/ui/components/menu/menuClasses.ts` | 13 | `menuItemClasses({ tone = 'default', extra })` → `['menu-item', tone === 'danger' && 'tone-danger', extra].filter(Boolean).join(' ')` | Pure node — `.test.ts` under the node project |
| `app/ui/components/menu/types.ts` | 1 | Type-only (`MenuItemTone = 'default' \| 'danger'`) | Excluded by zero-runtime-content |
| `app/ui/components/menu/index.ts` | 6 | Re-exports | Excluded by existing `app/ui/components/*/index.ts` glob |
| `app/ui/components/menu/menu.css` | 127 | CSS — not part of JS coverage | Not part of this carve-out's coverage gate |

Coverage floor: universal `COVERAGE_FLOOR` per `test-housekeeping` (98 / 98 / 95 / 100). Per-file thresholds are added by-name in `vitest.config.ts`, referencing the constant.

Bound by:
- `testing-foundation` — `__tests__/` colocation, universal `COVERAGE_FLOOR`, no-backdoor rule, four-gate pre-merge, four-audit + invariant-elevation obligations, assertion-substance bar, complexity ≤ 15, `<State>_<Behavior>` shape, three-role `describe()`, observable-behavior-over-execution.
- `menu-system` (active) — owns every existing menu SHALL. This sub-proposal ADDS four SHALLs (Decisions 3a/3b/3c/3d below). No requirements are removed; no behavior is changed.

## Goals / Non-Goals

**Goals:**

- Land five colocated test files (four jsdom + one node) at the universal `COVERAGE_FLOOR`.
- Exercise every observable branch of every file — no execute-for-coverage renders, no tautological assertions, no snapshot-only tests.
- Promote `sonarjs/cognitive-complexity` from `warn` to `error` for all five files via `eslint.config.mjs` per-file overrides.
- Add four call-time SHALLs to the `menu-system` spec (Menu outside-click anchor-ignore; Menu initial-focus `preventScroll: true`; MenuItemRadio onClick→defaultPrevented gate; menuItemClasses composer contract).
- Complete the four-audit obligation (duplication / complexity / testability on source; assertion audit on the new tests) AND the invariant-elevation audit, recording dispositions in `tasks.md`.

**Non-Goals:**

- No source refactors anticipated. Every branch in every file is observable from rendered DOM, callback shape, spied side effects (`focus`, `addEventListener`, `removeEventListener`), or composed class string. If an audit finding requires source change, it's recorded in `tasks.md` with disposition.
- No coverage of `index.ts` (excluded by the existing `app/ui/components/*/index.ts` glob), `types.ts` (no runtime content), or `menu.css` (not JS).
- No new tone, no new sibling primitive, no new menu row kind.
- No e2e. Component-level integration belongs to capability-flow sub-proposals (4.1, 4.6, 4.9, 4.11, etc.).
- No real upstream network call. None of the five files touch network.
- No DOM-snapshot tests. Every assertion names a specific attribute, class string, accessible name, callback shape, rendered text content, or spied call argument.
- No real Next router needed for `MenuLinkItem` beyond the foundation's existing `next/link` mock that renders `<a>` with the forwarded props.

## Decisions

### Decision 1: One `.test.tsx` per executable component file + one `.test.ts` for the pure helper; no per-component sub-directory.

The carve-out has four `.tsx` (all render JSX) and one `.ts` (pure function). Every `.tsx` belongs in the jsdom project; the `.ts` belongs in the node project. Each test file is colocated as `app/ui/components/menu/__tests__/<Component>.test.{tsx,ts}` per the `test-housekeeping` `__tests__/` convention.

**Alternatives considered:**

- *One mega `menu.test.tsx` covering all five.* Rejected — destroys per-source-file coverage attribution and degrades failure output. Same reasoning as test-form-field-system Decision 1.
- *Split `Menu.test.tsx` into multiple files (`Menu.lifecycle.test.tsx`, `Menu.keyboard.test.tsx`).* Rejected — the file-per-source convention is clearer. If `Menu.test.tsx` grows beyond ~30 cases, revisit as a §7.3 testability finding.
- *Per-component sub-directory `app/ui/components/menu/<Component>/Component.tsx` + `__tests__/`.* Rejected — would require moving every source file. The carve-out is "test the family," not "restructure the family". Source restructure is out of scope.

### Decision 2: Use the foundation's existing `next/link` mock for `MenuLinkItem`; do NOT add a new mock.

`test-button-system` established a `next/link` mock under `test/helpers/` (verified at `test/helpers/setup.ts` — the foundation registers a `vi.mock('next/link', …)` that renders `<a>` with the forwarded `href`, `role`, `className`, `ref`). `MenuLinkItem` uses `next/link` identically to `LinkButton` from `button-system`, so reusing the foundation's mock means:

- The rendered element is `<a role="menuitem" class="menu-item …" href="…">`.
- `ref` forwarding lands on the `<a>` (the mock forwards `ref` to the underlying anchor).
- `icon` and `children` render as descendants of the `<a>`.

No new mock added. The test imports `MenuLinkItem` directly and renders it; the foundation's auto-applied mock handles `next/link` transparently.

**Alternative considered:** *Write an inline `vi.mock('next/link', …)` in `MenuLinkItem.test.tsx` for tightness.* Rejected — the foundation's global mock is the one source of truth; per-test mocks of the same module risk drift.

### Decision 3: ADD four call-time SHALLs to `menu-system` that the new tests lock against.

The invariant-elevation audit (per `testing-foundation`) gates each invariant the tests assert against three-part criteria (non-obvious / survives reimplementation / protects real failure mode). Four invariants pass the gate and are not yet stated in the spec.

#### Decision 3a: `<Menu>` outside-click handler SHALL ignore clicks on the configured `anchorRef.current`.

The source at HEAD:

```tsx
const onPointer = (e: MouseEvent) => {
  const target = e.target as Node;
  if (localRef.current?.contains(target)) return;
  if (anchorRef?.current?.contains(target)) return;
  dismiss();
};
```

The contract is: a click on the popover itself is ignored (already documented in the existing "Menu closes on outside click" scenario by negation), AND a click on the anchor (the trigger element) is also ignored. The second branch is the dismiss-then-reopen guard: without it, clicking the trigger would call `onClose` (closing the menu), and then the trigger's own `onClick` would call `setOpen(true)` (reopening it), producing a flicker / no-op. The existing scenario only states "user clicks outside the menu container"; it does not address the anchor specifically. This is non-obvious (the existing spec implies "outside the menu container" includes the anchor), survives reimplementation (any rewrite that drops the second `return` would re-introduce the flicker), and protects a real failure mode (the entire control loop of the trigger). Elevated.

The test path constructs a click `MouseEvent` whose `target` is set to the anchor element (via `Object.defineProperty(event, 'target', { value: anchorElement })` or by attaching the anchor to the DOM and clicking it through RTL). Two scenarios: (a) click on anchor while open → `onClose` NOT called; (b) click on truly-outside element (e.g., document body) → `onClose` IS called.

#### Decision 3b: `<Menu>` SHALL focus the first non-disabled item on open with `{ preventScroll: true }`.

The source at HEAD:

```tsx
// Focus the first item on open so arrow keys are immediately useful
// and the menu is operable by keyboard from the moment it appears.
// `preventScroll: true` is critical — without it, a menu opening
// offscreen (e.g. hover-opened upward when the trigger is near the
// top of a scrollable container) yanks the page to bring the focused
// item into view, shifting the trigger out from under the cursor.
const items = getItems();
items[0]?.focus({ preventScroll: true });
```

The contract is: the first non-disabled menu item receives focus on open, AND the focus call passes `{ preventScroll: true }`. The existing arrow-key navigation requirement implies initial focus is on the first item (otherwise arrow keys would have nothing to compare against), but it does not state `preventScroll`. The inline comment is explicit about why: it's a page-jump safety. This is non-obvious (the spec doesn't mention it), survives reimplementation (any rewrite that drops the option silently re-introduces the page-jump under hover-opened-upward menus), and protects a real failure mode (the trigger shifting out from under the cursor when the menu opens above the fold). Elevated.

The test path spies on `HTMLElement.prototype.focus` (via `vi.spyOn`) before rendering the menu, then asserts the spy was called on the first non-disabled item with the argument `{ preventScroll: true }`. The spy is restored in `afterEach`.

#### Decision 3c: `<MenuItemRadio>` SHALL invoke the consumer's `onClick` first and SHALL invoke `onSelect` only when `e.defaultPrevented` is false.

The source at HEAD:

```tsx
onClick={(e) => {
  onClick?.(e);
  if (!e.defaultPrevented) onSelect();
}}
```

The contract is: when the consumer passes both `onClick` and `onSelect`, `onClick` runs first; if `onClick` calls `e.preventDefault()` (or the event arrives with `defaultPrevented === true`), `onSelect` is NOT called; otherwise `onSelect` runs. When no `onClick` prop is provided, the optional chain short-circuits and `defaultPrevented` stays false, so `onSelect` runs unconditionally — this is the no-cancel happy path. The existing spec scenario "MenuItemRadio renders a selectable radio row" says "activating it invokes `fn`" referring to `onSelect`, but does NOT explain how `onClick` interacts. This is non-obvious (the cancel pattern is a real React pattern but not universal), survives reimplementation (a rewrite that calls `onSelect` first or drops the `defaultPrevented` check would silently break consumers that rely on the cancel hook), and protects a real failure mode (selection happening despite the consumer's `e.preventDefault()` from inside `onClick`). Elevated.

The test path covers four discrete cases: (a) no `onClick`, click → `onSelect` called once; (b) `onClick` provided that does NOT prevent default, click → both called, `onClick` before `onSelect`; (c) `onClick` provided that DOES `e.preventDefault()`, click → `onClick` called, `onSelect` NOT called; (d) `onClick` provided that throws → behavior undefined and out of scope (no assertion; the test would crash, which is the expected outcome).

#### Decision 3d: `menuItemClasses({ tone, extra })` SHALL compose the wrapper class string in fixed order: `'menu-item'`, then `'tone-danger'` (when `tone === 'danger'`), then `extra` (when truthy), space-joined with falsy filtered.

The source at HEAD:

```tsx
return ['menu-item', tone === 'danger' && 'tone-danger', extra].filter(Boolean).join(' ');
```

The contract is: a stable token order so that both `MenuItem` and `MenuLinkItem` produce class strings that match each other exactly when given the same `tone` and `className` inputs. The existing "MenuLinkItem and MenuItem are visually identical" scenario asserts visual equivalence but does NOT assert the class-string-level equivalence the source guarantees. This is non-obvious (the spec describes the visual outcome, not the mechanism), survives reimplementation (a rewrite that conditionally rearranges the order — e.g., `extra` first when `tone === 'default'` — would silently break stable expectations), and protects a real failure mode (CSS selectors like `.menu-item.tone-danger` rely on the both-classes-present semantic; any composition that breaks the join order is a layout regression risk). Elevated.

The test path is the pure-function test file `menuClasses.test.ts`: every input combination of `{ tone, extra }` is asserted against an exact output string.

**Alternatives considered:**

- *Defer 3a/3b/3c/3d to a follow-up sub-proposal `harden-menu-spec`.* Rejected — the invariant-elevation audit IS part of this sub-proposal per `testing-foundation`. Deferring breaks the audit obligation.
- *Add only 3a and 3b; leave 3c and 3d implicit.* Rejected — 3c locks a subtle React cancel pattern that is easy to break; 3d locks the shared composer's contract so the two row primitives stay in lockstep. Both are smaller-than-3a-or-3b but the smallest possible drift between source and spec.
- *Add 3b as part of the existing arrow-key navigation requirement instead of a new requirement.* Rejected — the existing requirement is about arrow-key navigation BETWEEN items once focus is established. Initial focus on open is a separate concern with a separate safety motivation (page-jump avoidance). Separate requirement keeps each one tight.

### Decision 4: `userEvent.keyboard` for in-container key tests; `document.dispatchEvent` for Escape and outside-click tests.

`testing-foundation`'s "observable behavior over execution" rule prefers user-facing event sequences. For arrow-key / Home / End navigation, `userEvent.keyboard('{ArrowDown}')` against the focused menu item is the right shape — it dispatches the keydown on the focused element, which bubbles up to the container's listener.

For Escape and outside-click, the source listens at the `document` level (`document.addEventListener('keydown', …)` / `mousedown`). The cleanest path is `document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))` and `document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))` with a `target` set on the event. Both are documented patterns; the test uses whichever matches the assertion scope.

The `preventScroll: true` assertion (Decision 3b) requires `vi.spyOn(HTMLElement.prototype, 'focus')` before render and asserting on the spy's first call's argument. This is a side-effect assertion, not an event assertion.

### Decision 5: Coverage gaps surface via the no-backdoor preference order; the per-file floor is not relaxed.

Per `test-housekeeping`'s no-backdoor rule. Each branch v8 flags as uncovered has three dispositions in order of preference:

- **(a) Write a test.** Default.
- **(b) Refactor the source** (within the carve-out) to remove the awkward branch.
- **(c) `/* v8 ignore next */` annotation with a one-line rationale comment** for the specific uncoverable region.

Lowering the per-file floor is NO LONGER acceptable. Each disposition (and which option was chosen) SHALL be recorded in `tasks.md`.

Expected attention points:

- `Menu.tsx` — the `if (!open) return` short-circuits in both `useEffect` bodies. Covered by re-rendering with `open={false}` after `open={true}` (the effect re-runs and the cleanup function is invoked; the new effect body returns immediately).
- `Menu.tsx` — the early-return guards `if (!container) return;` and `if (items.length === 0) return;` in the keyboard effect. Covered by rendering with no children (zero menu items) and dispatching an arrow key — the handler returns early.
- `Menu.tsx` — the `currentIndex <= 0 ? items.length - 1 : currentIndex - 1` ternary in the ArrowUp branch. Covered by ArrowUp from the first item (wraps to last) AND ArrowUp from the middle (goes to previous).
- `Menu.tsx` — the `active ? items.indexOf(active) : -1` ternary. Covered by rendering with focus initially outside the menu (e.g., on document.body) and dispatching ArrowDown — `currentIndex = -1`, so `currentIndex + 1 = 0`, focus moves to first item.
- `Menu.tsx` — the `anchorRef?.current?.focus()` optional chain. Two cases: (a) `anchorRef` provided with current element → focus called on it; (b) `anchorRef` undefined or `current` null → optional chain short-circuits, no focus call. Both covered.
- `MenuItemRadio.tsx` — `icon ? <span>{icon}</span> : null` (two branches) and `description ? <span>{description}</span> : null` (two branches). Each covered explicitly.
- `MenuItemRadio.tsx` — `checked ? '✓' : ''` ternary in the indicator. Both branches covered by `checked={true}` and `checked={false}` tests.
- `MenuItem.tsx` / `MenuLinkItem.tsx` — `type = 'button'` default + explicit override; `className` provided + omitted. Each covered.
- `menuClasses.ts` — the truth table is small (4 combinations of `tone × extra`); all covered.

No surprise branches anticipated. If v8 flags anything unexpected, the disposition path is recorded per the no-backdoor rule.

### Decision 6: A shared `__tests__/test-helpers.tsx` is allowed if duplication crosses three or more test files; otherwise inline.

Anticipated duplication patterns:

- "Render `<Menu open={true}>` with a few `<MenuItem>` children" — applies to several `Menu.test.tsx` sections (arrow-key, Home/End, skip-disabled, initial-focus). Internal to `Menu.test.tsx`; stays as a local helper inside that file, not extracted to a shared module.
- "Render a single `<MenuItem>` / `<MenuLinkItem>` / `<MenuItemRadio>` and grab the button" — applies to the three row-component test files (3 use sites). Extraction threshold (≥3 uses) met IF the harness is non-trivial. In practice, the shape is `render(<Component …/>); screen.getByRole(role)` — a one-liner. Stay inline.
- "Spy on `HTMLElement.prototype.focus` for the `preventScroll` assertion" — single use site (`Menu.test.tsx` initial-focus test). Stay inline.

If extracted, `test-helpers.tsx` lives at `app/ui/components/menu/__tests__/test-helpers.tsx` and is excluded from coverage via the existing `**/__tests__/**` glob in `vitest.config.ts`'s `coverage.exclude`. The §7.1 audit records the chosen disposition.

### Decision 7: The `useImperativeHandle` ref-forwarding test asserts on the `current` after mount, not via dispatching from a parent.

The source: `useImperativeHandle(ref, () => localRef.current as HTMLDivElement);`. The test uses `const ref = createRef<HTMLDivElement>(); render(<Menu ref={ref} open={true} …>…</Menu>); expect(ref.current).toBeInstanceOf(HTMLDivElement); expect(ref.current?.getAttribute('role')).toBe('menu');`. This asserts the forwarded ref points at the popover container after mount.

**Alternative considered:** `useImperativeHandle` with a getter function whose value depends on props. Rejected — the source uses the simple identity getter; testing the simpler form is sufficient. Any future change that adds a derived imperative API would update this test.

## Risks / Trade-offs

- **`Menu.tsx` is the most complex file in the carve-out by far.** Two `useEffect` bodies with cleanup functions, document-level event listeners, and `useImperativeHandle`. Risk: a flaky test under jsdom's event-loop timing. → Mitigation: `userEvent.keyboard` is synchronous in jsdom; `document.dispatchEvent` is synchronous; `act(…)` wraps any state-changing dispatch. No `await new Promise(setImmediate)` patterns needed. The §7.3 testability audit explicitly looks for any test that needs a timing workaround.
- **Spying on `HTMLElement.prototype.focus` for the `preventScroll` assertion is a global side effect.** Risk: leaking the spy into adjacent tests. → Mitigation: the spy is set inside `beforeEach` and restored in `afterEach` via `vi.restoreAllMocks()`. The existing `test/helpers/setup.ts` registers `cleanup()` after each test via `afterEach`; the spy restoration is independent and explicit.
- **`MenuItemRadio`'s `onClick → defaultPrevented → onSelect` gate is testable but easy to construct wrong.** Risk: an `onClick` mock that calls `e.preventDefault()` may still let `onSelect` fire if the test forgets that synthetic React events propagate to the onClick handler before `defaultPrevented` is checked. → Mitigation: the test reads `e.defaultPrevented` inside the mock onClick (returns it via the spy assertion) AND asserts the relative call order via `vi.fn().mock.invocationCallOrder`. Decision 3c documents this explicitly.
- **The `next/link` mock is owned by the foundation, not by this carve-out.** Risk: a future foundation change that alters the mock's API (e.g., drops `ref` forwarding) silently breaks `MenuLinkItem.test.tsx`. → Mitigation: the test asserts on `ref.current?.tagName === 'A'` and on `href` round-tripping; a foundation-mock regression fails by name. This is the same risk every other `LinkButton` / similar test carries.
- **Cognitive-complexity promotion locks the ceiling at 15 for five files.** Measured complexity at HEAD: `Menu.tsx` ~8–10 (driven by the keyboard handler's if/else-if ladder), the rest at 1–2. The ceiling is reachable for `Menu.tsx` if the keyboard handler grows. → Accepted: the ceiling is comfortably above current usage with buffer. If a future change pushes `Menu.tsx` over 15, the failure is "extract a helper" — the right escape valve.
- **The active `menu-system` spec lacks a clear "Purpose" paragraph (it's "TBD" from the archive moment).** This sub-proposal does NOT amend the Purpose — Purpose-rewrite is a docs concern out of scope here. Recorded as an observation; a future micro-change can fill it in.
- **The legacy CSS class removal requirement in `menu-system` ("ListActionsMenu and UserAvatarPopover migrate to the Menu primitive" → "Legacy menu CSS classes are removed") is a *historical* migration outcome.** This carve-out does NOT re-verify the migration; the requirement stands archived as satisfied. The `menu-trigger` exemption is preserved as documented (the `.menu-trigger` class in `app/(main)/lists/ui/styles/list.css` is a separate concern owned by `standardize-buttons` per the existing scenario).
