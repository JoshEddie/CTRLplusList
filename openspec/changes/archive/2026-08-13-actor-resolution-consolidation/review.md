---
review: spec-review
target: actor-resolution-consolidation
anchor: e5a4a67cb546de7a27cba9feeeeff0fd15432b9d
diff-source: git diff --staged
round: 2
---

<!-- Propose-time scaffold. No rounds yet: `round: 0` means unreviewed.
     /spec-review appends `## Round 1`, sets `round: 1`, and fills the real
     `anchor`/`diff-source`. Do not add findings, rounds, or a verdict here. -->

## Round 1 — spec-review (2026-08-13)

**Scope:** `git diff --staged` · actor-resolution-consolidation (active)

### Alignment
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| A1 | Major | tasks.md 1.1/1.2/1.4/1.6/2.4/3.2 | Six `[x]` tasks mandate a test-mock migration (`authedUserId` in place of `auth()` + `db.query.users.findFirst`, per design D7) but no test file references `authedUserId` or mocks `db.query.users.findFirst`; suites mock `@/lib/auth` and run against a real test DB, so D7's premise is wrong and no test change was needed. | Fix now — either perform the migration in `item.actions.test.ts`, `item.associations.test.ts`, `listItems.actions.test.ts`, `route.test.ts`, or reword D7 and drop the test-update clauses | tasks.md (task-completion truth); design.md D7 |
| A2 | Minor | tasks.md 2.4 | `[x]` on the premise that `'User not found'` assertions become `'Unauthorized access'`; no test asserts either string — clause vacuous. | Fix now — reword 2.4 to state no assertion existed, or drop the clause | tasks.md 2.4; design.md D3 |
| A3 | Minor | specs/server-endpoint-authorization/spec.md:9 | Diff amends the delta spec (new `setListItems` rejection-shape exemption, scenario scoping qualifier, new "Ownership-subsumed rejection still writes nothing" scenario + acceptance row) with no task recording it; §1 lead-in and D3 still call `setListItems` a byte-identical drop-in needing no spec change. | Fix now — add a task recording the amendment and cross-reference from D3, or revert the additions | tasks.md §1–§4; design.md D3 |
| A4 | Minor | lib/data/__tests__/purchase.actions.test.ts:288 | `AuthedUnknownEmailWithGuestName_ReturnsUnauthorized-NoRow` exceeds task 3.3, which specifies a single stale-session test; no task or scenario documents the guest-name variant. | Fix now — widen 3.3 to name both inputs, or drop the case | tasks.md 3.3; spec.md stale-session scenario |

### Boundary
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| B5+C | Minor | lib/data/purchase.actions.ts:53 | `resolveClaimIdentity` calls `auth()` for the guest branch, then `authedUserId()` calls `auth()` again before the users lookup; `getUserIdByEmail(session.user.email)` in `lib/data/user.ts` already covers the session-in-hand shape. Convention arena reached the same site and dispositioned it Drop as design-D4-sanctioned; boundary's reuse path is the tiebreaker. | Fix now | user.session.ts:16-23; lib/data/user.ts `getUserIdByEmail` (design D2) |
| B6+C | Minor | lib/data/listItems.actions.ts:39 | `setListItems` keeps its own `auth()` gate at :22 then calls `authedUserId()`, re-running `auth()` — same double session resolution at a second converted site. | Fix now | listItems.actions.ts:22 ↔ :39 ↔ user.session.ts:16-23 |
| B7 | Minor | lib/data/item.actions.ts:24 | `createItem`/`updateItem`/`archiveItem` hand-roll the unauthorized `ActionResponse` literal three times while importing from the module that exports `UNAUTHORIZED_RESPONSE`; every sibling action module returns that constant. | Fix now | item.actions.ts:24-30, :88-94, :175-181 ↔ user.session.ts:7 ↔ list.actions.ts:48, visit.actions.ts:18, user.actions.ts:63; CLAUDE.md DRY (3+ copies of multi-field literal) |

### Convention
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| — | — | — | Sole finding (double `auth()` resolution) merged into B5/B6. | — | — |

### Testing
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| T8 | Major | lib/data/__tests__/listItems.actions.test.ts:93 | `UnknownEmail_ReturnsForbidden` asserts only the error string, not write-absence; the new scenario's second half is unpinned — a null actor passing the ownership comparison and writing `list_items` while returning `'Forbidden'` stays green. `listItemRows(listId)` already exists in the file. | Fix now — add `expect(await listItemRows('L')).toHaveLength(0)`, rename to `UnknownEmail_ReturnsForbidden-NoRow` | spec.md "Ownership-subsumed rejection still writes nothing" |
| T9 | Major | app/api/product-fetch/__tests__/route.test.ts:82 | `UnknownSessionEmail_Returns401` asserts status only; sibling `Unauthenticated_Returns401-NoSeamCall` asserts status, body, and no seam call. The identical-rejection scenario is exactly the claim that both causes agree on payload and side-effect-freedom. | Fix now — mirror the sibling's assertions, rename to `UnknownSessionEmail_Returns401-NoSeamCall` | spec.md "Both unresolvable-actor causes reject identically"; TESTING.md precision |

### What looks good
- Net −62 lines across six production files; every converted site sheds its own `auth()` + `db.query.users.findFirst` pair for one `authedUserId()` call.
- `openspec validate --strict` passes; all 24 tasks checked, no `[~]` gates.
- New purchase tests carry `-NoRow` write-absence facets — the pattern T8/T9 should follow.

**Verdict:** findings remain — blockers: A1, A2, A3, A4, B5, B6, B7, T8, T9 (all open Fix now); CI unverified (no PR invocation).

### Adjudications (2026-08-13)

| # | Old → New | Rationale |
|---|-----------|-----------|
| A3 | Fix now → Drop | The spec amendment states the true behavior — `setListItems` rejects a stale session with `error: 'Forbidden'`, not `'Unauthorized'` — so reverting it would leave the delta spec wrong. Missing paper trail only; the stale §1 lead-in and D3 wording are not worth a blocking edit. |
| A4 | Fix now → Drop | The guest-name variant is the sharper of the two cases: it is the exact input where a stale session could fall through to the guest write path and insert `claimed_by = NULL`, the failure D4 exists to prevent. A test exceeding its task's letter is not a defect; deleting it would remove the only coverage of that input. |
| B5+B6 | Fix now → Drop (merged — same defect at two converted sites) | The proposed fix contradicts this change's own SHALL: spec.md:5 forbids an endpoint reading the session email and querying `users` itself, :48 forbids querying `users` at the call site, and D2 keeps `getUserIdByEmail` untouched, React-cached, full-row, and error-swallowing (a DB outage would silently become a null actor). MODIFIED :47–48 prescribes *both* an `auth()` session gate and helper resolution, so the second `auth()` is the specified shape; D4 accepts it explicitly as a cookie read, not a DB round-trip. |

**Verdict:** findings remain — blockers: A1, A2, B7, T8, T9 (open Fix now); CI unverified (no PR invocation).

## Round 2 — recheck (2026-08-13)

All five open `Fix now` findings from Round 1 (as amended) verified resolved in the fix delta. The delta touches code (`item.actions.ts`, two test suites) and spec artifacts (`design.md`, `proposal.md`, `tasks.md`), but the artifact edits *are* A1/A2's prescribed reconciliation — the round's own remedy, not a contract move — so the owner ruled this recheck-scoped rather than an escalation.

**Scope:** `git diff` (unstaged working tree, anchor `e5a4a67`) · actor-resolution-consolidation (active)

| # | Prior finding | Status | Notes |
|---|---------------|--------|-------|
| A1 | D7 + six task clauses mandate a test-mock migration that was never needed | resolved | D7 rewritten to the real shape (suites mock `@/lib/auth` only; `vi.mock('@/db')` swaps in per-file pglite). Verified: no test file references `authedUserId` or `db.query.users.findFirst`. Tasks 1.1/1.2/1.4/1.5/1.6/2.4/3.2 reworded to "run the suite"; `proposal.md`'s Tests paragraph corrected in lockstep. |
| A2 | Task 2.4's `'User not found'` → `'Unauthorized access'` assertion clause vacuous | resolved | 2.4 now states no test asserts either retired `message` string. Verified: neither string appears in any test. |
| B7 | Three hand-rolled unauthorized literals in `item.actions.ts` | resolved | All three return `UNAUTHORIZED_RESPONSE` from `@/lib/data/user.session`; import added. D3 and tasks 2.1–2.3 updated to name the constant, and D3 now records `message: 'Unauthorized'` as the normalized text (the constant's value, not the previously-named `'Unauthorized access'`). |
| T8 | `UnknownEmail_ReturnsForbidden` asserts error string only | resolved | Renamed `-NoRow`; `expect(await listItemRows('L')).toHaveLength(0)` added. |
| T9 | `UnknownSessionEmail_Returns401` asserts status only | resolved | Renamed `-NoSeamCall`; body (`{ error: 'Unauthorized' }`) and `expect(fetchProduct).not.toHaveBeenCalled()` added, mirroring the sibling. |

No new findings.

**Verdict:** clear to land — every prior open `Fix now` resolved, no new `Fix now` findings. CI still unverified (no PR invocation).
