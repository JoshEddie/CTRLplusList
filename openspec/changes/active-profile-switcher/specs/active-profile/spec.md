## Purpose

Defines the profile a request acts as: how it is selected, persisted and re-verified, what it governs (creating and owning content) as against what stays bound to the human behind it (claims, feeds, connections, blocks), and the surfaces through which a viewer changes it.

## ADDED Requirements

### Requirement: The active profile SHALL be a membership the viewer holds, re-verified on every resolution

Every authenticated request SHALL resolve an **active profile** — the profile that request acts as. The active profile SHALL be one the viewer holds a `self`, `owner`, or `manager` membership on. Membership SHALL be re-verified server-side on every resolution, against the viewer's current memberships, rather than trusted from whatever carried the selection.

A selection that cannot be honoured SHALL resolve to the viewer's self-profile. This SHALL apply to every cause without distinguishing between them: no selection stored, a selection naming a profile the viewer holds no membership on, a selection naming a profile that no longer exists, and a selection naming an id that never existed. A viewer therefore always acts as some profile, and never acts as one they do not run.

Resolution SHALL be request-scoped, so repeated resolution within one request costs no additional query.

#### Scenario: A held membership resolves as the active profile

- **WHEN** a viewer whose stored selection names a profile they hold an `owner` membership on issues a request
- **THEN** the active profile is that profile

#### Scenario: A revoked membership falls back to self

- **WHEN** a viewer's membership on the profile named by their stored selection has been removed, and they issue a request
- **THEN** the active profile is their self-profile, and the request proceeds with no error

#### Scenario: A forged selection grants no reach

- **WHEN** a request arrives carrying a selection naming a profile the viewer holds no membership on
- **THEN** the active profile is their self-profile, and no read or write is performed against the named profile

#### Scenario: An absent selection resolves to self

- **WHEN** a viewer who has never switched issues a request
- **THEN** the active profile is their self-profile

### Requirement: The active selection SHALL persist per browser for as long as the viewer is signed in

The active selection SHALL survive across requests and across browser restarts for as long as the viewer's session lasts, and SHALL be scoped to the browser that made it — switching in one browser SHALL NOT change what another browser or device is acting as. Signing in SHALL establish the self-profile as the active profile. Signing out SHALL discard the selection, so a subsequent viewer on the same browser does not inherit it.

The selection SHALL NOT be readable or writable by client-side script, and SHALL NOT be written on a read path: resolving a stale or unhonourable selection SHALL fall back to the self-profile without rewriting what is stored.

#### Scenario: The selection survives a browser restart

- **WHEN** a viewer switches to a profile, closes the browser, and returns while still signed in
- **THEN** they are still acting as that profile

#### Scenario: Signing in starts on the self-profile

- **WHEN** a viewer signs in
- **THEN** the active profile is their self-profile

#### Scenario: Signing out discards the selection

- **WHEN** a viewer acting as a managed profile signs out, and another account signs in on the same browser
- **THEN** the second viewer's active profile is their own self-profile

#### Scenario: A stale selection is not rewritten

- **WHEN** a request whose stored selection names a profile the viewer no longer holds a membership on renders a page
- **THEN** the response falls back to the self-profile and does not write a new selection

### Requirement: Switching SHALL be a server action that re-verifies membership, records the switch, and announces itself

Changing the active profile SHALL be a server action taking the target profile. The action SHALL re-verify the viewer's membership on that profile and SHALL reject a target they hold none on, without writing a selection. On success it SHALL store the selection, record the profile as acted-as, and cause the current route to re-render as the new active profile — the viewer SHALL remain on the page they were on rather than being navigated elsewhere.

Every completed switch SHALL raise a transient confirmation naming the profile now being acted as. The confirmation SHALL be raised regardless of which surface initiated the switch, because a switch changes what subsequent pages mean and the surrounding content may change without otherwise saying why.

#### Scenario: Switching re-renders the current route

- **WHEN** a viewer on `/lists` switches to another profile they run
- **THEN** they remain on `/lists`, which now renders that profile's lists

#### Scenario: Switching to a profile the viewer does not run is rejected

- **WHEN** the switch action is invoked with a profile the viewer holds no membership on
- **THEN** it rejects, no selection is stored, and the active profile is unchanged

#### Scenario: A switch is announced

- **WHEN** a viewer completes a switch from any surface
- **THEN** a transient confirmation naming the newly active profile is raised

### Requirement: The active profile SHALL govern creation and ownership, and the self-profile SHALL govern what names the human

The active profile SHALL be the owning profile written on content the request creates, and the identity every ownership comparison is made against.

The self-profile SHALL be the identity used wherever a surface names or acts for the human rather than for a profile they run. This SHALL cover: the claim asserter and a self-claim's purchaser; the display of whether a claim is the viewer's own; the home page's **Following**, **Bookmarks** and **Recently visited** rails, and the following feed; the purchased view; the connections surface; the follow affordance's block gate; visit history; and both the creation and the evaluation of blocks.

The home page's **My Lists** rail is not among them. It reads the lists a profile owns, which is an ownership comparison and therefore takes the active profile, as `home-digest` already specifies. The rail and its own **See all** destination are one collection under two caps, so binding them to different profiles would show a viewer one set on the home page and another at `/lists`.

The follow affordance is split rather than wholly self-governed: its block gate is the human's, per this division, while the comparison that hides it on the owner's own list is an ownership comparison and takes the active profile. `following` states both.

Switching SHALL NOT change any of the self-profile-governed surfaces. A viewer acting as another profile SHALL still see their own claims as their own, their own feed, and their own connections.

#### Scenario: Created content is owned by the active profile

- **WHEN** a viewer acting as a profile they own creates a list or an item
- **THEN** the new row's owning profile is that profile

#### Scenario: A claim records the human, not the acted-as profile

- **WHEN** a viewer acting as a managed profile records a claim
- **THEN** the claim's asserter is the viewer's self-profile

#### Scenario: The viewer's own claims stay recognisable while acting as another profile

- **WHEN** a viewer who has claimed an item is acting as a managed profile and views that item
- **THEN** the claim is shown as the viewer's own, with its removal affordance intact

#### Scenario: The human's rails do not follow the switcher

- **WHEN** a viewer acting as a managed profile loads the home page
- **THEN** the Following, Bookmarks and Recently visited rails, and the following feed, are the viewer's own, identical to what they show while acting as their self-profile

#### Scenario: The My Lists rail follows the switcher

- **WHEN** a viewer acting as a managed profile loads the home page
- **THEN** the My Lists rail shows that profile's lists, matching what `/lists` shows behind the rail's own See all

### Requirement: A membership SHALL record when its account last acted as its profile

Each membership SHALL carry the time its account last acted as that profile. It SHALL be recorded when the profile is switched to, and when a profile-scoped write is made while acting as it. It SHALL NOT be recorded on read-only use, so a viewer who only reads a profile's content without writing shows their last switch.

Recording SHALL be coarsened, so that a burst of writes updates the membership at most once per hour. A membership never acted as SHALL carry no value, which SHALL order after every membership that has one.

The value SHALL order the profiles offered by the switching surfaces, most recently acted-as first.

#### Scenario: Switching records the profile as acted-as

- **WHEN** a viewer switches to a profile
- **THEN** that membership records the switch

#### Scenario: Writing as a profile records it

- **WHEN** a viewer acting as a profile creates or edits its content
- **THEN** that membership records the write

#### Scenario: A burst of writes records once

- **WHEN** a viewer acting as a profile makes several writes within an hour
- **THEN** the membership is updated at most once across them

#### Scenario: A never-acted-as membership orders last

- **WHEN** a viewer runs a profile they have never switched to or written as, alongside profiles they have
- **THEN** the never-acted-as profile is offered after all of them

#### Scenario: Revoking a membership takes its ordering with it

- **WHEN** a viewer's membership on a profile is removed
- **THEN** the profile is absent from the switching surfaces, carrying no residual ordering

### Requirement: An empty profile-scoped surface SHALL offer a way to switch alongside its create affordance

A surface that renders the active profile's own content — the lists collection and the items library — SHALL, when it has nothing to show, offer a route to the Profiles page alongside its existing create affordance.

Emptiness is the one state in which a profile-scoped surface looks the same for every profile, so it is the state in which a viewer who has switched is least able to tell that they are looking at another profile's view rather than at lost content. The copy SHALL stay generic and SHALL NOT name any profile: the offer is to create something here or to go and pick a profile that has some, which is true whichever profile is active.

The switch route SHALL be offered only to a viewer who runs more than one profile — a viewer who runs only their own has nowhere to switch to, and SHALL see the surface exactly as it is today.

This SHALL NOT extend to surfaces the switcher does not govern. The purchased view is scoped to the human per this capability's division, so its empty state SHALL be unchanged.

#### Scenario: An empty active profile offers both routes

- **WHEN** a viewer who runs more than one profile loads the items library or the lists collection while acting as a profile that has none
- **THEN** the empty state offers both its create affordance and a route to the Profiles page

#### Scenario: A single-profile viewer's empty state is unchanged

- **WHEN** a viewer who runs only their self-profile loads an empty items library or lists collection
- **THEN** the empty state offers its create affordance and no switch route

#### Scenario: No profile is named

- **WHEN** an empty profile-scoped surface renders its switch route
- **THEN** the copy names no profile, neither the active one nor any other

#### Scenario: The purchased view is unaffected

- **WHEN** a viewer who runs more than one profile loads an empty purchased view
- **THEN** its empty state is unchanged and offers no switch route

### Requirement: A creation surface SHALL name the profile the new content will belong to

A surface that creates profile-owned content SHALL state which profile will own it, both in the form's heading region and on its submit control, phrased as creating **for** that profile. The submit control MAY shorten to its bare verb where horizontal space does not permit the profile's name; the heading region SHALL NOT.

The statement SHALL be rendered only for a viewer who runs more than one profile. A viewer who runs only their self-profile has no ambiguity to resolve, and SHALL NOT be shown a statement that could only ever name themselves.

#### Scenario: A multi-profile viewer is told which profile they are creating for

- **WHEN** a viewer who runs more than one profile opens the list or item creation form
- **THEN** the form's heading region and its submit control both name the active profile as the one the new content is for

#### Scenario: A single-profile viewer sees no statement

- **WHEN** a viewer who runs only their self-profile opens the list or item creation form
- **THEN** no profile-naming statement is rendered

#### Scenario: The submit control shortens under space constraint

- **WHEN** the submit control cannot fit the profile's name
- **THEN** it renders its bare verb, and the heading region still names the profile
