## Context

Sub-proposal 3.5 of the `test-coverage` initiative. The `testing-foundation` capability is established and hardened by `test-housekeeping`: `__tests__/` colocation is the convention, the universal per-file floor is `lines:98 / statements:98 / branches:95 / functions:100` referenced from a single `COVERAGE_FLOOR` constant in `vitest.config.ts`, the no-backdoor disposition rule is in effect, and `test-button-system` (3.1) + `test-chip-system` (3.2) + `test-form-field-system` (3.3) + `test-menu-system` (3.4) proved the foundation works against primitive families of widely varying size. This is the fifth primitive carve-out — the popover-trigger family — small at three executable files (no file over 50 LOC) with one hook file living in a sibling directory (`app/ui/hooks/`) rather than within the family's component folder.

Like `test-menu-system`, this carve-out elevates against an **already-existing** spec (`popover-trigger-system`, created by archiving `standardize-menus-and-controls`). No new capability spec is created. The spec edits here are ADDITIVE: four new requirements that lock call-time invariants the source enforces today but the spec does not state explicitly.

Carve-out (per parent `test-coverage` tasks.md §3.5):

| File | LOC | Char | Tested how |
|---|---|---|---|
| `app/ui/components/popover-trigger/PopoverTrigger.tsx` | 43 | `forwardRef`; renders `<button type='button'>` with class via `triggerClasses({ active, tone, extra: className })`; children: optional `icon`, label span, conditional count span (`count !== undefined && count > 0`), inline chevron `<svg aria-hidden='true'>`; pass-through of all standard `<button>` props | jsdom + RTL |
| `app/ui/components/popover-trigger/triggerClasses.ts` | 21 | `triggerClasses({ active, tone = 'light', extra })` → `['popover-trigger', tone === 'on-dark' && 'tone-on-dark', active && 'active', extra].filter(Boolean).join(' ')` | Pure node — `.test.ts` under the node project |
| `app/ui/hooks/usePopoverDismiss.ts` | 29 | `useEffect` gated on `open`; document `mousedown` (gated on `ref.current && !ref.current.contains(target)`) → `onClose`; document `keydown` (Escape only) → `onClose`; cleanup removes both listeners; deps `[open, onClose, ref]` | jsdom + `@testing-library/react` `renderHook` + `vi.spyOn` on `document.addEventListener` / `removeEventListener`; synthetic `MouseEvent` / `KeyboardEvent` dispatched on `document` |
| `app/ui/components/popover-trigger/types.ts` | 14 | Type-only (`PopoverTriggerTone = 'light' \| 'on-dark'`, `PopoverTriggerOwnProps`, `PopoverTriggerProps`) | Excluded by zero-runtime-content |
| `app/ui/components/popover-trigger/index.ts` | 3 | Re-exports | Excluded by existing `app/ui/components/*/index.ts` glob |
| `app/ui/components/popover-trigger/popover-trigger.css` | 117 | CSS — not part of JS coverage | Not part of this carve-out's coverage gate |

Coverage floor: universal `COVERAGE_FLOOR` per `test-housekeeping` (98 / 98 / 95 / 100). Per-file thresholds are added by-name in `vitest.config.ts`, referencing the constant.

Bound by:
- `testing-foundation` — `__tests__/` colocation, universal `COVERAGE_FLOOR`, no-backdoor rule, four-gate pre-merge, four-audit + invariant-elevation obligations, assertion-substance bar, complexity ≤ 15, `<State>_<Behavior>` shape, three-role `describe()`, observable-behavior-over-execution.
- `popover-trigger-system` (active) — owns every existing popover-trigger SHALL. This sub-proposal ADDS four SHALLs (Decisions 3a/3b/3c/3d below). No requirements are removed; no behavior is changed.

## Goals / Non-Goals

**Goals:**

- Land three colocated test files (two jsdom + one node) at the universal `COVERAGE_FLOOR`.
- Exercise every observable branch of every file — no execute-for-coverage renders, no tautological assertions, no snapshot-only tests.
- Promote `sonarjs/cognitive-complexity` from `warn` to `error` for all three files via `eslint.config.mjs` per-file overrides.
- Add four call-time SHALLs to the `popover-trigger-system` spec (PopoverTrigger count-badge zero-suppression gate; PopoverTrigger chevron `aria-hidden`; `triggerClasses` fixed token order; `usePopoverDismiss` null-ref short-circuit).
- Complete the four-audit obligation (duplication / complexity / testability on source; assertion audit on the new tests) AND the invariant-elevation audit, recording dispositions in `tasks.md`.

**Non-Goals:**

- No source refactors anticipated. Every branch in every file is observable from rendered DOM, callback shape, spied side effects (`document.addEventListener`, `removeEventListener`), or composed class string. If an audit finding requires source change, it's recorded in `tasks.md` with disposition.
- No coverage of `index.ts` (excluded by the existing `app/ui/components/*/index.ts` glob), `types.ts` (no runtime content), or `popover-trigger.css` (not JS).
- No new tone, no new sibling primitive, no new popover-body unification.
- No e2e. Component-level integration belongs to capability-flow sub-proposals (4.5 items-browser-chrome, 4.7 list-hero-header, 4.9 list-item-management, 4.11 list-visibility).
- No real upstream network call. None of the three files touch network.
- No DOM-snapshot tests. Every assertion names a specific attribute, class string, accessible name, callback shape, rendered text content, or spied call argument.
- No re-verification of the migration scenarios in the existing spec (`StoreFilterPopover`, `PriceFilterPopover`, `ItemsToolbar` filters-trigger, `ListSelection`, list-hero status pill all rendering `<PopoverTrigger>`). Those are historical migration outcomes verified at archive of `standardize-menus-and-controls`; the call-site coverage belongs to the relevant capability sub-proposals.

## Decisions

### Decision 1: One `.test.tsx` per executable component file + one `.test.ts` for the pure helper + one `.test.tsx` for the hook; no per-component sub-directory.

The carve-out has one `.tsx` (PopoverTrigger renders JSX), one pure `.ts` (triggerClasses), and one `.ts` hook (usePopoverDismiss uses `document` event listeners, requiring jsdom). The `.tsx` and the hook both belong in the jsdom project; the pure helper belongs in the node project. The hook test uses `.test.tsx` (not `.test.ts`) so it lands in the jsdom project per the include glob in `vitest.config.ts` — even though no JSX is strictly required to test the hook, `renderHook` from `@testing-library/react` requires React's reconciler and a DOM environment, both of which are only available in the jsdom project. Each test file is colocated as `__tests__/<File>.test.{tsx,ts}` per the `test-housekeeping` convention.

Test file locations:
- `app/ui/components/popover-trigger/__tests__/PopoverTrigger.test.tsx`
- `app/ui/components/popover-trigger/__tests__/triggerClasses.test.ts`
- `app/ui/hooks/__tests__/usePopoverDismiss.test.tsx`

**Alternatives considered:**

- *One mega `popover-trigger.test.tsx` covering all three.* Rejected — destroys per-source-file coverage attribution and degrades failure output. Same reasoning as `test-menu-system` Decision 1.
- *Co-locate `usePopoverDismiss.test.tsx` inside `app/ui/components/popover-trigger/__tests__/` because the hook is component-scoped.* Rejected — `__tests__/` colocation mirrors source-file location (`testing-foundation`), and the source lives at `app/ui/hooks/usePopoverDismiss.ts`. Moving the test file far from its source would surprise future readers. The parent `test-coverage` tasks §3.5 says "component-scoped hook" to explain the carve-out boundary, not to dictate test-file location.
- *Use `.test.ts` for the hook by skipping `renderHook` and asserting on the effect directly.* Rejected — would require manually managing React's effect timing, ref attachment, and cleanup, all of which `renderHook` does correctly. The complexity cost is greater than the benefit.
- *Per-component sub-directory `app/ui/components/popover-trigger/PopoverTrigger/PopoverTrigger.tsx` + `__tests__/`.* Rejected — would require moving every source file. The carve-out is "test the family," not "restructure the family." Source restructure is out of scope.

### Decision 2: `usePopoverDismiss` is tested via `renderHook`, not via an indirect test through a consumer component.

`@testing-library/react`'s `renderHook` mounts the hook in isolation with a controlled props object, so the test asserts on the hook's behavior directly: listeners attached when `open: true`, removed on unmount, `onClose` invoked when the dispatched event matches the gate. The alternative would be to render `<PopoverTrigger>` or a synthetic test component that uses the hook and dispatch events — but the call-time contract being asserted is the hook's, and the indirect test would be hard to attribute when it fails.

The hook's `ref` parameter takes a `RefObject<HTMLElement | null>`. The test constructs refs via `createRef<HTMLElement>()` and either: (a) attaches the ref to a real DOM element rendered alongside the hook via a helper component pattern — the helper component renders the element via JSX, assigns the ref, and calls the hook; (b) constructs a `RefObject` literal `{ current: element }` directly for the case where attachment timing is not under test. Pattern (a) is the realistic mounted case; pattern (b) is sufficient for the inside-vs-outside container check and the `current === null` mount-race case.

**Alternative considered:** *Test the hook only through `<PopoverTrigger>` consumers in `PopoverTrigger.test.tsx`.* Rejected — `<PopoverTrigger>` does not consume the hook (it is the trigger button; consumers own the popover body and the hook). Indirect testing would have to author a synthetic test consumer anyway. `renderHook` is the direct test.

### Decision 3: ADD four call-time SHALLs to `popover-trigger-system` that the new tests lock against.

The invariant-elevation audit (per `testing-foundation`) gates each invariant the tests assert against three-part criteria (non-obvious / survives reimplementation / protects real failure mode). Four invariants pass the gate and are not yet stated in the spec.

#### Decision 3a: `<PopoverTrigger>` count badge SHALL render IFF `count !== undefined && count > 0`.

The source at HEAD:

```tsx
{count !== undefined && count > 0 && (
  <span className="popover-trigger-count">{count}</span>
)}
```

The contract is: a zero-count value SHALL produce no badge (no rendered span at all, not a `0`-text badge). The existing spec scenario "PopoverTrigger with icon and count badge" shows `count={3}` rendering a `'3'` badge, and "PopoverTrigger renders with label and chevron" shows the no-count case, but neither addresses `count === 0` explicitly. A naive reading of "optional right-side count badge" might leave `count === 0` rendering a `'0'` badge — visually noisy and semantically wrong (no filters applied should show no badge, not a `0` badge). This is non-obvious (the spec uses the word "optional," which most reasonably reads as "present-or-absent," not "present-when-positive"), survives reimplementation (any rewrite that drops the `> 0` half of the gate would silently start rendering `'0'` badges), and protects a real failure mode (false-positive filter affordance). Elevated.

The test path covers four cases: (a) `count={3}` → badge span present, text `'3'`; (b) `count={undefined}` → no badge span at all; (c) `count={0}` → no badge span at all (the `> 0` half of the gate suppresses it); (d) `count` prop omitted → equivalent to (b).

#### Decision 3b: `<PopoverTrigger>`'s inline chevron `<svg>` SHALL carry `aria-hidden="true"`.

The source at HEAD:

```tsx
<svg
  className="popover-trigger-chevron"
  width="10"
  height="6"
  viewBox="0 0 10 6"
  fill="none"
  aria-hidden="true"
>
  <path d="M1 1l4 4 4-4" stroke="currentColor" … />
</svg>
```

The contract is: the chevron is purely decorative; the popover-affordance semantic is carried by the consumer-supplied `aria-haspopup` / `aria-expanded` on the `<button>` itself. Without `aria-hidden`, the screen reader announces the SVG (often as "graphic" or, depending on AT and platform, by reading the path's `d` attribute), which is meaningless to the user. The existing spec mentions the chevron in the rendering scenario but does not state `aria-hidden`. This is non-obvious (the spec describes the visual element, not the AT contract), survives reimplementation (a rewrite that swaps in a different icon library — e.g. `react-icons` — would silently drop the `aria-hidden` unless the consumer remembered to add it), and protects a real failure mode (extraneous screen-reader announcements that fight the actual popover-affordance announcement). Elevated.

The test path asserts `aria-hidden="true"` on the rendered chevron element (located via `getByRole('button')`'s descendant SVG, or by data-testid if needed).

#### Decision 3c: `triggerClasses({ active, tone, extra })` SHALL compose the wrapper class string in fixed token order.

The source at HEAD:

```tsx
return [
  'popover-trigger',
  tone === 'on-dark' && 'tone-on-dark',
  active && 'active',
  extra,
].filter(Boolean).join(' ');
```

The contract is: a stable token order so CSS selectors like `.popover-trigger.tone-on-dark.active` (used by `popover-trigger.css` line 113 for the on-dark active state) remain stable across changes. The existing spec describes the visual outcomes of each tone × active combination but does not assert the class-string composition. A rewrite that conditionally rearranges the order — e.g. `extra` first when `tone === 'light'`, or `active` before `tone-on-dark` — would not change rendered visuals but would silently fragment the css selector contract on any future site that uses `.popover-trigger.tone-on-dark.active`. This is non-obvious (the spec is visual; the composer's invariant is structural), survives reimplementation (any new tone or modifier added later would have to honor the order), and protects a real failure mode (CSS selector mis-application after refactor). Elevated.

The test path is the pure-function test file `triggerClasses.test.ts`: every input combination of `{ active, tone, extra }` is asserted against an exact output string. The combinations cover: defaults; on-dark only; active only; on-dark + active; on-dark + active + extra; light + active + extra; falsy `extra` (empty string, undefined).

#### Decision 3d: `usePopoverDismiss({ open, onClose, ref })` SHALL no-op the outside-click handler when `ref.current` is `null`.

The source at HEAD:

```tsx
const onPointer = (e: MouseEvent) => {
  if (ref.current && !ref.current.contains(e.target as Node)) {
    onClose();
  }
};
```

The contract is: when `ref.current === null` (e.g. the popover body has not mounted yet, or the ref callback has not resolved), the outside-click handler does NOT call `onClose`. Without the `ref.current && …` guard, the second half of the AND would call `contains` on `null` and throw — but more importantly, even if no throw occurred (e.g. via a `?.` chain that returned `undefined`), the surrounding `!` would flip `undefined` to `true` and call `onClose` on any click during the open-but-unmounted frame. The existing spec scenario "Hook closes on outside mousedown" describes the happy path with a populated ref; it does not address the mount-race. This is non-obvious (most readers think of `ref.current` as always populated by the time event handlers fire, but the listeners are attached as soon as `useEffect` runs which is BEFORE child DOM is fully attached in some React 19 transition states), survives reimplementation (a rewrite to optional chaining `ref.current?.contains(…)` would still suppress the throw but the gate's intent — "do nothing when no ref to compare against" — is the part being locked), and protects a real failure mode (a popover that closes itself on the first frame after opening because the ref isn't attached yet). Elevated.

The test path: mount the hook with `open: true` and a ref whose `current` is `null` (a freshly-created `useRef(null)` or `createRef()` that is never attached); dispatch `mousedown` on `document.body`; assert `onClose` is NOT called.

**Alternatives considered:**

- *Defer 3a/3b/3c/3d to a follow-up sub-proposal `harden-popover-trigger-spec`.* Rejected — the invariant-elevation audit IS part of this sub-proposal per `testing-foundation`. Deferring breaks the audit obligation.
- *Add only 3a and 3b (the user-visible ones); leave 3c and 3d implicit.* Rejected — 3c locks the composer's structural contract that CSS selectors depend on; 3d locks a subtle mount-race safety. Both are smaller-than-3a-or-3b but the smallest possible drift between source and spec.
- *Add 3b as part of the existing "PopoverTrigger renders with label and chevron" scenario by appending a `THEN` line.* Rejected — that scenario asserts presence of the chevron; adding `aria-hidden` to it would mix structural and AT-decoration concerns. A separate requirement keeps each contract tight.

### Decision 4: `userEvent.click` for `<PopoverTrigger>` click tests; `document.dispatchEvent` for `usePopoverDismiss` mousedown / Escape tests.

`testing-foundation`'s "observable behavior over execution" rule prefers user-facing event sequences. For `<PopoverTrigger>`'s click behavior, `userEvent.click(getByRole('button'))` is the right shape — it dispatches a sequence (`pointerdown` → `mousedown` → `pointerup` → `mouseup` → `click`) that mirrors the browser.

For `usePopoverDismiss`, the source listens at the `document` level (`document.addEventListener('mousedown', …)` / `keydown`). The cleanest path is `document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))` with a `target` set on the event via the dispatching element pattern (dispatching from `document.body` sets `target = document.body`; dispatching `target: refElement` via `Object.defineProperty(event, 'target', { value: refElement })` is rejected as too low-level — instead, the helper component renders the ref'd element AND a sibling element, and `fireEvent.mouseDown(siblingElement)` bubbles up to the document listener).

For Escape and other key tests, `document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))` is direct and matches the source's listener registration.

### Decision 5: Coverage gaps surface via the no-backdoor preference order; the per-file floor is not relaxed.

Per `test-housekeeping`'s no-backdoor rule. Each branch v8 flags as uncovered has three dispositions in order of preference:

- **(a) Write a test.** Default.
- **(b) Refactor the source** (within the carve-out) to remove the awkward branch.
- **(c) `/* v8 ignore next */` annotation with a one-line rationale comment** for the specific uncoverable region.

Lowering the per-file floor is NO LONGER acceptable. Each disposition (and which option was chosen) SHALL be recorded in `tasks.md`.

Expected attention points:

- `PopoverTrigger.tsx` — the `count !== undefined && count > 0` short-circuit composite. v8 reports the AND-expression as two branches: (i) the `count !== undefined` half; (ii) the `count > 0` half. Both are exercised: `count={undefined}` (case i fails), `count={0}` (case i passes, case ii fails), `count={3}` (both pass).
- `PopoverTrigger.tsx` — `type = 'button'` default + explicit override. Two cases: omitted `type` prop (default applied) and explicit `type="submit"`.
- `triggerClasses.ts` — the truth table is `2 × 2 × 3` (tone in `{light, on-dark}` × active in `{true, false}` × extra in `{undefined, '', 'foo'}`) collapsed to the 9 cases the test sweep covers explicitly.
- `usePopoverDismiss.ts` — `if (!open) return` short-circuit. Covered by rendering with `open: false` initially and verifying no listeners attached.
- `usePopoverDismiss.ts` — `ref.current && !ref.current.contains(target)` composite. v8 reports two branches: (i) the `ref.current` half; (ii) the negation half. Case (i) fails with `current === null` (Decision 3d's test). Case (ii) is exercised by inside-click (negation flips to false) and outside-click (negation stays true). Both branches of (ii) are exercised.
- `usePopoverDismiss.ts` — `e.key === 'Escape'` ternary. Two cases: Escape (true → `onClose` called), non-Escape (false → `onClose` not called).

No surprise branches anticipated. If v8 flags anything unexpected, the disposition path is recorded per the no-backdoor rule.

### Decision 6: A shared `__tests__/test-helpers.tsx` is allowed if duplication crosses three or more test files; otherwise inline.

Anticipated duplication patterns:

- "Render `<PopoverTrigger>` with various prop combos" — applies to several `PopoverTrigger.test.tsx` sections. Internal to one file; stays as local arrange code or a local helper inside that file, not extracted to a shared module.
- "Mount `usePopoverDismiss` with a ref attached to a real DOM element" — applies to several `usePopoverDismiss.test.tsx` sections. Internal to one file; stays as a local helper component (`function Harness({ open, onClose }) { const ref = useRef…; usePopoverDismiss({open, onClose, ref}); return <div ref={ref} … />; }`).
- "Spy on `document.addEventListener` / `removeEventListener`" — used only in `usePopoverDismiss.test.tsx` listener-registration / cleanup tests. Stay inline.
- Cross-file: none anticipated. The three test files exercise very different surfaces (DOM render shape, pure function I/O, hook lifecycle), so duplication doesn't naturally arise.

If extracted, `test-helpers.tsx` lives at `app/ui/components/popover-trigger/__tests__/test-helpers.tsx` (or `app/ui/hooks/__tests__/test-helpers.tsx` for hook-only helpers) and is excluded from coverage via the existing `**/__tests__/**` glob in `vitest.config.ts`'s `coverage.exclude`. The §7.2 audit records the chosen disposition.

### Decision 7: The `ref` forwarding test asserts on `ref.current` after mount, not via dispatching from a parent.

The source: `PopoverTrigger = forwardRef<HTMLButtonElement, PopoverTriggerProps>(…)`. The test uses `const ref = createRef<HTMLButtonElement>(); render(<PopoverTrigger ref={ref} label="x" />); expect(ref.current).toBeInstanceOf(HTMLButtonElement);`. This asserts the forwarded ref points at the underlying button after mount.

**Alternative considered:** *Test ref forwarding indirectly via a parent component that uses the ref imperatively.* Rejected — the simpler test asserts the same contract. Any future change that adds a derived ref via `useImperativeHandle` would update this test.

## Risks / Trade-offs

- **`usePopoverDismiss` registers listeners at the `document` level.** Risk: the test pollutes `document` listeners between tests if `vi.restoreAllMocks()` doesn't run between tests. → Mitigation: `renderHook`'s `unmount` runs the hook's cleanup, which calls `document.removeEventListener` directly. The test asserts the cleanup ran (Decision 4's spy assertions). The existing `test/helpers/setup.ts` calls `cleanup()` via `afterEach`; `renderHook` is covered by the same cleanup.
- **Spying on `document.addEventListener` / `removeEventListener` is a global side effect.** Risk: leaking the spy into adjacent tests. → Mitigation: the spy is set inside `beforeEach` and restored in `afterEach` via `vi.restoreAllMocks()`. Same mitigation pattern as `Menu.test.tsx`'s focus spy.
- **The `count === 0` test is easy to author wrong.** Risk: writing `count={undefined}` instead of `count={0}` — both produce no badge but for different reasons, and conflating them weakens the test. → Mitigation: the test names them `CountZero_NoBadgeSpan` and `CountUndefined_NoBadgeSpan` so the gate's two halves are independently exercised. Decision 3a documents this explicitly.
- **The `aria-hidden="true"` assertion on the chevron is easy to satisfy via a false-positive structural query.** Risk: querying for "any svg with aria-hidden" returns true even if the chevron itself lost the attribute and a sibling icon (e.g. consumer-passed `icon` prop containing an SVG) retained it. → Mitigation: the test locates the chevron via its class name `popover-trigger-chevron` (or via a stable structural locator like "the last child of the button"), then asserts `aria-hidden`. The chevron's class name is part of the component-internal contract that this carve-out's coverage maintains.
- **The `usePopoverDismiss` null-ref case is tested with `ref.current === null` but the source's listener attaches via `useEffect` which runs after mount.** Risk: the test mounts the hook with a `useRef(null)` that legitimately reaches `useEffect` with `current === null` ONLY if the helper component does not attach the ref to any element. The test must ensure the ref is intentionally orphaned. → Mitigation: the test uses two patterns: (a) the orphan-ref pattern (the helper does not render an element using the ref); (b) `Object.defineProperty(ref, 'current', { value: null })` after a normal mount, to assert the runtime gate still works even after the ref was once populated. Pattern (a) is sufficient; (b) is added if v8 reports the gate's branch as undercovered.
- **Cognitive-complexity promotion locks the ceiling at 15 for three small files.** Measured complexity at HEAD: all three at 1–2. The ceiling is far above current usage. → Accepted: the ceiling is comfortably above current usage with buffer. If a future change pushes any of the three over 15, the failure is "extract a helper" — the right escape valve.
- **The active `popover-trigger-system` spec was created from the `standardize-menus-and-controls` archive moment with a clear Purpose paragraph (unlike `menu-system`'s "TBD" Purpose).** No Purpose-rewrite needed. The spec is in a good state for additive elevation.
- **The migration scenarios in the existing spec (e.g. `ListSelection trigger uses PopoverTrigger`) are historical and remain in place.** This carve-out does NOT re-verify those migrations; the requirements stand archived as satisfied. The capability sub-proposals that own those call sites (4.5, 4.9) will exercise the consumer behavior; this sub-proposal exercises the primitive.
- **`usePopoverDismiss` lives at `app/ui/hooks/usePopoverDismiss.ts`, not inside the `popover-trigger/` family directory.** The carve-out boundary is `popover-trigger-system` (a behavior contract that spans both the primitive and its dismissal hook), not "the folder." The test file's location mirrors the source location (`app/ui/hooks/__tests__/`), but the coverage gate, the `eslint.config.mjs` override, and the spec elevation all treat the three files as one carve-out. Future readers grep `popover-trigger-system` or `usePopoverDismiss` to find this change; the folder split is documented in `proposal.md` and again here.
