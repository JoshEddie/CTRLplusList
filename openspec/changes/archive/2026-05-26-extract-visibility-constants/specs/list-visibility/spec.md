## ADDED Requirements

### Requirement: Code SHALL reference list visibility identities via the `VISIBILITY` constants module

Every reference to a list-visibility identity in non-test source under `app/`, `lib/`, or `scripts/` SHALL use one of `VISIBILITY.OWNER`, `VISIBILITY.LINK`, or `VISIBILITY.FOLLOWERS` exported from `lib/visibility.ts`. String literals corresponding to legacy DB values (`'private'`, `'unlisted'`, `'public'`) and to canonical DB values (`'owner'`, `'link'`, `'followers'`) SHALL NOT appear in non-test source outside `lib/visibility.ts` itself. The `ListVisibility` type SHALL be the union derived from the constants module; functions and components that accept or compare visibility values SHALL type them as `ListVisibility`.

The data layer under `lib/data/` SHALL be the translation boundary that decodes raw DB strings. Data-layer reads that return a row containing `visibility` SHALL normalize that column via `fromDb(...)` — through the `withVisibility` helper in `lib/data/list.ts` — before the row reaches page or component consumers, which then see canonical `ListVisibility` values. Any code that reads the raw `lists.visibility` column directly SHALL decode it via `fromDb(...)` (or `resolveListVisibility(...)`) before comparing it to a `VISIBILITY` constant; a raw DB string SHALL NOT be compared to a canonical constant without decoding. WHERE-clause filters on `lists.visibility` SHALL use `visibilityDbValues([...])` to expand a set of canonical values into all DB-string forms (legacy and canonical), so a single filter matches rows regardless of whether the row was written under the legacy or canonical naming.

The `fromDb` decoder SHALL accept both legacy strings (`'private' | 'unlisted' | 'public'`) and canonical strings (`'owner' | 'link' | 'followers'`) as input, mapping each to the corresponding `VISIBILITY` constant. The tolerance of the canonical branches is required so that production deploys carrying this requirement are already equipped to decode canonical values before any code is written that produces them.

#### Scenario: Non-test source contains no raw visibility literals outside the module

- **WHEN** an automated grep is run for `'private'`, `'unlisted'`, `'public'`, `'owner'`, `'link'`, or `'followers'` across non-test source in `app/`, `lib/`, and `scripts/` (excluding `__tests__/` and `*.test.*`)
- **THEN** the only matches are inside `lib/visibility.ts`, plus any in pre-existing strings unrelated to list visibility (e.g. "public" in an unrelated copy block) verified by surrounding context

#### Scenario: Data layer normalizes visibility on read

- **WHEN** a `lib/data/` read that returns rows containing `lists.visibility` returns a row (e.g. the list reads wrapped by `withVisibility` in `lib/data/list.ts`)
- **THEN** the row's `visibility` field is one of the values in `VISIBILITY` (typed as `ListVisibility`), not a raw DB string

#### Scenario: Raw-column read decodes before comparison

- **WHEN** code reads the raw `lists.visibility` column directly (e.g. `lib/listAccess.ts`, `lib/data/list.actions.ts`, `lib/data/visit.actions.ts`)
- **THEN** it decodes the value via `fromDb(...)` (or `resolveListVisibility(...)`) before comparing it to a `VISIBILITY` constant

#### Scenario: DAL filter expands canonical values to DB forms

- **WHEN** a `lib/data/` query filters `lists.visibility` using `visibilityDbValues([VISIBILITY.LINK, VISIBILITY.FOLLOWERS])`
- **THEN** the resulting `inArray` filter matches rows stored as either legacy strings (`'unlisted'`, `'public'`) or canonical strings (`'link'`, `'followers'`), so a single query is correct regardless of mid-rollout DB state

#### Scenario: Decoder accepts legacy DB strings

- **WHEN** `fromDb('private')` is called
- **THEN** the result is `VISIBILITY.OWNER`

- **WHEN** `fromDb('unlisted')` is called
- **THEN** the result is `VISIBILITY.LINK`

- **WHEN** `fromDb('public')` is called
- **THEN** the result is `VISIBILITY.FOLLOWERS`

#### Scenario: Decoder accepts canonical DB strings

- **WHEN** `fromDb('owner')` is called
- **THEN** the result is `VISIBILITY.OWNER`

- **WHEN** `fromDb('link')` is called
- **THEN** the result is `VISIBILITY.LINK`

- **WHEN** `fromDb('followers')` is called
- **THEN** the result is `VISIBILITY.FOLLOWERS`

#### Scenario: Decoder rejects unknown strings

- **WHEN** `fromDb('some-unexpected-value')` is called
- **THEN** the function throws a descriptive error naming the unknown value (signaling a data-integrity bug, since the column is enum-constrained)

#### Scenario: Server action validates via constants-derived zod schema

- **WHEN** `setListVisibility` validates its `visibility` parameter
- **THEN** the validation is `z.enum(VISIBILITY_VALUES)` where `VISIBILITY_VALUES` is the readonly tuple of values from the constants module, NOT a hand-typed string-literal tuple

#### Scenario: Mutation writes a canonical constant value

- **WHEN** `setListVisibility` executes the UPDATE on `lists.visibility`
- **THEN** the written value is the verbatim value of a `VISIBILITY` constant (in Stage 1 this is a legacy DB string; in subsequent stages the same source line writes the canonical string with no code change at the call site)
