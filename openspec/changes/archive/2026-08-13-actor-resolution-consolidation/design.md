## Context

See [proposal.md](proposal.md) — Why. Two helpers already exist and differ in kind, which is what makes "just merge them" the wrong instinct:

| | `authedUserId()` | `getUserIdByEmail(email)` |
|---|---|---|
| Home | `lib/data/user.session.ts` (internal module) | `lib/data/user.ts` (read module) |
| Input | none — reads the session itself | an email, passed by the caller |
| Returns | `string \| null` | `UserTable \| null` |
| Caching | none (calls `auth()`) | React `cache()`, per-request |
| Callers | action modules | ~19 server components |
| Why separate | imports `@/lib/auth`, which initializes NextAuth at module scope — keeping it out of `user.ts` keeps read modules free of that side effect (`data-layer-organization`) |

The ten sites this change removes all resolve **from the session** and all consume **`.id` only**, so they belong on `authedUserId` without exception.

## Goals / Non-Goals

**Goals**

- One implementation of the session→`users.id` lookup.
- Preserve every `error` code, HTTP status, thrown-`Error` message, and write/no-write outcome.
- Keep the enumerated guest-write set exactly as `server-endpoint-authorization` fixes it.

**Non-Goals**

- Changing either helper's signature, home, or caching.
- The ~19 page shells (settled at design; see proposal — *What Changes*).
- Any profile awareness. [#190](https://github.com/JoshEddie/CTRLplusList/issues/190) widens this seam; this change only makes it singular.

## Decisions

### D1 — Target `authedUserId`, signature unchanged

All ten sites move to `authedUserId(): Promise<string | null>`.

*Alternatives rejected.* Returning `{ userId }` so [#190](https://github.com/JoshEddie/CTRLplusList/issues/190) can add `activeProfileId` without a signature break — a one-field wrapper with no second consumer, and #190 must open these call sites anyway to convert ownership comparisons to membership containment ([#202](https://github.com/JoshEddie/CTRLplusList/issues/202)). A tri-state `'no-session' | 'no-row' | id` — re-widens the return type to serve one caller, which D4 handles locally instead.

### D2 — Both helpers survive; no merge

`getUserIdByEmail` is untouched. It takes an email rather than reading the session, is React-cached, and returns the full row — one caller ([ItemsContainer.tsx:58](app/(main)/items/ui/components/ItemsContainer.tsx:58)) reads `.name`. Merging would drag all ~19 shells into scope, which is out per the proposal.

### D3 — Seven of ten sites are byte-identical drop-ins

Verified site by site rather than assumed:

| Site | Current no-session vs. no-row | After |
|---|---|---|
| `deleteItem` | both `throw new Error('Unauthorized')` | identical |
| `updateItemStores` | both `throw new Error('Unauthorized')` | identical |
| `updateItemLists` | both `throw new Error('Unauthorized')` | identical |
| `setListItems` | falls into `!sessionUser \|\| id !== list.user_id` → `'Forbidden'`; a `null` id still fails the comparison | identical (3 tests assert `'Forbidden'`) |
| `removePurchase` | already collapses both to `actorUserId = null` | identical |
| product-fetch `POST` | both return HTTP 401 | identical |
| `resolveClaimIdentity` | branch is load-bearing | preserved — see D4 |
| `createItem` / `updateItem` / `archiveItem` | `'Unauthorized access'` vs `'User not found'`, both `error: 'Unauthorized'` | normalized to the shared `UNAUTHORIZED_RESPONSE` |

So the non-preserving surface is **three `message` strings**, not ten. `message` reaches users through `toast.error(result.message)`; no test or spec asserts either string, and `server-endpoint-authorization` places `message` outside the rejection contract. The three sites therefore return `UNAUTHORIZED_RESPONSE` from `user.session.ts` — the constant every sibling action module already returns — rather than a fourth hand-rolled copy of the literal, and its `message: 'Unauthorized'` is the normalized text.

The unauthorized literals elsewhere in `listItems.actions.ts` (`setListItems`' session gate, `removeListItem`, `updatePriority`) are pre-existing and untouched: only `setListItems`' id lookup is converted here, so folding those into the constant is out of this change's charter.

### D4 — `resolveClaimIdentity` keeps its own `auth()` call

It is the one site where "no session" and "session with no `users` row" must stay distinct: today the latter is a hard error *inside* the authenticated branch, and routing it through `authedUserId` alone would let a stale session fall through to the guest path and write `claimed_by = NULL`. Since guest write paths are enumerated by name, widening that set silently is not acceptable — this is the behavior the new spec requirement's stale-session scenario pins.

It therefore keeps `const session = await auth()` for the guest-vs-authenticated branch and calls `authedUserId()` for the id. The duplication this change removes is the `db.query.users` lookup, not `auth()` itself.

*Trade-off:* two `auth()` calls on this path. Accepted — `auth()` is a cookie read, not a DB round-trip, and the alternative is the tri-state return D1 rejects.

`setListItems` resolves the session twice for the same reason: it keeps its own session-presence gate and then calls `authedUserId()`. This is the shape `server-endpoint-authorization` prescribes — call `auth()` and reject when no session exists, *then* resolve `users.id` through the shared helper — so it is accepted on the same reasoning, not a defect to fix. The one alternative that would drop the second call, resolving the id from the session's email via `getUserIdByEmail`, is barred: the same requirement forbids an endpoint reading the session email and querying `users` itself, and D2 keeps that helper React-cached, full-row, and error-swallowing.

### D5 — `app/api/product-fetch/route.ts` imports `@/lib/data/user.session`

Direction `app/**` → `lib/data/**` is permitted; the ban is the reverse. `data-layer-organization`'s sentence naming the helper's audience as "the action modules" is widened by this change's delta so the import isn't blocked at review on stale wording.

### D6 — Enforcement is the spec plus review

No custom ESLint rule banning `eq(users.email, …)` outside `user.session.ts`. One function is being protected, the violation has an obvious diff signature, and the new requirement makes it normative. If it recurs, write the rule then.

### D7 — Tests keep mocking the session, not the seam

Affected suites mock `@/lib/auth`'s `auth()` and nothing else on this path: `vi.mock('@/db')` swaps in a real per-file pglite database (`bootPglite`, full migration set, users seeded per test), so no suite mocks `db.query.users.findFirst`. The "session whose email matches no `users` row" case is produced by pointing the session at a ghost email and letting the real query miss. `authedUserId` is therefore exercised end to end rather than stubbed, and the conversion needs no test-mock migration. Two consequences:

- `lib/data/__tests__/purchase.actions.test.ts` needs no second mock for the real `auth()` call D4 leaves in place — the one `auth()` mock already drives both the guest-vs-authenticated branch and the id resolution. It is where the stale-session case (session present, email matching no `users` row) gets its assertion, per `server-endpoint-authorization`'s new scenario.
- Assertions on `error` codes and thrown-`Error` messages stand unchanged. No suite asserts any of the affected `message` strings, so the normalization moves nothing. Per `TESTING.md`, no test is added purely to execute the swapped line; the behavior each test names is what it keeps asserting.

## Risks / Trade-offs

- **A drop-in that isn't** — a site whose guard reads subtly differently than the table in D3 → the table was built by reading each of the ten guards, not by pattern-matching; `tasks.md` converts them one site at a time so a divergence surfaces as a single failing suite rather than a ten-site debug.
- **Stale session silently becomes a guest** — the failure D4 exists to prevent, and the one with real consequences (an unattributable claim). Mitigated by keeping the branch *and* pinning it with a spec scenario and a unit test, so a later refactor that "simplifies" `resolveClaimIdentity` onto `authedUserId` fails a test rather than shipping.
- **Three toast strings change** — accepted and stated in the spec delta rather than filed under "pure refactor". No flow depends on the text.
- **Double `auth()` in `resolveClaimIdentity` and `setListItems`** — cookie read, not a DB round-trip, and the gate-then-helper shape the spec prescribes. Accepted (D4).

## Migration Plan

Single PR, no schema change, no migration, no rollback procedure beyond reverting the commit. Order:

1. Spec deltas (already written).
2. The six pure drop-ins plus `setListItems`, one site at a time, updating each site's tests as it moves.
3. `createItem` / `updateItem` / `archiveItem` — same swap plus the `message` normalization.
4. `resolveClaimIdentity` last, since it is the only site with a behavioral guard to preserve, and add the stale-session test.
5. Full gate battery (`npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm run test:coverage`, `npm run test:e2e`) — the e2e guest-claim flow is the end-to-end guard on step 4.
