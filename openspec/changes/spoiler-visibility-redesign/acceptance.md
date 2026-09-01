# Acceptance — spoiler-visibility-redesign

## Flows

### Flow: A protected member opens a list their own profile owns

- **Given** a signed-in account holding a membership on the profile owning the list, whose baseline tier is `surprise`
- **And** the list carries twelve items, four of them claimed by other parties, none of them claimed by this account
- **When** the account opens the list while acting as the owning profile
- **Then** no item discloses that it carries a claim, and the four claimed items are indistinguishable from the eight unclaimed ones
- **And** every item's action area renders `Add Claim` with `View item ↗` below it, identically on claimed and unclaimed items
- **And** no item renders `Fully claimed` or `Manage claims`, and no item renders `Buy & Claim ↗`
- **And** no claim pill renders on any row in row view
- **And** the hero's footer line reads the item count and the relative updated time alone, with no progress bar and no placeholder for one
- **And** the hero's Spoilers tile renders, showing the `surprise` stage, and the items toolbar renders above the drag-to-reorder rows

### Flow: The member raises the tier for this visit

- **Given** that member on that list, at their baseline, with no filter active and the drag-to-reorder rows showing
- **When** they open the hero's Spoilers tile menu
- **And** choose "Show who claimed what" (the `identity` stage)
- **Then** the URL carries `spoiler=identity`
- **And** each of the four claimed items discloses its claim and names the claiming party's first name
- **And** the drag-to-reorder rows still render, since raising the tier does not leave the reorder layout
- **And** no active-filter chip renders and no filter badge changes, the Spoilers tile being a display control rather than a filter

### Flow: The raised tier survives a reload

- **Given** that member on that list with `spoiler=identity` in the URL
- **When** they reload the page
- **Then** the raised tier still applies and the claimer's first name is still disclosed on each claimed item

### Flow: The raised tier does not survive leaving the list

- **Given** that member on that list with `spoiler=identity` in the URL
- **When** they navigate away to another page
- **And** return to the same list
- **Then** the URL carries no `spoiler` param
- **And** no item discloses that it carries a claim
- **And** no record of the adjustment is stored against their baseline

### Flow: A value matching the baseline is omitted rather than serialized

- **Given** a member whose baseline tier is `claims`, on a list whose URL carries `spoiler=identity`
- **When** they set the tier back to "Show what's claimed" (the `claims` stage) in the Spoilers tile menu
- **Then** the `spoiler` param is removed from the URL rather than written as `spoiler=claims`
- **And** the list renders at the `claims` tier

### Flow: A protected member is asked before the modal opens

- **Given** a signed-in member whose resolved tier is `surprise`, on a list their profile owns
- **And** one item on that list is claimed to capacity by another party
- **When** they activate `Add Claim` on that item
- **Then** a confirmation naming what will be revealed is presented
- **And** the purchase modal does not open
- **And** the cards behind the confirmation are unchanged, and no item discloses its claim state

### Flow: Progress also asks before the modal opens

- **Given** a signed-in member whose resolved tier is `progress`, on a list their profile owns
- **When** they activate `Add Claim` on an item claimed by another party
- **Then** a confirmation is presented before the modal opens, since `progress` discloses no per-item claim state

### Flow: Confirming discloses the item's claims-level state and nothing more

- **Given** that confirmation presented on that item
- **When** the member activates **Show me** on the "Show this item's claims?" confirmation
- **Then** the modal opens reporting that the item carries claims and what capacity remains
- **And** no claiming party is named on it
- **And** the item's card behind the modal still discloses nothing, and no other item on the page discloses its claim state
- **And** the member's resolved tier for the rest of the visit is unchanged

### Flow: Declining discloses nothing

- **Given** that confirmation presented on that item
- **When** the member activates `Cancel`
- **Then** the modal does not open
- **And** the page is unchanged and nothing about the item's claim state is disclosed

### Flow: The confirmation is presented per activation

- **Given** a member who confirmed the reveal on one item earlier in the same visit
- **When** they activate `Add Claim` on a second item
- **Then** the confirmation is presented again

### Flow: An unprotected viewer is not asked

- **Given** a viewer whose resolved tier is `claims` or `identity`
- **When** they activate `Add Claim` on an item
- **Then** the purchase modal opens directly
- **And** no confirmation is presented

### Flow: A protected member claims and master-unclaims without changing a setting

- **Given** a member whose resolved tier is `surprise`, on a list their profile owns, holding a claim recorded by nobody on the target item
- **And** a second item on that list carrying a claim the member did not create
- **When** they activate `Add Claim` on the first item, confirm the reveal, and claim it via `I bought this myself`
- **And** activate `Add Claim` on the second item, confirm the reveal, and remove the existing claim through master unclaim
- **Then** on reload the first item carries the member's own claim
- **And** the removed claim is gone from the second item
- **And** neither action required raising the tier

### Flow: The member's own claim is never suppressed by a concealing tier

- **Given** a member whose resolved tier is `surprise`, on an item carrying a claim they hold as its purchaser
- **When** they open the list
- **Then** that item's top slot reads `Manage claim`
- **And** no other party's claim on that item is disclosed

### Flow: Below identity the manage state collapses other parties to a count

- **Given** a member whose resolved tier is `claims`, on an item carrying their own claim and two claims by other parties
- **When** they activate `Manage claim` on that item
- **Then** their own row renders in full with its removal action
- **And** the other two claims are represented as a count
- **And** no name, avatar, date, attribution line or removal action renders for either of them

### Flow: The progress tier discloses the claimed count while items stay concealed

- **Given** a member whose baseline tier is `progress`
- **And** the list carries twelve items, four of them claimed
- **When** they open the list
- **Then** the hero's footer line renders a progress bar and a "4 / 12 claimed" readout alongside the item count and relative time
- **And** no individual item discloses whether it is claimed

### Flow: A member acting as another profile stays protected and is offered the switch

- **Given** an account holding a membership on profile B whose baseline tier is `surprise`
- **And** the account's profile-selection cookie names profile A
- **When** it opens a list owned by B
- **Then** no claim on the list is disclosed
- **And** the hero's controls card renders an inline offer to switch to B, naming B
- **And** no owner controls render, and no blocking interstitial is presented

### Flow: The switch offer does not depend on the resolved tier

- **Given** that same account on that same list with its resolved tier at `identity`
- **When** it opens the list
- **Then** the inline offer to switch to B still renders

### Flow: A non-member sees every claim, including the recorder

- **Given** a signed-in viewer holding no membership on the list's owning profile
- **And** the list carries a claim whose recording party differs from its purchaser
- **When** they open the list
- **Then** every claim is disclosed and each claiming party is named by first name
- **And** both the purchaser and the recorder are named on the proxy-recorded claim
- **And** no Spoilers tile renders, since they have no tier to adjust

### Flow: A signed-out viewer sees every claim

- **Given** a signed-out viewer
- **When** they open a non-hidden list carrying claims
- **Then** every claim is disclosed with its claiming party's first name, no membership being resolvable for them

### Flow: Owner preview renders claim data at the owner's own tier

- **Given** an owner whose resolved tier is `surprise`, on a list their profile owns
- **When** they enter preview mode
- **Then** no claim information renders, exactly as outside preview mode
- **And** the viewer layout and its affordances render as a non-member would see them
- **And** the Spoilers tile is hidden, mirroring the visibility picker's preview suppression

### Flow: The hero kebab carries no spoiler row; the strip kebab carries the spoiler rows

- **Given** an authenticated list owner viewing the full hero
- **When** they open the hero's kebab
- **And** pin the sticky strip and open the strip kebab
- **Then** the hero kebab contains Choose items, Edit list, Preview as viewer and Delete list, and no spoiler row
- **And** the strip kebab contains Share List, the three Visibility radio rows, the four Spoiler radio rows (Surprise / Progress / Claims / Identity, with the current tier checked), Choose items, Edit list, Preview as viewer and Delete list

### Flow: The library carries a three-stage spoiler toggle left of the search field

- **Given** a signed-in viewer
- **When** they open `/items`
- **Then** a spoiler toggle renders to the left of the search field, offering `surprise`, `claims`, and `identity` and no `progress` stage
- **And** no claimed count and no progress bar renders anywhere on the page, and no Claims facet renders in the toolbar or the filters sheet
- **And** the active and archived item reads are performed with the tier resolved from that account's membership on the profile it acts as

### Flow: A removed parameter degrades rather than errors

- **Given** a viewer holding an old link carrying `?spoilers=1` on a list, and one carrying `?purchases=only` on `/items`
- **When** they open each
- **Then** each page renders at that viewer's own baseline
- **And** no claim information is revealed by either parameter
- **And** no error is surfaced, and `purchases=only` narrows no items, the claim-state filter having been removed

### Flow: An owner sets the profile-level default without moving anyone

- **Given** an owner on a managed profile's space with the Settings tab selected, the profile already holding two members with stored baselines
- **When** they change the profile-level default via the Settings panel's collapsed **Default for new members** row
- **Then** neither member's stored baseline changes
- **And** the panel continues to render each member's own stored value rather than the new default

### Flow: An owner sets another member's baseline and it reaches that member's list

- **Given** an owner on a managed profile's Settings panel, with a member whose baseline is the fully protected state
- **When** they change that member's tier via the Settings panel's collapsed **{member name}** row, whose control is labelled **Claim visibility for {member name}**
- **Then** that member's stored tier is updated
- **And** on re-navigation the control reflects the change
- **And** a context acting as that member renders a list the profile owns at the new tier

### Flow: A manager's own baseline is the one control their role permits

- **Given** a viewer holding `manager` on a managed profile
- **When** they open the profile's space with the Settings tab selected
- **Then** their own baseline control renders enabled, with its tier settable as one of the four stages
- **And** the profile-level default renders disabled
- **And** every other member's baseline renders disabled
- **And** the name-and-tagline fields render disabled with the submit control present and disabled

### Flow: A member changes their own baseline whatever their role

- **Given** that `manager` on that Settings panel
- **When** they change their own baseline tier
- **Then** the write succeeds
- **And** a list owned by that profile subsequently renders at the new tier

### Flow: A recipient is offered the default as it stands when the link is opened

- **Given** an owner who minted an invite link and then changed the profile's claim-visibility default
- **And** a signed-in recipient holding no membership on that profile
- **When** the recipient opens the link
- **Then** the surface renders the changed default as the pre-filled baseline tier, not the value held at mint time
- **And** the tier is adjustable before accepting
- **And** no membership row is written, the link remaining redeemable

### Flow: Accepting writes the adjusted baseline concretely

- **Given** that recipient on that invite surface
- **When** they raise the tier via the invite card's **What you want to see about claims** control
- **And** activate `Accept invite`
- **Then** their new membership is created, and a `(profile, account)` spoiler-tier preference row is written carrying the raised tier, not the profile default
- **And** a later change to the profile default leaves that member's stored tier unchanged

### Flow: An existing member following a link is neither re-seeded nor promoted

- **Given** an account already holding `owner` on the profile
- **When** it redeems a link granting `manager`
- **Then** the link is consumed
- **And** its role remains `owner` and its stored tier is unchanged
- **And** no error is surfaced

### Flow: The migration is regenerated onto the preferences table, not the membership table

- **Given** the drizzle migration generated against the abandoned membership-columns shape, which has not run against any database
- **And** a database holding `profile_members` rows and `profile_preferences` rows created before this capability
- **When** the developer discards the generated migration, regenerates against the account-keyed `profile_preferences` schema, and runs it
- **Then** `profile_preferences` gains a nullable account column and existing rows remain valid as profile-wide (null-account) values, with no rewrite and no backfill
- **And** `profile_members` gains no spoiler column
- **And** the preferences catalog holds the `spoiler_tier` row
- **And** a membership carrying no account-keyed `spoiler_tier` row resolves to tier `surprise`

### Flow: The cached item read serves every viewer from one entry

- **Given** two signed-in viewers whose resolved tiers differ, on the same list
- **When** each opens the list
- **Then** the cached read is entered once for that list and its result carries unprojected rows
- **And** each viewer's returned rows are projected separately, outside the cache
- **And** neither viewer's response carries a full name, email address, account id, profile id, or raw guest identity

### Flow: A fully protected list page costs no aggregate query

- **Given** a viewer whose resolved tier is `surprise`
- **When** they open a list
- **Then** the aggregate read is not performed
- **And** the hero's footer line carries the item count and relative time alone, with no progress bar
