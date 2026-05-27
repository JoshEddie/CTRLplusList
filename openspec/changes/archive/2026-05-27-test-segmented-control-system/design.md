## Context

Sub-proposal 3.6 of the `test-coverage` initiative. The `testing-foundation` capability is established and hardened by `test-housekeeping`: `__tests__/` colocation is the convention, the universal per-file floor is `lines:98 / statements:98 / branches:95 / functions:100` referenced from a single `COVERAGE_FLOOR` constant in `vitest.config.ts`, the no-backdoor disposition rule is in effect, and the five primitive-family carve-outs already archived (`test-button-system` 3.1, `test-chip-system` 3.2, `test-form-field-system` 3.3, `test-menu-system` 3.4, `test-popover-trigger-system` 3.5) proved the foundation works against primitive families of widely varying size. This is the sixth primitive carve-out — the segmented-control family — small at three executable files (no file over 120 LOC), entirely contained within `app/ui/components/segmented-control/` with no companion files in sibling directories (`usePopoverDismiss` was the precedent for cross-directory carve-outs; this carve-out is fully self-contained).

Like `test-menu-system` and `test-popover-trigger-system`, this carve-out elevates against an **already-existing** spec (`segmented-control-system`, created by archiving `standardize-menus-and-controls`). No new capability spec is created. The spec edits here are ADDITIVE: four new requirements that lock call-time invariants the source enforces today but the spec does not state explicitly. The spec's "TBD" Purpose paragraph is also rewritten — the same precedent `test-menu-system` set when archiving rewrote `menu-system`'s placeholder Purpose.

Carve-out (per parent `test-coverage` tasks.md §3.6):

| File | LOC | Char | Tested how |
|---|---|---|---|
| `app/ui/components/segmented-control/SegmentedControl.tsx` | 118 | `forwardRef` over a generic inner; renders `<div role="radiogroup">` with class via `segmentedGroupClasses({ tone, extra: className })`; provides `SegmentedContext` (typed `unknown`-narrowed at the option call site); attaches one `keydown` listener to the container in `useEffect` with deps `[onChange]`, filtering for arrow keys, resolving the current index via `aria-checked="true"`, computing the next index via modulo wrap, dispatching `onChange(next.dataset.value)` and `next.focus()` after `e.preventDefault()` | jsdom + RTL |
| `app/ui/components/segmented-control/SegmentedOption.tsx` | 46 | `forwardRef` over a generic inner; consumes the context via `useSegmentedContext` (which THROWS when context is null); renders `<button type="button" role="radio" aria-checked={isActive} tabIndex={isActive ? 0 : -1} data-value={value}>` with class via `segmentedOptionClasses({ active: isActive, extra: className })`; `onClick` invokes `ctx.onChange(value)` unconditionally | jsdom + RTL |
| `app/ui/components/segmented-control/segmentedClasses.ts` | 24 | Two pure functions: `segmentedGroupClasses({ tone, extra })` → `['segmented', `tone-${tone}`, extra].filter(Boolean).join(' ')`; `segmentedOptionClasses({ active, extra })` → `['segmented-option', active && 'active', extra].filter(Boolean).join(' ')` | Pure node — `.test.ts` under the node project |
| `app/ui/components/segmented-control/types.ts` | 1 | Type-only (`SegmentedTone = 'light' \| 'on-dark'`) | Excluded by zero-runtime-content |
| `app/ui/components/segmented-control/index.ts` | 8 | Re-exports | Excluded by existing `app/ui/components/*/index.ts` glob |
| `app/ui/components/segmented-control/segmented-control.css` | — | CSS — not part of JS coverage | Not part of this carve-out's coverage gate |

Coverage floor: universal `COVERAGE_FLOOR` per `test-housekeeping` (98 / 98 / 95 / 100). Per-file thresholds are added by-name in `vitest.config.ts`, referencing the constant.

Bound by:
- `testing-foundation` — `__tests__/` colocation, universal `COVERAGE_FLOOR`, no-backdoor rule, four-gate pre-merge, four-audit + invariant-elevation obligations, assertion-substance bar, complexity ≤ 15, `<State>_<Behavior>` shape, three-role `describe()`, observable-behavior-over-execution.
- `segmented-control-system` (active) — owns every existing segmented-control SHALL. This sub-proposal ADDS four SHALLs (Decisions 3a/3b/3c/3d below). No requirements are removed; no behavior is changed. The "TBD" Purpose paragraph is left in place per the `test-menu-system` precedent.

## Goals / Non-Goals

**Goals:**

- Land three colocated test files (two jsdom + one node) at the universal `COVERAGE_FLOOR`.
- Exercise every observable branch of every file — no execute-for-coverage renders, no tautological assertions, no snapshot-only tests.
- Promote `sonarjs/cognitive-complexity` from `warn` to `error` for all three files via `eslint.config.mjs` per-file overrides.
- Add four call-time SHALLs to the `segmented-control-system` spec (`segmentedGroupClasses` fixed token order with always-emit-tone; `segmentedOptionClasses` fixed token order; `useSegmentedContext` outside-provider throw; container-scoped keydown listener with `[onChange]` deps).
- Complete the four-audit obligation (duplication / complexity / testability on source; assertion audit on the new tests) AND the invariant-elevation audit, recording dispositions in `tasks.md`.

**Non-Goals:**

- No source refactors anticipated. Every branch in every file is observable from rendered DOM, callback shape, spied side effects (`Element.prototype.addEventListener`, container `removeEventListener`), or composed class string. If an audit finding requires source change, it's recorded in `tasks.md` with disposition.
- No coverage of `index.ts` (excluded by the existing `app/ui/components/*/index.ts` glob), `types.ts` (no runtime content), or `segmented-control.css` (not JS).
- No new tone, no new sibling primitive, no new sub-component.
- No e2e. Component-level integration belongs to capability-flow sub-proposals (4.5 items-browser-chrome for the view-toggle, 4.11 list-visibility for `VisibilityPicker`).
- No real upstream network call. Neither file touches network.
- No DOM-snapshot tests. Every assertion names a specific attribute, class string, accessible name, callback shape, rendered text content, or spied call argument.
- No re-verification of the migration scenarios in the existing spec (`VisibilityPicker`, `ItemsToolbar` view-toggle migrating to `<SegmentedControl>`). Those are historical migration outcomes verified at archive of `standardize-menus-and-controls`; the call-site coverage belongs to the relevant capability sub-proposals.

## Decisions

### Decision 1: One `.test.tsx` per executable component file + one `.test.ts` for the pure helper module; no per-component sub-directory.

The carve-out has two `.tsx` files (both render JSX) and one pure `.ts` (two exported functions). The `.tsx` files belong in the jsdom project; the pure helper belongs in the node project. Each test file is colocated as `__tests__/<File>.test.{tsx,ts}` per the `test-housekeeping` convention.

Test file locations:
- `app/ui/components/segmented-control/__tests__/SegmentedControl.test.tsx`
- `app/ui/components/segmented-control/__tests__/SegmentedOption.test.tsx`
- `app/ui/components/segmented-control/__tests__/segmentedClasses.test.ts`

**Alternatives considered:**

- *One mega `segmented-control.test.tsx` covering both components and the helpers.* Rejected — destroys per-source-file coverage attribution and degrades failure output. Same reasoning as `test-popover-trigger-system` Decision 1.
- *Test `<SegmentedOption>` only as a child of `<SegmentedControl>` in `SegmentedControl.test.tsx`.* Rejected for the bulk of `SegmentedOption`'s coverage — the `useSegmentedContext` throw on missing provider can only be tested when `<SegmentedOption>` is rendered WITHOUT a parent, so a dedicated `SegmentedOption.test.tsx` is required regardless. Once the file exists, every `SegmentedOption`-specific contract (data-value attribute, aria-checked serialization, tabIndex roving, click idempotency, ref forwarding, pass-through props, omitted-from-DOM `value`/`onChange`/`aria-checked` props) goes there. `SegmentedControl.test.tsx` still renders `<SegmentedOption>` children — but only as the substrate for testing the *parent's* behavior (keyboard navigation, context provision, ref forwarding to the container).
- *Per-component sub-directory `app/ui/components/segmented-control/SegmentedControl/SegmentedControl.tsx` + `__tests__/`.* Rejected — would require moving every source file. The carve-out is "test the family," not "restructure the family." Source restructure is out of scope.

### Decision 2: `<SegmentedOption>`'s outside-provider throw is asserted via `expect(() => render(...)).toThrow(...)` with an exact-string error-message match.

The source's `useSegmentedContext` reads:

```tsx
export function useSegmentedContext(): SegmentedContextValue {
  const ctx = useContext(SegmentedContext);
  if (!ctx) {
    throw new Error(
      '<SegmentedOption> must be rendered inside a <SegmentedControl>'
    );
  }
  return ctx;
}
```

The test renders `<SegmentedOption value="x">label</SegmentedOption>` directly (no `<SegmentedControl>` wrapper) inside a try/catch error boundary, OR wraps the `render` call in `expect(() => render(...)).toThrow('<SegmentedOption> must be rendered inside a <SegmentedControl>')`. React 19's behavior when a component throws during render is to bubble the error up to the nearest error boundary (or fail the render); RTL's `render` re-throws by default in tests. The exact-string match locks the descriptive error message — a future contributor that rewrites the throw to `throw new Error('Missing context')` would fail the test by name.

The error message string is asserted exactly (matching the source's literal). This is per the assertion-substance rule: "exact-string" beats "matches /context/i" because the former locks the developer-friendly message that informs the consumer how to fix the bug.

**Suppression of error-boundary console noise:** React 19 logs errors thrown during render via `console.error` (the "Uncaught Error in component" warning). The test SHALL suppress this via `vi.spyOn(console, 'error').mockImplementation(() => {})` scoped to the `it()` block, then restore via `vi.restoreAllMocks()` in `afterEach`. The suppression is asserted via the spy's `toHaveBeenCalled` (proving the error did happen) but the spy itself prevents noisy test output.

**Alternative considered:** *Test `useSegmentedContext` directly via `renderHook` outside any provider.* Acceptable but redundant — the same throw is exercised by rendering `<SegmentedOption>` without a parent, and the indirect test asserts the user-facing contract (the consumer who renders an orphan option sees the descriptive error). The `renderHook` test would add no coverage and would assert against the same line. Stays one-test-only.

### Decision 3: ADD four call-time SHALLs to `segmented-control-system` that the new tests lock against, and rewrite the "TBD" Purpose.

The invariant-elevation audit (per `testing-foundation`) gates each invariant the tests assert against three-part criteria (non-obvious / survives reimplementation / protects real failure mode). Four invariants pass the gate and are not yet stated in the spec.

#### Decision 3a: `segmentedGroupClasses({ tone, extra })` SHALL compose the wrapper class string with `tone-${tone}` ALWAYS emitted, in fixed token order.

The source at HEAD:

```ts
export function segmentedGroupClasses({
  tone,
  extra,
}: {
  tone: SegmentedTone;
  extra?: string;
}): string {
  return ['segmented', `tone-${tone}`, extra].filter(Boolean).join(' ');
}
```

The contract has two parts. (1) **Always-emit-tone.** Unlike `triggerClasses` (which only emits `tone-on-dark` when `tone === 'on-dark'` and emits nothing for the default `'light'` tone), `segmentedGroupClasses` ALWAYS emits a `tone-<value>` class — `tone="light"` produces `'segmented tone-light'`, not `'segmented'`. The existing CSS (`segmented-control.css`) uses BOTH `.segmented.tone-light` and `.segmented.tone-on-dark` selectors to scope the light- and dark-surface visual treatments, so the always-emit-tone behavior is load-bearing for the light tone (not just the dark one). A naive copy-from-`triggerClasses` rewrite would silently drop the `tone-light` class and break the light-tone visual contract. (2) **Fixed token order.** The order is: `'segmented'` always first; `'tone-<value>'` second; `extra` third (when truthy). CSS selectors and `extra`-via-`className` passthrough depend on the order being stable.

Non-obvious (the spec describes two tones but does not state how they emit classes — the always-emit-tone vs. conditional-emit-tone distinction lives only in the source). Survives reimplementation (any rewrite that conditionally emits the tone class, or reorders the tokens, would silently break the light-tone CSS or the `extra` token's positional contract). Protects a real failure mode (silent visual regression on the light tone — the change would be invisible until someone notices the unstyled component). Elevated.

The test path covers six cases in the pure-function test file: `{ tone: 'light' }` → `'segmented tone-light'`; `{ tone: 'on-dark' }` → `'segmented tone-on-dark'`; `{ tone: 'light', extra: 'foo' }` → `'segmented tone-light foo'`; `{ tone: 'on-dark', extra: 'bar' }` → `'segmented tone-on-dark bar'`; `{ tone: 'light', extra: '' }` → `'segmented tone-light'` (empty filtered); `{ tone: 'light', extra: undefined }` → `'segmented tone-light'`. The `SegmentedControl.test.tsx` end-to-end check asserts `container.className === 'segmented tone-light'` (and the on-dark mirror) so a regression in `segmentedGroupClasses` surfaces at the component level too.

#### Decision 3b: `segmentedOptionClasses({ active, extra })` SHALL compose the option class string in fixed token order.

The source at HEAD:

```ts
export function segmentedOptionClasses({
  active,
  extra,
}: {
  active: boolean;
  extra?: string;
}): string {
  return ['segmented-option', active && 'active', extra]
    .filter(Boolean)
    .join(' ');
}
```

The contract is: a stable token order so CSS selectors like `.segmented-option.active` (used by `segmented-control.css` for the active-option fill) remain stable. The existing spec describes the visual outcomes of active vs. inactive but does not assert the class-string composition. A rewrite that conditionally rearranges the order — e.g. `extra` first when active is false — would not change rendered visuals but would silently fragment the CSS selector contract on any future site that combines `.segmented-option.active` with a custom `extra` class.

Non-obvious (the spec is visual; the composer's invariant is structural). Survives reimplementation (any new state class added later would have to honor the order). Protects a real failure mode (CSS selector mis-application after refactor). Elevated.

The test path is the pure-function test file: every input combination of `{ active, extra }` is asserted against an exact output string. The combinations cover: active only; inactive only; active + extra; inactive + extra; active + empty extra; inactive + undefined extra.

#### Decision 3c: `useSegmentedContext()` SHALL throw a descriptive Error when called outside a `<SegmentedControl>`.

The source at HEAD (cited in Decision 2). The contract is: when `useSegmentedContext` is invoked without a `<SegmentedControl>` ancestor providing the context, an Error SHALL be thrown with the exact message `'<SegmentedOption> must be rendered inside a <SegmentedControl>'`. The existing spec assumes the option is always rendered inside the parent (every scenario shows the pair); it does not state the developer-error safety net.

A naive rewrite (e.g. silently returning a default context value, or using optional chaining to short-circuit) would compile and run — the option would just silently fail to update on click (because `ctx.onChange` would be a no-op or undefined). The descriptive error converts a silent runtime bug into a loud developer error at the first render attempt.

Non-obvious (the spec assumes correct composition; the throw is the negative-path contract). Survives reimplementation (any future change that reshapes the context would have to preserve the negative-path throw). Protects a real failure mode (silent no-op of an interactive control, often discovered only via end-user reports). Elevated.

The test path: render `<SegmentedOption value="x">label</SegmentedOption>` without a parent and assert `expect(() => render(...)).toThrow('<SegmentedOption> must be rendered inside a <SegmentedControl>')`. The error message is asserted as an exact string (per Decision 2).

#### Decision 3d: `<SegmentedControl>`'s `keydown` listener SHALL be attached to the container `radiogroup` element (NOT to `document`), with deps `[onChange]`.

The source at HEAD:

```tsx
useEffect(() => {
  const container = localRef.current;
  if (!container) return;
  const onKey = (e: KeyboardEvent) => { … };
  container.addEventListener('keydown', onKey);
  return () => container.removeEventListener('keydown', onKey);
}, [onChange]);
```

The contract has three parts. (1) **Scope.** The listener is attached to the `radiogroup` container element, NOT to `document` or `window`. This is essential because (a) multiple segmented controls can coexist on the same page (e.g. a `VisibilityPicker` and an `ItemsToolbar` view-toggle rendered concurrently), and a document-scoped listener would mis-route arrow keys; (b) arrow keys pressed when focus is anywhere else on the page (text input, scrollable region, other widget) must NOT be intercepted by the segmented control. (2) **Cleanup.** The cleanup function removes the same listener on unmount, preventing listener accumulation across mount/unmount cycles. (3) **Deps.** The deps array is `[onChange]` only — NOT `[onChange, value]`. The `value` is intentionally NOT a dep because (a) the handler reads the current index from the DOM (`aria-checked="true"`), not from the React state, so a re-attached listener is unnecessary on value change; (b) re-attaching on every selection would double-fire events during the same React tick if cleanup is also miswritten. The handler DOES re-attach on `onChange` identity change to capture the new callback in the closure.

Non-obvious (the spec mentions arrow-key behavior but does not address listener scope or deps array). Survives reimplementation (a refactor to `document.addEventListener` would still pass the existing functional tests on a one-control page but break the multi-control case and intercept page-wide keys; a deps change to `[]` would freeze the `onChange` closure and call the stale callback after a re-render). Protects a real failure mode (page-wide arrow-key interception, multi-control crosstalk, stale-callback bug after `onChange` is recreated via a non-memoized parent callback). Elevated.

The test path covers three cases in `SegmentedControl.test.tsx`: (a) `ListenerScopedToContainer` — spy on `Element.prototype.addEventListener`; mount; assert the spy was called with `'keydown'` against the rendered container element specifically (not `document`); cleanup-spy assertion mirrors on unmount; (b) `KeydownOutsideContainer_NoOnChange` — dispatch a `keydown` event on a sibling element outside the control's container; assert `onChange` was NOT called; (c) `OnChangeIdentityChange_ListenerReattached` — render with `onChange={spyA}`; rerender with `onChange={spyB}` while value unchanged; dispatch ArrowRight; assert `spyB` (not `spyA`) was called; AND (d) `ValueChange_NoListenerReattachment` — render with `value="a"`; rerender with `value="b"` while `onChange` reference unchanged; verify `addEventListener` was called exactly once across both renders (not twice).

**Alternatives considered:**

- *Defer 3a/3b/3c/3d to a follow-up sub-proposal `harden-segmented-control-spec`.* Rejected — the invariant-elevation audit IS part of this sub-proposal per `testing-foundation`. Deferring breaks the audit obligation.
- *Add only 3a and 3c (the user-visible / safety-net ones); leave 3b and 3d implicit.* Rejected — 3b locks the composer's structural contract that CSS selectors depend on; 3d locks a subtle listener-scope and deps-array contract. Both are smaller-than-3a-or-3c but the smallest possible drift between source and spec.
- *Merge 3a and 3b into one "class composers SHALL preserve fixed token order" requirement.* Rejected — the always-emit-tone distinction in 3a is the load-bearing part of that requirement, and it does not apply to 3b's composer. A single requirement would hide the distinction. Two requirements keep each contract tight.

### Decision 4: `userEvent.click` for click tests; container-targeted `fireEvent.keyDown` for keyboard tests; `Element.prototype.addEventListener` spy for the listener-scope assertion.

`testing-foundation`'s "observable behavior over execution" rule prefers user-facing event sequences. For `<SegmentedOption>`'s click behavior, `userEvent.click(getByRole('radio', { name: '...' }))` is the right shape — it dispatches a sequence (`pointerdown` → `mousedown` → `pointerup` → `mouseup` → `click`) that mirrors the browser.

For `<SegmentedControl>`'s keyboard behavior, the listener is attached to the *container* element, not to `document` or to the focused option. The cleanest pattern is `fireEvent.keyDown(container, { key: 'ArrowRight' })` — fires the event directly on the listener's target, mirrors how a real bubbling event would reach the container from a focused descendant. Alternative: `userEvent.tab()` to the active option, then `userEvent.keyboard('{ArrowRight}')` — fires the event on the focused element, which bubbles to the container. Both work; `fireEvent.keyDown(container, …)` is preferred because it asserts directly against the listener's target without coupling to focus state (which is tested separately in the roving-tabindex assertion).

For the listener-scope assertion (Decision 3d's `ListenerScopedToContainer`), the spy is `vi.spyOn(Element.prototype, 'addEventListener')`. This catches every `addEventListener` call on every element (including the container) and lets the assertion check both that the spy was called with `'keydown'` AND that the `this`-binding of the call (the element that received the listener) was the container `<div>`, not `document`. Alternative: `vi.spyOn(document, 'addEventListener')` — used in `usePopoverDismiss.test.tsx` for a document-level listener, but here we need to assert the LACK of a document call; the prototype spy is more direct.

### Decision 5: Coverage gaps surface via the no-backdoor preference order; the per-file floor is not relaxed.

Per `test-housekeeping`'s no-backdoor rule. Each branch v8 flags as uncovered has three dispositions in order of preference:

- **(a) Write a test.** Default.
- **(b) Refactor the source** (within the carve-out) to remove the awkward branch.
- **(c) `/* v8 ignore next */` annotation with a one-line rationale comment** for the specific uncoverable region.

Lowering the per-file floor is NO LONGER acceptable. Each disposition (and which option was chosen) SHALL be recorded in `tasks.md`.

Expected attention points:

- `SegmentedControl.tsx` — the `if (!container) return;` short-circuit. This is the React-19-only branch where `localRef.current === null` at effect-run time. Covered defensively by mounting and immediately asserting the listener attached (the effect ran with a populated ref); the negative branch is not reachable in jsdom + React 19 + RTL because `localRef.current` is always populated by the time `useEffect` runs in tests. Disposition: **(c) `/* v8 ignore next 2 */` with rationale "defensive null-ref guard; ref always populated in test env"** — same precedent as test-menu-system §5.4 disposition for the equivalent `Menu.tsx` guard.
- `SegmentedControl.tsx` — the four-way key-filter `if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'ArrowUp' && e.key !== 'ArrowDown')` reads as four branches in v8. Covered by: dispatching each of the four arrow keys (positive path, four branches covered) AND dispatching one non-arrow key (e.g. `'a'` or `'Tab'`) (negative path, all four branches collectively flipped). One non-arrow test suffices because the short-circuit's logic is "any one match exits the negation" — v8 reports the AND-chain as covered once both halves of each branch are exercised, which a single non-arrow dispatch achieves.
- `SegmentedControl.tsx` — the `if (options.length === 0) return;` short-circuit. Covered by rendering `<SegmentedControl>` with NO `<SegmentedOption>` children, dispatching ArrowRight, and asserting `onChange` was NOT called.
- `SegmentedControl.tsx` — the `if (nextValue === undefined) return;` short-circuit. Reachable only if the resolved `options[nextIndex]` has no `data-value` attribute — which the standard `<SegmentedOption>` always sets. Disposition: render a synthetic test-only `<button role="radio">` (NOT via `<SegmentedOption>`) inside `<SegmentedControl>` as a sibling option to exercise the missing-data-value path; assert `onChange` was NOT called when arrow navigation lands on the synthetic element. Alternative if too fragile: **(c) `/* v8 ignore next */` with rationale "data-value is always set by SegmentedOption; this guard protects against future option implementations"**. Default to disposition (a); fall back to (c) if jsdom timing makes the synthetic-option test flaky.
- `SegmentedControl.tsx` — `currentIndex === -1` (no option `aria-checked="true"`). Reachable by rendering with a `value` that doesn't match any option's `value` (e.g. `value="zzz"` while options are `"a"` and `"b"`). Tests assert that ArrowRight selects index `0` (first option) and ArrowLeft selects index `len - 2` (second-to-last option) — the wrap-around math under the -1 starting point.
- `SegmentedOption.tsx` — `aria-checked` is set via `aria-checked={isActive}` (boolean). React converts to the string `"true"` or `"false"`. Two-case sweep: render with `value === ctx.value` (active) and `value !== ctx.value` (inactive).
- `SegmentedOption.tsx` — clicking the active option still fires `onChange` (the source has no `if (isActive) return` guard). Test: render with active value, click, assert `onChange` was called with the same value (idempotent re-selection). Documents that the source intentionally has no idempotent-click skip.
- `segmentedClasses.ts` — both functions are pure; full sweep per Decision 3a / 3b.

If v8 flags anything else unexpected, the disposition path is recorded per the no-backdoor rule.

### Decision 6: A shared `__tests__/test-helpers.tsx` is allowed if duplication crosses two or more test files; otherwise inline.

Anticipated duplication patterns:

- "Render `<SegmentedControl>` with N `<SegmentedOption>` children at various tones / values" — applies to many `SegmentedControl.test.tsx` sections. A local `function Harness({ value, onChange, tone, options }: {...})` inside the file is the right level of extraction (precedent: `test-popover-trigger-system`'s local `Harness` for `usePopoverDismiss.test.tsx`). Internal to one file; not extracted to a shared module.
- "Render `<SegmentedOption>` inside a minimal context provider" — applies to most `SegmentedOption.test.tsx` sections. A local `function ProviderHarness({ children, value = 'a', onChange = () => {}, tone = 'light' })` inside the file. Internal to one file.
- "Render `<SegmentedOption>` without a provider" — only used for the throw-test in `SegmentedOption.test.tsx`; a single test, no extraction needed.
- "Spy on `Element.prototype.addEventListener` / `removeEventListener`" — used only in `SegmentedControl.test.tsx` listener-scope tests. Stays inline.
- Cross-file: none anticipated. The three test files exercise different surfaces (container DOM render + keyboard, option DOM render + click + throw, pure function I/O).

If extracted, `test-helpers.tsx` lives at `app/ui/components/segmented-control/__tests__/test-helpers.tsx` and is excluded from coverage via the existing `**/__tests__/**` glob in `vitest.config.ts`'s `coverage.exclude`. The §5.2 audit records the chosen disposition.

### Decision 7: The `ref` forwarding tests assert on `ref.current` after mount.

The source: both `SegmentedControl` and `SegmentedOption` are `forwardRef`-wrapped. The tests use `const ref = createRef<HTMLDivElement>(); render(<SegmentedControl ref={ref} value="a" onChange={() => {}} tone="light" aria-label="x" />); expect(ref.current).toBeInstanceOf(HTMLDivElement);` (and the equivalent for `<SegmentedOption>` with `HTMLButtonElement`). For `SegmentedControl` specifically, the inner uses `useImperativeHandle(ref, () => localRef.current as HTMLDivElement)` — the test confirms the outer ref reaches the same element the keydown listener was attached to (by reading `ref.current` and dispatching `keyDown` on it).

**Alternative considered:** *Test ref forwarding indirectly via a parent component that uses the ref imperatively.* Rejected — the simpler test asserts the same contract. Any future change that adds a derived ref via `useImperativeHandle` returning a different element would update this test.

### Decision 8: The spec's "TBD" Purpose paragraph is left in place.

The active `segmented-control-system` spec's first non-heading line is "TBD - created by archiving change standardize-menus-and-controls. Update Purpose after archive." The placeholder has persisted since `standardize-menus-and-controls` archived. The same situation existed for `menu-system` before `test-menu-system` archived; `test-menu-system` LEFT the "TBD" Purpose in place (verified by reading `openspec/specs/menu-system/spec.md` post-archive). This sub-proposal follows the same precedent: Purpose rewrites are non-normative housekeeping that the test-coverage carve-outs intentionally do not perform — they would mix scope and obscure the per-spec audit trail. A future dedicated change MAY rewrite both `menu-system`'s and `segmented-control-system`'s Purpose paragraphs together.

## Risks / Trade-offs

- **`SegmentedControl`'s keydown listener is attached to a regular DOM element, not document.** Risk: the test must dispatch the keydown on the right target. → Mitigation: tests use `fireEvent.keyDown(container, …)` where `container = ref.current` (after the ref-forwarding test confirms `ref.current` is the radiogroup `<div>`). Asserting on the wrong target (e.g. `document`) would produce no `onChange` call and fail loudly.
- **Spying on `Element.prototype.addEventListener` / `removeEventListener` is a prototype-level side effect.** Risk: leaking the spy into adjacent tests, or catching listener calls from non-carve-out elements (e.g. RTL internal cleanup). → Mitigation: the spy is set inside `beforeEach` (per test that needs it) and restored in `afterEach` via `vi.restoreAllMocks()`. Assertions filter the spy's calls to ones where `this === container` (the radiogroup element). Same mitigation pattern as `Menu.test.tsx`'s focus spy and `usePopoverDismiss.test.tsx`'s document-listener spy.
- **The `currentIndex === -1` recovery cases are easy to author wrong.** Risk: writing `value="a"` when the test means to start with no checked option — but if `"a"` happens to be the value of the first option, `currentIndex` resolves to 0, not -1. → Mitigation: tests use `value="__none__"` (a deliberately-unmatched sentinel) and assert that no option has `aria-checked="true"` before dispatching ArrowRight/ArrowLeft.
- **The `nextValue === undefined` guard is reached only via a synthetic non-`<SegmentedOption>` `[role="radio"]` element.** Risk: rendering a raw `<button role="radio">` next to real `<SegmentedOption>`s feels artificial. → Mitigation: the test is named `SyntheticOptionWithoutDataValue_ArrowRight_NoOnChange` so the artificiality is part of the name. The synthetic element is wrapped in a comment-disposition (`/* tests Decision 5's missing-data-value guard */`) in the test file. Fall-back disposition (c) `/* v8 ignore next */` if the test is flaky.
- **The always-emit-tone difference between `segmentedGroupClasses` and `triggerClasses` is easy to forget.** Risk: a contributor steeped in the `popover-trigger` precedent writes `expect(segmentedGroupClasses({ tone: 'light' })).toBe('segmented')` (wrong). → Mitigation: the new spec requirement (Decision 3a) is explicit on this; the test naming surfaces the distinction (`ToneLight_EmitsToneLightClass`, not `ToneLight_ReturnsBaseToken`); the test-file header comment cites Decision 3a.
- **The `[onChange]`-only deps assertion is fragile to React internals.** Risk: React 19 may or may not re-run an effect on re-render even with stable deps in some scenarios; the spy-count assertion could fail intermittently. → Mitigation: the test uses `rerender` to control re-renders precisely (not state changes that trigger unrelated re-renders), and asserts the spy was called EXACTLY ONCE across an initial mount + one re-render with the same `onChange` reference. If React 19 introduces a documented re-run behavior for `useEffect` with stable deps, the test is updated to match (it's locking the React contract, which is stable across minor versions).
- **Cognitive-complexity promotion locks the ceiling at 15 for `SegmentedControl.tsx`.** Measured complexity at HEAD: expected ~8–12 for the keydown handler (the most complex function), well below 15. → Accepted: the ceiling has comfortable buffer. If a future change pushes the file over 15, the failure is "extract the handler" — the right escape valve.
- **The active `segmented-control-system` spec has a "TBD" Purpose.** Decision 8 documents leaving it in place per the `test-menu-system` precedent (which left `menu-system`'s "TBD" Purpose untouched). → Accepted: out of scope for this carve-out.
- **The migration scenarios in the existing spec (`VisibilityPicker`, `ItemsToolbar` view-toggle) are historical and remain in place.** This carve-out does NOT re-verify those migrations; the requirements stand archived as satisfied. The capability sub-proposals that own those call sites (4.5, 4.11) will exercise the consumer behavior; this sub-proposal exercises the primitive.
- **The carve-out is self-contained in `app/ui/components/segmented-control/`.** Unlike `test-popover-trigger-system` (which had `usePopoverDismiss` in a sibling directory), this carve-out has no cross-directory split. All three test files live in `app/ui/components/segmented-control/__tests__/`. No coordination with `app/ui/hooks/__tests__/` needed.
