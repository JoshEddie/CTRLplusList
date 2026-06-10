# Tasks — remediate-data-layer-ignores

Issue [#126](https://github.com/JoshEddie/CTRLplusList/issues/126). Per-file coverage is re-checked after each file's ignores come out (design Risks), not only at the end. No new `/* v8 ignore */` anywhere; the two COALESCE ignores ([listItems.actions.ts:88](../../../lib/data/listItems.actions.ts), [item.associations.ts:165](../../../lib/data/item.associations.ts)) stay (design Non-Goals).

## 1. Delete dead guards and their ignores (design D1)

- [x] 1.1 `lib/data/item.actions.ts` — remove the `if (listIds.length > 0)` guard, its ignore, and the `// Only proceed if we have valid list IDs` comment; call `updateItemLists(listIds, id)` directly inside the `lists.length > 0` branch
- [x] 1.2 `lib/data/item.schema.ts` — unwrap the always-truthy `if (store.link)` guard (keep the `try { new URL } catch` validation), delete the unreachable trailing `return true`, and both ignores
- [x] 1.3 `lib/data/listItems.actions.ts` — remove the `if (new_position !== itemPosition)` guard and its ignore; the update runs unconditionally after the earlier `itemPosition === targetPosition` early return
- [x] 1.4 Run the three files' suites + per-file coverage; confirm floors hold with the guards gone

## 2. Test the live race branches, drop the wrong "unreachable" ignores (design D2 — issue priority)

- [x] 2.1 `lib/data/__tests__/purchase.actions.test.ts` — add a concurrent-delete case: `vi.spyOn(db.query.items, 'findFirst').mockResolvedValueOnce(undefined)` after the real `isItemViewable` pass; assert the `{ success: false, message: 'Item not found' }` result; remove the ignore at `purchase.actions.ts:88`
- [x] 2.2 `lib/data/__tests__/list.actions.test.ts` — add a row-deleted-between-check-and-update case making `.returning()` yield `[]` once; assert the `{ success: false, message: 'List not found' }` result; remove the ignore at `list.actions.ts:176`

## 3. Test the exported-function auth guards, drop the defense-in-depth ignores (design D3, D4)

- [x] 3.1 `lib/data/__tests__/item.associations.test.ts` (extend or create alongside the existing suites) — `updateItemStores`: no-session throw via `noSession()`, user-not-found throw via `db.query.users.findFirst` once-mock, non-owner throw; remove the ignores at `:21`, `:29`, `:37` *(user-not-found exercised via the sibling suites' `asGhost()` unknown-email path — same branch, real db lookup, no mock needed; a missing-item case was added alongside for the `!item ||` half of the ownership guard)*
- [x] 3.2 Same three cases for `updateItemLists`; remove the ignores at `:107`, `:115`, `:123`
- [x] 3.3 `checkListBalance` `< 2 rows` guard (`listItems.actions.ts:130`) — attempt to drive it through `updatePriority`; if its preconditions provably guarantee ≥2 rows on every path, delete the guard as redundant instead (record which disposition was taken) — **disposition: guard KEPT and tested.** The `limit(2)` scan is its own neon-http round-trip, so a concurrent removal can shrink the list below 2 rows after `updatePriority`'s membership checks passed — a live DB-timing branch, not a redundant guard. Driven through `updatePriority` by stubbing the flow's only zero-arg `db.select()` to return `[]`.

## 4. Test the db-error rethrows, drop the ignores (design D5)

- [x] 4.1 `lib/data/__tests__/listItems.actions.test.ts` — extend the existing `vi.spyOn(db, …)` failure-injection pattern to the `checkListBalance` catch (`listItems.actions.ts:136–141`); assert the injected error propagates; remove the ignore pair
- [x] 4.2 Same for the `rebalanceList` catch (`:166–171`); assert propagation; remove the ignore pair

## 5. Delete carried-over WHAT comments (design D6)

- [x] 5.1 `lib/data/item.actions.ts` — `// Update item`, `// Delete item`, `// Security check - ensure user is authenticated`, `// Get the lists from the form data and ensure they exist`, `// Extract just the IDs from the NameId objects`, `// Type safe update object with validated data`
- [x] 5.2 `lib/data/item.schema.ts` — `// Optional fields`, `// If no fields are filled, it's valid`, `// If any field is filled, all must be filled`
- [x] 5.3 `lib/data/item.associations.ts` — `// First, get all current store associations for this item`, `// Convert to set for efficient lookups`, `// Insert new associations`, `// Skip if already exists` *(the identical `// First, get all current list associations…` twin in `updateItemLists` was swept too)*
- [x] 5.4 `lib/data/listItems.actions.ts:241`, `:296`; `lib/data/user.ts` — `// Get user by id`, `// Get user by email`; `lib/data/list.ts` — `// Fetcher functions for React Query`

## 6. Rider — adopt `authedUserId` in list.actions (design D7)

- [x] 6.1 Replace the four inline `auth()` + email-lookup blocks in `lib/data/list.actions.ts` with `authedUserId` from `lib/data/user.session.ts`, preserving each action's error/return contract *(surfaced difference: the two guard `message` strings collapse from 'Unauthorized access' / 'User not found' to 'Unauthorized', matching user/visit/listItems actions; `error: 'Unauthorized'` — what callers branch on — is unchanged)*
- [x] 6.2 Update `lib/data/__tests__/list.actions.test.ts` mocks from `auth()`-stubbing to the sibling suites' `authedUserId` pattern; existing assertions stay green (surface any user-visible error-shape difference rather than silently aligning) *(no mock edits needed: the sibling pattern IS `auth()`-stubbing — `authedUserId` resolves through the mocked `auth` + real pglite lookup; all 41 assertions green unchanged)*

## 7. Conformance sweep (delta spec)

- [x] 7.1 Grep `lib/data/` for `v8 ignore`: only the two COALESCE ignores remain, each citing the SQL contract (external invariant); zero rationales cite the function's own control flow or in-repo callers
- [x] 7.2 Per-file coverage floors (98 stmts / 98 lines / 95 branches / 100 funcs) hold for every `lib/data/` module with the ignores removed (all 14 modules at 100 stmts/funcs/lines; lowest branches 97.91 in `item.associations.ts`)

## 8. Pre-merge

- [x] 8.1 `npm run lint` — zero errors, zero warnings *(zero errors; the only two warnings are pre-existing yellow-band `sonarjs/max-lines` advisories in files outside this change — the tolerated class per CLAUDE.md)*
- [x] 8.2 `npx tsc --noEmit` — zero errors
- [x] 8.3 `npm run build` — completes successfully
- [x] 8.4 `npm run test:coverage` — zero failing tests, floors hold (204 files / 2117 tests green)
- [x] 8.5 `npm run test:e2e` — zero failing tests (18 passed)
