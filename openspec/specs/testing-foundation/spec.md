# testing-foundation Specification

## Purpose

Establish a checkable contract for the repository's test-authoring conventions, starting with the mechanically-enforceable subset of the Vitest title-shape convention. Created by archiving change `enforce-test-title-lint`.
## Requirements
### Requirement: Vitest title-shape convention SHALL be sharpened and mechanically enforced at lint error severity

The mechanically-checkable subset of the Vitest title-shape convention SHALL be enforced by an ESLint rule that fails the pre-merge `lint` gate, NOT by manual review alone. Enforcement SHALL be configured via `eslint-plugin-vitest`'s `vitest/valid-title` rule in the `**/*.test.{ts,tsx}` block of `eslint.config.mjs`, at severity `error`. The convention is sharpened so the **single underscore is the one state│behavior boundary**, and the enforced subset SHALL be:

1. **`it()` / `test()` titles** SHALL match the shape `<State>_<Behavior>(-<Behavior>)*`:
   - **exactly one underscore**, separating the state from the behavior;
   - the **state** is a **single PascalCase token** — compound state is NOT expressible in the `it()` name and SHALL be carried by nested `describe` blocks (even when used once);
   - the **behavior** is one PascalCase token, or several **dash-joined** PascalCase facets for a legitimate compound (ordered effects, or facets of one atomic contract);
   - printf placeholders (`%s`, `%d`, `%#`, etc.) are permitted so `it.each` titles conform.

   A title with no underscore (a fused token), a second underscore (compound state), prose (whitespace), or a lowercase-leading token SHALL fail lint.

2. **`describe()` titles** SHALL contain no whitespace and no punctuation or special characters — only identifier/tag characters (`[A-Za-z0-9_$]`). Dash is NOT permitted in `describe` titles (it is the behavior-facet joiner in `it`/`test` only).

Compound behavior SHALL NOT be mechanically discouraged. The effects of a single trigger (e.g. `ClickFollow_CallsFollowUser-ToastSuccess-RouterRefresh`) share one execution and cannot be split into separate tests without duplicating setup, so a dash-joined behavior of any length is structurally valid. There SHALL be no lint rule keyed on dash count.

The following parts of the convention SHALL remain a manual review bar (assertion audit + AI-authoring instructions + review), because a static pattern cannot judge them and the lint rule SHALL NOT be relied upon to catch them:

- **Token role.** A regex cannot tell whether a token is a state or a behavior, so `<State>_<State>` and `<Behavior>_<Behavior>` are mechanically indistinguishable from a valid `<State>_<Behavior>` and SHALL NOT be caught by lint. Whether the left token is genuinely a state remains manual.
- **Conflation (atomicity).** A test SHALL cover one trigger and assert all of that trigger's effects together. A title that spans multiple distinct triggers (actions) SHALL be split into separate tests; one that asserts several effects of a single trigger SHALL NOT. This discriminator is the number of triggers, not the number of dashes, and is a manual judgment.
- The **precision principle** — whether each token is as specific as the test's assertions (bare `Returns` / `Renders`, opaque state tokens like `Garbage` / `Invalid`).
- The **describe role distinction** — module vs function vs scenario-family, and tag precision for scenario families.
- **Playwright** `<PageOrFlow>_<Action>_<ExpectedOutcome>` names, which run under a separate runner not covered by the vitest plugin.

A green `lint` run therefore SHALL be read as "the title shape is structurally valid", NOT as "the title is well-named or well-scoped".

#### Scenario: Single-token it() title fails lint

- **WHEN** a contributor writes `it('RendersMainContainerWrappingFollowingPage', ...)` (a fused token, no underscore)
- **THEN** `npm run lint` reports a `vitest/valid-title` error and the pre-merge `lint` gate fails
- **AND** the test SHALL be renamed to `<State>_<Behavior>` (e.g. `FollowingPage_RendersMainContainerWrapper`) before merge

#### Scenario: Conforming it() and it.each titles pass lint

- **WHEN** a test is named `it('InputPrivate_ReturnsOWNER', ...)` or `it.each(TEXT_TYPES)('TypeSetTo_%s', ...)`
- **THEN** `vitest/valid-title` accepts both — the first parses as `<State>_<Behavior>` on a single underscore, and the second's `%s` placeholder is permitted

#### Scenario: Compound-state it() title fails lint and is hoisted to a describe

- **WHEN** a contributor writes `it('NonPurchase_WithSetter_IconRendered', ...)` (two underscores — `NonPurchase` and `WithSetter` are both state)
- **THEN** `npm run lint` reports a `vitest/valid-title` error (a second underscore is not allowed)
- **AND** the state SHALL be hoisted into nested `describe` blocks, leaving a single-token-state `it()` (e.g. `describe('NonPurchase') > describe('WithSetter') > it('IconRendered_...')`), even if the compound is used only once

#### Scenario: Single-trigger compound behavior uses dashes and passes lint

- **WHEN** a test asserts several effects of one trigger, e.g. `it('ClickFollow_CallsFollowUser-ToastSuccess-RouterRefresh', ...)`
- **THEN** `vitest/valid-title` accepts it — one underscore (the boundary) and a dash-joined behavior of any length
- **AND** it SHALL NOT be flagged or split: the effects share one execution, so splitting would only duplicate setup. Splitting is required only when a title spans multiple distinct triggers, which is a manual judgment

#### Scenario: Expression-bearing parameterized title is not falsely flagged

- **WHEN** a parameterized test uses a template literal with an interpolated expression, e.g. `` it(`Variant${cap(variant)}DefaultSize_RendersBtn${cap(variant)}`, ...) ``
- **THEN** `vitest/valid-title` skips the dynamic title rather than reporting an error

#### Scenario: Prose describe title fails lint

- **WHEN** a contributor writes `describe('legacy DB strings', ...)` or `describe('variant × size matrix', ...)`
- **THEN** `npm run lint` reports a `vitest/valid-title` error for the whitespace/punctuation
- **AND** the describe SHALL be renamed to an identifier/tag form (`'LegacyDbStrings'`, `'VariantSizeMatrix'`) before merge

#### Scenario: Legitimate module and function describes pass lint

- **WHEN** a test file uses `describe('buttonClasses', () => { ... })` (module, camelCase) or `describe('fromDb', () => { ... })` (function, native casing)
- **THEN** neither is flagged by `vitest/valid-title` — both are identifier-form with no whitespace or punctuation

#### Scenario: Role-confused but structurally-valid name is not caught by lint

- **WHEN** a test is named `it('NonPurchase_WithSetter', ...)` — one underscore, but BOTH tokens are state (role confusion)
- **THEN** `vitest/valid-title` accepts it — a regex cannot judge token role
- **AND** the role error remains a manual / AI-authoring / review finding; the green lint result SHALL NOT be treated as evidence the name is correctly a `<State>_<Behavior>` pair

#### Scenario: Structurally-valid but imprecise name still requires manual review

- **WHEN** a test is named `it('Input_Returns', ...)` — structurally valid but both tokens vague
- **THEN** `vitest/valid-title` accepts it (the lint rule enforces shape, not precision)
- **AND** the precision principle remains a manual assertion-audit finding

### Requirement: Home-digest capability carve-out SHALL be tested at the universal COVERAGE_FLOOR with complexity locked at error

The `home-digest` capability carve-out (sub-proposal 4.3) — comprising the executable source files `app/(main)/HomePage.tsx`, `app/(main)/page.tsx`, the four rail components `app/(main)/lists/ui/components/rails/MyListsRail.tsx`, `FollowingRail.tsx`, `BookmarksRail.tsx`, `RecentlyVisitedRail.tsx`, the extracted helper `app/(main)/lists/ui/components/rails/capRail.ts`, and the two client components `app/(main)/lists/ui/components/CollapsibleRail.tsx` and `app/(main)/lists/ui/components/BookmarkMigrationToast.tsx` — SHALL be covered by colocated test files under `__tests__/` directories meeting the universal per-file `COVERAGE_FLOOR` defined in `vitest.config.ts` (`lines:98 / statements:98 / branches:95 / functions:100`). The `sonarjs/cognitive-complexity` rule SHALL be promoted from `warn` to `error` for these executable files via `eslint.config.mjs` per-file overrides. Async-server-component carve-out files (`HomePage.tsx`, the four rails) are tested in the node project by direct async invocation and React-element prop-inspection (no jsdom render); the two client components and the `page.tsx` shell are tested in the jsdom project via React Testing Library. Subsequent sub-proposals that import these modules SHALL inherit the assumption that they are tested and complexity-locked.

The DAL read `lib/dal.ts#getUserIdByEmail` (the only DAL read imported directly by `HomePage.tsx`) is exercised by a behavioral integration test against the PGlite test database, but `lib/dal.ts` SHALL NOT be enumerated in `vitest.config.ts`'s per-file `thresholds` map by this carve-out: vitest's per-file coverage gate cannot isolate a single exported function of the 708-line shared `lib/dal.ts`, whose other functions are owned by sibling carve-outs. The `lib/dal.ts` per-file coverage-attribution strategy is deferred to a governance checkbox in `openspec/changes/test-coverage/tasks.md`.

#### Scenario: Each carve-out file meets the universal floor

- **WHEN** `npm test -- --coverage` runs against `main` after this change archives
- **THEN** the per-file coverage report shows each of `HomePage.tsx`, `page.tsx`, `MyListsRail.tsx`, `FollowingRail.tsx`, `BookmarksRail.tsx`, `RecentlyVisitedRail.tsx`, `capRail.ts`, `CollapsibleRail.tsx`, and `BookmarkMigrationToast.tsx` at `lines ≥ 98%, statements ≥ 98%, branches ≥ 95%, functions = 100%`
- **AND** every per-file threshold entry references the shared `COVERAGE_FLOOR` constant (no per-file numeric variation)
- **AND** `lib/dal.ts` is NOT among the enumerated per-file threshold entries

#### Scenario: Complexity ceiling fails lint in carve-out files

- **WHEN** a contributor edits any executable carve-out file to raise a function's cognitive complexity to 16
- **THEN** `npm run lint` reports a `sonarjs/cognitive-complexity` error (not a warning)
- **AND** the pre-merge `lint` gate fails

#### Scenario: Elevated invariant is regression-locked

- **WHEN** a future change to `BookmarkMigrationToast.tsx` changes the un-hydrated `useSyncExternalStore` snapshot from *dismissed* to *visible* (reintroducing the flash-of-toast on cold load)
- **THEN** the colocated test in `BookmarkMigrationToast.test.tsx` fails with an assertion naming the pre-hydration visibility contract
- **AND** the `test` pre-merge gate fails

### Requirement: DAL functions SHALL be integration-tested against PGlite by swapping the @/db connection, not by mocking the function

The repository's DB-under-test mechanism (PGlite, chosen by `test-foundation-spike`) SHALL be applied to DAL functions by booting a PGlite instance via `test/helpers/db.ts#bootPglite`, applying the migrations, seeding rows, and substituting the `@/db` module's exported connection with the PGlite-backed Drizzle client for the duration of the test. This honors the testing-foundation rule "DAL functions SHALL NOT be mocked — integration tests SHALL exercise them against the real test database": only the database *connection/driver* (`@/db`, normally `drizzle-orm/neon-http`) is swapped, and the DAL function under test runs its real query logic against the real (PGlite) database. This carve-out establishes the pattern for the first time; later DAL carve-outs (`test-following`, `test-list-collections`, `test-visit-history`, `test-list-item-management`, `test-list-visibility`) SHALL reuse it, extracting the connection-swap + seed glue to `test/helpers/` once a second DAL test file needs it.

#### Scenario: getUserIdByEmail integration test runs against PGlite

- **WHEN** `lib/__tests__/getUserIdByEmail.test.ts` runs in the node project
- **THEN** it boots PGlite, applies migrations, seeds `users` rows, swaps `@/db` to the PGlite client, and asserts that a matching email returns the seeded row, a non-matching email returns `null`, and the DAL function itself is NOT mocked or stubbed

#### Scenario: Pattern is reused, not re-invented, by later DAL carve-outs

- **WHEN** a later DAL carve-out adds a second DAL integration test
- **THEN** the `@/db` connection-swap + seed harness is extracted to `test/helpers/` and imported by both consumers
- **AND** no DAL function is mocked from any DAL or action test

### Requirement: Misc-primitives carve-out SHALL be tested at the universal COVERAGE_FLOOR with complexity locked at error

The misc-primitives carve-out — comprising the executable components at `app/ui/components/ConfirmDialog.tsx`, `app/ui/components/TooltipWrapper.tsx`, `app/ui/components/Empty.tsx`, and `app/ui/components/FormShell.tsx` (which exports both `FormShell` and `FormShellFooter` plus the internal `useDismiss` hook) — SHALL be covered by colocated test files meeting the universal per-file `COVERAGE_FLOOR` defined in `vitest.config.ts` (`lines:98 / statements:98 / branches:95 / functions:100`). Test files SHALL live at `app/ui/components/__tests__/ConfirmDialog.test.tsx`, `app/ui/components/__tests__/TooltipWrapper.test.tsx`, `app/ui/components/__tests__/Empty.test.tsx`, and `app/ui/components/__tests__/FormShell.test.tsx` (all jsdom project). The `sonarjs/cognitive-complexity` rule SHALL be promoted from `warn` to `error` for the four executable files via `eslint.config.mjs` per-file overrides. Subsequent sub-proposals that import `<ConfirmDialog>`, `<TooltipWrapper>`, `<Empty>`, `<FormShell>`, `<FormShellFooter>`, or `useDismiss` SHALL inherit the assumption that those modules are tested and complexity-locked, and any future raise of complexity above 15 in those files SHALL fail lint. This carve-out's `testing-foundation` delta is Tier 2 per `test-coverage` design D13 — it does NOT roll into the parent's `test-coverage` accumulator and does NOT modify the active `openspec/specs/testing-foundation/spec.md`.

#### Scenario: Each carve-out file meets the universal floor

- **WHEN** `npm test -- --coverage` runs against `main` after this change archives
- **THEN** the per-file coverage report shows each of `ConfirmDialog.tsx`, `TooltipWrapper.tsx`, `Empty.tsx`, and `FormShell.tsx` at `lines ≥ 98%, statements ≥ 98%, branches ≥ 95%, functions = 100%`
- **AND** the gate passes
- **AND** all four per-file threshold entries in `vitest.config.ts` reference the shared `COVERAGE_FLOOR` constant (no per-file numeric variation)

#### Scenario: Carve-out tests live in __tests__

- **WHEN** a contributor opens the carve-out source files
- **THEN** test files exist at `app/ui/components/__tests__/ConfirmDialog.test.tsx`, `app/ui/components/__tests__/TooltipWrapper.test.tsx`, `app/ui/components/__tests__/Empty.test.tsx`, and `app/ui/components/__tests__/FormShell.test.tsx`

#### Scenario: Complexity ceiling fails lint in carve-out files

- **WHEN** a contributor edits any of the four carve-out files to raise a function's cognitive complexity to 16
- **THEN** `npm run lint` reports a `sonarjs/cognitive-complexity` error (not a warning)
- **AND** the pre-merge `lint` gate fails

#### Scenario: New family specs are active after archive

- **WHEN** this sub-proposal archives
- **THEN** the four new active specs exist at `openspec/specs/confirm-dialog-system/spec.md`, `openspec/specs/tooltip-system/spec.md`, `openspec/specs/empty-state-system/spec.md`, and `openspec/specs/form-shell-system/spec.md`
- **AND** each spec has a Purpose paragraph written (not "TBD")
- **AND** each spec's SHALLs are regression-locked by ≥ 1 colocated `<State>_<Behavior>` test in the corresponding test file

#### Scenario: Elevated invariants are regression-locked

- **WHEN** a future change to any of the four carve-out files alters a SHALL-locked behavior — including (but not limited to): removes the `isOpen` short-circuit from `<ConfirmDialog>`; changes the Cancel or Confirm variant; breaks the Confirm-then-onClose call order; alters the `tooltip-container` wrapper-class composition (e.g. reintroduces a trailing space or drops the single-space join); renders the tooltip span unconditionally; emits a different title or description for `type === 'purchase'`; changes the `<Empty>` CTA branch selection; renders the wrong inner-class variant in `<FormShell>`; removes the overlay-self-target dismiss guard; alters the `useDismiss` three-branch priority (onClose → router.back if history > 1 → router.push closeHref); detaches the `isPending` → `isLoading` passthrough on `<FormShellFooter>`'s Submit
- **THEN** the corresponding colocated test file fails with an assertion naming the specific divergence
- **AND** the `test` pre-merge gate fails

### Requirement: list-hero-header capability carve-out SHALL be tested at the universal COVERAGE_FLOOR with complexity locked at error

The `list-hero-header` capability carve-out — comprising the executable source files `app/(main)/lists/ui/components/ListDetails.tsx`, `app/(main)/lists/ui/components/ShareButton.tsx`, and `app/(main)/lists/ui/components/EditListAction.tsx`, plus the new `resolveListVisibility` export added to `lib/visibility.ts` — SHALL be covered by colocated test files meeting the universal per-file `COVERAGE_FLOOR` defined in `vitest.config.ts` (`lines:98 / statements:98 / branches:95 / functions:100`). Component/helper test files SHALL live under `__tests__/` directories mirroring their source locations (`app/(main)/lists/ui/components/__tests__/ListDetails.test.tsx`, `ShareButton.test.tsx`, `EditListAction.test.tsx`), run under the jsdom project. The `sonarjs/cognitive-complexity` rule SHALL be promoted from `warn` to `error` for the three carve-out component files via `eslint.config.mjs` per-file overrides. A reusable WCAG contrast helper SHALL exist at `test/helpers/contrast.ts` (with its own test under `test/helpers/__tests__/`), and the `list-hero-header` contrast invariant (R8) SHALL be enforced by an automated test at `app/(main)/lists/ui/styles/__tests__/hero-contrast.test.ts` that reads the gradient and text-color tokens from `app/ui/styles/global.css` and `app/(main)/lists/ui/styles/list.css`. Subsequent sub-proposals that import `ListDetails`, `ShareButton`, or `EditListAction` SHALL inherit the assumption that those modules are tested and complexity-locked, and any future raise of complexity above 15 in those files SHALL fail lint.

#### Scenario: Each carve-out file meets the universal floor

- **WHEN** `npm test -- --coverage` runs against `main` after this change archives
- **THEN** the per-file coverage report shows each of `ListDetails.tsx`, `ShareButton.tsx`, `EditListAction.tsx`, and the `resolveListVisibility` export in `lib/visibility.ts` at `lines ≥ 98%, statements ≥ 98%, branches ≥ 95%, functions = 100%`
- **AND** the gate passes
- **AND** every per-file threshold entry added by this change references the shared `COVERAGE_FLOOR` constant (no per-file numeric variation)

#### Scenario: Complexity ceiling fails lint in carve-out files

- **WHEN** a contributor edits any of `ListDetails.tsx`, `ShareButton.tsx`, or `EditListAction.tsx` to raise a function's cognitive complexity to 16
- **THEN** `npm run lint` reports a `sonarjs/cognitive-complexity` error (not a warning)
- **AND** the pre-merge `lint` gate fails

#### Scenario: Carve-out tests live in `__tests__/`

- **WHEN** a contributor opens the carve-out source files
- **THEN** test files exist at `app/(main)/lists/ui/components/__tests__/ListDetails.test.tsx`, `app/(main)/lists/ui/components/__tests__/ShareButton.test.tsx`, and `app/(main)/lists/ui/components/__tests__/EditListAction.test.tsx`
- **AND** a shared contrast helper exists at `test/helpers/contrast.ts` with a colocated test, and the hero contrast invariant is enforced at `app/(main)/lists/ui/styles/__tests__/hero-contrast.test.ts`

#### Scenario: Contrast invariant is regression-locked against the CSS tokens

- **WHEN** a future change to `app/ui/styles/global.css` or `app/(main)/lists/ui/styles/list.css` lightens the `--hero-gradient` lightest stop or changes a hero text-role color so a role drops below its WCAG AA threshold (3:1 large / 4.5:1 normal) against the worst-case gradient pixel
- **THEN** `hero-contrast.test.ts` fails with an assertion naming the failing role and its computed ratio
- **AND** the `test` pre-merge gate fails

#### Scenario: Elevated invariant is regression-locked

- **WHEN** a future change to `ListDetails.tsx` reintroduces a redundant or empty `.list-hero-share-wrapper` on viewer or preview views
- **THEN** the colocated `ListDetails.test.tsx` fails with an assertion naming the unexpected wrapper element
- **AND** the `test` pre-merge gate fails

### Requirement: PGlite test database SHALL be booted at most once per test file, with per-test isolation via a shared schema-derived reset helper

Every `*.test.ts` DB-integration test file SHALL boot the PGlite instance via `test/helpers/db.ts#bootPglite` at most once per file (in a `beforeAll` hook), and SHALL NOT call `bootPglite` inside an `it()` / `test()` body or inside a per-test `beforeEach`. Per-test isolation SHALL be achieved by resetting table rows between tests, NOT by re-booting and re-migrating.

The row reset SHALL be performed by a single shared helper exported from `test/helpers/db.ts` (e.g. `resetDb`) that issues one `TRUNCATE … RESTART IDENTITY CASCADE` over the database. The set of tables truncated SHALL be derived from the drizzle schema at `db/schema.ts` — iterating the schema module's exports and selecting drizzle table objects (via `is(value, PgTable)`), resolving each name with `getTableName` — and SHALL NOT be a hand-maintained SQL table-name literal. A table newly added to `db/schema.ts` SHALL therefore be reset automatically without editing the helper.

Test files that mutate rows SHALL call this shared reset helper (and `vi.restoreAllMocks()` where they install per-test `db` spies) in `beforeEach` before reseeding, so that no row or spy leaks from one test into the next now that the database instance is shared across a file's tests. Files that only seed read-only fixtures once and never mutate MAY seed in `beforeAll` and skip the reset.

This requirement completes the existing "extract the connection-swap + seed glue to `test/helpers/`" expectation into a binding boot-frequency contract; it does not change the migration-replay logic of `bootPglite` itself — only how often callers invoke it.

#### Scenario: Reset helper leaves all schema tables empty

- **WHEN** a test seeds rows into multiple tables and a subsequent `beforeEach` calls the shared `resetDb` helper
- **THEN** selecting from every table defined in `db/schema.ts` returns zero rows
- **AND** the truncation set was derived from the schema (not a hardcoded table-name list), so a table absent from any prior hand-rolled `TRUNCATE` literal is also emptied

#### Scenario: No DB-integration test file boots PGlite per test

- **WHEN** the repository's `*.test.ts` files are inspected
- **THEN** no `bootPglite()` call appears inside an `it()` / `test()` body or inside a `beforeEach` hook
- **AND** every file that uses `bootPglite` calls it from a `beforeAll` hook exactly once

#### Scenario: Converted file stays green under the full parallel suite, not just in isolation

- **WHEN** a file converted from per-test boot to per-file boot + `resetDb` runs as part of the full `pool: 'forks'` node suite
- **THEN** every test passes with no cross-test row or mock leakage
- **AND** the per-test boot-timeout flake described in issue #97 no longer occurs

#### Scenario: TRUNCATE literal is de-duplicated

- **WHEN** `app/actions/__tests__/items.test.ts` and `lists.test.ts` are inspected after this change
- **THEN** neither contains a hand-rolled `TRUNCATE TABLE …` SQL literal
- **AND** both reset rows between tests by calling the shared schema-derived reset helper from `test/helpers/db.ts`

### Requirement: E2E and bypassed local dev SHALL run against a local Postgres via the `USE_PG_DRIVER` driver-switch

The application's DB connection (`db/index.ts`) SHALL select its Drizzle driver from the `USE_PG_DRIVER` environment variable: when `USE_PG_DRIVER === '1'` it SHALL use `drizzle-orm/postgres-js` against `DATABASE_URL`; otherwise it SHALL use the production `drizzle-orm/neon-http` driver unchanged. So that repeated runs never consume the metered live Neon branch, the e2e harness and bypassed local development SHALL set `USE_PG_DRIVER=1` and point `DATABASE_URL` at a local Postgres (a Docker container). The exported `db` SHALL remain typed as the neon-http database type so that transaction APIs unavailable in production do not typecheck against it.

Local mode SHALL be entered through dedicated npm scripts (e.g. `dev:local`, and the e2e run) that set `USE_PG_DRIVER=1` and the localhost `DATABASE_URL` **together**, so a developer never hand-sets those variables. The plain scripts (`dev`, and any non-local path) SHALL remain on the production driver + real auth. The localhost `DATABASE_URL` SHALL have a single source of truth shared by the scripts, `docker-compose.e2e.yml`, and `e2e/helpers/constants.ts` rather than being repeated as drifting literals. The localhost boot guard below is therefore a defense-in-depth backstop against misconfiguration, not a step in the normal workflow.

This requirement is **Tier 1** (per `test-coverage` design D13): it is cross-cutting test-execution foundation, not carve-out bookkeeping, and rolls into the parent `testing-foundation` accumulator.

#### Scenario: Flag on selects postgres-js against the local DB

- **WHEN** the app boots with `USE_PG_DRIVER=1` and `DATABASE_URL` pointing at a localhost Postgres
- **THEN** queries execute against that local Postgres via the postgres-js driver
- **AND** no request is made to the Neon HTTP endpoint

#### Scenario: Flag unset preserves the production driver

- **WHEN** the app boots with `USE_PG_DRIVER` unset (the deployed configuration)
- **THEN** the DB connection uses `drizzle-orm/neon-http` exactly as before this change
- **AND** no postgres-js connection is opened

#### Scenario: Local mode is entered through a dedicated script, not hand-set env

- **WHEN** a developer runs the local-mode npm script (e.g. `dev:local`, or the e2e run)
- **THEN** the script sets both `USE_PG_DRIVER=1` and the localhost `DATABASE_URL` together
- **AND** the app boots in local mode without the developer setting either variable manually

#### Scenario: Non-localhost DATABASE_URL under the flag refuses to boot (backstop)

- **WHEN** `USE_PG_DRIVER=1` is set but `DATABASE_URL` does not point at localhost / `127.0.0.1`
- **THEN** the app throws at startup and refuses to boot
- **AND** no query is issued against the non-local database

### Requirement: Auth bypass SHALL be governed by `USE_PG_DRIVER`, with session identity selected independently

Real Google OAuth and the existence of a session are separate concerns. Whether auth is **bypassed** (real OAuth off, sessions synthesized) SHALL be governed by `USE_PG_DRIVER === '1'` — the same flag that selects the local DB — and SHALL NOT depend on `NODE_ENV` (so a production build via `next start` can still run bypassed locally). The previous `AUTH_BYPASS` flag and the `NODE_ENV !== 'production'` condition SHALL be removed. **Which** session a zero-argument `auth()` returns SHALL be chosen by a separate identity selector (a seeded user id, or the literal value meaning "no session"); the selector SHALL accept any seeded user id rather than being fixed to one identity. When the selector is unset the default identity SHALL be the seeded test viewer (`dev-test-viewer`), preserving the prior preview behavior. The production safety guarantee SHALL be the `USE_PG_DRIVER` localhost boot guard (above), NOT a `NODE_ENV` check. Route-handler / middleware `auth(req, ctx)` overloads SHALL continue to pass through to real NextAuth. This complements — and does not restate — the existing "NextAuth is not invoked against real Google" requirement, which remains the owner of the no-real-OAuth constraint.

#### Scenario: Bypass active, identity unset, yields the default viewer session

- **WHEN** a server component calls zero-argument `auth()` with `USE_PG_DRIVER=1` and the identity selector unset
- **THEN** the returned session is the synthesized `dev-test-viewer` session
- **AND** no Google OAuth handshake occurs

#### Scenario: Bypass active, identity set to guest, yields no session

- **WHEN** a server component calls zero-argument `auth()` with `USE_PG_DRIVER=1` and the identity selector set to the guest value
- **THEN** `auth()` resolves to `null` (a logged-out request)

#### Scenario: Identity selector is not fixed to a single user

- **WHEN** the identity selector names a seeded user id other than the default
- **THEN** the synthesized session represents that user id
- **AND** the harness does not require code changes to support an additional seeded identity

#### Scenario: Deployed configuration keeps real auth

- **WHEN** the app runs with `USE_PG_DRIVER` unset
- **THEN** zero-argument `auth()` delegates to real NextAuth and the bypass is inert
- **AND** this holds regardless of any other environment variable

### Requirement: E2E SHALL execute against a production build, not the dev server

The e2e harness SHALL run the application as a production build served by `next start`, NOT by `next dev`, so that the `'use cache'` directive and `revalidateTag` / `updateTag` invalidation layer are genuinely exercised. The production bundle SHALL be built once per suite run and reused across the harness's server modes rather than rebuilt per mode.

#### Scenario: Harness serves a production build

- **WHEN** the e2e suite starts its application server(s)
- **THEN** each server runs a `next start` production build (not `next dev`)

#### Scenario: Tag revalidation is observable after a same-server write

- **WHEN** an e2e flow performs a mutation that calls `revalidateTag(...)` and then reloads a page reading the affected tag **on the same server**
- **THEN** the reload reflects the mutation
- **AND** the suite does not rely on `next dev`'s cache behavior to make this true

### Requirement: The harness SHALL provide bypassed and unauthenticated server modes as separate processes

Because the bypass is process-wide (no per-request seam), an authenticated viewer and a logged-out guest SHALL be served by **separate** server processes, exposed as separate Playwright projects sharing one local Docker DB: an authenticated mode (identity = a seeded user) and a guest mode (no session). The harness SHALL be structured so that an additional server mode for a different seeded identity can be added as configuration. Each server process holds its own in-memory cache/tag store, so cross-process freshness is NOT guaranteed; specs consuming this harness SHALL assert only state their own server produced or that the seed established, and SHALL NOT depend on a write made on one server being observed on the other.

#### Scenario: Guest mode reaches a public list with no session

- **WHEN** a spec assigned to the guest project opens a public ("Shared") list by URL
- **THEN** the page renders for the unauthenticated caller
- **AND** no session is present

#### Scenario: Authenticated mode renders a protected page with no sign-in step

- **WHEN** a spec assigned to the authenticated project opens a protected page
- **THEN** the page renders as the seeded identity without any sign-in interaction

#### Scenario: Cross-process observation is not assumed

- **WHEN** a spec writes state on the guest server
- **THEN** it SHALL NOT assert that write is visible on the authenticated server (or vice versa)
- **AND** any owner/observer assertion uses seeded state or same-server state instead

### Requirement: The local e2e database SHALL be schema-applied by `drizzle-kit push` and populated by the canonical seed-as-fixture

The Docker e2e database SHALL receive its schema via `drizzle-kit push` (schema derived directly from `db/schema.ts`, no migration replay), and SHALL be populated by invoking the canonical seed (`scripts/seed-dev-users.ts`) through the same `USE_PG_DRIVER` path (`USE_PG_DRIVER=1 DATABASE_URL=<local> ...`) so the seed reaches the local DB via the one driver-switch. Before the e2e suite runs, the database SHALL be reset to the canonical fixture — `db:reset:dev`, which cascade-wipes seeded-owned rows then reseeds — so every run starts from a byte-identical known state regardless of any prior run's writes on a persisted database. The shared bring-up (`setup-e2e-db.sh`) SHALL apply schema only and SHALL NOT itself reset: the data-state step belongs to each caller, so `dev:local` seeds without wiping (preserving UI-created rows; reset there stays the explicit `db:reset:dev` opt-in) while `test:e2e` resets. The container's credentials SHALL be committed, non-secret, localhost-bound test values.

#### Scenario: Schema applied from source via push

- **WHEN** the e2e database is prepared
- **THEN** its schema is applied with `drizzle-kit push` from `db/schema.ts`
- **AND** the run does not depend on replaying the committed migration files

#### Scenario: Seed reaches the local DB through the driver-switch

- **WHEN** the seed is invoked with `USE_PG_DRIVER=1` and `DATABASE_URL` pointing at the local container
- **THEN** the seeded fixture rows are written to the local Postgres
- **AND** no separate test-only DB client is required to seed it

#### Scenario: The e2e suite starts from a deterministic reset

- **WHEN** the e2e run is prepared (`test:e2e`)
- **THEN** the database is reset to the canonical fixture (cascade wipe + reseed) before any spec executes
- **AND** the starting state does not depend on rows written by a prior run on a persisted database

#### Scenario: Local dev bring-up preserves UI-created rows

- **WHEN** `dev:local` brings up the local database
- **THEN** it seeds the canonical fixture without wiping
- **AND** rows a developer created through the UI survive the restart (reset stays the explicit `db:reset:dev` opt-in)

### Requirement: CI SHALL run e2e in a fork-safe per-PR tier and a secret-bearing pre-promote migration tier

Continuous integration SHALL run the Playwright e2e suite in two tiers: (1) a **per-PR** job that stands up a local Postgres sidecar, applies schema via `drizzle-kit push`, resets to the canonical fixture (cascade wipe + reseed), and runs the suite using only committed non-secret test credentials — so it runs on fork pull requests; and (2) a **pre-promote** job on trusted branches that creates an **ephemeral branch of the production Neon project** (copy-on-write — production data and schema are never mutated, and the branch is deleted afterward), runs `drizzle-kit migrate` against that branch, then resets and re-seeds the canonical test fixture onto it and exercises a representative set of DAL reads through the **production `neon-http` driver** (`USE_PG_DRIVER` unset). Branching production rather than a from-scratch database is deliberate: it validates the pending migrations against production's *actual* applied-migration state and schema, catching a migration production is missing or hand-applied drift that a clean database cannot surface; seeding test data first ensures CI never reads real users' production data. This tier is the sole CI guard for migration-replay correctness against the real schema and for production-driver (`neon-http`) divergence. It validates migration *replay* via `drizzle-kit migrate`; it SHALL NOT be construed as validating the production migration-apply mechanism itself (e.g. a manual SQL run against production), which uses a different apply path and is outside this capability's scope. It requires a Neon API secret and SHALL be skipped where that secret is unavailable (e.g. fork PRs). Once the per-PR tier exists, the descriptive note in `openspec/config.yaml` and this capability stating "CI does not currently run Playwright" SHALL be corrected.

#### Scenario: Per-PR e2e runs without secrets

- **WHEN** a pull request (including one from a fork) triggers CI
- **THEN** the per-PR e2e job runs the suite against a sidecar Postgres using only committed non-secret credentials
- **AND** it does not require any repository secret

#### Scenario: Pre-promote gate validates migrations against the production schema

- **WHEN** a push targets a promotion branch (e.g. `dev` or a `release-*.*.x` release branch) with the Neon API secret available
- **THEN** CI creates an ephemeral branch of the production Neon project, runs `drizzle-kit migrate` against it, then re-seeds the test fixture and reads through the `neon-http` driver, and deletes the branch
- **AND** a migration that fails to replay against the production schema, or a read that fails through the production driver, fails the gate
- **AND** production data and schema are never mutated

#### Scenario: Pre-promote gate is skipped without the secret

- **WHEN** CI runs in a context lacking the Neon API secret (e.g. a fork PR)
- **THEN** the pre-promote migration gate is skipped rather than failing
- **AND** the per-PR e2e tier still runs

### Requirement: The PWA/offline e2e specs SHALL be authored against the foundation harness and recorded as Tier 2 bookkeeping

This carve-out (sub-proposal 6.2) SHALL author the PWA/offline `e2e/*.spec.ts` specs (service worker registration, install-detection surface, offline never-cache-HTML + precache behavior, kill-switch, and the safe-area/top-bar regression set) against the e2e execution harness owned by `test-e2e-foundation` (sub-proposal 6.0), in the authenticated session mode. The flow-level contract lives in the `e2e-pwa-offline` capability spec; the drift corrections and latent-invariant elevations live in the `pwa-shell` delta. The e2e *execution* model (local DB target, `next start` server mode, the two session modes, CI tiers) is `test-e2e-foundation`'s Tier-1 contribution to `testing-foundation`, NOT this carve-out's. THIS requirement is archive-only carve-out bookkeeping (Tier 2 per `test-coverage` design D13) and SHALL NOT roll into the parent `testing-foundation` accumulator.

This carve-out SHALL NOT reshape `playwright.config.ts`'s execution-model design, choose the DB driver/target, or define new e2e CI jobs (all owned by 6.0). It SHALL contribute NO per-file unit coverage and SHALL NOT alter `vitest.config.ts` thresholds (e2e is the integration tier). Install detection SHALL be asserted at the criteria level only — no `beforeinstallprompt` synthesis and no external service calls.

The seed negative-case audit for THIS carve-out's fixtures SHALL be recorded with its disposition: for each required fixture (any route rendering for the seeded viewer; a seeded list page to visit before going offline; a page where the floating items-pagination overlay renders), the audit SHALL state whether the spec builds its own state, selects defensively against seeded data, or required a `scripts/seed-dev-users.ts` extension carrying the seed-as-fixture review-coupling note.

#### Scenario: PWA/offline specs exist and run under the foundation harness

- **WHEN** this change archives
- **THEN** `e2e/` contains the PWA/offline specs (registration, install surface, offline, kill-switch, safe-area regression set)
- **AND** each runs under the foundation harness's authenticated session mode
- **AND** this carve-out did NOT reshape the harness execution-model design or DB target, nor define new e2e CI jobs

#### Scenario: No unit-coverage change

- **WHEN** this carve-out validates at archive time
- **THEN** `vitest.config.ts` per-file thresholds are unchanged by it

#### Scenario: Seed negative-case audit disposition is recorded

- **WHEN** this carve-out's `tasks.md` records the audit findings
- **THEN** the seed negative-case audit names each required fixture and its disposition (build-own-state, defensive selection, or seed extension)
- **AND** any seed extension is accompanied by the seed-as-fixture review-coupling note

