## 1. Drop-in conversions (identical rejection behavior)

Per design D3, each of these seven sites rejects identically before and after. Convert one site at a time and run that site's suite before moving on; per D7 the suites mock `auth()` and query a real pglite database, so no test-mock migration is needed.

- [x] 1.1 `deleteItem` ([lib/data/item.actions.ts:259](lib/data/item.actions.ts:259)) — replace the inline `auth()` → `db.query.users.findFirst` block with `authedUserId()`; both former branches already `throw new Error('Unauthorized')`. Run `lib/data/__tests__/item.actions.test.ts`.
- [x] 1.2 `updateItemStores` ([lib/data/item.associations.ts:53](lib/data/item.associations.ts:53)) — same swap; both branches `throw new Error('Unauthorized')`. Run `lib/data/__tests__/item.associations.test.ts`.
- [x] 1.3 `updateItemLists` ([lib/data/item.associations.ts:188](lib/data/item.associations.ts:188)) — same swap; same suite.
- [x] 1.4 `setListItems` ([lib/data/listItems.actions.ts:41](lib/data/listItems.actions.ts:41)) — swap to `authedUserId()`; a `null` id still fails `id !== list.user_id`, so `error: 'Forbidden'` survives. The three existing `'Forbidden'` assertions in `lib/data/__tests__/listItems.actions.test.ts` stand unchanged, and no mocking changes.
- [x] 1.5 `removePurchase` ([lib/data/purchase.actions.ts:265](lib/data/purchase.actions.ts:265)) — swap to `authedUserId()`; the site already collapses both causes to `actorUserId = null`. Run its cases in `lib/data/__tests__/purchase.actions.test.ts`.
- [x] 1.6 `POST` ([app/api/product-fetch/route.ts:63](app/api/product-fetch/route.ts:63)) — swap to `authedUserId()` imported from `@/lib/data/user.session`; both former branches return HTTP 401, and the resolved id keys `checkRateLimit`. Run `app/api/product-fetch/__tests__/route.test.ts`.
- [x] 1.7 Verify no `eq(users.email, …)` remains in the six converted modules, and that each dropped its now-unused `auth` / `users` / `eq` imports where nothing else uses them.

## 2. Conversions that normalize `message`

Per design D3, these three collapse `'Unauthorized access'` (no session) and `'User not found'` (no `users` row) into the shared `UNAUTHORIZED_RESPONSE`. `error: 'Unauthorized'` and the absence of a write are unchanged.

- [x] 2.1 `createItem` ([lib/data/item.actions.ts:32](lib/data/item.actions.ts:32)) — swap to `authedUserId()`, single rejection returning `UNAUTHORIZED_RESPONSE` from `@/lib/data/user.session` rather than a hand-rolled literal.
- [x] 2.2 `updateItem` ([lib/data/item.actions.ts:108](lib/data/item.actions.ts:108)) — same swap and same normalized rejection.
- [x] 2.3 `archiveItem` ([lib/data/item.actions.ts:207](lib/data/item.actions.ts:207)) — same swap and same normalized rejection.
- [x] 2.4 Run `lib/data/__tests__/item.actions.test.ts`: `error`-code assertions stand, and no test asserts either retired `message` string, so nothing updates. Add no test that merely executes a swapped line (TESTING.md).

## 3. `resolveClaimIdentity` — branch preserved

- [x] 3.1 `resolveClaimIdentity` ([lib/data/purchase.actions.ts:56](lib/data/purchase.actions.ts:56)) — keep `const session = await auth()` for the guest-vs-authenticated branch (design D4); inside the authenticated branch, replace the `db.query.users.findFirst` lookup with `authedUserId()` and keep the existing hard error (`'User not found'`) when it yields `null`.
- [x] 3.2 In `lib/data/__tests__/purchase.actions.test.ts`, the existing `auth()` mock covers both the guest-vs-authenticated branch and the id resolution; no `authedUserId` mock is added.
- [x] 3.3 Add the stale-session test: session present, `authedUserId` → `null`, `createPurchase` invoked on the authenticated branch — asserts rejection, and that no `purchases` row is written with `claimed_by = NULL`. Pins `server-endpoint-authorization`'s "A stale session does not become a guest" scenario.

## 4. Spec-conformance sweep

- [x] 4.1 Grep `lib/data/**` and `app/api/**` for `eq(users.email` — the only remaining matches are `lib/data/user.session.ts` (the helper) and `lib/data/user.ts` (`getUserIdByEmail`, untouched per D2).
- [x] 4.2 Confirm no new import runs `lib/data/**` → `app/**`; the product-fetch import runs the permitted `app/**` → `lib/data/**` direction (D5).
- [x] 4.3 Confirm the enumerated guest write paths are unchanged: `createPurchase` with `guest_name`, unauthenticated `removePurchase`, `mintItemPlaceholder`.
- [x] 4.4 Confirm no file crossed a file-size band as a result of the edits (all edits are net-negative).

## 5. Pre-merge

All five gates run locally against the author's real `.env.local`, each checked separately. This change edits executable source, so no doc-only exemption applies.

- [x] 5.1 `npm run lint` — zero errors, zero non-size warnings.
- [x] 5.2 `npx tsc --noEmit` — zero errors.
- [x] 5.3 `npm run build` — completes successfully.
- [x] 5.4 `npm run test:coverage` — zero failing tests.
- [x] 5.5 `npm run test:e2e` — zero failing tests; the guest-claim flow is the end-to-end guard on task 3.1.
- [x] 5.6 `openspec validate actor-resolution-consolidation --strict` — passes.

## 6. Gates — round 1

> Findings by durable ID (severity, `path:line`, citation, reconcile side) are in
> `review.md` Round 1. Resolve each open `Fix now` there before checking it off.

- [x] 6.1 A1 — reconcile D7's test-mock premise with reality (migrate the mocks, or reword D7 + tasks 1.1/1.2/1.4/1.6/2.4/3.2) — _resolved on the artifact side: D7 rewritten, proposal.md test paragraph corrected, clauses reworded_
- [x] 6.2 A2 — reword or drop task 2.4's vacuous assertion clause — _resolved: 2.4 now states no test asserts either message string_
- [x] 6.3 A3 — record the `setListItems` rejection-shape spec amendment as a task, or revert it — _no work: dropped at adjudication, see review.md Round 1 Adjudications_
- [x] 6.4 A4 — widen task 3.3 to cover the guest-name stale-session variant, or drop the added case — _no work: dropped at adjudication, see review.md Round 1 Adjudications_
- [x] 6.5 B5 — drop the double `auth()` in `resolveClaimIdentity` (reuse `getUserIdByEmail`) — _no work: dropped at adjudication (merged B5+B6), see review.md Round 1 Adjudications_
- [x] 6.6 B6 — drop the double `auth()` in `setListItems` — _no work: dropped at adjudication (merged B5+B6), see review.md Round 1 Adjudications_
- [x] 6.7 B7 — return `UNAUTHORIZED_RESPONSE` in `item.actions.ts` instead of three hand-rolled literals
- [x] 6.8 T8 — assert write-absence in `UnknownEmail_ReturnsForbidden`
- [x] 6.9 T9 — assert body + no seam call in `UnknownSessionEmail_Returns401`
- [x] 6.10 `npm run lint` — zero errors, zero non-size warnings
- [x] 6.11 `npx tsc --noEmit` — zero errors
- [x] 6.12 `npm run build` — completes successfully
- [x] 6.13 `npm run test:coverage` — zero failing tests
- [x] 6.14 `npm run test:e2e` — zero failing tests
