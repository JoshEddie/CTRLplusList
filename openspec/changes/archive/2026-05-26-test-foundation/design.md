## Context

The `testing-foundation` capability spec (live in `openspec/changes/test-coverage/specs/testing-foundation/spec.md`; extended in archived `2026-05-25-test-foundation-spike/specs/testing-foundation/spec.md`) is the normative contract this change implements. The spike already locked tooling: pglite 0.4.6 + vitest 4.1.7, GitHub Actions, four parallel CI jobs, three concrete seed extensions, an error-shape unwrap helper. The PoC code archived under the spike's `spike/poc/` is **explicitly off-limits** for migration — the testing-foundation spec requires `test-foundation` to rebuild equivalents from scratch in `test/helpers/`. So the design problem here is not "what" but "how to wire it into this repo's existing config surface" without breaking the three already-green pre-merge gates.

The repo today has zero test infrastructure: no `vitest.config.*`, no `playwright.config.*`, no `test/` or `e2e/` dirs, no `.github/` dir at all, and an `eslint.config.mjs` that's a 19-line flat-config wrapper around `eslint-config-next`. The first pass of CI for this branch will be the first CI run the repo has ever had.

## Goals / Non-Goals

**Goals:**

- Land the runner, the DB substrate, the helper triplet (`db.ts`, `sqlstate.ts`, `next-cache.ts`), the lint additions, the CI workflow, the seed extensions, and the config edits — in a single change.
- Preserve every existing pre-merge gate green (`lint`, `tsc --noEmit`, `build`) through the entire change. No intermediate state where any of the three are broken.
- Make sub-proposals 2.1 → 6.2 startable on archive. Nothing they need is supposed to be inferred or discovered.
- Make every choice mechanically auditable from the version numbers down to the helper file paths — sub-proposals MUST NOT have a "I made a different call locally" escape hatch on foundation choices.

**Non-Goals:**

- Write app-source tests. Helpers carry smoke tests that prove the helper works; no `lib/dal.ts` / `app/actions/*` / primitive-family tests land here.
- Promote `sonarjs/cognitive-complexity` to `error` anywhere — that's per-carve-out for sub-proposals; this change lands warn.
- Refactor `app/actions/items.ts` to use `sqlstateOf`. The helper is added; whether the production catch-site adopts it is left to either this change as a bundled trivial cleanup or to whichever sub-proposal first tests `markAsPurchased`. Default in this change: bundle it (one-line catch refactor; preserves Neon-HTTP behavior because `.code` is checked first).
- Decide the e2e fixture's DB strategy. Playwright runs against `next dev` with `AUTH_BYPASS=true` + the extended seed; that's the same shape the manual QA flow already uses. No separate e2e DB substrate.
- Introduce a custom ESLint rule for the tautology shortlist. See D7.

## Decisions

### D1. vitest config: one config file, two environments, forks pool

`vitest.config.ts` at repo root uses `environmentMatchGlobs` to assign `jsdom` to `**/*.test.tsx` and `node` to `**/*.test.ts`. Forks pool (`pool: 'forks'`) per the spike — pglite's WASM init does not survive worker-thread sharing across files, and per-file isolation is non-negotiable for DB integration tests.

Alternatives considered:

- **Two separate vitest projects** (one for jsdom, one for node) via `vitest.workspace.ts`: rejected. Adds config surface for negligible benefit; `environmentMatchGlobs` is the documented vitest idiom.
- **`pool: 'threads'` (default)**: rejected. pglite's WASM init is heavy enough to motivate per-file isolation, and threads share an event loop in a way that interacts badly with pglite's internal state.
- **A single `node` environment everywhere with `happy-dom`**: rejected. Testing Library's recommended pairing is jsdom; switching adds a fidelity risk for primitive-family tests.

Coverage config in the same file: provider `v8`, `reporter: ['text', 'json-summary', 'html']`, per-file thresholds via the `coverage.thresholds` `perFile: true` flag with class-specific values matching the spec's file-class table. The thresholds object is keyed by glob; each sub-proposal's archive task can edit it to enforce its carve-out. This change lands the table with placeholder globs (e.g. `'lib/visibility.ts'` mapped to 95) for the files sub-proposals 2.1, 3.x, 4.x will touch, but sets `lines: 0` / `functions: 0` / `branches: 0` / `statements: 0` for everything except the helper smoke tests — sub-proposals raise their own globs when they archive.

### D2. Helper file layout: three files, no premature abstraction

Three helpers, each in its own file under `test/helpers/`:

- `db.ts` exports `bootPglite(): Promise<{ db: NeonDbAdapter; raw: PGlite }>`. Reads every `drizzle/*.sql` file in journal order (parsing `drizzle/meta/_journal.json` for source of truth), splits each on `--> statement-breakpoint`, applies them sequentially. Returns a drizzle client wired with the production `schema` import and `casing: 'snake_case'`.
- `sqlstate.ts` exports `sqlstateOf(err: unknown): string | undefined`. Reads `.code` first (Neon-HTTP behavior), falls back to `.cause.code` (pglite behavior). Single-purpose; nine lines including types.
- `next-cache.ts` exports `mockNextCache(): void` — a thin wrapper around `vi.mock('next/cache', ...)` that returns the factory the spike documented: `cacheTag` no-op, `unstable_cache: (fn) => fn`, `revalidateTag` spy, `revalidatePath` spy. The wrapper exists so sub-proposals call one function instead of pasting the factory.

Alternatives considered:

- **Single `test/helpers/index.ts` barrel**: rejected. Barrels obscure import paths from `*.test.ts` files; explicit `import { bootPglite } from '../../test/helpers/db'` is the right level of clarity.
- **Co-locate helpers next to first consumer**: rejected. The testing-foundation spec mandates `test/helpers/` as the location; sub-proposals MUST import from there. Co-location would invite duplication.
- **Inline the pglite boot logic in every test file**: rejected. ~40 lines of migration replay would be copy-pasted across every integration test.

### D3. CI workflow: four parallel jobs, GitHub Actions, Node 20

Land `.github/workflows/ci.yml` verbatim to the spike's sketch with two adjustments:

- Add `permissions: contents: read` at the workflow level (GitHub's minimum-privilege guidance for non-write workflows).
- Use `actions/checkout@v4`, `actions/setup-node@v4`. Pin Node version to `20` (matches the existing Vercel runtime per repo's deployment env).
- `npm ci`, not `npm install`, in every job (deterministic from lockfile).
- The `build` job sets `DATABASE_URL=postgres://placeholder:placeholder@localhost:5432/placeholder` as the spike sketch requires — `next build` doesn't query the DB but does require the env var to be set.
- The `test` job invokes `npm test -- --coverage` so coverage emits in CI; thresholds are gated by the vitest config itself.

Alternatives considered:

- **Single job, four steps**: rejected per the spike's wall-clock argument. Reversible if billing becomes a concern.
- **Pin Node 22**: rejected — Vercel deployment runs Node 20 per repo config; CI parity with production wins over latest-LTS.
- **Use the build job's `DATABASE_URL` as a real Neon connection**: rejected. `next build` doesn't need a live DB; placeholder is faster and avoids leaking secrets through Action env.

### D4. ESLint plugin integration: sonarjs at warn, vitest at error, no custom rules

`eslint.config.mjs` grows from 19 lines to roughly 60. Three additions:

1. `eslint-plugin-sonarjs` registered; `sonarjs/cognitive-complexity` set to `['warn', 15]` globally. Other sonarjs rules left at their plugin defaults (sonarjs ships with ~60 rules; opting into all of them at this stage would be a giant cleanup). The spec only requires `cognitive-complexity` — other rules are out of scope.
2. `eslint-plugin-vitest` registered with a scoped block targeting `**/*.test.{ts,tsx}`: `vitest/expect-expect: 'error'`, `vitest/valid-expect: 'error'`, `vitest/no-standalone-expect: 'error'`.
3. The tautology shortlist (`.length` against 0 with `toBeGreaterThanOrEqual`, lone `toBeDefined()` / `toBeTruthy()`) is NOT implemented as a custom rule in this change. See D7.

Alternatives considered:

- **`eslint-plugin-vitest` rules at `warn` and promote later**: rejected. The testing-foundation spec explicitly says "no warn-then-promote ramp" for these rules — the repo has zero tests, so nothing needs grandfathering. They land at error.
- **Enable all `sonarjs` rules**: rejected. Premature cleanup load; the spec only requires `cognitive-complexity`.
- **Use `eslint-plugin-jest` instead**: rejected. Runner is vitest; the dedicated plugin maps 1:1 to vitest semantics.

### D5. Seed extensions: three new entities, header comment, no parallel fixture

Three seed extensions per the spike's audit, applied via in-place edit to `scripts/seed-dev-users.ts`:

1. A new entry in the friend-list templates: friend `dave` (existing not-followed-by-viewer friend) gets a `VISIBILITY.OWNER` list. Title `"Dave's private wishlist"` or similar — title content is non-load-bearing.
2. Another entry: friend `jack` (existing not-followed-by-viewer friend) gets a `VISIBILITY.LINK` list.
3. A new friend `kim` added to the `FRIENDS` array, owning one `VISIBILITY.FOLLOWERS` list. Kim has no `list_visits` row (the visit-seeding loop already iterates only over previously-visited friend lists, so excluding kim from the visit list is the default).

Header comment at the top of `scripts/seed-dev-users.ts`:

```ts
/**
 * Seed-as-fixture (testing-foundation capability).
 *
 * This file is the canonical E2E fixture. E2E specs assert against the
 * entities created here (users, lists, items, visits, follows). Any edit
 * that adds, removes, or changes the identity/visibility of a seeded entity
 * is a breaking change to the E2E suite — accompany it with a review of
 * the e2e/ specs that touch the affected entities, in the same change.
 *
 * Reset:  npm run db:reset:dev
 * Apply:  npm run db:seed:dev
 */
```

Alternatives considered:

- **Parallel `seed-e2e-fixtures.ts`**: rejected by the spike's audit. Three rows of additional data don't pollute dev UX enough to justify dual-maintenance.
- **Hand-write SQL inserts in test/fixtures/**: rejected. The seed script is already the source of truth for dev + E2E; forking would diverge.

### D6. `openspec/config.yaml` tasks rule extension

Modify the existing `tasks:` rule block. Current wording requires three gates; extend to four. The existing text reads:

```
…explicit, separately-checkable tasks for ALL THREE of the following gates…
- `npm run lint` (eslint — zero errors, zero warnings)
- `npx tsc --noEmit` (typescript — zero errors)
- `npm run build` (next build — completes successfully, including type-check and production bundle)
```

Replace "ALL THREE" with "ALL FOUR", insert the test gate, leave the closing paragraph (about each gate getting its own checkbox so partial failure is visible) intact. Exact diff written in tasks.md step 13.

This change's own `tasks.md` is grandfathered per the testing-foundation spec (it predates the rule edit), but for clarity it WILL still include the four-gate section — it's the first change to use the new shape, and it has the new gate available since vitest is being installed in step 1.

### D7. Tautology shortlist enforcement: lint+audit duo, no custom ESLint rule

The testing-foundation spec demands "a project-specific rule configuration SHALL additionally flag the tautology shortlist" — `.length >= 0`, lone `toBeDefined()` / `toBeTruthy()`, etc. The literal reading would be a custom ESLint rule.

This change defers the custom rule. Rationale:

- The `vitest/expect-expect` + `vitest/valid-expect` + `vitest/no-standalone-expect` trio catches the most damaging case (test with no `expect` at all).
- The Assertion Audit (testing-foundation requirement 7) is the spec's explicit second layer for substance failures the rules miss — including the tautology shortlist.
- A custom ESLint rule for "`x.length >= 0` is tautological" requires AST work that is brittle (false positives on legitimate range checks where 0 is a meaningful lower bound) and adds maintenance debt.

Trade-off: there's no mechanical floor on the tautology patterns until a sub-proposal authors them and the audit catches them. Acceptable because the audit is mandatory and the testing-foundation spec records its own scenarios as the contract — a sub-proposal that ships tautologies fails the assertion audit, not the lint gate.

This is a deviation from one literal reading of the spec. It is recorded here so a future reader sees the rationale. If the audit ever fails to catch a tautology that ships, the disposition is to author the custom rule as a separate sub-proposal (deferred-as-sibling per the audit deferral rule).

Alternatives considered:

- **Author the custom rule now**: rejected for brittleness and maintenance load. Reversible if the audit proves insufficient.
- **Use `eslint-plugin-jest-extended` (which has some tautology rules)**: rejected. Wrong runner family; rules don't map cleanly to vitest matchers.

### D8. Smoke-test policy: helpers carry tests; no app source tested here

Each helper file gets a colocated `*.test.ts` proving the helper works:

- `test/helpers/db.test.ts`: `bootPglite()` returns a usable drizzle client; an insert + select round-trips; a partial-unique-index violation produces `sqlstateOf(err) === '23505'`. This is the load-bearing one — if pglite or the migration replay ever breaks, every downstream sub-proposal stalls.
- `test/helpers/sqlstate.test.ts`: covers the `.code` path, the `.cause.code` path, and the `undefined` fallthrough. Six lines of test, four `expect` calls.
- `test/helpers/next-cache.test.ts`: covers that `mockNextCache()` makes `revalidateTag` a `vi.fn()` with `.mock.calls` accessible; that `cacheTag` is callable without effect.

These are the only tests this change writes. No `lib/` test, no `app/` test, no E2E. Sub-proposals 2.1+ take it from there.

Rationale for testing helpers: without them, sub-proposal 2.1 is the first thing to discover a foundation bug, and the failure mode (red test in 2.1 that is actually a helper bug) is harder to diagnose than a red test in `test/helpers/db.test.ts`.

### D9. Bundle-or-defer the `markAsPurchased` catch-site refactor

The spike's PoC discovered that `(err as { code?: string })?.code` is read at `app/actions/items.ts:238`. Under Neon-HTTP it works; under pglite it returns undefined. The fix is one line: `sqlstateOf(insertError) === '23505'` instead of `(insertError as ...)?.code === '23505'`.

This change **bundles** the refactor:

- It's one line in `app/actions/items.ts`.
- `sqlstateOf` preserves the existing Neon-HTTP behavior because it reads `.code` first.
- Production behavior is unchanged; the catch-site becomes substrate-agnostic.
- Defers nothing — sub-proposal 4.9 (`test-list-item-management`) gets the action ready-to-test instead of having to refactor before testing.

Alternative considered: defer to 4.9. Rejected; one-line, zero risk, removes a known stumble.

### D10. Helper-test coverage: out-of-band, not under per-file thresholds

The three helper test files exercise the helpers; the helpers themselves are 100% covered by them. The vitest coverage config excludes `test/helpers/**` from per-file threshold enforcement (informational-only per the spec's exclusion list — "test files themselves" reads to include their direct helper colocation).

Rationale: helper test coverage is a proxy, not a gate. The downstream check is "does sub-proposal 2.1's first PoC use of `bootPglite()` work" — if it does, the helpers are validated end-to-end; if it doesn't, the helper smoke tests will have caught it first.

## Risks / Trade-offs

[**pglite migration replay diverges from production over time as new migrations land**] → The helper reads the journal at boot, not a hardcoded list. Every new migration is automatically picked up; the only failure mode is a migration written in syntax pglite doesn't support. Mitigation: the helper smoke test fails loudly with the offending SQL line; the disposition is to either rewrite the migration in pglite-compatible syntax OR escalate to testcontainers per the spike's fallback path.

[**The 60 sonarjs warnings the first lint run produces will be ignored**] → Accepted. Warnings don't gate; per-file promotion is each sub-proposal's job. The risk is that the warning count grows; the mitigation is the closing 7.2 task in `test-coverage` (promote to error globally once all sub-proposals archive).

[**CI runner minutes consumed by four parallel jobs all running `npm ci`**] → Each job uses `actions/setup-node@v4`'s built-in npm cache, restored in ~3 s. Worst-case total npm-ci cost across four jobs is ~12 s; well inside the budget. Reversible to one-job/four-steps if it ever matters.

[**Playwright install adds ~250 MB of browser binaries to CI cold runs**] → Playwright caching via `actions/cache` is the standard mitigation but is out of scope for this change. The CI workflow for the `test` job installs Playwright lazily — its browsers are NOT installed in `npm ci`; they only download when `test:e2e` runs. Since this change lands no e2e specs, `test:e2e` is never invoked in CI yet. Sub-proposal 6.1 adds the Playwright cache step when it lands the first e2e spec.

[**The seed extension adds three database rows visible in local dev UX**] → Accepted per the spike's audit. Adding `kim` to the Following surface is the only visible change; the two new private/unlisted friend lists are invisible to the viewer by definition.

[**`vitest@4.x` is recent; ecosystem coverage may have rough edges**] → The spike's PoC validated the exact version against the exact stack (pglite, drizzle, RTL is NOT yet exercised). If RTL+vitest@4 turns out to need a downgrade, sub-proposal 3.1 (first primitive-family test) is where it surfaces; the disposition is to pin a vitest version both compatible with RTL and validated by the spike's pglite checks — likely `vitest@3.x` if 4 is too bleeding-edge.

[**The spec says "test files SHALL colocate with source"; helper tests live under `test/helpers/`**] → Helpers ARE the source of their own tests, and they live in `test/helpers/`; the colocation rule is satisfied (`db.ts` ↔ `db.test.ts` next to each other). Not a violation.

[**ESLint flat-config + new plugins can break `eslint-config-next` ordering**] → Mitigated by running `npm run lint` after each plugin addition during implementation (per the four-gate-stays-green goal). Sonarjs and vitest plugins ship flat-config exports as of recent versions; the order is `[...next, sonarjs, vitest-scoped, custom]`.

## Migration Plan

This change has no runtime migration. The implementation order in `tasks.md` is the migration order:

1. Install dependencies and freeze `package.json` / `package-lock.json` — green `npm ci` proves the deps resolve.
2. Land helpers + smoke tests — `npm test` (newly added) passes.
3. Land vitest + playwright config — `npm test` and `npx playwright --version` both succeed; `test:e2e` runs `0 tests`, exit 0.
4. Land seed extensions + header — `npm run db:reset:dev` succeeds; no E2E specs depend on it yet.
5. Land eslint additions — `npm run lint` stays green (warnings allowed for sonarjs; vitest rules only apply to `*.test.*` which all pass).
6. Land CI workflow — first push to branch triggers the four-gate run; all four green.
7. Land `openspec/config.yaml` tasks-rule edit — no runtime effect.
8. Land catch-site refactor in `app/actions/items.ts` — `tsc --noEmit` + `build` stay green.

If any step breaks a gate, revert that step's commit and address before continuing. No partial states ship.

## Open Questions

- **Should `eslint-plugin-testing-library` also land in this change?** Inclined yes — it catches anti-patterns in RTL queries before sub-proposal 3.1 writes them. Default decision: bundle it at the same set of severities sub-proposal 3.1 will need (recommended rules at `error` scoped to `*.test.tsx`). Sub-proposals can soften specific rules if needed via override comments. Recording as "bundled" for tasks.md step 5; if it turns out to fight with `eslint-config-next`'s test-file rules, fall back to deferring it.
- **Does `next-cache.ts` need a `revalidatePath` spy in addition to `revalidateTag`?** Grep `revalidatePath` across `app/actions/`. If any action uses it, yes. If none do, defer to whichever sub-proposal first needs it. Resolution to perform during implementation, not now.
