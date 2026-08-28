## Purpose

Generated avatar art as a profile's face — the per-profile art it holds, the app-owned option vocabulary that lets one set of choices span several drawing styles, the customizer that edits it, and the brand it ships under. No uploads: every face in the app is generated.

## ADDED Requirements

### Requirement: A profile's Altvatar SHALL live in its own row, at most one per profile, never created automatically

Altvatar art SHALL be held in its own table, keyed so that a profile has at most one row. The row SHALL carry the chosen style, the profile's option selections, and the rendered art. Rows SHALL cascade away when their profile is deleted.

No row SHALL be created automatically — not by account creation, not by a migration, not by a seeding default. A row exists only because something wrote it on a profile's behalf, which is what lets its absence carry meaning for `onboarding-gate`.

A profile carrying no row SHALL render the initials fallback `profiles-surface` fixes, exactly as every profile did before this capability existed.

#### Scenario: A profile is born with no art

- **WHEN** a profile row is created by any path that does not itself write Altvatar art
- **THEN** no Altvatar row exists for it
- **AND** every surface rendering that profile shows its initials

#### Scenario: A second row for one profile is rejected

- **WHEN** an insert attempts a second Altvatar row for a profile that already holds one
- **THEN** the database rejects it

#### Scenario: Deleting a profile discards its art

- **WHEN** a profile holding Altvatar art is deleted
- **THEN** its Altvatar row is gone

### Requirement: Altvatar options SHALL be named in an app-owned vocabulary, mapped per style

Every option a viewer can choose SHALL be named by this capability rather than by the drawing library — both the axis (for example, hair) and the value (for example, short-curly). A per-style table SHALL map each canonical value to the native option that style draws it with. The library's own names SHALL reach neither a viewer nor storage.

The vocabulary SHALL be a closed whitelist: a native option carrying no canonical name SHALL NOT be offered, so a library release adds nothing until it is named. The mapping table MAY be incomplete, because matching an opaquely-named native value to a canonical one can only be done by looking at rendered art.

Selecting a style SHALL resolve every axis:

- An axis the selected style does not have SHALL render no control, and its stored value SHALL be left untouched.
- An axis the style has, whose stored canonical value that style maps, SHALL render that value unchanged.
- An axis the style has, whose stored canonical value that style does not map, SHALL keep that stored value. That style SHALL draw the part as absent where it can express absence, and as its own default where it cannot; no control SHALL read as chosen.

A style change SHALL overwrite no stored value. Only choosing a value SHALL replace one — so a viewer who returns to a style that draws what they chose SHALL find it still chosen, and a style with no close equivalent SHALL leave the choice alone rather than substitute its nearest thing for it.

An axis holding nothing at all SHALL take the selected style's default, so every control a viewer can see starts on a value.

Colour axes are style-independent and SHALL therefore carry across a style change verbatim wherever the target style has the axis at all.

#### Scenario: Storage holds the canonical value

- **WHEN** a viewer picks an option and saves
- **THEN** the stored value is this capability's own name for it, not the drawing library's

#### Scenario: A native option with no canonical name is not offered

- **WHEN** a style exposes a native value that the vocabulary does not name
- **THEN** no control offers it, and no selection can produce it

#### Scenario: A shared value survives a style change

- **WHEN** a viewer holding a canonical value that both the current and the target style map changes style
- **THEN** that axis still holds that value, and the art redraws it in the new style

#### Scenario: An unmapped value is kept rather than substituted

- **WHEN** a viewer changes to a style that has the axis but maps no native value to the stored canonical one
- **THEN** the stored value is unchanged, and the art draws that part as absent where the style can express absence and as its own default where it cannot

#### Scenario: A value survives the style that could not draw it

- **WHEN** a viewer changes to a style that cannot draw a stored value, and then back to one that can
- **THEN** that axis holds the value it held before either change

#### Scenario: An axis the style lacks keeps its value

- **WHEN** a viewer changes to a style that has no counterpart for an axis at all
- **THEN** no control for that axis renders, and the stored value is unchanged

#### Scenario: Colour carries across a style change

- **WHEN** a viewer holding a chosen skin colour changes to another style that has a skin colour axis
- **THEN** the same colour is in force after the change

### Requirement: Rendered art SHALL be derived server-side from the stored selections

The rendered art SHALL be produced on the server from the submitted selections on every save, and SHALL NOT be accepted from a client — a client-supplied rendering is arbitrary content displayed to other people. Surfaces rendering a profile SHALL read the stored art; only the customizer reads the selections.

Because the rendering is stored rather than recomputed, upgrading the drawing library SHALL NOT redraw art already saved.

#### Scenario: Saving regenerates the art

- **WHEN** a save carries selections differing from the stored ones
- **THEN** the stored art is the rendering of the submitted selections

#### Scenario: A submitted rendering is ignored

- **WHEN** a save payload carries a rendering alongside its selections
- **THEN** the stored art is the server's own rendering of those selections, and the submitted one is not persisted

#### Scenario: Reads take the stored art

- **WHEN** a surface renders a profile holding Altvatar art
- **THEN** it shows the stored rendering, and no art is generated during the request

### Requirement: Altvatar art SHALL carry no background of its own

Generated art SHALL be transparent behind the figure. The colour behind it is the accent's light stop, painted by the avatar slot `profiles-surface` owns, so changing a profile's accent SHALL re-colour its avatar without regenerating any art.

Where a style draws a single-colour glyph rather than a figure, the glyph SHALL be painted in the accent's ink rather than in a colour baked into the art, so it re-themes with the accent on the same terms. It SHALL be painted at the ink's full strength: the disc reads the art's shape and nothing else, so any transparency the style drew the glyph with SHALL be removed on the path that derives the art rather than dimming the ink.

#### Scenario: Art has no background of its own

- **WHEN** generated art is inspected
- **THEN** it paints no background behind the figure

#### Scenario: Changing the accent re-colours the avatar without touching the art

- **WHEN** a profile's accent changes and its Altvatar selections do not
- **THEN** the avatar renders on the new accent's light stop
- **AND** the stored art is unchanged

#### Scenario: A glyph style takes the accent's ink

- **WHEN** a profile whose style draws a single-colour glyph renders
- **THEN** the glyph is painted in the accent's ink, at full strength rather than dimmed by the art

### Requirement: The customizer SHALL offer style, the styles' own controls, and shuffle, over a live preview

The customizer SHALL render a live preview of the art as edited, wearing the profile's accent, alongside a choice of style, the accent picker, and the controls the selected style has. Controls SHALL be curated rather than exhaustive: the customizer offers what this capability names, never every option the library exposes.

Shuffle SHALL re-roll the style along with every curated axis at once. There is no notion of a pinned or unpinned axis: every axis always holds an explicit value, so nothing has to be unselected. The style SHALL be drawn from the styles that draw a figure — a style whose whole content is a single glyph choice is a deliberate selection rather than a roll — and the controls on offer SHALL follow the rolled style, leaving the viewer on a group of controls that style has.

A roll SHALL NOT treat every value on an axis as equally likely where that would misrepresent what a value means. Religious headwear SHALL be rolled at roughly the rate people wear it rather than at one in however many values the axis holds. Choosing it from a control SHALL remain exactly as available as choosing anything else — the weighting is on the dice, not on the offer.

The customizer SHALL open on the profile's stored art where it has any, and on a shuffled result — style included — where it has none, so opening a face that already exists never silently replaces it.

A style whose whole content is a single choice SHALL be offered as a grid of that choice rather than as a stack of controls.

#### Scenario: Opening on stored art shows that art

- **WHEN** the customizer opens for a profile holding Altvatar art
- **THEN** the preview shows that art, and no shuffle has occurred

#### Scenario: Opening with no stored art shows something

- **WHEN** the customizer opens for a profile holding no Altvatar art
- **THEN** the preview shows a shuffled result, in a style that was rolled rather than fixed

#### Scenario: Shuffle re-rolls every curated axis

- **WHEN** a viewer who has set several controls activates shuffle
- **THEN** every curated axis holds a newly-chosen value

#### Scenario: Shuffle re-rolls the style

- **WHEN** a viewer activates shuffle
- **THEN** the style may change, and every curated axis of the resulting style holds a newly-chosen value
- **AND** the controls on offer are that style's, and the viewer is left on a group of controls it has

#### Scenario: Religious headwear is rolled at its real-world rate

- **WHEN** a viewer rolls many faces in a style whose hat axis includes religious headwear
- **THEN** far fewer of them wear it than an even split across that axis would produce
- **AND** the control still offers it alongside every other hat

#### Scenario: Shuffle never lands on a glyph style

- **WHEN** a viewer activates shuffle repeatedly
- **THEN** the style is always one that draws a figure, and never one whose whole content is a single glyph choice

#### Scenario: The preview wears the profile's accent

- **WHEN** a viewer changes the accent inside the customizer
- **THEN** the preview re-renders on the new accent without regenerating the art

#### Scenario: A single-choice style is offered as a grid

- **WHEN** a viewer selects a style whose only option is which glyph to draw
- **THEN** the customizer offers a grid of glyphs and no control stack

### Requirement: Art SHALL stay legible at every option it offers

A face SHALL keep its features at every skin tone the customizer offers. Where a style draws brows, eyes and mouth by going darker than the skin, the darkest tones leave nothing darker to draw with — so the art SHALL be corrected on the path that derives it, by an amount that grows as the skin darkens and reaches nothing before the tones that never needed it. Removing a tone rather than correcting it SHALL NOT be the answer.

Every option a control offers SHALL be drawn as the face that choosing it produces. Where another axis hides the one being offered — a hat drawn through the same native part as the hair — the option art SHALL be drawn without that cover, so the options stay distinguishable and the axis stays choosable. The face itself SHALL keep the cover.

#### Scenario: A face keeps its features on the darkest skin

- **WHEN** a profile renders on the darkest skin tone the customizer offers
- **THEN** its brows, eyes and mouth are visible against that skin

#### Scenario: A light skin tone is drawn exactly as the style draws it

- **WHEN** a profile renders on a skin tone light enough to carry its own features
- **THEN** the art is unchanged from what the style produced

#### Scenario: A covered axis still offers distinguishable options

- **WHEN** a viewer wearing a hat opens the control for hair, in a style that draws both through one part
- **THEN** each option is drawn showing the hair it offers rather than the hat covering it
- **AND** the face itself still wears the hat

### Requirement: The customizer SHALL NOT persist; its host SHALL decide when confirming commits

Confirming in the customizer SHALL return the chosen style, selections and accent to the surface that opened it, and SHALL write nothing itself. **When** that return is persisted is the host's decision, because the hosts commit at different moments.

A host that is creating a profile — the managed-profile birth form, the onboarding gate — SHALL persist on its own submit, alongside the fields it collects. There is no prior identity to overwrite and no profile to write to until the submit succeeds, so confirming can only stage.

A host that is editing a profile which already carries an identity SHALL persist on confirm. Confirming the customizer is a decision the viewer has made and watched take effect; a name still being typed is not. Folding the two into one submit is what made every field submit re-write art that had not changed. Such a host SHALL repaint to the confirmed identity as it commits, so the surface never shows a face the profile does not hold, and its own submit SHALL commit the fields it collects and nothing else.

Cancelling the customizer SHALL return to its host with the host's prior values intact, and SHALL write nothing on any host.

#### Scenario: Confirming on an editing host commits immediately

- **WHEN** a viewer confirms in the customizer opened from a profile that already carries an identity
- **THEN** the profile's stored art and accent are the ones confirmed, with no further submit
- **AND** the surface repaints to them

#### Scenario: Confirming on a creating host writes nothing until submit

- **WHEN** a viewer confirms in the customizer opened from a creating host and then dismisses without submitting
- **THEN** no profile is created and nothing is written

#### Scenario: Cancelling the customizer keeps the host's values

- **WHEN** a viewer changes several controls and then cancels the customizer
- **THEN** the host form still holds the values it held before the customizer opened

### Requirement: Every avatar in the app SHALL resolve through one chain

Wherever a profile is rendered with a face — a profile card, the frame's active-profile circle, a switcher row, a profile space's identity header, a list's owner byline, a claims-list row, a form's preview — the face SHALL resolve as: the profile's Altvatar art where it has any, its initials otherwise.

No surface SHALL render an account's own image, and no surface SHALL branch on whether a profile is account-backed to decide whether a face is available. There SHALL be no third fallback beyond initials: a profile's name is required, so initials always resolve.

#### Scenario: A profile with art renders its art

- **WHEN** a surface renders a profile holding Altvatar art
- **THEN** the art fills the avatar slot

#### Scenario: A profile without art renders initials

- **WHEN** a surface renders a profile holding no Altvatar art
- **THEN** the slot renders the profile's initials on the accent's light stop

#### Scenario: A managed profile resolves the same way as a self-profile

- **WHEN** a surface renders a managed profile and a self-profile side by side, both holding art
- **THEN** both render their art, and neither is distinguished by whether an account backs it

#### Scenario: No account image is rendered anywhere

- **WHEN** any surface in the app renders an avatar
- **THEN** the account's own image column is not among its sources

### Requirement: A card carrying a profile's face SHALL carry that profile's accent with it

Wherever a card's subject is a profile, the card SHALL paint that profile's accent, so the disc sits on the colour the same profile carries everywhere else rather than on the surface's own background. A faceless profile is then still told apart by colour, which is what makes initials a fallback rather than a blank.

A profile card SHALL seat its disc against an accent field of the card's own — the disc reads as art on a background, not as a floating circle, and needs one to sit on. A card whose subject is not a profile but which names one — a list card naming its owner — SHALL carry the owner's accent on the card and render the owner's disc beside their name, not a band of its own: the card's subject is the list.

One profile SHALL render as one card. A surface listing profiles SHALL NOT offer a reduced variant alongside the full one — two anatomies for one subject is how the same profile comes to look like two different things in two rails.

#### Scenario: A profile card seats its disc on the profile's accent

- **WHEN** a card whose subject is a profile renders
- **THEN** the card carries that profile's accent, and the disc sits on an accent field of the card's own

#### Scenario: A list card carries its owner's accent without a band

- **WHEN** a card whose subject is a list renders with an owner
- **THEN** the card carries the owner's accent and renders the owner's disc beside their name

#### Scenario: Every surface listing profiles renders the same card

- **WHEN** two surfaces each list the same profile
- **THEN** both render it with the same anatomy

### Requirement: The generated-avatar feature SHALL be named Altvatar in the interface

Wherever the interface names this feature it SHALL read **Altvatar**, one word — in copy, in labels, and in the accessible name of the brand mark. The mark's constructed form SHALL NOT reach assistive technology as separate characters: whatever the mark is drawn from, its accessible name is the single word.

The mark SHALL render where the customizer and the onboarding gate name the feature, and SHALL NOT be scattered across surfaces that merely show an avatar.

#### Scenario: The mark announces one word

- **WHEN** the brand mark renders
- **THEN** its accessible name is exactly `Altvatar`
- **AND** no part of its construction is announced separately

#### Scenario: The interface uses the brand name

- **WHEN** a control or label names this feature
- **THEN** it reads `Altvatar`, not `avatar` or `profile picture`
