# Tasks — test-e2e-critical-flows (parent §6.1)

References: [proposal.md](proposal.md) · [design.md](design.md) · [specs/e2e-critical-flows/spec.md](specs/e2e-critical-flows/spec.md) · [specs/testing-foundation/spec.md](specs/testing-foundation/spec.md)

**Prerequisite:** 6.0 `test-e2e-foundation` ([#102](https://github.com/JoshEddie/CTRLplusList/issues/102)) provides the harness — local DB target, `next start` server mode, the bypass-on `authenticated` / bypass-off `guest` projects, and CI tiers. This change authors specs against it and does NOT reshape the harness.

## 1. Harness readiness (consume 6.0, do not rebuild)

- [ ] 1.1 Confirm the 6.0 harness is available: `playwright.config.ts` exposes the `authenticated` (bypass-on) and `guest` (bypass-off) projects against the local DB target running under `next start`. If 6.0 has not landed, stop — it is a hard prerequisite, not in-scope work to duplicate here.
- [ ] 1.2 Note the harness's spec-to-project routing convention (e.g. `e2e/auth/**` vs `e2e/guest/**`, or a `@guest` tag) so specs land in the correct session mode; follow whatever 6.0 established.

## 2. Seed negative-case audit (Decision 3) — four-audit obligation #3

- [ ] 2.1 Audit the seeded DB for each required fixture under stable selection: (a) a viewer-owned list carrying a claim (owner-spoiler); (b) a friend-owned **Shared** (`visibility = 'public'`) list with an item NOT at `quantity_limit` capacity the viewer can claim (friend-claim); (c) a public **Shared** list with a guest-claimable item (guest-claim). Note the seed places purchases by position/hash (`${itemId}-purchase-${n}`, `asGuest = hash % 8 === 0`), so a specific target is not guaranteed by stable selector.
- [ ] 2.2 Record the disposition per fixture in §6.3: build-own-state (preferred where the flow creates it), defensive runtime selection (read-only seeded fixtures), or seed extension (only if 2.1 cannot reach the state deterministically).
- [ ] 2.3 If — and only if — 2.1 requires it, extend [scripts/seed-dev-users.ts](../../../scripts/seed-dev-users.ts) with a guaranteed fixture (e.g. a friend-owned Shared list with a known `quantity_limit: null` item guaranteed guest-claimable; a viewer-owned list with a guaranteed pre-existing claim). Add the seed-as-fixture review-coupling note; record entities in the change description. Re-seed and restart per the harness's DB workflow.

## 3. Shared e2e helpers (extract on 2nd duplication only — testing-foundation)

- [ ] 3.1 As specs are authored, extract repeated setup to `test/helpers/e2e/` only when a second spec duplicates it (e.g. `createListViaUi(page, { name, date })`, a seeded-fixture locator, or an open-purchase-modal helper). Single-use setup stays inline.

## 4. Authenticated-project specs (bypass on)

- [ ] 4.1 `auth` (bypass-on half) — navigate to a protected page (`/`), assert it renders for **Test Viewer** with no sign-in step (bypass session resolves end-to-end). Name e.g. `SignIn_BypassEnabled_RendersProtectedPage`.
- [ ] 4.2 `list-lifecycle` — the owner happy-path arc, asserting each step's observable result:
  - create a list at `/lists/new` (`ListForm`: fill `Name` (≥3 chars, per-run-unique e.g. timestamped) + `Date`, submit "Create List"); assert landing on `/lists/{id}/choose-items?new=1`.
  - add items via `ChooseItemsForm` (select ≥1 item, submit); assert the items attach.
  - set visibility to **Shared** via the `VisibilityPicker` popover; assert the trigger pill reads "Shared".
  - exercise **Share** (`ShareButton`, `aria-label="Share list"`); assert the share control is reachable on the now-non-hidden list.
- [ ] 4.3 `owner-spoiler` — against a viewer-owned list carrying a claim (fixture per §2): assert the owner's default view hides the claim; append `?spoilers=1` and assert the claimer's first name is revealed. Pins the `sanitizePurchases` owner-default-`[]` ⇄ owner-spoiler-firstName divergence.
- [ ] 4.4 `friend-claim` — as the viewer (a follower of the owner), open a seeded **friend-owned Shared** list, open the purchase modal on a claimable item (`?purchaseItem=<id>`), confirm an "I purchased it" self-claim, assert the item reflects the viewer's own claim ("You"). Note in-spec that owner-side hiding is the same mechanism pinned by 4.3 (cross-user owner observation is a Non-Goal).

## 5. Guest-project specs (bypass off)

- [ ] 5.1 `auth` (bypass-off half) — navigate to `/sign-in` with no session; assert the AuthPage sign-in UI renders (Ctrl+List logo + "Sign in with Google"). Assert presence only; do NOT click through to OAuth (Decision 6). Name e.g. `SignIn_BypassDisabled_RendersGoogleButton`.
- [ ] 5.2 `guest-claim` — **REQUIRED** ([#88](https://github.com/JoshEddie/CTRLplusList/issues/88) pin). With no session: navigate by URL to a public **Shared** list (fixture per §2); assert it renders without sign-in. Open the purchase modal on a claimable item, take the "continue as guest" branch, enter a guest name, confirm "Purchase as Guest"; assert success and that the item reflects the claim on reload. Add a regression comment naming #88. Name e.g. `GuestClaim_PublicList_RecordsGuestPurchase`.

## 6. Spec & quality conformance + bookkeeping

- [ ] 6.1 Assertion-substance audit (four-audit #1): every spec asserts an observable outcome (rendered text/state, persisted state on reload, navigation) — no execute-for-coverage navigations, no tautologies. Naming audit (#2): every `test(...)` name follows `<PageOrFlow>_<Action>_<ExpectedOutcome>`, self-contained.
- [ ] 6.2 Invariant-elevation audit (four-audit #4): the flow set + guest-claim pin + no-real-OAuth are captured in `specs/e2e-critical-flows/spec.md`, which references `test-e2e-foundation` for the execution model rather than redefining it; the `testing-foundation` delta is archive-only Tier 2 bookkeeping.
- [ ] 6.3 Record the four-audit findings (assertion-substance, naming, seed negative-case + per-fixture disposition, invariant-elevation) and any audit-deferred non-test gap (spun to a new sub-proposal, NOT fixed here). Confirm NO `vitest.config.ts` threshold change and NO harness/CI reshape (owned by 6.0).
- [ ] 6.4 Confirm `openspec validate test-e2e-critical-flows --strict` passes and the `testing-foundation` delta does NOT roll into the parent accumulator.

## 7. Pre-merge (all five gates — author-run locally against real `.env.local`)

- [ ] 7.1 `npm run lint` passes with zero errors and zero warnings.
- [ ] 7.2 `npx tsc --noEmit` passes with zero errors (includes `e2e/` via [e2e/tsconfig.json](../../../e2e/tsconfig.json)).
- [ ] 7.3 `npm run build` completes successfully.
- [ ] 7.4 `npm run test:coverage` passes with zero failing tests (unit/integration suite unaffected by this carve-out).
- [ ] 7.5 `npm run test:e2e` passes with zero failing tests across both the `authenticated` and `guest` projects (under the 6.0 harness).
