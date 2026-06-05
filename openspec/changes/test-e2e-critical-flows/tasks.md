# Tasks — test-e2e-critical-flows (parent §6.1)

References: [proposal.md](proposal.md) · [design.md](design.md) · [specs/e2e-critical-flows/spec.md](specs/e2e-critical-flows/spec.md) · [specs/testing-foundation/spec.md](specs/testing-foundation/spec.md)

**Prerequisite:** 6.0 `test-e2e-foundation` ([#102](https://github.com/JoshEddie/CTRLplusList/issues/102), merged in [#104](https://github.com/JoshEddie/CTRLplusList/pull/104)) provides the harness — local DB target, `next start` server mode, the `authenticated` (seeded viewer) / `guest` (logged-out, `BYPASS_SESSION_USER=guest`) projects, and CI tiers. This change authors specs against it and does NOT reshape the harness.

## 1. Harness readiness (consume 6.0, do not rebuild)

- [x] 1.1 Confirm the 6.0 harness (merged in [#104](https://github.com/JoshEddie/CTRLplusList/pull/104)): `playwright.config.ts` exposes the `authenticated` (session ⇒ seeded viewer) and `guest` (`BYPASS_SESSION_USER=guest` ⇒ `auth()` null) projects, both under `USE_PG_DRIVER=1` against the local Docker DB running under `next start`.
- [x] 1.2 Route specs by 6.0's filename-suffix convention — `*.auth.spec.ts` → `authenticated`, `*.guest.spec.ts` → `guest` ([playwright.config.ts](../../../playwright.config.ts)) — so each spec lands in the session mode its flow needs. (Routed: `auth.auth`, `list-lifecycle.auth`, `owner-spoiler.auth`, `signed-in-claim.auth` → authenticated; `auth.guest`, `guest-claim.guest` → guest.)

## 2. Seed negative-case audit (Decision 3) — four-audit obligation #3

- [x] 2.1 Audit the seeded DB for each required fixture under stable selection: (a) a viewer-owned list carrying a claim (owner-spoiler); (b) a friend-owned **Shared** (`visibility = 'public'`) list with an item NOT at `quantity_limit` capacity the viewer can claim (signed-in-claim); (c) a public **Shared** list with a guest-claimable item (guest-claim). Note the seed places purchases by position/hash (`${itemId}-purchase-${n}`, `asGuest = hash % 8 === 0`), so a specific target is not guaranteed by stable selector.
- [x] 2.2 Record the disposition per fixture in §6.3: build-own-state (preferred where the flow creates it), defensive runtime selection (read-only seeded fixtures), or seed extension (only if 2.1 cannot reach the state deterministically).
- [x] 2.3 If — and only if — 2.1 requires it, extend [scripts/seed-dev-users.ts](../../../scripts/seed-dev-users.ts) with a guaranteed fixture (e.g. a friend-owned Shared list with a known `quantity_limit: null` item guaranteed guest-claimable; a viewer-owned list with a guaranteed pre-existing claim). Add the seed-as-fixture review-coupling note; record entities in the change description. Re-seed and restart per the harness's DB workflow. — **NOT required**: the audit (2.1) reached every fixture deterministically from the existing seed (see §6.3); the seed is unchanged.

## 3. Shared e2e helpers (extract on 2nd duplication only — testing-foundation)

- [x] 3.1 As specs are authored, extract repeated setup to `test/helpers/e2e/` only when a second spec duplicates it (e.g. `createListViaUi(page, { name, date })`, a seeded-fixture locator, or an open-purchase-modal helper). Single-use setup stays inline. — Extracted `firstClaimableSingleItem(page)` to a co-located, growable [test/helpers/e2e/utils.ts](../../../test/helpers/e2e/utils.ts) (shared by signed-in-claim + guest-claim). `createListViaUi` stayed inline (single caller: list-lifecycle).

## 4. Authenticated-project specs (seeded-viewer session)

- [x] 4.1 `auth` (authenticated half) — navigate to a protected page (`/`), assert it renders for **Test Viewer** with no sign-in step (the seeded-viewer session resolves end-to-end). Name e.g. `SignIn_BypassEnabled_RendersProtectedPage`. ([e2e/auth.auth.spec.ts](../../../e2e/auth.auth.spec.ts))
- [x] 4.2 `list-lifecycle` — the owner happy-path arc, asserting each step's observable result ([e2e/list-lifecycle.auth.spec.ts](../../../e2e/list-lifecycle.auth.spec.ts)):
  - create a list at `/lists/new` (`ListForm`: fill `Name` (≥3 chars, per-run-unique e.g. timestamped) + `Date`, submit "Create List"); assert landing on `/lists/{id}/choose-items?new=1`.
  - add items via `ChooseItemsForm` (select ≥1 item, submit); assert the items attach.
  - set visibility to **Shared** via the `VisibilityPicker` popover; assert the trigger pill reads "Shared".
  - exercise **Share** (`ShareButton`, `aria-label="Share list"`); assert the share control is reachable on the now-non-hidden list.
- [x] 4.3 `owner-spoiler` — against a viewer-owned list carrying a claim (fixture per §2): assert the owner's default view hides the claim; append `?spoilers=1` and assert the claimer's first name is revealed. Pins the `sanitizePurchases` owner-default-`[]` ⇄ owner-spoiler-firstName divergence. ([e2e/owner-spoiler.auth.spec.ts](../../../e2e/owner-spoiler.auth.spec.ts))
- [x] 4.4 `signed-in-claim` — as the signed-in viewer (a non-owner; the follow relationship is incidental), open a seeded **friend-owned Shared** list and exercise BOTH authenticated purchase-modal branches, each on its own claimable item ([e2e/signed-in-claim.auth.spec.ts](../../../e2e/signed-in-claim.auth.spec.ts)):
  - **"I purchased it"** self-claim → assert the item reflects the viewer's own claim ("You claimed this"), persisted on reload.
  - **"Someone else"** on-behalf-of claim → routes through the distinct "Who purchased this item?" step with a purchaser-name field; assert the claim is attributed to the **named third party** ("Claimed by &lt;name&gt;", NOT "You claimed this"), persisted on reload. This pins the §5b fix — the server now honors the typed name instead of discarding it.
  - Note in-spec that owner-side hiding is the same mechanism pinned by 4.3 (cross-user owner observation is a Non-Goal).

## 5. Guest-project specs (logged-out session — `BYPASS_SESSION_USER=guest`)

- [x] 5.1 `auth` (logged-out half) — navigate to `/sign-in` with no session; assert the AuthPage sign-in UI renders (Ctrl+List logo + "Sign in with Google"). Assert presence only; do NOT click through to OAuth (Decision 6). Name e.g. `SignIn_BypassDisabled_RendersGoogleButton`. ([e2e/auth.guest.spec.ts](../../../e2e/auth.guest.spec.ts))
- [x] 5.2 `guest-claim` — **REQUIRED** ([#88](https://github.com/JoshEddie/CTRLplusList/issues/88) pin). With no session: navigate by URL to a public **Shared** list (fixture per §2); assert it renders without sign-in. Open the purchase modal on a claimable item, take the "continue as guest" branch, enter a guest name, confirm "Purchase as Guest"; assert success and that the item reflects the claim on reload. Add a regression comment naming #88. Name e.g. `GuestClaim_PublicList_RecordsGuestPurchase`. ([e2e/guest-claim.guest.spec.ts](../../../e2e/guest-claim.guest.spec.ts))

## 5b. Folded-in fixes — real bugs surfaced while authoring the specs

Three production defects surfaced during authoring; by owner decision they were fixed and folded in (overriding the design's "spin real non-test gaps to a new sub-proposal" rule) because each is small, single-source, production-safe, and directly unblocks a required flow.

### 5b-i. On-behalf purchase attribution (`createPurchase`)

Surfaced via `signed-in-claim` (§4.4): the authenticated "Someone else" branch silently **discarded** the typed purchaser name and recorded the claim as the caller's own. The UI was already correct (it sends the name and renders "Claimed by &lt;name&gt;"); the server action + spec were the bug.

- [x] 5b.1 Fix [app/actions/items.ts](../../../app/actions/items.ts) `createPurchase`: an authenticated caller supplying a non-empty `guest_name` records a **named guest claim** (`user_id NULL`, `guest_name` set); the request is still authorized by the caller's session id (viewability/block gate uses the caller). Self-claim (no `guest_name`) is unchanged.
- [x] 5b.2 Update unit tests [app/actions/__tests__/items.test.ts](../../../app/actions/__tests__/items.test.ts): replace `Authed_UsesSessionUserId-DiscardsGuestName` with `AuthedSelfClaim_UsesSessionUserId-NullGuestName` + `AuthedOnBehalf_RecordsNamedGuestClaim`; add `BlockedCallerOnBehalf_ReturnsItemNotFound-NoRow` (the on-behalf path is still caller-authorized).
- [x] 5b.3 Correct the misleading [Item.tsx](../../../app/(main)/items/ui/components/Item.tsx) comment that claimed the server ignores `guest_name` for a session caller.
- [x] 5b.4 Add MODIFIED deltas: [specs/list-item-management/spec.md](specs/list-item-management/spec.md) (createPurchase identity + purchase-modal contracts) and [specs/server-endpoint-authorization/spec.md](specs/server-endpoint-authorization/spec.md) (guest-write-paths clause widened to authenticated on-behalf).

### 5b-ii. `createList` date serialization under postgres-js

Surfaced via `list-lifecycle` (§4.2): [app/actions/lists.ts](../../../app/actions/lists.ts) `createList` passed the `Date` through an `sql\`${…}\`` template, which the postgres-js driver (dev:local / e2e) rejects (`TypeError: … Received an instance of Date`) while neon-http tolerates it — so **UI list-creation in `dev:local` was broken**, latent because production uses neon-http.

- [x] 5b.5 Pass the `Date` directly (`date: validatedData.date`) so Drizzle serializes it column-aware — matching the already-working `updateList` in the same file. The `sql` wrap stays on `occasion` only (it laundered its `string | null | undefined` Zod type past the not-null column). No DB/schema change.

### 5b-iii. `/sign-in` prerendered with the build-time bypass session

Surfaced via `auth.guest` (§5.1): under `cacheComponents: true` the synchronous local-mode bypass `auth()` makes auth-gated pages statically prerenderable, so the e2e build baked `/sign-in` as a `redirect('/')` (build runs as the seeded viewer). The guest server served that static redirect → Test Viewer home, so the logged-out sign-in surface never rendered. (Production's real `auth()` reads cookies ⇒ dynamic ⇒ never prerendered, so this is bypass-only.)

- [x] 5b.6 Add `await connection()` to [SignInPage](../../../app/(auth)/ui/components/SignInPage.tsx) — the component that consumes `auth()` and redirects — so it resolves the session per request (per e2e session mode) instead of being prerendered with the build-time session. (It must live where `auth()` is consumed: under `cacheComponents` an opt-in on the route shell alone leaves `SignInPage` a separately-cached unit.) Production no-op (already dynamic there). **Follow-up (B2, NOT done here):** the complete fix is to make the bypass `auth()` itself dynamic so the whole class of auth-gated prerendered pages (e.g. `/`) renders per-server — that touches the `lib/auth.ts` seam and belongs in a focused `test-e2e-foundation` hardening change. No current guest spec navigates to `/`, so fixing the sign-in surface suffices here.

### 5b-iv. `/lists` missing a Suspense boundary (postgres-js `Connection closed`)

Surfaced via `list-lifecycle` (§4.2): [app/(main)/lists/page.tsx](../../../app/(main)/lists/page.tsx) rendered `<MyListsPage>` **without** a Suspense boundary — unlike the home page and `/lists/[id]`, which both wrap their async sections. Under `cacheComponents`/dynamicIO that runs MyListsPage's dynamic DB reads in the abort-prone prospective-render phase, which closes the postgres-js connection (`Error: Connection closed`, digest `569928725`) and intermittently 500s the page (production neon-http is stateless-per-query, so it's masked there). The e2e hit it as the "This page couldn't load" error, so the "New List" modal trigger never rendered.

- [x] 5b.7 Wrap `<MyListsPage>` in `<Suspense fallback={<LoadingIndicator size="page" />}>` in [app/(main)/lists/page.tsx](../../../app/(main)/lists/page.tsx), matching the home / `/lists/[id]` pattern. Verified: 35/35 (`/lists`) sequential + concurrent requests now return 200 with zero error pages (was intermittently 500). (Residual benign `Connection closed` log noise from the prospective-render abort remains — a deeper postgres-js/cacheComponents driver concern for the `test-e2e-foundation` follow-up, not a failure.)

## 6. Spec & quality conformance + bookkeeping

- [x] 6.1 Assertion-substance audit (four-audit #1): every spec asserts an observable outcome (rendered text/state, persisted state on reload, navigation) — no execute-for-coverage navigations, no tautologies. Naming audit (#2): every `test(...)` name follows `<PageOrFlow>_<Action>_<ExpectedOutcome>`, self-contained.
- [x] 6.2 Invariant-elevation audit (four-audit #4): the flow set + guest-claim pin + no-real-OAuth are captured in `specs/e2e-critical-flows/spec.md`, which references `test-e2e-foundation` for the execution model rather than redefining it; the `testing-foundation` delta is archive-only Tier 2 bookkeeping.
- [x] 6.3 Four-audit findings recorded below. NO `vitest.config.ts` threshold change; NO harness/CI reshape (owned by 6.0).

  **(1) Assertion-substance.** Every spec asserts an observable outcome: `auth.auth` resolves the seeded identity ("Test Viewer" in the avatar popover) + absence of the sign-in affordance; `auth.guest` asserts the logo + Google button render; `list-lifecycle` asserts the post-create URL, the selected-count, the list heading, the visibility pill text, and the now-reachable Share control; `owner-spoiler` asserts the default view has zero "Spoilers:" banners then the `?spoilers=1` view reveals a banner with a name after the dash; `signed-in-claim` + `guest-claim` assert claim text persisted on reload. No execute-for-coverage navigations, no tautologies.

  **(2) Naming.** All `test(...)` names are three-part `<PageOrFlow>_<Action>_<ExpectedOutcome>`: `SignIn_BypassEnabled_RendersProtectedPage`, `SignIn_BypassDisabled_RendersGoogleButton`, `ListLifecycle_OwnerCreatesAndShares_StepsReflected`, `OwnerView_SpoilerToggle_HidesThenRevealsClaim`, `SignedInClaim_SelfPurchase_ShowsOwnClaim`, `SignedInClaim_OnBehalfOfOther_ShowsNamedClaim`, `GuestClaim_PublicList_RecordsGuestPurchase`.

  **(3) Seed negative-case + per-fixture disposition** (audited against the live seeded DB):
  - **(a) owner-spoiler** → *defensive seeded fixture*. Every viewer-owned list carries claims (audit: 7–11 claimed items each); `dev-list-viewer-birthday` (18 items, 9 claimed) is the stable target. No seed change.
  - **(b) signed-in-claim** → *defensive runtime selection* over `dev-list-alice-wedding` (audit: 11 items claimable by the viewer). `firstClaimableSingleItem` locates a single-claim, not-yet-mine item at runtime; robust to seed reshuffles. No seed change.
  - **(c) guest-claim** → *defensive runtime selection* over `dev-list-grace-birthday` (audit: 12 single-unclaimed items). Same helper. No seed change.
  - **Disposition summary:** `list-lifecycle` is build-own-state; the three read-only fixtures are defensive (seeded selection / runtime selection); **no `scripts/seed-dev-users.ts` extension was required** (2.3 not triggered).

  **(4) Invariant-elevation.** The flow set, the #88 guest-claim pin, and the no-real-OAuth constraint live in `specs/e2e-critical-flows/spec.md`, which references `test-e2e-foundation` for the execution model. The `testing-foundation` delta is archive-only Tier 2.

  **Non-test gaps surfaced → FIXED in-place (not deferred).** Authoring the specs surfaced four real production defects (full detail in §5b). By owner decision each was **fixed and folded in** — overriding the design's audit-deferral rule — because all are small, single-source, production-safe, and unblock a required flow: (i) `createPurchase` discarded an authenticated "Someone else" claim's typed name; (ii) `createList` rejected a `Date` under postgres-js (broke dev:local list-creation); (iii) `/sign-in` baked the bypass session at build (guest sign-in surface unrenderable); (iv) `/lists` lacked a Suspense boundary (intermittent postgres-js 500). One deferred follow-up remains (the dynamic-bypass-`auth()` whole-class hardening), flagged to `test-e2e-foundation`.
- [x] 6.4 Confirm `openspec validate test-e2e-critical-flows --strict` passes and the `testing-foundation` delta does NOT roll into the parent accumulator.

## 7. Pre-merge (all five gates — author-run locally against real `.env.local`)

- [x] 7.1 `npm run lint` — **0 errors**. (2 warnings remain in `Avatar.tsx` + `seed-dev-users.ts`, both pre-existing and untouched by this change; `eslint .` exits 0.)
- [x] 7.2 `npx tsc --noEmit` passes with zero errors (the root [tsconfig.json](../../../tsconfig.json) `include` globs cover `e2e/`; 6.0/[#104](https://github.com/JoshEddie/CTRLplusList/pull/104) removed the standalone `e2e/tsconfig.json`).
- [x] 7.3 `npm run build` completes successfully.
- [x] 7.4 `npm run test:coverage` — **149 files, 1874 tests passed**, no threshold failures. (The §5b on-behalf fix added/updated `items.test.ts` cases; the other folded-in fixes are behavior-preserving or page-shell changes.)
- [x] 7.5 `npm run test:e2e` — **9 passed** across the `authenticated` and `guest` projects (auth surface + bypass, list lifecycle, owner spoiler, signed-in self + on-behalf claim, guest claim, plus the 2 harness self-tests).
