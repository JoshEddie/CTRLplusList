# Acceptance — active-profile-switcher

<!-- Given/When/Then user-journey flows for this change. Drafted at propose time by
     chaining this change's delta scenarios onto pre-existing canonical-spec links;
     refined at apply time with literal handles — refine, not rewrite. Inline
     *TODO:* markers stand where a handle has not been designed yet; tasks.md
     carries one task per marker.
     Contract: the acceptance artifact instruction in schema.yaml. -->

## Flows

### Flow: The nav states which profile the viewer is acting as

- **Given** the viewer is signed in and their browser carries a selection naming a managed profile they hold an `owner` membership on
- **When** they load any `(main)/` page
- **Then** the gradient nav's avatar circle renders that managed profile's initials
- **And** the circle carries that profile's accent as a ring
- **And** the viewer's own Google account image is not rendered anywhere in the gradient nav
- **And** the brand lockup, the four primary nav pills and the avatar circle are the nav's only regions

### Flow: The avatar dropdown offers the profiles the viewer is not acting as

- **Given** the viewer runs three profiles — their self-profile, one they own, one they manage — with distinct last-acted-as timestamps and one never acted as
- **And** they are acting as their self-profile
- **When** they open the avatar dropdown from the gradient nav
- **Then** the dropdown carries one switch row for each of the two profiles they do not act as
- **And** those rows sit above the `Profiles` and `Connections` destinations and above `Sign out`
- **And** no row names their self-profile
- **And** the rows are ordered most-recently-acted-as first, with the never-acted-as profile after both
- **And** each switch row's leading slot renders that profile's initials on its accent, and carries no navigation icon
- **And** the `Profiles` destination carries the count of all three profiles, rendered as *TODO: specify how the count is presented on the Profiles row*
- **And** the `Profiles` destination still links to `/profiles`

### Flow: A viewer past the dropdown's cap reaches the rest through Profiles

- **Given** the viewer runs twelve profiles
- **And** they are acting as their self-profile
- **When** they open the avatar dropdown
- **Then** at most five switch rows are offered
- **And** those five are the five most-recently-acted-as, in that order
- **And** the `Profiles` destination carries the count of all twelve
- **And** `Sign out` is still the dropdown's last row

### Flow: A viewer acting as a managed profile is offered the way back

- **Given** the viewer is acting as a managed profile they own
- **When** they open the avatar dropdown
- **Then** one switch row reads `Back to <their self-profile's name>`
- **And** no row names the managed profile they are acting as

### Flow: A single-profile viewer sees no switcher

- **Given** the viewer holds a `self` membership and no other membership
- **When** they open the avatar dropdown
- **Then** the dropdown carries no switch rows
- **And** the `Profiles` destination carries no count
- **And** the dropdown's rows are the signed-in user header, `Profiles`, `Connections` and `Sign out`

### Flow: Switching from the dropdown re-renders the route the viewer is on

- **Given** the viewer is on `/lists` acting as their self-profile, which owns at least one list
- **And** they hold an `owner` membership on a managed profile that owns at least one different list
- **When** they open the avatar dropdown
- **And** click the switch row naming the managed profile
- **Then** they remain on `/lists`
- **And** `/lists` renders the managed profile's lists
- **And** none of their self-profile's lists are rendered
- **And** a transient confirmation naming the managed profile is raised, reading *TODO: specify the confirmation copy*
- **And** the avatar circle renders the managed profile's initials with its accent as a ring
- **And** that membership's last-acted-as timestamp records the switch

### Flow: Switching from a profile card leaves the viewer on the Profiles page

- **Given** the viewer is on `/profiles` acting as their self-profile
- **And** they hold an `owner` membership on a managed profile
- **When** they click the body of the managed profile's card, outside its management menu
- **Then** no navigation occurs and the viewer remains on `/profiles`
- **And** the managed profile's card carries the active mark, its accent painted across the whole face
- **And** a badge on that card's avatar carries a text alternative naming the active state, reading *TODO: specify the badge's text alternative*
- **And** their self-profile's card carries neither the active mark nor the badge
- **And** a transient confirmation naming the managed profile is raised

### Flow: Opening a card's management menu does not switch

- **Given** the viewer is on `/profiles` acting as their self-profile
- **When** they click the `⋯` control on the accent band of a card for a profile they are not acting as
- **Then** the menu opens with `Switch to <that profile's name>` as its first row
- **And** `Edit <that profile's name>` follows it as a link to that profile's space
- **And** the active mark remains on their self-profile's card
- **And** no transient confirmation is raised

### Flow: Switching from a card's menu without a pointer

- **Given** the viewer is on `/profiles` acting as their self-profile
- **And** they hold an `owner` membership on a managed profile
- **When** they open that card's management menu from its `⋯` control
- **And** activate its `Switch to <name>` row by keyboard
- **Then** the active profile becomes that managed profile
- **And** the active mark and badge move to that card
- **And** a transient confirmation naming the managed profile is raised

### Flow: The card of the profile being acted as offers no switch row

- **Given** the viewer is on `/profiles` acting as their self-profile
- **When** they open the management menu on their self-profile's card
- **Then** the menu carries `Edit <their self-profile's name>` and no switch row
- **And** the menu's first row is a link to that profile's space

### Flow: A creation form states which profile the new content is for

- **Given** the viewer runs more than one profile
- **And** they are acting as a managed profile they own
- **When** they open the list creation form
- **Then** the form's heading region names the managed profile as the one the new list is for, phrased as *TODO: specify the heading-region copy*
- **And** the submit control names the managed profile, or renders its bare verb where the profile's name does not fit the available width

### Flow: A single-profile viewer is shown no profile statement

- **Given** the viewer holds a `self` membership and no other membership
- **When** they open the list creation form
- **Then** no profile-naming statement is rendered in the form's heading region
- **And** the submit control renders its bare verb

### Flow: Content created while acting as a profile is owned by that profile

- **Given** the viewer is acting as a managed profile they hold an `owner` membership on
- **And** that membership's last-acted-as timestamp was last stamped more than an hour ago
- **When** they submit the list creation form
- **Then** the new list's owning profile is the managed profile
- **And** the new list's owning profile is not their self-profile
- **And** the list renders on `/lists`
- **And** the membership's last-acted-as timestamp records the write
- **And** the home page's My Lists rail shows the new list

### Flow: A burst of writes records recency once

- **Given** the viewer is acting as a managed profile whose membership was stamped as acted-as within the last hour
- **When** they make several profile-scoped writes inside that hour
- **Then** the membership's last-acted-as timestamp is unchanged across all of them

### Flow: The human's home rails do not follow the switcher

- **Given** the viewer follows at least one profile, holds at least one bookmark, and has at least one visit in their history
- **And** they are acting as a managed profile they own, which owns at least one list of its own
- **When** they load the home page
- **Then** the Following rail renders the profiles the viewer follows
- **And** the Bookmarks rail renders the viewer's own bookmarks
- **And** the Recently visited rail renders the viewer's own visit history
- **And** those three rails render exactly what they render while the viewer acts as their self-profile
- **And** the My Lists rail renders the managed profile's lists rather than the viewer's own

### Flow: The purchased view stays the human's

- **Given** the viewer is acting as a managed profile
- **And** the viewer has marked at least one item as purchased while acting as their self-profile
- **When** they load `/purchased`
- **Then** the view renders the viewer's own purchases
- **And** it renders exactly what it renders while the viewer acts as their self-profile

### Flow: A claim recorded while acting as another profile names the human

- **Given** the viewer is acting as a managed profile they own
- **And** they can view a list owned by a third party carrying an unclaimed item
- **When** they claim that item
- **Then** the claim's asserter is the viewer's self-profile
- **And** the claim's asserter is not the managed profile
- **And** a self-claim's purchaser is the viewer's self-profile

### Flow: The viewer's own claims stay theirs while acting as another profile

- **Given** the viewer has claimed an item on a third party's list
- **And** they are acting as a managed profile they own
- **When** they load that list's page
- **Then** the claim is shown as the viewer's own
- **And** its removal affordance is rendered

### Flow: An empty profile-scoped surface offers a route to the Profiles page

- **Given** the viewer runs more than one profile
- **And** they are acting as a managed profile that owns no lists and no active items
- **When** they load `/lists`
- **And** load `/items`
- **Then** each empty state renders its create affordance
- **And** each renders a secondary link to `/profiles` after that affordance, labelled *TODO: specify the secondary action's label*
- **And** neither the title, the description nor the secondary link names any profile

### Flow: A single-profile viewer's empty state is unchanged

- **Given** the viewer holds a `self` membership and no other membership
- **And** their self-profile owns no lists
- **When** they load `/lists`
- **Then** the empty state renders its title, description and create affordance
- **And** no secondary link to `/profiles` is rendered

### Flow: The purchased view's empty state gains nothing

- **Given** the viewer runs more than one profile
- **And** they have marked no items as purchased
- **When** they load `/purchased`
- **Then** the empty state renders its title and description
- **And** no button and no link is rendered inside the empty container

### Flow: A revoked membership falls back to the self-profile without rewriting the selection

- **Given** the viewer's browser carries a selection naming a managed profile
- **And** their membership on that profile has since been deleted
- **When** they load `/lists`
- **Then** `/lists` renders their self-profile's lists
- **And** no error is surfaced
- **And** the response writes no new selection
- **And** the avatar circle renders their self-profile's initials
- **And** the managed profile is absent from the avatar dropdown's switch rows

### Flow: A forged selection grants no reach

- **Given** a signed-in viewer whose browser carries a selection naming a profile id they hold no membership on
- **When** they load `/lists`
- **Then** `/lists` renders their self-profile's lists
- **And** no read is performed against the named profile
- **And** no write is performed against the named profile
- **And** the outcome is identical whether the named id belongs to another account's profile, a deleted profile, or no profile at all

### Flow: A viewer who has never switched acts as themselves

- **Given** a signed-in viewer whose browser carries no selection
- **When** they load `/lists`
- **Then** `/lists` renders their self-profile's lists
- **And** the avatar circle renders their self-profile's initials

### Flow: The selection survives a browser restart

- **Given** the viewer has switched to a managed profile they own
- **When** they close the browser and reopen `/lists` while their session is still valid
- **Then** `/lists` renders the managed profile's lists
- **And** the avatar circle renders the managed profile's initials

### Flow: Signing out discards the selection

- **Given** the viewer is acting as a managed profile they own
- **When** they activate the avatar dropdown's `Sign out` row
- **And** a second account signs in on the same browser
- **Then** the second viewer's `/lists` renders their own self-profile's lists
- **And** the second viewer's avatar circle renders their own self-profile's initials

### Flow: The switch action rejects a target the viewer does not run

- **Given** a signed-in viewer acting as their self-profile
- **And** a profile they hold no membership on
- **When** they POST to the switch action naming that profile
- **Then** the action rejects
- **And** no selection is stored
- **And** their subsequent requests still act as their self-profile
- **And** that profile's last-acted-as timestamp is unchanged

### Flow: A write as an unheld profile is refused at the gate

- **Given** the viewer's browser carries a selection naming a managed profile
- **And** their membership on it is deleted after the creation form renders and before they submit
- **When** they submit the form
- **Then** the action returns `error: 'Forbidden'`
- **And** no row is written to the database

### Flow: Another membership does not widen the current request

- **Given** the viewer holds `owner` memberships on managed profiles A and B
- **And** they are acting as A
- **When** they POST a mutation targeting a row owned by B
- **Then** the action returns `error: 'Forbidden'`
- **And** the row owned by B is unchanged
- **And** the rejection is unaffected by their holding a membership on B

### Flow: Revoking a membership takes its ordering with it

- **Given** the viewer runs a managed profile whose membership carries a last-acted-as timestamp
- **When** that membership row is deleted
- **Then** the profile is absent from the avatar dropdown's switch rows
- **And** the profile is absent from the Profiles page
- **And** no row records that account's use of that profile

### Flow: Blocking while acting as another profile still names the human

- **Given** the viewer is acting as a managed profile they own
- **And** a third party follows the viewer's self-profile one-way
- **When** they load `/settings/connections`
- **And** click Block next to that follower
- **Then** the connections page renders the viewer's own Following, Followers and Blocked sections, identical to what they show while acting as the self-profile
- **And** exactly one `user_blocks` row is inserted
- **And** that row's blocker is the viewer's self-profile
- **And** that row's blocker is not the managed profile
- **And** no `user_blocks` row is inserted for any other profile either party runs

### Flow: A block still gates while the blocked viewer acts as another profile

- **Given** a third party has blocked the viewer's self-profile
- **And** the viewer is acting as a managed profile they own
- **When** they navigate to a list owned by that third party
- **Then** the response redirects to `/lists`
- **And** the list's contents are not rendered
- **And** the response is the same one they receive while acting as their self-profile

### Flow: The Follow button's block gate takes the self-profile

- **Given** the viewer has blocked a third party from their connections page
- **And** the viewer is acting as a managed profile they own
- **When** they load that third party's `unlisted` list page
- **Then** the list renders
- **And** no Follow button is rendered in the byline sub-row

### Flow: The Follow button's owner gate takes the active profile

- **Given** the viewer holds an `owner` membership on a managed profile that owns a non-private list
- **And** they are acting as that managed profile
- **When** they load that list's page
- **Then** no Follow button is rendered in the byline sub-row
- **And** the owner's name still renders as a link to `/user/<the managed profile's id>`

### Flow: Follow is still offered on a list owned by a profile the viewer runs but is not acting as

- **Given** the viewer holds an `owner` membership on a managed profile that owns a non-private list
- **And** they are acting as their self-profile
- **When** they load that list's page
- **Then** a Follow button naming the managed profile is rendered in the byline sub-row
- **And** this is unchanged from the behavior on the current trunk

### Flow: The owner migrates the membership table

- **Given** a database holding membership rows created before this change
- **When** the owner runs the migration
- **Then** the command exits 0
- **And** `profile_members` carries a nullable last-acted-as timestamp column
- **And** every pre-existing membership row's last-acted-as value is NULL
- **And** every other pre-existing table, column, constraint and index is unchanged

### Flow: The owner seeds a switchable set

- **Given** a local database provisioned by `drizzle-kit push` from the schema
- **When** the owner runs the dev seed
- **Then** the command exits 0
- **And** the primary test viewer holds a `self`, an `owner` and a `manager` membership on three distinct profiles
- **And** those memberships carry distinct last-acted-as timestamps, far enough apart to order unambiguously
- **And** at least one of them is NULL
- **And** the preferences catalog holds the `accent` row
- **And** the per-profile preference values table holds no rows

### Flow: The owner resets a drifted local database

- **Given** a database holding seeded self-profiles, both seeded managed profiles, and a profile created by hand carrying a seeded user's membership
- **When** the owner runs `npm run db:reset:dev`
- **Then** the command exits 0
- **And** none of those profiles remain
- **And** none of their membership or preference rows remain
- **And** the seed's profile fixtures are present again with the same deterministic timestamps

### Flow: The dormant environment override governs nothing

- **Given** a local-mode dev server
- **When** the owner starts it with `BYPASS_ACTIVE_PROFILE` set to a seeded managed profile's id
- **And** loads `/lists`
- **Then** `/lists` renders the bypassed viewer's self-profile's lists
- **And** the avatar circle renders their self-profile's initials

### Flow: The seam's split is enumerated by the typechecker

- **Given** a working tree in which `authedIdentity` returns a self profile and an active profile and no unqualified `profile` field
- **When** the owner runs `npx tsc --noEmit`
- **Then** the command exits 0
- **And** it reports no reference to a removed `profile` field

### Flow: The suite drives a real switch and leaves the ordering fixture intact

- **Given** a seeded e2e database whose test viewer holds three memberships, one with a NULL last-acted-as timestamp
- **When** the owner runs `npm run test:e2e`
- **Then** the command exits 0
- **And** the membership the seed left NULL is still NULL
- **And** the test viewer's stored selection at the end of the run names their self-profile
