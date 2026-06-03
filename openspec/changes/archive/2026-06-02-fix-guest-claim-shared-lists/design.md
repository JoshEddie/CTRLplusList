## Context

`isItemViewable` (`lib/listAccess.ts`) is the access predicate gating `createPurchase`. Its per-list helper `isListViewableForViewer` decides a `'public'` (FOLLOWERS) list with `if (!viewerId) return false; return isFollowing(viewerId, list.user_id)` — so a guest (`viewerId === null`) and any non-follower are denied, and the claim returns the opaque "Item not found" (issue #88).

This contradicts the authoritative specs, which already describe public lists as open:

- `list-visibility` — "A `public` list is visible to anyone with the URL AND appears in the feeds of users who follow the owner." Following is a **discovery** mechanism, not an access gate.
- `list-item-management` — the "Claim against a non-viewable item is rejected" scenario enumerates non-viewable as *only* private-not-owned or blocked. Public is not in that set.

The render path (`ListHeroSection` / `ListItemsSection`) already gates only `'private'`, so it conforms; the claim gate is the lone divergence. This is a code-conformance fix, not a behavior redefinition.

Two pre-existing facts discovered while scoping, both folded in:
- The visibility-picker `'private'` row label is **"Hidden"** in shipped code (`visibility-rows.tsx`) but **"Just me"** in the `list-visibility` spec — a stale spec.
- The "Shared" row description "Visible to your followers" mis-describes the behavior as followers-only (the exact phrasing that mis-led the initial triage).

## Goals / Non-Goals

**Goals:**
- A guest and any authenticated non-follower can view and claim items on a `'public'` list, identically to `'unlisted'`, subject to the owner-block check.
- Remove the follow relationship from the access decision; bring `lib/listAccess.ts` (code + doc comments) into conformance with the specs.
- Correct the visibility-picker copy and reconcile the "Just me"/"Hidden" spec drift.
- Pin the corrected behavior with a positive regression test and a spec scenario.

**Non-Goals:**
- No change to how `'private'` (owner-only) or block-gating behave.
- No change to the visibility **labels** beyond reconciling the spec to shipped "Hidden" — relabeling "Private"→"Unlisted" is a separate, higher-blast-radius decision tied to the in-flight visibility canonical-value rollout (`lib/visibility.ts` Stage 2).
- No DB/schema/migration change.
- No new e2e suite here — the e2e guest-claim happy path is a requirement flagged for `test-coverage` §6.1; this change covers the unit/integration level.

## Decisions

**D1 — `'public'` and `'unlisted'` collapse to identical access; following is dropped from the gate.**
`isListViewableForViewer` becomes: owner short-circuit → block check → `fromDb(list.visibility) !== VISIBILITY.OWNER`. The `isFollowing` import is removed from `lib/listAccess.ts`. Rationale: the spec defines public access as URL-open; following only drives feed surfacing (owned by `home-digest`/`following`, computed in `getFollowingFeedUsers`, untouched here). *Alternative rejected:* making the render gate followers-only instead (so code stays, spec changes) — rejected because it contradicts the `list-visibility` access-model SHALL and the product intent that Shared = link-open + feed-surfaced.

**D2 — Evaluate inlining `isListViewableForViewer` back into `isItemViewable`.**
The helper was extracted solely to keep `isItemViewable` under `sonarjs/cognitive-complexity` 15. Post-fix it is trivial (three lines), so inlining may read better and remove a layer. Decision deferred to apply-time: inline only if the merged function stays under the complexity ceiling without an `eslint-disable`; otherwise keep the helper with corrected internals. Either way the public API (`isItemViewable`) is unchanged.

**D3 — Block check stays and still wins.**
The `viewerId && isBlocked(...)` guard runs before the visibility decision, so a blocked authenticated viewer is denied even on a public list. Guests cannot be the target of a block (no id), matching the existing `'unlisted'` behavior. A spec scenario pins this.

**D4 — Reconcile the spec to shipped source for the label drift ("Just me" → "Hidden").**
The `list-visibility` MODIFIED delta carries "Hidden" because that is what ships. *Alternative rejected:* changing code to "Just me" — rejected; shipped UX is the source of truth here and the user refers to the state as "Hidden". This mirrors the drift-correction posture used across the `test-coverage` program.

**D5 — Copy: descriptions are spec-bound; toasts are not.**
Row descriptions live in the `list-visibility` radio-menu requirement, so they move via the spec delta. Toast strings (`Shared — your followers can now find it`, `Only people with the link can view`) are not named in any spec scenario, so they are an implementation-only edit in `visibility-rows.tsx`.

**D6 — Test edits: flip the two assertions, prune the redundant fixture, add the positive regression.**
`lib/__tests__/listAccess.test.ts` currently asserts the bug as correct at `FollowersListAnonymousViewer_ReturnsFalse` and `FollowersListViewerNotFollowingOwner_ReturnsFalse`. Both invert to `_ReturnsTrue` (names must reflect what they assert — no tautologies, per `TESTING.md`). The "Kim" not-followed-public-owner fixture becomes behaviorally identical to Alice's; prune it rather than keep a redundant case. Add a guest-claim-on-public regression at the `createPurchase` action layer (or extend the existing `isItemViewable` public-list coverage) so the issue cannot regress. Touched files stay at the universal coverage floor.

## Risks / Trade-offs

- **Perceived privacy regression** → This *widens* who can claim on public lists. It is not a leak: the `list-visibility` spec already declares public lists URL-open and the render path already shows them to anyone; only the claim gate lagged. The change closes the render/claim gap rather than opening new exposure. Private and block semantics are untouched and pinned by scenarios.
- **`removePurchase` guest-undo path** → It is keyed on `purchase_id` + `guest_name` and never calls `isItemViewable`, so it is unaffected; an apply-time check confirms no incidental coupling.
- **Cognitive-complexity carve-out churn (D2)** → If inlined, the `eslint.config.mjs` per-file carve-out note for `lib/listAccess.ts` may need a touch; if kept, no churn. Resolve at apply-time against the actual lint result, not speculatively.
- **Spec-drift reconciliation widens the diff** → The "Just me"→"Hidden" correction is bundled into a bug-fix change. Justified because the same requirement's scenarios are already being edited for the description copy; leaving a known-false label in the spec we are actively rewriting would be worse.
