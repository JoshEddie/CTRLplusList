## Why

A logged-out guest (or any non-follower) viewing a **public** ("Shared") list sees the claim button render, but clicking it fails with "Item not found" and nothing is saved (GitHub issue #88). The page-render path treats public lists as URL-accessible-to-anyone, but the claim gate — `isItemViewable` in `lib/listAccess.ts` — gates public-list access on `isFollowing`, so a guest (`viewerId === null`) and any non-follower are rejected. Items that live only on public lists are therefore unclaimable by exactly the audience public lists exist for.

This is a **code-conformance bug**, not a behavior change: the authoritative specs already describe the intended behavior, and the code diverges from both:

- `list-visibility` SHALL (Requirement: "Lists SHALL have a three-state visibility model"): "A `public` list is visible to anyone with the URL AND appears in the feeds of users who follow the owner." Following governs **discovery** (feed surfacing), not **access**. Access-wise a public list is a superset of `unlisted` — at least as open, never more restricted.
- `list-item-management` SHALL (Requirement: "createPurchase SHALL authenticate the claimer…", Scenario: "Claim against a non-viewable item is rejected") defines non-viewable as *only* "a private list they do not own, or a list owned by a user who has blocked them." A public list is **not** in that set, so a guest claim against a public list MUST succeed. The current code violates this by treating public-for-a-guest as non-viewable.

While the picker copy is in scope, a copy pass also fixes the user-facing phrasing that mis-described this very behavior: the "Shared" row's description "Visible to your followers" reads as a *restriction* when it is an *addition* (link access **plus** follower-feed surfacing).

## What Changes

- Fix `isItemViewable` / `isListViewableForViewer` (`lib/listAccess.ts`) so a `public` (FOLLOWERS) list is viewable by **any** caller — guest or authenticated — exactly like an `unlisted` (LINK) list, subject only to the existing owner-block check. The follow relationship is removed from the access decision; it remains a discovery concern owned elsewhere.
- Drop the now-unused `isFollowing` import from `lib/listAccess.ts`. The `isListViewableForViewer` carve-out (extracted solely to keep `isItemViewable` under the `sonarjs/cognitive-complexity` ceiling) collapses to owner-short-circuit → block-check → `visibility !== 'private'`; evaluate inlining it back during implementation.
- Rewrite the followers-only access prose in the `lib/listAccess.ts` doc comments to describe the corrected model.
- Update the visibility-picker copy (`app/(main)/lists/ui/components/visibility-rows.tsx`): "Shared" description → "Anyone with the link — plus your followers see it in their feed" and toast → "Shared — your followers can now find it"; "Private" (`unlisted`) description → "Only people with the link can view" with matching toast. Labels (Hidden / Private / Shared) are unchanged.
- Reconcile a pre-existing spec drift surfaced here: the `list-visibility` spec names the private-row label **"Just me"**, but shipped code renders **"Hidden"**. Correct the spec to match shipped source.
- Flip the two `lib/__tests__/listAccess.test.ts` assertions that currently encode the bug as correct (`FollowersListAnonymousViewer_ReturnsFalse`, `FollowersListViewerNotFollowingOwner_ReturnsFalse`) and prune the now-redundant "Kim" not-followed-public-owner fixture; add a positive regression that a guest claim on a public list succeeds.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `list-item-management`: Add a scenario to the `createPurchase` requirement pinning that a guest (and any authenticated non-follower) successfully claims an item on a `public` (or `unlisted`) list — the access gate SHALL treat both `public` and `unlisted` lists as viewable by anyone, subject to the owner-block check. The existing "non-viewable" enumeration (private-not-owned / blocked) is unchanged; this makes the positive case explicit and regression-pinned.
- `list-visibility`: Update the row-description copy in the "Each row carries icon, label, and description" scenario — "Shared" → "Anyone with the link — plus your followers see it in their feed"; "Private" → "Only people with the link can view". Reconcile the private-row label drift ("Just me" → "Hidden") so the spec matches shipped source across that requirement and its scenarios. The three-state access-model requirement is **cited, not modified** — it already specifies public = URL-accessible-to-anyone.

## Impact

- **`lib/listAccess.ts`** — the fix: `isListViewableForViewer` access decision, drop `isFollowing` import, doc-comment rewrite, possible carve-out inlining.
- **`app/actions/items.ts`** — `createPurchase` (sole consumer of `isItemViewable`) needs no logic change; the guest path now succeeds. Verify `removePurchase`'s guest-undo path (keyed on `purchase_id` + `guest_name`, never calls `isItemViewable`) remains unaffected.
- **`app/(main)/lists/ui/components/visibility-rows.tsx`** — copy/toast strings. Governed by `list-visibility`'s radio-menu requirement; descriptions are spec-bound (toasts are not).
- **Tests** — `lib/__tests__/listAccess.test.ts` (flip two assertions, prune Kim fixture, add guest-claim-on-public regression); any test asserting the visibility-row descriptions/labels. Per `testing-foundation`, touched test files remain at the universal coverage floor; renamed tests must reflect what they assert (no tautologies).
- **Blast radius confirmed minimal** — `isItemViewable` has exactly one consumer (`createPurchase`); `isFollowing` is used as an *access* gate at exactly one site (the one being fixed); its two other callers (`HeroCollapsedItemsContainer.tsx`, `dal.ts` `getProfileForUser`) only set follow-**button** UI state and are untouched. Aligns with `server-endpoint-authorization`'s "guest write paths (currently only `createPurchase`…)" framing.
- **Coordination with the paused `test-coverage` change** — this is a mid-flight bug fix; `testing-foundation` floors still apply. The future e2e sub-proposal (`test-coverage` §6.1) currently scopes only a *friend*-claim flow; this change flags that "guest claim on a public list succeeds" is the regression that must be covered there. No DB/migration change.
