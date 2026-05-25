## Why

PR #16 (`dev` → `release-1.0`) review surfaced a second wave of server-action authorization holes that were NOT covered by the in-flight `harden-server-action-authorization` change. That change established the right contract in `server-endpoint-authorization`:

> Every server-side mutation against a user-owned resource MUST resolve the actor from the session, ignore client-supplied actor ids, and verify ownership before writing.

…but only applied it to the endpoints PR #16's earlier review named. A full audit of the action surface found that the same contract is violated by additional endpoints, and that one new server action introduced for 1.0 also violates a separate CLAUDE.md hard rule (no `db.transaction(...)` on the `drizzle-orm/neon-http` driver).

Audit findings — verified against `origin/dev`:

| Action | File | Violation |
| --- | --- | --- |
| `updateItem` | `app/actions/items.ts:574` | Checks session exists but never verifies `item.user_id === sessionUser.id` before mutating by id. Any signed-in user can edit any item. |
| `updateItemLists` | `app/actions/items.ts:511` | Exported server action with no `auth()` call at all. Any caller can attach/detach any item to/from any list. |
| `updateItemStores` | `app/actions/items.ts:~450` | Exported server action with no `auth()` call. Any caller can rewrite an item's store rows. |
| `deleteItem` | `app/actions/items.ts:699` | Signature is `deleteItem(id, userId)` and the ownership check is `item.user_id !== userId` — the `userId` is the caller-supplied argument, not the session. Trivially spoofed. |
| `updatePriority` | `app/actions/lists.ts:700` | Exported server action with no `auth()` call. Any caller can reorder any list's items. |
| `bookmarkList` | `app/actions/lists.ts:409` | Authenticates but does not verify the bookmarked list is viewable. Violates the existing `visit-history/spec.md` SHALL: "A user SHALL be able to bookmark any list **whose page they can render**." A private list whose id is guessed/leaked can be bookmarked. |
| `blockUser` | `app/actions/follows.ts:138` | Wraps three statements in `db.transaction(async (tx) => …)`. CLAUDE.md hard rule: the `drizzle-orm/neon-http` driver does not support interactive transactions. Will throw at runtime, or worse, silently degrade to non-atomic execution depending on driver version. |

All four `app/actions/*.ts` files declare `'use server'`, so every exported async function is a client-callable server action — there is no "private internal helper" defense.

A 1.0 release is not viable with these holes in place: PR #16 is the rollup for `release-1.0`, and the headline 1.0 features (follow users, multi-claim purchases, items browser) sit directly on top of the broken endpoints.

## What Changes

This change brings the rest of the action surface into compliance with the `server-endpoint-authorization` contract already established by `harden-server-action-authorization`. It introduces no new requirements — the existing SHALLs cover every fix — but it adds binding scenarios that exercise the additional endpoints and clarifies the `blockUser` driver-compatibility constraint in the `following` spec.

- **FIX** `updateItem` — load the item row, verify `item.user_id === sessionUser.id` before any `db.update`. Reject as unauthorized otherwise.
- **FIX** `updateItemLists` — add `auth()` + session-user resolution; verify the caller owns the item before mutating its list associations; verify the caller owns each target list_id before inserting (no attaching items to other users' lists). De-export from `app/actions/items.ts` if no client invokes it directly.
- **FIX** `updateItemStores` — same shape as `updateItemLists`. Verify item ownership before mutating store rows. De-export if no client invokes it directly.
- **FIX** `deleteItem` — drop the `userId` parameter from the signature. Resolve the user id from `await auth()`. Verify ownership against the loaded row. Update the call site in `DeleteItemButton.tsx` to drop the second argument.
- **FIX** `updatePriority` — add `auth()` + session-user resolution; verify the caller owns `listId` before reordering.
- **FIX** `bookmarkList` — mirror `recordVisit`'s visibility check: load the target list, reject when `list.user_id !== sessionUser.id` AND `visibility === 'private'` (the `VISIBILITY.OWNER` constant), reject for `'unlisted'` lists the caller is not in `shared_to` for (or whatever the canonical "can render" predicate becomes — see Decision 1 in design.md). The existing visit-history SHALL becomes enforced.
- **FIX** `blockUser` — drop the `db.transaction(...)` wrapper. Run the three statements sequentially against `db`, ordered block-first (`INSERT … ON CONFLICT DO NOTHING` on `user_blocks`, then both `DELETE`s on `user_follows`). Residual safety comes from `onConflictDoNothing()` + the existing `user_follows` composite PK; per CLAUDE.md, cross-statement atomicity must be backstopped at the DB layer, not the session.
- **AUDIT-VERIFY** the remaining exported server actions not flagged by either review — `unblockUser`, `markFollowingSeen`, `removeVisit`, `clearVisitHistory`, `unbookmarkList` — for the same contract. Document each in tasks.md as either "compliant — confirmed" or "fix in this change".

## Capabilities

### Modified Capabilities

- **`server-endpoint-authorization`**: no new requirements; adds scenarios binding the additional endpoints (`updateItem`, `updateItemLists`, `updateItemStores`, `deleteItem`, `updatePriority`) to the existing "verify ownership before update or delete" requirement. The contract itself is unchanged — these endpoints were always covered by "every server action under `app/actions/**` that writes to a user-owned resource"; this change makes the binding executable.
- **`visit-history`**: no new requirements; adds a scenario verifying that `bookmarkList` rejects when the target list is not viewable to the caller. The "any list whose page they can render" clause already exists at `openspec/specs/visit-history/spec.md:40`.
- **`following`**: adds a requirement clarifying that `blockUser` (and any other follow-graph mutation) SHALL NOT use `db.transaction(...)` on the `drizzle-orm/neon-http` driver, and SHALL achieve cross-statement consistency through DB-level constraints + idempotent ordering instead. Scenario: a `blockUser` invocation succeeds without invoking the driver's interactive-transaction API.

## Impact

**Code touched:**

- `app/actions/items.ts` — `updateItem`, `updateItemLists`, `updateItemStores`, `deleteItem` (auth + ownership rewrites).
- `app/actions/lists.ts` — `updatePriority`, `bookmarkList` (auth + ownership/visibility rewrites).
- `app/actions/follows.ts` — `blockUser` (drop transaction; sequence statements).
- `app/(main)/items/ui/components/DeleteItemButton.tsx` — drop the `userId` argument from the `deleteItem` call.

**APIs / contracts:**

- `deleteItem` loses its second parameter (BREAKING for any out-of-tree caller; the in-repo call site is the single source-of-truth and changes in lockstep).
- `updateItemLists` and `updateItemStores` continue to accept the same shapes but now reject unauthorized callers; no client behavior change for legitimate use.

**Not covered by this change (deferred):**

- Release-hygiene gaps (changelog, milestone, README, `.env.example`, ADR backfill, OpenSpec archival) — see `complete-1.0-release-readiness`.
- Test suite scaffolding — separate change; large undertaking, intentionally out of scope here.
- Frontend a11y findings (S1–S3 from council review) and end-user UX items (S8) — separate change.
- DB index follow-ups on `list_visits` and `user_follows` (S5–S6) — separate change.
- The residual follow-while-being-blocked race noted by the database expert in the council review — accepted-with-comment in `followUser` per the existing pattern in `createPurchase`.
