## MODIFIED Requirements

### Requirement: List owners SHALL set visibility via a three-item radio menu

The list visibility UI SHALL present a popover triggered by a single visibility pill containing exactly three radio-style menu items, one per enum value. The UI labels SHALL be **Hidden** (→ `VISIBILITY.OWNER`), **Private** (→ `VISIBILITY.LINK`), and **Shared** (→ `VISIBILITY.FOLLOWERS`). Each menu row SHALL render an icon, the label, and a one-line description; the currently-selected row SHALL render a trailing `✓` indicator and SHALL have `aria-checked="true"`. Selecting a row invokes `setListVisibility(id, visibility)` with the canonical constant the row maps to. Only the list owner SHALL be authorized to change visibility.

The trigger pill SHALL display the currently-selected row's label verbatim (no qualifier suffix) alongside an icon (`🔒` for `VISIBILITY.OWNER`, `🔗` for `VISIBILITY.LINK`, `👥` for `VISIBILITY.FOLLOWERS`). The pill's `aria-label` SHALL include the row's description for assistive-technology disambiguation.

The toast emitted on a successful visibility change SHALL match the destination label: "List is now hidden" for `VISIBILITY.OWNER`, "Anyone with the link can view" for `VISIBILITY.LINK`, "Visible to your followers" for `VISIBILITY.FOLLOWERS`.

#### Scenario: Owner sees three radio menu items

- **WHEN** an authenticated owner opens the visibility popover for their list
- **THEN** a menu renders with exactly three radio items in order — Hidden, Private, Shared — and the item matching the current `visibility` value has `aria-checked="true"` and a trailing `✓` indicator

#### Scenario: Each row carries icon, label, and description

- **WHEN** the visibility menu is rendered
- **THEN** the Hidden row shows `🔒 Hidden` with description "Only you can see this list"; the Private row shows `🔗 Private` with description "Anyone with the link can view"; the Shared row shows `👥 Shared` with description "Visible to your followers"

#### Scenario: Selecting Hidden sets owner-only visibility

- **WHEN** the owner activates the Hidden row
- **THEN** `setListVisibility(id, VISIBILITY.OWNER)` is invoked

#### Scenario: Selecting Private sets link-only visibility

- **WHEN** the owner activates the Private row
- **THEN** `setListVisibility(id, VISIBILITY.LINK)` is invoked

#### Scenario: Selecting Shared sets followers-feed visibility

- **WHEN** the owner activates the Shared row
- **THEN** `setListVisibility(id, VISIBILITY.FOLLOWERS)` is invoked

#### Scenario: Trigger pill label matches selected row

- **WHEN** the list's current visibility is `VISIBILITY.LINK`
- **THEN** the visibility pill renders the icon `🔗` and the label `Private` (no `·`-qualifier)

#### Scenario: Re-selecting the current row is a no-op

- **WHEN** the owner activates the row whose value already matches the list's current visibility
- **THEN** no `setListVisibility` call is made (the picker treats it as a no-op, consistent with the existing `apply` early-return in `VisibilityPicker.tsx`)

#### Scenario: Successful change to Hidden emits the hidden toast

- **WHEN** an owner successfully changes a list's visibility to `VISIBILITY.OWNER`
- **THEN** the toast text reads "List is now hidden"

#### Scenario: Non-owner submission is rejected

- **WHEN** a `setListVisibility` request is made by a non-owner
- **THEN** the action returns an unauthorized response and `lists.visibility` is unchanged

## ADDED Requirements

### Requirement: Code SHALL reference list visibility identities via the `VISIBILITY` constants module

Every reference to a list-visibility identity in `app/`, `lib/`, or `scripts/` SHALL use one of `VISIBILITY.OWNER`, `VISIBILITY.LINK`, or `VISIBILITY.FOLLOWERS` exported from `lib/visibility.ts`. String literals corresponding to legacy DB values (`'private'`, `'unlisted'`, `'public'`) and to canonical DB values (`'owner'`, `'link'`, `'followers'`) SHALL NOT appear outside `lib/visibility.ts` itself. The `ListVisibility` type SHALL be the union derived from the constants module; functions and components that accept or compare visibility values SHALL type them as `ListVisibility`.

`lib/dal.ts` SHALL be the sole boundary that observes raw DB strings. Every DAL function that returns a row containing `visibility` SHALL normalize that column via `fromDb(...)` before the row escapes the DAL; consumers (server actions, page components, helpers) SHALL only ever see canonical `ListVisibility` values. WHERE-clause filters on `lists.visibility` SHALL use `visibilityDbValues([...])` to expand a set of canonical values into all DB-string forms (legacy and canonical), so a single filter matches rows regardless of whether the row was written under the legacy or canonical naming.

The `fromDb` decoder SHALL accept both legacy strings (`'private' | 'unlisted' | 'public'`) and canonical strings (`'owner' | 'link' | 'followers'`) as input, mapping each to the corresponding `VISIBILITY` constant. The tolerance of the canonical branches is required so that production deploys carrying this requirement are already equipped to decode canonical values before any code is written that produces them.

#### Scenario: Codebase contains no raw visibility literals outside the module

- **WHEN** an automated grep is run for `'private'`, `'unlisted'`, `'public'`, `'owner'`, `'link'`, or `'followers'` across `app/`, `lib/`, and `scripts/`
- **THEN** the only matches are inside `lib/visibility.ts`, plus any in pre-existing strings unrelated to list visibility (e.g. "public" in an unrelated copy block) verified by surrounding context

#### Scenario: DAL normalizes visibility on read

- **WHEN** a DAL function (e.g. `getList`, `getListsByUser`, any function returning rows containing `lists.visibility`) returns a row
- **THEN** the row's `visibility` field is one of the values in `VISIBILITY` (typed as `ListVisibility`), not a raw DB string

#### Scenario: DAL filter expands canonical values to DB forms

- **WHEN** a DAL query filters `lists.visibility` using `visibilityDbValues([VISIBILITY.LINK, VISIBILITY.FOLLOWERS])`
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
