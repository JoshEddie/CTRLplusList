## Purpose

Fixes which of a profile's members may perform which class of profile-scoped write, and gives a profile's owners a surface to administer that membership — admitting members by single-use invite link, removing them and re-roling them, while the profile keeps at least one owner.

## ADDED Requirements

### Requirement: A profile-scoped write SHALL declare one of exactly two role floors

Every profile-scoped write SHALL name the minimum role its actor must hold on the profile the write is addressed to. There SHALL be exactly two floors and no default:

- **`member`** — passed by `self`, `owner` and `manager`.
- **`owner`** — passed by `self` and `owner`, and refused for `manager`.

The governing rule is that **owners run the profile and managers run its content**: an owner alone administers membership, edits the profile's identity, changes a list's reach, and performs anything irreversible; a manager does everything else that changes what the profile's lists and items contain.

The `member` floor SHALL admit list creation, list metadata editing, item creation, item editing, item store links, item archiving, setting a list's items, removing an item from a list, changing which lists an item is on, and item ordering. The `owner` floor SHALL admit list deletion, item deletion, changing a list's visibility, master unclaim of a purchase, editing the profile's name, tagline, accent and art, and administering membership — which includes minting an invite link, changing a member's role, and removing another member.

Which profile a write is addressed to depends on how the request names it, and the two shapes SHALL NOT be conflated:

- A write over the profile's **content** is addressed to the profile the request acts as. It passes the shared gate `server-endpoint-authorization` owns, and its floor SHALL be applied **after** that gate's ownership comparison and never in place of it. Every `member`-floor write, plus list deletion, item deletion and visibility, is of this shape.
- A write over the profile **itself** — its identity and its membership — is addressed to the profile the request names, because the surfaces carrying these writes are reached without switching to the profile they administer. Such a write SHALL NOT pass the shared gate and SHALL NOT compare the acting profile; it SHALL load the acting account's membership on the **named** profile and apply the `owner` floor to that membership, which is how `profiles-surface` already authorizes the profile-update action.

Exactly one profile-scoped write takes neither shape. Redeeming an invite link writes a membership row on a profile the actor holds no membership on, by definition — no floor can be applied to a role they do not yet have, and the token is the authorization. It is bounded instead by the terms minted into the token, and no other write SHALL authorize on possession of a value carried in the request.

In the two membership-derived shapes a role narrows what a write may do and never widens what it may reach: a floor admits an actor only on a profile they already hold a membership on. A refusal SHALL write no row.

Item archiving takes the `member` floor because it destroys nothing and the item remains on every list it is attached to. Item deletion takes the `owner` floor with no carve-out for the member who created the item: the actor-audit column records the last mutator rather than the creator, so authorship is not recoverable at the moment of the delete.

#### Scenario: A manager creates and edits content

- **WHEN** a viewer holding `manager` on the profile they act as creates a list, creates an item, edits it, edits its store links, changes which lists it is on, and reorders a list's items
- **THEN** every one of those writes succeeds

#### Scenario: A manager archives an item

- **WHEN** a viewer holding `manager` archives an item owned by the profile they act as
- **THEN** the write succeeds and the item remains attached to every list it was on

#### Scenario: A manager is refused every owner-floor write

- **WHEN** a viewer holding `manager` attempts to delete a list, delete an item, change a list's visibility, master-unclaim a purchase, edit the profile's identity, mint an invite link, or otherwise administer its membership
- **THEN** each attempt is refused and no row is written

#### Scenario: An owner passes every floor

- **WHEN** a viewer holding `owner` on the profile they act as performs any profile-scoped write
- **THEN** the role floor admits it

#### Scenario: A self member passes every floor

- **WHEN** a viewer acting as their own self-profile performs any profile-scoped write
- **THEN** the role floor admits it

#### Scenario: The floor does not widen reach on a content write

- **WHEN** a viewer holding `owner` on profile B, acting as profile A, attempts an owner-floor content write against a row owned by B
- **THEN** the write is refused, because the ownership comparison fails before the role floor is consulted

#### Scenario: Administering a profile does not require acting as it

- **WHEN** a viewer holding `owner` on profile B, while acting as profile A, administers B's membership or edits B's identity
- **THEN** the write succeeds, because the floor is applied to their membership on B rather than to the profile they are acting as

#### Scenario: A manager is refused a write addressed to the profile itself

- **WHEN** a viewer holding `manager` on profile B, whatever profile they are acting as, invokes a membership or identity write against B
- **THEN** the action refuses and no row is written

### Requirement: The profile's space SHALL render a Permissions section for a managed profile

A managed profile's space SHALL render a Permissions section listing every account holding a membership on it. Each row SHALL carry that member's profile name, avatar, role, and when they last acted as the profile.

The section SHALL additionally list the profile's outstanding invites — links minted and neither redeemed nor expired — as rows of their own, after the memberships. Each SHALL state the role it grants and how long it has left, and SHALL carry the link to copy, the role to change, and the revocation. A redemption replaces the invite's row with the redeeming account's membership row.

Invite rows SHALL render for a viewer holding `owner` and for no one else. The row carries the token, and a token authorizes on possession, so rendering one to a `manager` would let them admit a member with a link their role forbids them to mint. This is the one forbidden thing the section omits rather than disables: the disabled-not-absent rule governs controls, and a readable secret is not a control.

The section SHALL NOT render for a self-profile. A self-profile's membership is not administrable, and a managed profile carries no `self` membership row, so every row the section renders is an `owner` or a `manager`.

A viewer holding `manager` SHALL see the section in full, with every control their role forbids rendered **disabled** rather than absent, so the surface states that the capability exists and that this viewer does not hold it. The forbidden set is the owner-floor one: minting an invite link, changing any role, and removing a member **other than themselves**. Enforcement SHALL NOT depend on the disabled control: a manager who invokes any of those actions by other means SHALL be refused by the action.

Self-removal is not among them. Every member holds it whatever their role, so a manager's own removal control SHALL render operable rather than disabled — disabling it would state that they lack a right they hold.

#### Scenario: A minted link takes a seat in the roster

- **WHEN** an owner mints an invite link
- **THEN** the Permissions section lists it as a row stating the role it grants
- **AND** the row offers the link to copy, the role to change, and the revocation

#### Scenario: A redeemed link's row becomes the member's

- **WHEN** an account redeems an outstanding invite and the owner next opens the section
- **THEN** the invite's row is absent and the redeeming account's membership row is listed

#### Scenario: A manager sees no invite rows at all

- **WHEN** a viewer holding `manager` opens a managed profile's space
- **THEN** the section lists every membership and no outstanding invite
- **AND** no token is rendered for them in any state

#### Scenario: An owner sees the roster and its controls

- **WHEN** a viewer holding `owner` opens a managed profile's space
- **THEN** the Permissions section lists every member with name, avatar, role and last-active, and its administrative controls are operable

#### Scenario: A manager sees the roster with disabled controls

- **WHEN** a viewer holding `manager` opens a managed profile's space
- **THEN** the Permissions section lists every member
- **AND** every control their role forbids renders in a disabled state
- **AND** no such control is omitted in place of being disabled

#### Scenario: A manager's own removal control stays operable

- **WHEN** a viewer holding `manager` opens a managed profile's space
- **THEN** the removal control on their own row is operable rather than disabled

#### Scenario: A self-profile has no Permissions section

- **WHEN** a viewer opens their own self-profile's space
- **THEN** no Permissions section renders

#### Scenario: A manager's administrative submission is refused

- **WHEN** a viewer holding `manager` invokes a mint, a role-change, or a removal targeting a member other than themselves, by any means
- **THEN** the action refuses and no membership row is written

### Requirement: A profile SHALL admit a member only by single-use invite link

Admission to a profile SHALL be by invite link and by no other route. There SHALL be no direct add: no surface, and no action, SHALL create a membership row for an account that has not itself redeemed a link. The app has no notification and no acceptance step, so a direct add would make an account responsible for another person's profile without telling them and without asking; redeeming the link is that acceptance.

An owner SHALL mint a link that names the profile it admits to and the role it grants, chosen at mint time from `owner` and `manager` and defaulting to `manager`. Minting SHALL take the `owner` floor against the actor's membership on the named profile. The link SHALL carry no recipient: an owner sends it by whatever channel they choose, to anyone, whether or not any follow or block relationship exists between them.

A link SHALL be redeemable exactly once, and SHALL expire seven days after it is minted. The single-use marker and the expiry are both properties of the stored invite, evaluated at the moment of redemption rather than when the page was rendered.

Redemption SHALL require a signed-in account and SHALL be an explicit act by that account — it SHALL NOT occur as a side effect of loading the link's page, because link previews, mail scanners and browser prefetching all issue that load and would spend the link before the recipient read it. The link's surface SHALL name the profile it admits to — wearing that profile's own avatar and accent, not naming it in prose alone — and SHALL state the role it grants, before it is redeemed.

An account that already holds a membership on the profile SHALL be taken to that profile rather than offered anything to accept, because it has nothing to accept. That resolution is a read: it SHALL NOT consume the link.

Consuming the invite and writing the membership row SHALL be one statement, so neither can land without the other. A spent invite with no membership behind it is repairable by nobody: the recipient cannot redeem twice, and the owner is never told it happened.

An unknown token, an expired token and an already-redeemed token SHALL be refused identically, and the refusal SHALL NOT disclose which of the three it was — distinguishing them would confirm to a stranger holding a guessed token that a token existed.

Redemption by an account that already holds a membership on the profile SHALL consume the link and leave that membership's role unchanged, surfacing no error. A link admits; it SHALL NOT promote or demote a sitting member.

Redemption SHALL be refused where a block edge stands in either direction between the redeeming account and the account that minted the link.

#### Scenario: An owner mints a link and a stranger redeems it

- **WHEN** an owner mints an invite link with the default role and an account holding no follow relationship with them redeems it
- **THEN** that account holds a `manager` membership on the profile

#### Scenario: A link can grant the owner role

- **WHEN** an owner mints an invite link choosing the `owner` role, and it is redeemed
- **THEN** the redeeming account holds an `owner` membership on the profile

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

#### Scenario: Redeeming as an existing member changes nothing

- **WHEN** an account already holding `owner` on the profile redeems a link granting `manager`
- **THEN** the link is consumed, their role remains `owner`, and no error is surfaced

#### Scenario: A block refuses redemption

- **WHEN** an account with a block edge in either direction against the minting owner redeems that owner's link
- **THEN** the action refuses and no membership row is written

#### Scenario: A manager cannot mint a link

- **WHEN** a viewer holding `manager` invokes minting on the profile, by any means
- **THEN** the action refuses and no invite is created

#### Scenario: There is no direct add

- **WHEN** the profile's membership-writing actions are inspected
- **THEN** none creates a membership row for an account other than the one making the request

### Requirement: A member's role SHALL be changed only by another owner

An owner SHALL be able to promote a `manager` to `owner`, and to demote an `owner` to `manager`. A member SHALL NOT change their own role in either direction: self-demotion is not offered, because an owner who no longer wants the profile removes themselves rather than staying on with fewer rights.

Because the acting owner is necessarily an owner who survives their own demotion of somebody else, a role change can never leave the profile without an owner, and SHALL NOT carry the owner-floor guard that removal carries. Adding that guard would re-test a condition the actor's own membership already established.

#### Scenario: An owner promotes a manager

- **WHEN** an owner changes another member's role from `manager` to `owner`
- **THEN** that member holds `owner`

#### Scenario: An owner demotes another owner

- **WHEN** an owner changes another member's role from `owner` to `manager`
- **THEN** that member holds `manager`, and at least one owner remains without any guard being consulted

#### Scenario: No member may re-role themselves

- **WHEN** a member invokes a role change targeting their own membership
- **THEN** the action refuses and the row is unchanged

#### Scenario: A manager cannot change any role

- **WHEN** a viewer holding `manager` invokes a role change on any member
- **THEN** the action refuses and no row is written

### Requirement: A member SHALL be removable by themselves or by an owner

Any member SHALL be able to remove their own membership, whatever their role. An owner SHALL additionally be able to remove any other member. A manager SHALL NOT remove anyone but themselves.

Removal SHALL be confirmed before the row is deleted, through the `confirm-dialog-system` primitive, whether the target is another member or the actor themselves. Removal is destructive and has no undo — re-admission needs a fresh invite link minted by an owner and redeemed again — so a member who leaves by mistake cannot restore their own access.

A removed member's stored active-profile selection needs no repair: `active-profile` already requires membership to be re-verified on every resolution and to fall back to the self-profile, so a removed member acting as the profile continues without error.

#### Scenario: A manager removes themselves

- **WHEN** a viewer holding `manager` confirms removal of their own membership
- **THEN** the row is deleted and they no longer run the profile

#### Scenario: Removal is confirmed before it happens

- **WHEN** a member activates removal, on their own row or on another's
- **THEN** a confirmation dialog renders and no row is deleted until it is confirmed
- **AND** dismissing it leaves the membership row intact

#### Scenario: An owner removes a manager

- **WHEN** an owner removes another member's membership
- **THEN** that row is deleted

#### Scenario: A manager cannot remove another member

- **WHEN** a viewer holding `manager` invokes removal against a member other than themselves
- **THEN** the action refuses and the row is unchanged

#### Scenario: A removed member acting as the profile falls back without error

- **WHEN** an account whose stored selection names the profile is removed from it, and then issues a request
- **THEN** the request resolves their self-profile as the active profile and proceeds with no error

### Requirement: A profile SHALL keep at least one owner

A removal that would leave a profile with no `self` or `owner` member SHALL be refused, and the membership row SHALL survive. The invariant SHALL be enforced by folding the survivor check into the delete statement itself, so it evaluates when the row is deleted rather than when the page was rendered; no row affected is the refusal.

The invariant applies to removal alone. A role change cannot reach it, per the role-change requirement above.

Under truly concurrent removals the guard MAY admit both, leaving the profile with no owner. This residual is accepted rather than closed: the driver offers no interactive transaction, no unique index can express a lower bound on a set, and an ownerless profile is a state the application already reaches and tolerates when a sole owner deletes their account.

#### Scenario: The last owner cannot remove themselves

- **WHEN** the only `owner` of a profile removes their own membership
- **THEN** the action refuses and the membership row is unchanged

#### Scenario: An owner may leave while another remains

- **WHEN** one of two owners removes their own membership
- **THEN** the row is deleted and the remaining owner still runs the profile

#### Scenario: Removing the last manager is unaffected

- **WHEN** an owner removes the profile's only manager
- **THEN** the row is deleted, because the floor counts owners rather than members

#### Scenario: Concurrent last-owner removals are an accepted residual

- **WHEN** two owners each remove their own membership truly concurrently
- **THEN** both removals MAY succeed and the profile MAY be left with no owner
- **AND** this is an accepted limitation of the no-transactions constraint, NOT a contract violation

### Requirement: A member row's last-active SHALL report acting, not viewing

The Permissions section SHALL render each member's last-acted-as value relative and coarse — "3 days ago" rather than a timestamp — because the stored value is deliberately coarsened and is not accurate to the minute. A membership never acted as SHALL render as never, and SHALL sort after every membership carrying a value.

Reading a profile's pages SHALL NOT stamp the value. The column reports that a member has *done* something as the profile, not that they have looked at it, because the section is consulted to find a member who has gone dormant — and a stamp on the read path would make a member who only ever looks read as active.

#### Scenario: A member who has acted renders a relative age

- **WHEN** the section renders a member whose membership carries a last-acted-as value
- **THEN** the row shows a relative, coarse age rather than a timestamp

#### Scenario: A member who has never acted renders as never

- **WHEN** the section renders a member whose membership carries no last-acted-as value
- **THEN** the row states that they have never acted as the profile, and sorts after members that have

#### Scenario: Viewing the profile does not stamp

- **WHEN** a member opens the profile's space and its lists without performing any write or switch
- **THEN** their membership's last-acted-as value is unchanged

### Requirement: An outstanding invite SHALL be revocable and re-rolable by an owner

For as long as an invite is neither redeemed nor expired, an owner SHALL be able to change the role it grants and to revoke it outright. Both SHALL take the `owner` floor against the actor's membership on the named profile.

Changing the role SHALL leave the token unchanged, so a link already sent grants what it says at the moment it is redeemed rather than what it said when it was sent. Revoking SHALL make the link refuse exactly as an unknown one does.

Both SHALL be guarded on the invite being unredeemed, evaluated in the writing statement itself, so neither can reach back through a redemption that has already happened: a membership, once granted, is removal's to take away and not an invite's.

Every write that mints, re-roles, revokes or redeems an invite SHALL invalidate the cached read that lists the profile's outstanding invites.

#### Scenario: An owner revokes a link before it is used

- **WHEN** an owner revokes an outstanding invite and its holder then opens the link
- **THEN** the redemption is refused with the same response an unknown token gives, and no membership row is written

#### Scenario: An owner narrows the role a sent link grants

- **WHEN** an owner changes an outstanding invite's role from `owner` to `manager`, and the link is then redeemed
- **THEN** the redeeming account holds `manager`

#### Scenario: A spent link can be neither revoked nor re-roled

- **WHEN** an owner revokes or re-roles an invite that has already been redeemed
- **THEN** the action refuses and the membership it granted is unchanged

#### Scenario: A manager can neither revoke nor re-role

- **WHEN** a viewer holding `manager` invokes a revocation or a role change against an outstanding invite, by any means
- **THEN** the action refuses and the invite is unchanged

### Requirement: A membership write SHALL refresh the affected account's own profile surfaces

Redeeming an invite, removing a member, and changing a role SHALL each invalidate the cached reads of **the account whose membership changed**, not only those of the acting owner. The affected account's own Profiles page and profile switcher read the set of profiles they run, so a membership write that refreshes only the actor leaves the other party's surfaces stating a membership that no longer holds.

#### Scenario: A newly admitted member sees the profile without waiting

- **WHEN** an account redeems an invite link granting `manager`, and next loads their Profiles page
- **THEN** the profile is listed among the profiles they run

#### Scenario: A removed member stops seeing the profile

- **WHEN** an owner removes a member, and that account next loads their Profiles page or opens their profile switcher
- **THEN** the profile is absent from both

#### Scenario: A role change is visible to the member

- **WHEN** an owner promotes a manager, and that account next loads their Profiles page
- **THEN** the card states their new role
