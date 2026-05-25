## ADDED Requirements

### Requirement: bookmarkList SHALL enforce the "viewable list only" predicate

The existing capability text already states: "A user SHALL be able to bookmark any list whose page they can render (i.e. accessible to them)." This requirement makes that predicate executable on the server side.

`bookmarkList(list_id)` SHALL, after authenticating the caller, load the target list (`columns: { user_id, visibility }`) and reject with `{ success: false, error: 'List not viewable' }` when the caller is not the owner AND `visibility === VISIBILITY.OWNER`. No `list_visits` row SHALL be inserted on the rejection path, and `updateTag('list_visits')` SHALL NOT be invoked.

For `VISIBILITY.LINK` ("Private" / unlisted) and `VISIBILITY.FOLLOWERS` ("Shared") lists, any authenticated caller MAY bookmark — these visibilities are bookmarkable because the read path already permits any caller with the id to render them. If the read path is tightened later (e.g. requiring `shared_to` membership for `VISIBILITY.LINK`), the bookmark gate SHALL be tightened in lockstep.

The rejection error code SHALL be deliberately non-specific (e.g. `'List not viewable'`) so that callers cannot use the response to distinguish "this private list exists" from "this id is invalid".

#### Scenario: Owner-private list cannot be bookmarked by a non-owner

- **WHEN** an authenticated viewer (not the owner) invokes `bookmarkList(privateListId)` against a list whose `visibility = VISIBILITY.OWNER`
- **THEN** the action returns `{ success: false, error: 'List not viewable' }` and no `list_visits` row is inserted or updated

#### Scenario: Owner can bookmark their own private list

- **WHEN** the list owner invokes `bookmarkList(privateListId)` against their own `VISIBILITY.OWNER` list
- **THEN** the action upserts the `list_visits` row with `favorited_at = NOW()` and returns success

#### Scenario: Any authenticated user can bookmark an unlisted or shared list

- **WHEN** an authenticated viewer invokes `bookmarkList(listId)` for a list whose `visibility` is `VISIBILITY.LINK` or `VISIBILITY.FOLLOWERS`
- **THEN** the action upserts the `list_visits` row with `favorited_at = NOW()` and returns success (matching the existing "any list whose page they can render" clause)

#### Scenario: Bookmark rejection does not invalidate cache tags

- **WHEN** a `bookmarkList` call returns `{ success: false, error: 'List not viewable' }`
- **THEN** the action SHALL NOT have called `updateTag('list_visits')` during that invocation
