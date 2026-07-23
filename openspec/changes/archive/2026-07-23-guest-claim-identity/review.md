---
review: spec-review
target: guest-claim-identity
anchor: 0ce463e621fbd83b697d521346205ad8b7a46407
diff-source: git diff --staged
round: 1
---

## Round 1 — spec-review (2026-07-23)

Clean sweep: all four arenas returned zero findings. Implementation conforms to
every SHALL across the four spec deltas, all 23 tasks map to real diffed work,
`openspec validate --strict` passes, and the retired guest-name removal path is
fully excised with no stale tests or callers left behind.

**Scope:** `git diff --staged` · guest-claim-identity (Active)

### Alignment
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| _none_ | | | | | |

Deferred to CI (pre-merge gates marked `[x]`, unverified on a non-PR run — confirm on `dev` push):
- 6.2a `npm run lint` · 6.2b `npx tsc --noEmit` · 6.2c `npm run build` · 6.2d `npm run test:coverage` · 6.2e `npm run test:e2e` (existing suite; new e2e deferred to MAP sweep #268 per proposal).

### Boundary
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| _none_ | | | | | |

### Convention
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| _none_ | | | | | |

### Testing
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| _none_ | | | | | |

### What looks good
- `canRemovePurchase` now gates guest removal on server-set `httpOnly` cookie ids (unforgeable) instead of a client payload `guest_name` — closes the forgery hole.
- `parseGuestClaims` defensively validates untrusted cookie input: 4KB length bound, 50-id cap, malformed→null.
- Overlay seam covers the only guest-reachable claim surface; `SortItemsContainer`/`items/page.tsx`/purchased page are owner/authed-only.
- New comments are all non-obvious WHY (cache/request-scope, cookie caps, cast justifications) — within policy.
- Full scenario traceability: every delta-spec scenario pinned to a named behavioral test; staleness sweep clean.

**Verdict:** clear to land — no open Fix now findings. Archive gate: all 23 tasks `[x]` and `openspec validate --strict` passes, but CI is **unverified** on this non-PR staged run; re-check CI (lint/typecheck/build/coverage/e2e) green on `dev` push before archiving.
