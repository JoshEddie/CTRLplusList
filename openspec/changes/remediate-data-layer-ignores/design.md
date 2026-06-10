# Design — remediate-data-layer-ignores

## Context

The `reorganize-data-layer` move carried fourteen `/* v8 ignore */` annotations and a batch of WHAT comments verbatim from the deleted `lib/dal.ts` / `app/actions/*` sources into `lib/data/`. `/spec-review` classified them (issue #126): some sit on guards that are dead by the function's own control flow, some carry rationales that are factually wrong under the neon-http round-trip model, some cover guards that are directly testable, and two cover catch/rethrows the sibling suite already knows how to trigger. `testing-foundation` governs the disposition: write the test or delete the dead code — never exclude what control flow already decided.

Every target file already has a pglite-backed suite in `lib/data/__tests__/` with the needed helpers in place (`noSession()`, `vi.spyOn(db.query.X, 'findFirst').mockResolvedValueOnce`, `vi.spyOn(db, …)` failure injection), so no new test infrastructure is required.

## Goals / Non-Goals

**Goals:**

- Zero invalid `/* v8 ignore */` in `lib/data/` — each of the fourteen issue-cited ignores is resolved by deleting dead code or writing the test, per `testing-foundation`'s disposition rule.
- WHAT comments swept from the six cited modules.
- Per-file coverage floors (98/98/95/100) hold for every `lib/data/` module after the ignores come out.

**Non-Goals:**

- The two COALESCE-fallback ignores ([listItems.actions.ts:88](lib/data/listItems.actions.ts:88), [item.associations.ts:165](lib/data/item.associations.ts:165)) stay: their rationale cites the SQL `COALESCE` contract — an invariant established outside the function — which is exactly `testing-foundation`'s allowed set. The issue deliberately omits them.
- No behavior change to any endpoint's success path; no schema, cache-tag, or endpoint-surface changes.
- No restructuring beyond the optional `list.actions.ts` actor-resolution rider and the D8 response-envelope consolidation adopted from /spec-review of PR #128.

## Decisions

### D1 — Dead guards are deleted, not tested

[item.actions.ts:89](lib/data/item.actions.ts:89) (`listIds.length > 0` inside `lists.length > 0` + 1:1 `.map`), [item.schema.ts:71](lib/data/item.schema.ts:71)/[:80](lib/data/item.schema.ts:80) (`if (store.link)` always truthy post-`hasAllFields`; unreachable trailing `return true`), [listItems.actions.ts:284](lib/data/listItems.actions.ts:284) (`new_position !== itemPosition` decided by the earlier `itemPosition === targetPosition` guard). These conditions are excluded by the same function's earlier control flow — CLAUDE.md's redundant-guard rule says delete and let narrowing flow from the existing flow. Alternative (write tests forcing both branches) is impossible: the false branches are unreachable by construction. The `item.schema.ts` deletion unwraps the guard body (keep the `try { new URL } catch` validation, drop the wrapper and trailing return).

### D2 — Race branches get tests via single-call mock overrides

[purchase.actions.ts:88](lib/data/purchase.actions.ts:88) and [list.actions.ts:176](lib/data/list.actions.ts:176) guard real races: under neon-http, the visibility/ownership check and the follow-up query are separate HTTP round-trips, so a concurrent delete between them is live behavior. The ignores' "unreachable" rationales are wrong. Test with `vi.spyOn(db.query.items, 'findFirst').mockResolvedValueOnce(undefined)` (purchase) and an equivalent once-mock making `.returning()` yield `[]` (list) — the pattern sibling suites already use. Alternative (delete the guards as redundant) is rejected: the upstream check ran in a *different round-trip*, so these are defensive guards on a DB-timing invariant, not redundant ones — they must stay and be covered.

### D3 — Exported-function auth guards get direct tests

`updateItemStores` / `updateItemLists` in [item.associations.ts](lib/data/item.associations.ts) are exported; the "defense-in-depth, unreachable via the public surface" rationale cites in-repo callers, which `testing-foundation` does not accept (callers can change; the export *is* a public surface). Call each export directly under `noSession()` and assert the `Unauthorized` throw (covers the session guard), and with a session whose user doesn't own the item (covers the ownership guard at `:37`/`:123`). The not-found-user guard (`:29`/`:115`) is covered by mocking `db.query.users.findFirst` to return `undefined` once.

### D4 — `checkListBalance < 2` guard: exercise through `updatePriority`, delete only if proven dead

The guard at [listItems.actions.ts:130](lib/data/listItems.actions.ts:130) is in a private helper, so the test must drive it through the exported `updatePriority`. Attempt: a list state where the `limit(2)` scan returns fewer than 2 rows when the helper runs (e.g. mock the select chain once). If implementation shows `updatePriority`'s own preconditions (distinct item + target both present) genuinely guarantee ≥2 rows on every path, the guard is dead per the redundant-guard rule — delete it instead. The decision is made at implementation time with the evidence in hand; both dispositions satisfy `testing-foundation`.

### D5 — db-error rethrows get failure-injection tests

The catch/rethrow ignores at [listItems.actions.ts:136–141](lib/data/listItems.actions.ts:136) and [:166–171](lib/data/listItems.actions.ts:166) claim "not triggerable from userspace", but the same file's suite already injects DB failures via `vi.spyOn(db, …)` ([listItems.actions.test.ts:164](lib/data/__tests__/listItems.actions.test.ts:164), [:271](lib/data/__tests__/listItems.actions.test.ts:271)). Extend that exact pattern to these two catches and assert the rethrow propagates (and that the error is the injected one — no swallowing).

### D6 — WHAT-comment sweep is mechanical deletion

Delete the comments enumerated in the issue across `item.actions.ts`, `item.schema.ts`, `item.associations.ts`, `listItems.actions.ts`, `user.ts`, `list.ts`. None encode a hidden constraint — each restates the adjacent identifier. Comments that *do* explain WHY (e.g. the fractional-index midpoint comment at `listItems.actions.ts:174` and the retained COALESCE ignore rationales) stay.

### D7 — Rider: adopt `authedUserId` in `list.actions.ts` — in scope

The four actions' inline `auth()` + email lookup duplicates what `lib/data/user.session.ts`'s `authedUserId` already provides and what `user.actions` / `visit.actions` / `listItems.actions` already use. CLAUDE.md DRY says extract-on-sight for identical-by-design logic; it was deferred only to keep the move pure, and this change is the designated home for deferred behavior-touching work. Test impact: `list.actions.test.ts` switches from stubbing `auth()` to the same `authedUserId`-stubbing pattern the sibling suites use. Thrown-error/return contracts of the four actions must be preserved (assert in the existing tests).

Surfaced ordering difference (post-review): `setListVisibility` was the only action that parsed visibility between the session check and the user lookup; the fused `authedUserId` necessarily resolves the actor first, so an unknown-email session with an invalid visibility value now returns Unauthorized instead of the validation error — consistent with the other three actions and the sibling modules.

### D8 — Review-adopted rider: one `ActionResponse` envelope, one unauthorized response

/spec-review of PR #128 flagged the four unauthorized literals the D7 rider left in `list.actions.ts`; investigation surfaced the wider duplication: the literal `{ success: false, message: 'Unauthorized', error: 'Unauthorized' }` appeared 13× (list ×4, visit ×4, user ×5) and the `ActionResponse` envelope was defined three times as drifted subsets (`item.actions` lacks `id`; `user.actions` lacks `errors`/`id`). Disposition per CLAUDE.md DRY (multi-field literal, count ≥3): merge the envelope into its superset in `lib/types.ts` — widening is safe, no consumer reads the absent optional fields — and extract `UNAUTHORIZED_RESPONSE` into `user.session.ts` beside `authedUserId`, whose failure it expresses. All importers repointed; no message or `error`-code change anywhere.

## Risks / Trade-offs

- [Removing ignores drops a file below the coverage floor in an unforeseen spot] → The verification step runs per-file coverage after each file's remediation, not only at the end; any newly exposed uncovered region gets the same test-or-delete disposition, never a new ignore.
- [D4's through-the-export test proves the guard unreachable] → That is a finding, not a failure: delete the guard per the redundant-guard rule and note it in the task. The risk is only in guessing wrong *before* looking; the design defers the call to implementation evidence.
- [Rider changes `list.actions` error shape subtly (e.g. error message text from `authedUserId` differs from the inline throw)] → Existing tests assert the current contract; run them before swapping, align expectations only where the message is an implementation detail, and surface any user-visible difference rather than silently accepting it.
- [Deleting the `item.schema.ts` wrapper changes Zod refinement semantics] → The refinement's observable verdicts are already pinned by `item.schema` tests; the unwrap is behavior-preserving by construction (the removed branch was unreachable), and the suite proves it.
