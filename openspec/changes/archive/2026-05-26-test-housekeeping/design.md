## Context

`test-coverage` (the parent change, 3/36 complete) is establishing the test suite as a series of carve-out sub-proposals. The first two carve-outs (`test-pure-libs`, `test-button-system`) introduced three pieces of drift between code and the in-flight `testing-foundation` spec delta:

1. **Test file location.** `test-button-system` placed new tests under a `__tests__/` directory, `TESTING.md` was updated to describe this convention, but the in-flight `testing-foundation` spec delta still mandates `<source>.test.<ext>` (e.g., `Button.tsx` → `Button.test.tsx`). The next sub-proposal inherits a contradiction.
2. **Six straggler tests.** Pre-convention tests still sit alongside their production siblings (`lib/{visibility,listAccess,sqlstate}.test.ts`, `hooks/use-media-query{,.server}.test.{tsx,ts}`, `app/ui/components/button/buttonClasses.test.ts`).
3. **Tiered coverage thresholds.** The current spec rationalizes per-file floors as a five-tier table (95 pure / 90 primitive / 80 DAL+actions+routes / 60 page UI / 60 page entries). In `vitest.config.ts` the seven enumerated files take **different** floor values (`95/95/95/80`, `90/90/90/90`, `95/90/80/50`, etc.) — there is no shared constant, and `functions` is below 100% on every file. The combination of tiered class + per-file numeric variation makes the floor a moving target.

This sub-proposal lands the housekeeping that closes those three loops before the remaining 33 carve-outs cement them.

**Files in scope (every change is to one of these or to the parent `test-coverage` spec delta):**

| File | Role |
|---|---|
| `openspec/changes/test-coverage/specs/testing-foundation/spec.md` | The in-flight spec delta being amended (via this change's own delta). Two MODIFIED requirements, two ADDED requirements. |
| `vitest.config.ts` | Hoist `COVERAGE_FLOOR` constant; refactor seven per-file entries; add `lib/sqlstate.ts`; add `**/__tests__/**` to `coverage.exclude`. |
| `lib/{visibility,listAccess,sqlstate}.test.ts` → `lib/__tests__/<name>.test.ts` | Move + fix imports (`./X` → `../X`). |
| `hooks/use-media-query{,.server}.test.{tsx,ts}` → `hooks/__tests__/<name>` | Move + fix imports. |
| `app/ui/components/button/buttonClasses.test.ts` → `.../button/__tests__/buttonClasses.test.ts` | Move + fix imports (existing `./__tests__/test-helpers` becomes `./test-helpers` since the test is now *inside* `__tests__/`). |
| Gap-closure surface (test additions OR `/* v8 ignore */` annotations) | Whatever it takes to make every enumerated file pass the universal floor. |

**Out of scope:** any other `test-coverage` sub-proposal (3.x, 4.x, 5.x, 6.x). Any change to the `<State>_<Behavior>` `it()` shape, the three-role `describe()` convention, the four-audit obligation, the assertion-substance bar, the mocking-boundary rules, the seed-as-fixture rules, the cognitive-complexity ramp, or any other `testing-foundation` requirement not enumerated in this change's spec delta.

## Goals / Non-Goals

**Goals:**

- Bring the `testing-foundation` spec delta into alignment with reality on test-file location (`__tests__/` is the rule, matching `TESTING.md` and existing code).
- Establish ONE universal coverage floor — `lines: 98, statements: 98, branches: 95, functions: 100` — applying to every enumerated file regardless of class. Functions = 100% is the headline invariant; the rest define the rest of the bar.
- Lock the floor against backdoor erosion: write the test, or `/* v8 ignore */` with named rationale; never lower the floor.
- Make `vitest.config.ts` readable in one pass: one `COVERAGE_FLOOR` constant, every per-file entry references it.
- Relocate the six pre-`__tests__/` test files; close the gap to a clean repo-wide convention.
- Bring every currently-enumerated file up to the new floor (test additions or annotated excludes — recorded individually).
- Add `lib/sqlstate.ts` to the threshold enumeration (currently has tests but no floor).
- Preserve the parent change's flight model: enumerated-only enforcement during flight, universal at `test-coverage` archive.

**Non-Goals:**

- No new test infrastructure. No RTL changes, no new runner, no MSW, no Playwright surface.
- No new excludes beyond `**/__tests__/**` (the `__tests__/`-directory exclude that paired with the rule). The narrow-`index.ts`-barrel exclude rule (no `**/index.ts`) is encoded in the spec but its existing config is unchanged.
- No tests for files outside the seven-file enumeration. Every other file is some other sub-proposal's carve-out.
- No source refactors beyond what gap-closure requires. If `use-media-query.ts` is genuinely hard to test, the disposition is `/* v8 ignore */` + rationale — NOT a rewrite to make it more testable. Testability refactors belong in this carve-out's owning sub-proposal (`test-pure-libs`, archived), not here.
- No promotion of `testing-foundation` to a top-level spec. Promotion happens when `test-coverage` archives at task 7.3.
- No `TESTING.md` rewrite. The doc is already correct on `__tests__/`; this change brings the spec into agreement, not the doc.
- No CI workflow change. Four-gate pre-merge runs unchanged.

## Decisions

### Decision 1: `__tests__/` over flat colocation.

The convention was decided implicitly by `test-button-system` (which placed `Button.test.tsx` / `LinkButton.test.tsx` under `__tests__/`) and documented in `TESTING.md`. This change ratifies that decision in the spec. **Why `__tests__/` over flat:** source-directory listings stay focused on production files when reading a feature; multiple tests for one module group together; local test helpers (`test-helpers.ts`) sit next to the tests that use them without polluting the parent listing; `vitest.config.ts`'s `**/__tests__/**` exclude is a single glob that handles every test-only artifact (test files, local helpers, fixture data) in one stroke.

**Alternatives considered:**

- *Flat colocation (`Button.tsx` next to `Button.test.tsx`).* Rejected — the in-flight spec's original choice. The reason the spec chose flat was "minimal indirection," but the reality after one carve-out is that flat puts test-only modules (`test-helpers.ts`) into the parent directory and breaks the single-glob exclude. The `__tests__/` directory pays a tiny indirection cost (one `..` in the import) for a much cleaner directory listing and a single exclude rule.
- *Separate top-level test root (`tests/<mirrored-path>/Button.test.tsx`).* Rejected — destroys colocation. Editing a component would require navigating away to find its tests; tests fall behind code more easily.
- *Both supported.* Rejected — the whole point of housekeeping is to pick one and enforce it. Two conventions means two reviewer-attention rules.

### Decision 2: Single universal floor over the tiered table.

The original tiered table reflected a testing-ROI argument: pure logic is cheaper to test thoroughly than a page entry, so allow a lower floor on page entries. **The problem with that argument in practice:** a 60% floor on `app/(main)/**/page.tsx` and a 60% floor on `app/(main)/**/ui/` means roughly half of the user-visible UI surface is gated only at "exercise some lines." Page UI has branching for visibility states, auth states, loading states, empty states — exactly the conditional logic where untested means untested-when-it-matters.

The values question is: do tests exist to *enforce a quality bar* or to *document what's already known to work*? The user's directive — "we have to be strict about coverage or it might as well not be there" — picks the first. A universal floor expresses the picked answer in code: every file meets the same bar, and the ROI question shifts from "what tier does this file go in" to "is this file worth keeping if I'm not willing to test it." That second question is the one we want contributors asking.

**Alternatives considered:**

- *Keep tiered, raise the floors (e.g., 95 / 90 / 85 / 80 / 80).* Rejected — preserves the framing that some files deserve a lower bar. Tightening the numbers doesn't address the philosophical concession.
- *Single floor at a lower bar (e.g., 90 across the board).* Rejected — 90% on `functions` allows every-tenth-function untested; on a file with 5 functions that's a complete entry-point missing. The user's directive is explicitly "tighter is better."
- *Single floor on functions = 100, tiered floors on the other three metrics.* Rejected — partially considered as a compromise during exploration; rejected because the constants approach is cleaner with one constant than with one-per-tier.

### Decision 3: `lines: 98, statements: 98, branches: 95, functions: 100` specifically.

Each number defends a different invariant:

- **`functions: 100`** is the headline. An uninvoked exported function is a complete behavior with zero tests. The cost of enforcement is: write one test that calls it, or delete the function. Both are correct outcomes.
- **`lines: 98` / `statements: 98`** allow ≤2% slack per file for genuinely-unreachable defensive code (`throw new Error('unreachable')` after exhaustive switch, SSR fallback branches in jsdom, framework-guard branches). Below 95 starts to allow real gaps; 98 forces the contributor to choose: write the test or annotate.
- **`branches: 95`** is the loosest because v8 counts branches it shouldn't (default exports, optional-chaining defaults like `??` and `?.`, JSX conditional rendering). 95 reflects v8's known over-count. If v8 ever stops over-counting, this floor can ratchet up.

These exact numbers come from the user's other project, where they've been load-bearing for long enough to be considered tested. Adopting them verbatim avoids relitigating the numeric tuning in this change.

**Alternatives considered:**

- *`branches: 98`.* Rejected — v8's branch counting on JSX produces phantom branches that no test can hit (a `<>{cond && children}</>` produces 4 branches in v8's count, not 2). 95 absorbs this without devolving into per-file ignores everywhere.
- *`branches: 100` paired with aggressive `/* v8 ignore */` on JSX.* Rejected — the annotation burden on every conditional render is operational overhead with no defect-finding return.
- *`statements: 100`.* Rejected — same defensive-code issue; the 2% slack is genuinely earned by unreachable throws.

### Decision 4: `/* v8 ignore */` + named rationale is the only acceptable escape valve. Lowered floors and TODOs are NOT.

The spec's new "Files SHALL meet the floor via tests or annotated excludes" requirement is the no-backdoor enforcement. Two paths are allowed:

```ts
// (a) write the test
it('UnknownInput_ThrowsUnknownVisibilityValueError', () => {
  expect(() => fromDb('garbage' as never)).toThrow(/UnknownVisibilityValueError/);
});

// (b) annotate with rationale
// TS exhaustiveness over Visibility narrows every case; reaching this default
// would require violating the typed contract from a JS caller.
/* v8 ignore next */
throw new Error('unreachable');
```

Path (c) — silently lower the file's floor — is rejected. The reason: a lowered floor accumulates over time into a sediment of "well, we settled for X% here" that becomes invisible. A `/* v8 ignore next */` is permanent visible scar tissue — every read of the file sees it and the rationale. If the rationale ever becomes false (e.g., a refactor makes the branch reachable), the comment lies in the diff and is correctable. A lowered numeric floor in a config file is invisible at the call site forever.

Path (d) — TODO comment, follow-up issue — is rejected for the same reason the spec's existing four-audit obligation rejects it: deferral without a concrete next-step is in practice deletion of the intent.

**Reviewer obligation:** every PR introducing `/* v8 ignore */` is reviewed against the rationale. "// coverage" or "// can't test" fails review. "// SSR branch unreachable in jsdom — covered by Playwright e2e in test-pwa-shell" passes. The spec encodes this as a SHALL on the reviewer, not just the author.

**Alternatives considered:**

- *Allow per-file lowered floors with a comment.* Rejected — the comment lives in the config, not the file. A future contributor reading `Button.tsx` has no signal that its floor was lowered.
- *Forbid `/* v8 ignore */` entirely; require tests.* Rejected — genuinely unreachable code exists (TS exhaustiveness defaults, framework-guard throws). Forbidding the escape valve produces either contortions (tests that violate types to reach the unreachable) or pressure to lower the floor through some other backdoor.

### Decision 5: Per-file enumeration stays during parent-change flight; deletes at archive.

The parent `test-coverage` change's model is: each sub-proposal lands tests for its carve-out files. While that journey is in flight, most production files have no tests yet — and `coverage.include: ['lib/**', 'app/**', 'hooks/**']` is broad. A naive "universal floor, no per-file list" applied today would fail the `test` gate at 0% on every untested file the moment a new `lib/` file lands.

The flight model: `vitest.config.ts` enumerates the files that have tests, and only those files are gated. When a new sub-proposal lands tests for `app/actions/lists.ts`, it adds one line — `'app/actions/lists.ts': COVERAGE_FLOOR,` — and the file enters the gated set. When `test-coverage` archives (task 7.3 baseline = repo-wide coverage report), the enumeration deletes, and the floor applies universally across `coverage.include`. At that point, by definition every file in `coverage.include` has been touched by some sub-proposal, so universal enforcement is consistent with reality.

This is encoded in the spec as a two-phase requirement: "MAY enumerate during flight, SHALL delete enumeration at parent archive."

**Alternatives considered:**

- *Universal floor today, accept failures on untested files.* Rejected — the `test` gate becomes red-light from day one, eroding signal. Engineers tune out a perma-red gate.
- *Shrink `coverage.include` to just-tested directories.* Rejected — defeats the parent change's goal of measuring repo-wide coverage. The point is to *see* the gap.
- *Universal floor today + per-file excludes for untested files.* Rejected — operational overhead. Every test-landing sub-proposal would need to remove its files from `exclude` AND update `thresholds`. Inversion of the natural model (add to gated set when ready) into (remove from excluded set when ready).

### Decision 6: COVERAGE_FLOOR is `as const` at module scope; every per-file entry references the object by identity.

The spec requires "every per-file entry SHALL reference [the constant] by identity." This means literally:

```ts
const COVERAGE_FLOOR = { lines: 98, statements: 98, branches: 95, functions: 100 } as const;

thresholds: {
  perFile: true,
  'lib/visibility.ts':       COVERAGE_FLOOR,  // ← by reference, not spread
  'lib/listAccess.ts':       COVERAGE_FLOOR,
  // ...
}
```

NOT this:

```ts
'lib/visibility.ts': { lines: 98, statements: 98, branches: 95, functions: 100 },  // ← copy of the values
```

NOT this either:

```ts
'lib/visibility.ts': { ...COVERAGE_FLOOR },  // ← spread loses the identity check
```

**Why identity, not value-equality:**

- A spread or copy can drift silently over time (someone tweaks one entry's `branches` from 95 to 90 "just for this file"). Identity reference can't drift — if someone wants to change the value for one file, they MUST introduce a second named constant, which makes the variation visible at a named site.
- The spec's "Per-file numeric variation SHALL NOT exist" scenario rejects inline overrides; identity reference is the mechanical enforcement of that rule.
- Future readers grep for `COVERAGE_FLOOR` and see every gated file in one search.

**Alternatives considered:**

- *`as const` spread (`{ ...COVERAGE_FLOOR }`).* Rejected — visually similar to identity reference but loses the property the spec wants (you can spread + override). The spec's intent is to mechanically block "just this one file" overrides.
- *Helper function (`floor(overrides?)`).* Rejected — the parameter would be the override surface the spec forbids. The right shape is "no parameter, no override."

### Decision 7: Gap-closure is per-file individual auditing, recorded in tasks.md.

Each of the seven enumerated files is at coverage levels below the new floor on at least one metric (functions is below 100% on every file; branches is below 95% on most; `use-media-query.ts` is at 50% branches and 80% functions). The gap-closure work is per-file:

```
For each enumerated file:
  1. Run `npm run test -- --coverage --reporter=verbose <file>` to see the current numbers.
  2. For each metric below floor, identify the uncovered lines/branches/functions.
  3. For each uncovered region, decide: (a) write the test, (b) annotate with /* v8 ignore */.
  4. Record decision in tasks.md as "<file> §<metric>: <disposition> — <one-line rationale>".
  5. Land the test or annotation.
  6. Re-run coverage; confirm file now meets COVERAGE_FLOOR.
```

The audit produces a row per file per metric in `tasks.md` (so the reviewer can see what was decided where). Files where the audit produces only `/* v8 ignore */` annotations carry an explicit "no new tests written" rationale (e.g., "all gaps are framework-unreachable").

The four-audit obligation from `testing-foundation` applies to any *new* tests written: duplication / complexity / testability on source touched, assertion audit on the new tests. Pure annotations don't trigger the four-audit (no source change beyond a comment).

**Alternatives considered:**

- *Treat gap-closure as a single bulk task ("bring all files up to floor").* Rejected — loses per-file accountability. The reviewer can't tell if file X was raised by test-writing or by 12 `/* v8 ignore */` annotations.
- *Defer gap-closure to a separate sub-proposal.* Rejected — would land the constants + spec change without the floor actually being met, leaving the next sub-proposal to inherit a perma-red gate.

## Risks / Trade-offs

- **[Risk] `hooks/use-media-query.ts` may not be cleanly raisable from 50% branches / 80% functions to 95 / 100 without significant test work or many `/* v8 ignore */` annotations.** → Mitigation: the file's tests already exist (`hooks/use-media-query.test.tsx` + `.server.test.ts`); the gap-closure audit will produce a concrete per-branch disposition. If the disposition is many annotations, the reviewer applies the spec's "specific rationale" check — annotations that say "SSR branch unreachable in jsdom" with no covering Playwright test are downgraded to a request for test-writing. If the disposition is genuinely test-writing, the audit may surface that `test-pure-libs` (the carve-out that owned this file) didn't fully exercise it — that's a real finding worth surfacing back to the parent change as a learning, not a blocker for this housekeeping.
- **[Risk] Six file moves produce small but real merge-conflict surface against any in-flight sub-proposal touching the same files.** → Mitigation: the moves are mechanical (`git mv` + import-path update); reviewable as a single commit. Land this change before starting any new `test-*` sub-proposal that touches the moved files (none currently in flight on these files).
- **[Risk] The "functions: 100" floor on `Button.tsx` and `LinkButton.tsx` may surface that the current tests miss an internal closure or arrow function (every event handler is a function in v8's eyes).** → Mitigation: the gap-closure audit per file lists every function v8 sees; the disposition is to invoke it from a test or annotate. Since both components are tiny (53 / 35 LOC), this is bounded work.
- **[Trade-off] The spec's MODIFIED-requirement change to test-file location means archived sub-proposals (`test-pure-libs`, `test-button-system`) inherit a spec that contradicts the colocation they used.** → Acceptable: the archived deltas are historical artifacts; the in-flight `test-coverage` spec is what governs going forward. `test-button-system`'s archived spec actually already records `__tests__/` (the divergence happened in the active delta, not the archived one), so the contradiction was always one-sided.
- **[Trade-off] Adopting `branches: 95` (not 100) leaves a small backdoor — a contributor could write a test that hits 95% branches and skip a real 5%.** → Acceptable: the alternative (100 branches with annotation burden on JSX) is operationally worse. The reviewer attention bar on PRs adding code with branchy logic is the residual mitigation.
- **[Trade-off] The single `COVERAGE_FLOOR` constant means raising the bar in the future affects every file simultaneously.** → Acceptable: that's the point. If a future change wants to raise `lines` to 99 across the board, it's a one-line edit and a sweep of any failures. If a future change wants to raise it for one file, it introduces a named exception constant — visible, justified, reviewable.

## Migration Plan

1. **Land the spec delta first** (this change's `specs/testing-foundation/spec.md`) — the spec is the contract every other step in this plan is verifying against.
2. **Refactor `vitest.config.ts`**: hoist `COVERAGE_FLOOR`, replace all seven entries to reference it, add `lib/sqlstate.ts` entry, add `**/__tests__/**` to `coverage.exclude`. Validate: `npx tsc --noEmit && npm run lint && npm test`. Coverage will fail at this point (all files below the new floor) — that's expected and gates the next step.
3. **Move the six straggler test files** into `__tests__/` directories. For each: `git mv` (or equivalent), update relative imports (`./X` → `../X`), and for `buttonClasses.test.ts` specifically, update its `./__tests__/test-helpers` import to `./test-helpers` since the test is now inside `__tests__/`. Validate after each move: `npm test`. Expect: tests still pass (paths are the only change).
4. **Per-file gap-closure**: in tasks.md-recorded order, raise each enumerated file to the floor via test additions or `/* v8 ignore */` annotations. Validate after each file: `npm run test -- --coverage <file>` shows file at floor. After all seven: `npm test` (with coverage) passes the gate.
5. **Validate the full four-gate**: `npm run lint && npx tsc --noEmit && npm run build && npm test`. All green required for archive.
6. **Update parent `test-coverage` tasks.md** to add a checkbox for this sub-proposal under the existing typology (likely a new top-level "Housekeeping" section, OR a sub-bullet under §1 Foundation, depending on the parent's conventions).
7. **Archive this change** via `openspec archive test-housekeeping`. The spec delta consolidates into the in-flight `test-coverage` delta (the OpenSpec archive flow handles delta-on-delta amendment automatically).

**Rollback:**

Per the spec's no-backdoor rule, "rollback" doesn't mean "lower the floor" — it means revert this change wholesale. The change is contained to `vitest.config.ts`, six file moves, the spec delta, and per-file test/annotation additions. `git revert` produces a clean restore to the pre-change state. No DB migration, no dependency change, no production runtime impact — rollback is purely a git operation.

## Open Questions

- **(O1) Should the parent `test-coverage`'s `tasks.md` get a new top-level "0. Housekeeping" section for this sub-proposal, or should this be added as a checkbox under "1. Foundation"?** Leaning toward a new top-level section labelled something like "0. Foundation amendments" because this isn't part of the original foundation but is foundation-shaped (governance, not carve-out). Final placement deferred to apply-time.
- **(O2) When `hooks/use-media-query.ts`'s gap-closure audit runs, if it produces many `/* v8 ignore */` annotations for SSR/cleanup paths, do we surface this as a finding to backfill into `test-pure-libs` (archived), or accept that an archived sub-proposal's coverage debt has been absorbed by this housekeeping?** Leaning toward accept-and-document — re-opening an archived sub-proposal is heavy ceremony for a finding that's already mitigated by the new floor. The annotation rationale will record the historical context.
- **(O3) Should `coverage.exclude` get the new `**/__tests__/**` entry as part of this change, or is it already covered by some glob?** The current exclude list (`**/*.d.ts`, `drizzle/**`, `app/sw.ts`, `app/manifest.ts`, `**/*.test.*`, `**/__tests__/**`, `test/**`, `e2e/**`, `app/**/layout.tsx`, `**/types.ts`, `app/ui/components/*/index.ts`) — needs a quick verification at apply-time that `**/__tests__/**` is present (it appears to be, from a quick read; design records this as a confirm-don't-assume item).
