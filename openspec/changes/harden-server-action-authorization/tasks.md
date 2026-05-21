## 1. Pre-flight

- [ ] 1.1 Run `SELECT (item_id, user_id), COUNT(*) FROM purchases WHERE user_id IS NOT NULL GROUP BY (item_id, user_id) HAVING COUNT(*) > 1;` against the prod database via the Vercel Postgres console. If any rows return, write and merge a one-off cleanup migration FIRST and re-run before proceeding.
- [x] 1.2 Grep the repo for client callers that construct a `user_id` field for `createList`, `updateList`, `createItem`, or `createPurchase` payloads. Confirm the list: `ListForm.tsx`, `ItemForm.tsx`, `useItemForm.ts`, `PurchaseFlow.tsx` (and any test files). Record them — they all change in step 4.
      - Callers found: `app/(main)/lists/ui/components/ListForm.tsx`, `app/(main)/items/ui/components/itemform/useItemForm.ts` (state seed), `app/(main)/items/ui/components/itemform/ItemForm.tsx` (preview map), `app/(main)/items/ui/components/Item.tsx` (createPurchase payload), `app/(main)/items/ui/components/Purchase.tsx` (no user_id constructed). No test files exist.

## 2. DB schema + migration

- [x] 2.1 In `db/schema.ts`, add a partial unique index to the `purchases` table on `(item_id, user_id) WHERE user_id IS NOT NULL`. Name it `purchases_item_user_unique_idx`.
- [x] 2.2 Generate a new drizzle migration with `npm run db:generate`. Confirm the generated SQL contains `CREATE UNIQUE INDEX IF NOT EXISTS "purchases_item_user_unique_idx" ON "purchases" ("item_id","user_id") WHERE "user_id" IS NOT NULL;`. Hand-edit the migration file to use `IF NOT EXISTS` if drizzle didn't emit it.
- [x] 2.3 Run `npm run db:migrate` against the local dev database. Verify with `psql … -c '\d+ purchases'` that the partial unique index exists.
- [x] 2.4 Run `npm run db:seed:dev` and confirm the seed completes without unique-constraint violations. (Seed data must already comply.)

## 3. Server action rewrites — lists

- [x] 3.1 In `app/actions/lists.ts`, remove the `user_id` field from `ListSchema`. Update the exported `ListData` type — callers should fail to typecheck if they still construct `user_id`.
- [x] 3.2 Rewrite `createList`: after `auth()` + email check, look up `users.id` from `users.email`. Use that id as `user_id` in the insert. Reject with `{ success: false, error: 'Unauthorized' }` if the user row isn't found.
- [x] 3.3 Rewrite `updateList`: after auth, look up `users.id`, then load the list row by `id`, then reject if `list.user_id !== sessionUser.id` before any `db.update` call. Also handle the case where `result.length === 0` from `.returning()` to avoid the `result[0].id` crash.
- [x] 3.4 Rewrite `deleteList`: same shape as `updateList` — auth → look up user → load list → ownership check → delete.
- [x] 3.5 Verify that none of the three actions call `updateTag('lists')` on the rejected-by-auth path. Move any `updateTag` calls to after the successful write.

## 4. Server action rewrites — items & purchases

- [x] 4.1 In `app/actions/items.ts`, remove the `user_id` field from `ItemSchema`. Update `createItem` to look up the session user id and inject it server-side.
- [x] 4.2 Add a `guardItemViewable` helper to `lib/listAccess.ts` (or co-locate in `lib/dal.ts`) that loads an item's parent list and returns true iff the item is on a list the caller can view (using the same predicate as `guardListViewable`). Use it in `createPurchase`.
- [x] 4.3 Rewrite `createPurchase` request shape: input is `{ item_id, guest_name }` — no `user_id`. Call `auth()`; if a session exists, look up `users.id` and use it (ignore `guest_name`); otherwise require non-empty `guest_name`.
- [ ] 4.4 Wrap the existence check + capacity count + insert in `await db.transaction(async (tx) => { … })`. Inside the transaction, lock the item row with `tx.select(…).from(items).where(eq(items.id, item_id)).for('update')` (or equivalent drizzle `SELECT FOR UPDATE`) before counting purchases.
      - **Skipped — driver constraint.** Neon's HTTP driver (`drizzle-orm/neon-http`) does not support interactive transactions, so `db.transaction(...)` and `SELECT … FOR UPDATE` are unavailable. The partial unique index from §2 still closes the duplicate-same-authenticated-user race at the DB layer; the capacity race for different users on a `quantity_limit`-bound item remains a known limitation. See the design Decision 4 for the originally-planned approach and the Risks section for the accepted residual.
- [x] 4.5 Catch the postgres unique-violation error code `'23505'` thrown by the partial unique index and convert it to `{ success: false, error: 'Duplicate claim' }`.
- [x] 4.6 Rewrite `removePurchase` to accept `{ purchase_id }` (preferred) OR `{ item_id, guest_name }` (authenticated path only). For unauthenticated callers, require `purchase_id` and load the row to verify `user_id IS NULL` AND `guest_name = payload.guest_name`.

## 5. API route rewrite — image-search

- [x] 5.1 In `app/api/image-search/route.ts`, add `const session = await auth();` at the top of `GET`. Return `NextResponse.json({ error: 'Unauthorized' }, { status: 401 })` when missing.
- [x] 5.2 Look up `users.id` from `session.user.email`. (Needed for the rate-limit key.)
- [x] 5.3 Add a module-level `const rateBuckets = new Map<string, { count: number; resetAt: number }>();` alongside the existing `resultCache`. Implement a `checkRateLimit(userId)` helper that refills every 60s and caps at 30 requests/minute. Return HTTP 429 with `{ error: 'rate_limited' }` when exceeded.
- [x] 5.4 Add a query-length cap: `if (trimmed.length > 200) return NextResponse.json({ error: 'query_too_long' }, { status: 400 });` before any provider call.
- [ ] 5.5 Confirm the dev simulate-quota and mock paths still work end-to-end (toggle `IMAGE_SEARCH_SIMULATE_QUOTA=true` and verify the 429 returns; verify rate-limit 429 is distinguishable from quota 429 by `error` field).

## 6. Update client callers

- [x] 6.1 In `app/(main)/lists/ui/components/ListForm.tsx` and `ListFormContainer.tsx`, stop sending `user_id` in the payload to `createList` / `updateList`. The form should no longer accept or render a user_id field.
- [x] 6.2 In `app/(main)/items/ui/components/itemform/ItemForm.tsx` and `useItemForm.ts`, stop sending `user_id` in the payload to `createItem` / `updateItem`.
- [x] 6.3 In `app/(main)/items/ui/components/purchasemodal/PurchaseFlow.tsx` and `PurchaseFlowContainer.tsx`, stop sending `user_id` to `createPurchase`. Pass only `item_id` and (for guest flow) `guest_name`.
- [x] 6.4 Update `removePurchase` callers (in `Purchase.tsx` and elsewhere) to pass `purchase_id` where available; the legacy `{ item_id }` shape continues to work for authenticated callers.
- [x] 6.5 Run `npx tsc --noEmit` and fix any type errors surfaced by the schema changes (this is the desired forcing-function — the type system should reject any missed call site).

## 7. Manual verification via dev bypass

- [ ] 7.1 Reset and re-seed: `npm run db:reset:dev`.
- [ ] 7.2 With `AUTH_BYPASS=true`, restart the dev server. Confirm the protected pages render under `dev-test-viewer`.
- [ ] 7.3 **Owner happy paths:** create a new list, rename it, delete it, create items, mark item as purchased, unmark. Verify all flows still succeed via the UI.
- [ ] 7.4 **Forgery attempt — list.** Disable bypass temporarily; use `curl` with a stolen session cookie OR invoke the server action via `fetch` from the browser DevTools console while signed in as Alice, passing `{ user_id: 'dev-test-viewer', name: 'pwned', date: …}` to `createList`. Confirm: the response is `success: false, error: 'Unauthorized'` OR the list is created with Alice's user_id (NOT viewer's). Acceptable: server overrides the user_id.
- [ ] 7.5 **IDOR attempt — update/delete.** Signed in as Alice, call `updateList(<viewer's-list-id>, …)` and `deleteList(<viewer's-list-id>)`. Confirm `success: false, error: 'Unauthorized'` and the list is unchanged.
- [ ] 7.6 **Purchase race.** Open two browser windows (one signed in as viewer, one as Alice). Both attempt to claim a `quantity_limit: 1` item simultaneously. Confirm exactly one succeeds and the other receives `Fully claimed`.
- [ ] 7.7 **Image-search auth.** Sign out. `curl 'http://localhost:3000/api/image-search?q=test'`. Confirm HTTP 401.
- [ ] 7.8 **Image-search rate limit.** Sign in. Issue 31 requests in a minute. Confirm the 31st returns HTTP 429 with `{ error: 'rate_limited' }`.

## 8. Pre-merge

- [x] 8.1 `npm run lint` and `npx tsc --noEmit` both clean.
- [x] 8.2 `openspec validate harden-server-action-authorization --strict` passes.
- [x] 8.3 Update `CLAUDE.md` if any of the dev-flow guidance changes (e.g. mention rate-limit behavior in dev).
- [ ] 8.4 Open the PR against `release-1.0` with a summary that cross-references PR #16's six 🔴 findings by file:line.
- [ ] 8.5 After merge, archive this change with `/opsx:archive harden-server-action-authorization` — the new `server-endpoint-authorization` spec and the `list-item-management` deltas become active.
