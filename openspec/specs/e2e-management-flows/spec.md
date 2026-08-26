# e2e-management-flows Specification

## Purpose

TBD - created by archiving change expand-e2e-flow-coverage. Update Purpose after archive.

## Requirements

### Requirement: Management flows SHALL be covered by end-to-end tests

The repository SHALL maintain Playwright specs under `e2e/` that exercise each of the following management flows through the running application against the seeded development database. Each flow SHALL be covered by at least one spec that drives real user-visible affordances (by role, accessible name, label, or visible text) and asserts an observable outcome — rendered content, persisted state reflected on reload or re-navigation, or navigation — NOT mere execution. Removing or disabling coverage of any listed flow SHALL be a violation of this requirement.

The covered flows SHALL be:

1. **Item CRUD** — an item is created through the item-creation form, renders in the items library, is edited (the change renders), is archived (it leaves the active library view and appears in the archived view), and is deleted (it is gone from both views). This pins the `items` cache-tag loop on the library side and exercises the item-association sync paths (the created item carries at least one store price).
2. **Follow / unfollow** — the viewer follows a seeded not-yet-followed user through the Follow affordance, the followed user is reflected on the Following surface, then the viewer unfollows and the removal is reflected. This pins the `user_follows` cache-tag loop.
3. **Remove follower** — the viewer removes a seeded one-way follower from the Connections followers section and the row disappears.
4. **Block / unblock** — the viewer blocks a seeded one-way follower from the Connections followers section, the user appears in the Blocked section and leaves the Followers section; the viewer unblocks, the user leaves the Blocked section and remains out of Followers (block severs follow edges; unblock does not restore them). This pins the `user_blocks` cache-tag loop.
5. **Bookmark / unbookmark** — the viewer bookmarks a seeded viewable non-bookmarked list, the list appears on the bookmarks page and the home Bookmarks rail, then the viewer unbookmarks and the removal is reflected. This pins the `list_visits` cache-tag loop.
6. **Visit history** — visiting a list surfaces it as the most recent entry on the visit-history page (recency proves the in-run visit write, since the seeded visit for the target list is older).
7. **Profile switch** — the viewer switches from their self-profile to a seeded profile they run, through a real switching affordance, and `/lists` re-renders as that profile's collection; the viewer switches back and `/lists` is their own again. This flow SHALL drive the switch through the UI rather than by pinning the selection, and SHALL assert the profile-scoped surface across the switch, because the failure mode it covers — a call site resolving the self-profile where it owes the active one, or the reverse — is invisible to a unit test holding a mocked session.

A spec that needs a *starting* acting profile other than the self-profile SHALL establish it by setting the same selection cookie the application sets, on its own browser context. There SHALL be no environment override for the acting profile: an environment variable is process-global and cannot give one spec a managed-profile context and another the self-profile. A context carrying no selection cookie already resolves to the self-profile, so the un-pinned starting state needs no mechanism of its own — and flow 7 SHALL take exactly that path, so the switching mechanism itself stays exercised rather than bypassed.

#### Scenario: Item CRUD arc is covered end-to-end

- **WHEN** the suite creates a per-run-uniquely-named item with at least one store price, then edits, archives, and deletes it through the library affordances
- **THEN** each step asserts its observable result: the created item renders in the active library view, the edit renders, archiving moves it to the archived view, and deletion removes it from both views

#### Scenario: Follow then unfollow round-trips through the real action boundary

- **WHEN** the seeded viewer follows a seeded user with no prior follow edge and then unfollows them
- **THEN** after following, the Follow affordance reflects the following state and the user is present on the Following surface
- **AND** after unfollowing, the removal is reflected

#### Scenario: Block severs and unblock does not restore

- **WHEN** the viewer blocks a seeded one-way follower and later unblocks them
- **THEN** while blocked, the user is listed in the Blocked section and absent from the Followers section
- **AND** after unblocking, the user leaves the Blocked section and remains absent from Followers

#### Scenario: Bookmark appears on bookmark surfaces and unbookmark removes it

- **WHEN** the viewer bookmarks a seeded viewable list that the seed left non-bookmarked
- **THEN** the list appears on the bookmarks page and on the home Bookmarks rail
- **AND** after unbookmarking, the list no longer appears on the bookmarks page

#### Scenario: A visit surfaces in visit history by recency

- **WHEN** the viewer opens a seeded list whose seeded visit timestamp is in the past
- **THEN** the visit-history page shows that list as the most recent entry

#### Scenario: A switch re-renders the profile-scoped collection

- **WHEN** the viewer, starting un-pinned on their self-profile, switches through a real switching affordance to a seeded profile they run, and loads `/lists`
- **THEN** `/lists` renders that profile's lists rather than the viewer's own
- **AND** after switching back, `/lists` renders the viewer's own again

#### Scenario: A spec needing a non-default acting profile pins it by cookie

- **WHEN** a spec requires its browser context to start out acting as a profile other than the viewer's self-profile
- **THEN** it sets the application's own selection cookie on that context, and no environment variable governs the acting profile

#### Scenario: Dropping a flow fails the suite

- **WHEN** a future change removes or skips the spec covering any listed flow
- **THEN** the corresponding e2e coverage is absent and this requirement is violated

### Requirement: Each home rail SHALL have its own e2e content signal

The suite SHALL assert, for each of the four home rails (My Lists, Following, Bookmarks, Recently visited), that the rail region renders at least one content card and does not render the rail's empty state. Each rail renders inside its own `<Suspense>` boundary, so without a per-rail assertion a crashed or silently-empty rail read passes any whole-page assertion. The assertions SHALL be scoped to the rail's own region and SHALL NOT depend on rail ordering, the rail item cap, or specific entity names that other specs' writes can displace.

#### Scenario: Every rail read is pinned against silent failure

- **WHEN** the suite loads the home page as the seeded viewer
- **THEN** for each of the four rails, the rail's region contains at least one rendered card and not the rail's empty-state text

#### Scenario: Rail assertions are order-independent

- **WHEN** other specs in the same run have created lists or toggled follows/bookmarks before the home-rail spec executes
- **THEN** the rail assertions still pass, because they assert region-scoped presence of content rather than specific names or positions

### Requirement: Management-flow specs SHALL run authenticated and end at seed-equivalent state or with documented contained residue

All management-flow specs SHALL run under the authenticated session mode of the foundation harness (single server process, so the cross-process freshness rule is satisfied by construction) and SHALL NOT redefine harness mechanics. Each mutating flow SHALL end at seed-equivalent state (create→delete, follow→unfollow, bookmark→unbookmark, switch→switch back) wherever the UI permits restoration. Where restoration is structurally impossible from the viewer's UI (remove-follower and block sever an edge only the other user could recreate; a switch stamps the membership's last-acted-as timestamp, which no affordance unsets), the spec SHALL select a target whose loss no other spec observes, and SHALL document the residue in the spec file. No spec SHALL assert another spec's leftover state, and no spec SHALL create a visit row for the seeded user reserved as having zero visit history.

The switch flow SHALL NOT switch to the seeded membership the seed leaves with a NULL last-acted-as timestamp. That NULL is the fixture for the never-acted-as ordering branch `profiles-data-model` seeds, and stamping it would consume the fixture for every later run against the same database.

#### Scenario: Flows restore the seed where the UI permits

- **WHEN** a management-flow spec that can restore its target state completes
- **THEN** the entities it mutated are back at their seeded state (the created item is deleted, the followed user is unfollowed, the bookmarked list is unbookmarked, the acting profile is back to the viewer's self-profile)

#### Scenario: Irreversible mutations are contained and documented

- **WHEN** a spec performs a mutation the viewer's UI cannot reverse (remove follower, block, the last-acted-as stamp a switch leaves)
- **THEN** the target is one whose altered state no other spec asserts
- **AND** the spec file documents the residual state for future spec authors

#### Scenario: The never-acted-as fixture survives the switch flow

- **WHEN** the switch flow selects the profile it switches to
- **THEN** it is not the membership the seed leaves with a NULL last-acted-as timestamp

#### Scenario: The zero-visit-history seed invariant is preserved

- **WHEN** any management-flow spec navigates to lists
- **THEN** it does not visit a list owned by the seeded user that the seed reserves as having zero `list_visits` rows
