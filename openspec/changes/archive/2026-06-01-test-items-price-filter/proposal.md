## Why

Sub-proposal 4.16 of the `test-coverage` initiative — the price-filter carve-out deferred from `test-items-browser-chrome` §9.6. That carve-out module-mocked `PriceFilterPopover` (Decision 2) and recorded its coverage as owed here, against the existing `items-price-filter` spec. `PriceFilterPopover.tsx` is the single most behavior-dense file in the items toolbar — a trailing-edge debounce, an asymmetric inline-error state machine, a key-remount reset path, and a valid-only close-time flush — yet it currently has **zero** test coverage. This proposal covers it at the universal `COVERAGE_FLOOR` and elevates the latent invariants the existing spec does not yet lock.

The `items-price-filter` capability already has an unusually complete active spec at `openspec/specs/items-price-filter/spec.md` (five requirements, ~20 scenarios covering the debounce, the inverted-pair error timing/movement, the never-commit-invalid guarantee, the key-remount reset, and the Clear/Done footer). This sub-proposal therefore does **not** create a new capability spec; it tests the source against that spec and ADDs only the few invariants the source enforces today that no requirement currently states.

Inherited constraints surfaced by grepping every active spec for the surfaces this file touches (cited so the tests compose them rather than re-owning them):

- **`form-field-system`** — the error MUST flow through `<PriceField error="…">` → `<FieldError>` (the single canonical error display: persistent inline text, linked via `aria-describedby`, **no** `role="alert"`, not rendered when `error` is empty). `PriceField` itself uses cents-as-integer parsing (digits-only string ÷ 100). The tests assert through this plumbing; they do not re-test `PriceField`/`FieldError` internals (owned by 3.3).
- **`popover-trigger-system`** — the trigger surface is a `PopoverTrigger` (count badge renders IFF `count` is a positive number; `active` token). Dismiss is the shared `usePopoverDismiss` hook (closes on outside `mousedown` and on `Escape`). The tests render these for real and assert through them; they do not re-test the primitive or the hook (owned by 3.5).
- **`items-browser-chrome`** — owns the *application* of `price_min`/`price_max` to the items grid (the `displayPrice ∈ [min,max]` test, non-finite-price exclusion, URL-as-source-of-truth, `page` reset). This file's contract stops at the `onApply(min, max)` / `onClear()` callback boundary; the URL/grid effects are out of scope.

## What Changes

- Add one colocated test file, `app/(main)/items/ui/components/__tests__/PriceFilterPopover.test.tsx` (jsdom), covering `PriceFilterPopover.tsx` to `lines:98 / statements:98 / branches:95 / functions:100`.
- Add `PriceFilterPopover.tsx` to the per-file `thresholds` map in `vitest.config.ts` and to the `sonarjs/cognitive-complexity = error` override array in `eslint.config.mjs`, each under a `// test-items-price-filter (sub-proposal 4.16)` comment.
- ADD a small number of latent invariants to the `items-price-filter` spec that pass the three-part elevation test and are not stated by any existing requirement — candidates: (a) the Min input receives focus on open, (b) a bound that resolves to `$0.00` coalesces to "no bound" rather than a zero filter. Final set is fixed by the apply-time invariant-elevation audit; non-elevations are recorded with rationale. No existing requirement is MODIFIED — the existing five requirements match current source.
- Record the carve-out bookkeeping under `testing-foundation` as a Tier-2 (archive-only) delta per the parent's D13 two-tier rollup.

## Capabilities

### New Capabilities

<!-- None. The items-price-filter spec already exists. -->

### Modified Capabilities

- `items-price-filter`: ADD the latent invariants the source enforces today that no current requirement locks (candidates: Min-input autofocus on open; `$0.00` coalesces to an empty/absent bound). ADD-only — no existing requirement is changed. The exact set is finalized by the §9.5 invariant-elevation audit at apply time, against the three-part elevation test.
- `testing-foundation`: Tier-2 (archive-only) carve-out bookkeeping — the `COVERAGE_FLOOR` / complexity-override entry and audit record for this file. Not rolled into the parent accumulator.

## Impact

- **New test file:** `app/(main)/items/ui/components/__tests__/PriceFilterPopover.test.tsx`.
- **Config:** `vitest.config.ts` (one `thresholds` entry), `eslint.config.mjs` (one complexity-override entry).
- **Spec:** `openspec/specs/items-price-filter/spec.md` (ADDED requirement(s) only, per the audit).
- **Source:** none expected. The four-audit obligation may surface a behavior-preserving, single-file in-place refactor (e.g. if a function measures ≥15 cognitive-complexity); the file is never skipped and the floor is never lowered. `PriceFilterPopover.tsx` is ~200 lines with two components and short helpers, so a complexity finding is unlikely but handled per the foundation rule if it occurs.
- **Parent:** checks `test-coverage/tasks.md` §4.16 on archive.
- **Archiver note:** task 4.1 pre-syncs the ADDED `items-price-filter` requirements into the canonical spec during apply (byte-identical to the delta). At archive the sync-state check will report **already synced** — choose **Archive now**, not **Sync anyway**, to avoid a redundant re-apply. (Precedent: `test-items-browser-chrome` task 11.1 did the same and archived with a clean, duplicate-free canonical spec.)
