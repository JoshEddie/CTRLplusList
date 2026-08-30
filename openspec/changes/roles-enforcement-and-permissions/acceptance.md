# Acceptance — roles-enforcement-and-permissions

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

### Flow: An owner mints an invite link without switching profiles

- **Given** the viewer holds `owner` on a managed profile and is acting as their own self-profile
- **When** the viewer opens `/profiles`
- **And** opens the management menu on the managed profile's card
- **And** activates its `Edit <name>` row
- **And** clicks `Invite someone`
- **And** confirms the mint without changing the offered role
- **Then** the Permissions section lists a row for the new link stating it grants `Manager`
- **And** that row offers the link to copy
- **And** no membership row has been added, because nobody has been admitted yet
- **And** the active-profile mark on `/profiles` still rests on the viewer's own self-profile

### Flow: Opening an invite link does not spend it

- **Given** an owner has minted an invite link granting `Manager` on a managed profile
- **And** the recipient is signed in and holds no membership on that profile
- **When** the recipient opens the invite link
- **Then** the invite renders wearing the profile's own avatar and accent, named, with the role it grants
- **And** no membership row has been written
- **And** the link is still redeemable

### Flow: A stranger redeems an invite link and joins the profile

- **Given** an owner has minted an invite link granting `Manager` on a managed profile
- **And** the recipient is signed in and holds no membership on that profile
- **And** no follow edge exists in either direction between the recipient and that owner
- **And** the recipient has the invite page open
- **When** the recipient clicks `Accept invite`
- **Then** the recipient holds a `Manager` membership on that profile
- **And** the profile appears among the profiles they run in their profile switcher

### Flow: An owner mints a link that grants ownership

- **Given** the viewer holds `owner` on a managed profile
- **When** the viewer opens that profile's space at `/profiles/[id]`
- **And** clicks `Invite someone`
- **And** chooses the `owner` role
- **And** confirms the mint
- **Then** the Permissions section lists a row for the new link stating it grants `Owner`
- **And** that row offers the link to copy

### Flow: Redeeming an ownership link makes the recipient an owner

- **Given** an owner has minted an invite link granting `Owner` on a managed profile
- **And** the recipient is signed in, holds no membership on that profile, and has the invite page open
- **When** the recipient clicks `Accept invite`
- **Then** the Permissions section lists that account with the role `Owner`

### Flow: An owner revokes a link before anyone uses it

- **Given** the viewer holds `owner` on a managed profile carrying an outstanding invite
- **When** the viewer opens that profile's space at `/profiles/[id]`
- **And** activates `Revoke this invite link` on the invite's row
- **And** confirms the revocation
- **Then** the invite's row is gone from the Permissions section
- **And** a signed-in account opening that link is refused with no membership written

### Flow: An owner narrows what a sent link grants

- **Given** the viewer holds `owner` on a managed profile carrying an outstanding invite granting `Owner`
- **When** the viewer opens that profile's space at `/profiles/[id]`
- **And** activates `Change role` on the invite's row and chooses `Manager`
- **Then** the invite's row states it grants `Manager`
- **And** a recipient redeeming that same link holds a `Manager` membership

### Flow: A member following a link is simply taken to the profile

- **Given** an account already holds a membership on a managed profile
- **And** an invite link to that profile is outstanding
- **When** that account opens the link
- **Then** the profile's space renders, with nothing stated about the invite
- **And** the link is still redeemable

### Flow: A manager is shown the roster without the tokens

- **Given** the viewer holds `manager` on a managed profile carrying an outstanding invite
- **When** the viewer opens that profile's space at `/profiles/[id]`
- **Then** the Permissions section lists every membership
- **And** no invite row renders, in any state

### Flow: A spent link cannot be used a second time

- **Given** an invite link has already been redeemed by one account
- **And** a second signed-in account holds no membership on that profile
- **When** the second account opens the same link and attempts to redeem it
- **Then** the redemption is refused
- **And** the refusal does not state that the link was already redeemed
- **And** the second account holds no membership on the profile

### Flow: An expired link is refused

- **Given** an invite link was minted more than seven days ago and has never been redeemed
- **When** a signed-in account opens it and attempts to redeem it
- **Then** the redemption is refused with the same response an unknown link gives
- **And** no membership row is written

### Flow: A signed-out recipient signs in and lands back on the invite

- **Given** an owner has minted an invite link granting `Manager`
- **And** the recipient is signed out
- **When** the recipient opens the invite link and completes Google sign-in
- **Then** the invite page renders, naming the profile and the role
- **And** the link is still redeemable

### Flow: A brand-new account meets onboarding before the invite

- **Given** an owner has minted an invite link granting `Manager`
- **And** the recipient has no account
- **When** the recipient opens the invite link and signs in for the first time
- **Then** the onboarding gate renders in place of the invite page
- **And** no membership row is written

### Flow: Completing onboarding reveals the invite that was sent

- **Given** a recipient signed in for the first time at an invite link and the onboarding gate is rendering
- **When** the recipient completes onboarding
- **Then** the invite page renders at the same URL, naming the profile and the role it grants

### Flow: Redeeming as an existing member leaves their role alone

- **Given** an account already holds an `owner` membership on a managed profile
- **And** an invite link granting `Manager` on that profile exists
- **When** that account redeems the link
- **Then** their membership row still reads `Owner`
- **And** no error is surfaced

### Flow: A blocked recipient cannot redeem

- **Given** an owner has minted an invite link on a managed profile
- **And** a block edge stands between that owner and the recipient
- **When** the recipient opens the link and attempts to redeem it
- **Then** the redemption is refused and no membership row is written

### Flow: A newly admitted member finds the profile on their own Profiles page

- **Given** an account has just redeemed an invite link granting `manager` on a managed profile
- **And** that account has not reloaded any page since
- **When** that account opens `/profiles`
- **Then** a card for the managed profile renders among the profiles they run
- **And** its role label reads `Manager`

### Flow: A promoted member sees their new role

- **Given** the viewer holds `owner` on a managed profile carrying another member with the role `manager`
- **When** the viewer clicks `Change role`
- **And** chooses the `owner` role for that member
- **Then** the Permissions section lists that member with the role `Owner`
- **And** the promoted account's own card on `/profiles` reads `Owner`

### Flow: An owner demotes another owner and no guard is consulted

- **Given** the viewer holds `owner` on a managed profile carrying a second `owner`
- **When** the viewer changes the second owner's role to `manager`
- **Then** the Permissions section lists that member with the role `Manager`
- **And** the viewer still holds `owner`, so the profile is not left ownerless

### Flow: No member may re-role themselves

- **Given** the viewer holds `owner` on a managed profile carrying a second `owner`
- **When** the viewer invokes a role change targeting their own membership row
- **Then** the action refuses
- **And** a reload of the Permissions section shows the viewer's role unchanged

### Flow: Removal asks before it deletes

- **Given** the viewer holds `owner` on a managed profile carrying a manager
- **When** the viewer clicks `Remove` on the manager's row
- **And** dismisses the confirmation dialog without confirming
- **Then** the manager's membership row is intact and still listed in the Permissions section

### Flow: An owner removes a manager

- **Given** the viewer holds `owner` on a managed profile carrying a manager
- **When** the viewer activates removal on the manager's row
- **And** confirms in the dialog
- **Then** the Permissions section no longer lists that account
- **And** that account's `/profiles` page no longer carries a card for the profile
- **And** that account's profile switcher no longer offers the profile

### Flow: A manager leaves a profile they run

- **Given** the viewer holds `manager` on a managed profile
- **When** the viewer activates removal on their own row
- **And** confirms in the dialog
- **Then** the profile is absent from the viewer's `/profiles` page

### Flow: The last owner cannot leave the profile ownerless

- **Given** the viewer is the only `owner` of a managed profile that also carries a manager
- **When** the viewer activates removal on their own row
- **And** confirms in the dialog
- **Then** the action refuses
- **And** a reload of the Permissions section still lists the viewer as `Owner`

### Flow: An owner may leave while another owner remains

- **Given** the viewer is one of two `owner` members of a managed profile
- **When** the viewer activates removal on their own row
- **And** confirms in the dialog
- **Then** the profile is absent from the viewer's `/profiles` page
- **And** the remaining owner's Permissions section still lists them as `Owner`

### Flow: Removing the profile's only manager is not blocked

- **Given** the viewer holds `owner` on a managed profile whose only other member is a manager
- **When** the viewer removes that manager and confirms
- **Then** the Permissions section lists the viewer alone
- **And** no refusal is surfaced, because the floor counts owners rather than members

### Flow: A removed member acting as the profile falls back to their own

- **Given** an account's stored active-profile selection names a managed profile
- **And** an owner has removed that account's membership since it was stored
- **When** that account requests `/lists`
- **Then** the page renders their own self-profile's lists
- **And** no error is surfaced

### Flow: A manager does everything their role admits

- **Given** the viewer holds `manager` on a managed profile
- **And** the viewer is acting as that profile
- **When** the viewer creates a list
- **And** submits the item-creation form for a new item
- **And** edits that item
- **And** edits that item's store links
- **And** adds the item to the list
- **And** reorders the list's items
- **And** archives the item
- **Then** the list renders on `/lists` owned by the managed profile
- **And** each edit renders on the item
- **And** the archived item leaves the active library view and appears in the archived view
- **And** the item remains attached to every list it was on

### Flow: A manager sees a restricted profile space rather than a featureless one

- **Given** the viewer holds `manager` on a managed profile
- **When** the viewer opens that profile's space at `/profiles/[id]`
- **Then** every field of the Settings form renders disabled
- **And** the Settings form's submit control is present and disabled
- **And** the identity header's avatar edit affordance is present and disabled
- **And** the Permissions section renders after the Settings form and lists every member
- **And** the invite-minting, role-change and other-member removal controls render disabled rather than omitted
- **And** the removal control on the viewer's own row is operable

### Flow: A manager sees a list's visibility pill disabled

- **Given** the viewer holds `manager` on a managed profile that owns a list
- **And** the viewer is acting as that profile
- **When** the viewer opens that list
- **Then** the visibility pill renders in a disabled state rather than being omitted

### Flow: A manager's visibility change is refused past the disabled control

- **Given** the viewer holds `manager` on a managed profile that owns a list whose visibility is `private`
- **And** the viewer is acting as that profile
- **When** the viewer POSTs `setListVisibility` for that list with `public`
- **Then** the action returns an unauthorized response
- **And** a reload of the list shows the visibility pill still reading `Hidden`

### Flow: A manager's deletion is refused past the disabled control

- **Given** the viewer holds `manager` on a managed profile that owns a list holding an item
- **And** the viewer is acting as that profile
- **When** the viewer POSTs `deleteList` for that list
- **And** POSTs `deleteItem` for that item
- **Then** each action returns `error: 'Forbidden'`
- **And** a reload of `/lists` still shows the list
- **And** a reload of the items library still shows the item

### Flow: An owner master-unclaims a guest's purchase

- **Given** the viewer holds `owner` on a managed profile that owns an item
- **And** a signed-out guest has claimed that item, leaving a purchase row with all-NULL identities
- **And** the viewer is acting as that profile
- **When** the viewer invokes `removePurchase` for that purchase row
- **Then** the purchase row is deleted
- **And** the item renders as unclaimed

### Flow: A manager cannot master-unclaim someone else's purchase

- **Given** the viewer holds `manager` on a managed profile that owns an item
- **And** another account has claimed that item
- **And** the viewer is acting as that profile
- **When** the viewer invokes `removePurchase` for that purchase row
- **Then** the action rejects
- **And** the purchase row is unchanged

### Flow: A manager still removes a claim that is their own

- **Given** the viewer holds `manager` on a managed profile that owns an item
- **And** the viewer's own self-profile is the asserter of a purchase row on that item
- **And** the viewer is acting as the managed profile
- **When** the viewer invokes `removePurchase` for that purchase row
- **Then** the purchase row is deleted

### Flow: The owner-unclaim leg compares the acting profile, not the self-profile

- **Given** the viewer holds `owner` on a managed profile that owns an item carrying a third party's claim
- **And** the viewer is acting as that managed profile
- **When** the viewer invokes `removePurchase` for that purchase row
- **Then** the purchase row is deleted, resolved against the managed profile rather than the viewer's self-profile

### Flow: The roster reports acting, not looking

- **Given** the viewer holds `owner` on a managed profile carrying one member who has acted as it and one who never has
- **When** the viewer opens that profile's space at `/profiles/[id]`
- **Then** the member who has acted renders a relative, coarse age rather than a timestamp
- **And** the member who never has renders as never
- **And** the never-acted member sorts after the one carrying a value

### Flow: Reading a profile's pages does not stamp last-active

- **Given** an account holds a `manager` membership whose last-acted-as value is a known timestamp
- **When** that account opens the profile's space and one of its lists without performing any write or switch
- **Then** the membership's last-acted-as value is unchanged

### Flow: A self-profile's space carries no Permissions section

- **Given** the viewer is acting as their own self-profile
- **When** the viewer opens their self-profile's space at `/profiles/[id]`
- **Then** the Settings form renders with editable fields
- **And** no Permissions section renders

### Flow: An owner acting as a different profile cannot reach that profile's content

- **Given** the viewer holds `owner` on profiles A and B
- **And** the viewer is acting as profile A
- **When** the viewer POSTs `deleteList` for a list owned by profile B
- **Then** the action returns `error: 'Forbidden'`
- **And** the list is unchanged, notwithstanding the viewer's ownership of B
