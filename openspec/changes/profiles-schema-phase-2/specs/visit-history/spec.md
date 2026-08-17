## ADDED Requirements

### Requirement: `list_visits` SHALL stay keyed by account, not by profile

A visit and a bookmark record what a **human** did, not what a list-owning identity did, so `list_visits` SHALL keep its composite primary key of `(user_id, list_id)` and SHALL NOT gain a profile-valued column. Its `user_id` is an actor column and SHALL be compared and written with an account id, per `server-endpoint-authorization`'s rule that an identity is compared only against a column of its own kind.

This boundary is recorded here so that later work reads it from the spec rather than inferring it from the absence of a column. Every read keyed on `list_visits` — the bookmarks and visit-history reads, and the home digest's Bookmarks and Recently visited rails — therefore stays account-keyed and is unaffected by the introduction of profile-valued ownership elsewhere.

#### Scenario: Visit rows stay account-keyed

- **WHEN** the `list_visits` table is inspected after the profile columns are added to the content and social tables
- **THEN** its primary key is still `(user_id, list_id)` and it carries no profile-valued column

#### Scenario: Bookmark and history reads resolve by account

- **WHEN** the bookmarks read, the visit-history read, or the home digest's Bookmarks or Recently visited rail resolves the viewer's rows
- **THEN** it matches `list_visits.user_id` against the viewer's account id, not against any profile id

## MODIFIED Requirements

### Requirement: bookmarkList SHALL enforce the "viewable list only" predicate

The existing capability text already states: "A user SHALL be able to bookmark any list whose page they can render (i.e. accessible to them)." This requirement makes that predicate executable on the server side.

`bookmarkList(list_id)` SHALL, after authenticating the caller, load the target list (its owning profile and its `visibility`) and reject with `{ success: false, error: 'List not viewable' }` when the list's owning profile is not the profile the caller's request acts as AND `visibility === VISIBILITY.OWNER`. The owner comparison is between profile ids; the row written on the success path is still keyed by the caller's **account** id, because `list_visits` stays account-keyed. No `list_visits` row SHALL be inserted on the rejection path, and `updateTag('list_visits')` SHALL NOT be invoked.

For `VISIBILITY.LINK` ("Private" / unlisted) and `VISIBILITY.FOLLOWERS` ("Shared") lists, any authenticated caller MAY bookmark — these visibilities are bookmarkable because the read path already permits any caller with the id to render them. If the read path is tightened later (e.g. requiring `shared_to` membership for `VISIBILITY.LINK`), the bookmark gate SHALL be tightened in lockstep.

The rejection error code SHALL be deliberately non-specific (e.g. `'List not viewable'`) so that callers cannot use the response to distinguish "this private list exists" from "this id is invalid".

#### Scenario: Owner-private list cannot be bookmarked by a non-owner

- **WHEN** an authenticated viewer whose profile is not the list's owning profile invokes `bookmarkList(privateListId)` against a list whose `visibility = VISIBILITY.OWNER`
- **THEN** the action returns `{ success: false, error: 'List not viewable' }` and no `list_visits` row is inserted or updated

#### Scenario: Owner can bookmark their own private list

- **WHEN** the account whose profile owns the list invokes `bookmarkList(privateListId)` against their own `VISIBILITY.OWNER` list
- **THEN** the action upserts the `list_visits` row keyed by that account and returns success

#### Scenario: Any authenticated user can bookmark an unlisted or shared list

- **WHEN** an authenticated viewer invokes `bookmarkList(listId)` for a list whose `visibility` is `VISIBILITY.LINK` or `VISIBILITY.FOLLOWERS`
- **THEN** the action upserts the `list_visits` row with `favorited_at = NOW()` and returns success (matching the existing "any list whose page they can render" clause)

#### Scenario: Bookmark rejection does not invalidate cache tags

- **WHEN** a `bookmarkList` call returns `{ success: false, error: 'List not viewable' }`
- **THEN** the action SHALL NOT have called `updateTag('list_visits')` during that invocation

### Requirement: Migration SHALL promote saved lists to bookmarks and leave the source table dormant

The migration introducing `list_visits` SHALL insert one `list_visits` row per `saved_lists` row with `favorited_at = NOW()`, `last_visited_at = NOW()`, and `visit_count = 0`. The `saved_lists` table SHALL remain in the database after that data copy; that migration SHALL NOT drop it. App code SHALL stop reading and writing `saved_lists` after that change.

The dormant table SHALL then be **dropped**, together with its Drizzle definition and relations. It has been dormant since `list_visits` replaced it, with no read and no write anywhere in application code, so it is dropped rather than carried forward or given a profile-valued column of its own.

#### Scenario: Saved list becomes a bookmark

- **WHEN** the promoting migration runs against a `saved_lists` row `(user_id=U, list_id=L)`
- **THEN** a `list_visits` row exists for `(U, L)` with `favorited_at` and `last_visited_at` set to the migration time, `visit_count = 0`

#### Scenario: Source row preserved

- **WHEN** the promoting migration completes
- **THEN** the original `saved_lists` row `(U, L)` still exists, untouched

#### Scenario: Row count parity

- **WHEN** the promoting migration completes
- **THEN** `count(list_visits WHERE favorited_at IS NOT NULL) = count(saved_lists)`

#### Scenario: App stops referencing saved_lists

- **WHEN** an app-code grep is run after the promoting change is implemented
- **THEN** no application code (under `app/` or `lib/`) reads from or writes to `saved_lists`

#### Scenario: New bookmarks do not propagate to saved_lists

- **WHEN** a user bookmarks a list while the dormant table still exists
- **THEN** a `list_visits` row is upserted with `favorited_at` set, and `saved_lists` is NOT modified

#### Scenario: Dormant table is dropped

- **WHEN** the drop migration completes
- **THEN** the `saved_lists` table no longer exists, its Drizzle definition and relations are gone from `db/schema.ts`, and the only remaining references are in historical migration SQL
