## Context

Sub-proposal 4.15 of the `test-coverage` initiative — a capability-flow carve-out targeting the user-account server actions. The `testing-foundation` capability is established and hardened: `__tests__/` colocation is the convention, the universal per-file floor is `lines:98 / statements:98 / branches:95 / functions:100` referenced from a single `COVERAGE_FLOOR` constant in `vitest.config.ts`, and the four-audit + invariant-elevation obligations are stable. This is one of the smallest carve-outs in the initiative: a single 13-line source file with two one-line server actions.

Carve-out source (per parent `test-coverage` tasks.md §4.15, narrowed to the determination in `proposal.md`):

| File | Symbol | Behavior | Tested how |
|---|---|---|---|
| `app/actions/user.ts` | `signInUser()` | `'use server'`. `await signIn('google')` — delegates to the NextAuth `signIn` re-exported from `@/lib/auth`. | node project; `@/lib/auth` module-mocked (NextAuth boundary) |
| `app/actions/user.ts` | `signOutUser()` | `'use server'`. `await signOut({ redirect: false })` then `redirect('/sign-in')` — clears the session without NextAuth's built-in redirect, then navigates to the sign-in page. | node project; `@/lib/auth` + `next/navigation` module-mocked |

Coverage floor: universal `COVERAGE_FLOOR` (98 / 98 / 95 / 100). The file has no branches, so `branches` is vacuously 100; both functions are invoked, so `functions` is 100.

Bound by:

- `testing-foundation` — `__tests__/` colocation, universal `COVERAGE_FLOOR`, no-backdoor rule, four-gate pre-merge, four-audit + invariant-elevation obligations, assertion-substance bar, complexity ≤ 15, `<State>_<Behavior>` shape, three-role `describe()`, observable-behavior-over-execution, NextAuth-as-network-boundary mocking allowance.
- `server-endpoint-authorization` (active) — does NOT apply: `signInUser` / `signOutUser` are intentionally unauthenticated/session-clearing actions, not authz-gated mutations. Owned by 4.13.

## Goals / Non-Goals

**Goals:**

- Land one colocated test file (`app/actions/__tests__/user.test.ts`, node project) at the universal `COVERAGE_FLOOR`.
- Assert the observable behavior of both actions: the `signIn` provider argument; the `signOut` options object; the `redirect` target; and the `signOut`-before-`redirect` ordering.
- Promote `sonarjs/cognitive-complexity` from `warn` to `error` for `app/actions/user.ts` via an `eslint.config.mjs` per-file override.
- Complete the four-audit obligation and the invariant-elevation audit, recording dispositions in `tasks.md`.

**Non-Goals:**

- No source refactors. Both functions are already trivially testable.
- No new capability spec. The latent invariants are tested-but-not-elevated (Decision 3).
- No coverage of the auth-UI consumers (`SignInButton`, `SignOutButton`, `AuthButtons`, `UserAvatarPopover`) — E2E territory (6.1) per `proposal.md`'s carve-out boundary.
- No coverage of `app/(main)/settings/connections/**` (owned by 4.2 `test-following`) or `app/(main)/user/[id]/**` (4.2 / 4.6).
- No real OAuth handshake. `signIn` / `signOut` are mocked at the `@/lib/auth` boundary per `testing-foundation`'s NextAuth allowance.
- No assertion on the thrown `NEXT_REDIRECT` sentinel. `next/navigation`'s `redirect` is mocked to a no-op spy so the test can assert its argument (Decision 2).

## Decisions

### Decision 1: One `app/actions/__tests__/user.test.ts` (node project) covering both actions.

`app/actions/user.ts` is a `.ts` file with no DOM surface; its test belongs in the **node** vitest project (`include: ['**/*.test.ts']`), not jsdom. The test lives at `app/actions/__tests__/user.test.ts` per the `test-housekeeping` `__tests__/` colocation convention — the first such directory under `app/actions/`. Both exported functions are covered in one file (one `describe('signInUser')` and one `describe('signOutUser')`), since they share the same module and the same `@/lib/auth` mock setup.

**Alternatives considered:**

- *Two files (`signInUser.test.ts` / `signOutUser.test.ts`).* Rejected — they share a module and a mock surface; one file with two function-describes is the natural unit and matches the per-file coverage attribution (the threshold key is the source path `app/actions/user.ts`, not per-function).
- *jsdom project.* Rejected — no DOM is touched; node is the correct, lighter environment.

### Decision 2: Mock `@/lib/auth` (NextAuth boundary) and `next/navigation` (framework routing primitive); assert on the mock call shapes.

`signInUser` and `signOutUser` delegate to `signIn` / `signOut` (re-exported from NextAuth via `@/lib/auth`) and `redirect` (from `next/navigation`). Both are framework boundaries:

```ts
vi.mock('@/lib/auth', () => ({ signIn: vi.fn(), signOut: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
```

- **`@/lib/auth`** — `testing-foundation`'s "Tests SHALL NOT call rate-limited external services" requirement explicitly names "NextAuth Google OAuth" as a network boundary to mock; `signIn` / `signOut` are the NextAuth handshake entry points re-exported from `@/lib/auth`. Mocking them IS mocking at the NextAuth boundary, NOT mocking an internal application module.
- **`next/navigation`'s `redirect`** — a Next.js framework control-flow primitive. In production it throws a `NEXT_REDIRECT` sentinel that the framework intercepts to perform the navigation; if left unmocked, that throw would abort the test before any assertion. Mocking it to a no-op spy is the documented pattern for asserting the redirect *target* without the sentinel; this parallels the NextAuth-boundary allowance (a framework boundary, not an internal app module).

Assertions (observable behavior, per the substance bar):

- `signInUser`: `expect(signIn).toHaveBeenCalledExactlyOnceWith('google')` — locks the provider identity and the absence of a second options argument. A change to the provider string or the addition of a redirect option fails the test.
- `signOutUser`: `expect(signOut).toHaveBeenCalledExactlyOnceWith({ redirect: false })` — locks the suppression of NextAuth's built-in redirect; `expect(redirect).toHaveBeenCalledExactlyOnceWith('/sign-in')` — locks the post-sign-out destination; and `expect(signOut.mock.invocationCallOrder[0]).toBeLessThan(redirect.mock.invocationCallOrder[0])` — locks that the session is cleared *before* navigation (a wrong order would navigate away while the session still exists).

**Alternatives considered:**

- *Leave `redirect` unmocked and catch the thrown `NEXT_REDIRECT`, then inspect its `digest`.* Rejected — couples the test to Next's internal sentinel encoding (`NEXT_REDIRECT;replace;/sign-in;...`), which is undocumented and version-fragile. Mocking the spy and asserting its argument is robust and reads as the contract.
- *Mock `next-auth` directly instead of `@/lib/auth`.* Rejected — `@/lib/auth` is the module the source under test actually imports `signIn` / `signOut` from; mocking the real import path is more targeted and matches the file's dependency graph. (Same reasoning as `test-app-frame` Decision 2 for `auth`.)

### Decision 3: The latent invariants are tested but NOT elevated to a capability spec.

The invariant-elevation audit gates each invariant on three criteria (non-obvious / survives reimplementation / protects a real failure mode) AND requires a *relevant capability spec* to host the SHALL. The invariants the tests enforce:

1. **`signInUser` uses the Google provider (`signIn('google')`).** Fails criterion (a) non-obvious: `lib/auth.ts` configures `providers: [Google]` as the *only* provider, so "sign-in uses Google" is derivable from the auth config, not a hidden contract. Not elevated.
2. **`signOutUser` suppresses NextAuth's built-in redirect (`{ redirect: false }`) and navigates to `/sign-in`.** Passes (a) and (b) — the destination and the suppression are real, reimplementation-surviving contracts. Criterion (c) is mild (a wrong destination is a UX nuisance, not a privacy leak or data loss). **Critically, there is no relevant host spec:** `openspec/specs/` has no `user` / `auth` / `session` / `settings` capability, and `server-endpoint-authorization` is an authz capability these public actions do not belong to. Standing up a brand-new capability spec for two one-line server actions is disproportionate — directly analogous to `test-app-frame` Decision 3c's rejection of a new `keyboard-offset-system` capability for a 36-line hook (and this file is far smaller). Not elevated.

Both invariants remain locked by the new tests (a regression in either fails the `test` gate); they are simply not promoted to a spec SHALL. `tasks.md` §audits records both non-elevations with this rationale. If a reviewer prefers a `user-account` capability spec be created to host invariant 2, that is a clean follow-up — but it is out of proportion to this carve-out and is explicitly deferred, not silently dropped.

### Decision 4: The auth-UI consumers (including the ungoverned `UserAvatarPopover`) are out of scope; observed, not deferred as a new sub-proposal.

`signInUser` / `signOutUser` are consumed by `app/(auth)/ui/components/SignInButton.tsx`, `SignOutButton.tsx`, `AuthButtons.tsx`, and the `signOutUser` `<form>` in `app/(auth)/ui/components/UserAvatarPopover.tsx`. These are thin `<form action={...}>` wrappers; their load-bearing behavior is the real OAuth round-trip and the post-submit navigation, which is E2E territory. Sub-proposal 6.1 `test-e2e-critical-flows` explicitly claims "AuthPage sign-in UI covered here," so the sign-in/sign-out UI has a home.

`UserAvatarPopover.tsx` (the desktop user menu) is the one consumer not obviously claimed by any current sub-proposal — it is not in `test-app-frame`'s enumerated file list (4.1), not under `settings/`/`user/` (so not nominally 4.15's UI), and not the AuthPage sign-in UI (6.1). Per the testing-foundation audit-deferral rule, a genuinely-ungoverned file would warrant a new sibling sub-proposal entry. However, `UserAvatarPopover` is NOT in *this* carve-out's source (`app/actions/user.ts`), so it does not surface in this sub-proposal's four-audit (which is scoped to carve-out source). It is recorded here as an **observation** for the §7.1 governance close-out audit (which sweeps for unchecked/ungoverned surfaces) rather than fixed or deferred here — adding a sub-proposal for a file outside this carve-out's source would overreach the carve-out boundary. `tasks.md` notes this observation.

### Decision 5: No source refactor; no `/* v8 ignore */`.

Both functions are pure delegations with zero branches. They are fully testable as-shipped: every line executes under the two tests, coverage is 100/100/100(vacuous)/100, complexity is 1 each. No refactor is needed (Decision under `testing-foundation`'s testability authority is "no action"), and no `/* v8 ignore */` annotation is required (no uncoverable region exists).

## Risks / Trade-offs

- **`next/navigation` `redirect` mock vs. real throw behavior.** Mocking `redirect` to a no-op means the test does NOT verify that production control-flow actually *stops* at the `redirect()` call (in production, `redirect` throws and nothing after it runs). → Accepted: in `signOutUser` there is no code after `redirect('/sign-in')`, so the no-throw mock does not mask any unreachable post-redirect logic. The contract under test is "which target," not "does Next abort" — the latter is Next's own guarantee, not this action's behavior.
- **No relevant capability spec for the sign-out destination invariant.** The `/sign-in` post-sign-out target is a real contract with no spec home (Decision 3). → Accepted: it is regression-locked by the test; elevation is deferred to a potential future `user-account` capability rather than forced into an ill-fitting spec.
- **`UserAvatarPopover` is ungoverned.** → Accepted as an observation for the §7.1 close-out audit (Decision 4); not fixed here because it is outside this carve-out's source.
- **`toHaveBeenCalledExactlyOnceWith` availability.** This matcher exists in Vitest 3+/4 (the repo runs vitest 4.x). → If unavailable for any reason, fall back to `expect(fn).toHaveBeenCalledTimes(1)` + `expect(fn).toHaveBeenCalledWith(...)`; same assertion strength. Recorded as a §audit fallback.
