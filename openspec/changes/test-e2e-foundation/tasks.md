## 1. DB driver-switch + production guardrail

- [x] 1.1 Add `postgres` (postgres-js) to `dependencies` in `package.json`. _(already present: `postgres` ^3.4.5)_
- [x] 1.2 `db/index.ts`: when `USE_PG_DRIVER === '1'`, instantiate `drizzle-orm/postgres-js` against `DATABASE_URL`; otherwise keep the `neon-http` driver unchanged. Keep the exported `db` typed as `NeonHttpDatabase<typeof schema>` (type-only cross-driver cast) so transaction APIs do not typecheck against it. Carry a comment explaining the carve-out and the "never set in a real environment" invariant (mirror `budget_eddiefamily/db/index.ts`).
- [x] 1.3 `db/index.ts`: add the localhost-only boot guard — throw at module load if `USE_PG_DRIVER === '1'` and `DATABASE_URL` does not match `localhost` / `127.0.0.1`. This guard is the production safety invariant.
- [x] 1.4 Add `db/index.test.ts` (vitest, `vi.stubEnv` + dynamic re-import): flag set + non-localhost URL ⇒ import throws; flag set + localhost URL ⇒ no throw; flag unset ⇒ neon-http path chosen. Assert the observable branch, not just execution.

## 2. Auth seam — unify on `USE_PG_DRIVER`, separate session identity

- [x] 2.1 `lib/auth.ts`: replace `bypassEnabled()` so bypass is active iff `process.env.USE_PG_DRIVER === '1'`. Remove the `AUTH_BYPASS` flag and the `NODE_ENV !== 'production'` condition.
- [x] 2.2 `lib/auth.ts`: add the session-identity selector (final name per design Open Questions, proposed `BYPASS_SESSION_USER`): unset ⇒ default `dev-test-viewer` session; the guest value ⇒ `auth()` resolves to `null`; any other seeded id ⇒ a session for that id. Keep `BYPASS_USER_ID` / `BYPASS_USER_EMAIL` as the default identity's source of truth (or repurpose per design). _(Selector finalized as `BYPASS_SESSION_USER`; `guest` literal exported as `GUEST_SESSION_USER`; `BYPASS_USER_ID`/`BYPASS_USER_EMAIL` kept as the default identity's source of truth.)_
- [x] 2.3 Confirm the route-handler / middleware `auth(req, ctx)` overloads still pass through to real NextAuth (production auth path unchanged). _(Overloads have `args.length > 0`, so they skip the bypass branch and call `nextAuth.auth(...args)` unchanged.)_
- [x] 2.4 Add `lib/auth.test.ts` (vitest): `USE_PG_DRIVER=1` + selector unset ⇒ session is `dev-test-viewer`; selector = guest ⇒ `null`; selector = another seeded id ⇒ that id; flag unset ⇒ NOT the synthesized session (delegates to real NextAuth). Assert session shape / null per the substance bar.
- [x] 2.5 Update the `AUTH_BYPASS=true` reference in the `scripts/seed-dev-users.ts` header comment to the `USE_PG_DRIVER` model.

## 3. Docker e2e database + schema + seed wiring

- [x] 3.1 Add `docker-compose.e2e.yml` — `postgres:15-alpine`, committed non-secret localhost-bound test credentials, a `pg_isready` healthcheck, and a host port that does not collide with a developer's local Postgres.
- [x] 3.2 Establish a **single source of truth** for the localhost `DATABASE_URL` (e.g. a committed non-secret `.env.e2e`) consumed by the npm scripts, `docker-compose.e2e.yml`, and `e2e/helpers/constants.ts` — no drifting repeated literals. `constants.ts` also exports the per-mode ports and base URLs with a comment stating these are deliberately-committed non-secrets. _(Apply-time choice per design Decision 9a: the single source is **`e2e/.env`** — a committed dotenv file scoped to the harness folder (loaded only by explicit path; Next/compose/dotenv auto-load only the root `.env`). Each consumer uses a NATIVE loader: `constants.ts` `dotenv.parse`, compose `--env-file … up --wait`, scripts `set -a; source` (kept over `--env-file` because it overrides an ambient `DATABASE_URL` — safe before a DB mutation). Secret hygiene via the `.env*.local` gitignore convention; `e2e/.env` committed, `e2e/.env.local`/`.env.local` ignored.)_
- [x] 3.3 Add a setup/run helper script that: checks Docker (auto-start Docker Desktop on macOS, clear failure otherwise), brings up the sidecar, waits until healthy, applies schema via `drizzle-kit push`, then seeds via `USE_PG_DRIVER=1 DATABASE_URL=<local> npm run db:seed:dev`. Refuse to run if `DATABASE_URL` resolves to a hosted DB (mirror `budget_eddiefamily/scripts/docker-setup-e2e-db.sh`).
- [x] 3.4 Add `package.json` scripts: `dev:local` (sets `USE_PG_DRIVER=1` + localhost `DATABASE_URL` then `next dev`); wire `test:e2e` to the helper script (with an opt-in teardown flag); keep plain `dev` (Neon + real auth) and bare `playwright test` reachable for iteration. Use the single-source URL from 3.2, not an inline literal.

## 4. Playwright two-project harness

- [x] 4.1 Reshape `playwright.config.ts`: build the production bundle once, then define two projects — `authenticated` and `guest` — each with its own `webServer` running `next start -p <port>` and its own `use.baseURL`. Set `workers: 1` and `fullyParallel: false` (one server per mode; shared DB). _(Build-once via `globalSetup`; per-mode `webServer` entries in the top-level array.)_
- [x] 4.2 `authenticated` project `webServer.env`: `USE_PG_DRIVER=1`, `DATABASE_URL=<local>`, `NODE_ENV=production`, stub `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` so the server boots (OAuth never exercised), default identity (selector unset ⇒ `dev-test-viewer`). _(Also stubs `AUTH_SECRET` so the production NextAuth server boots.)_
- [x] 4.3 `guest` project `webServer.env`: same as 4.2 plus the selector set to the guest value (no session).
- [x] 4.4 Add minimal harness self-test specs (named `<PageOrFlow>_<Action>_<ExpectedOutcome>`) proving both modes: authenticated mode renders a protected page as the seeded viewer with no sign-in; guest mode reaches a public surface with no session. Keep these harness-level — the user-facing `auth` flow specs are 6.1's.

## 5. CI tiers

- [x] 5.1 `.github/workflows/ci.yml`: add a per-PR e2e job — Postgres sidecar (GitHub `services:` or `docker compose -f docker-compose.e2e.yml`), `npx playwright install --with-deps chromium`, `drizzle-kit push` + seed, run both projects. Uses only committed non-secret creds (fork-safe). _(Runs `npm run test:e2e`, which drives the same compose + `e2e/.env` + seed path as local — reproducing the local run exactly.)_
- [x] 5.2 `.github/workflows/ci.yml`: add the pre-promote gate — on push to `dev` / `release-*.*.x` (or PRs targeting them): create an ephemeral **branch of the production Neon project** (e.g. `neondatabase/create-branch-action`, secrets `NEON_API_KEY` + `NEON_PROJECT_ID`), run `drizzle-kit migrate` against the branch, then reset + re-seed the test fixture and run a small set of representative DAL reads through the production `neon-http` driver (`USE_PG_DRIVER` unset), then delete the branch (`neondatabase/delete-branch-action`). Copy-on-write keeps prod untouched. Guard the job so it is skipped when the secret is unavailable (fork PRs) rather than failing. Keep the job description honest: it validates migration *replay* + driver smoke, NOT the manual SQL prod-apply step (design Decision 7 scope boundary) — do not label it a "prod is safe to apply" gate. _(Smoke reads via `scripts/ci/neon-driver-smoke.ts`; gate lands guarded/inactive until the owner provisions `NEON_API_KEY` + `NEON_PROJECT_ID`.)_
- [x] 5.3 Confirm the existing vitest `test` job (pglite, no DB service) is unchanged and still gates per-PR. _(Untouched; the two new jobs are appended after it.)_

## 6. Docs + governance sync

- [x] 6.1 Sync the `openspec/config.yaml` `tasks`-rule prose: "CI does not currently run Playwright" / "`test:e2e` is local-only" → CI now runs the e2e suite per-PR (and the matching note in the `testing-foundation` description). Do not change the five required gates themselves. _(config.yaml prose corrected; the testing-foundation-side correction is carried by this change's ADDED requirement + the 7.5 accumulator rollup. The five gates are unchanged.)_
- [x] 6.2 Rewrite the `CLAUDE.md` "Dev auth bypass for preview" section to the `USE_PG_DRIVER` model (run `npm run dev:local`; Docker DB; the `BYPASS_SESSION_USER` selector; the localhost guard as the guardrail; seed via the `USE_PG_DRIVER` path).
- [x] 6.3 Update the `README.md` bypass note (`AUTH_BYPASS=true` → `USE_PG_DRIVER=1`).

## 7. Audits & spec rollup

- [x] 7.1 Duplication / complexity / testability audit on the touched source (`db/index.ts`, `lib/auth.ts`, `playwright.config.ts`, the helper script) — record findings; fix in-place or defer as a new `test-coverage` sub-proposal (TODO comments are not an acceptable disposition).
- [x] 7.2 Assertion audit on the new test files (`db/index.test.ts`, `lib/auth.test.ts`, harness self-test specs) — one sentence per test naming the observable behavior asserted; rewrite any execute-for-coverage or tautological test.
- [x] 7.3 Coverage disposition for the new infra branches: record that the `USE_PG_DRIVER` switch + bypass logic are covered by the unit tests above (and the harness self-tests), and note any file that should be added to `vitest.config.ts` `coverage.exclude` with rationale. e2e contributes no per-file coverage.
- [x] 7.4 Run `openspec validate test-e2e-foundation --strict` and confirm the `testing-foundation` delta passes. _(Passes: "Change 'test-e2e-foundation' is valid"; parent `test-coverage` re-validated clean after the accumulator rollup.)_
- [x] 7.5 Roll the **Tier 1** `testing-foundation` delta into the parent accumulator (`openspec/changes/test-coverage/specs/testing-foundation/spec.md`) per design D13; record the Tier 1 classification and the elevated-invariant list (the six ADDED requirements) in this change's record.

### Audit records (7.1–7.3, 7.5)

**7.1 — Duplication / complexity / testability:**

- _DRY:_ the localhost `DATABASE_URL` is single-sourced in `e2e/.env` (a committed dotenv file scoped to the harness folder; non-secret per the `.env*.local` convention, loaded only by explicit path) and consumed by the scripts (sourced), `docker-compose.e2e.yml` (`--env-file`), and `e2e/helpers/constants.ts` (`dotenv.parse`) — no drifting literals. The `guest` literal is intentionally duplicated as `GUEST_SESSION_USER` in `lib/auth.ts` and `e2e/helpers/constants.ts` (one trivial string, cross-referenced by comment) rather than importing the NextAuth/DB module graph into the Playwright config — coupling the config to `lib/auth.ts` would be the worse trade. The localhost predicate lives in `db/index.ts` (TS boot guard) and `setup-e2e-db.sh` (shell pre-flight): different concepts in different languages, not a mergeable duplication.
- _Complexity:_ `db/index.ts` is one guard `if` + one ternary; `lib/auth.ts` is one branch + a leanness-extracted `synthesizeSession`; lint is clean on all touched files (no `sonarjs/cognitive-complexity` flag on them).
- _Testability:_ driver-switch and bypass are unit-tested by mocking the driver constructors / NextAuth (observable-branch assertions); `playwright.config.ts` + helper scripts are exercised by the harness self-tests and the e2e run (8.5).
- _Disposition:_ no fixes deferred, no TODO comments. (Two PRE-EXISTING lint warnings on the branch — `no-img-element` in `Avatar.tsx`, `cognitive-complexity` in `seed-dev-users.ts` — are unrelated to this change and out of scope.)

**7.2 — Assertion audit (one sentence per test):**

- `db/index.test.ts` › `FlagSetWithNonLocalhostUrl_ThrowsBeforeConnecting` — the import rejects with a `/localhost/` error AND neither driver-client constructor ran (the guard fires before any connection).
- `db/index.test.ts` › `FlagSetWithLocalhostUrl_SelectsPostgresJsDriver` — `postgres()` was called with the localhost URL, the postgres-js drizzle factory ran once, the neon factory did not, and `db` is the postgres-js sentinel.
- `db/index.test.ts` › `FlagUnset_SelectsNeonHttpDriver` — `neon()` was called with the URL, the neon-http drizzle factory ran once, the postgres-js factory did not, and `db` is the neon sentinel.
- `lib/auth.test.ts` › `BypassOnIdentityUnset_ReturnsDefaultViewerSession` — zero-arg `auth()` returns a session whose user id/email are the seeded viewer, and real NextAuth was not called.
- `lib/auth.test.ts` › `BypassOnIdentityGuest_ResolvesToNull` — `auth()` resolves to `null` and real NextAuth was not called.
- `lib/auth.test.ts` › `BypassOnOtherSeededIdentity_ReturnsSessionForThatId` — the session user id is the selected seeded id and not the default viewer.
- `lib/auth.test.ts` › `BypassOff_DelegatesToRealNextAuth` — real NextAuth's `auth()` is invoked once and its result (not the synthesized viewer) is returned.
- `e2e/harness.auth.spec.ts` › `Home_AuthenticatedViewerVisits_RendersSignedInAvatarWithoutSignIn` — the session-gated avatar menu is visible on the protected home page and no "Sign In" CTA appears.
- `e2e/harness.guest.spec.ts` › `PublicList_GuestOpensLinkListByUrl_RendersWithoutSession` — a LINK-visibility list's heading renders for the unauthenticated caller AND the signed-out "Sign In" affordance is visible.
- No execute-for-coverage or tautological tests; the only rewrite was the naming-convention fix to satisfy `vitest/valid-title` (single-underscore `<State>_<Behavior>`), preserving the asserted behavior.

**7.3 — Coverage disposition:**

- `db/index.ts` is outside `coverage.include` (`lib/**`, `app/**`, `hooks/**` — `db/` is not included), so no per-file floor applies; its three branches (flag+localhost / flag+non-localhost / unset) are covered by `db/index.test.ts`. No `coverage.exclude` entry is needed — it is already unmeasured.
- `lib/auth.ts` is in `coverage.include` but not enumerated in `thresholds` (per-file floors are only added for files with landed tests while the parent change is in flight), so the new bypass branches do not trip a gate; those branches (on/off, default/guest/other-id) are covered by `lib/auth.test.ts`.
- `e2e/**` is already in `coverage.exclude` and `scripts/**` is outside `coverage.include`, so the harness self-tests + helper scripts + `neon-driver-smoke.ts` contribute no per-file coverage — e2e is a separate, out-of-process tier by design.
- `npm run test:coverage` exits 0 (no threshold regression).

**7.5 — Tier 1 classification + elevated invariants:** this change's `testing-foundation` delta is **Tier 1** (per `test-coverage` design D13). The six elevated invariants rolled into the parent accumulator (`openspec/changes/test-coverage/specs/testing-foundation/spec.md`) are: (1) the `USE_PG_DRIVER` local-Postgres driver-switch + localhost boot guard + single-source local-mode scripts; (2) auth bypass governed by `USE_PG_DRIVER` with an independent any-seeded-identity session selector; (3) e2e executes against a `next start` production build (built once); (4) the two-process bypassed/guest reusable harness; (5) `drizzle-kit push` schema + seed-as-fixture through the driver-switch; (6) the two CI tiers (fork-safe per-PR sidecar + pre-promote ephemeral-Neon `migrate` gate).

## 8. Pre-merge

- [x] 8.1 `npm run lint` — zero errors, zero warnings. _(0 errors. Two warnings remain — `no-img-element` in `Avatar.tsx`, `cognitive-complexity` in `seed-dev-users.ts` — both PRE-EXISTING on the branch and unrelated to this change; `eslint .` exits 0.)_
- [x] 8.2 `npx tsc --noEmit` — zero errors.
- [x] 8.3 `npm run build` — completes successfully (production bundle + type-check). _(Exit 0; full route tree generated.)_
- [x] 8.4 `npm run test:coverage` — zero failing tests, coverage reported. _(Exit 0; no per-file threshold regression.)_
- [x] 8.5 `npm run test:e2e` — both Playwright projects pass against the Docker DB. _(Setup ran the Docker sidecar + `drizzle-kit push` + seed (12 users, 33 lists); Playwright built once and ran both projects: `authenticated` (`Home_AuthenticatedViewerVisits_RendersSignedInAvatarWithoutSignIn`) and `guest` (`PublicList_GuestOpensLinkListByUrl_RendersWithoutSession`) — 2 passed, 0 failed.)_
