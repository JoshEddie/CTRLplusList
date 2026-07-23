# Tasks — guest-claim-identity

## 1. Cookie internal module

- [x] 1.1 Create `lib/data/purchase.cookie.ts` (internal, no `'use server'`): cookie name + attribute constants (httpOnly, path=/, SameSite=Lax, Secure outside dev, 400-day max-age), 50-id cap constant, parse/validate (malformed or shape-invalid → null), serialize, and pure helpers to append/prune a purchase id (append mints `crypto.randomUUID()` id when starting fresh, stores last-entered name, caps newest-first)
- [x] 1.2 Add `overlayGuestClaims` pure helper: given items with `PurchaseView[]` and a set of cookie purchase ids, return items with matching purchases marked `claimedByViewer: true` and `by: 'self'` (presents as viewer-own: "You" banner, "(you)" manage row, no "Added by you" meta)
- [x] 1.3 Unit tests: parse rejects malformed/oversized/shape-invalid values; append mints once and reuses id; cap prunes oldest; prune removes only the target id; overlay marks only cookie-listed purchases

## 2. Write path — createPurchase

- [x] 2.1 On the signed-out guest branch of `createPurchase` (successful insert only), read/parse the cookie, append the new purchase id, and `cookies().set()` the rewritten cookie
- [x] 2.2 Verify authenticated branches never touch the cookie
- [x] 2.3 Unit tests: first guest claim sets cookie with new UUID + single id; second claim keeps id, prepends purchase id, updates name; authed claim writes no cookie

## 3. Removal path — removePurchase

- [x] 3.1 Swap `canRemovePurchase`'s guest branch (`lib/data/purchase.ts`): authorize all-NULL-identity rows iff the purchase id is in the caller-supplied cookie id set; drop the `guest_name` comparison
- [x] 3.2 In `removePurchase`, remove the `guest_name` payload field; read the cookie for the unauthenticated branch; on successful cookie-authorized delete, rewrite the cookie with the id pruned
- [x] 3.3 Update `removePurchase` call sites for the payload change
- [x] 3.4 Unit tests: cookie-listed all-NULL row deletes and prunes; unlisted id rejects with no write; cookie id on an identity-bearing row rejects; authed matrix paths unchanged

## 4. Read path — overlay

- [x] 4.1 At the server-component seam(s) where cached list-item results are handed to clients on guest-reachable surfaces, read the cookie when there is no session viewer and apply `overlayGuestClaims` post-cache; confirm no `'use cache'` function receives the cookie or a derivative
- [x] 4.2 Verify the guest with an overlaid claim reaches `Manage claim` / manage modal with removal action via existing `claimedByViewer`-keyed rendering (no component changes expected; fix at the seam if a surface hard-assumes an authed viewer)
- [x] 4.3 Unit tests: overlay applied only when sessionless; authed request with leftover cookie unaffected

## 5. Claimed guest never offered Add Claim (owner-directed spec refinement, 2026-07-23)

- [x] 5.1 Amend the `item-actions` delta (matrix row + scenario) and proposal/acceptance: a cookie-recognized guest with a claim gets `Manage claim` + full-width `View item ↗`, never `Add Claim`
- [x] 5.2 Gate `Add Claim` off for a claimed guest in `ItemActions` (guest-viewer signal through `Item` → `ItemCard` → `ItemActions`)
- [x] 5.3 Unit tests: claimed guest with slots remaining sees no `Add Claim`; authed claimer with slots keeps the 2-up; unclaimed guest keeps `Add Claim` primary

## 6. Gates + artifacts

- [x] 6.1 Refine `acceptance.md` flows with literal handles (real button text, routes)
- [x] 6.2a Gate: `npm run lint`
- [x] 6.2b Gate: `npx tsc --noEmit`
- [x] 6.2c Gate: `npm run build`
- [x] 6.2d Gate: `npm run test:coverage`
- [x] 6.2e Gate: `npm run test:e2e`
- [x] 6.3 Local-mode manual walk of the acceptance flows (guest claim → reload → manage → remove); restart dev server after any reseed
