## Purpose

The user-facing surface for profiles: the page listing every profile an account runs, each profile's own space and Settings form, and the form that gives birth to a managed profile. It owns how a profile's accent and tagline render, and which membership roles may change a profile's identity.

## ADDED Requirements

### Requirement: The Profiles page SHALL list every profile the viewer runs

`/profiles` SHALL render one card per profile the viewer holds any membership on. Membership containment is the whole query — the profiles table carries no account reference, so a membership row is the only handle onto a profile.

Cards SHALL be ordered: the viewer's own self-profile first, then the profiles they own sorted by name ascending, then the profiles they manage sorted by name ascending. The two runs are ordered by capability, not by convention: after this change a viewer may edit the profiles they own and may not edit the ones they manage, so sorting across the boundary would scatter the actionable cards among the inert ones.

The page SHALL NOT render an empty state. Every account holds a `self` membership on its own self-profile, so a zero-card page is unreachable.

The page SHALL state, above the cards, what selecting a profile does. It SHALL NOT carry an always-on explanation of what a managed profile is: zero managed profiles is structurally impossible, so that explanation belongs on the form that creates one.

#### Scenario: A viewer with no managed profiles still sees their own card

- **WHEN** an authenticated viewer who holds only a `self` membership opens `/profiles`
- **THEN** exactly one card renders, for their own profile
- **AND** no empty state is rendered

#### Scenario: The page states what selecting a profile does

- **WHEN** an authenticated viewer opens `/profiles`
- **THEN** copy above the cards states that selecting a profile makes it active and that what the viewer creates belongs to it

#### Scenario: Owned profiles precede managed profiles, each alphabetical

- **WHEN** a viewer owns profiles named "Zoe" and "Ada" and manages profiles named "Bea" and "Cal"
- **THEN** the cards render in the order: the viewer's own profile, Ada, Zoe, Bea, Cal

#### Scenario: A profile the viewer holds no membership on is absent

- **WHEN** a profile exists that the viewer neither owns, manages, nor holds as their self-profile
- **THEN** no card for it renders

### Requirement: A profile card SHALL carry the profile's identity, the viewer's role, its counts, and a management menu

Each card SHALL render the profile's name, its avatar, the viewer's role on it, its tagline, its counts, and its accent.

The avatar is a **slot**: it SHALL render the profile's avatar art where the profile has any, and its initials otherwise. Until the change that gives profiles avatar art, every profile renders the initials fallback. The slot SHALL paint the accent's light stop behind whatever fills it, so a faceless card is still told apart from its neighbours by colour, and filling the slot later SHALL NOT change the card's shape.

The role label SHALL read `You` on the viewer's self-profile, `Owner` on a profile they own, and `Manager` on a profile they manage. The label is non-interactive text, not a removable chip.

Counts SHALL be the number of lists the profile owns, at every visibility, and the number of its **active** items — items with no archive timestamp. Archived items are excluded so the card agrees with the Items view it leads to, which defaults to active.

The card SHALL be inert on click: the card body carries no link and no click handler. Card-click is reserved for switching the active profile, which a later change introduces; until then the card ships no whole-card affordance rather than a dead one.

Management SHALL be carried by a menu opened from a control on the card's accent band, routed through the `menu-system` primitive family. The menu SHALL carry one row per management destination the surface can reach, and SHALL NOT wait until it has more than one: it is the card's management home from the start, so a later change adds a row rather than reshaping the card. Its row to the profile's own space SHALL read `Edit <name>` rather than `Manage <name>` — *managed* already names a kind of profile in this model, so "Manage" on a card labelled `Owner` invites the reading that it opens something managed.

#### Scenario: Role label matches the viewer's membership

- **WHEN** the page renders the viewer's self-profile, a profile they own, and a profile they manage
- **THEN** the three cards' role labels read `You`, `Owner`, and `Manager` respectively

#### Scenario: Counts exclude archived items and include every list

- **WHEN** a profile owns 3 lists — one private, one unlisted, one shared — and 5 items of which 2 are archived
- **THEN** its card reports 3 lists and 3 items

#### Scenario: The card body does not navigate

- **WHEN** the viewer clicks a card anywhere outside its management menu
- **THEN** no navigation occurs

#### Scenario: A card renders no link until its menu is opened

- **WHEN** a card renders
- **THEN** it contains no link

#### Scenario: The management menu opens the profile's space

- **WHEN** the viewer opens a card's management menu and activates its `Edit <name>` row
- **THEN** the browser navigates to that profile's space

#### Scenario: The avatar slot falls back to initials

- **WHEN** a profile carrying no avatar art renders as a card
- **THEN** the slot renders the profile's initials on the accent's light stop

### Requirement: The card of the active profile SHALL be marked as active

Exactly one profile is active at any time. Until the change that introduces switching, the active profile is always the viewer's own — so the viewer's self-profile card SHALL carry the active mark and no other card SHALL. *Being* active is not the same as *changing* which profile is; only the latter waits.

The mark SHALL be carried by the card's own surface — its accent painted across the whole face, with the body held clear of the edges so the accent reads as a frame — and by a badge on the avatar. The badge SHALL carry a text alternative naming the state, so the mark is never colour alone.

#### Scenario: The self-profile card is marked active

- **WHEN** the viewer's own profile renders as a card
- **THEN** the card carries the active mark
- **AND** a badge on its avatar carries a text alternative naming the active state

#### Scenario: A profile the viewer owns or manages is not marked active

- **WHEN** a profile the viewer holds `owner` or `manager` on renders as a card
- **THEN** the card carries no active mark and no badge

### Requirement: A card SHALL reserve its tagline line whether or not it has one

A profile card SHALL reserve the tagline's line whether or not the profile has a tagline, so that every card in a row holds its counts on one baseline. The reserve SHALL be the tagline element's own minimum height, not a second placeholder node standing in for it: there is nothing for a reader to announce, and no second element to keep in step.

The profile space's identity header reserves nothing — it renders one profile, so there is no row to align it with — and SHALL render no tagline node where the profile has none.

An absent tagline and a blank one are indistinguishable at render, because a blank tagline never reaches storage — `profiles-data-model` normalizes it to NULL first.

#### Scenario: A profile without a tagline still holds the line

- **WHEN** a profile whose `tagline` is NULL renders as a card
- **THEN** the tagline element is present and empty
- **AND** no second placeholder element is rendered beside it

#### Scenario: The identity header omits an absent tagline

- **WHEN** a profile whose `tagline` is NULL renders in its profile space
- **THEN** the identity header renders no tagline node

### Requirement: A profile's accent SHALL render the band its stored preset name carries

The selectable accents SHALL be a fixed, ordered palette of named presets. Each preset SHALL carry its own two gradient stops and its own ink — the text colour rendered on it — because a band travels hue as well as lightness, a shape no single stored value can express. The stored value SHALL be the preset's NAME alone, so that changing what a name renders as is a palette edit that rewrites no stored row and reaches every profile holding it.

The band SHALL carry no text. The initials disc SHALL paint the preset's light stop alone, and the preset's ink SHALL meet at least 4.5:1 contrast against that stop. Fixing contrast against a single stop rather than across the gradient is what keeps the bar a per-preset property that a test can walk, rather than a judgement about a colour that varies along its own length.

Each preset's two stops SHALL be far enough apart to read as a band rather than as one flat colour, measured across lightness and hue together rather than by hue alone: a preset that has to read as one colour travels barely any hue on purpose and separates by lightness instead, so a hue floor would fail exactly the presets it is meant to protect. Each preset's band SHALL keep enough of its endpoints' chroma at its midpoint not to grey out there, which is what a band drawn between near-opposites does however vivid its ends are. Enough of the palette's bands SHALL cross the wheel to give the palette its range — a palette-level property, not a per-preset one, since requiring it of every preset would forbid a preset that names a colour.

Every preset SHALL carry a distinct band and a distinct ink. The ink also marks the selected swatch, so two presets sharing one would be indistinguishable once picked.

This requirement fixes the invariants, not the palette — presets may be added, removed or re-coloured, and the thresholds these invariants are measured at may be tuned, without a spec change, provided each preset satisfies them. The order the swatches are offered in is likewise a design matter and deliberately unfixed here: sorting by a computed property of each band was tried and read worse than an arranged run, so the palette's order is authored rather than derived, and no rule fits every palette a designer might author next.

A profile carrying no stored accent, or one naming a preset the palette no longer carries, SHALL render a fixed fallback distinct from every preset, and SHALL NOT derive one. The fallback is not selectable: it is what a profile with no accent looks like, not an additional preset.

#### Scenario: Every selectable accent is legible

- **WHEN** each preset's ink is rendered on that preset's initials disc
- **THEN** it meets at least 4.5:1 contrast against the stop that disc paints

#### Scenario: A stored accent is the one shown

- **WHEN** a profile carrying a stored preset name renders
- **THEN** that preset's band is shown

#### Scenario: A preset's band runs its own two stops

- **WHEN** a preset's band renders
- **THEN** it runs that preset's own light and dark stops, which differ from each other

#### Scenario: A preset's stops are far enough apart to read as a band

- **WHEN** each preset's two stops are compared across lightness and hue together
- **THEN** they are far enough apart that the band reads as a band rather than as one flat colour

#### Scenario: A band stays saturated at its midpoint

- **WHEN** each preset's band is sampled at its midpoint
- **THEN** it keeps enough of its endpoints' chroma there not to grey out

#### Scenario: The palette carries bands that cross the wheel

- **WHEN** the palette's bands are measured for hue travel
- **THEN** enough of them cross the wheel to give the palette its range

#### Scenario: No two presets share an ink or a band

- **WHEN** the palette's presets are compared
- **THEN** each carries an ink no other preset carries, and a band no other preset carries

#### Scenario: A profile with no stored accent renders the fallback

- **WHEN** a profile carrying no stored accent renders
- **THEN** the fallback is shown
- **AND** no preset is shown

#### Scenario: A name the palette no longer carries falls back

- **WHEN** a profile stores a preset name the palette does not carry
- **THEN** the fallback is shown rather than nothing

#### Scenario: The fallback is not offered as a choice

- **WHEN** the selectable accents are offered
- **THEN** the fallback is not among them

#### Scenario: Re-colouring a preset rewrites no stored row

- **WHEN** a preset's stops are changed in the palette
- **THEN** every profile storing that preset name renders the new band, and no stored value changes

### Requirement: A profile's space SHALL be reachable only by that profile's members

`/profiles/[id]` SHALL render for an authenticated viewer holding any membership on the profile — `self`, `owner`, or `manager`.

An authenticated viewer holding no membership on it SHALL be redirected to `/profiles`, the page listing the profiles they do run. A request for a profile id that does not exist SHALL produce the identical response, so the surface discloses no profile's existence to a viewer with no claim on it. An unauthenticated request to `/profiles` or `/profiles/[id]` SHALL redirect to `/`.

#### Scenario: A member reaches the space

- **WHEN** an authenticated viewer holding a `self`, `owner`, or `manager` membership requests that profile's space
- **THEN** the space renders

#### Scenario: A non-member is redirected to their own Profiles page

- **WHEN** an authenticated viewer holding no membership on a profile requests its space
- **THEN** the request redirects to `/profiles`

#### Scenario: An unknown profile id is indistinguishable from a forbidden one

- **WHEN** an authenticated viewer requests a profile id that no profile carries
- **THEN** the response is identical to the one a non-member receives

#### Scenario: Unauthenticated request is redirected

- **WHEN** an unauthenticated request reaches `/profiles` or `/profiles/[id]`
- **THEN** it redirects to `/`

### Requirement: A profile's space SHALL render an identity header and a Settings form

The space SHALL render an identity header carrying the profile's name, initials art, tagline where present, and accent, followed by a Settings form over the profile's name, tagline and accent. It SHALL render for a self-profile and a managed profile alike: a profile's name is editable — unlike the account name, which stays as the accountability anchor an external identity provider keeps writing — so renaming a self-profile here never touches the account.

Where the viewer's role on the profile is `manager`, the Settings form SHALL render with every field disabled and no submit control. A disabled submit control SHALL NOT be rendered in its place.

Where the profile carries no stored accent, the Settings form SHALL open with one preset selected, chosen at random on each open, and SHALL write nothing until submitted. Dismissing the form SHALL leave the profile with no stored accent.

#### Scenario: An owner sees an editable form

- **WHEN** a viewer holding `self` or `owner` opens the profile's space
- **THEN** the Settings form's fields are editable and a submit control is present

#### Scenario: A manager sees the settings but cannot edit them

- **WHEN** a viewer holding `manager` opens the profile's space
- **THEN** the Settings form renders with every field disabled
- **AND** no submit control is present

#### Scenario: The Settings form suggests without writing

- **WHEN** a viewer opens the space of a profile carrying no stored accent
- **THEN** one preset is selected in the Settings form
- **AND** the profile still carries no stored accent

### Requirement: Only a profile's self or owner member SHALL change its settings

The action that updates a profile's name, tagline or accent SHALL resolve the acting account from the session, load the acting account's membership on the target profile, and proceed only where that membership's role is `self` or `owner`. A `manager` and a non-member SHALL both be rejected with `Unauthorized` and no write SHALL occur.

Enforcement SHALL be independent of what the page rendered: a manager who submits the form by any means is rejected by the action, not by the disabled fields. `server-endpoint-authorization` owns the general rule that a mutation resolves its actor from the session and checks before writing; this requirement fixes which roles pass for a profile.

Identity is what this rule protects: a profile's name, tagline and accent are how it is recognized wherever it appears, so changing them is an ownership act. Which further rights a `manager` holds is settled by the capability that introduces profile permissions, and this requirement is the floor it starts from.

The accent is written separately from the name and tagline columns — `profiles-data-model` owns why — so an update MAY persist those columns and fail to persist the accent. Where that happens the action SHALL report failure naming what was and was not saved, rather than reporting success. This is deliberately unlike creation, which reports success and lets the profile render the fallback: a creator has no prior accent to lose and is navigated away, while an editor is left looking at the form they submitted, so reporting success would claim a colour the profile does not carry.

#### Scenario: A manager's submission is rejected

- **WHEN** a viewer holding `manager` invokes the profile-update action
- **THEN** it returns `Unauthorized` and no column and no preference row is written

#### Scenario: A non-member's submission is rejected

- **WHEN** a viewer holding no membership on the profile invokes the profile-update action
- **THEN** it returns `Unauthorized` and no write occurs

#### Scenario: An owner's submission persists every field

- **WHEN** a viewer holding `owner` submits a changed name, tagline and accent
- **THEN** the name and tagline columns and the accent preference value are updated, and subsequent reads return them

#### Scenario: A member updates their own self-profile

- **WHEN** a viewer submits a changed name on the profile they hold `self` on
- **THEN** the profile's name is updated and no account record is written

#### Scenario: An accent that fails to save is reported, not swallowed

- **WHEN** an owner's submission persists the name and tagline columns
- **AND** the accent value fails to persist
- **THEN** the action reports failure with a message naming that the name and tagline were saved and the accent was not

### Requirement: A profile change SHALL be visible on the next read of any surface that shows it

Where a profile is created, or its name, tagline or accent changed, the next read of any surface listing or rendering that profile SHALL reflect the change. A viewer SHALL NOT have to force a reload to see a profile they just created or edited.

A rejected write SHALL leave every such surface as it was: an `Unauthorized` submission changes nothing a reader can observe.

#### Scenario: A created profile appears without a reload

- **WHEN** a viewer creates a managed profile
- **THEN** the Profiles page lists it on the next read

#### Scenario: An edited profile shows its new identity

- **WHEN** an owner changes a profile's name, tagline or accent
- **THEN** the next read of its card and of its space shows the submitted values

#### Scenario: A rejected write changes nothing observable

- **WHEN** a `manager`'s submission is rejected
- **THEN** every surface still shows the profile's previous values

### Requirement: The managed-profile birth form SHALL be an overlay on the Profiles page

Creating a managed profile SHALL be an overlay opened from a "New Profile" control in the Profiles page header, not a route of its own. It has exactly one call site, so there is no navigation to intercept.

The form SHALL carry three fields: name, required, between 1 and 60 characters after trimming; tagline, optional, subject to the tagline contract `profiles-data-model` owns; and an accent chosen from the named presets. The name floor is 1 rather than the 3 that list and item names use, because two-character names are real names. The accent SHALL be required, and the field SHALL open with one preset already selected, chosen at random. Random rather than fixed: a fixed opening selection lands every profile whose creator did not change it on one colour, which is the failure the accent exists to prevent. The random choice SHALL NOT be determined by the creating account, the profile, or any other existing value — none of which the form holds, since the profile has no id until creation.

On success the browser SHALL navigate to the new profile's space, and no success toast SHALL be raised — the navigation is the confirmation, and a toast raised into it would be discarded. On failure the overlay SHALL stay mounted, render the returned message inline, and raise a failure toast; no navigation SHALL occur.

The rows this form writes, and their atomicity, are owned by `profiles-data-model`.

#### Scenario: A successful creation navigates into the new profile

- **WHEN** a viewer submits the form with a valid name and the creation succeeds
- **THEN** the browser navigates to the new profile's space
- **AND** no success toast is raised

#### Scenario: A blank name is rejected without a write

- **WHEN** a viewer submits the form with an empty or whitespace-only name
- **THEN** validation fails with a field error on name and no profile row is written

#### Scenario: An over-length name is rejected

- **WHEN** a viewer submits a name longer than 60 characters
- **THEN** validation fails with a field error on name and no profile row is written

#### Scenario: A failed creation keeps the overlay open

- **WHEN** the creation action returns a failure
- **THEN** the overlay stays mounted with the returned message rendered inline
- **AND** a failure toast is raised
- **AND** no navigation occurs

#### Scenario: The form opens on a preset

- **WHEN** the birth form opens
- **THEN** exactly one preset is selected
- **AND** it is not determined by the creating account or any existing profile
