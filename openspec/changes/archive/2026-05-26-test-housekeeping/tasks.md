## 1. Spec delta (lands first — contract for everything below)

- [x] 1.1 Land `openspec/changes/test-housekeeping/specs/testing-foundation/spec.md`: two MODIFIED requirements (`Test files SHALL colocate…`, `Coverage SHALL be enforced per-file with a single universal floor`) and two ADDED requirements (`Files SHALL meet the universal floor via tests or annotated excludes — never a lowered floor`, `Per-file thresholds SHALL reference a single shared COVERAGE_FLOOR constant`). Validate with `npx openspec validate test-housekeeping --strict`.
- [x] 1.2 Confirm the in-flight `test-coverage` spec delta (`openspec/changes/test-coverage/specs/testing-foundation/spec.md`) is the upstream target of the MODIFIED requirements; no edit to the upstream delta in this change (delta-on-delta consolidates at archive time per OpenSpec flow).

## 2. `vitest.config.ts` refactor

- [x] 2.1 Hoist `const COVERAGE_FLOOR = { lines: 98, statements: 98, branches: 95, functions: 100 } as const;` to module scope.
- [x] 2.2 Replace each of the seven existing per-file threshold blocks (`lib/visibility.ts`, `lib/listAccess.ts`, `hooks/use-media-query.ts`, `app/ui/components/button/buttonClasses.ts`, `app/ui/components/button/Button.tsx`, `app/ui/components/button/LinkButton.tsx`) with `'<path>': COVERAGE_FLOOR,` — by-identity reference, NOT spread or copy.
- [x] 2.3 Add `'lib/sqlstate.ts': COVERAGE_FLOOR,` to the enumeration (currently has tests but no per-file floor).
- [x] 2.4 Verify `**/__tests__/**` is present in `coverage.exclude` (resolves design open-question O3); add if missing. **Resolution:** already present at line 63; no edit needed.
- [x] 2.5 Update the in-file comment block to reflect the universal floor (replace the tier-specific comments referencing "test-pure-libs sub-proposal 2.1" / "test-button-system sub-proposal 3.1" with a single comment explaining `COVERAGE_FLOOR` and the "never lower the floor" rule).
- [x] 2.6 Validate: `npx tsc --noEmit` passes. `npm run lint` passes (11 pre-existing `sonarjs/cognitive-complexity` warnings — not introduced here; tracked under parent `test-coverage` task §7.4). `npm test` passes (10 files, 145 tests). Coverage gate not run at this step — that's §4's gate.

## 3. Relocate six straggler test files into `__tests__/`

- [x] 3.1 Move `lib/visibility.test.ts` → `lib/__tests__/visibility.test.ts`. Update its import `from './visibility'` → `from '../visibility'`. Run `npm test -- lib/__tests__/visibility.test.ts`; expect pass.
- [x] 3.2 Move `lib/listAccess.test.ts` → `lib/__tests__/listAccess.test.ts`. Update its import `from './listAccess'` → `from '../listAccess'` (and any other `./X` → `../X`). Run targeted test; expect pass. **Two imports updated:** static `../test/helpers/db` → `../../test/helpers/db`, dynamic `await import('./listAccess')` → `await import('../listAccess')`.
- [x] 3.3 Move `lib/sqlstate.test.ts` → `lib/__tests__/sqlstate.test.ts`. Update relative imports. Run targeted test; expect pass.
- [x] 3.4 Move `hooks/use-media-query.test.tsx` → `hooks/__tests__/use-media-query.test.tsx`. Update relative imports. Run targeted test; expect pass.
- [x] 3.5 Move `hooks/use-media-query.server.test.ts` → `hooks/__tests__/use-media-query.server.test.ts`. Update relative imports. Run targeted test; expect pass.
- [x] 3.6 Move `app/ui/components/button/buttonClasses.test.ts` → `app/ui/components/button/__tests__/buttonClasses.test.ts`. Update `from './buttonClasses'` → `from '../buttonClasses'` AND update `from './__tests__/test-helpers'` → `from './test-helpers'` (test is now *inside* `__tests__/`). Run targeted test; expect pass.
- [x] 3.7 Confirm leave-alone targets: `test/helpers/db.test.ts` + `test/helpers/next-cache.test.ts` stay in place (they test test infrastructure, not production modules). Archived spike artifacts under `openspec/changes/archive/.../*.test.ts` stay in place (frozen historical).
- [x] 3.8 Full-suite check: `npm test` shows the same test count as before the move, all passing (10 files, 145 tests). Coverage gate still fails (that's §4's job).

## 4. Per-file gap-closure (raise each file to `COVERAGE_FLOOR`)

Each file gets its own coverage run, gap audit, and disposition. Record disposition per file per metric inline as a sub-bullet. The four-audit obligation from `testing-foundation` applies to any *new* tests; pure annotations are exempt from the four-audit.

- [x] 4.1 `lib/visibility.ts` — baseline 100/100/100/100. **No disposition required.**
- [x] 4.2 `lib/listAccess.ts` — baseline 100/100/100/100. **No disposition required.**
- [x] 4.3 `lib/sqlstate.ts` — baseline 100/90/83.33/100 (S, B below floor). **Disposition: write-test.** Added 7 tests covering non-object input (`null`, `undefined`, string, number), non-string `.code` falling through to cause, non-string `.cause.code`, and empty `.cause`. Also renamed the existing 4 tests from prose names to canonical `<State>_<Behavior>` shape. Post: 100/100/100/100.
- [x] 4.4 `app/ui/components/button/buttonClasses.ts` — baseline 100/100/100/100. **No disposition required.**
- [x] 4.5 `app/ui/components/button/Button.tsx` — baseline 100/100/100/100. **No disposition required.**
- [x] 4.6 `app/ui/components/button/LinkButton.tsx` — baseline 100/100/100/100. **No disposition required.**
- [x] 4.7 `hooks/use-media-query.ts` — baseline 100/90.9/50/83.33 (S, B, F below floor). **Disposition: ignore-with-rationale.** One `/* v8 ignore next 2 */` annotation on the `typeof window === 'undefined'` SSR guard inside `subscribe`. Rationale (in source comment): "React's `useSyncExternalStore` does not call `subscribe` during server render — it calls `getServerSnapshot` directly — so this branch is unreachable via React's API contract. The no-op exists as defense-in-depth for any non-React caller." Resolves design open-question O2 as accept-and-document (the rationale is specific and the no-op cleanup function inside the branch is what v8 was flagging as an uncovered function — that function is the one returned, never invoked, also covered by the same ignore). Post: 100/100/100/100.
- [x] 4.8 Run full coverage: `npm run test:coverage`. All seven enumerated files at `COVERAGE_FLOOR` (verified via `coverage/coverage-summary.json`). No threshold ERRORs emitted. No other file regressed (untested files at 0 are unenumerated and therefore not gated).

## 5. Four-audit reporting for new tests written in §4

For any file in §4 where the disposition included *new tests* (not pure annotation):

- [x] 5.1 **Duplication audit** on the production source touched. **Source changed:** `hooks/use-media-query.ts` (one `/* v8 ignore */` annotation + 4-line comment block; no logic change). `lib/sqlstate.ts` (no change). **Finding: none.** The annotation is unique to this file; no duplication introduced.
- [x] 5.2 **Complexity audit** on the production source touched. `hooks/use-media-query.ts` is unchanged in branching/control flow (annotation only adds comment + ignore-directive). `lib/sqlstate.ts` is unchanged. **Finding: none.** `npm run lint` did not raise new `sonarjs/cognitive-complexity` warnings on either file (the 11 pre-existing warnings are on other files entirely).
- [x] 5.3 **Testability audit** on the production source touched. Writing the new `sqlstate.ts` tests surfaced no testability friction — the function takes `unknown`, returns `string | undefined`, has no side effects, no module-level state. Writing the `use-media-query.ts` annotation surfaced a potential testability refactor (extract `subscribe` as a module-level pure function so the SSR guard becomes directly invokable from a test) — but per design Decision 7 and Non-Goals, testability refactors are not in scope for this change (carve-out was owned by archived `test-pure-libs`). **Finding deferred:** noted in design open-question O2 disposition; no follow-up sub-proposal opened because the annotation + rationale is the agreed-upon disposition.
- [x] 5.4 **Assertion audit** on the new tests in `lib/__tests__/sqlstate.test.ts`. Every `it()` (11 total — 4 pre-existing renamed + 7 new) has exactly one substantive `expect(...)` assertion that constrains observable behavior. No tautologies (no lone `toBeDefined()`, no `toBe(true)` against literal `true`, no length≥0). No execute-for-coverage (every test calls `sqlstateOf(...)` AND asserts on its return). No snapshot-only. Every test name follows `<State>_<Behavior>` PascalCase shape with single underscore separator. `describe('sqlstateOf', ...)` carries the unit name as required by the three-role convention. **Finding: pass.**

## 6. Parent-change tasks.md update

- [x] 6.1 Edit `openspec/changes/test-coverage/tasks.md` to add this sub-proposal as a tracked checkbox. **Placement chosen:** new top-level section "## 0. Foundation amendments" between the intro paragraph and §1. Rationale: this isn't part of the original foundation but is foundation-shaped (governance / spec amendment); placing it at §0 makes it visually distinct from carve-out work (§1–§7) and makes future foundation amendments naturally chain there. Resolves design open-question O1.
- [x] 6.2 Verify the parent change's tasks.md still validates: `npx openspec validate test-coverage --strict` → passes.

## 7. Documentation sanity-check (read-only — flag follow-ups if needed)

- [x] 7.1 Read `TESTING.md` end-to-end; confirm alignment. **Findings:** (a) TESTING.md correctly documents the `__tests__/` convention and the test-only-helper colocation rule — fully aligned with this change's MODIFIED colocation requirement. (b) TESTING.md does NOT mention coverage floors at all (the only mention of coverage is on the test-substance bar — "execute-for-coverage" pattern). **Drift:** none — TESTING.md is silent on coverage floors, so it cannot drift from the new universal floor. A future follow-up could add a "Coverage" section describing `COVERAGE_FLOOR` and the no-backdoor disposition rules, but per §7's finding-not-fix rule that's deferred. (c) Line 21's pointer to the spec location (`openspec/changes/test-coverage/specs/testing-foundation/spec.md`) is still accurate.
- [x] 7.2 Read `CLAUDE.md` for test-related guidance. **Findings:** only mention of testing is the pointer at the top to `TESTING.md`. No coverage-related content. **Drift: none.**

## 8. Pre-merge (all five gates — separately checkable)

- [x] 8.1 `npm run lint` — exit 0. **11 pre-existing `sonarjs/cognitive-complexity` warnings remain** (on `ListDetails.tsx`, `Avatar.tsx`, `app/actions/items.ts`, `app/actions/lists.ts`, `FormField.tsx`, `seed-dev-users.ts`, etc.) — none introduced by this change. These are tracked under parent `test-coverage` task §7.4 and are at warn-not-error per the foundation spec's per-carve-out-promotion policy. Strict "zero warnings" interpretation: see §7.4 of the parent change.
- [x] 8.2 `npx tsc --noEmit` — exit 0, zero errors.
- [x] 8.3 `npm run build` — exit 0, full production bundle, type-check, route inventory all green.
- [x] 8.4 `npm run test:coverage` — exit 0, zero failing tests, all seven enumerated files at `COVERAGE_FLOOR` (100/100/100/100). No threshold ERRORs emitted.
- [x] 8.5 `npm run test:e2e` — exit 0; Playwright reports "No tests found" (the suite hasn't been authored yet; that's parent change's 6.1 / 6.2 to land). Expected state until then.
