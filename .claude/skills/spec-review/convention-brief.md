# Convention brief (arena C)

You are the **convention agent** — arena C of the review. Your prompt carries the
diff command. Emit findings in the shape and disposition vocabulary defined in
`.claude/skills/spec-review/reference/finding-format.md`, with `phase: convention`.

**Scope: single-sight defects — visible in the changed lines or file alone.**
Arena C audits two bodies of law:

- **House law** — the repository root `CLAUDE.md` and the docs it gates
  (`DATABASE.md`, …).
- **Craft law** — universal convention: security, correctness, single-file
  performance, single-responsibility.

**Every finding cites its source** — the specific doc rule (house), or the named
universal principle (craft). A "universal" citation is itself contestable at
adjudication; if you cannot name the principle, it is not a finding. Defects that
exist only relative to the wider corpus (duplication against existing code,
naming fit, doc-vs-code drift, cross-file performance) are arena B's — do not
duplicate them. Test files and `TESTING.md` are arena T's lane: carry no
test-quality duties here — no `TESTING.md` audit, no missing-test or
coverage-gaming findings; you read **production code against docs**.

**Always** audit the diff against `CLAUDE.md`.

## Follow CLAUDE.md's doc-pointers generically

Parse `CLAUDE.md` for "Read X first"-style pointers — do **NOT** use a hardcoded
filename list, so new docs added to `CLAUDE.md` are picked up automatically. Each
pointer is **gated on a trigger**: read the pointed-to doc only when the diff
touches the subject that pointer is about.

### Worked example — deriving a pointer

`CLAUDE.md` contains:

> ## Touching DB queries or schema? Read [DATABASE.md](DATABASE.md) first

Derive:
1. **Pointer** → `DATABASE.md`.
2. **Trigger** → "Touching DB queries or schema" ⇒ the diff modifies `db/schema.ts`,
   a migration, or any query in `lib/dal.ts` / `app/actions/`.
3. **Gate** → if the diff touches none of those, **do not read** `DATABASE.md`
   and raise no DB-convention findings. If it does, read `DATABASE.md` and audit
   against it (e.g. the `neon-http` no-transactions rule).

Apply the same parse → trigger → gate procedure to every pointer you find,
including ones not listed here.

### Known pointers at time of writing (re-derive each run — illustrative, not authoritative)

| Pointer in CLAUDE.md | Trigger — read the doc only when the diff… | Key checks |
| --- | --- | --- |
| "Read DATABASE.md first" | touches DB schema or queries | **`neon-http` driver — no interactive transactions** (`db.transaction(...)`, `SELECT … FOR UPDATE` are forbidden); migration workflow; driver caveats |

**Exception — the test-subject pointer is never followed here:** `TESTING.md`
and test files belong to arena T per its brief, even though `CLAUDE.md` points
at them. Do not load `TESTING.md` or audit test files.

**Untriggered pointers are not loaded** — e.g. if the diff touches no DB
schema/queries, do not read `DATABASE.md`. Also audit against the inline
`CLAUDE.md` rules that always apply (comment policy, commit-message style,
page-minimalism, no-auto-stage, etc.) when the diff is in their scope.
**Exception: corpus-relative abstraction rules — duplication against code
elsewhere in the repo — are arena B's lane; audit here only the single-sight
abstraction rules (over-generality/KISS, redundant guards, fragile coupling
visible within the diff).**

## Craft law — universal convention

Apply these to the changed lines; cite the named principle each finding
violates.

### Security
- SQL injection, XSS, CSRF
- Authentication and authorization flaws
- Secrets or credentials in code
- Insecure deserialization
- Path traversal
- SSRF

### Correctness
- Edge cases (empty input, null, overflow)
- Race conditions and concurrency issues
- Error handling and propagation
- Off-by-one errors
- Type safety

### Single-file performance
- Unnecessary memory allocations
- Algorithmic complexity (O(n²) in hot paths)
- Unbounded queries or loops visible in the changed code
- Resource leaks
- N+1 queries visible within one file (a cross-file N+1 is arena B's)

### Single-responsibility and clarity
- Naming clarity
- A unit doing two unrelated jobs
- Documentation for non-obvious logic (within the house comment policy)

### Worked craft findings

Grounded in this repo (Next.js App Router, server actions in `app/actions/`,
data access in `lib/dal.ts`, Drizzle on `neon-http` — no interactive
transactions, NextAuth).

**Security — missing authorization on a mutation:**
```
phase:       convention
location:    app/actions/claim.ts:15
description: claimItem mutates without verifying the session user may act on this list; any authenticated user can claim on any list
severity:    Critical
citation:    app/actions/claim.ts:15 (no auth()/ownership check before the write — authorization on every mutation)
disposition: Fix now
```

**Correctness — check-then-write race under neon-http:**
```
phase:       convention
location:    app/actions/purchase.ts:30
description: quantity-limit enforced by a SELECT-count then INSERT with no DB-level uniqueness; neon-http has no transactions, so two concurrent buyers both pass the check and over-claim
severity:    Major
citation:    app/actions/purchase.ts:30 (DATABASE.md: cross-statement atomicity must be backstopped at the DB layer)
disposition: Fix now
```

### Craft calibration pairs — flag vs. do NOT flag

- **N+1:** FLAG `for (const id of ids) { await db.select()… }` (sequential
  per-item queries in one file). DON'T FLAG `await Promise.all(ids.map(…))` or a
  single query with a join — batched access is not an N+1.
- **Authorization:** FLAG a server action that writes with no `auth()` / ownership
  check. DON'T FLAG a *read* of a public list — three-state visibility is a
  product feature, not a leak; a public list being readable is by design.
- **Race condition:** FLAG check-then-write with no DB-level backstop. DON'T FLAG
  the same shape where a unique / partial-unique index or `ON CONFLICT` already
  backstops it — the atomicity is enforced at the DB.
- **Type safety:** FLAG a real unsound cast (`as unknown as T`) that can mask a
  wrong shape. DON'T FLAG a narrowing the typechecker already proves — CI owns
  what `tsc` catches.

### False-positive guard — do NOT report

- Pre-existing issues on lines the diff did not touch.
- Anything a linter or typechecker already catches (CI owns those).
- Unmodified lines / context lines shown only for orientation.
- Pedantic style nits with no correctness, security, or clarity impact.
- Test files, test quality, missing tests, coverage-gaming, and coverage
  percentages — arena T and `test:coverage` own those lanes.
