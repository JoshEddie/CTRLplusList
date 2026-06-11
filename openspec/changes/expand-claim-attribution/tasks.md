## 1. Schema & migration

- [x] 1.1 Add `claimed_by` nullable FK column (`ON DELETE SET NULL`) to `purchases` in `db/schema.ts`; generate the Drizzle migration (existing `user_id` and the `(item_id, user_id)` partial unique index stay as-is)
- [x] 1.2 Backfill migration step: `claimed_by = user_id` where `user_id IS NOT NULL`
- [x] 1.3 Grep all `purchases.user_id` reads and reclassify each as purchaser-meaning (stays) or asserter-meaning (moves to `claimed_by`)

## 2. Data layer — reads

- [x] 2.1 Add `getEligiblePurchasers(ownerId, claimerId)` to `lib/data/user.ts`: intersection of owner's followers and followees, minus block edges with the claimer, minus the owner; `'use cache'` tagged `user_follows` + `user_blocks`; sorted claimer-mutuals first
- [x] 2.2 Update `sanitizePurchases` in `lib/data/purchase.ts`: existing `user_id`-keyed `'self'` marking and name resolution stay; owner spoiler view exposes claimer identity when `claimed_by ≠ user_id`
- [x] 2.3 Update `getItemsByListId` (and any other purchase readers found in 1.3) to select `claimed_by` where the UI needs it

## 3. Data layer — actions

- [x] 3.1 Rework `resolveClaimIdentity`/`createPurchase` in `lib/data/purchase.actions.ts` to produce the four row shapes (self / attributed / authenticated-guest / signed-out-guest), with `claimed_by` always session-resolved and the attribution target stored into purchaser `user_id`
- [x] 3.2 Add server-side eligibility re-verification for attribution targets (owner-mutual check + either-direction block check + not-owner check) before insert; comment the re-verify-vs-insert residual race inline, mirroring the existing capacity-race comment
- [x] 3.3 Allow the item owner as a claimer in `createPurchase` (remove/audit any non-owner assumptions); owner claims count toward `quantity_limit` like any other
- [x] 3.4 Rework `canRemovePurchase`/`removePurchase` to the rights matrix (`claimed_by` / purchaser `user_id` / item owner / unauthenticated name-match), loading the purchase row and item owner before delete
- [x] 3.5 Verify cache invalidation: purchase mutations keep `updateTag('items')`; no tag invalidation on rejection paths

## 4. UI — purchase modal & item

- [x] 4.1 Rebuild `PurchaseFlowContainer` as the single-screen me-first modal per design D9 (header, one-tap self-claim CTA with viewer/owner copy variants, owner-named divider + search placeholder, store-filter-pattern search live-filtering avatar+name rows from `getEligiblePurchasers` in a scrollable uncapped list, fallback-pointing empty state, inline-expanding name fallback with "Claim for {name}" submit) — replacing the initial/self/other branching and confirm screens; copy strings from D9
- [x] 4.2 Pool rows act on tap (no arrows, no second screen, no confirm step, no undo toast — the app-wide mutation status toast stays); recovery is the existing on-item unclaim affordance
- [x] 4.3 Owner spoiler view: render the claim affordance on items with remaining quantity and open the same modal (self / someone-else); spoilers-off view unchanged
- [x] 4.4 Owner spoiler view: render master-unclaim affordance on existing claims; non-owner unclaim affordances cover `claimed_by`/purchaser rights
- [x] 4.5 Handle the duplicate-purchaser conflict as "already marked as the purchaser" (viewer sees their existing claim), not an opaque error
- [x] 4.6 Make `.modal-overlay` cover the entire viewport: replace the `top: 149px` / `bottom: 16px` offsets (and the desktop `top: 84px` override) with `inset: 0` so the scrim dims nav, list hero, and pagination; retire the matching magic numbers in `.modal` max-height (`calc(100vh - 197px)` / `calc(100vh - 140px)`) in favor of a single `dvh`-based cap

## 5. Seed & docs

- [x] 5.1 Extend `scripts/seed-dev-users.ts` with deterministic attributed-claim rows, an owner self-claim, and a legacy-shape signed-out-guest row so every unclaim-matrix branch is reachable
- [x] 5.2 Update the CLAUDE.md seeded-coverage note if seed semantics described there change

## 6. Tests

- [x] 6.1 Unit tests (per TESTING.md) for `createPurchase` row shapes, eligibility re-verification (non-mutual, blocked, owner-target rejections), and the removal rights matrix including owner master unclaim and the fixed authenticated-guest-creator path
- [x] 6.2 Unit tests for `sanitizePurchases`: attributed rows get purchaser-keyed `'self'` marking and linked-name resolution; owner spoiler view surfaces the claimer when it differs
- [x] 6.3 Unit tests for `getEligiblePurchasers` (mutual intersection, block exclusion, sort order)
- [x] 6.4 E2E: attributed claim round-trips through the picker (flow 10 in the e2e-critical-flows delta)
- [x] 6.5 E2E: owner claims and master-unclaims under spoilers; affordances absent with spoilers off (flow 11)

## 7. Pre-merge

- [x] 7.1 `npm run lint` — zero errors, zero warnings
- [x] 7.2 `npx tsc --noEmit` — zero errors
- [x] 7.3 `npm run build` — completes successfully
- [x] 7.4 `npm run test:coverage` — zero failing tests, coverage reported
- [x] 7.5 `npm run test:e2e` — zero failing tests

## 8. Review remediation (PR #132 spec-review)

- [x] 8.1 `PurchaseFlowContainer`: add rejection handling to the `getClaimPickerForItem` fetch — clear `pickerLoading` (leave the pool empty so the fallback-pointing empty state shows) instead of stranding "Loading…" on a transport failure
- [x] 8.2 Deduplicate the claim-summary derivation: `Item` already computes `claimSummary` — pass it to `ClaimBanners` as a prop and delete the recomputation (or extract one helper into the co-located `utils.ts`)
- [x] 8.3 Migration `0006_add_claimed_by.sql`: add `IF NOT EXISTS` to the `ADD COLUMN`, and wrap the FK `ADD CONSTRAINT` in a `DO $$` block guarded on `pg_constraint` (Postgres has no `ADD CONSTRAINT IF NOT EXISTS`), per DATABASE.md step 3
- [x] 8.4 Make the backfill idempotent: `UPDATE ... SET claimed_by = user_id WHERE user_id IS NOT NULL AND claimed_by IS NULL` — a re-run after attributed claims exist must not overwrite the claimer with the purchaser
- [x] 8.5 Reword the seed comments at `scripts/seed-dev-users.ts:527-528` and `:784` to the durable constraint (the claim-attribution and owner-spoiler e2e specs depend on these exact rows/edges) without naming the change or flow numbers
- [x] 8.6 Retire the legacy `item_id`-scoped `removePurchase` path (unreachable from the current UI — the modal only offers undo when `removableClaim` is non-null): remove the union member, the where-clause delete block, the dead `Item.tsx` fallback, and their tests, so every delete flows through the load-row + `canRemovePurchase` matrix the specs mandate
- [x] 8.7 Re-run the pre-merge gates (7.1–7.5) after the remediation lands
