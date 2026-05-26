## Why

Sub-proposal 3.2 of the `test-coverage` initiative. With `test-button-system` (3.1) and `test-housekeeping` archived, the chip family is the next-smallest primitive carve-out to land: one component file (`Chip.tsx`, ~30 LOC), one pure class composer (`chipClasses.ts`, ~3 effective LOC), and an `index.ts` re-export. The chip primitive is currently governed by a single requirement inside the `button-system` spec ("Removable chips share the button focus/touch contract via `<Chip>` primitive"); the parent `test-coverage` change's §3.2 line explicitly invites elevation to a dedicated `chip-system` spec since none exists yet. Landing this slice tests the second JSX-rendering primitive family under the foundation, elevates the chip's behavior contract to a peer-status capability spec alongside `button-system` / `menu-system` / `popover-trigger-system` / `segmented-control-system`, and unblocks every downstream sub-proposal that asserts on chip-rendered DOM (the items toolbar active-filter chips, the item-form list picker selected-list chips).

Inherited constraints surfaced by spec-grep:

- `testing-foundation` (active delta in `openspec/changes/test-coverage/specs/testing-foundation/spec.md` plus archived deltas from `test-foundation`, `test-foundation-spike`, `test-pure-libs`, `test-button-system`, `test-housekeeping`) — runner (vitest 4.x), four-gate pre-merge, `__tests__/` colocation (per `test-housekeeping`), universal per-file floor `lines:98 / statements:98 / branches:95 / functions:100` (replaces the prior tier table, per `test-housekeeping`), no-backdoor disposition rule (write the test OR `/* v8 ignore */` with named rationale — never lower the floor), `COVERAGE_FLOOR` single-constant rule, `<State>_<Behavior>` `it()` shape, three-role `describe()` convention, four-audit obligation, invariant-elevation audit, assertion-substance bar, `sonarjs/cognitive-complexity` warn-globally / error-per-carve-out policy. Every requirement applies verbatim.
- `button-system` (active spec) — owns the chip primitive today via the requirement "Removable chips share the button focus/touch contract via `<Chip>` primitive". The scenarios there name (a) active-filter chip in items toolbar, (b) selected-list chip in item-form list picker, (c) keyboard focus indicator on the × meets WCAG 1.4.11 against the same `--btn-*` token surface, (d) `.items-toolbar-chip` and `.if-lp-chip` legacy classes removed. This proposal MOVES that requirement to the new `chip-system` spec verbatim (no behavior change) and adds elevated SHALLs covering the call-time contract the tests lock against. Cross-spec touchpoints from `button-system` that stay there: the `sm`-size opt-out citing chips as a valid context (Requirement: "Small-size button opt-out with documented spacing") — that requirement governs `<Button size="sm">`, not the chip primitive, and stays in `button-system`.
- `popover-trigger-system` (active spec) — references `.if-lp-chip` ("already absorbed by `standardize-buttons`'s Chip primitive") in its inline-list-picker scenario. That reference is correct as-is and is unaffected by the move; the chip absorption already happened.
- `list-item-management` — refers to "buy-link chip" as a CSS treatment owned by `item-store-links`. That is a different chip-like shape (anchor styled as a pill), NOT the `<Chip>` primitive. Out of scope.
- `home-digest` — refers to "occasion chip" as a span styled with chip-like colors on home-rail cards. Different element, not the `<Chip>` primitive. Out of scope.
- `list-visibility`, `following`, `server-endpoint-authorization`, `list-item-management` — these specs reference DOM that may *contain* `<Chip>` at the call site (toolbar filters, list pickers) but their authorization / state semantics are not part of this carve-out. No transitive SHALLs apply.

Cross-cutting design-system rule applies (chip is an interactive surface): this proposal is a spec modification, NOT a page-scoped one-off. The chip primitive's contract is elevated into a new `chip-system` capability spec; the button-system spec is modified to remove the now-redundant chip requirement (its content migrates verbatim into chip-system). No new variant, size, or sibling primitive is added. Cache-tag rule does NOT apply (no server reads).

## What Changes

- **NEW** test files in `__tests__/` directories colocated with the carve-out (per `test-housekeeping`'s relocated convention):
  - `app/ui/components/chip/__tests__/Chip.test.tsx` — jsdom + RTL render assertions covering:
    - (a) Renders a `<span class="chip">` whose first child is the chip body content and whose last child is the remove `<button class="chip-remove">`.
    - (b) `chipClasses` wiring: `className` prop forwarded as `extra` and appended to `'chip'` on the wrapper span.
    - (c) Remove-button `type` is `"button"` (NOT the browser default `"submit"`); a `<Chip>` nested in a `<form>` SHALL NOT submit when its × is clicked.
    - (d) `aria-label` derivation when `removeLabel` is omitted: string children → `Remove ${children}`; non-string children (e.g. a React element) → `'Remove'`. Three discrete cases.
    - (e) `aria-label` override: `removeLabel="custom"` overrides both string-children and element-children defaults.
    - (f) `onRemove` callback invoked exactly once when the × is clicked.
    - (g) Click on × calls `e.stopPropagation()` — the canonical contract preventing chip-row container click handlers from firing when the user is removing a single chip. Asserted by rendering `<div onClick={spy}><Chip onRemove={removeSpy}>X</Chip></div>` and confirming `spy` was NOT called after clicking the × (the only path here is stopPropagation; a regression that drops it would surface as `spy` being called).
    - (h) `disabled={true}` → the rendered remove `<button>` is disabled; clicking it does NOT invoke `onRemove` (HTML-spec native behavior); `aria-label` is unchanged.
    - (i) `disabled={false}` and `disabled` omitted → the remove button is not disabled.
    - (j) Children render as content of the wrapper `<span>` (text content `toHaveTextContent(...)`); element children (e.g. `<span>Foo</span>`) render their full subtree.
    - (k) Repeated calls — multiple chips rendered side-by-side maintain independent `onRemove` wiring (no shared-closure regression).
  - `app/ui/components/chip/__tests__/chipClasses.test.ts` — pure node test (`.test.ts` runs under the node project per `vitest.config.ts`):
    - `chipClasses()` (no args) returns `'chip'`.
    - `chipClasses({})` returns `'chip'`.
    - `chipClasses({ extra: 'foo' })` returns `'chip foo'` (exact string, in order).
    - `chipClasses({ extra: 'a b c' })` returns `'chip a b c'` (multi-token extra preserved verbatim).
    - `chipClasses({ extra: '' })` returns `'chip'` (empty-string `extra` filtered by the `.filter(Boolean)` guard).
    - `chipClasses({ extra: undefined })` returns `'chip'` (explicit `undefined` filtered).

- **NO** test for `index.ts` — re-export only, zero executable statements after TS erasure. Excluded under the `app/ui/components/*/index.ts` pattern already in `vitest.config.ts`'s `coverage.exclude` (no change needed).
- **NO** `types.ts` file in this carve-out (Chip has no separate types module; the `ChipProps` type is inline in `Chip.tsx`).
- **NEW** ESLint override in `eslint.config.mjs`: extend the per-file `sonarjs/cognitive-complexity = error` override block to include `app/ui/components/chip/Chip.tsx` and `app/ui/components/chip/chipClasses.ts`. Both files are tiny (measured complexity ~2 on Chip — one nullish-coalesce and one `typeof` ternary; ~1 on chipClasses). Override locks the ceiling.
- **NEW** per-file thresholds in `vitest.config.ts` for the two new files, referencing the existing `COVERAGE_FLOOR` constant (one entry each — NO per-file numeric variation, per `test-housekeeping`'s single-constant rule).
- **NEW** capability spec at `openspec/specs/chip-system/spec.md` — created via this change's spec delta. Contains:
  - The verbatim "Removable chips share the button focus/touch contract" requirement and its four scenarios, moved out of `button-system`.
  - NEW requirement elevating the call-time contract the tests lock against: remove-button has `type="button"`, calls `e.stopPropagation()` on click before invoking `onRemove`, derives an `aria-label` from `removeLabel ?? (typeof children === 'string' ? \`Remove ${children}\` : 'Remove')`, and respects `disabled` as native passthrough.
  - NEW requirement: the chip wrapper SHALL be a non-interactive `<span>` with a `<button>` child for removal — never the inverse (chip-as-button containing a label). This locks the "two interactive concerns" decision recorded as the chip's reason-for-being in `button-system`.
- **MODIFIED** `button-system` spec — REMOVES the now-orphaned "Removable chips share the button focus/touch contract via `<Chip>` primitive" requirement (its content migrates verbatim into chip-system). The `sm`-size opt-out requirement, which mentions chips as a valid spacing-exception context, STAYS — that requirement governs `<Button size="sm">`, not the chip primitive.
- **MODIFIED** `testing-foundation` (active delta in `test-coverage`) — adds a bookkeeping requirement parallel to test-button-system's: the chip-system primitive carve-out (`Chip.tsx`, `chipClasses.ts`) has landed at the universal `COVERAGE_FLOOR`, the `sonarjs/cognitive-complexity` promotion to `error` is in effect for those files, and subsequent sub-proposals consuming `<Chip>` inherit the assumption that those modules are tested and complexity-locked.
- **NEW** four-audit findings recorded in `tasks.md`. Carve-out is small; expected dispositions are "no finding" for duplication and complexity, "no finding" or minor in-place observation for testability, full assertion-substance pass on the new tests.
- **NO source refactors expected.** `Chip.tsx` is testable as-shipped; its branches (label derivation + disabled passthrough) are observable from rendered DOM.

## Capabilities

### New Capabilities

- `chip-system`: Governs the `<Chip>` primitive at `app/ui/components/chip/` — its DOM shape (non-interactive wrapper + interactive remove-button child), the chip-class composer (`chipClasses({ extra })`), the focus/touch contract inherited from the button system's `--btn-*` token surface, the `aria-label` derivation rule, the `e.stopPropagation()` click contract, and the `disabled` passthrough. Replaces the chip section that previously lived inside `button-system` (its scenarios are moved verbatim, with additions for the elevated call-time contract).

### Modified Capabilities

- `button-system`: REMOVES the "Removable chips share the button focus/touch contract via `<Chip>` primitive" requirement and its scenarios, which migrate verbatim to the new `chip-system` spec. No behavior change to any `<Button>` / `<LinkButton>` contract.
- `testing-foundation`: ADDS a bookkeeping requirement recording the chip-system primitive carve-out is covered at the universal `COVERAGE_FLOOR`, that `sonarjs/cognitive-complexity` is promoted to `error` for `Chip.tsx` and `chipClasses.ts` in `eslint.config.mjs`, and that downstream sub-proposals inherit those guarantees. Standard archive-time bookkeeping per the testing-foundation authority-over-coverage-state rule.

## Impact

- **New files:** two test files (one for `Chip.tsx` in jsdom, one for `chipClasses.ts` in node) and one new spec at `openspec/specs/chip-system/spec.md` (created at archive time from this change's spec delta). No new test helpers — both files use facilities already wired by the foundation (RTL + jsdom + jest-dom matchers for the `.tsx`; plain vitest for the `.ts`). No `next/link` mock needed (Chip renders a native `<span>` and `<button>`, not a routed link).
- **Modified config:** `eslint.config.mjs` gains two paths in the per-file override array (`Chip.tsx`, `chipClasses.ts`). `vitest.config.ts` gains two entries in the `thresholds` map (`app/ui/components/chip/Chip.tsx`, `app/ui/components/chip/chipClasses.ts`), each pointing at the existing `COVERAGE_FLOOR` constant.
- **Modified source:** none expected. Any audit finding requiring source change is recorded with disposition in `tasks.md`; refactor-in-place commits become part of this change.
- **Modified specs:** `openspec/specs/button-system/spec.md` (one requirement removed, migrating to chip-system); a new `openspec/specs/chip-system/spec.md` (created at archive). The active `test-coverage` change's `testing-foundation` delta gains the chip carve-out bookkeeping requirement.
- **CI:** the existing four-gate workflow runs unchanged; the `test` job runtime grows by the two new files (one jsdom render + one pure-node test, expected sub-second per file).
- **Dependencies:** none added.
- **Downstream unblock:** the parent `test-coverage` change's checkbox for sub-proposal 3.2 flips on archive. Capability-flow sub-proposals that assert on chip-rendered DOM (4.5 `test-items-browser-chrome` for the items toolbar active-filter chips; 4.9 `test-list-item-management` for the item-form list picker selected-list chips) benefit from the chip primitive being a known-good module with its contract elevated to a peer spec.
- **Risk:** low. Component is thin, behavior is fully observable from rendered DOM, no DB, no server actions, no cross-cutting refactors. Realistic miss: failing to model the three-case `aria-label` derivation (string children → `Remove ${children}`; non-string children → `'Remove'`; explicit `removeLabel` overrides both). The new chip-system spec is explicit on this and the test names each case as a discrete `<State>_<Behavior>` `it()`. Secondary risk: the `e.stopPropagation()` contract is invisible from the chip's own rendered DOM — it surfaces only when a parent click handler is also wired. The Chip.test.tsx asserts it via a parent-spy harness; a regression that drops `.stopPropagation()` fails that specific test by name.
- **No runtime behavior change.**
