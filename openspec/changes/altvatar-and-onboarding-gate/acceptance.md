# Acceptance — altvatar-and-onboarding-gate

<!-- Given/When/(And…)/Then user-journey flows for this change.
     One atom per row: a single action or a single assertion. A When is one
     action by the chain's root actor, carrying that actor's literal handle;
     a Then asserts what the execution emitted. Stages in strict order of
     appearance — any stage recurring after a later one (When after Then,
     Given after When) = a new flow; split it.
     Drafted at propose time by chaining the change's scenarios onto
     pre-existing canonical-spec links; refined at apply time with literal
     handles (real button text, real routes) — refine, not rewrite.
     State the principle, never an imagined shape. Where a row needs a
     handle nobody has yet, mark the gap inline instead of inventing one:
     `*TODO: specify what the user clicks on*`. Apply resolves every
     marker, and tasks.md carries one task per marker. A marker fills a
     missing handle, never missing thought — the arc, the root actor and
     every assertion stay concrete.
     While any finding stands, no flows are written and this file does not
     exist.
     Contract: the acceptance artifact instruction in schema.yaml. -->

## Flows

### Flow: An account with no self-profile meets the gate instead of the page it asked for

- **Given** an authenticated account holding no `self` membership
- **When** it requests `/lists`
- **Then** the onboarding gate renders
- **And** no list collection renders
- **And** no read for the `/lists` page is issued
- **And** the address bar still reads `/lists`
- **And** no redirect occurred

### Flow: An account whose self-profile carries no art meets the gate

- **Given** an authenticated account holding a `self` membership
- **And** that profile carries no Altvatar row
- **When** it requests `/items`
- **Then** the onboarding gate renders
- **And** no items library renders
- **And** the gate's copy does not describe creating an account
- **And** the gate presents the same inputs, in the same arrangement, as it does for an account with no self-profile

### Flow: A new account is addressed as signing up

- **Given** an authenticated account holding no `self` membership
- **When** it requests any page inside the application frame
- **Then** the gate's copy addresses completing sign-up
- **And** the gate's cancel control states that cancelling abandons the account

### Flow: A shared list link is gated like every other page

- **Given** an authenticated account holding no `self` membership
- **And** a public list owned by a profile the account does not run
- **When** it opens that list's URL
- **Then** the onboarding gate renders
- **And** none of the list's items render

### Flow: An onboarded account is not gated

- **Given** an authenticated account whose self-profile carries Altvatar art
- **And** the same account runs a managed profile carrying no Altvatar art
- **When** it requests `/lists`
- **Then** its list collection renders
- **And** the onboarding gate does not render

### Flow: A signed-out visitor is unaffected

- **Given** an unauthenticated request
- **When** it reaches any page
- **Then** the gate does not render
- **And** the page behaves as it does for an account that has onboarded

### Flow: The gate offers no route out

- **Given** the onboarding gate is showing for an un-onboarded account
- **When** the viewer presses Escape
- **And** clicks the gate's backdrop directly
- **And** reloads the page
- **Then** the gate is still showing after each
- **And** no close control is present in the gate

### Flow: A new account completes the gate and lands on the page it asked for

- **Given** an authenticated account holding no `self` membership
- **And** it requested `/lists` and the gate rendered
- **When** the viewer types a name into the gate's name input
- **And** clicks `Create my profile`
- **Then** a profile row carrying that name exists
- **And** a membership row with role `self` links the account to it
- **And** an Altvatar row exists for that profile
- **And** an accent preference value is stored for that profile
- **And** the `/lists` collection renders without a manual reload
- **And** the gate does not render

### Flow: The gate's name input arrives pre-filled

- **Given** an authenticated un-onboarded account carrying a name
- **When** it requests any page inside the application frame
- **Then** the gate's name input holds that name
- **And** the gate's only inputs are the name and the Altvatar

### Flow: A nameless account gets an empty name input

- **Given** an authenticated un-onboarded account carrying no name
- **When** it requests any page inside the application frame
- **Then** the gate's name input is empty

### Flow: Submitting an untouched gate still yields a face and a colour

- **Given** the gate is showing for an un-onboarded account
- **And** an Altvatar is already composed in the gate
- **When** the viewer clicks the gate's submit control (`Create my profile`, or `Save and continue` on the existing-account arm) without opening the customizer
- **Then** the submission succeeds
- **And** the stored art is the Altvatar the gate was showing
- **And** the profile carries a stored accent

### Flow: A blank name is rejected without a write

- **Given** the gate is showing for an un-onboarded account
- **When** the viewer clears the name input
- **And** clicks `Create my profile`
- **Then** a field error is rendered on the name input
- **And** no profile row is written
- **And** no membership row is written
- **And** no Altvatar row is written

### Flow: An existing account is renamed rather than duplicated

- **Given** an authenticated account whose self-profile is named `UNTITLED`
- **And** that profile carries no Altvatar row
- **When** the viewer types a name into the gate's name input
- **And** clicks `Save and continue`
- **Then** that profile's name is the submitted name
- **And** exactly one profile with a `self` membership exists for the account
- **And** an Altvatar row exists for that profile
- **And** no migration or background pass rewrote the name

### Flow: A partial submission leaves the gate standing

- **Given** a submission wrote an account's self-profile and its `self` membership
- **And** the Altvatar write failed
- **When** the account requests any page inside the application frame
- **Then** the onboarding gate renders
- **And** no page content renders

### Flow: Re-submitting after a partial write succeeds

- **Given** an account whose previous submission wrote only the profile and its membership
- **When** the viewer clicks the gate's submit control again
- **Then** the submission succeeds
- **And** no duplicate profile is created
- **And** an Altvatar row exists for that profile
- **And** the next read no longer finds the account un-onboarded

### Flow: Cancelling a fresh sign-up raises a confirmation before deleting anything

- **Given** the gate is showing for an account holding no `self` membership
- **When** the viewer clicks `Cancel` in the gate
- **Then** a confirmation is raised stating that the account will be deleted
- **And** the account row still exists
- **And** its authentication records still exist

### Flow: Declining the confirmation returns to the gate

- **Given** the gate's deletion confirmation is showing
- **When** the viewer clicks `Cancel` in the confirmation
- **Then** the gate is still showing
- **And** the account row still exists

### Flow: Confirming deletes the account and signs out

- **Given** the gate's deletion confirmation is showing
- **When** the viewer clicks `Delete account`
- **Then** the account row is gone
- **And** its authentication records are gone
- **And** the viewer is signed out

### Flow: Cancelling an existing account only signs out

- **Given** the gate is showing for an account that already holds a `self` membership
- **When** the viewer clicks `Cancel` in the gate
- **Then** the viewer is signed out
- **And** no confirmation was raised
- **And** the account row still exists
- **And** its profile row still exists

### Flow: An account abandoned at the gate is still cancellable later

- **Given** an account reached the gate and the browser was closed without submitting or cancelling
- **When** the account signs in again and requests any page inside the application frame
- **Then** the account row still exists
- **And** it still holds no `self` membership
- **And** the onboarding gate renders

### Flow: The customizer opens on the profile's stored art

- **Given** a viewer holding `self` or `owner` on a profile carrying Altvatar art
- **When** the viewer opens that profile's space
- **And** activates the identity band's `Edit Altvatar` control
- **Then** the customizer opens
- **And** its preview shows the profile's stored art
- **And** no axis holds a newly-rolled value

### Flow: The customizer opens on a shuffled face where the profile has none

- **Given** a viewer holding `owner` on a profile carrying no Altvatar art
- **When** the viewer activates the identity band's `Edit Altvatar` control
- **Then** the customizer opens
- **And** its preview shows a composed face
- **And** the style it opened on was rolled rather than fixed
- **And** the profile still carries no Altvatar row

### Flow: Shuffle re-rolls every curated axis

- **Given** the customizer is open with several controls set by hand
- **When** the viewer activates `Surprise me`
- **Then** every curated axis holds a newly-chosen value
- **And** the preview redraws
- **And** no axis is left without an explicit value

### Flow: Shuffle re-rolls the style along with the axes

- **Given** the customizer is open on a style whose controls the viewer has set by hand
- **When** the viewer activates `Surprise me` repeatedly
- **Then** the style changes across the rolls
- **And** the controls on offer are the rolled style's, and the viewer is left on a group of controls it has
- **And** no roll lands on the style whose whole content is a single glyph choice

### Flow: A style change resolves every axis

- **Given** the customizer is open on a style whose selections hold a canonical value the target style also maps
- **And** a canonical value the target style does not map
- **And** an axis the target style does not have at all
- **And** a chosen skin colour
- **When** the viewer selects the target style through the customizer's `Avatar style` radio group
- **Then** the axis both styles map still holds its value, redrawn in the new style
- **And** the axis the target style cannot map still holds the value it held, with no control reading as chosen, drawn as absent where that style can express absence and as its own default where it cannot
- **And** no control renders for the axis the target style lacks, and its value is unchanged
- **And** switching back to the first style shows every one of those values again, unchanged
- **And** the same skin colour is in force

### Flow: A native option the vocabulary does not name is never offered

- **Given** the selected style exposes a native value that the vocabulary does not name
- **When** the viewer steps through every value of that axis in the customizer
- **Then** the unnamed value is never offered
- **And** no selection produces it
- **And** no control anywhere in the customizer displays the drawing library's own name for any value

### Flow: Changing the accent inside the customizer re-colours without regenerating art

- **Given** the customizer is open on a profile's stored art
- **When** the viewer selects a different accent preset in the customizer's accent picker
- **Then** the preview renders on the new accent's light stop
- **And** the art itself is unchanged

### Flow: A single-choice style is offered as a grid

- **Given** the customizer is open
- **When** the viewer selects a style whose only option is which glyph to draw through the customizer's `Avatar style` radio group
- **Then** the customizer offers a grid of glyphs
- **And** no control stack renders

### Flow: Cancelling the customizer keeps the host's values

- **Given** the customizer is open from a profile's Settings form
- **When** the viewer changes several controls
- **And** activates `Cancel` in the customizer
- **Then** the host form holds the values it held before the customizer opened

### Flow: Confirming the customizer writes nothing on a creating host

- **Given** the customizer is open from the managed-profile birth form
- **When** the viewer changes several controls
- **And** activates `Use this Altvatar`
- **And** dismisses the birth form without submitting it
- **Then** no profile is created
- **And** no Altvatar row and no accent preference row is written

### Flow: Confirming the customizer commits on an editing host, and every surface follows

- **Given** a viewer holding `owner` on a profile, with the customizer open from its identity header
- **When** the viewer changes the style, several controls and the accent
- **And** activates `Use this Altvatar`
- **Then** the profile holds the confirmed style, selections and accent, with no further submit
- **And** the stored art is the server's rendering of those selections
- **And** the identity header repaints to the confirmed accent and art
- **And** the next read of the frame's active-profile circle shows the new art
- **And** the next read of the switcher's row for that profile shows the new art
- **And** the next read of that profile's card shows the new art

### Flow: The Settings form's own submit touches neither accent nor art

- **Given** a viewer holding `owner` on a profile that carries a stored accent and Altvatar
- **When** the viewer edits the name and tagline and submits the Settings form
- **Then** the profile's name and tagline columns hold the submitted values
- **And** the stored accent is unchanged
- **And** the stored Altvatar row is unchanged

### Flow: The Settings form carries no accent field

- **Given** a viewer holding `self` or `owner` on a profile
- **When** the viewer opens that profile's space
- **Then** the Settings form's fields are the profile's name and tagline
- **And** no accent picker renders among them

### Flow: A client-supplied rendering is never persisted

- **Given** a viewer holding `owner` on a profile
- **When** the viewer POSTs to the Altvatar save action with a rendering alongside its selections
- **Then** the stored art is the server's own rendering of those selections
- **And** the submitted rendering is not persisted

### Flow: Stored art is what renders, and it carries no background of its own

- **Given** a profile carrying Altvatar art
- **When** a viewer loads a surface rendering that profile
- **Then** the surface shows the stored rendering
- **And** no art is generated during the request
- **And** the art paints no background behind the figure
- **And** the accent's light stop is painted behind it by the avatar slot

### Flow: Changing a profile's accent re-colours its avatar without touching its art

- **Given** a profile carrying Altvatar art and a stored accent
- **When** its owner changes the accent and leaves the Altvatar selections alone
- **Then** the profile's avatar renders on the new accent's light stop
- **And** the stored art row is unchanged

### Flow: A glyph style takes the accent's ink

- **Given** a profile whose style draws a single-colour glyph
- **When** a viewer loads a surface rendering that profile
- **Then** the glyph is painted in the accent's ink
- **And** no glyph colour is baked into the stored art

### Flow: A profile with no art renders initials

- **Given** a profile row created by a path that wrote no Altvatar art
- **When** a viewer loads a surface rendering that profile
- **Then** the avatar slot renders the profile's initials on the accent's light stop
- **And** no generic user icon renders

### Flow: A managed profile carries a face on the same terms as a self-profile

- **Given** a managed profile carrying Altvatar art
- **And** a self-profile carrying Altvatar art
- **When** a viewer loads `/profiles`
- **Then** both cards render their own art
- **And** neither is distinguished by whether an account backs it
- **And** no account image column is among the sources of either

### Flow: The frame's avatar circle shows the active profile

- **Given** an authenticated viewer whose active profile carries Altvatar art
- **When** the viewer loads any page inside the application frame
- **Then** the nav avatar circle renders that art
- **And** it carries that profile's accent as a ring
- **And** the viewer's own account image is not rendered in the nav

### Flow: A list's byline renders its owning profile's face

- **Given** a list owned by a managed profile carrying Altvatar art
- **When** an authenticated viewer who is not the owner loads that list
- **Then** the byline's 44px avatar renders that art
- **And** the owner's name renders as an anchor with `href="/user/{owner_id}"`
- **And** no account image is consulted
- **And** no generic user icon renders

### Flow: A claims row renders each purchaser on its own terms

- **Given** an item claim whose purchaser is a profile carrying Altvatar art
- **And** a second claim whose purchaser was entered as free text
- **When** a viewer opens the purchase modal's already-claimed state
- **Then** the first row's avatar renders that profile's art
- **And** the second row's avatar renders initials derived from the entered name
- **And** neither row branches on whether an account backs the purchaser

### Flow: The brand mark announces one word

- **Given** the onboarding gate is showing
- **When** a screen reader reaches the Altvatar brand mark
- **Then** its accessible name is exactly `Altvatar`
- **And** no part of its construction is announced separately

### Flow: The managed-profile birth form creates a profile with a face and a colour

- **Given** a viewer on `/profiles`
- **When** the viewer clicks `New Profile`
- **And** types a name
- **And** clicks `Create Profile` without opening the customizer
- **Then** the created profile carries an Altvatar row
- **And** it carries a stored accent
- **And** the browser navigates to that profile's space
- **And** no accent picker rendered among the form's inputs

### Flow: The birth form's opening Altvatar is not derived from anything existing

- **Given** a viewer on `/profiles`
- **When** the viewer clicks `New Profile`
- **Then** an Altvatar is already composed in the form
- **And** one accent preset is already selected
- **And** neither is determined by the creating account or any existing profile

### Flow: A manager sees the settings but cannot edit them

- **Given** a viewer holding `manager` on a profile
- **When** the viewer opens that profile's space
- **Then** every field of the Settings form is disabled
- **And** no submit control is present
- **And** the identity header's avatar carries no edit affordance

### Flow: A manager's profile-update attempt writes nothing

- **Given** a viewer holding `manager` on a profile
- **When** the viewer POSTs to the profile-update action with a changed name, accent and Altvatar
- **Then** the action returns `Unauthorized`
- **And** no profile column is written
- **And** no preference row is written
- **And** no Altvatar row is written

### Flow: A half-saved identity is reported, not swallowed

- **Given** a viewer holding `owner` on a profile, confirming a changed accent and Altvatar
- **And** one of the two writes will fail
- **When** the viewer activates `Use this Altvatar`
- **Then** the identity action reports failure rather than success
- **And** its message does not claim the identity was stored
- **And** the profile's name and tagline columns are untouched

### Flow: A managed profile survives a failed art write

- **Given** a viewer creating a managed profile
- **And** the Altvatar write will fail
- **When** the viewer clicks `Create Profile`
- **Then** the profile row exists
- **And** its `owner` membership row exists
- **And** it carries no Altvatar row
- **And** its card renders initials

### Flow: An ordinary form shell still dismisses

- **Given** a viewer on `/profiles` with the `New Profile` overlay open
- **When** the viewer clicks the overlay backdrop directly
- **Then** the overlay is dismissed
- **And** a close control was present in its header before the click

### Flow: The migration creates the table without onboarding anyone

- **Given** a database holding profiles and no Altvatar table
- **When** the owner runs `npm run db:migrate`
- **Then** the exit code is `0`
- **And** the Altvatar table exists
- **And** it holds zero rows
- **And** every existing profile still renders initials

### Flow: A second Altvatar row for one profile is rejected

- **Given** a profile already holding an Altvatar row
- **When** the owner inserts a second Altvatar row for that profile
- **Then** the database rejects the insert
- **And** the profile still holds exactly one Altvatar row

### Flow: Deleting a profile discards its art

- **Given** a profile holding an Altvatar row
- **When** the owner deletes that profile row
- **Then** no Altvatar row for that profile remains

### Flow: The seed leaves both un-onboarded populations standing

- **Given** a local database holding seeded profiles and a profile created by hand carrying a seeded user's membership
- **When** the owner runs `npm run db:reset:dev`
- **Then** the exit code is `0`
- **And** every previously-held profile, membership, preference and Altvatar row is gone
- **And** the primary test viewer's self-profile carries Altvatar art
- **And** one seeded account holds no membership at all
- **And** another seeded account holds a self-profile carrying no Altvatar art
- **And** neither un-onboarded account is the primary test viewer

### Flow: A local page renders for the seeded viewer rather than gating

- **Given** a local database freshly seeded
- **And** `USE_PG_DRIVER=1` with the identity selector unset
- **When** the owner loads `/lists`
- **Then** the list collection renders
- **And** the onboarding gate does not render

### Flow: A non-default bypass identity resolves an actor

- **Given** `USE_PG_DRIVER=1`
- **And** `BYPASS_SESSION_USER` naming a seeded user id other than `dev-test-viewer`
- **When** a server component resolves the acting account from that session
- **Then** it resolves to that seeded account
- **And** it does not resolve to nothing

### Flow: The e2e suite exercises the gate without consuming its fixtures

- **Given** a seeded e2e database holding both un-onboarded fixtures
- **When** the owner runs `npm run test:e2e`
- **Then** the exit code is `0`
- **And** both un-onboarded seeded identities are still un-onboarded
- **And** both still exist
- **And** re-running the suite against the same database exits `0` again
