## 1. Fix the access gate

- [x] 1.1 In `lib/listAccess.ts`, change the `'public'`/FOLLOWERS branch so a public list is viewable by any caller — collapse `isListViewableForViewer` to: owner short-circuit → `viewerId && isBlocked(...)` check → `fromDb(list.visibility) !== VISIBILITY.OWNER`.
- [x] 1.2 Remove the now-unused `isFollowing` import from `lib/listAccess.ts`; confirm no other reference to it remains in the file.
- [x] 1.3 Evaluate inlining `isListViewableForViewer` back into `isItemViewable` (D2): inline only if the merged function stays under the `sonarjs/cognitive-complexity` 15 ceiling without an `eslint-disable`; otherwise keep the helper with corrected internals.
- [x] 1.4 Rewrite the followers-only access prose in the `lib/listAccess.ts` doc comments (the function header and the in-body exhaustiveness note) to describe the corrected model (public == unlisted for access; following is discovery, not a gate).
- [x] 1.5 Confirm `createPurchase` (`app/actions/items.ts`) needs no change beyond consuming the corrected gate, and verify `removePurchase`'s guest-undo path (keyed on `purchase_id` + `guest_name`) never calls `isItemViewable` and is unaffected.

## 2. Copy + spec-drift reconciliation

- [x] 2.1 In `app/(main)/lists/ui/components/visibility-rows.tsx`, update the Shared row description to "Anyone with the link — plus your followers see it in their feed" and its toast to "Shared — your followers can now find it".
- [x] 2.2 In the same file, update the Private (`unlisted`) row description to "Only people with the link can view" and its toast to match.
- [x] 2.3 Verify the shipped private-row label is "Hidden" (already shipped) — labels are unchanged; only the spec is reconciled to match (handled by the `list-visibility` delta).

## 3. Tests

- [x] 3.1 In `lib/__tests__/listAccess.test.ts`, flip `FollowersListAnonymousViewer_ReturnsFalse` → asserts `true` (rename to reflect the asserted behavior) and `FollowersListViewerNotFollowingOwner_ReturnsFalse` → asserts `true` (rename likewise).
- [x] 3.2 Prune the redundant "Kim" not-followed-public-owner fixture (and any now-orphaned follow setup) that no longer exercises distinct behavior after public access stopped depending on following.
- [x] 3.3 Add a positive regression at the `createPurchase` action layer: an unauthenticated guest claim against an item on a `'public'`-only list succeeds (inserts `user_id = NULL` + `guest_name`), and a blocked caller is still rejected with `'Item not found'`.
- [x] 3.4 Update any test asserting the visibility-row descriptions/labels to match the new copy and the "Hidden" label; ensure renamed tests reflect what they assert (no tautologies, per `TESTING.md`).
- [x] 3.5 Confirm files touched in §1–§3 remain at the universal coverage floor; add a `/* v8 ignore */` with named rationale only where a line is genuinely unreachable, never to lower the floor.

## 4. Coordination

- [x] 4.1 Add a note/task to the paused `test-coverage` §6.1 (`test-e2e-critical-flows`) scope recording that "guest claim on a public list succeeds" is a required e2e flow (the planned friend-claim flow under-covers the contract).
- [x] 4.2 Re-run `openspec validate fix-guest-claim-shared-lists --strict` and confirm it passes.

## 5. Pre-merge

- [x] 5.1 `npm run lint` passes — zero errors, zero warnings.
- [x] 5.2 `npx tsc --noEmit` passes — zero errors.
- [x] 5.3 `npm run build` completes successfully.
- [x] 5.4 `npm run test:coverage` passes — zero failing tests, coverage at/above floor for touched files.
- [ ] 5.5 `npm run test:e2e` passes — zero failing tests (author-run locally).
