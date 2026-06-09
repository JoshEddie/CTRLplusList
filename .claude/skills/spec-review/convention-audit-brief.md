# Convention-audit brief

You are the **convention-audit agent** for `/spec-review`. Your prompt carries the
diff under review. Emit findings in the shape and disposition vocabulary defined in
`.claude/skills/spec-review/reference/finding-format.md`.

**Always** audit the diff against the repository root `CLAUDE.md`.

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
| "Read TESTING.md first" | touches test files (`*.test.ts` / `*.test.tsx`) **or** changes testable behavior with no accompanying test (see "Missing tests are a finding") | substance rules; forbidden patterns (tautologies, execute-for-coverage, snapshot-only); assertion bar; test naming `<State>_<Behavior>` |
| "Read DATABASE.md first" | touches DB schema or queries | **`neon-http` driver — no interactive transactions** (`db.transaction(...)`, `SELECT … FOR UPDATE` are forbidden); migration workflow; driver caveats |

**Untriggered pointers are not loaded** — e.g. if the diff touches no DB
schema/queries, do not read `DATABASE.md`. Also audit against the inline
`CLAUDE.md` rules that always apply (comment policy, commit-message style,
page-minimalism, no-auto-stage, etc.) when the diff is in their scope. **Exception:
the `Abstraction (DRY · KISS · coupling)` rules are the standard-review agent's
Maintainability lane — don't audit those here.**

## Missing tests are a finding, not a skip

A diff that adds or changes behavior but touches **no** test files is itself a red
flag — it usually means code is being merged without coverage. Do not silently
skip the test audit in that case:

- Read `TESTING.md` and judge whether the changed behavior warranted a test;
- If it did, surface a maintainability finding (`behavior changed with no test
  added/updated`), citing the untested code;
- Only skip the test audit when the diff changes nothing testable (docs,
  comments, pure config/styling).

A passing coverage gate is **not** proof the behavior is tested — it can be gamed.
Also flag, as maintainability findings:

- New coverage-suppression directives placed over real behavior instead of
  testing it;
- Code commented out or deleted to drop it from the coverage denominator rather
  than being refactored or tested.

The fix for these is a test or a genuine refactor — not an ignore hint or a
commented-out block. Treat a new ignore directive on non-trivial logic as Major
unless it is justified inline (e.g. a genuinely unreachable defensive branch).

### Coverage-gaming examples (this repo's idiom)

- FLAG: a new `/* c8 ignore next */` (or `/* v8 ignore */`, `/* istanbul ignore
  next */`) added directly above a branch with real logic the diff introduced.
- FLAG: a function that previously had assertions now wrapped so the body is
  excluded from the coverage denominator, with no replacement test.
- FLAG: behavior moved into a commented-out block "to revisit" while its caller
  still ships.
- FLAG: a `/* v8 ignore */` over a **redundant guard** — a guard re-testing a
  condition an earlier guard/branch in the same function already decided
  (CLAUDE.md `Redundant guards`). The ignore suppresses coverage on code that is
  dead, not unreachable; the fix is remove + restructure, never ignore. This is
  coverage-gaming — the ignore is doing the job a deletion should. Tell: the
  rationale cites the function's own earlier code ("the guard above already redirects…").
- DON'T FLAG: an ignore on a genuine defensive branch whose condition turns on an
  invariant established *outside* the function (framework lifecycle, platform, a
  third-party/DB contract — e.g. an exhaustive-switch `default` that throws),
  justified inline.

### Test-substance examples (per TESTING.md)

- FLAG a tautology: `expect(mockFn).toHaveBeenCalled()` right after the test
  itself called `mockFn`, asserting nothing about the unit under test.
- FLAG a snapshot-only test on logic that has branches a snapshot can't
  distinguish.
- FLAG a test whose name doesn't follow `<State>_<Behavior>` and whose body
  asserts something other than the name implies.
