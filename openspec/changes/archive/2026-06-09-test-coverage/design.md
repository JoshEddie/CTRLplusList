## Context

The codebase has 194 TS/TSX files in `app/`, ~5 in `lib/`, ~20 active capability specs, and zero automated tests. The pre-merge gate trio (`lint` / `tsc --noEmit` / `build`) encoded in `openspec/config.yaml` `tasks` is the only existing quality bar; manual verification via `AUTH_BYPASS=true` + `npm run db:seed:dev` covers the rest. The seed produces `dev-test-viewer` plus four friends with mutual + one-way follows, public lists with items, visit history, and bookmarks — purpose-built for visual QA. Its negative-case coverage (private lists owned by other users that the viewer SHOULD NOT see, etc.) is unverified.

The stack constrains the test design more than the volume does. Three constraints dominate:

1. **`drizzle-orm/neon-http` has no transactions** (`CLAUDE.md`). Cross-statement atomicity is backstopped only by DB-layer constraints (partial unique indexes, `ON CONFLICT`). The race-condition classes this creates — overclaim under `quantity_limit`, follow-toggle dupes, visit-history dupes — are the highest-stakes uncovered surface.
2. **DAL reads use `'use cache'` + `cacheTag(...)`** (`CLAUDE.md`). Mutations must `revalidateTag` or reads silently go stale. There is no current test of cache-tag correctness; the failure mode is invisible to type-checking and to most manual QA.
3. **RSC + Server Actions can't fully run in jsdom.** Server components render at request time on the server; server actions execute server-side. RTL+jsdom covers the client surface; the server surface needs either an HTTP-level integration harness or coverage by E2E.

This change does **not** make implementation decisions for every sub-proposal — those are the sub-proposals' work. It makes the decisions that every sub-proposal inherits.

## Goals / Non-Goals

**Goals:**

- Establish a `testing-foundation` capability spec with normative SHALLs for runner, layout, mocking, fixtures, coverage, complexity, and pre-merge gate.
- Establish the typology of sub-proposals (`test-foundation-spike`, `test-foundation`, `test-<carve-out>`), sized for one-conversation completion rather than for team parallelism or "complete units of work."
- Establish the audit obligation: every test sub-proposal performs duplication / complexity / testability audits on its carve-out and disposes of every finding (fix-in-place is the default; deferral as a sibling sub-proposal is the only acceptable alternative).
- Establish the per-file (not per-layer-aggregate) coverage floor regime so small helpers cannot hide behind fat files.
- Enumerate the sub-proposals planned, with rationale for the cut.
- Extend `openspec/config.yaml`'s `tasks` rule to a quartet: `lint` / `tsc --noEmit` / `build` / `test`.

**Non-Goals:**

- Write any test code. (Each sub-proposal does this.)
- Decide the DB-under-test technology. (Deferred to `test-foundation-spike`.)
- Decide CI provider, only that CI must exist before `test-foundation` archives. (Deferred to `test-foundation-spike`.)
- Modify any existing capability spec. (Sub-proposals do this as they discover latent invariants worth elevating.)
- Promote the cognitive-complexity threshold to `error` globally. (Per-file, as each sub-proposal cleans its carve-out — sequencing option (c) from explore.)
- Fix the no-transactions architectural constraint. The `neon-http` driver stays per `CLAUDE.md`; tests must accommodate it.

## Decisions

### D1. Slicing strategy: hybrid by work-unit type

Sub-proposals split along four work-unit types, not uniformly along layer (`A`) or capability (`B`) or risk (`C`). The hybrid matches how the codebase is organized: primitive families share a uniform test recipe, capabilities have uneven shapes that demand per-capability thinking, and a few categories (foundation, pure libs, E2E) don't fit either mold.

Sub-proposal types:

1. **Foundation** (one spike + one implementation): chooses tooling and lands it. Enumerated in `tasks.md`.
2. **Pure-libs** (one proposal): `lib/{visibility,listAccess,types}.ts`, app-wide hooks (`hooks/use-media-query.ts`), and pure helpers extracted from primitives (e.g., `buttonClasses.ts`).
3. **Primitive-family** (~7–8 proposals): one per directory under `app/ui/components/<family>/`. Component-scoped hooks (e.g., `useKeyboardOffset`, `usePopoverDismiss`) ride with their owning family.
4. **Capability-flow** (~8–10 proposals): one per high-stakes capability spec. Covers DAL + server action + page UI for that capability as one slice. This is the bug-prone surface.
5. **E2E** (1–2 proposals): Playwright suite against `AUTH_BYPASS=true` + seeded DB. Critical user flows + PWA/offline.

**Alternatives considered:**

- Pure by-layer (A): rejected because it spreads a user flow across multiple proposals — "test the claim flow" would span DAL + action + page UI + E2E.
- Pure by-capability (B): rejected because pure libs and shared test infra have no capability home, and primitive families want a uniform recipe that doesn't repeat itself across 7 capability docs.
- Pure by-risk-band (C): rejected because it's not enumerable up-front and produces priority arguments instead of slices.

### D2. Sub-proposal sizing: optimize for conversation context, not "complete units of work"

A sub-proposal is sized to fit comfortably in one conversation. Capability-flows that balloon (likely `list-item-management`, possibly `list-visibility`) MAY split mid-flight into `test-<capability>-part-1`, `-part-2` without re-litigating this governing change. Primitive-family proposals are uniform enough that they should not split.

**Rationale:** the work is being done by a single conversation, not parallelized across a team. Even-sizing the slices is a non-goal; un-blowing-the-context is the goal.

### D3. Per-file coverage floors, sub-proposal owns only its carve-out

Coverage floors apply per file, not per layer aggregate. Each sub-proposal validates only files in its carve-out at archive time.

| File class                              | Floor |
| --------------------------------------- | ----- |
| Pure logic (`lib/*.ts`, `*Classes.ts`)  | 95%   |
| Primitive components (under `app/ui/components/<family>/`) | 90%   |
| DAL functions (`lib/dal.ts` per fn)     | 80%   |
| Server actions (`app/actions/*.ts`)     | 80%   |
| API routes (`app/api/**/route.ts`)      | 80%   |
| Page-scoped UI (`app/(main)/**/ui/`)    | 60%   |
| Page entries (`app/(main)/**/page.tsx`) | 60%   |

**Excluded from coverage** (informational only, not gated):

- `*.d.ts`, generated drizzle artifacts under `drizzle/`
- `app/sw.ts` (PWA service worker — E2E covers this)
- `app/manifest.ts` (static metadata)
- Test files themselves (`*.test.*`, `test/fixtures/*`, `test/helpers/*`)
- Layout-only files with no behavior (`app/layout.tsx`, `app/(main)/layout.tsx`) UNLESS they contain branching logic

**Alternatives considered:** layer-aggregate floors (rejected — small helpers can hide); single global floor (rejected — wildly different fairness across file classes); no floor (rejected — defeats the "didn't forget to test it" purpose owner accepted).

### D4. Audit obligation with strict deferral rule

Every test sub-proposal performs four audits before its coverage-validation task. Source-audit findings (1–3) get one of two dispositions; assertion-audit findings (4) are always fixed in-place since they concern the sub-proposal's own newly-written tests.

- **Fix in-place** (default). The new tests prove behavior preservation.
- **Defer as a new sub-proposal** (audits 1–3 only) — ONLY if the finding is large enough to warrant its own `tasks.md` entry in this governing change. Adding a follow-up issue or TODO is NOT an acceptable disposition. Either fix it here or open a sibling sub-proposal.

The four audits:

1. **Duplication audit** (carve-out source) — duplicated logic, duplicated test setup, duplicated fixtures within or near the carve-out.
2. **Complexity audit** (carve-out source) — functions in the carve-out exceeding cognitive complexity 15.
3. **Testability audit** (carve-out source) — code that resisted testing (wide mocking surface, unreachable branches, side-effect entanglement).
4. **Assertion audit** (new test files) — every new test reviewed against the test-substance rule (see D4b). Catches substance failures the lint rules miss: assertions on irrelevant properties, assertions on values mocks just returned, tests that miss the actual contract.

**Rationale:** "open a follow-up issue" is the standard escape valve that lets quality debt accumulate. The strict rule — "either fix it or grow the governing tasks.md" — makes deferral visible and accountable. Audit 4 was added because coverage rewards execution regardless of assertion quality; without a substance gate a contributor (human or agent) can green every coverage floor with execute-for-coverage tests.

### D4b. Test-substance bar enforced by lint AND audit

Tests SHALL assert observable behavior — return value, rendered output, thrown error, network call shape, or persisted state change. Tautological assertions (`expect(arr.length).toBeGreaterThanOrEqual(0)`, `expect(x).toBeDefined()` as the lone assertion on a value the test built, `expect(true).toBe(true)`) and execute-for-coverage calls (no `expect` at all) are forbidden.

Two-layer enforcement:

- **Lint (mechanical, fast).** `vitest/expect-expect` + `vitest/valid-expect` + `vitest/no-standalone-expect` catch the "no assertion" case. A project-specific rule configuration catches the tautology shortlist. Lands at severity `error` in `test-foundation` (no warn-then-promote — no pre-existing tests need grandfathering).
- **Assertion audit (judgment, per sub-proposal).** Catches the substance failures the rules can't: asserting on the wrong property, asserting on a value a mock just returned, snapshot-only tests against machine-generated snapshots.

**Rationale:** lint is the floor, not the ceiling. A reviewer is still needed to catch "this test passes for the wrong reason" — the audit task is where that review is recorded.

### D5. Complexity gate: sonarjs cognitive-complexity, threshold 15, per-file promotion

`eslint-plugin-sonarjs` ships in `test-foundation`. `sonarjs/cognitive-complexity` lands at threshold 15, severity `warn`. Each sub-proposal promotes the rule to `error` for its carve-out's files via `overrides` in `eslint.config.mjs` when it archives.

**Why cognitive over cyclomatic:** cognitive complexity tracks "how hard is this to hold in your head" — exactly what predicts test-writing pain. Cyclomatic over-penalizes simple `switch`/`else if` chains and under-penalizes nested closures.

**Escape hatch:** per-line `// eslint-disable-next-line sonarjs/cognitive-complexity -- <reason>` is allowed but the reason and a linked sibling sub-proposal (if any) MUST appear in the comment. Bare disables are a lint error.

**Alternatives considered:** global promote-to-error all at once (rejected — front-loads a giant cleanup); never promote (rejected — defeats the gate); per-layer promotion (rejected — too coarse).

### D6. DB-under-test choice deferred to spike

The three real options — pglite (in-process Postgres), testcontainers (docker Postgres), Neon branch per CI run — have radically different cost/fidelity/speed profiles. The wrong choice cascades into every capability-flow proposal. The first sub-proposal under foundation is `test-foundation-spike` whose deliverable is:

- A 1-page comparison: speed, fidelity to Neon-HTTP behavior, CI cost, local-dev ergonomics.
- A working PoC against ONE DAL function and ONE server action that demonstrates the chosen approach.
- A recommendation locked into `test-foundation`'s spec delta.

Working hypothesis: **pglite** is the likely answer (no Docker dependency, fast, runs in CI without infra), but the partial-unique-index behavior and `ON CONFLICT` semantics MUST be verified against the actual Neon driver behavior before commitment.

### D7. Seed-as-fixture with negative-case audit

`scripts/seed-dev-users.ts` is adopted as the canonical E2E fixture. The spike's deliverable includes an audit of negative-case coverage: does the seed include lists owned by other users that `dev-test-viewer` SHOULD NOT see (private to other owner; unlisted owned-elsewhere)? Does the visibility / authorization layer have other classes of negative case the seed doesn't reach?

Disposition options:

- Extend `seed-dev-users.ts` with the missing negative cases (preferred — single source of truth).
- Add a parallel `scripts/seed-e2e-fixtures.ts` for E2E-only negative cases that we don't want in dev (rare — only if including them would pollute dev UX).

Once adopted, the seed is **versioned as a fixture** — changes to it become breaking changes for any E2E suite that asserts against it. This MUST be called out in `seed-dev-users.ts` header comments after `test-foundation` archives.

### D8. Mocking at external boundaries only

The `testing-foundation` spec encodes one global rule: **tests SHALL NOT call rate-limited external services**. The known offenders today:

- `app/api/image-search` upstream provider (the route's note in `CLAUDE.md`: 30/min token bucket; upstream has stricter real quota).
- NextAuth Google OAuth (no real Google sign-ins from tests).

These are mocked at the network boundary (fetch / next/auth provider seam). Internal modules (DAL, server actions, lib/) are NOT mocked when their dependencies are local — integration tests hit the real (test) DB.

**Rationale:** mocks-of-our-own-code is the testing antipattern that ships green tests and broken prod. Mocks-of-external-services is the testing pattern that lets us run in CI without burning quota.

### D9. Refactor authority within carve-out

Test sub-proposals may refactor code in their carve-out as needed for testability. The new tests prove behavior preservation. Refactors that exceed the carve-out (cross-file, architectural) become a new sibling sub-proposal listed in this change's `tasks.md` — per the D4 deferral rule.

**Tension:** this could turn a "test the button" sub-proposal into "refactor button.tsx then test it." That's acceptable. The sub-proposal title MAY be renamed to `test-and-refactor-button-system` if scope grows substantially; the carve-out stays the same.

### D10. Sub-proposal spec authority

A sub-proposal MUST add a SHALL to its target capability spec when the test enforces an invariant that:

(a) is non-obvious from the component name or function signature, AND
(b) would survive a reasonable reimplementation, AND
(c) protects against a real failure mode (privacy leak, data loss, accessibility regression, contract break for callers).

Trivial assertions ("renders the right tag," "passes `className` through") are tested but not specced. The audit task in the sub-proposal's `tasks.md` records which invariants were elevated and which were not, with one-line rationale for each non-elevation.

**Rationale:** the spec is a contract, not a transcript of the implementation. Bloating it with every assertion makes it useless. Refusing to elevate makes the test the only record of the contract — defeats spec-driven dev.

### D11. Pre-merge gate extension

`openspec/config.yaml` `tasks` rule is extended to require a fourth task: `npm test`. `test-foundation` lands this edit. Every `tasks.md` written after `test-foundation` archives MUST include the four-gate pre-merge section. `tasks.md` written before that point are grandfathered.

### D12. Sub-proposal lifecycle and tracking

Each sub-proposal is its own OpenSpec change with `proposal.md`, `design.md` (if non-trivial), `tasks.md`, and any spec deltas. This change's `tasks.md` lists each sub-proposal as a checkbox; checked when the sub-proposal archives. This change archives when all sub-proposals archive.

Sub-proposals are NOT scaffolded by this change — each is created by `/opsx:propose <name>` at the time it's started, in the order chosen by the operator. Sequencing constraints:

- `test-foundation-spike` MUST archive before `test-foundation`.
- `test-foundation` MUST archive before any other sub-proposal.
- All other sub-proposals are independent and MAY be executed in any order, including concurrent drafts.

### D13. Testing-foundation rollup: two-tier (foundation rules accumulate in parent; carve-out bookkeeping stays in archive)

**Rollout-period convention, not a global OpenSpec rule.** The standard `openspec/config.yaml` `context:` rule — *"archived changes' requirements were rolled into the active spec at archive time"* — applies to ordinary standalone changes. This governing change has many sub-proposals contributing `testing-foundation` deltas of two different kinds, and the standard rule produces noise if applied uniformly. The two-tier convention below scopes the rollup behavior to this initiative only.

Sub-proposals contribute `testing-foundation` deltas in one of two shapes:

**Tier 1 — Foundation rules** (the universal contract every test sub-proposal inherits): e.g., `__tests__/` colocation, universal `COVERAGE_FLOOR`, no-backdoor disposition rule, `<State>_<Behavior>` `it()` shape, three-role `describe()` convention, four-audit obligation, assertion-substance bar, complexity gate.

- Land in `openspec/changes/test-coverage/specs/testing-foundation/spec.md` (the parent's accumulator delta).
- Examples that took this path: `test-foundation-spike`, `test-foundation`, `test-housekeeping`.
- These DO roll into the active `openspec/specs/testing-foundation/spec.md` — but ONLY when this governing change archives, NOT at each sub-proposal's archive. Until then, the parent's accumulator IS the authoritative source for cross-cutting test conventions.

**Tier 2 — Carve-out bookkeeping** (a record that one specific carve-out completed): e.g., "the chip-system primitive carve-out has landed at `COVERAGE_FLOOR`," "the button-system primitive carve-out has landed at `COVERAGE_FLOOR`," etc.

- Live ONLY in the sub-proposal's own archive directory: `openspec/changes/archive/<sub-proposal>/specs/testing-foundation/spec.md`.
- Examples that took this path: `test-pure-libs`, `test-button-system`, `test-chip-system`.
- SHALL NOT be added to `openspec/changes/test-coverage/specs/testing-foundation/spec.md` (no churn in the parent's accumulator every time a sub-proposal lands).
- SHALL NOT create or modify `openspec/specs/testing-foundation/spec.md` directly (no premature creation of the active spec from a single sub-proposal's slice).

**Why the split.** A "we tested chip" record is meaningful only while this initiative is in flight. After the active spec lands with the universal rules, the carve-out being complete is implied by the rules (universal `COVERAGE_FLOOR` applies everywhere; per-file thresholds in `vitest.config.ts` are the load-bearing artifact). Putting carve-out bookkeeping in the active spec would create permanent noise. Putting it in the parent's accumulator would churn the accumulator every sub-proposal for no downstream gain. The archive-only home for Tier 2 is correct; it preserves the audit trail without polluting either downstream.

**Sub-proposal author checklist before archive:**

1. Identify whether your `testing-foundation` delta is Tier 1 (a foundation rule amendment) or Tier 2 (carve-out bookkeeping).
2. Tier 1 → update `openspec/changes/test-coverage/specs/testing-foundation/spec.md`. Do NOT create or modify `openspec/specs/testing-foundation/spec.md`.
3. Tier 2 → keep the delta in your sub-proposal's archive directory only. Do NOT update the parent's accumulator. Do NOT create or modify `openspec/specs/testing-foundation/spec.md`.
4. Document in your sub-proposal's `proposal.md` and `tasks.md` which tier the delta belongs to, citing this D13.

**Tier 1 vs Tier 2 quick test:** if every future sub-proposal inherits the SHALL by virtue of this change archiving, it's Tier 1. If the SHALL is a record of which carve-out ran (and is informationally redundant once the carve-out completes and the universal floor is in force), it's Tier 2.

**One-shot recovery.** If a sub-proposal accidentally creates `openspec/specs/testing-foundation/spec.md` with only its own delta (as `test-chip-system` initially did), the active spec lands as a stub representing one carve-out — misleading to anyone reading. Recovery: delete the active spec file in a follow-up edit; revert the sub-proposal to Tier 2 archive-only. Discovered in `test-chip-system`'s code review; the active spec creation was reverted before merge.

## Risks / Trade-offs

[Spec creep: every test reveals an invariant, every invariant becomes a SHALL, specs balloon] → D10's three-part rule (non-obvious, survives reimplementation, protects against real failure mode) keeps trivia out. Each sub-proposal documents non-elevation decisions.

[Foundation becomes a bottleneck — nothing else can start until it archives] → Accepted. Pure-libs sub-proposal MAY be drafted in parallel since it needs only the runner choice, not the DB-under-test choice; this is permitted but not required.

[Coverage gates create busywork on files that don't deserve attention] → D3 exclusion list (`*.d.ts`, layout-only, sw.ts, manifest.ts) carves out the obvious non-targets. Per-sub-proposal carve-out scoping means a sub-proposal that finds a hard-to-cover file has refactor authority (D9) or deferral authority (D4) to deal with it; it can't just be silently ignored.

[pglite divergence from Neon-HTTP behavior on partial unique indexes / `ON CONFLICT`] → The spike's PoC explicitly tests a partial-unique-index race (the claim+quantity_limit case is the canonical one). If pglite diverges, spike reports it and recommends an alternative.

[Complexity threshold of 15 is arbitrary and will fight us on some legitimately-complex functions] → D5 escape hatch (per-line disable with reason and optional sibling proposal). Threshold can be revised by a future amendment to the `testing-foundation` spec.

[E2E suite asserting against a versioned seed creates a brittle coupling where seed changes break tests] → D7 commitment: the seed becomes versioned-as-fixture with header comments. Seed changes are reviewed as test-suite changes from `test-foundation` onward. The alternative (parallel `seed-e2e-fixtures.ts`) is permitted when negative cases would pollute dev UX.

[Refactor-in-place authority lets a sub-proposal grow indefinitely as it pulls on threads] → D9 + D4: cross-file or architectural refactors are deferred to sibling sub-proposals. A sub-proposal that finds itself refactoring beyond a single file MUST spin out the refactor.

[Image-search rate limit burn from E2E] → D8 boundary-mocking rule. The `test-image-search-api` sub-proposal mocks the upstream provider; the route's own auth + token-bucket logic is tested against the mock. Real upstream is never hit.

[CI doesn't exist yet — `test-foundation` is also a CI-setup change, expanding its scope] → Accepted. The spike calls the CI provider; foundation lands `.github/workflows/` (or equivalent). Foundation's scope explicitly includes "CI runner exists and runs the four pre-merge gates."

[Sequencing option (c) means coverage looks lumpy mid-journey — primitive families green, capabilities red] → Accepted. D2 ("not optimizing for evenness") and D3 (per-file, not aggregate) make this not a problem in practice: each sub-proposal proves its own carve-out is clean, the global picture is informational until the last sub-proposal archives.
