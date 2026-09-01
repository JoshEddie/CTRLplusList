## MODIFIED Requirements

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
8. **The onboarding gate** — for each of the two un-onboarded seeded identities `profiles-data-model` provides, requesting a page renders the gate instead of that page, the gate survives a reload and offers no route out, and activating cancel on the identity holding no membership raises the deletion confirmation. This flow SHALL NOT submit the gate and SHALL NOT confirm the deletion: both are irreversible against a shared seeded database and would consume the fixture for every later run. Minting, atomicity and the deletion itself are covered by tests over the action, which can supply their own rows; what only a browser can prove is that the gate actually replaces the application and cannot be escaped.
9. **An owner sets a member's claim-visibility baseline** — an owner opens a seeded managed profile's Settings panel, changes another member's baseline, and the change is reflected on re-navigation; acting as that member, the corresponding list renders at the new baseline. This flow SHALL assert the effect on the member's rendered list and not only on the control, because the failure mode it covers — a baseline written but never resolved by the item read, or resolved from the acting profile rather than the membership — leaves the control looking correct.
10. **Claim visibility crosses the acting-profile boundary** — an account holding a membership on a seeded managed profile, while acting as a *different* profile, opens a list the managed profile owns and finds it rendered at their membership's baseline rather than as a stranger would see it, with the inline switch offer present. This is the exposure the change exists to close, and only a browser holding a real selection cookie can prove it: every layer beneath resolves the same either way.

A spec that needs a *starting* acting profile other than the self-profile SHALL establish it by setting the same selection cookie the application sets, on its own browser context. There SHALL be no environment override for the acting profile: an environment variable is process-global and cannot give one spec a managed-profile context and another the self-profile. A context carrying no selection cookie already resolves to the self-profile, so the un-pinned starting state needs no mechanism of its own — and flow 7 SHALL take exactly that path, so the switching mechanism itself stays exercised rather than bypassed.

Invite-time claim visibility is deliberately **not** listed here. Redemption is single-use against a shared seeded database, so a spec driving it would consume its fixture for every later run — the same constraint that keeps flow 8 from submitting the gate. The pre-fill and the written baseline are covered by tests over the redemption action, which can supply their own invite; what the admission flow proves in a browser is owned by the admission requirement below.

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

#### Scenario: The gate replaces the page that was requested

- **WHEN** an un-onboarded seeded identity requests a page inside the application frame
- **THEN** the onboarding gate renders and the requested page's content does not

#### Scenario: The gate offers no route out

- **WHEN** the gate is showing and the spec reloads the page, activates the backdrop, and presses Escape
- **THEN** the gate is still showing after each, and no close control is present

#### Scenario: Cancel on a fresh sign-up raises the confirmation and stops there

- **WHEN** the un-onboarded identity holding no membership activates cancel
- **THEN** the deletion confirmation renders
- **AND** the spec declines it, so no account is deleted and the fixture survives the run

#### Scenario: An owner-set baseline reaches the member's rendered list

- **WHEN** an owner changes a seeded member's claim-visibility baseline in the managed profile's Settings panel
- **THEN** the control reflects the change on re-navigation
- **AND** a context acting as that member renders the profile's list at the new baseline

#### Scenario: A member acting as another profile is protected by their membership

- **WHEN** a context whose selection cookie names profile A opens a list owned by profile B, on which that account holds a membership whose baseline is the fully protected state
- **THEN** no claim on the list is disclosed
- **AND** the inline offer to switch to B renders

#### Scenario: A spec needing a non-default acting profile pins it by cookie

- **WHEN** a spec requires its browser context to start out acting as a profile other than the viewer's self-profile
- **THEN** it sets the application's own selection cookie on that context, and no environment variable governs the acting profile

#### Scenario: Dropping a flow fails the suite

- **WHEN** a future change removes or skips the spec covering any listed flow
- **THEN** the corresponding e2e coverage is absent and this requirement is violated
