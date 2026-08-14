## 1. Drop-in conversions (identical rejection behavior)

Per design D3, each of these seven sites rejects identically before and after. Convert one site at a time, updating that site's tests in the same step (D7: mock `authedUserId` in place of `auth()` + `db.query.users.findFirst`), and run its suite before moving on.

- [ ] 1.1 `deleteItem` ([lib/data/item.actions.ts:259](lib/data/item.actions.ts:259)) — replace the inline `auth()` → `db.query.users.findFirst` block with `authedUserId()`; both former branches already `throw new Error('Unauthorized')`. Update `lib/data/__tests__/item.actions.test.ts` to mock `authedUserId`.
- [ ] 1.2 `updateItemStores` ([lib/data/item.associations.ts:53](lib/data/item.associations.ts:53)) — same swap; both branches `throw new Error('Unauthorized')`. Update `lib/data/__tests__/item.associations.test.ts`.
- [ ] 1.3 `updateItemLists` ([lib/data/item.associations.ts:188](lib/data/item.associations.ts:188)) — same swap; same suite.
- [ ] 1.4 `setListItems` ([lib/data/listItems.actions.ts:41](lib/data/listItems.actions.ts:41)) — swap to `authedUserId()`; a `null` id still fails `id !== list.user_id`, so `error: 'Forbidden'` survives. The three existing `'Forbidden'` assertions in `lib/data/__tests__/listItems.actions.test.ts` stand unchanged; only the mocking moves.
- [ ] 1.5 `removePurchase` ([lib/data/purchase.actions.ts:265](lib/data/purchase.actions.ts:265)) — swap to `authedUserId()`; the site already collapses both causes to `actorUserId = null`. Update its cases in `lib/data/__tests__/purchase.actions.test.ts`.
- [ ] 1.6 `POST` ([app/api/product-fetch/route.ts:63](app/api/product-fetch/route.ts:63)) — swap to `authedUserId()` imported from `@/lib/data/user.session`; both former branches return HTTP 401, and the resolved id keys `checkRateLimit`. Update `app/api/product-fetch/__tests__/route.test.ts`.
- [ ] 1.7 Verify no `eq(users.email, …)` remains in the six converted modules, and that each dropped its now-unused `auth` / `users` / `eq` imports where nothing else uses them.

## 2. Conversions that normalize `message`

Per design D3, these three collapse `'Unauthorized access'` (no session) and `'User not found'` (no `users` row) into `'Unauthorized access'`. `error: 'Unauthorized'` and the absence of a write are unchanged.

- [ ] 2.1 `createItem` ([lib/data/item.actions.ts:32](lib/data/item.actions.ts:32)) — swap to `authedUserId()`, single rejection returning `{ success: false, error: 'Unauthorized', message: 'Unauthorized access' }`.
- [ ] 2.2 `updateItem` ([lib/data/item.actions.ts:108](lib/data/item.actions.ts:108)) — same swap and same normalized rejection.
- [ ] 2.3 `archiveItem` ([lib/data/item.actions.ts:207](lib/data/item.actions.ts:207)) — same swap and same normalized rejection.
- [ ] 2.4 Update `lib/data/__tests__/item.actions.test.ts`: `error`-code assertions stand; any assertion on the retired `'User not found'` message updates to `'Unauthorized access'`. Add no test that merely executes a swapped line (TESTING.md).

## 3. `resolveClaimIdentity` — branch preserved

- [ ] 3.1 `resolveClaimIdentity` ([lib/data/purchase.actions.ts:56](lib/data/purchase.actions.ts:56)) — keep `const session = await auth()` for the guest-vs-authenticated branch (design D4); inside the authenticated branch, replace the `db.query.users.findFirst` lookup with `authedUserId()` and keep the existing hard error (`'User not found'`) when it yields `null`.
- [ ] 3.2 In `lib/data/__tests__/purchase.actions.test.ts`, keep the `auth()` mock alongside the new `authedUserId` mock, since a real `auth()` call remains on this path.
- [ ] 3.3 Add the stale-session test: session present, `authedUserId` → `null`, `createPurchase` invoked on the authenticated branch — asserts rejection, and that no `purchases` row is written with `claimed_by = NULL`. Pins `server-endpoint-authorization`'s "A stale session does not become a guest" scenario.

## 4. Spec-conformance sweep

- [ ] 4.1 Grep `lib/data/**` and `app/api/**` for `eq(users.email` — the only remaining matches are `lib/data/user.session.ts` (the helper) and `lib/data/user.ts` (`getUserIdByEmail`, untouched per D2).
- [ ] 4.2 Confirm no new import runs `lib/data/**` → `app/**`; the product-fetch import runs the permitted `app/**` → `lib/data/**` direction (D5).
- [ ] 4.3 Confirm the enumerated guest write paths are unchanged: `createPurchase` with `guest_name`, unauthenticated `removePurchase`, `mintItemPlaceholder`.
- [ ] 4.4 Confirm no file crossed a file-size band as a result of the edits (all edits are net-negative).

## 5. Pre-merge

All five gates run locally against the author's real `.env.local`, each checked separately. This change edits executable source, so no doc-only exemption applies.

- [ ] 5.1 `npm run lint` — zero errors, zero non-size warnings.
- [ ] 5.2 `npx tsc --noEmit` — zero errors.
- [ ] 5.3 `npm run build` — completes successfully.
- [ ] 5.4 `npm run test:coverage` — zero failing tests.
- [ ] 5.5 `npm run test:e2e` — zero failing tests; the guest-claim flow is the end-to-end guard on task 3.1.
- [ ] 5.6 `openspec validate actor-resolution-consolidation --strict` — passes.
