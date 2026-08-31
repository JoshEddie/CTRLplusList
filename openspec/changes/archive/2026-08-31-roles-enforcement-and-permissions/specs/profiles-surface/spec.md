## MODIFIED Requirements

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
