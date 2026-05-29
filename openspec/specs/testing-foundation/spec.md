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

