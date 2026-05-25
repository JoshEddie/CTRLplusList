## Context

The cross-cutting authorization contract was already designed in `harden-server-action-authorization/design.md`. That document's "Decision 1" (session email → users-id lookup, every time), "Decision 2" (drop client-supplied actor ids from Zod schemas where possible), and the rejection shape `{ success: false, error: 'Unauthorized' }` are the canonical reference and are not re-litigated here.

This document only captures the decisions that are *specific* to the additional endpoints this change touches.

## Decisions

### Decision 1: `bookmarkList` visibility predicate = strict, mirroring `recordVisit`

`recordVisit` already enforces:

- Skip if no session (returns success-with-skip, since visits are anonymously recordable as no-ops).
- Skip if the viewer is the owner.
- Skip if `visibility === VISIBILITY.OWNER` (the private case).

`bookmarkList` will adopt the same predicate, with two differences appropriate to bookmarking being an *active intent*:

1. No session → return `{ success: false, error: 'Unauthorized' }` (not a silent skip; the user clicked a button).
2. Private list (`VISIBILITY.OWNER`) belonging to someone else → return `{ success: false, error: 'List not viewable' }` (deliberately non-specific to avoid leaking existence).

For `UNLISTED` lists: today there is no canonical `guardListViewable` check binding bookmark to `shared_to` membership, and the spec's "any list whose page they can render" clause is ambiguous about whether unlisted-link-sharing counts. The strict interpretation (require `shared_to` membership) is more defensible but risks regressing the link-share flow where someone bookmarks a friend's unlisted list from a pasted URL. The permissive interpretation (any signed-in caller with a valid id can bookmark unlisted lists) matches how the read path behaves.

**This change adopts the permissive interpretation for `UNLISTED`**: only `OWNER`-private lists are gated. Rationale: the read path already lets any caller with the unlisted id render the list, so bookmarking is no more sensitive than navigation. If the read path is later tightened to require `shared_to` membership, the bookmark gate should be re-tightened in lockstep.

**Alternative considered:** require a `guardListViewable(listId, viewerId)` helper that owns the full read-path predicate and is shared between `bookmarkList`, `recordVisit`, and any future bookmark-like surface. Rejected for this change as scope creep — the helper is the right shape but introducing it touches `recordVisit` (currently compliant) and broadens the diff. Filed as a follow-up.

### Decision 2: `blockUser` — sequential statements ordered block-first, no transaction

The current `db.transaction(async (tx) => { delete forward follow; delete reverse follow; insert block })` violates CLAUDE.md and breaks at runtime on the `neon-http` driver. The replacement runs three single-statement calls against `db` (no `tx`), ordered:

1. `INSERT INTO user_blocks (...) ON CONFLICT DO NOTHING` — establishes the block row first.
2. `DELETE FROM user_follows WHERE follower_id = viewer AND followee_id = blocked` — removes the viewer's outgoing follow.
3. `DELETE FROM user_follows WHERE follower_id = blocked AND followee_id = viewer` — removes the blocked user's incoming follow.

If any single statement fails mid-sequence, the residual state is the safer "block row exists but follow row(s) may also still exist briefly" — which the next block invocation is idempotently safe to retry, and which the `followUser` block-check predicate (`either-direction block prevents follow`) treats as effectively-blocked anyway. The opposite ordering (deletes first, insert last) would leave a window where the block row hasn't landed yet and a racing `followUser` could re-insert.

**Alternative considered:** add a DB trigger that rejects `INSERT INTO user_follows` when a matching `user_blocks` row exists, providing a stronger cross-statement invariant. Rejected for this change as scope creep — triggers aren't currently used in this schema and managing them through Drizzle migrations is awkward. Filed as a follow-up.

**Alternative considered:** switch the DB driver to `drizzle-orm/neon-serverless` (WebSocket Pool) to gain interactive transactions. Explicitly rejected per CLAUDE.md: "Do not propose switching to `drizzle-orm/neon-serverless` / WebSocket Pool without explicit owner approval — it's been considered and declined."

### Decision 3: `deleteItem` — drop the `userId` parameter entirely

The current signature is `deleteItem(id: string, userId: string)`. The fix is **not** "ignore the second argument server-side" but "remove it from the signature" — same reasoning as `harden-server-action-authorization/design.md` Decision 2: the type system must reject forged calls, not just the runtime. The single in-repo call site in `DeleteItemButton.tsx:26` is updated in lockstep.

### Decision 4: `updateItemLists` and `updateItemStores` — verify dual ownership

`updateItemLists(listIds, itemId)` and `updateItemStores(stores, itemId)` need *two* ownership checks:

1. The caller must own the `itemId` being modified.
2. For `updateItemLists`, the caller must own each `listId` in the new associations (otherwise: attach my item to someone else's list, polluting their list with rows they didn't create).

The check is: load the item by id, reject if `item.user_id !== sessionUser.id`. Then for `updateItemLists`, additionally batch-load the listed lists and reject if any `list.user_id !== sessionUser.id`. The `db.delete` of existing associations is implicitly scoped by `item_id` (which we now know belongs to the caller), so deleting existing associations does not need a per-list ownership check — only inserts do.

**Note on internal callers:** `updateItem` calls `updateItemLists` and `updateItemStores`. After this change, those calls happen *after* the `updateItem` ownership check on the item has already passed, so the inner functions will re-run the same lookup. Acceptable cost (two extra single-row queries per item update); the alternative is plumbing an "assume-authorized" boolean which is exactly the footgun this whole change is trying to remove. If profiling later shows it matters, refactor to a private `_updateItemListsForOwnedItem(itemId, listIds)` and keep the public exported version authorization-gated.

### Decision 5: De-export `updateItemLists` / `updateItemStores` only if no client calls them

A grep of the repo for `import.*updateItemLists` and `import.*updateItemStores` will determine whether these functions have direct client callers. If they don't, they should be converted from `export async function` to plain `async function` (still inside the `'use server'` file is fine — top-level non-exports are not server-action endpoints). This is defense-in-depth: the auth check is the primary defense, but a non-exported function has no callable endpoint at all.

If a client does call them directly, leave them exported and authorization-gated. The grep is part of tasks.md.

## Goals / Non-Goals

**Goals:**

- Bring the audit gap closed: all exported `app/actions/**` functions comply with the `server-endpoint-authorization` contract.
- Replace the single `db.transaction` call in the codebase with a sequential, idempotent, neon-http-safe pattern.
- Document the no-transaction rule in the `following` spec (it lives in CLAUDE.md today but not in any capability spec).

**Non-Goals:**

- Introduce a `guardListViewable` / `guardItemViewable` shared helper. Future cleanup.
- Add a DB trigger enforcing `user_blocks` ↔ `user_follows` exclusion. Filed as follow-up.
- Audit *read*-path server actions and DAL functions. Read-side access control is a separate concern; this change is scoped to mutations.
- Touch the four `app/actions/user.ts` actions (sign-in, sign-out wrappers) — they delegate to NextAuth and have no user-owned resource surface.

## Risks

- **`bookmarkList` permissive UNLISTED behavior.** If a future change tightens read access to unlisted lists to require `shared_to` membership, this change's bookmark predicate becomes out-of-sync (bookmarks possible against lists the user can no longer render). Mitigated by the documented "lockstep" note in Decision 1; the future change must include a bookmark-gate update.
- **`blockUser` ordering on partial failure.** If the `INSERT user_blocks` succeeds but one of the `DELETE user_follows` fails (network blip mid-sequence), the residual follow row persists. The next `blockUser` retry will be idempotent and clean it up. The `followUser` block-check already treats the block-row presence as authoritative, so feed/visibility is correctly gated even with the residual follow row. Documented in design Decision 2.
- **De-exporting `updateItemLists` / `updateItemStores`.** If a future server-action consumer is added that needs them, the export needs to come back with the auth gate intact. Mitigated by leaving the auth-gated exported form as the default and only de-exporting when grep confirms no callers.
