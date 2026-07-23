# Guest claim identity cookie

Issue: [#236](https://github.com/JoshEddie/CTRLplusList/issues/236) · chunk 3 of [MAP #233](https://github.com/JoshEddie/CTRLplusList/issues/233) · design record [#169](https://github.com/JoshEddie/CTRLplusList/issues/169) (Guest claim identity section). Scope shrunk to defect-only at embark (2026-07-23); guest one-click Buy & Claim + remembered name deferred to [#293](https://github.com/JoshEddie/CTRLplusList/issues/293).

## Why

A signed-out guest's claim is stored with all-NULL identity (`claimed_by NULL, user_id NULL, guest_name` set), so every `claimedByViewer` check fails for the guest who made it. The guest never sees `Manage claim`; their accidental claim is irreversible from the UI even though `removePurchase` has a guest authorization path — that path (exact `guest_name` match) is reachable by no UI and never has been. The claim reads as *covered* to every other giver and to the owner, so a stale guest claim actively suppresses real gifts.

Inherited binding constraints found in active specs:

- `server-endpoint-authorization` — guest write paths are enumerated by name; `createPurchase` with non-empty `guest_name` is one, and the removal-rights requirement currently pins "the unauthenticated guest-name-match path is unchanged". This change revises both clauses (delta below).
- `claim-attribution` — owns the row model, the removal matrix (which names the guest exact-name path), the manage-state modal, and `sanitizePurchases` viewer-relative display.
- `item-actions` — owns the card state matrix; today a guest is worded onto the `Add Claim`-primary row only, and "Buy & Claim SHALL be offered only to an authenticated non-owner" stays true.
- Invariant that MUST NOT regress (already enforced, cited so review guards it): an unauthenticated caller cannot record an attributed claim — `resolveClaimIdentity` rejects `purchased_by` without a session, and the guest modal branch renders name entry + sign-in only, never the candidate picker.

## What Changes

- `createPurchase`'s signed-out guest path additionally writes a browser cookie holding: the new purchase id (appended to prior ids), a stable generated guest `user_id` (UUID — dormant forward-compat seed for [#170](https://github.com/JoshEddie/CTRLplusList/issues/170), created once per browser), and the entered guest name.
- A request-scoped, post-cache overlay marks purchases whose ids appear in the cookie as `claimedByViewer` for signed-out viewers, after the `'use cache'` DAL reads return and before data reaches client components. The cookie is never an input to any `'use cache'` boundary.
- A cookie-recognized guest therefore reaches the existing `Manage claim` card state and manage modal, with removal actions on their own claims.
- `removePurchase`'s unauthenticated path authorizes by purchase-id-in-cookie on all-NULL-identity rows; the exact-`guest_name`-match authorization is retired (**BREAKING** at spec level; the path was never reachable from any UI, so no user-facing behavior is removed). Successful removal prunes the id from the cookie.
- No schema change. No new components. Guest one-click `Buy & Claim`, remembered-name modal-once behavior, and name-edit UI are explicitly out (deferred to #293).

## Capabilities

### New Capabilities

- `guest-claim-identity`: the guest identity cookie — contents, lifecycle (written/extended at guest claim time, pruned at removal), the post-cache request-scope `claimedByViewer` overlay and its never-inside-`'use cache'` constraint, and the dormant `user_id` forward-compat seed contract.

### Modified Capabilities

- `claim-attribution`: removal matrix's unauthenticated path changes from exact-`guest_name` match to purchase-id-in-cookie (on `claimed_by IS NULL AND user_id IS NULL` rows only); viewer-relative display recognizes a cookie-identified guest's own claims as `claimedByViewer`; the manage state is reachable by a signed-out guest for their cookie-identified claims.
- `item-actions`: the "viewer claimed" matrix rows apply to a signed-out guest whose claim is cookie-recognized (guest with a recognized claim gets `Manage claim`), except a claimed guest is never offered `Add Claim` — a guest cannot attribute a claim to another and repeat guest self-claims are not offered (multi-unit claims belong to the per-list-quantity map); the guest-claimable row and the authenticated-only `Buy & Claim` rule are unchanged.
- `server-endpoint-authorization`: the `createPurchase` guest write path's identity note updates to the cookie mechanism; the removal-rights clause replaces "guest-name-match path is unchanged" with cookie purchase-id authorization; `removePurchase`'s payload sheds the guest-name auth field.

## Impact

- `lib/data/purchase.actions.ts` — `createPurchase` (cookie write on the signed-out guest branch), `removePurchase` (guest auth swap, cookie prune).
- `lib/data/purchase.ts` — `canRemovePurchase` guest branch keys on cookie-supplied purchase ids instead of `guest_name`.
- New internal module (non-endpoint, per `data-layer-organization`'s sibling-internal-module allowance) for cookie read/parse/validate shared by actions and the overlay.
- Request-scope overlay applied where server components hand cached DAL results to clients (list items, purchased page paths that render guest-visible claims).
- Cache: no new tags; reads keep `cacheTag('items')`, mutations keep `updateTag('items')`. The cookie is read only in request scope (server components / actions), never inside cached reads — `viewerId` stays null for guests so cached output remains the shared guest variant.
- Tests: unit coverage per `TESTING.md`; e2e coverage lands in the MAP-wide sweep [#268](https://github.com/JoshEddie/CTRLplusList/issues/268), not here.
