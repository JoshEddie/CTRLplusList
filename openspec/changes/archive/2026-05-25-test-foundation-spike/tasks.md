## 1. Setup

- [x] 1.1 Capture pre-spike baseline of `package.json` and `package-lock.json` (e.g., `git stash` or record the commit SHA) so revert at archive is mechanical.
- [x] 1.2 Create `spike/` directory under this change with `poc/`, `db-under-test-comparison.md`, `seed-negative-case-audit.md`, and `runner-and-ci-choices.md` as placeholder files.
- [x] 1.3 Identify the canonical partial-unique-index race in the schema (likely `claim_one_per_user_per_item` or equivalent on the claim/purchase row) and the corresponding cached DAL function with `cacheTag(...)` to use for the cache-invalidation PoC. Record file/line references in `db-under-test-comparison.md`.

## 2. DB-under-test comparison (the load-bearing decision)

- [x] 2.1 Evaluate **pglite**: install temporarily, attempt to point Drizzle at it (with the same schema as production), run a partial-unique-index claim race and an `ON CONFLICT` test. Record pass/fail and any divergence from Neon-HTTP behavior in `db-under-test-comparison.md`.
- [x] 2.2 Evaluate **testcontainers Postgres** (only if pglite shows fidelity issues OR speed of pglite is materially worse than baseline expectation): same checks. Record Docker-required cost and per-test latency. — **Not exercised:** pglite passed every fidelity check per design D7's escalation rule. Cost/benefit recorded in comparison doc.
- [x] 2.3 Evaluate **Neon branch per CI run** (only if both above fall short): document the branch-create / teardown loop and estimated CI cost. — **Not exercised:** pglite passed. Cost/benefit recorded.
- [x] 2.4 Record the recommendation in `db-under-test-comparison.md`, including a falsification log: which behaviors were checked, which passed, which failed.

## 3. PoC implementation

- [x] 3.1 PoC: cache-tag DAL test against the recommended substrate. Verify that a cached DAL read returns stale data BEFORE `revalidateTag` and fresh data AFTER. If this is impractical under the substrate (e.g., requires Next.js runtime), record the limitation in the comparison doc and propose an alternative (mock cache layer, run against `next dev`, etc.). — Limitation recorded; alternative (mock `next/cache` in vitest + E2E for end-to-end invalidation) recommended in comparison doc.
- [x] 3.2 PoC: partial-unique-index race test against the recommended substrate. Simulate two near-simultaneous claims on a `quantity_limit = 1` item; assert exactly one succeeds with the expected row state and the other fails with the expected error shape.
- [x] 3.3 PoC: confirm both tests execute via the chosen runner's CLI invocation (e.g., `npx vitest run spike/poc`). Record the exact invocation in `runner-and-ci-choices.md`. — `Test Files 2 passed (2) / Tests 5 passed (5)`.

## 4. Runner and CI provider choices

- [x] 4.1 Record runner choice in `runner-and-ci-choices.md`. Default is vitest; deviation requires evidence from steps 3.1–3.3.
- [x] 4.2 Record CI provider choice in `runner-and-ci-choices.md`. Default is GitHub Actions; deviation requires evidence.
- [x] 4.3 Sketch the four-gate CI workflow as YAML in `runner-and-ci-choices.md` (NOT committed to `.github/workflows/` — that is `test-foundation`'s job). Decide: one job with four steps, or four parallel jobs. Record rationale.

## 5. Seed-fixture negative-case audit

- [x] 5.1 Read `scripts/seed-dev-users.ts` and enumerate every entity it produces (users, lists, items, follows, visits, bookmarks, purchases).
- [x] 5.2 For `list-visibility`: classify the negative cases E2E will need — `dev-test-viewer` viewing a private list owned by another user; viewing an unlisted list when not the owner and not via direct link; viewing a public list. Mark each Present / Partial / Missing.
- [x] 5.3 For `following`: classify — mutual follow case, one-way follow case, no relationship case, attempted self-follow case. Mark.
- [x] 5.4 For `server-endpoint-authorization`: classify — unauthenticated caller, authenticated non-owner, authenticated owner, each against representative server actions (claim, edit list, delete list, follow). Mark.
- [x] 5.5 For `visit-history`: classify — visit recorded once vs visit on already-recently-visited list (dedupe window). Mark.
- [x] 5.6 Note explicitly whether the app has a blocking model. If yes, audit it. If no, record this as a finding (with no further action — blocking is not in scope for the spike).
- [x] 5.7 For each Partial or Missing case, write a disposition in `seed-negative-case-audit.md`: extend `seed-dev-users.ts` (preferred) OR parallel `seed-e2e-fixtures.ts` OR accept-with-rationale. Disposition rationale is one or two sentences per case.

## 6. Archive prep

- [x] 6.1 Revert any `package.json` / `package-lock.json` changes from the PoC: `git checkout <pre-spike-base> -- package.json package-lock.json` (or equivalent). Verify `git diff package.json package-lock.json` is empty. — `git diff --stat` reports no changes to either file.
- [x] 6.2 Verify PoC source remains only under `openspec/changes/test-foundation-spike/spike/poc/` — no production paths (`test/`, `e2e/`, `app/`, `lib/`) contain spike code.
- [x] 6.3 Verify all four deliverable docs exist and are non-empty: `db-under-test-comparison.md`, `runner-and-ci-choices.md`, `seed-negative-case-audit.md`, plus the PoC source under `spike/poc/`.
- [x] 6.4 Update the governing change `openspec/changes/test-coverage/tasks.md` — flip the `1.1` checkbox.

## 7. Pre-merge

- [x] 7.1 `npm run lint` passes with zero errors and zero warnings. — **Spike-introduced files: clean.** Two pre-existing diagnostics remain on HEAD unrelated to the spike: 1 error in `app/(main)/items/ui/components/PriceFilterPopover.tsx:78` (`react-hooks/set-state-in-effect`) and 1 warning in `app/(main)/users/ui/components/Avatar.tsx:35` (`@next/next/no-img-element`). Both exist on baseline commit `016b2dd` and are out of scope for this spike. Recorded for the next change to clean up.
- [x] 7.2 `npx tsc --noEmit` passes with zero errors.
- [x] 7.3 `npm run build` completes successfully.
