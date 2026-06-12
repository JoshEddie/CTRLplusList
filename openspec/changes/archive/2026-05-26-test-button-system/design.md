## Context

Sub-proposal 3.1 of the `test-coverage` initiative. The `testing-foundation` capability is established (vitest 4.1.7, pglite 0.4.6, RTL + jsdom, four-gate pre-merge, `sonarjs/cognitive-complexity` at `warn` globally with per-file `error` promotion at archive time, two-part `<State>_<Behavior>` `it()` shape, three-role `describe()` convention). `test-pure-libs` (2.1) already exercised `buttonClasses.ts` at 100% coverage and proved the foundation works against real source. This change is the first sub-proposal to exercise JSX-rendering primitive components — the smallest such carve-out in the repo (two files, 53 + 35 LOC, no DB, no server actions, no `useEffect`, no portals).

Carve-out (per parent `test-coverage` tasks.md §3.1):

| File | LOC | Char | Tested how |
|---|---|---|---|
| `app/ui/components/button/Button.tsx` | 53 | `forwardRef` over a native `<button>`; translates `isLoading` → `disabled` + `aria-busy` + spinner; translates `pressed` → `aria-pressed`; delegates class to `buttonClasses` | jsdom + RTL render assertions |
| `app/ui/components/button/LinkButton.tsx` | 35 | `forwardRef` over a Next `<Link>`; translates `pressed` → `aria-pressed`; delegates class to `buttonClasses`; no loading state | jsdom + RTL render assertions; `next/link` mocked to render `<a>` |
| `app/ui/components/button/types.ts` | 15 | Type-only declarations (`ButtonVariant`, `ButtonSize`, `SharedButtonProps`) | Excluded — no runtime surface |
| `app/ui/components/button/index.ts` | 4 | Re-exports (`Button`, `LinkButton`, `buttonClasses`, types) | Excluded — re-export only, zero behavior |
| `app/ui/components/button/buttonClasses.ts` | 15 | Covered by 2.1 | N/A this carve-out |

Coverage floor: 90% per file (`testing-foundation` Primitive-component class).

Bound by:
- `testing-foundation` (test layout, mocking rules, no-real-network, four-audit, assertion-substance bar, complexity ≤ 15, `<State>_<Behavior>` shape, three-role `describe()`, observable-behavior-over-execution)
- `button-system` (focus indicator, 44px touch floor, hover-on-touch guard, loading-state contract, toggle-state contract, variant set, shared class composer, icon-only accessible name) — these are the contracts the tests assert against; the spec is unchanged by this work
- No `list-visibility` / `following` / `server-endpoint-authorization` ties (the components are domain-agnostic)

## Goals / Non-Goals

**Goals:**

- Land two colocated test files at 90%+ per-file coverage for `Button.tsx` and `LinkButton.tsx`.
- Exercise every observable branch of each component — no execute-for-coverage renders, no tautological assertions, no snapshot-only tests.
- Promote `sonarjs/cognitive-complexity` from `warn` to `error` for the two carve-out files via `eslint.config.mjs` overrides.
- Use RTL's `render` + `screen` + `@testing-library/jest-dom` matchers (already configured by the foundation). Mock `next/link` at the module level so the LinkButton render does not require a Router context.
- Complete the four-audit obligation (duplication / complexity / testability on source; assertion audit on the new tests) AND the invariant-elevation audit (per `testing-foundation` Requirement: "Sub-proposals SHALL elevate non-trivial invariants to capability-spec SHALLs"), record dispositions in `tasks.md`.

**Non-Goals:**

- No new requirements on `button-system`. Every behavior under test is already SHALL'd there. The invariant-elevation audit will produce a non-elevation list with per-item rationale (see Decision 4 below).
- No source refactors anticipated. Both components are tiny; if the assertion audit surfaces a "would be easier to test if X were extracted" finding, the disposition will follow `testing-foundation` §7 (fix in-place if single-file and behavior-preserving; defer if cross-file).
- No coverage of `buttonClasses.ts` (covered by 2.1) or any chip / menu / popover primitive (their own future sub-proposals).
- No DOM-snapshot tests. Every assertion names a specific attribute, class string, accessible name, or rendered element.
- No real Next router. `next/link` is mocked because Next 15's `<Link>` expects an `AppRouterContext` and we are not testing routing behavior — we are testing that `<LinkButton href={x}>` delegates to whatever `Link` does. The mock renders `<a href={...}>`, which is sufficient to assert on `href` passthrough.
- No E2E. Component-level integration belongs to capability-flow sub-proposals (4.x).

## Decisions

### Decision 1: Render via RTL (`@testing-library/react`), assert via `@testing-library/jest-dom` matchers.

The foundation's jsdom project (`*.test.tsx`) already wires up RTL plus the jest-dom matchers (loaded in `test/helpers/setup.ts`). Tests SHALL use `render(<Button ...>)` and `screen.getByRole('button')` to obtain the rendered element, then assert via `toHaveClass`, `toHaveAttribute`, `toBeDisabled`, `toHaveAccessibleName`, etc. Querying by role is preferred over `getByTestId` because role queries exercise the accessible name contract the `button-system` spec relies on (icon-only buttons SHALL carry an `aria-label`; the test surfaces the name as a side effect of querying).

**Alternatives considered:**

- *Enzyme.* Rejected — abandoned for React 18+; not installed by the foundation.
- *Render the raw JSX via `react-dom/server.renderToString`.* Rejected — works for static markup but cannot drive `onClick` or `useRef`, both of which are part of the test surface (event passthrough on `Button`, `forwardRef` resolution on both).
- *Bypass RTL and read `container.querySelector`.* Rejected — works but loses the accessible-name contract; we want test failures to surface as "the button is not accessible by its name" when an `aria-label` regression lands.

### Decision 2: Mock `next/link` at the module level in `LinkButton.test.tsx`, not in `Button.test.tsx`.

Next 15's `<Link>` reads `AppRouterContext` to perform client-side prefetching. In jsdom with no provider, the import works but `render` throws on the missing context. The minimal mock — `vi.mock('next/link', () => ({ default: ({ children, href, ...rest }) => <a href={typeof href === 'string' ? href : href?.toString()}>{children}</a> with `rest` spread — preserves every observable property the tests assert (rendered tag, `href`, `className`, `aria-pressed`, ref-target tag) without dragging in a router.

`Button.test.tsx` does NOT need this mock because `<Button>` renders a native `<button>` directly.

**Why is this not a `testing-foundation` rule violation?** The foundation forbids mocking *internal modules* (DAL, server actions, `lib/`, hooks) and *rate-limited external services*. `next/link` is neither — it is a framework primitive that requires environmental setup (router context) the unit test legitimately does not have. The mock replaces the framework wrapping with the underlying DOM element it produces, which is what the test asserts on anyway. Same class as the `next/navigation` `redirect` mock in `test-pure-libs` (3.1): replace the framework-runtime side effect with a test-observable proxy.

**Alternatives considered:**

- *Wrap in `<AppRouterContext.Provider value={mockRouter}>`.* Rejected — heavier setup, exercises Next internals (`prefetch`, `push`), and surfaces flakiness from Next 15's lazy preloading. The mock is one line.
- *Replace `<LinkButton>` with `<a>` in production to avoid the test concern.* Rejected — would silently lose client-side routing; the production-time choice of `<Link>` is intentional and out of scope here.

### Decision 3: `pressed === undefined` vs `pressed === false` SHALL be a discrete test case, not collapsed.

The production code translates `pressed` via `aria-pressed={pressed === undefined ? undefined : pressed}`. This means three distinct outputs:

- `pressed={true}` → `aria-pressed="true"` rendered
- `pressed={false}` → `aria-pressed="false"` rendered (NOT omitted — the spec's toggle contract requires it)
- `pressed` omitted → no `aria-pressed` attribute on the rendered element

The `button-system` spec is explicit ("When `pressed` is undefined, no `aria-pressed` attribute is emitted") and a regression here is a real accessibility failure (assistive tech reads non-toggle buttons as toggles). Three discrete tests SHALL exist for each component; collapsing the false / undefined distinction into a single boolean-truthy test would lose the contract.

**The exact assertion shape:**

- `pressed={true}` — `expect(button).toHaveAttribute('aria-pressed', 'true')`
- `pressed={false}` — `expect(button).toHaveAttribute('aria-pressed', 'false')`
- `pressed` omitted — `expect(button).not.toHaveAttribute('aria-pressed')` (NOT `toHaveAttribute('aria-pressed', undefined)`, which jest-dom rejects)

**Alternatives considered:**

- *Use a parameterized `for` loop over `[true, false]` and a separate test for `undefined`.* Acceptable, but the three-case enumeration reads cleaner in the failure output. Pick whichever lands; the `<State>_<Behavior>` shape is unambiguous either way (`PressedTrue_AriaPressedTrueAttribute`, `PressedFalse_AriaPressedFalseAttribute`, `PressedUndefined_NoAriaPressedAttribute`).

### Decision 4: Invariant-elevation audit is performed and recorded as non-elevation list.

Per `testing-foundation` Requirement: "Sub-proposals SHALL elevate non-trivial invariants to capability-spec SHALLs", every invariant the tests enforce SHALL be evaluated against the three-part gate: (a) non-obvious from name/signature/type, (b) survives reasonable reimplementation, (c) protects against real failure mode. The audit is expected to produce ZERO elevations because the `button-system` spec already encodes every load-bearing behavior in this carve-out:

- Loading-state contract (`disabled` + `aria-busy` + spinner alongside children) → already a SHALL in `button-system`
- Toggle-state contract (`aria-pressed` only when `pressed` defined) → already a SHALL
- Variant set (`primary | secondary | ghost | danger | on-dark | link`) → already a SHALL
- Two components sharing `buttonClasses` composer → already a SHALL
- LinkButton-does-not-support-loading → already a SHALL (the explicit non-feature)

Implementation-only invariants (test-only) that SHALL NOT be elevated, with rationale recorded in `tasks.md`:

- "`type` defaults to `'button'`" — derivable from the JSX (`type = 'button'` in the destructure). Not a spec SHALL.
- "`forwardRef` resolves to the rendered DOM element" — derivable from the type signature (`forwardRef<HTMLButtonElement, …>`). Not a spec SHALL.
- "Arbitrary HTML attributes pass through" — derivable from `...rest` spread. Not a spec SHALL.
- "`<Button>` renders a `<button>` element; `<LinkButton>` renders an `<a>`" — derivable from component name. Not a spec SHALL.

The audit deliverable in `tasks.md` SHALL list every invariant under test with its elevation disposition (elevated / not-elevated + reason).

### Decision 5: Branches floor SHALL be set at 90% up-front; gaps SHALL be closed by tests, refactor, or per-branch rationale — NOT relaxed to fit measured output.

The standard sets the bar; the code clears it. Measuring first, then declaring the floor at the measured percentage (the pattern `use-media-query.ts` ended up at — `branches: 50` in `vitest.config.ts`) lets existing code define what "good enough" means, which is policy-by-fait-accompli. This change SHALL invert that:

1. Set `branches: 90` in `vitest.config.ts` for both files up-front, matching the lines / statements / functions floors (the `testing-foundation` spec sets 90% for Primitive components on lines; branches matches by default — no spec text justifies a per-metric split).
2. Run `npm test -- --coverage`.
3. For every uncovered branch the v8 report flags, the disposition is one of three, in order of preference:
   - **(a) Write a test.** Default. If the branch is reachable, an assertion can lock it.
   - **(b) Refactor the source** (within the carve-out, per `testing-foundation` §"Sub-proposals SHALL refactor code in their carve-out as needed for testability"). E.g. extract a helper, collapse a ternary the v8 counter handles awkwardly.
   - **(c) Lower the per-file floor with a named, branch-level rationale.** Only if (a) and (b) are both impossible — typically because v8 counts a JSX expression or framework wrapping as a branch with no reachable counterpart. The lowered floor SHALL be paired with a comment in `vitest.config.ts` naming the specific uncovered branch(es) and why neither (a) nor (b) applies (e.g. "branch 3 is the `forwardRef` second-arg fallback the React runtime never invokes in jsdom"). "Measured X, floor at X-5" is NOT acceptable rationale on its own.

The `use-media-query.ts` precedent stands as an example of when (c) is legitimately needed (the empty no-op unsubscribe arrow inflates the count without a behavior gap), but it is not a default. Each carve-out's lowered floor SHALL be re-justified on its own facts — citing the precedent is not enough.

**Why not just match `test-pure-libs`'s pattern verbatim?** Because the pattern was a pragmatic concession in 2.1, not a policy. Documenting it as policy ("declare after measurement") would let every subsequent test-* sub-proposal silently ratchet the bar downward, file by file, until "90% branches" is a marketing line nothing actually meets. Inverting it now — at the second sub-proposal landing real source — costs little and prevents the drift.

**Alternatives considered:**

- *Defer the threshold until measurement, then round DOWN to nearest 5.* Rejected (above) — lets existing code set the standard.
- *Pick a conservative 70% branches floor up-front.* Rejected — same fault: an arbitrary number with no per-branch defense is still policy-by-guess.
- *Drop the branches metric entirely, gate only on lines+statements+functions.* Rejected — the v8 branches metric, despite noise, catches real misses (untested error paths, untested ternary arms). The right answer is to gate on it and dispose of misses individually.

### Decision 6: `<Button>`'s "`disabled || isLoading` short-circuit" SHALL be tested as a discrete case.

The production code: `disabled={disabled || isLoading}`. This means four input cases:

| `disabled` prop | `isLoading` prop | Rendered `disabled` attribute |
|---|---|---|
| omitted (undefined) | omitted | absent |
| `true` | omitted | present |
| omitted | `true` | present |
| `true` | `true` | present |

The third case (`disabled` omitted but `isLoading` true) is the load-bearing one for the `button-system` loading-state SHALL — a button that is loading MUST be disabled. The first and second are sanity. The fourth is the OR-degenerate case. Tests SHALL cover at minimum cases 1, 2, 3; case 4 is optional but cheap. Each test additionally asserts `aria-busy` (`true` only when `isLoading={true}`) so the loading-state contract is locked.

### Decision 7: Spinner rendering SHALL be asserted by class + structure, not by emoji or icon library.

When `isLoading={true}`, the production code renders:

```jsx
<>
  <span className="btn-spinner" aria-hidden="true" />
  <span className="sr-only">{children}</span>
</>
```

Tests SHALL assert:

- A `.btn-spinner` element exists inside the button (`screen.getByRole('button').querySelector('.btn-spinner')` is not null).
- That element has `aria-hidden="true"` (the spinner is decorative; the busy state is announced via `aria-busy`).
- The children are rendered inside a `.sr-only` wrapper (so they remain available to screen readers via the accessible name even while visually replaced by the spinner).
- The button's accessible name (`toHaveAccessibleName('Save')` when `children='Save'`) is unchanged in the loading state.

**Alternative considered:** *Assert the spinner via a snapshot.* Rejected per the assertion-substance bar; snapshots would lock incidental markup (e.g. attribute ordering) and miss real regressions like a future change that drops the `.sr-only` wrapper.

## Risks / Trade-offs

- **`next/link` mock drift.** If Next 15 changes the `<Link>` public surface in a way that changes the rendered `<a>` shape, the LinkButton tests pass while production-rendered LinkButtons regress. → Mitigation: the mock is one line; any breaking Next upgrade also breaks the LinkButton's production type signature (e.g. `href` prop type), which `tsc --noEmit` catches in the same PR. The E2E coverage in 6.1 + 6.2 will catch a Link rendering regression in real Next.
- **Branches threshold is unknown until first run.** → Mitigation: Decision 5 makes this explicit. Threshold lands in `vitest.config.ts` with a comment naming the source noise; future readers can audit.
- **Test names are verbose.** `PressedFalse_AriaPressedFalseAttribute` reads awkward. → Accepted: the `testing-foundation` `<State>_<Behavior>` rule is unambiguous and the precision pays off in failure-report readability ("which case failed?" is answered by the name alone). The alternative — parameterized tests with interpolated names — is permitted by the spec but adds boilerplate at this small scale.
- **The `<Button>` `type` default is invisible to consumers who don't pass `type`.** A regression here (defaulting to `'submit'` per HTML, accidentally) would silently change form-button behavior. → Mitigation: explicit test asserts the rendered `type` attribute (`expect(button).toHaveAttribute('type', 'button')`) for the omitted case. Failure surfaces as "expected type=button, received type=submit", which names the bug.
- **`forwardRef` resolution is hard to test cleanly.** RTL doesn't expose a `getByRef` helper; the test SHALL render with `const ref = createRef<HTMLButtonElement>()` and assert `ref.current?.tagName === 'BUTTON'` after render. Slightly awkward but reads fine. → Accepted as the canonical pattern for `forwardRef` coverage; subsequent primitive sub-proposals (3.3, 3.4, …) will follow the same.
- **The component test files mark the first time the foundation runs jsdom-mode RTL tests against real source.** If a foundation gap surfaces (missing matcher, env shim, RTL version mismatch), this change hits it first. → Mitigation: same pattern `test-pure-libs` followed — report as a foundation patch bundled in-place if one-line additive, or split as a sibling sub-proposal if structural. The foundation's `test/helpers/setup.ts` already loads `@testing-library/jest-dom/vitest`, so the most likely gap (matchers) is pre-empted.
- **Cognitive-complexity promotion locks the ceiling at 15 for two tiny files.** Realistic measured complexity is ~3 / ~1; the ceiling is effectively unreachable. → Accepted: this is the intended behavior per the testing-foundation spec; the override has near-zero ongoing cost.
