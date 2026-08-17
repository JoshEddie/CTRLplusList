# Acceptance — profiles-schema-phase-2

<!-- Given/When/(And…)/Then user-journey flows for this change.
     One atom per row: a single action or a single assertion. Stages in
     strict order of appearance — any stage recurring after a later one
     (When after Then, Given after When) = a new flow; split it.
     Drafted at propose time from the change's scenarios + pre-existing
     canonical-spec links; refined at apply time with literal handles
     (real button text, real routes) — refine, not rewrite.
     Contract: the acceptance artifact instruction in schema.yaml. -->

This change's acceptance bar is **no user-visible change**: every flow below is a
walk of behavior that already ships, re-walked after ownership moved onto profile
ids. A flow that reads differently after the change is a defect signal, not a
maintenance diff.

## Flows

### Flow: Owner opens their own hidden list

*Sources: `list-visibility` — Private list visible to its owning profile; `profiles-data-model` — Owner is recognized through the profile comparison.*

- **Given** a signed-in account whose profile owns a list with visibility `Hidden`
- **When** the owner navigates to `/lists/<that list id>`
- **Then** the list renders in full with its items
- **And** the visibility pill renders `🔒 Hidden`
- **And** no private-list interstitial is shown

### Flow: Non-owner is turned away from a hidden list

*Sources: `list-visibility` — Private list inaccessible to non-owners.*

- **Given** a signed-in account whose profile does not own a list with visibility `Hidden`
- **When** the viewer navigates to `/lists/<that list id>`
- **Then** the private-list interstitial renders
- **And** none of the list's items are shown

### Flow: Owner changes a list's visibility to Shared

*Sources: `list-visibility` — Owner sees three radio menu items, Selecting Shared sets public, Trigger pill label matches selected row.*

- **Given** a signed-in account whose profile owns a list whose visibility pill reads `🔗 Private`
- **When** the owner clicks the visibility pill
- **And** clicks the `Shared` row
- **Then** the pill reads `👥 Shared`
- **And** re-opening the popover shows the `Shared` row with a trailing `✓`
- **And** the `Hidden` and `Private` rows carry no `✓`

### Flow: Non-owner follows a list owner from the list hero

*Sources: `following` — Follow button colocated with linked owner name, Following state shown after follow, Follow another user, Inbound links carry a profile id.*

- **Given** a signed-in viewer whose profile does not own a `Shared` list and does not follow its owning profile
- **When** the viewer navigates to `/lists/<that list id>`
- **And** clicks the button labeled `Follow {owner-name}` in the hero byline sub-row
- **Then** the button label reads `Following`
- **And** the owner's name in the byline links to `/user/<owning profile id>`
- **And** the list-hero action row shows Share and Bookmark only, with no Follow button

### Flow: Viewer opens a followed profile from the home Following rail

*Sources: `home-digest` — Card links to the profile route by profile id, Active followee sorted first; `following` — Profile renders public lists.*

- **Given** a signed-in viewer who follows at least one profile that has a `Shared` list
- **When** the viewer loads `/`
- **And** clicks the followed profile's card in the Following rail
- **Then** the browser lands on `/user/<that profile's id>`
- **And** the page renders that profile's name, image, and a grid of its `Shared` lists

### Flow: Viewer sees only their own lists on the home My Lists rail

*Sources: `home-digest` — Owned lists shown newest-first, Rail resolves lists through the viewer's profile, New list CTA is not on the home rail.*

- **Given** a signed-in viewer whose profile owns more than five lists
- **When** the viewer loads `/`
- **Then** the My Lists rail shows five list cards, most recently updated first
- **And** every card shown is a list the viewer's profile owns
- **And** the rail header shows `See all →` and no `+ New list` affordance

### Flow: Viewer opens their items library

*Sources: `items-library-shell` — No listId selects the viewer's items and the library view, No session email redirects to the landing page.*

- **Given** a signed-in viewer whose profile owns items
- **When** the viewer navigates to `/items`
- **Then** the library view renders the items whose owning profile is the viewer's
- **And** no item owned by another profile appears

### Flow: Non-owner self-claims an item on a shared list

*Sources: `list-item-management` — Authenticated user self-claims using session identity, Authenticated non-follower claims an item on a public list; `claim-attribution` — Self-claim stores both roles as the actor, Purchaser claiming after being attributed sees their existing claim.*

- **Given** a signed-in viewer whose profile does not own a `Shared` list and has not claimed any item on it
- **When** the viewer opens the list
- **And** confirms `Claim this gift` on an item
- **And** attempts `Claim this gift` on the same item a second time
- **Then** the item's claim banner reads `You`
- **And** no `Added by you` attribution line is shown
- **And** the second attempt presents the viewer as the already-recorded purchaser, not an error

### Flow: Claimer attributes a purchase to the owner's mutual follow

*Sources: `claim-attribution` — Owner's mutual is markable by any claimer who can view the item, Attributed claim stores claimer and purchaser separately, Attributed claim displays the linked user's name.*

- **Given** a signed-in claimer viewing an item on a list whose owning profile mutually follows another profile B
- **When** the claimer opens the claim picker on that item
- **And** selects B as the purchaser
- **Then** the claim records with B as the purchaser
- **And** the claim displays B's first name
- **And** the list's owning profile is not offered in the picker

### Flow: Attributed purchaser sees the claim as their own

*Sources: `claim-attribution` — Attributed user sees the claim as self, Purchaser removes a claim made on their behalf.*

- **Given** a signed-in viewer B whose profile is the recorded purchaser of a claim asserted by another claimer
- **When** B opens the item
- **And** removes the claim
- **Then** the claim presented as B's own claim before removal
- **And** the item shows no claim after removal

### Flow: Claimer with a free-text name records and removes the claim

*Sources: `list-item-management` — Authenticated user claims on behalf of a named other person; `claim-attribution` — Authenticated guest-name claim carries the claimer, Authenticated creator of a guest-name claim can remove it.*

- **Given** a signed-in claimer viewing an item on a list they do not own
- **When** the claimer records a claim with the typed name `Aunt May`
- **And** removes that claim
- **Then** the claim displayed `Aunt May` rather than the claimer's own name
- **And** the item shows no claim after removal

### Flow: Signed-out guest claims and removes on a shared list

*Sources: `list-item-management` — Guest claims an item on a public list; `claim-attribution` — Cookie-identified guest claim presents as the viewer's own, Guest removes their cookie-identified claim.*

- **Given** a signed-out visitor on a `Shared` list with no prior guest claim
- **When** the visitor records a claim with the typed name `Aunt May`
- **And** removes that claim
- **Then** the card banner read `You` and the manage list read `Aunt May (you)` before removal
- **And** no `Added by you` attribution line was shown
- **And** the item shows no claim after removal

### Flow: Owner views their claimed items with spoilers off

*Sources: `list-item-management` — Owner without spoilers sees no claim attribution.*

- **Given** a signed-in account whose profile owns a list carrying at least one claim, with spoilers off
- **When** the owner opens the list
- **Then** no claimer name is shown on any item
- **And** the claimed indicator still shows on the claimed item

### Flow: Owner turns spoilers on and master-unclaims

*Sources: `list-item-management` — Owner with spoilers sees first names tagged other; `claim-attribution` — Owner master unclaim removes any claim on their item.*

- **Given** a signed-in account whose profile owns a list carrying at least one claim, with spoilers off
- **When** the owner enables spoilers on that list
- **And** removes the claim on one of their items
- **Then** each remaining claim shows a first name marked as someone else's
- **And** the item whose claim was removed shows no claim

### Flow: Owner bookmarks their own hidden list

*Sources: `visit-history` — Owner can bookmark their own private list, Bookmark and history reads resolve by account.*

- **Given** a signed-in account whose profile owns an unbookmarked list with visibility `Hidden`
- **When** the owner opens the list
- **And** clicks Bookmark
- **Then** the list card shows the `Bookmarked` indicator
- **And** the list appears in the home Bookmarks rail

### Flow: Owner blocks a follower from the connections page

*Sources: `following` — View following, Block a user, Block inserts exactly one row, Blocked user no longer sees blocker in feed.*

- **Given** a signed-in account whose profile is followed by a second account's profile
- **When** the owner loads `/settings/connections`
- **And** clicks Block next to that follower in the Followers section
- **Then** the follower moves into the Blocked section with an Unblock button
- **And** the follower no longer appears in the Followers section
- **And** the blocker no longer appears in the blocked party's Following feed

### Flow: Blocked viewer is turned away from the blocker's surfaces

*Sources: `following` — Signed-in blocked user redirected from list page, Signed-in blocked user 404s on profile page, Blocked user cannot follow, Signed-out access intact for unlisted/public lists.*

- **Given** a signed-in viewer whose profile has been blocked by profile A
- **When** the viewer navigates to a `Shared` list whose owning profile is A
- **And** then navigates to `/user/<A's profile id>`
- **Then** the list URL landed on `/lists` without rendering any of the list's contents
- **And** the profile URL returned a not-found response

### Flow: Signed-out access to a blocker's shared list is unchanged

*Sources: `following` — Signed-out access intact for unlisted/public lists.*

- **Given** a signed-out visitor whose account's profile has been blocked by profile A
- **When** the visitor navigates to a `Shared` list whose owning profile is A
- **Then** the list renders normally with its items
- **And** the browser does not land on `/lists`

### Flow: Owner removes an item from their own list

*Sources: `list-item-management` — Successful removal revalidates cache tags, Non-owner cannot remove an item from someone else's list.*

- **Given** a signed-in account whose profile owns a list carrying an item
- **When** the owner opens the list
- **And** removes that item
- **Then** the item no longer appears on the list
- **And** the list's position in the My Lists rail reflects the update time

### Flow: Owner unfollows and removes a follower

*Sources: `following` — Unfollow, Remove a follower, Unblock a user.*

- **Given** a signed-in account that follows one profile and is followed by another
- **When** the owner loads `/settings/connections`
- **And** clicks Unfollow next to the followed profile
- **And** clicks Remove next to the follower
- **Then** the Following section no longer lists the unfollowed profile
- **And** the Followers section no longer lists the removed follower
- **And** neither party appears in the Blocked section

### Flow: Profile page renders for a profile with no shared lists

*Sources: `following` — Empty public lists state, Follow prompt from invite URL, Unknown user 404.*

- **Given** a signed-in viewer and a profile that has no `Shared` lists and is not followed by the viewer
- **When** the viewer navigates to `/user/<that profile id>?follow=1`
- **Then** an empty-state message renders in place of the list grid
- **And** a follow prompt renders above the list grid
- **And** the Follow button is available

## No manual path — fully automated

- **Content and social rows SHALL carry a profile reference beside their account reference** (`profiles-data-model`) — column presence, backfill routing, backfill idempotence, follower-side account retention, and cascade behavior are inspected against the schema and the migration; no surface renders a column.
- **The vacated account columns SHALL lose NOT NULL, and two composite primary keys SHALL be recreated over profile columns** (`profiles-data-model`) — nullability and duplicate-edge rejection are database-constraint assertions; the user-facing consequence (a duplicate follow or block never materializes) is already walked in the connections flows.
- **The profile-valued purchaser uniqueness index SHALL be created alongside the account-valued one, never swapped for it** (`profiles-data-model`) — index existence and the absence of an unprotected window are migration-statement properties. The one observable consequence, a second claim resolving to the existing one, is walked in *Non-owner self-claims an item on a shared list*.
- **Ownership SHALL be a strict profile-id comparison, and `profile_members` SHALL gain no readers** (`profiles-data-model`) — the comparison's observable effects are walked in every owner flow; "no membership read is introduced" is a code assertion with no surface.
- **The claim asserter and a self-claim's purchaser SHALL always be the acting account's self-profile** (`profiles-data-model`, `claim-attribution`) — the asserter column is never rendered on its own; with one profile per account there is no manual way to produce a claim whose asserter differs from the actor's self-profile.
- **Items and lists carry a last-mutator audit column** (`profiles-data-model`) — `updated_by_user_id` is write-only this phase; its sole reader is a later change, so no surface reflects a stamp or its absence.
- **An identity SHALL be compared only against a column of its own kind** (`server-endpoint-authorization`) — a standing review rule; "cross-kind comparison is rejected at review" has no runtime surface.
- **Session-derived actor resolution SHALL route through the shared helper** (`server-endpoint-authorization`) — seam routing, profile resolution from the same seam, and repeat-resolution query cost are code and query-count assertions.
- **Server actions SHALL verify resource ownership before update or delete** and **SHALL resolve the acting user from the session, not the request payload** and **Follow-graph mutation actions SHALL NOT accept an actor parameter** (`server-endpoint-authorization`) — direct-invocation rejection paths and payload-shape assertions have no UI that can express them; the browser offers no way to submit a forged actor id.
- **`list_visits` SHALL stay keyed by account, not by profile** (`visit-history`) — a schema-shape boundary recorded for later readers; the bookmark flows walk its behavior.
- **`bookmarkList` rejection of a non-owner's hidden list** (`visit-history`) — a non-owner cannot reach a `Hidden` list's page, so no bookmark control is reachable to exercise; the walkable half is *Non-owner is turned away from a hidden list*.
- **Migration SHALL promote saved lists to bookmarks and leave the source table dormant** (`visit-history`) — the promoting migration already shipped; the drop of the dormant `saved_lists` table is a schema assertion with, by definition, no reader.
- **`createPurchase` payload shape and the non-viewable / blocked / non-mutual rejection paths** (`list-item-management`, `claim-attribution`) — the picker never offers an ineligible target and the client never carries an actor id, so the server rejections are reachable only by direct invocation.
- **DAL item reads SHALL sanitize purchase attribution by viewer role** (`list-item-management`) — the field-level guarantee (never a full name, email, account id, or profile id in the payload) is a data-layer boundary assertion; its rendered consequences are walked in the claim and spoiler flows.
- **Data-layer module organization, including the `lib/data/profile.ts` / `profile.actions.ts` pair and the id-kind rule that assigns to it** (`data-layer-organization`) — file-placement and `'use server'` directive rules with no runtime surface.
- **`ListCard` byline and bookmark-indicator rendering rules** (`list-collections`) — the byline naming the owning profile is walked implicitly wherever cards render with `showOwner`; the `showOwner false` / null-name negatives are component-level assertions with no reachable manual toggle.
- **`user_follows` composite primary key concurrency backstop** (`following`) — concurrent-write convergence and raw-insert rejection cannot be produced by hand at the UI.
- **Shared `guardListViewable` helper centralizes the redirect target** (`following`) — a code-structure assertion; the redirect it produces is walked in *Blocked viewer is turned away from the blocker's surfaces*.
