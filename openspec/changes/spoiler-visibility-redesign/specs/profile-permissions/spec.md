## MODIFIED Requirements

### Requirement: A profile SHALL admit a member only by single-use invite link

Admission to a profile SHALL be by invite link and by no other route. There SHALL be no direct add: no surface, and no action, SHALL create a membership row for an account that has not itself redeemed a link. The app has no notification and no acceptance step, so a direct add would make an account responsible for another person's profile without telling them and without asking; redeeming the link is that acceptance.

An owner SHALL mint a link that names the profile it admits to and the role it grants, chosen at mint time from `owner` and `manager` and defaulting to `manager`. Minting SHALL take the `owner` floor against the actor's membership on the named profile. The link SHALL carry no recipient: an owner sends it by whatever channel they choose, to anyone, whether or not any follow or block relationship exists between them.

A link SHALL be redeemable exactly once, and SHALL expire seven days after it is minted. The single-use marker and the expiry are both properties of the stored invite, evaluated at the moment of redemption rather than when the page was rendered.

Redemption SHALL require a signed-in account and SHALL be an explicit act by that account — it SHALL NOT occur as a side effect of loading the link's page, because link previews, mail scanners and browser prefetching all issue that load and would spend the link before the recipient read it. The link's surface SHALL name the profile it admits to — wearing that profile's own avatar and accent, not naming it in prose alone — and SHALL state the role it grants, before it is redeemed.

**The link's surface SHALL additionally offer the recipient their spoiler baseline tier** (`spoiler-visibility`) before they accept, pre-filled from the profile's own default **as it stands when the link is opened** — not as it stood when the link was minted, so an owner who changes their default afterwards changes what the next recipient is offered. The recipient MAY adjust the tier before accepting, and accepting without touching it SHALL take the offered value. This is the one moment at which a joining account is asked, and asking here is why no setting has to be hunted for afterwards.

Redemption SHALL write the resulting tier as a concrete `(profile, account)` preference row (`profiles-data-model`), seeded from the offered value. The profile default SHALL NOT be inherited live: after redemption the member's stored tier is its own, and a later change to the profile default SHALL NOT move it.

An account that already holds a membership on the profile SHALL be taken to that profile rather than offered anything to accept, because it has nothing to accept. That resolution is a read: it SHALL NOT consume the link.

Consuming the invite and writing the membership row SHALL be one statement, so neither can land without the other. A spent invite with no membership behind it is repairable by nobody: the recipient cannot redeem twice, and the owner is never told it happened. The member's tier preference row is a separate write against a different table (`profiles-data-model`) and need not share that statement: a membership with no tier row resolves to the fully protected default (`spoiler-visibility`), so a missing tier degrades safely to full protection rather than leaving the membership unresolvable.

An unknown token, an expired token and an already-redeemed token SHALL be refused identically, and the refusal SHALL NOT disclose which of the three it was — distinguishing them would confirm to a stranger holding a guessed token that a token existed.

Redemption by an account that already holds a membership on the profile SHALL consume the link and leave that membership's role and baseline unchanged, surfacing no error. A link admits; it SHALL NOT promote, demote, or re-seed a sitting member.

Redemption SHALL be refused where a block edge stands in either direction between the redeeming account and the account that minted the link.

#### Scenario: An owner mints a link and a stranger redeems it

- **WHEN** an owner mints an invite link with the default role and an account holding no follow relationship with them redeems it
- **THEN** that account holds a `manager` membership on the profile

#### Scenario: A link can grant the owner role

- **WHEN** an owner mints an invite link choosing the `owner` role, and it is redeemed
- **THEN** the redeeming account holds an `owner` membership on the profile

#### Scenario: The invite surface offers the spoiler baseline

- **WHEN** a signed-in recipient opens an invite link
- **THEN** the surface renders the profile's claim-visibility default as the pre-filled baseline tier, adjustable before accepting

#### Scenario: The offered baseline follows the default at open time

- **WHEN** an owner mints a link, then changes the profile's claim-visibility default, and the recipient opens the link afterwards
- **THEN** the values offered are the changed ones

#### Scenario: Accepting untouched takes the offered values

- **WHEN** a recipient accepts without adjusting any axis
- **THEN** the new membership's baseline holds the values that were offered

#### Scenario: An adjusted baseline is what is written

- **WHEN** a recipient raises the tier before accepting
- **THEN** the new member's stored tier is the raised one, not the profile default

#### Scenario: A later default change does not move a member

- **WHEN** an owner changes the profile's claim-visibility default after a member has joined
- **THEN** that member's baseline is unchanged

#### Scenario: A link cannot be redeemed twice

- **WHEN** a link that has already been redeemed is redeemed again
- **THEN** the action refuses and no membership row is written

#### Scenario: A link expires on time as well as on use

- **WHEN** an unredeemed link minted more than seven days earlier is redeemed
- **THEN** the action refuses and no membership row is written

#### Scenario: Every failed redemption refuses alike

- **WHEN** a redemption is attempted with a token that is unknown, one that has expired, and one already spent
- **THEN** all three are refused with the same response, and none reveals which condition applied

#### Scenario: The link's surface wears the profile's own face

- **WHEN** a recipient opens an invite link
- **THEN** the surface renders the profile's avatar and accent alongside its name and the role the link grants

#### Scenario: A sitting member following the link is simply taken to the profile

- **WHEN** an account already holding a membership opens an invite link to that profile
- **THEN** it is taken to the profile's space, nothing is stated about the invite, and the link remains redeemable

#### Scenario: Loading the link does not redeem it

- **WHEN** a signed-in recipient opens an invite link and does not act on the page
- **THEN** no membership row is written and the link remains redeemable

#### Scenario: A half-applied redemption is impossible

- **WHEN** a redemption fails after the invite would have been marked spent
- **THEN** the invite remains redeemable, because the invite is consumed and the membership written in the same statement

#### Scenario: A dead token is refused even when the caller already sits

- **WHEN** an account already holding a membership follows an unknown, expired or already-spent link
- **THEN** the redemption refuses with the shared refusal rather than reporting success
- **AND** their standing role is unchanged

#### Scenario: Redeeming as an existing member changes nothing

- **WHEN** an account already holding `owner` on the profile redeems a link granting `manager`
- **THEN** the link is consumed, their role remains `owner`, their baseline is unchanged, and no error is surfaced

#### Scenario: A block refuses redemption

- **WHEN** an account with a block edge in either direction against the minting owner redeems that owner's link
- **THEN** the action refuses and no membership row is written

#### Scenario: A manager cannot mint a link

- **WHEN** a viewer holding `manager` invokes minting on the profile, by any means
- **THEN** the action refuses and no invite is created

#### Scenario: There is no direct add

- **WHEN** the profile's membership-writing actions are inspected
- **THEN** none creates a membership row for an account other than the one making the request
