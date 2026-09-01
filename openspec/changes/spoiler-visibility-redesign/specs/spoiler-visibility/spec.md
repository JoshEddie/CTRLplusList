## Purpose

The `spoiler-visibility` capability governs how much claim information a viewer sees before they ask for it: how a viewer's spoiler state is resolved from their membership on the content's owning profile, the single four-stage tier that state carries and its value domain, where the member baseline is stored and how it is seeded, the transient per-list adjustment layered over it, and the projection each tier produces for every consuming surface to read.

## ADDED Requirements

### Requirement: Spoiler state SHALL resolve from the viewer's membership on the owning profile

The system SHALL resolve a viewer's spoiler state from the membership that viewer's **account** holds on the profile owning the content, regardless of which profile the request acts as. A viewer holding any membership on that profile SHALL be protected by that membership's baseline; a viewer holding none — including a signed-out viewer — SHALL receive the maximal projection, with nothing withheld.

Resolution SHALL NOT consult the ownership comparison used for authorization. A person cannot be un-spoiled after the fact, so protection is a property of the human and travels across every profile switch, while authorization continues to key off the acting profile per `profiles-data-model`.

#### Scenario: A member acting as another profile stays protected

- **WHEN** an account holding a membership on profile B opens a list owned by B while acting as profile A
- **THEN** the spoiler state resolves from that account's membership on B
- **AND** claim information is withheld according to that membership's baseline, even though the acting profile does not own the list

#### Scenario: A non-member sees everything

- **WHEN** an authenticated viewer holding no membership on the list's owning profile opens the list
- **THEN** the resolved state is the maximal projection and no claim information is withheld

#### Scenario: A signed-out viewer sees everything

- **WHEN** a signed-out viewer opens a list
- **THEN** the resolved state is the maximal projection, since no membership can be resolved for them

#### Scenario: The owner is resolved as a member, not as an owner

- **WHEN** an account opens a list owned by the profile it is acting as
- **THEN** the spoiler state resolves from that account's membership on the owning profile
- **AND** ownership contributes nothing to the resolution

### Requirement: The resolved state SHALL be a single tier on a four-stage progression

A resolved spoiler state SHALL be exactly one **tier**, one of `surprise`, `progress`, `claims`, or `identity`. The tiers form a monotonic progression: each admits everything the tier below it admits.

- **`surprise`** — nothing is disclosed. The list discloses no claim count, and every item is indistinguishable from an unclaimed one.
- **`progress`** — the list's total claimed count is disclosed, but no individual item discloses whether it is claimed.
- **`claims`** — each claimed item additionally discloses that it is claimed and what capacity remains; no claiming party is named.
- **`identity`** — the claiming parties are additionally named.

There is no independent list-level axis: the claimed count rides the progression, disclosed from `progress` upward, and no separate disclosure of who has been shopping exists. A tier is a single ordinal value, so a resolved state, a baseline, and the profile default are each one of the four stages.

#### Scenario: Progress discloses the count but no per-item fact

- **WHEN** a resolved state is `progress`
- **THEN** the list's total claimed count is disclosed
- **AND** no individual item discloses whether it is claimed

#### Scenario: The count is absent below progress

- **WHEN** a resolved state is `surprise`
- **THEN** the list discloses no claimed count
- **AND** no individual item discloses whether it is claimed

#### Scenario: Claims implies progress

- **WHEN** a resolved state is `claims`
- **THEN** each claimed item is disclosed as claimed with its remaining capacity
- **AND** the list's total claimed count is disclosed, since `claims` admits everything `progress` admits

### Requirement: The member baseline SHALL be stored per account on the profile and written concretely when the membership is created

A membership's baseline SHALL be a single tier. It SHALL be stored as a `profile_preferences` row keyed by the owning profile **and the member's account** (`profiles-data-model`), distinct from the profile-wide default row whose account key is null. The baseline SHALL be written when the membership is created: the creating account's at profile birth, and every other account's when an invite is accepted.

A profile SHALL carry a profile-level **default** tier — the null-account preference row — that seeds those writes. The default SHALL be read at the moment an invite is opened, and SHALL be offered to the joining account as the pre-filled value, which they MAY adjust before accepting. The default SHALL be a seed only: it SHALL be read to seed a written member row and SHALL NOT be consulted when resolving a member's state, so changing it SHALL NOT alter the baseline of any account already holding a membership.

Where a member has no baseline row — a membership predating this capability — resolution SHALL yield the fully protected default rather than falling through to the profile-level default row. A baseline SHALL be writable by the member it belongs to and by an owner of the profile. Where the two disagree, the later write SHALL stand.

#### Scenario: Acceptance writes a concrete baseline

- **WHEN** an account accepts an invite without adjusting the offered value
- **THEN** its new membership's baseline row carries the tier the profile default held when the invite was opened

#### Scenario: Changing the default moves nobody

- **WHEN** an owner changes the profile-level default after members already exist
- **THEN** every existing membership's baseline is unchanged

#### Scenario: The default is read at open, not at mint

- **WHEN** an owner mints an invite, then changes the profile default, and the invitee opens the invite afterwards
- **THEN** the value offered to the invitee is the changed one

#### Scenario: A member with no baseline row resolves to full protection

- **WHEN** a membership created before this capability, holding no baseline row, is resolved
- **THEN** its resolved tier is `surprise`
- **AND** the profile-level default row is not consulted

#### Scenario: A member may change their own baseline

- **WHEN** an account holding any membership changes its own baseline
- **THEN** the write succeeds regardless of that membership's role

### Requirement: The per-list adjustment SHALL be transient and SHALL NOT be stored

The system SHALL offer a per-list control that adjusts the resolved tier for the current page only. That control's state SHALL live in the page's URL and SHALL NOT be persisted: leaving the list SHALL return the viewer to their baseline, and no record of the adjustment SHALL survive the visit.

The adjustment SHALL carry a single tier. A tier absent from the URL SHALL resolve from the baseline; a tier present SHALL override it for that page view alone.

#### Scenario: The adjustment survives a reload and not a departure

- **WHEN** a viewer raises the tier on a list and reloads the page
- **THEN** the raised tier still applies
- **AND WHEN** the viewer navigates away and returns to the same list
- **THEN** the resolved tier is their baseline again

#### Scenario: An absent value falls through to the baseline

- **WHEN** the URL carries no spoiler tier for the current list
- **THEN** the resolved tier is the viewer's baseline

### Requirement: The default spoiler state SHALL be the fully protected one

A profile's default, absent any choice, SHALL be tier `surprise`. Every membership existing before this capability SHALL resolve to `surprise`, so a viewer's passive experience of claim information is unchanged by its introduction.

#### Scenario: An untouched profile defaults to full protection

- **WHEN** a profile is created and no claim-visibility default is chosen
- **THEN** its default tier is `surprise`

#### Scenario: Pre-existing memberships resolve to full protection

- **WHEN** a membership created before this capability is resolved
- **THEN** its resolved tier is `surprise`

### Requirement: Passive surfaces SHALL respect the resolved state and operated surfaces SHALL NOT be gated

Spoiler protection SHALL guard a viewer against being spoiled by **accident**, and SHALL NOT attempt to prevent a viewer from revealing claim information to themselves. This is the decision recorded in `2026-08-31-passive-surfaces-protect-operated-surfaces-expose`.

A surface that renders claim information without the viewer asking for it SHALL respect the resolved tier. This includes information carried by a control's own label: an action label that states an item is claimed is passive, and is governed even though it sits on an interactive element.

A surface the viewer deliberately operates SHALL NOT be gated by the resolved tier. Opening the purchase modal and adjusting the per-list control are deliberate acts, and no additional protection is owed on them beyond what the surface's own capability specifies.

#### Scenario: An action label that states claim state is governed

- **WHEN** a viewer at tier `surprise` views an item that is fully claimed by others
- **THEN** the item's action set does not vary from that of an unclaimed item, because a label naming the claim state would disclose it passively

#### Scenario: Progress does not expose a per-item label

- **WHEN** a viewer at tier `progress` views a fully-claimed item
- **THEN** the item's action set still does not vary from an unclaimed item's, since `progress` discloses only the aggregate count

#### Scenario: A deliberate reveal is permitted

- **WHEN** a viewer at tier `surprise` opens an item's purchase modal and confirms the reveal
- **THEN** claim information for that item is disclosed
- **AND** the disclosure is not treated as a defect

### Requirement: The projection SHALL disclose per tier, and SHALL never withhold the viewer's own claims

The claim information disclosed for an item SHALL be determined by the resolved tier:

- **`surprise`** and **`progress`** — no claim held by another party SHALL be disclosed on the item, and the item SHALL be indistinguishable from an unclaimed one. (`progress` discloses the list's aggregate count, defined above, but nothing on any individual item.)
- **`claims`** — that an item carries claims, and what claim capacity remains, SHALL be disclosed; no identity SHALL be.
- **`identity`** — the claiming parties SHALL additionally be identified, including the party who recorded a claim on another's behalf where that differs from the purchaser.

At every tier, a claim the viewer holds — as its purchaser or as the party who recorded it — SHALL be disclosed in full together with its removal affordance. A claim the viewer made is not a surprise to them, so the tiers govern other parties' claims alone.

#### Scenario: The viewer's own claim survives full protection

- **WHEN** a viewer at tier `surprise` views an item they have claimed themselves
- **THEN** their own claim is disclosed with its removal affordance
- **AND** no other party's claim on that item is disclosed

#### Scenario: Claims discloses capacity without identity

- **WHEN** a viewer at tier `claims` views an item claimed by another party
- **THEN** the item is disclosed as claimed and its remaining capacity is disclosed
- **AND** no name is disclosed for that claim

#### Scenario: Identity discloses the recorder as well as the purchaser

- **WHEN** a viewer at tier `identity` views a claim whose recording party differs from its purchaser
- **THEN** both parties are identified
