## 1. Confirm foundation surfaces are usable

- [ ] 1.1 Confirm `vitest.config.ts` has a **node** project with `include: ['**/*.test.ts']` (the `.test.ts` extension routes to node, not jsdom). `app/actions/user.ts` is a `.ts` module → its test runs under node.
- [ ] 1.2 Confirm the node project resolves the `@/` alias (so `import { signIn, signOut } from '@/lib/auth'` mocks resolve).
- [ ] 1.3 Confirm `vitest.config.ts` `coverage.exclude` contains `**/__tests__/**` (no change needed; the test file is excluded from the coverage denominator automatically).
- [ ] 1.4 Confirm `eslint.config.mjs` has the per-file `sonarjs/cognitive-complexity = error` override block (around line 26–87); the new entry appends to its `files` array.
- [ ] 1.5 Re-grep `openspec/specs/` to confirm no `user` / `auth` / `session` / `settings` capability spec exists at HEAD (confirms Decision 3's "no relevant host spec" premise). Confirm `server-endpoint-authorization` does NOT already lock `signInUser` / `signOutUser` (it does not — those are unauthenticated/session-clearing actions owned by 4.13's authz contract, not this carve-out).

## 2. Write `app/actions/__tests__/user.test.ts` (node project, universal COVERAGE_FLOOR)

### 2A. ModuleMocks — framework boundaries stubbed

- [ ] 2.1 `vi.mock('@/lib/auth', () => ({ signIn: vi.fn(), signOut: vi.fn() }))` at file top (NextAuth boundary, per testing-foundation allowance).
- [ ] 2.2 `vi.mock('next/navigation', () => ({ redirect: vi.fn() }))` at file top (Next routing control-flow primitive — mocked to a no-op spy so the `NEXT_REDIRECT` sentinel does not abort the test; see design Decision 2).
- [ ] 2.3 `beforeEach(() => vi.clearAllMocks())` so call counts and `invocationCallOrder` are per-test.

### 2B. signInUser — provider delegation

- [ ] 2.4 `Invoked_DelegatesToSignInWithGoogleProvider` — `await signInUser()`; assert `signIn` was called exactly once with exactly the single argument `'google'` (`toHaveBeenCalledExactlyOnceWith('google')`, or `toHaveBeenCalledTimes(1)` + `toHaveBeenCalledWith('google')` fallback). Locks the provider identity and the no-extra-args contract.
- [ ] 2.5 `Invoked_DoesNotCallSignOutOrRedirect` — after `signInUser()`, assert `signOut` and `redirect` were NOT called (the sign-in path is distinct from the sign-out path).

### 2C. signOutUser — session clear then redirect

- [ ] 2.6 `Invoked_CallsSignOutWithRedirectFalse` — `await signOutUser()`; assert `signOut` was called exactly once with exactly `{ redirect: false }`. Locks the suppression of NextAuth's built-in redirect.
- [ ] 2.7 `Invoked_RedirectsToSignIn` — assert `redirect` was called exactly once with exactly `'/sign-in'`. Locks the post-sign-out destination.
- [ ] 2.8 `Invoked_ClearsSessionBeforeRedirect` — assert `signOut.mock.invocationCallOrder[0] < redirect.mock.invocationCallOrder[0]` (session cleared before navigation). Locks ordering.
- [ ] 2.9 `Invoked_DoesNotCallSignIn` — after `signOutUser()`, assert `signIn` was NOT called.

## 3. Audits

### 3.1 Duplication audit (on the carve-out source)

- [ ] 3.1 `app/actions/user.ts` is 13 lines, two single-statement functions. Confirm no duplicated logic between `signInUser` / `signOutUser` (they delegate to different framework calls). Expected disposition: no finding. Record.

### 3.2 Complexity audit (on the carve-out source)

- [ ] 3.2 Run `npm run lint`; confirm zero `sonarjs/cognitive-complexity` warnings or errors for `app/actions/user.ts`. Both functions are complexity 1. Record measured complexity.

### 3.3 Testability audit (on the carve-out source)

- [ ] 3.3 Coverage report at universal `COVERAGE_FLOOR` or above for `app/actions/user.ts` (expect 100/100/100/100; `branches` is vacuously 100 — the file has no branches; `functions` is 100 — both functions invoked). Record per-file metrics from `coverage/coverage-summary.json`.
- [ ] 3.4 `/* v8 ignore */` annotations: none expected (no uncoverable region — both functions are pure delegations with zero branches). Record "none."
- [ ] 3.5 Source refactors taken in-place: none expected (both functions are trivially testable as-shipped). Record "none."

### 3.4 Assertion-substance audit (on the new test file)

- [ ] 3.6 Walk `user.test.ts` end-to-end. Every assertion SHALL name observable output (the exact `signIn` argument `'google'`, the exact `signOut` options `{ redirect: false }`, the exact `redirect` target `'/sign-in'`, the call-order relationship, and the not-called negatives). No execute-for-coverage call without an `expect`, no tautology, no assertion on a value the mock just returned. Specifically verify the order assertion compares `invocationCallOrder` values (not a self-comparison) and the not-called negatives assert `toHaveBeenCalledTimes(0)` / `not.toHaveBeenCalled()`. Record disposition for any flagged test.

### 3.5 Invariant-elevation audit

- [ ] 3.7 Record both latent invariants and their NON-elevation rationale (Decision 3):
  - **`signInUser` uses the Google provider** — NOT elevated. Fails criterion (a): derivable from `lib/auth.ts`'s `providers: [Google]` (the only configured provider). Tested by §2.4.
  - **`signOutUser` suppresses NextAuth's redirect and navigates to `/sign-in`** — NOT elevated. Passes (a)/(b) but there is no relevant host capability spec (`openspec/specs/` has no `user`/`auth`/`session`/`settings` capability; `server-endpoint-authorization` is an authz capability these public actions do not belong to), and creating a new capability spec for two one-line server actions is disproportionate (precedent: `test-app-frame` Decision 3c). Tested by §2.6 / §2.7 / §2.8. If a reviewer wants a `user-account` capability spec to host this, it is a clean deferred follow-up — NOT dropped.
- [ ] 3.8 Confirm no test in `user.test.ts` asserts an invariant that lacks either a corresponding test-locked contract or a recorded non-elevation rationale.

### 3.6 Governance observation (out-of-carve-out, recorded not deferred)

- [ ] 3.9 Record the `UserAvatarPopover.tsx` observation (Decision 4): the desktop user menu at `app/(auth)/ui/components/UserAvatarPopover.tsx` consumes `signOutUser` and is not obviously claimed by any current sub-proposal (not in 4.1's file list, not under `settings/`/`user/`, not the AuthPage sign-in UI of 6.1). It is OUTSIDE this carve-out's source (`app/actions/user.ts`), so it is NOT fixed or deferred-as-new-sub-proposal here; it is flagged for the parent §7.1 governance close-out audit, which sweeps for ungoverned surfaces.

## 4. Config changes

- [ ] 4.1 Add one per-file threshold entry to `vitest.config.ts`'s `thresholds` map: `'app/actions/user.ts': COVERAGE_FLOOR`, with a header comment `// test-user-actions (sub-proposal 4.15) — locked at universal COVERAGE_FLOOR.`
- [ ] 4.2 Extend the per-file `sonarjs/cognitive-complexity = error` override `files` array in `eslint.config.mjs` to include `app/actions/user.ts`, with a matching `// test-user-actions (sub-proposal 4.15)` header comment.
- [ ] 4.3 Confirm `vitest.config.ts`'s `coverage.exclude` already covers `**/__tests__/**`. No new exclude line added.

## 5. Spec deltas

- [ ] 5.1 No active spec is modified. Confirm the carve-out bookkeeping spec at `openspec/changes/test-user-actions/specs/testing-foundation/spec.md` stays archive-only (Tier 2 per `test-coverage` design D13): it did NOT roll into the parent `test-coverage` accumulator and did NOT modify the active `openspec/specs/testing-foundation/spec.md`.
- [ ] 5.2 `openspec validate test-user-actions --strict` passes.
- [ ] 5.3 Leave `openspec/changes/test-coverage/tasks.md` §4.15 checkbox unchecked; it flips on archive of this sub-proposal (not at apply).

## 6. Pre-merge (four gates)

- [ ] 6.1 `npm run lint` passes with zero errors. Pre-existing warnings in unrelated files (the carry-forward set from prior carve-outs) are acceptable; this carve-out introduces zero new warnings or errors.
- [ ] 6.2 `npx tsc --noEmit` exits 0 with zero errors.
- [ ] 6.3 `npm run build` completes successfully.
- [ ] 6.4 `npm run test:coverage` passes; `app/actions/user.ts` at universal `COVERAGE_FLOOR` (98/98/95/100 minimum) or above.

## 7. Audit disposition record

<!-- Filled in during /opsx:apply. Expected dispositions: -->

- **§3.1 Duplication** — (expected) no finding; two distinct single-statement delegations.
- **§3.2 Complexity** — (expected) `npm run lint` passes with zero `sonarjs/cognitive-complexity` findings on `app/actions/user.ts`; both functions complexity 1; `error`-level override locks the ≤ 15 ceiling.
- **§3.3 Testability** — (expected) `app/actions/user.ts` at 100/100/100/100 per `coverage/coverage-summary.json`. No `/* v8 ignore */`. No source refactor.
- **§3.4 Assertion-substance** — (expected) all assertions name observable output (mock call arguments, call order, not-called negatives). No tautologies, no execute-for-coverage.
- **§3.5 Invariant-elevation** — (expected) both invariants tested, neither elevated (rationale per §3.7). No new capability spec created.
- **§3.6 Governance observation** — `UserAvatarPopover` recorded for the §7.1 parent close-out audit.
- **§6 Pre-merge gates** — (to record) lint / tsc / build / test:coverage outcomes.
