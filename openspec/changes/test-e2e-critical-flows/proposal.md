## Why

Sub-proposal 6.1 of the `test-coverage` initiative ([issue #55](https://github.com/JoshEddie/CTRLplusList/issues/55)). The carve-out is the **critical-flow e2e specs** — the user journeys that must stay covered by a real-browser test. The parent `test-coverage` `tasks.md` §6.1 names: "Playwright suite against `AUTH_BYPASS=true` + seeded DB. Flows: sign-in (with bypass), create list, add items, set visibility, share, friend claim with spoiler hiding, owner sees claim. AuthPage sign-in UI covered here." Plus the **REQUIRED FLOW** ([#88](https://github.com/JoshEddie/CTRLplusList/issues/88)): a logged-out **guest** claims an item on a **public ("Shared") list** — the exact regression `fix-guest-claim-shared-lists` fixed; the suite SHALL pin it so it cannot silently break again.

**Depends on 6.0 `test-e2e-foundation` ([issue #102](https://github.com/JoshEddie/CTRLplusList/issues/102)).** The e2e *execution model* — the local Docker DB target (so runs don't burn the metered Neon branch), the `next start` (production build) server mode, the bypass-on / bypass-off two-project harness, and the CI tiers — is owned by 6.0. This sub-proposal authors **only the flow specs** and asserts them against the harness 6.0 provides. 6.1 SHALL NOT reshape `playwright.config.ts`'s execution model, choose the DB driver, or define CI jobs — it consumes those. (If 6.0 has not yet landed when 6.1 is applied, the harness pieces are a prerequisite, not in-scope work to duplicate here.)

Inherited constraints surfaced by spec-grep (every binding SHALL applies verbatim):

- `testing-foundation` (active accumulator at `openspec/changes/test-coverage/specs/testing-foundation/spec.md`) — **E2E placement** (specs under `e2e/`); **seed-as-fixture** (`scripts/seed-dev-users.ts` is canonical; a seed edit is a breaking change to the suite; a negative-case audit obligation applies); **no real external services** ("NextAuth is not invoked against real Google" — the sign-in-UI spec asserts the affordance but SHALL NOT complete OAuth; `AUTH_BYPASS` is the sanctioned authenticated stand-in); the assertion-substance bar; and the Playwright naming convention `<PageOrFlow>_<Action>_<ExpectedOutcome>`. The e2e *execution model* additions to this spec are **6.0's** (Tier 1); 6.1 contributes only archive-only Tier 2 carve-out bookkeeping.
- `list-visibility` (active) — "a list has `visibility = 'public'` … the list is URL-accessible to **anyone**" — the contract the guest-view-then-claim flow exercises end-to-end. Canonical labels: `'private'`→**Hidden**, `'unlisted'`→**Private**, `'public'`→**Shared**.
- `server-endpoint-authorization` (active, 4.13) — "Guest write paths (currently only `createPurchase` when the caller is unauthenticated)…" The guest-claim flow is the only sanctioned unauthenticated write; this suite is its real-browser pin. The full caller-class matrix is 4.13's job — 6.1 asserts the happy guest-claim path.
- `list-item-management` (4.9) — owns the claim/purchase flow, `quantity_limit` capacity, and the purchase-modal UI (`createPurchase`, `?purchaseItem=<id>` slot, the guest-name path). The e2e drives these as-is.
- `list-hero-header` / `list-item-management` — own the **spoiler** mechanism: `?spoilers=1` is honored only for the owner ([ListHeroSection.tsx:31](../../../app/(main)/lists/[id]/ListHeroSection.tsx)); `sanitizePurchases` ([lib/dal.ts:55](../../../lib/dal.ts)) returns `[]` to an owner without spoilers, first names with spoilers, and first names to any non-owner viewer. The e2e pins this observable divergence.
- `following` (4.2) — defines the follower relationship making a "friend" a non-owner-but-following viewer (seed graph: viewer follows Alice/Bob/Eve/Frank/Grace/Hank).

Cache-freshness note (per the proposal rule): the flows write through `createList` / `setListItems` / `setListVisibility` / `createPurchase`, each of which calls `revalidateTag(...)` for its tags within the serving process, so an e2e read observes the write on reload. Cross-process freshness (a write on one harness server observed from the other) is a property of 6.0's two-server model — 6.1's specs SHALL assert only same-server / seeded state and SHALL NOT depend on cross-process propagation (see `design.md` Decision 2).

## What Changes

- **NEW** `e2e/` Playwright specs (authored against the 6.0 harness), named per `<PageOrFlow>_<Action>_<ExpectedOutcome>`:

  - **`auth`** — sign-in surface + bypass session. Bypass **off** (guest project): `/sign-in` renders the AuthPage UI (Ctrl+List logo + the `"Sign in with Google"` affordance); assert presence, do **NOT** click through to OAuth. Bypass **on** (authenticated project): a protected page (`/`) renders as **Test Viewer** with no sign-in step.

  - **`list-lifecycle`** (authenticated) — the owner happy-path arc: create a list at `/lists/new` (`ListForm` → `createList`, lands on `/lists/{id}/choose-items?new=1`); add items (`ChooseItemsForm` → `setListItems`); set visibility to **Shared** via the `VisibilityPicker` popover (`setListVisibility(id, 'public')`); exercise **Share** (`ShareButton`, `aria-label="Share list"`). Each step asserts its observable result.

  - **`owner-spoiler`** (authenticated) — against a viewer-owned list carrying a claim: the owner's default view hides the claim (`sanitizePurchases` → `[]`); `?spoilers=1` reveals the claimer first name.

  - **`friend-claim`** (authenticated) — the viewer (a follower of the owner) opens a seeded **friend-owned Shared list**, claims an item via the purchase modal (`createPurchase`), and the item reflects the viewer's own claim ("You").

  - **`guest-claim`** (guest project, bypass off) — **REQUIRED** ([#88](https://github.com/JoshEddie/CTRLplusList/issues/88) pin): a guest with no session opens a **public ("Shared") list** by URL, claims an item via the modal's guest path (`"Your name"` + `"Purchase as Guest"` → `createPurchase` with `user_id: null`, `guest_name` set), and the item reflects the claim on reload.

- **NEW** capability spec `e2e-critical-flows` — the durable flow-level contract: which user flows SHALL remain e2e-covered, that the guest-claim-on-public-list path SHALL be pinned, and that the suite SHALL NOT complete a real OAuth handshake. (The *execution* model — two server modes, DB target, CI — is `test-e2e-foundation`'s contract, referenced here, not redefined.)

- **NEW** thin e2e helpers under `test/helpers/e2e/` only where 2+ specs duplicate setup (per the testing-foundation extraction rule).

- **Seed negative-case audit** (its fixtures): confirm each required fixture is reachable deterministically — (a) a viewer-owned list with a claim (owner-spoiler); (b) a friend-owned **Shared** list with a not-at-capacity item the viewer can claim (friend-claim); (c) a public **Shared** list with a guest-claimable item (guest-claim). Disposition per fixture (build-own-state / defensive runtime selection / seed extension) decided at apply time (`design.md` Decision 3). Any seed edit carries the testing-foundation review-coupling note. The seed *infrastructure* (compose, schema setup) is 6.0's; this audit is about 6.1's specific fixtures.

- **NEW** `testing-foundation` carve-out bookkeeping (archive-only, Tier 2 per D13): records the first critical-flow specs authored against the 6.0 harness and the seed negative-case audit outcome. Does **not** modify the active `testing-foundation` spec and does **not** roll into the parent accumulator (the e2e *execution* model rolls in via 6.0, not 6.1).

- **NO** `playwright.config.ts` execution-model reshape, **NO** DB-driver/target choice, **NO** CI jobs — all owned by 6.0. (6.1 only assigns its specs to the harness's projects.)

- **NO** `vitest.config.ts` coverage-floor changes — Playwright e2e is the integration tier and contributes no per-file coverage.

## Capabilities

### New Capabilities

- `e2e-critical-flows`: the flow-level contract for the e2e suite — the set of user flows that SHALL stay covered (sign-in surface, create list, add items, set visibility, share, friend claim with spoiler hiding, owner sees claim, and the REQUIRED guest-claim-on-public-list path) and the no-real-OAuth constraint. References `test-e2e-foundation` for the execution model.

### Modified Capabilities

- `testing-foundation`: carve-out bookkeeping written to this sub-proposal's **archive-only** delta (Tier 2 per `test-coverage` design D13) — first critical-flow specs authored against the 6.0 harness; seed negative-case audit recorded. No change to the active spec; no change to the parent accumulator. (The e2e execution-model Tier-1 additions to `testing-foundation` are 6.0's, not 6.1's.)

## Impact

- **New files:** five `e2e/*.spec.ts` specs; possibly thin helpers under `test/helpers/e2e/`; the `e2e-critical-flows` spec delta and the `testing-foundation` archive-only delta under this change's `specs/`.
- **Modified files:** none in production source; possibly [scripts/seed-dev-users.ts](../../../scripts/seed-dev-users.ts) (only if the audit requires a guaranteed fixture, with the review-coupling note). `playwright.config.ts`, docker/compose, and CI are touched by **6.0**, not here.
- **Prerequisite:** 6.0 `test-e2e-foundation` (the harness, DB target, `next start` mode, two-project scaffolding, CI tiers).
- **No new runtime dependencies** (`@playwright/test` already installed by `test-foundation`).
