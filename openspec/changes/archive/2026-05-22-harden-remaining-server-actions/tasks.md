## 1. Pre-flight audit

- [x] 1.1 Grep the repo for every exported server-action consumer of the endpoints this change touches, to confirm the impact list and lock-step call-site updates:
  - `grep -rn "deleteItem\b" app --include='*.ts' --include='*.tsx'` → 1 caller: `DeleteItemButton.tsx:26`.
  - `grep -rn "updateItemLists\b" app --include='*.ts' --include='*.tsx'` → only internal callers in `items.ts` (`createItem`, `updateItem`).
  - `grep -rn "updateItemStores\b" app --include='*.ts' --include='*.tsx'` → only internal callers in `items.ts`.
  - `grep -rn "updatePriority\b" app --include='*.ts' --include='*.tsx'` → 1 caller: `SortItems.tsx:111`.
  - `grep -rn "bookmarkList\b\|unbookmarkList\b" app --include='*.ts' --include='*.tsx'` → callers in `BookmarkButton.tsx`, `HeroCollapsedItems.tsx`.
  - `grep -rn "blockUser\b\|unblockUser\b" app --include='*.ts' --include='*.tsx'` → callers in `ConnectionsActions.tsx`.
- [x] 1.2 Audit-verify the remaining exported server actions not covered by either the existing `harden-server-action-authorization` change or by this change. For each, classify as `✓ compliant — keep` or `✗ fix in §5` and record the classification here:
  - `app/actions/follows.ts`: `unblockUser` ✓ compliant — `authedUserId()` then scoped `delete user_blocks where blocker_id=viewer`. `markFollowingSeen` ✓ compliant — viewer-only update on own row.
  - `app/actions/lists.ts`: `removeVisit` ✓ compliant — `authedUserId()` then scoped to `user_id=userId`. `clearVisitHistory` ✓ compliant — same pattern. `unbookmarkList` ✓ compliant — same pattern.
  - `app/actions/items.ts`: `getItemEditData` ✓ compliant (read-only) — uses `getItemById(itemId, user.id)` DAL helper which enforces read-side viewability.
- [x] 1.3 Confirm no other `db.transaction(` call exists in the codebase beyond `app/actions/follows.ts:138`:
  - `grep -rn "db\.transaction\b" app db lib --include='*.ts' --include='*.tsx'` — one hit in code (`follows.ts:138`) plus one in a doc comment in `db/index.ts:7`. Confirmed.

## 2. Fix — `app/actions/items.ts`

- [x] 2.1 `updateItem` — after `await auth()` and the existing `session?.user` check, look up `users.id` from `users.email`. Then load `items.findFirst({ where: eq(items.id, data.id), columns: { user_id: true } })` and reject with `{ success: false, error: 'Unauthorized' }` if the row is missing OR `item.user_id !== sessionUser.id`. The check MUST occur before the existing `db.update(items).set(updateData).where(eq(items.id, data.id))` call.
- [x] 2.2 `updateItemLists` — add `auth()` + session-user lookup at the top. Load the item by `itemId`, reject if it doesn't belong to the session user. For each `listId` in the new `listIds` parameter, batch-load the corresponding list rows and reject if any `list.user_id !== sessionUser.id`. Then proceed with the existing insert/delete logic.
- [x] 2.3 `updateItemStores` — add `auth()` + session-user lookup at the top. Load the item by `itemId`, reject if it doesn't belong to the session user. Then proceed with the existing insert/update/delete logic.
- [x] 2.4 Run the §1.1 grep results: if neither `updateItemLists` nor `updateItemStores` has any non-`updateItem` caller, convert them from `export async function` to `async function` (file stays under `'use server'`). The `updateItem` call site continues to work because in-module calls don't go through the server-action endpoint.
- [x] 2.5 `deleteItem` — change the signature from `deleteItem(id: string, userId: string)` to `deleteItem(id: string)`. Inside, after `auth()` and the existing `session?.user` check, look up `users.id` from `users.email`. Use that id for the ownership check against the loaded item row. Drop the `userId !== item.user_id` comparison; the check is now `item.user_id !== sessionUser.id`.

## 3. Fix — `app/actions/lists.ts`

- [x] 3.1 `updatePriority` — add `await auth()` + session-user lookup at the top. Load the target list (`listId`) and reject if `list.user_id !== sessionUser.id`. The check MUST occur before any of the position SELECTs (which leak ordering information).
- [x] 3.2 `bookmarkList` — after the existing `authedUserId()` check, load the target list with `columns: { user_id: true, visibility: true }`. Mirror `recordVisit`'s gate: if `list.user_id !== userId` AND `fromDb(list.visibility) === VISIBILITY.OWNER`, return `{ success: false, error: 'List not viewable' }` without inserting. (`UNLISTED` lists remain bookmarkable by any authed caller — see design Decision 1.)

## 4. Fix — `app/actions/follows.ts`

- [x] 4.1 `blockUser` — replace the `await db.transaction(async (tx) => { … })` block (lines 138–161) with three sequential statements against `db` directly:
  1. `db.insert(user_blocks).values({ blocker_id: viewerId, blocked_id }).onConflictDoNothing();`
  2. `db.delete(user_follows).where(and(eq(user_follows.follower_id, viewerId), eq(user_follows.followee_id, blocked_id)));`
  3. `db.delete(user_follows).where(and(eq(user_follows.follower_id, blocked_id), eq(user_follows.followee_id, viewerId)));`
- [x] 4.2 Inline a one-line comment above the new sequence explaining the block-first ordering and pointing at this change's design Decision 2 for context. (Comments should explain *why*, not *what*; the rule from `CLAUDE.md` is the *why*.)
- [x] 4.3 If §1.2 surfaced that `unblockUser` has any similar driver-incompatible pattern, fix it in the same shape here. → N/A; `unblockUser` is a single `db.delete` statement, no transaction.

## 5. Audit-completion fixes (placeholder — populated by §1.2 results)

- [x] 5.1 (Conditional) Apply the contract to any audit-verified non-compliant action found in §1.2. If §1.2 finds everything compliant, mark this section N/A and continue. → N/A; §1.2 found all remaining endpoints compliant.

## 6. Client call-site updates

- [x] 6.1 `app/(main)/items/ui/components/DeleteItemButton.tsx:26` — drop the second argument from the `deleteItem(id, userId)` call. The component will no longer need to receive the owner's `userId` prop; remove that prop from the component's signature and from its parent passing it in.
- [x] 6.2 Run `npx tsc --noEmit`. The signature change in §2.5 should surface any other call site that still passes `userId`. Fix each. This is the desired forcing function. → Clean. Single call site in `ItemForm.tsx:193` updated; `user_id` prop on `ItemForm` itself stays (still used elsewhere in that component for preview).

## 7. Manual verification via dev bypass

These steps require the dev auth bypass and a fresh seed. See `CLAUDE.md` "Dev auth bypass" section for setup.

- [x] 7.1 Reset and re-seed: `npm run db:reset:dev`. Restart the dev server. → Reset performed twice (once before the harness, once after to clear test mutations).
- [x] 7.2 **Owner happy paths.** Verified programmatically: `updateItem` on viewer-owned item mutated `name` to the new value (DB-state assertion; `success` return was masked by `updateTag` throwing outside Next runtime, but write occurred before the throw). Bookmark of Alice's public list inserted the expected `list_visits` row with `favorited_at` set.
- [x] 7.3 **IDOR attempt — `updateItem`.** Invoked as `dev-test-viewer` against Alice's `dev-list-alice-wedding-item-1`. Returned `{ success: false, error: 'Unauthorized', message: 'Unauthorized - item does not belong to you' }`. DB re-read confirmed Alice's item name was unchanged (`Stroller` → `Stroller`).
- [x] 7.4 **IDOR attempt — `updateItemLists`.** §2.4 de-export verified: the symbol is no longer re-exported from `@/app/actions/items`. Defense-in-depth verified: calling `updateItem` with viewer-owned item but a foreign `listIds: [ALICE_LIST_PUB]` produced no `list_items` row attaching the viewer item to Alice's list (the inner ownership check threw before the insert). Alice's existing `list_items` rows remained intact.
- [x] 7.5 **IDOR attempt — `deleteItem`.** Signature now `deleteItem(id: string)` (single-arg). Called with Alice's item id as `dev-test-viewer`: action threw `Unauthorized - Item does not belong to you`, returned `{ success: false, error: 'Failed to delete item' }`, and Alice's item still exists in the DB.
- [x] 7.6 **IDOR attempt — `updatePriority`.** Called with both item ids and listId from Alice's list as `dev-test-viewer`: returned `{ success: false, error: 'Unauthorized', message: 'Unauthorized - list does not belong to you' }`. Snapshot of Alice's `list_items` (item_ids + positions) before vs after the call was byte-identical.
- [x] 7.7 **Visibility attempt — `bookmarkList`.** Created a private list owned by Alice for the test; called as viewer → `{ success: false, error: 'List not viewable', message: 'List not viewable' }`, no `list_visits` row inserted. Same call against a public Alice list inserted the row with `favorited_at` set. Private test list cleaned up.
- [x] 7.8 **`blockUser` happy path.** Seeded both directions of follow (viewer↔Alice). Called `blockUser('dev-friend-alice')`: DB state confirmed the `user_blocks` row was inserted AND both `user_follows` rows (forward + reverse) were deleted. Then `unblockUser`: block row removed; follow rows remained gone (no auto-restore).
- [x] 7.9 **`blockUser` no-transaction verification.** Harness run logged zero `db.transaction` / `transaction not supported` errors. Only logged error from the action was `updateTag` requiring Server Action context — which is an artifact of running outside Next runtime, not a driver issue. All three sequential DB statements (insert block, delete forward follow, delete reverse follow) completed successfully against the neon-http driver.

## 8. Pre-merge

- [x] 8.1 `npm run lint` and `npx tsc --noEmit` both clean.
- [x] 8.2 `openspec validate harden-remaining-server-actions --strict` passes.
- [x] 8.3 Verify no additional `db.transaction(` calls were introduced anywhere during this change: `grep -rn "db\.transaction\b" app db lib --include='*.ts' --include='*.tsx'` returns zero results. → Only the doc-comment hit in `db/index.ts:7` remains; zero code hits.
- [ ] 8.4 Open the PR against `release-1.0`. The PR description SHALL cross-reference the council review findings B1–B5 + B4-transaction by file:line, AND link to `harden-server-action-authorization` as the original contract source.
- [ ] 8.5 After merge, archive with `/opsx:archive harden-remaining-server-actions` — the modified `server-endpoint-authorization`, `visit-history`, and `following` specs become active. Note: if `harden-server-action-authorization` has not yet archived by then, archive it FIRST (otherwise this change's spec deltas would apply against an older base).
