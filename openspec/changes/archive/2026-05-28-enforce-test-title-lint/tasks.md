## 1. Land the lint rule

- [x] 1.1 Add `vitest/valid-title` at severity `error` to the existing `{ files: ['**/*.test.{ts,tsx}'], plugins: { vitest } }` block in `eslint.config.mjs`. `mustMatch` for `it`/`test` = `^[A-Z][A-Za-z0-9%#]*_[A-Z%][A-Za-z0-9%#]*(-[A-Z][A-Za-z0-9%#]*)*$` (one underscore = the state│behavior boundary; single-token PascalCase state; behavior is one token or dash-joined facets; `%`/`#` placeholders permitted). `mustNotMatch` for `describe` = `[^\w$]` (no whitespace/punctuation; dash not allowed). Patterns are **string** sources, not `RegExp` literals (a `RegExp` fails schema validation). Messages point to TESTING.md. No mechanical conflation rule is added — conflation is a trigger-count judgment, not dash-count (design D9).
- [x] 1.2 Run `npm run lint`; triage every `valid-title` failure as a genuine violation or a pattern gap. Verified no false positive on the button-matrix template-literal titles or the `it.each('TypeSetTo_%s')` title.

## 2. Audit and resolve surfaced violations (design D5)

- [x] 2.1 **Zero-underscore fused names** → renamed to `<State>_<Behavior>` (`RendersMainContainerWrappingFollowingPage`, `OnChangeForwarded`, `NoRoleAlertNoAriaLive`, `MatchesMenuItemClassString`, plus any others lint reported).
- [x] 2.2 **Compound state** (a second underscore whose extra clause is setup/condition) → hoisted into nested `describe` blocks so the `it()` carries a single state token; single-use compounds become a describe too. Known cluster: `Empty.test.tsx` `NonPurchase_WithSetter_*` / `NonPurchase_NoSetter_*`.
- [x] 2.3 **Single-trigger compound behavior** → dash-joined facets in full, ordered primary → secondary with side-effects last (e.g. `CallsFollowUser-ToastSuccess-RouterRefresh`); no fusing to shorten.
- [x] 2.4 **Conflation** → split a test only where it spans multiple distinct triggers; single-trigger multi-effect tests stay intact. Test-count parity across every changed file confirms no splits were needed.
- [x] 2.5 **Prose `describe` titles** → renamed to identifier/tag form, including the archive spike POCs (`openspec/changes/archive/.../poc/*.test.ts`) and `test/helpers/*.test.ts` self-tests.
- [x] 2.6 `npm test` passes after the audit — coverage preserved (renames and describe-nesting change structure, not asserted behavior).

## 3. Reconcile the one known cross-change contradiction (standalone change — design D6)

- [x] 3.1 Updated `test-coverage`'s pending accumulator requirement "Vitest test names SHALL follow `<StateUnderTest>_<ExpectedBehavior>` shape" so its "exactly two parts, single underscore" wording permits the sharpened shape (boundary underscore, single-token state, dash-joined behavior facets). Minimal edit to remove the contradiction — the rest of `test-coverage` and other in-flight specs are left for lint + TESTING.md to self-correct as they land.
- [x] 3.2 This change's own `specs/testing-foundation/spec.md` delta stays `ADDED` (no active spec to modify); both `enforce-test-title-lint` and `test-coverage` validate with `openspec validate --strict`.

## 4. Docs

- [x] 4.1 Rewrote TESTING.md's "Test naming convention" section: the sharpened shape (`<State>_<Behavior>(-<Behavior>)*`, single-underscore boundary, single-token state with compound state → `describe`, dash-joined behaviors with side-effects last); the mechanical lint floor vs the manual / review bar (token role, precision, one-test-one-trigger); and the describe lint note (no whitespace/punctuation; dash is `it`/`test`-only).

## 5. Pre-merge (four-gate)

- [x] 5.1 `npm run lint` passes with zero errors. The `lint` script is `eslint .` (no `--max-warnings 0`), so the 10 pre-existing `sonarjs`/`no-img-element` warnings in production files — untouched by this test-only change — do not gate. This change adds no new errors or warnings.
- [x] 5.2 `npx tsc --noEmit` passes with zero errors.
- [x] 5.3 `npm run build` completes successfully.
- [x] 5.4 `npm test` passes (766 tests, 61 files).
