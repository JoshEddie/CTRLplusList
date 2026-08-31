# profiles-surface Specification

## Purpose

The user-facing surface for profiles: the page listing every profile an account runs, each profile's own space and Settings form, and the form that gives birth to a managed profile. It owns how a profile's accent and tagline render, and which membership roles may change a profile's identity.

## Requirements

### Requirement: The Profiles page SHALL list every profile the viewer runs

`/altvatar` SHALL render one card per profile the viewer holds any membership on. Membership containment is the whole query — the profiles table carries no account reference, so a membership row is the only handle onto a profile.

Cards SHALL be ordered: the viewer's own self-profile first, then the profiles they own sorted by name ascending, then the profiles they manage sorted by name ascending. The two runs are ordered by capability, not by convention: after this change a viewer may edit the profiles they own and may not edit the ones they manage, so sorting across the boundary would scatter the actionable cards among the inert ones.

The page SHALL NOT render an empty state. Every account holds a `self` membership on its own self-profile, so a zero-card page is unreachable.

The page SHALL state, above the cards, what selecting a profile does. It SHALL NOT carry an always-on explanation of what a managed profile is: zero managed profiles is structurally impossible, so that explanation belongs on the form that creates one.

#### Scenario: A viewer with no managed profiles still sees their own card

- **WHEN** an authenticated viewer who holds only a `self` membership opens `/altvatar`
- **THEN** exactly one card renders, for their own profile
- **AND** no empty state is rendered

#### Scenario: The page states what selecting a profile does

- **WHEN** an authenticated viewer opens `/altvatar`
- **THEN** copy above the cards states that selecting a profile makes it active and that what the viewer creates belongs to it

#### Scenario: Owned profiles precede managed profiles, each alphabetical

- **WHEN** a viewer owns profiles named "Zoe" and "Ada" and manages profiles named "Bea" and "Cal"
- **THEN** the cards render in the order: the viewer's own profile, Ada, Zoe, Bea, Cal

#### Scenario: A profile the viewer holds no membership on is absent

- **WHEN** a profile exists that the viewer neither owns, manages, nor holds as their self-profile
- **THEN** no card for it renders

### Requirement: A profile card SHALL carry the profile's identity, the viewer's role, its counts, and a management menu

Each card SHALL render the profile's name, its avatar, the viewer's role on it, its tagline, its counts, and its accent.

The avatar is a **slot**: it SHALL render the profile's Altvatar art where the profile has any, and its initials otherwise, per `altvatar`'s resolution chain. The slot SHALL paint the accent's light stop behind whatever fills it, so a faceless card is still told apart from its neighbours by colour, and art SHALL NOT carry a background of its own.

The role label SHALL read `You` on the viewer's self-profile, `Owner` on a profile they own, and `Manager` on a profile they manage. The label is non-interactive text, not a removable chip.

Counts SHALL be the number of lists the profile owns, at every visibility, and the number of its **active** items — items with no archive timestamp. Archived items are excluded so the card agrees with the Items view it leads to, which defaults to active.

The card body SHALL switch the active profile on click, per `active-profile`. Clicking the card SHALL NOT navigate: the viewer stays on the Profiles page, which re-renders with the active mark moved. The card's management menu SHALL be excluded from that click target, so opening the menu does not also switch. Because the card body's click target is not itself a control, it SHALL NOT be the only way to switch from this surface — the management menu carries the switch as a row, which is the path available to a viewer who does not use a pointer.

Management SHALL be carried by a menu opened from a control on the card's accent band, routed through the `menu-system` primitive family. The menu SHALL carry one row per management destination the surface can reach, and SHALL NOT wait until it has more than one: it is the card's management home from the start, so a later change adds a row rather than reshaping the card. Its row to the profile's own space SHALL read `Edit <name>` rather than `Manage <name>` — *managed* already names a kind of profile in this model, so "Manage" on a card labelled `Owner` invites the reading that it opens something managed. The menu SHALL additionally carry a switch row reading `Switch to <name>`, ordered before `Edit <name>` because switching is the more frequent act. The switch row SHALL be absent from the card of the profile already being acted as.

#### Scenario: Role label matches the viewer's membership

- **WHEN** the page renders the viewer's self-profile, a profile they own, and a profile they manage
- **THEN** the three cards' role labels read `You`, `Owner`, and `Manager` respectively

#### Scenario: Counts exclude archived items and include every list

- **WHEN** a profile owns 3 lists — one private, one unlisted, one shared — and 5 items of which 2 are archived
- **THEN** its card reports 3 lists and 3 items

#### Scenario: The card body does not navigate

- **WHEN** the viewer clicks a card anywhere outside its management menu
- **THEN** no navigation occurs

#### Scenario: The card body switches the active profile

- **WHEN** the viewer clicks the body of a card for a profile they are not currently acting as
- **THEN** the active profile becomes that profile, and the Profiles page re-renders with the active mark moved to that card

#### Scenario: Opening the menu does not switch

- **WHEN** the viewer clicks the management menu's control on a card they are not acting as
- **THEN** the menu opens and the active profile is unchanged

#### Scenario: A card renders no link until its menu is opened

- **WHEN** a card renders
- **THEN** it contains no link

#### Scenario: The management menu opens the profile's space

- **WHEN** the viewer opens a card's management menu and activates its `Edit <name>` row
- **THEN** the browser navigates to that profile's space

#### Scenario: The management menu switches without a pointer

- **WHEN** the viewer opens a card's management menu and activates its `Switch to <name>` row
- **THEN** the active profile becomes that profile

#### Scenario: The active profile's card offers no switch row

- **WHEN** the viewer opens the management menu on the card of the profile they are acting as
- **THEN** the menu carries `Edit <name>` and no switch row

#### Scenario: The avatar slot renders art where the profile has it

- **WHEN** a profile carrying Altvatar art renders as a card
- **THEN** the slot renders that art over the accent's light stop

#### Scenario: The avatar slot falls back to initials

- **WHEN** a profile carrying no avatar art renders as a card
- **THEN** the slot renders the profile's initials on the accent's light stop

### Requirement: The card of the active profile SHALL be marked as active

Exactly one profile is active at any time, and which one it is is owned by `active-profile`. The card of the profile the viewer is currently acting as SHALL carry the active mark, and no other card SHALL — so the mark moves as the viewer switches, and rests on the viewer's self-profile whenever they are acting as themselves.

The mark SHALL be carried by the card's own surface — its accent painted across the whole face, with the body held clear of the edges so the accent reads as a frame — and by a badge on the avatar. The badge SHALL carry a text alternative naming the state, so the mark is never colour alone.

#### Scenario: The self-profile card is marked active

- **WHEN** a viewer acting as their own profile renders the Profiles page
- **THEN** their self-profile's card carries the active mark
- **AND** a badge on its avatar carries a text alternative naming the active state

#### Scenario: A profile the viewer owns or manages is not marked active

- **WHEN** a profile the viewer holds `owner` or `manager` on renders as a card while the viewer is acting as a different profile
- **THEN** the card carries no active mark and no badge

#### Scenario: The mark follows a switch

- **WHEN** a viewer acting as their own profile switches to a profile they own
- **THEN** the active mark and badge move to that profile's card, and the self-profile's card carries neither

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

A profile carrying no stored accent, or one naming a preset the palette no longer carries, SHALL render a fixed fallback, and SHALL NOT derive one. The fallback SHALL be one named preset of the palette applied whole — its two stops, its ink and its shadow together — rather than a colour of its own. An accent-less profile is then drawn by the same code path and held to the same invariants as every stored accent, so no fallback-only colour has to satisfy them separately and no derivation can drift from the palette. Which preset serves as the fallback is a palette decision, not a spec one.

In exchange the fallback preset stays selectable, and a profile storing it is indistinguishable from one storing nothing. That is accepted: the distinction was never visible to a viewer, only to the database, and the alternative is a colour that no palette invariant covers.

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
- **THEN** the fallback preset's band, ink and shadow are shown, all five derivations agreeing on it

#### Scenario: A name the palette no longer carries falls back

- **WHEN** a profile stores a preset name the palette does not carry
- **THEN** the fallback is shown rather than nothing

#### Scenario: The fallback is not offered as a choice

- **WHEN** the selectable accents are offered
- **THEN** no "no accent" entry is among them — carrying no accent is a state, not something the picker offers

#### Scenario: The fallback is a preset the palette also offers

- **WHEN** the selectable accents are offered
- **THEN** the fallback preset is among them, and a profile storing it renders exactly as one storing nothing

#### Scenario: Re-colouring a preset rewrites no stored row

- **WHEN** a preset's stops are changed in the palette
- **THEN** every profile storing that preset name renders the new band, and no stored value changes

### Requirement: A profile's space SHALL be reachable only by that profile's members

`/altvatar/[id]` SHALL render for an authenticated viewer holding any membership on the profile — `self`, `owner`, or `manager`.

An authenticated viewer holding no membership on it SHALL be redirected to `/altvatar`, the page listing the profiles they do run. A request for a profile id that does not exist SHALL produce the identical response, so the surface discloses no profile's existence to a viewer with no claim on it. An unauthenticated request to `/altvatar` or `/altvatar/[id]` SHALL redirect to `/`.

#### Scenario: A member reaches the space

- **WHEN** an authenticated viewer holding a `self`, `owner`, or `manager` membership requests that profile's space
- **THEN** the space renders

#### Scenario: A non-member is redirected to their own Profiles page

- **WHEN** an authenticated viewer holding no membership on a profile requests its space
- **THEN** the request redirects to `/altvatar`

#### Scenario: An unknown profile id is indistinguishable from a forbidden one

- **WHEN** an authenticated viewer requests a profile id that no profile carries
- **THEN** the response is identical to the one a non-member receives

#### Scenario: Unauthenticated request is redirected

- **WHEN** an unauthenticated request reaches `/altvatar` or `/altvatar/[id]`
- **THEN** it redirects to `/`

### Requirement: A profile's space SHALL render an identity header and a Settings form

The space SHALL render an identity header carrying the profile's name, its avatar per `altvatar`'s resolution chain, tagline where present, and accent, followed by a Settings form over the profile's name and tagline. It SHALL render for a self-profile and a managed profile alike: a profile's name is editable — unlike the account name, which stays as the accountability anchor an external identity provider keeps writing — so renaming a self-profile here never touches the account.

Below the identity header the space SHALL render its panels behind a tab strip, with Settings first. For a managed profile the strip SHALL additionally carry a Permissions tab, ordered after Settings — `profile-permissions` owns what that section contains, who may operate it, and why it is absent from a self-profile's space; this requirement fixes only that the space is where it appears.

The strip SHALL carry a Lists tab last, rendering every list the profile owns whatever each one's visibility. The panel discloses nothing the viewer's membership does not already carry: the space renders its member view only for an account holding a membership on the profile, and such an account can already see the same lists by acting as that profile.

The identity header's avatar SHALL carry an edit affordance opening the Altvatar customizer, for a viewer whose role is `self` or `owner` and no other. This is how a profile's face and accent are changed: both are edited inside the customizer, and neither appears as a field of the Settings form. The customizer writes nothing itself; confirming it commits, because this host is editing a profile that already carries an identity, per `altvatar`. The Settings form's own submit commits the name and tagline alone, and SHALL be inert while neither field is dirty — those fields are the only thing it still commits, so a press with none of them edited could only write what is already stored.

Where the viewer's role on the profile is `manager`, every control in the space that their role forbids SHALL render in a **disabled** state rather than be omitted, so the space reads as one they lack the right to use rather than as one without the feature. The Settings form SHALL render with every field disabled and its submit control present but disabled, and the identity header's avatar SHALL carry a disabled edit affordance. Enforcement never rests on the disabled control: a manager who submits by any other means is refused by the action.

Where the profile carries no stored accent, the customizer SHALL open with one preset selected, chosen at random on each open, and SHALL write nothing until the viewer confirms. Dismissing the customizer without confirming SHALL leave the profile with no stored accent. No identity is rolled for a viewer who cannot commit it: for a `manager` the header renders what the profile actually holds.

#### Scenario: An owner sees an editable form

- **WHEN** a viewer holding `self` or `owner` opens the profile's space
- **THEN** the Settings form's fields are editable and a submit control is present

#### Scenario: The identity header's avatar opens the customizer

- **WHEN** a viewer holding `self` or `owner` activates the identity header's avatar edit affordance
- **THEN** the Altvatar customizer opens for that profile

#### Scenario: The Settings form carries no accent field

- **WHEN** a viewer holding `self` or `owner` opens the profile's space
- **THEN** the Settings form's fields are the profile's name and tagline, and no accent picker renders among them

#### Scenario: A manager sees the settings but cannot edit them

- **WHEN** a viewer holding `manager` opens the profile's space
- **THEN** the Settings form renders with every field disabled
- **AND** its submit control is present and disabled
- **AND** the identity header's avatar edit affordance is present and disabled

#### Scenario: A managed profile's space carries a Permissions section

- **WHEN** a viewer holding any membership opens a managed profile's space
- **THEN** the tab strip carries a Permissions tab ordered after Settings
- **AND** selecting it renders the Permissions section

#### Scenario: A self-profile's space carries no Permissions tab

- **WHEN** a viewer opens their own self-profile's space
- **THEN** the tab strip carries Settings and Lists and no Permissions tab

#### Scenario: The Lists tab renders the profile's own lists

- **WHEN** a viewer holding any membership opens a profile's space and selects the Lists tab
- **THEN** every list the profile owns renders, whatever its visibility

#### Scenario: The Settings form suggests without writing

- **WHEN** a viewer opens the space of a profile carrying no stored accent and opens its customizer
- **THEN** one preset is selected
- **AND** the profile still carries no stored accent

#### Scenario: The Settings form's submit touches neither accent nor art

- **WHEN** an owner edits the name and tagline and submits the Settings form
- **THEN** the name and tagline columns are updated
- **AND** neither the accent preference row nor the Altvatar row is written

### Requirement: Only a profile's self or owner member SHALL change its settings

The action that updates a profile's name, tagline, accent or Altvatar SHALL resolve the acting account from the session, load the acting account's membership on the target profile, and proceed only where that membership's role is `self` or `owner`. A `manager` and a non-member SHALL both be rejected with `Unauthorized` and no write SHALL occur.

Enforcement SHALL be independent of what the page rendered: a manager who submits the form by any means is rejected by the action, not by the disabled fields. `server-endpoint-authorization` owns the general rule that a mutation resolves its actor from the session and checks before writing; this requirement fixes which roles pass for a profile.

Identity is what this rule protects: a profile's name, tagline, accent and face are how it is recognized wherever it appears, so changing them is an ownership act. Which further rights a `manager` holds is settled by the capability that introduces profile permissions, and this requirement is the floor it starts from.

The accent and the Altvatar art are written by an action of their own, separate from the one that writes the name and tagline columns — the two commit at different moments, per the identity header's requirement above, and `profiles-data-model` and `altvatar` own why the rows are separate. That identity action writes the accent and the art together and MAY persist one and fail the other. Where either fails it SHALL report failure rather than success, and SHALL NOT name which half failed: neither half is recoverable by hand and both are fixed the same way — by confirming again — so naming the half would offer the viewer a distinction they cannot act on. Reporting at all is what matters, because the surface has already repainted to the confirmed identity, so silence would let the screen lie about what was stored. This is deliberately unlike creation, which reports success and lets the profile render the fallback: a creator has no prior identity to lose and is navigated away.

#### Scenario: A manager's submission is rejected

- **WHEN** a viewer holding `manager` invokes the profile-update action
- **THEN** it returns `Unauthorized` and no column, no preference row and no Altvatar row is written

#### Scenario: A non-member's submission is rejected

- **WHEN** a viewer holding no membership on the profile invokes the profile-update action
- **THEN** it returns `Unauthorized` and no write occurs

#### Scenario: An owner's submission persists every field

- **WHEN** a viewer holding `owner` confirms a changed accent and Altvatar and submits a changed name and tagline
- **THEN** the name and tagline columns, the accent preference value and the Altvatar row are all updated, and subsequent reads return them
- **AND** each was written at its own moment: the identity on confirm, the fields on submit

#### Scenario: An owner's field submission persists the fields alone

- **WHEN** a viewer holding `owner` submits a changed name and tagline
- **THEN** the name and tagline columns are updated, and subsequent reads return them
- **AND** neither the accent preference value nor the Altvatar row is written

#### Scenario: An owner's confirmed identity persists both halves

- **WHEN** a viewer holding `owner` confirms a changed accent and Altvatar in the customizer
- **THEN** the accent preference value and the Altvatar row are updated, and subsequent reads return them

#### Scenario: A member updates their own self-profile

- **WHEN** a viewer submits a changed name on the profile they hold `self` on
- **THEN** the profile's name is updated and no account record is written

#### Scenario: An accent that fails to save is reported, not swallowed

- **WHEN** an owner confirms an identity and the accent value fails to persist
- **THEN** the identity action reports failure rather than success
- **AND** the name and tagline columns are untouched

#### Scenario: A half-saved identity is reported, not swallowed

- **WHEN** an owner confirms an identity and either the accent value or the Altvatar row fails to persist
- **THEN** the identity action reports failure rather than success
- **AND** the message does not claim the identity was stored

### Requirement: A profile change SHALL be visible on the next read of any surface that shows it

Where a profile is created, or its name, tagline, accent or Altvatar changed, the next read of any surface listing or rendering that profile SHALL reflect the change. A viewer SHALL NOT have to force a reload to see a profile they just created or edited.

A rejected write SHALL leave every such surface as it was: an `Unauthorized` submission changes nothing a reader can observe.

#### Scenario: A created profile appears without a reload

- **WHEN** a viewer creates a managed profile
- **THEN** the Profiles page lists it on the next read

#### Scenario: An edited profile shows its new identity

- **WHEN** an owner changes a profile's name, tagline, accent or Altvatar
- **THEN** the next read of its card and of its space shows the submitted values

#### Scenario: A new face reaches every surface that renders it

- **WHEN** a viewer changes their self-profile's Altvatar
- **THEN** the next read of the frame's avatar circle, the switcher's rows, and their profile card all show the new art

#### Scenario: A rejected write changes nothing observable

- **WHEN** a `manager`'s submission is rejected
- **THEN** every surface still shows the profile's previous values

### Requirement: The managed-profile birth form SHALL be an overlay on the Profiles page

Creating a managed profile SHALL be an overlay opened from a "New Profile" control in the Profiles page header, not a route of its own. It has exactly one call site, so there is no navigation to intercept.

The form SHALL carry three inputs: name, required, between 1 and 60 characters after trimming; tagline, optional, subject to the tagline contract `profiles-data-model` owns; and an Altvatar, edited through the customizer `altvatar` owns, which carries the accent with it. The name floor is 1 rather than the 3 that list and item names use, because two-character names are real names.

The Altvatar SHALL be pre-seeded and its accent SHALL open on a preset chosen at random, so submitting the form without opening the customizer is valid and always produces a profile with a face and a colour. Random rather than fixed: a fixed opening selection lands every profile whose creator did not change it on one colour and one face, which is the failure a generated identity exists to prevent. The random choice SHALL NOT be determined by the creating account, the profile, or any other existing value — none of which the form holds, since the profile has no id until creation.

The form SHALL NOT carry a separate accent field: accent and face are one identity, edited in one place.

The form SHALL wear the customizer's own header band in place of a title bar — the brand mark on the accent the form is currently holding, repainting live as that accent changes, with the close affordance in the band. The mark is the form's own label, so a title beside it would name the same thing twice, and the band is what puts the colour being chosen on the surface choosing it from the first render. Its actions SHALL sit in a footer of the same family rather than the shell's, so the band and the footer frame the form as one piece. The shell hosting it is unchanged in every other respect.

On success the browser SHALL navigate to the new profile's space, and no success toast SHALL be raised — the navigation is the confirmation, and a toast raised into it would be discarded. On failure the overlay SHALL stay mounted, render the returned message inline, and raise a failure toast; no navigation SHALL occur.

The rows this form writes, and their atomicity, are owned by `profiles-data-model`.

#### Scenario: The form wears the accent it is holding

- **WHEN** a viewer changes the accent inside the form's customizer and confirms
- **THEN** the form's header band repaints to the new accent
- **AND** no title bar of the shell's own renders

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

#### Scenario: The form opens on a composed Altvatar

- **WHEN** the birth form opens
- **THEN** an Altvatar is already composed
- **AND** it is not determined by the creating account or any existing profile

#### Scenario: Submitting untouched still gives the profile a face

- **WHEN** a viewer submits the form with a name and never opens the customizer
- **THEN** the created profile carries Altvatar art and a stored accent

#### Scenario: No accent field renders beside the fields

- **WHEN** the birth form renders
- **THEN** its inputs are name, tagline, and the Altvatar affordance, and no accent picker renders among them
