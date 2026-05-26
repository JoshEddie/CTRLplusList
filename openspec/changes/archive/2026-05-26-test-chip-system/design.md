## Context

Sub-proposal 3.2 of the `test-coverage` initiative. The `testing-foundation` capability is established and has been hardened by `test-housekeeping`: `__tests__/` colocation is now the convention, the universal per-file floor is `lines:98 / statements:98 / branches:95 / functions:100` referenced from a single `COVERAGE_FLOOR` constant in `vitest.config.ts`, the no-backdoor disposition rule is in effect (write the test OR `/* v8 ignore */` with named rationale — never lower the floor), and `test-button-system` (3.1) proved the foundation works against a real JSX-rendering primitive family. This change is the second such primitive carve-out — the chip family — and the first that elevates a chip-specific contract into a new dedicated capability spec (`chip-system`) rather than asserting against an existing one.

Carve-out (per parent `test-coverage` tasks.md §3.2):

| File | LOC | Char | Tested how |
|---|---|---|---|
| `app/ui/components/chip/Chip.tsx` | ~33 | Plain function component (no `forwardRef`); wraps children + remove `<button>` in a `<span>`; derives `aria-label` via `removeLabel ?? (typeof children === 'string' ? \`Remove ${children}\` : 'Remove')`; click handler calls `e.stopPropagation()` then `onRemove()`; delegates wrapper-class composition to `chipClasses` | jsdom + RTL render assertions |
| `app/ui/components/chip/chipClasses.ts` | ~3 effective | Pure helper: `['chip', extra].filter(Boolean).join(' ')` | Plain node test (`.test.ts` under the node project) |
| `app/ui/components/chip/index.ts` | 2 | Re-exports `Chip` and `chipClasses` | Excluded — re-export only; already covered by the `app/ui/components/*/index.ts` glob in `vitest.config.ts`'s `coverage.exclude` |

Coverage floor: universal `COVERAGE_FLOOR` per `test-housekeeping` (98 / 98 / 95 / 100). Per-file thresholds are added by-name in `vitest.config.ts`, referencing the constant (no per-file numeric variation — single-constant rule).

Bound by:
- `testing-foundation` — `__tests__/` colocation, universal `COVERAGE_FLOOR`, no-backdoor rule, four-gate pre-merge, four-audit + invariant-elevation obligations, assertion-substance bar, complexity ≤ 15, `<State>_<Behavior>` shape, three-role `describe()`, observable-behavior-over-execution.
- `button-system` — currently owns the chip primitive's "focus / touch contract" requirement. This proposal moves that requirement verbatim to the new `chip-system` spec and removes it from `button-system`. The `sm`-size opt-out requirement (which references chips as a valid context for `<Button size="sm">`) stays in `button-system` — it governs button sizing, not the chip primitive.
- `chip-system` (NEW) — created by this change. Owns the chip primitive's behavior contract end-to-end (DOM shape, class composer, focus / touch contract, `aria-label` derivation, `e.stopPropagation()` click semantics, `disabled` passthrough). Becomes the authoritative spec the tests assert against.

## Goals / Non-Goals

**Goals:**

- Land two colocated test files (`Chip.test.tsx` in jsdom, `chipClasses.test.ts` in node) at the universal `COVERAGE_FLOOR` for `Chip.tsx` and `chipClasses.ts`.
- Exercise every observable branch of each file — no execute-for-coverage renders, no tautological assertions, no snapshot-only tests.
- Promote `sonarjs/cognitive-complexity` from `warn` to `error` for `Chip.tsx` and `chipClasses.ts` via `eslint.config.mjs` per-file overrides.
- Create the `chip-system` capability spec, migrating the chip requirement out of `button-system` verbatim and adding elevated SHALLs for the call-time contract (label derivation, stopPropagation, type=button, disabled passthrough, two-interactive-concerns DOM shape).
- Complete the four-audit obligation (duplication / complexity / testability on source; assertion audit on the new tests) AND the invariant-elevation audit, recording dispositions in `tasks.md`.

**Non-Goals:**

- No source refactors anticipated. `Chip.tsx` is testable as-shipped; every branch surfaces as observable DOM under render.
- No coverage of `index.ts` (excluded by the existing `app/ui/components/*/index.ts` glob in `coverage.exclude`).
- No new variants, no new sizes, no new sibling primitive. The chip primitive's surface is unchanged.
- No e2e. Component-level integration belongs to capability-flow sub-proposals (4.5 `test-items-browser-chrome`, 4.9 `test-list-item-management`).
- No re-test of `buttonClasses.ts` (covered by `test-pure-libs` 2.1; chip uses the same `--btn-*` token surface but composes its own wrapper class via `chipClasses`).
- No DOM-snapshot tests. Every assertion names a specific attribute, class string, accessible name, or rendered element.
- No real Next router needed — chip renders native `<span>` and `<button>`, never `<Link>`.

## Decisions

### Decision 1: Create a dedicated `chip-system` spec; move the existing chip requirement out of `button-system` verbatim.

The parent `test-coverage` tasks.md §3.2 line is explicit: "Elevate to chip-system spec if one exists, else create one as part of this proposal." It does not exist; this proposal creates it. The motivation is twofold:

- **Parity with the rest of the design system.** Every other primitive family has its own spec (`button-system`, `menu-system`, `popover-trigger-system`, `segmented-control-system`, `form-field-system`, `loading-indicator-system`). The chip primitive is currently the lone exception, governed by a single requirement nested inside `button-system`. The "shared with button-system" arrangement was a stub from `standardize-buttons` — the chip primitive is a sibling component, not a button variant (the requirement itself says "`<Chip>` is a separate component, not a `<Button>` variant"). Putting the chip in its own spec matches the actual code structure (`app/ui/components/chip/` is a peer of `app/ui/components/button/`).
- **Test-side clarity.** The invariant-elevation audit (per `testing-foundation`) asks each sub-proposal to evaluate whether non-trivial invariants belong in capability SHALLs. The chip's call-time contract (label derivation, stopPropagation, disabled passthrough, type=button) is non-obvious from the JSX, survives reimplementation, and protects real failure modes (a wrong default label is an accessibility regression; missing stopPropagation breaks the items-toolbar use case). These belong as SHALLs. Adding them to `button-system` muddies that spec's purpose; adding them to a dedicated `chip-system` spec keeps each spec coherent.

The existing `button-system` requirement ("Removable chips share the button focus/touch contract via `<Chip>` primitive") and its four scenarios MOVE verbatim into `chip-system`. Their content is unchanged — only the home spec is. This is a pure relocation; no behavior change. The `button-system` spec delta REMOVES the requirement.

**Alternatives considered:**

- *Leave the chip requirement in `button-system` and add new chip SHALLs there.* Rejected — preserves the structural mismatch (chip-as-sibling vs spec-as-button-section) and grows `button-system` to cover a non-button primitive.
- *Add a new `chip-system` spec containing only the elevated call-time SHALLs, leaving the existing chip requirement in `button-system`.* Rejected — two specs would overlap on chip ownership. Future readers would have to consult both, and a future chip change would have to decide which spec to modify. One owner per primitive is the cleanest rule.
- *Defer the chip-system spec creation to a separate change (a stand-alone "extract chip from button-system" refactor) and just add testing-foundation bookkeeping here.* Rejected — the parent `test-coverage` tasks.md §3.2 invites the elevation as part of THIS sub-proposal ("else create one as part of this proposal"). Splitting it doubles the spec-edit overhead for no gain; the move is a no-behavior-change verbatim relocation that comfortably fits inside the carve-out.

### Decision 2: Test `chipClasses.ts` as a pure node test (`.test.ts`), not as a jsdom test (`.test.tsx`).

`chipClasses` is a pure string-composer: `['chip', extra].filter(Boolean).join(' ')`. It has no JSX, no DOM, no React. Per the foundation's two-project split in `vitest.config.ts` — `.test.tsx` runs under jsdom (with the React plugin and RTL setup), `.test.ts` runs under node (no DOM) — the natural home for a pure-string helper is the node project. This mirrors `test-pure-libs`'s treatment of `buttonClasses.ts` (also a `.test.ts` under the node project).

**Alternatives considered:**

- *Test `chipClasses` inside `Chip.test.tsx`.* Rejected — bundles a pure-helper test into a render harness it doesn't need; loses the `.test.ts` / `.test.tsx` project split's clarity; the helper is independently exported and consumed (the chip wrapper uses it; future call sites may too), so it deserves its own assertion surface.
- *Skip `chipClasses` and test it transitively via `Chip.test.tsx`.* Rejected — would not hit the universal `COVERAGE_FLOOR` for the helper file as a separate unit (vitest's coverage is per-source-file). Even if it would pass coverage, the `chipClasses({ extra: '' })` and `chipClasses({ extra: undefined })` branches are awkward to reach from a render test (the chip never passes `extra: ''` or `extra: undefined` from its own render — only `extra: className` where `className` could be undefined; the empty-string case is unreachable without a direct invocation).

### Decision 3: `aria-label` derivation SHALL be tested as three discrete cases, not collapsed.

The production code: `const label = removeLabel ?? (typeof children === 'string' ? \`Remove ${children}\` : 'Remove');`. This produces three distinct outputs:

- `removeLabel` provided → label is `removeLabel` (overrides everything)
- `removeLabel` omitted + string children (e.g. `<Chip onRemove={…}>Foo</Chip>`) → label is `Remove Foo`
- `removeLabel` omitted + non-string children (e.g. `<Chip onRemove={…}><Tag /></Chip>`) → label is `Remove`

Each case is a separate accessibility contract:

- The string-children path is the canonical case for filter chips and selected-list chips (the visible label IS a string). The default `Remove ${children}` is the announcement the screen reader user expects.
- The non-string-children path is a defensive fallback (the chip could be passed an icon or composed element; the JS `typeof` check guards against `Remove [object Object]` regressions when the template literal would otherwise stringify a React element).
- The override path is the escape hatch — call sites that need a custom label (e.g. translated text, or "Clear filter X" framing) can pass `removeLabel` explicitly.

Three discrete `<State>_<Behavior>` `it()` cases:

- `RemoveLabelProvided_AriaLabelIsRemoveLabel`
- `RemoveLabelOmittedChildrenString_AriaLabelIsRemovePlusChildren`
- `RemoveLabelOmittedChildrenElement_AriaLabelIsRemove`

Collapsing any two would lose the contract. The chip-system spec scenarios mirror this three-case enumeration.

**Alternatives considered:**

- *Parameterize via `it.each(...)` over a `[input, expected]` table.* Acceptable per `testing-foundation`'s shape rule (the spec accepts parameterized tests as long as the generated names match `<State>_<Behavior>`). Three discrete tests read cleaner in failure output and match the three-distinct-paths nature of the code. Pick whichever lands; the contract is unambiguous either way.

### Decision 4: `e.stopPropagation()` SHALL be tested via a parent-spy harness, not by mocking the event.

The chip's click handler:

```tsx
onClick={(e) => {
  e.stopPropagation();
  onRemove();
}}
```

The `stopPropagation()` call is invisible from the chip's own rendered DOM. There are two reasonable ways to test it:

- **(a) Spy on the event:** `userEvent.click(removeBtn)` with a custom event object whose `stopPropagation` is a `vi.fn()`. Rejected — couples the test to event internals; doesn't exercise the actual contract (preventing a bubbled click from reaching a parent handler).
- **(b) Parent-spy harness:** render the chip inside a `<div onClick={parentSpy}>`, click the ×, assert `parentSpy` was NOT called. The intent of `stopPropagation` IS to prevent parent handlers from firing; the test asserts that intent directly. Chosen.

The corresponding chip-system spec scenario reads in the same parent-spy terms — "WHEN the × is clicked, THEN the parent's click handler does NOT fire". The contract under spec is observable, not implementation.

**Alternatives considered:**

- *Test that `stopPropagation` exists in the click handler via source-level inspection.* Rejected — tautological (asserts the code is the code).
- *Defer the assertion to the items-toolbar capability-flow sub-proposal (4.5) where a parent click handler exists in production.* Rejected — the contract is owned by the chip primitive, not by any single call site. Locking it at the primitive level is cheaper and surfaces regressions earlier.

### Decision 5: `disabled` semantics SHALL be locked as native HTML passthrough; no custom "disabled chip click ignored" middleware.

The production code forwards `disabled` directly to the remove `<button>`: `disabled={disabled}`. Per HTML, a `<button disabled>` does not dispatch `click` events. The chip-system spec SHALL phrase this as "WHEN `disabled` is true, the × does NOT invoke `onRemove`" — but the *mechanism* is HTML, not chip-level guarding. The test asserts the observable: render `<Chip disabled onRemove={spy}>`, click the ×, assert `spy` not called. No need to test "but it would be called if we removed the HTML guard" — that's a hypothetical, not a contract.

**Alternatives considered:**

- *Test that `onRemove` is wrapped in a `disabled` guard inside the chip.* Rejected — would lock the test to a specific implementation choice. The observable contract is "disabled chip × does not invoke onRemove"; multiple implementations satisfy that.

### Decision 6: Branches floor stays at the universal `COVERAGE_FLOOR` (95%); gaps SHALL be closed by tests, refactor, or `/* v8 ignore */` with named rationale — NOT by relaxing the floor.

Per `test-housekeeping`'s no-backdoor rule. Each branch v8 flags as uncovered has three dispositions in order of preference:

- **(a) Write a test.** Default.
- **(b) Refactor the source** (within the carve-out) to remove the awkward branch.
- **(c) `/* v8 ignore next */` annotation with a one-line rationale comment** for the specific uncoverable region (e.g., a defensive fallback that the production caller path can never reach but the type signature allows).

Lowering the per-file floor (option (d) from the old policy) is NO LONGER acceptable. Each disposition (and which option was chosen) SHALL be recorded in `tasks.md`.

Expected measured branches on `Chip.tsx`:

- Branch 1: `removeLabel ?? …` nullish-coalesce — two arms (provided / omitted). Both covered by Decision 3's three cases.
- Branch 2: `typeof children === 'string' ? \`Remove ${children}\` : 'Remove'` ternary — two arms (string / non-string). Both covered by Decision 3.
- Branch 3: `disabled` passthrough — `disabled={true | false | undefined}`. Three observable cases; v8 may count `disabled` short-circuits depending on JSX compile output.

`chipClasses.ts`:

- Branch 1: `.filter(Boolean)` on `[ 'chip', extra ]` — the `extra` slot has three input cases (present truthy / present falsy / absent). All covered by the six `chipClasses.test.ts` cases.

No surprise branches anticipated. If v8 flags anything unexpected, the disposition path is recorded per the no-backdoor rule.

### Decision 7: No new test helpers shared with `app/ui/components/button/__tests__/test-helpers.ts`.

`test-button-system` extracted `VARIANTS` + `cap()` into `app/ui/components/button/__tests__/test-helpers.ts` because three test files consumed the same scaffold. The chip carve-out has two files (one component, one helper) and shares no scaffold with the button family (chip has no variants, no size axis, no `cap()` formatting). No new shared helpers are warranted. If a duplication finding surfaces during the §7 audit, the disposition follows the standard preference order — accept as test-file-local (≤2 use sites) or extract to `app/ui/components/chip/__tests__/test-helpers.ts` (≥3 use sites, excluded via `coverage.exclude`'s existing `**/__tests__/**` glob).

## Risks / Trade-offs

- **Moving the chip requirement out of `button-system` could cause a future reader to look for chip behavior in the wrong spec.** → Mitigation: the move is verbatim relocation; the `chip-system` spec carries the exact scenarios. A grep for "chip" in `openspec/specs/` after the move surfaces the chip-system spec immediately. The `button-system` spec is not chip-aware after the move; no orphan reference is left behind.
- **The `popover-trigger-system` spec mentions `.if-lp-chip` parenthetically ("already absorbed by `standardize-buttons`'s Chip primitive").** That reference is correct as-is and unaffected by this change; the historical mention stays accurate. → No action needed.
- **`Chip.tsx`'s `aria-label` fallback `'Remove'` (when children is a non-string element) is generic and might be insufficient for accessibility on icon-only chip contents.** This is a real UX concern but pre-existing; it was inherited from `standardize-buttons` and is not a regression introduced by testing. → Recorded as an invariant-elevation finding to discuss, but the test SHALL lock the current contract (the spec change is out of this carve-out's scope; the fallback's adequacy belongs to a separate chip-UX change).
- **`disabled` passthrough relies on HTML's native click-suppression on `<button disabled>`.** A future change that wraps the `<button>` in a non-disabled element (e.g. a `<div>` for layout reasons) would silently break the disabled contract. → Mitigation: the chip-system spec scenario phrases the contract in observable terms ("the × does NOT invoke `onRemove`"), and the test exercises it end-to-end. A regression that swaps `<button>` for `<div>` would fail the "disabled chip × does not fire onRemove" test by name.
- **`stopPropagation()` is an unusual contract for a primitive — most primitives don't make assumptions about parent click handlers.** The chip exists in two production call sites (items toolbar and item-form list picker) where the parent IS clickable; the stopPropagation prevents the chip's × from triggering the parent. → Accepted: this is a deliberate, load-bearing contract of the chip primitive. Documenting it as a SHALL in `chip-system` makes the assumption explicit; the parent-spy test (Decision 4) locks it. A future call site where stopPropagation is undesired would have to either pass a wrapper or extend the chip primitive — neither is silent.
- **This is the first carve-out that creates a brand-new capability spec while testing.** → Mitigation: the spec content is migration-from-button-system (no new behavior; verbatim relocation) plus elevation of existing-in-code SHALLs. The risk surface is "did the move preserve the original scenarios exactly?" — verifiable by diffing the four scenarios between `button-system.md` (before) and `chip-system.md` (after).
- **Cognitive-complexity promotion locks the ceiling at 15 for two tiny files.** Realistic measured complexity is ~2 on Chip (one nullish-coalesce, one ternary) and ~1 on chipClasses (one filter+join). The ceiling is effectively unreachable. → Accepted: same trade-off as `test-button-system` — the override has near-zero ongoing cost and locks the ceiling for future edits.
