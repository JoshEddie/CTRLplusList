## Context

Sub-proposal 6.1 of `test-coverage` — authors the critical-flow e2e specs. The e2e **execution model** (local Docker DB target, `next start` production server, the two-project harness — authenticated viewer / logged-out guest, CI tiers) is owned by **6.0 `test-e2e-foundation`** ([#102](https://github.com/JoshEddie/CTRLplusList/issues/102)); this design covers only the **flow-authoring** decisions — which surfaces each spec drives, what it asserts, and how the fixtures are sourced. Where a decision depends on a harness property, it references 6.0 rather than re-deciding it.

Flows to cover (parent §6.1): sign-in surface + bypass session, create list, add items, set visibility, share, signed-in non-owner claim with spoiler hiding, owner sees claim, and the **REQUIRED** logged-out-guest claim on a public list ([#88](https://github.com/JoshEddie/CTRLplusList/issues/88) pin). (Parent §6.1 names this the "friend claim" flow; the claimant's defining trait is being signed in — a follower is incidental — so the spec is named `signed-in-claim`.)

Binding facts confirmed from source:

- **The session bypass is process-wide** ([lib/auth.ts:76](../../../lib/auth.ts) `bypassEnabled()`, keyed on `USE_PG_DRIVER`) — no per-request seam, so an authenticated viewer and a logged-out guest need separate server processes, differentiated by `BYPASS_SESSION_USER` (unset ⇒ seeded `dev-test-viewer`; the literal `guest` ⇒ `auth()` resolves to null). **6.0 provides** those two modes as two Playwright projects (`authenticated` / `guest`, routed by `*.auth.spec.ts` / `*.guest.spec.ts`); 6.1 assigns each spec to the mode it needs.
- **Public lists are URL-accessible to anyone** (`list-visibility`; `guardListViewable` allows any caller when `fromDb(visibility) !== VISIBILITY.OWNER`) — the guest-claim surface and the [#88](https://github.com/JoshEddie/CTRLplusList/issues/88) regression class.
- **Spoiler hiding is owner- and reveal-gated** — `?spoilers=1` honored only for the owner ([ListHeroSection.tsx:31](../../../app/(main)/lists/[id]/ListHeroSection.tsx)); `sanitizePurchases` ([lib/dal.ts:55](../../../lib/dal.ts)): owner-no-spoilers → `[]`, owner-spoilers → first names, non-owner → first names.
- **Guest claim path** = `createPurchase` with `user_id: null` + `guest_name`, via the modal's "continue as guest" branch (`?purchaseItem=<id>` → `"Purchase as Guest"`).
- **Seed-as-fixture** — viewer is `dev-test-viewer` ("Test Viewer"), follows Alice/Bob/Eve/Frank/Grace/Hank; seeded lists span all three visibility states; purchases (incl. ~1-in-8 guest checkouts) placed by a position/hash rule with IDs `${itemId}-purchase-${n}`.

## Goals / Non-Goals

**Goals:**

- Prove each parent-§6.1 flow works through the running app against the seeded DB, driving real user-visible affordances and asserting observable outcomes.
- Pin the [#88](https://github.com/JoshEddie/CTRLplusList/issues/88) guest-claim regression with a spec that runs with no session (under 6.0's `guest` project).
- Elevate the flow set into the `e2e-critical-flows` capability spec so dropping a flow is a spec violation.

**Non-Goals:**

- The e2e execution model *design* — DB target, `next start` vs `next dev`, the two-server mechanics, the e2e CI tiers, the `testing-foundation` Tier-1 execution additions. All **6.0**. (Operational CI/harness *hardening* of the existing jobs was folded into this PR by owner decision — Decision 8 / tasks §5c — distinct from reshaping that design.)
- The full authorization caller-class matrix (4.13) and PWA/offline e2e (6.2).
- Cross-user, cross-process observation (a guest claims on the guest server, the *real* friend-owner observes it on the authenticated server) — Decision 2 / Decision 4.
- Real Google OAuth (forbidden); the sign-in surface is asserted at the affordance level only.
- Unit/per-file coverage from e2e — `vitest.config.ts` untouched.

## Decisions

### Decision 1 — Assign each spec to the harness session mode it needs (mechanism owned by 6.0)

6.0 provides two projects: `authenticated` (`BYPASS_SESSION_USER` unset → seeded `dev-test-viewer`) and `guest` (`BYPASS_SESSION_USER=guest` → `auth()` resolves to null, a logged-out caller). Both run under `USE_PG_DRIVER=1`; what differs is the session selector, not whether the bypass is engaged. 6.1 routes its specs: `guest-claim` and the sign-in-surface assertion → `guest`; `list-lifecycle`, `owner-spoiler`, `signed-in-claim`, and the bypass-renders-protected-page assertion → `authenticated`. The *why two modes exist* (process-wide bypass) and *how they run* (two webServers / `next start`) are 6.0's decisions, recorded there; 6.1 only consumes the project split.

**Alternative considered:** 6.1 builds its own two-server config inline. **Rejected:** that is exactly the harness duplication the 6.0 carve-out exists to prevent (and would diverge from 6.2's harness). Per the parent's §6.0 split, execution model lives in 6.0.

### Decision 2 — Specs assert only same-server or seeded state (no cross-process dependency)

6.0's two servers share the dev DB but `'use cache'` + `revalidateTag` invalidate only in-process. 6.1's specs SHALL assert only state their own server produced (write-then-read on the same server → in-process revalidation applies) or that the seed established. Concretely: `guest-claim` asserts the claim on the **guest** server after the guest's own `createPurchase`; `owner-spoiler` asserts against a **seeded** claim on the authenticated server (Decision 4) — it does not wait for a guest on the other server.

**Alternative considered:** a single cross-server narrative (guest claims on B, owner observes that same claim on A). **Rejected:** depends on cross-process cache coherence that does not hold (flaky); the value (each flow works) is fully delivered by decoupled arcs. Non-Goal.

### Decision 3 — Seed negative-case audit drives fixture strategy; prefer build-own-state

Required fixtures: (a) a viewer-owned list carrying a claim (owner-spoiler); (b) a friend-owned **Shared** list with a not-at-capacity item the viewer can claim (signed-in-claim); (c) a public **Shared** list with a guest-claimable item (guest-claim). The seed places purchases by position/hash (`${itemId}-purchase-${n}`, `asGuest = hash % 8 === 0`), which does not guarantee a *specific* target under a stable selector. Disposition, in priority order:

1. **Build-own-state** where the flow already creates it (`list-lifecycle` creates its own list+items+visibility — zero seed dependency; the default).
2. **Defensive runtime selection** for read-only fixtures: locate "a friend-owned Shared list with an item not at capacity" / "a viewer-owned item showing a claim" at runtime rather than hardcoding a position.
3. **Extend `scripts/seed-dev-users.ts`** with a guaranteed fixture only if 1–2 cannot reach a required state deterministically (with the seed-as-fixture review-coupling note).

The audit + outcome are recorded in `tasks.md`. The seed *infrastructure* (compose, schema setup, seed invocation) is 6.0's; this is the per-fixture audit only.

### Decision 4 — Owner-sees-claim is proven on seeded data, independent of any live guest claim

The bypass fixes the authenticated identity to `dev-test-viewer`, so the suite cannot log in *as a friend-owner* to watch a guest's claim land. The `owner-spoiler` spec instead runs as the viewer-owner against a **viewer-owned** list carrying a claim (Decision 3): default view hides it (`sanitizePurchases → []`), `?spoilers=1` reveals the first name. The `signed-in-claim` spec covers the other observer — an authenticated **non-owner** seeing their own claim ("You"). Together they pin both observers of the spoiler mechanism using only state each server can produce. Cross-user owner-observes-guest is a Non-Goal (Decision 2).

### Decision 5 — Drive real UI affordances by role/label/aria, not internal selectors

Tests target user-visible affordances: the `"Sign in with Google"` button; `ListForm` fields by label (`Name`, `Date`) + the `"Create List"` submit; the `VisibilityPicker` popover and its "Shared" radio row; the `ShareButton` (`aria-label="Share list"`); the purchase modal opened via the claim affordance, its `"Your name"` field and `"Purchase as Guest"` / `"I purchased it"` / `"Confirm Purchase"` buttons. This couples specs to the user-facing contract (governed by the primitive/capability specs), not incidental DOM. Each assertion checks an observable outcome, satisfying the assertion-substance bar.

### Decision 6 — Sign-in surface is asserted, OAuth is never completed

`auth` (guest project) navigates to `/sign-in`, asserts the AuthPage UI renders (logo + `"Sign in with Google"`), and stops — no click-through to Google. The authenticated half (the `authenticated` project) asserts a protected page renders as Test Viewer with no sign-in. Honors testing-foundation's "NextAuth is not invoked against real Google" while covering both "AuthPage sign-in UI" and "sign-in (with bypass)".

### Decision 7 — `e2e-critical-flows` is a new capability spec (flow contract), distinct from the foundation

`testing-foundation` (+ 6.0's Tier-1 additions) owns *how* e2e runs; `e2e-critical-flows` owns *which flows must stay covered*. Keeping them separate means a future edit that drops a flow violates `e2e-critical-flows` without touching the execution model, and vice versa. This is the e2e analogue of the primitive-family specs (3.x).

### Decision 8 — Folded-in CI/harness hardening; the type gate is centralized and process-only

Getting the suite green in CI surfaced harness/CI work beyond the §5b product fixes. By owner decision it was folded into this PR (mirroring the §5b override) rather than spun out — `tasks.md` §5c enumerates the set. This is operational hardening of the **existing** jobs, not a reshape of the e2e execution model (tiers, two-server, build-once stay 6.0's); the one piece that *is* an execution-model property — the per-suite DB reset for rerun determinism — was elevated to a 6.0 SHALL rather than recorded only here.

The decision worth stating as such is **where type-correctness is enforced**. Before: the CI `typecheck` job ran `tsc --noEmit` with no `next typegen`, so App Router route types (`PageProps`/`params`) went unchecked there and were validated only by an in-build type check that ran *three times* — the standalone `build` job, the e2e tier's `next build`, and Vercel. After: a single authoritative gate — the `typecheck` job runs `next typegen` + `tsc --noEmit` (now covering route types) — and `next.config.ts` sets `ignoreBuildErrors: true` so the builds stop re-checking. The standalone `build` job is dropped as redundant: `next build` still runs on every PR in the e2e tier (config-faithful) and on Vercel (production-faithful), so build/bundle breakage is still caught; only the duplicate placeholder-DB build is gone. One fast type gate replaces three slow in-build copies, and route-type coverage is *gained*, not lost.

The trade-off this accepts: with no required status checks (no branch protection / rulesets on `dev`/`main`) and `ignoreBuildErrors` applied to Vercel's build too, **nothing mechanically blocks a type error from merging** — the `typecheck` job runs on every PR but is advisory, so enforcement is *process-only* (read it before merge). Accepted for a solo-maintained repo where CI is watched per-PR. The clean upgrade, should the team grow, is a ruleset requiring `typecheck` (and the other checks), which would re-arm a mechanism strictly better than the old triple in-build check; deliberately not done here.

**Alternative — keep builds type-checking (drop `ignoreBuildErrors`). Rejected:** restores the triple type-check this consolidates, is slower, and still wouldn't cover route types without `next typegen` in the gate anyway.

## Risks / Trade-offs

- **[Seed reshuffle breaks hardcoded fixtures]** → Decision 3 prefers build-own-state + defensive selection; any hardcoded target is guaranteed by a seed extension carrying the review-coupling note.
- **[Guest/signed-in claim hits `quantity_limit` capacity on a seeded item]** → defensive selection (3.2) or a guaranteed-unlimited seeded item (3.3) ensures the target accepts a fresh claim.
- **[Shared dev DB pollution across re-runs]** → create-state specs use per-run-unique names and assert on what they just created; `npm run db:reset:dev` restores baseline; no spec asserts global counts. (The cleaner answer — ephemeral local DB per run — is 6.0's to provide.)
- **[6.0 not yet landed when 6.1 is applied]** → 6.1's specs are authored to the harness contract; if the harness is absent, 6.0 is a hard prerequisite, not work to duplicate here. Apply order: 6.0 then 6.1.
- **[A real non-test gap surfaces during authoring]** → recorded in `tasks.md` and spun into a new sub-proposal per the audit-deferral rule, not fixed in this test-only carve-out. **(Overridden by owner decision for three small, single-source, production-safe defects the specs surfaced — all fixed and folded in here, see `tasks.md` §5b:** (1) `createPurchase` discarded an authenticated "Someone else" claim's typed name and misattributed it to the caller — fixed with MODIFIED deltas to `list-item-management` + `server-endpoint-authorization`; (2) `createList` passed a `Date` through an `sql` template that postgres-js rejects, breaking dev:local list-creation — fixed to pass the Date directly; (3) `/sign-in` was prerendered with the build-time bypass session — fixed with a per-route `connection()` dynamic opt-in. **One deferred follow-up:** the *complete* fix for (3) — making the local-mode bypass `auth()` dynamic so the whole class of auth-gated prerendered pages (e.g. `/`) renders per-server — touches the `lib/auth.ts` foundation seam and is left to a focused `test-e2e-foundation` hardening change; the per-route opt-in covers every page the current guest specs reach.)

## Migration Plan

Test-only, additive; no production deploy. Order (assumes 6.0 harness available):

1. Run the seed negative-case audit (Decision 3); record dispositions in `tasks.md`; extend the seed only if required.
2. Author specs in dependency order: `auth` → `list-lifecycle` → `owner-spoiler` → `signed-in-claim` → `guest-claim`, assigning each to its harness project (Decision 1) and extracting shared helpers to `test/helpers/e2e/` on the second duplication.
3. Write the `e2e-critical-flows` spec and the archive-only `testing-foundation` delta.
4. Run the five-gate pre-merge plus `test:e2e` (under the 6.0 harness); record results.

Rollback: delete the new `e2e/*.spec.ts` and any seed extension — no production code touched, and the harness (6.0) is untouched by 6.1.

## Open Questions

- **Seed extension vs. defensive selection** — resolved at audit time (Decision 3) during apply, reflecting the seed as it actually stands when work starts.
- **Project-assignment mechanism** (`@guest` tag vs. `testMatch`/directory split) — defined by 6.0's harness; 6.1 follows whatever 6.0 establishes.
