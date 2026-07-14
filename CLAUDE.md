# Claude notes

## Hard rules at a glance

Non-negotiables; each links to its full text.

- **No interactive DB transactions** — no `db.transaction(...)`, no `SELECT … FOR UPDATE`; the `neon-http` driver runs every query as its own HTTP round-trip. Backstop atomicity with unique / partial-unique indexes and `ON CONFLICT`. ([DATABASE.md](DATABASE.md))
- **No comments by default** — only a non-obvious WHY earns one. (§ Comments)
- **File size** — >400 lines of code is a merge-blocking lint error, 300–400 the only tolerated lint warning; never `eslint-disable` either rule. (§ File size)
- **Tests assert observable behavior** — no execute-for-coverage, no tautologies; names are lint-enforced as `<StateUnderTest>_<ExpectedBehavior>`. ([TESTING.md](TESTING.md))
- **Every `/* v8 ignore */` carries an inline `--` rationale** naming the unreachable branch; never valid on a redundant guard. ([TESTING.md](TESTING.md))
- **Five gates, checked separately**: `npm run lint` (pure `eslint .` — zero errors, zero non-size warnings) · `npx tsc --noEmit` · `npm run build` · `npm run test:coverage` · `npm run test:e2e`. Trunk landings run lint + typecheck locally pre-push; CI on the `dev` push runs the full battery. (§ Trunk workflow)
- **Skills never `git commit`** — stage, report, stop for the owner's signature; never retry a blocked signature. One change at a time on `dev`. (§ Trunk workflow)
- **Specs are the contract** — `openspec/specs/<capability>/spec.md` is normative; archived changes are history. Every interactive surface routes through a primitive-family spec; no page-scoped one-off UI classes.
- **Restart the dev server after seeding/reseeding** — `'use cache'` DAL results stay stale otherwise. (§ Local dev)

## Read this before touching that

| Touching… | Read first |
| --- | --- |
| Any test | [TESTING.md](TESTING.md) — substance rules, forbidden patterns, fixtures, naming |
| DB queries, DAL, schema, migrations | [DATABASE.md](DATABASE.md) — driver limits, migration workflow |
| OpenSpec changes or specs | [openspec/config.yaml](openspec/config.yaml) + the capability spec in `openspec/specs/` (see § Trunk workflow) |
| UI primitives / any interactive surface | The owning primitive-family spec (`button-system`, `menu-system`, …) in `openspec/specs/` |

## Trunk workflow

Work happens directly on `dev`, one OpenSpec change at a time in the working tree, reviewed **before** any commit exists. Per-change PRs are gone; branches+PRs remain the deliberate escape hatch for large, slow features (reviewed via `/spec-review <PR>` exactly as before).

### Change lifecycle

1. **`/start-change <issue#>`** — hard-gates on trunk preconditions (on `dev`, clean tree, up to date with origin — the clean-tree check enforces one-change-at-a-time), reads the issue, routes by label. `IDEA`/`EXPLORE NEEDED` → an interactive explore session **only**: owner-approved distilled outcome written back to the issue body, label stripped, stop (a non-viable `IDEA` gets a findings comment + `HOLD` label instead); `HOLD` → surface the hold comment and confirm before re-exploring; no routing label → `/opsx:propose` seeded from the issue body (typically the re-run after a prior explore). Explore never chains into propose in one invocation.
2. **`/opsx:apply`** — implement the change's tasks in the working tree.
3. **`/spec-review`** — no-arg reviews the **staged diff** (staged = reviewed baseline, unstaged = current fix round). Persists its report to `openspec/changes/<name>/review.md` with the shared machine-readable header (format: `.claude/skills/spec-review/reference/finding-format.md`).
4. **`/recheck-review`** — verifies fixed findings against just the fix delta, appending rounds to the persisted report; escalates to a fresh full review when fixes outgrow a recheck (`outgrew recheck`).
5. **`/land-change`** — state-driven, two phases. **Land:** gates (latest review-round verdict `clear to land`, tasks all `[x]`, `openspec validate --strict`, local lint + typecheck), stage the `issue-<N>:` work commit, hand off for signing, push to `dev`, report the CI run. **Seal:** only after green CI and the owner's click-test of the live dev deployment — archive the change (`review.md` travels with it), stage the `issue-<N>: archive <change>` commit, then after the signed push: `/finalize-spec-purposes`, milestone-assign, `gh issue close`. Red CI / failed live check → fix-forward commits under the same prefix; the change stays active (spec delta still editable) until the seal.

**Skills never run `git commit`** — every commit point is stage → report → stop for the owner's signature; a blocked signature is never retried.

### Release cut

`dev → x.y.x` stays a PR. **`/release-review`** is its sole gate: preflight (release base pattern + milestone), five inline dimensions (milestone completeness, cross-feature interaction risk, migration ordering, OpenSpec state clean, version bump vs milestone title — drafting/staging the bump when missing), CI rollup read, report persisted to `openspec/reviews/<version>.md` (which doubles as the release record). On `ready to cut`, the owner merges. Release-branch → `main` is a plain merge.

### OpenSpec mechanics

`/opsx:propose` opens with a grilling interview — its `rules.proposal` block in [openspec/config.yaml](openspec/config.yaml) points at the repo-owned [grill-me](.claude/skills/grill-me/SKILL.md) skill, so open decisions are put to the owner one at a time before any artifact is drafted (run `/grill-me` standalone to stress-test a plan outside the flow). `/finalize-spec-purposes` (run in `/land-change`'s seal phase) is a repo-owned skill, not part of the generated OpenSpec set: upstream archive/sync stubs `TBD` Purposes onto newly created capability specs, and the skill repairs them (and ratchets down the `KNOWN_TBD` baseline in [scripts/check-spec-purposes.mjs](scripts/check-spec-purposes.mjs), the advisory verifier exposed as `npm run check:specs` — deliberately not a merge gate; see `openspec/specs/spec-hygiene`). Stubs are prevented at authorship time: a delta introducing a new capability must state that capability's Purpose (enforced by `rules.specs` in [openspec/config.yaml](openspec/config.yaml)) so sync/archive writes it instead of a TBD stub.

The `openspec-*` skills and `opsx/*` commands under `.claude/` are generated by the OpenSpec CLI (`openspec update`) — never hand-edit them; edits are clobbered on the next regeneration. This project generates the custom workflow set `propose, explore, apply, sync, archive, continue`.

## Writing code: 

### Comments:

Default to writing no comments. Only add one when the WHY is non-obvious — a hidden constraint, a subtle invariant, a workaround for a specific bug, behavior that would surprise a reader. If removing the comment wouldn't confuse a future reader, don't write it.

Don't explain WHAT the code does — well-named identifiers already do that. Don't reference the current task, fix, or callers ("used by X", "added for the Y flow", "handles the case from issue #123") — those belong in the PR description and rot as the codebase evolves.

### File size (red / yellow / green):

Lint-enforced bands for production source (`app/**`, `lib/**`, `hooks/**`, `db/**`; test files and `**/__tests__/**` are exempt — `scripts/**` and `e2e/**` sit outside the scoped set entirely), counted in lines of **code** (comments and blank lines are free): **red** >400 = error — split by table-cohesion/domain before merge; **yellow** 300–400 = warning — pull easy wins where a clean extraction exists, a cohesive file may stay yellow; **green** <300 = goal, never achieved by scattering one concern across files. Yellow size advisories are the only tolerated lint warnings; no `eslint-disable` for either rule. Canonical homes: the rules in [eslint.config.mjs](eslint.config.mjs), the normative text in `openspec/specs/testing-foundation`.

### Abstraction (DRY · KISS · coupling):

#### Duplication (DRY)

**Decision rule** — extract when ANY of: 3+ copies · the unit has structure (branching, a typed factory, a multi-field literal) · a copy could drift silently (still compiles and passes while its meaning diverges). Stay inline only when ALL of: ≤2 copies · 1–2 lines · no structure · divergence fails loudly. The bullets below are the rationale and edge cases behind that rule.

- Extract duplicated, identical-by-design logic into one home on sight — don't ask whether to, the answer is yes.
- Keep copies apart only when you can name them as different concepts that will change for different reasons; code that merely looks alike is not a duplication to merge.
- The exception is the genuinely trivial: a shared line or two with no structure can stay inline — three similar lines beats a premature abstraction. But *trivial* is the bar, not the copy count. Weigh three forces: **weight** (a line or two can stay; a typed factory, multi-field literal, or anything with branching extracts), **drift hazard** (extract when one copy can fall behind **silently** — still compiles, still passes, but now means something different; inline is fine when divergence fails loudly or doesn't matter), and **count** (three or more extracts even when trivial — but count only escalates, it never overrides weight or drift). Two copies is a judgment call on those forces, not an always-or-never: a heavy or drift-prone unit earns one home even at two.

#### Over-generality (KISS)

- Don't build generality for cases that don't exist yet — parameters, flags, or branches with no current caller are dead code except when planned for imminent future use.
- Don't tear down a clean, working, tested abstraction just because it's more general than strictly needed; once it exists and is covered, stripping it is risk for no live defect.

#### Redundant guards

- Don't re-test a condition your own earlier control flow already decided. A guard (`if (cond) redirect()/return/throw`) whose condition is already excluded by an upstream guard or branch in the same function is dead code — remove it and let any narrowing flow from the existing control flow (merge or move the upstream guard, early-return). Never paper over it with a `/* v8 ignore */`.
- This is NOT a defensive guard, whose condition turns on an invariant established outside the function (framework lifecycle, platform, a third-party/DB contract) the compiler can't prove — that one is legitimate. Tell: a rationale that cites the function's own earlier code ("the guard above already redirects…") is the redundant kind.

#### Fragile coupling

- When a shared abstraction's callers diverge, split it back into separate concepts — don't bolt on flags, params, or branches so one thing can serve all of them.
- Coupling between callers that are genuinely one concept meant to change together is the abstraction doing its job.

#### Extraction for leanness

- Extract single-caller helpers to keep files lean — extraction for readability is the norm, not over-abstraction, and doesn't need justifying.

#### Where extracted helpers live

- Small, generic, or pure helpers go in a **co-located `utils.ts`** for that directory (create it if absent) — not in their own single-purpose file. `capRail` lives in `app/(main)/lists/ui/components/rails/utils.ts`, following `app/(main)/users/ui/utils.ts` (`initialsOf`).
- Reserve a descriptively-named standalone module for a genuine domain/capability concept (`lib/data/user.ts`, `lib/visibility.ts`, `lib/listAccess.ts`). `utils.ts` is for the small stuff, not a dumping ground for domain logic.

#### Worked example: `Button` / `LinkButton`

One small trio in `app/ui/components/button/` shows the first three forces at once:

- **DRY** — the only thing the two genuinely share, the visual styling, lives in `buttonClasses()`; neither component re-implements it.
- **Fragile coupling** — they stay separate components instead of collapsing into one polymorphic thing behind an `as`/`href` flag, because the concepts diverge: `Button` is a `<button>` (`ButtonHTMLAttributes` + `type`), `LinkButton` is a Next `<Link>` (`AnchorHTMLAttributes` + `LinkProps`).
- **KISS** — each carries only the props its concept needs: `Button` has `isLoading`/`disabled`, `LinkButton` doesn't — a link can't load or be disabled, so adding them "for symmetry" would be generality for a caller that doesn't exist.

## Local dev + e2e auth bypass (via `USE_PG_DRIVER`)

The app gates every protected page on Google OAuth via NextAuth, which makes it impossible to validate UI changes through the preview tools without a real Google sign-in. "Local mode" — a localhost Docker Postgres **plus** synthesized sessions (no real OAuth) — is entered with a single flag, `USE_PG_DRIVER=1`. The same flag points the DB driver at local Postgres (see [db/index.ts](db/index.ts)) and turns off real auth (see [lib/auth.ts](lib/auth.ts)); it is the same flag the e2e servers set. **Docker is a prerequisite** (Docker Desktop on macOS — `dev:local` auto-starts it).

**To run locally bypassed:**

1. `npm run dev:local` — brings up the localhost Postgres sidecar (`docker-compose.e2e.yml`), applies schema via `drizzle-kit push`, seeds `dev-test-viewer` plus the friend graph (idempotent), then starts `next dev` with `USE_PG_DRIVER=1`. Every protected page renders as `dev-test-viewer` with no sign-in.
2. Nothing to hand-set: the localhost `DATABASE_URL` lives once in `e2e/.env` (committed, non-secret — only `*.local` env files hold secrets and are gitignored, per the `.env*.local` convention) and is shared by the scripts, `docker-compose.e2e.yml`, and `e2e/helpers/constants.ts`.

**Choosing the session identity (`BYPASS_SESSION_USER`):** orthogonal to the bypass. Unset ⇒ the default `dev-test-viewer` session; the literal `guest` ⇒ `auth()` resolves to `null` (logged out); any other seeded id ⇒ a session for that id. The two e2e Playwright projects use exactly this: `authenticated` leaves it unset, `guest` sets it to `guest`.

**To return to real auth:** run plain `npm run dev` (no `USE_PG_DRIVER`) — Neon + real Google sign-in, exactly as production. This is also the deployed Vercel configuration.

**To reset after drift:** `npm run db:reset:dev` against the local DB — wipes everything owned by the seeded users (including UI-created rows under `dev-test-viewer`) via cascade, then re-seeds the baseline. Use this when local testing has accumulated stray lists/items/purchases and you want a clean slate.

**After seeding/resetting, restart the dev server** — many DAL functions (`getListsByUser`, etc.) are tagged with `'use cache'` and only invalidate when the app calls `revalidateTag`. The seed script runs outside the Next.js process and can't bump tags, so cached results stay stale until the server restarts.

**Hard guardrail:** the bypass is scoped to a localhost DB by the `USE_PG_DRIVER` boot guard in [db/index.ts](db/index.ts) — if `USE_PG_DRIVER=1` is ever set with a non-localhost `DATABASE_URL` (e.g. on Vercel), the app refuses to boot: a loud outage, never a silent bypass or data leak. On Vercel the flag is unset, so production stays neon-http + real auth. This positive localhost requirement replaces the former `NODE_ENV !== 'production'` check.

**Seeded `quantity_limit` coverage:** every seeded list has overrides at positions 0, 1, and last, rotating `(3, null, 1)` → `(null, 1, 3)` → `(1, 3, null)` across consecutive lists. Multi-claim and unlimited items receive multiple deterministic purchase rows (`${itemId}-purchase-${n}`) so partial-claimed, fully-claimed, and multi-buyer-unlimited UI states are reachable directly from the seed without manual clicking.

**Seeded store-metadata edge case:** `dev-list-alice-baby-item-2` carries three hand-authored stores led by a $1,000.00 store whose name ("Really long store name that carries really cool items") overflows even the one-name slot of the card's store-metadata line — the name-truncation + non-truncating `+N` count state is reachable straight from the seed.

**Seeded claim-attribution coverage:** authenticated fan-out purchase rows are self-claims (`claimed_by = user_id`); guest rows keep all-NULL identities. Four hand-authored rows (`dev-purchase-*`, on `dev-list-viewer-birthday-item-1..3` and `dev-list-alice-wedding-item-1`, whose items are excluded from the fan-out) cover the attributed-claim shape (Alice marked Bob), the viewer-as-attributed-purchaser shape, an owner self-claim, and a legacy signed-out-guest row — every unclaim-matrix branch and the owner spoiler "added by" label are reachable from the seed. Alice is seeded mutual with every other friend, so her lists' attributed-purchaser picker has a pool large enough to scroll and targets besides the viewer.

**Files:**

- [db/index.ts](db/index.ts) — `USE_PG_DRIVER` driver-switch (postgres-js vs neon-http) + the localhost boot guard.
- [lib/auth.ts](lib/auth.ts) — bypass keyed on `USE_PG_DRIVER`; the `BYPASS_SESSION_USER` selector; exports `BYPASS_USER_ID = 'dev-test-viewer'` and `GUEST_SESSION_USER = 'guest'`.
- [scripts/seed-dev-users.ts](scripts/seed-dev-users.ts) — idempotent; refuses to run on prod; upserts most tables via Drizzle `.insert().onConflictDoUpdate()` (a few use `.onConflictDoNothing()`) so reseeds pick up edits.
- [scripts/setup-e2e-db.sh](scripts/setup-e2e-db.sh) / [scripts/dev-local.sh](scripts/dev-local.sh) / [scripts/test-e2e.sh](scripts/test-e2e.sh) — `setup-e2e-db.sh` is Docker bring-up + schema only; the data-state step is the caller's: `dev:local` seeds (preserves UI-created rows), `test:e2e` runs `db:reset:dev` (cascade wipe + reseed) so every e2e run starts from identical state. `dev:local` and `test:e2e` wrap them.
- Route-handler / middleware overloads of `auth(req, ctx)` pass through to real NextAuth — production auth path is unchanged.

## Product-fetch mock (local mode)

In local mode (`USE_PG_DRIVER=1` — same flag as the auth bypass, no flag of its own), pasting `https://mock.test/<scenario>` into the add-item flow returns a deterministic fixture instead of calling Zyte — every downstream deck state reachable in seconds, zero quota. Scenario is the URL's first path segment, toggled per request with no restart; any other hostname takes the real path even locally (paste a real URL with a key configured to test real Zyte). Unknown scenario → `fetch_failed`. Scenario table (fixture → UI state) lives in `openspec/specs/product-fetch-mock/spec.md`; fixtures in [lib/product-fetch/mock.ts](lib/product-fetch/mock.ts). Mock requests bypass the product-fetch rate-limit bucket; `https://mock.test/rate-limited` returns the route-level 429. Outside local mode the mock does not exist — `mock.test` fails like any dead link.

## /api/image-search auth + rate limit

`GET /api/image-search` requires an authenticated session (401 otherwise) and enforces a per-user in-memory token bucket of 30 requests/minute (429 with `{ error: 'rate_limited' }` when exceeded — distinguishable from upstream `quota_exceeded`). Under the dev bypass the session resolves to `dev-test-viewer`, so the route works during preview-driven testing; the 30/min cap is enough headroom for normal iteration. See [app/api/image-search/route.ts](app/api/image-search/route.ts).
