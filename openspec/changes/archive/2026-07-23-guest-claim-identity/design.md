# Design — guest-claim-identity

## Context

Signed-out guest claims are all-NULL identity rows (`claimed_by NULL, user_id NULL, guest_name` set). `sanitizePurchases` computes `claimedByViewer` from `claimed_by === viewerId` inside `'use cache'` DAL reads, with `viewerId` a cache-key argument — for guests it is `undefined`, so the cached output is the shared guest variant and no guest ever sees their own claim as theirs. `removePurchase`'s unauthenticated branch authorizes by exact `guest_name` match (`canRemovePurchase`, `lib/data/purchase.ts`), reachable by no UI. No server action reads or writes cookies today; the only app cookie is `items_page_size`.

Constraints: no schema change; no interactive DB transactions (neon-http); the cookie must never be an input to a `'use cache'` boundary; `Buy & Claim` stays authenticated-only (deferred scope, #293).

## Goals / Non-Goals

**Goals:**

- A guest recognizes and can remove their own claims within the same browser.
- Dormant stable guest `user_id` seeded for #170 migration.
- Purchase-id-in-cookie replaces name-match as the sole unauthenticated removal authorization.

**Non-Goals:**

- Guest one-click `Buy & Claim`, remembered-name modal-once, name display/edit UI (#293).
- Durable cross-device guest identity (#170).
- Any e2e additions (MAP sweep #268).

## Decisions

### D1 — One JSON cookie, server-managed, httpOnly

Cookie `guest_claims`: JSON `{ id: <uuid>, name: <string>, purchases: [<purchase-id>, …] }`. Attributes: `httpOnly`, `path=/`, `SameSite=Lax`, `Secure` outside dev, `maxAge` 400 days (browser cap), re-set on every guest claim so an active guest's cookie never expires. Written only by server actions (`cookies().set()` in `createPurchase` / `removePurchase`), read only in request scope (`cookies()` in server components / actions). `httpOnly` because no client code needs it — recognition happens server-side.

*Rejected:* client-managed cookie or localStorage — would move authorization data where scripts can touch it and would need a client→server round trip the server action already owns.

### D2 — Bounded purchase list, newest-first

The `purchases` array is capped (constant, 50 ids). At cap, oldest ids are pruned. Keeps the cookie well under the 4KB limit (~36 bytes/id). Residual: a guest with >50 live claims loses recognition of the oldest — accepted; owner master unclaim remains.

### D3 — Cookie is ambient authorization; payload sheds `guest_name`

`removePurchase` keeps payload `{ purchase_id }`. The unauthenticated branch loads the row and authorizes iff the row is all-NULL identity (`claimed_by IS NULL AND user_id IS NULL`) AND `purchase_id` ∈ the cookie's `purchases`. The `guest_name` payload field and the exact-name match are removed. On successful delete the id is pruned from the cookie.

*Rejected:* keeping name-match as fallback — second auth surface for a path no UI has ever reached; pre-cookie rows stay owner-removable only, which is their effective status today. (Settled at embark grilling 2026-07-23.)

### D4 — Post-cache overlay in request scope

New pure helper `overlayGuestClaims(items, cookiePurchaseIds)` maps cached results, setting `claimedByViewer: true` and `by: 'self'` on purchases whose id is in the cookie — the guest is the purchaser, so their claim presents exactly as an authed self-claim ("You" banner, "(you)" manage row, no "Added by you" attribution meta, which is reserved for claims recorded for a third party). Applied only when there is no session viewer, at the server-component seam where cached DAL output is handed to client components (the list-items container path — the only guest-reachable claim surface). Cached reads are untouched; `viewerId` stays `undefined` for guests so cache keys and cached output are unchanged.

*Rejected:* passing a cookie-derived viewer id into the cached reads — makes the cookie a cache-key input, fragmenting the cache per guest and risking cross-user leakage of viewer-relative output; exactly what the map decision forbids.

### D5 — Internal module `lib/data/purchase.cookie.ts`

Non-endpoint internal module (per `data-layer-organization`'s sibling-internal-module allowance): cookie name + attribute constants, parse/validate (malformed or oversized JSON → treated as absent), serialize, prune, and the `overlayGuestClaims` helper. Actions import it; no `'use server'` directive; nothing client-invocable.

### D6 — UUID minted once per browser, dormant

First guest claim with no valid cookie generates `crypto.randomUUID()` as `id`; later claims reuse it. Never written to the DB, never read by app logic — carried purely so #170 can materialize a `users` row for a returning guest and adopt their cookie-listed purchases. `name` stores the last-entered guest name, likewise dormant here.

### D7 — Modal reachability, no new components

The overlay makes a cookie-recognized guest hit the existing `viewerClaimed` matrix rows in `ItemActions` (`Manage claim`) and the existing manage-state modal. Removal action visibility in the manage state keys off `claimedByViewer`, which the overlay set — the modal needs no guest-specific branch. Guests without a session still see no attributed-claim candidate picker (existing `resolveClaimIdentity` rejection + guest modal branch, unchanged).

## Risks / Trade-offs

- [Purchase ids are visible to every list viewer (`PurchaseView.id`), so a forged cookie could remove another guest's claim] → Accepted: strictly comparable to today's spec'd name-match (guest names display too); scope of harm is releasing an all-NULL claim, the same power the owner already holds; durable identity is #170's.
- [Cookie loss (cleared browser, other device) makes a guest claim unremovable by the guest] → Accepted; owner master unclaim covers it; #170 is the durable fix.
- [Concurrent guest claims in two tabs race the cookie rewrite (last write wins, one id dropped)] → Accepted residual; the dropped claim degrades to today's behavior.
- [Overlay seam missed on a future guest-visible surface] → The `guest-claim-identity` spec pins the overlay requirement to every surface rendering guest-visible claim state, so new surfaces inherit the obligation at review time.

## Migration Plan

Deploy is additive: pre-existing guest rows have no cookie and gain no new reachability; name-match removal disappears from an endpoint no UI calls. Rollback = revert; cookies become inert ambient data.

## Open Questions

None — removal auth and name-match retirement settled at embark grilling (2026-07-23).
