## MODIFIED Requirements

### Requirement: List pages SHALL expose a follow affordance for non-owner viewers, colocated with the linked owner name

When an authenticated viewer who is not the list owner renders a list with `visibility != 'private'`, the list-detail hero SHALL display a Follow / Following button targeting the list's **owning profile**. The button SHALL be a full-size button satisfying WCAG 2.5.5 (44×44 CSS px touch target). The button SHALL be rendered in a byline sub-row of the list hero adjacent to the owner's name (which itself SHALL be rendered as a link to `/user/{owning profile id}` on this surface), and SHALL NOT be rendered in the list-hero action row alongside list-actions such as Share and Bookmark.

The button SHALL be hidden when the viewer is unauthenticated, when the **active** profile is the list's owning profile, or when the viewer's **self**-profile has blocked or been blocked by the owning profile. The two comparisons take different profiles and SHALL each name theirs: the owner comparison is an ownership comparison, so it takes the profile the request acts as; the block comparison is a block evaluation, which `active-profile` binds to the human.

A viewer who runs the owning profile but is not acting as it SHALL therefore still be offered the button, and MAY follow a profile they run. This is the behavior on the current trunk rather than something the switcher introduces — an account can already create a managed profile and be offered Follow on its list — and closing it needs a membership containment test this change deliberately does not add. It is carried with the rest of the association model to the change that reworks it.

#### Scenario: Follow button colocated with linked owner name

- **WHEN** an authenticated viewer (not the owner) loads a non-private list
- **THEN** the list hero renders a byline sub-row containing the owner's name as a link to `/user/{owning profile id}` and a full-size button labeled "Follow {owner-name}" adjacent to it
- **AND** the list-hero action row contains only list-actions (Share, Bookmark) — no Follow button

#### Scenario: Following state shown after follow

- **WHEN** the viewer already follows the owning profile
- **THEN** the button label reads "Following" and clicking it unfollows (no dialog gating on unfollow)

#### Scenario: Owner name linkified only on list-detail hero

- **WHEN** the owner's name appears on a list-detail hero
- **THEN** it renders as a link to `/user/{owning profile id}`

- **WHEN** the owner's name appears on other surfaces (list cards, bookmark rails, feed entries)
- **THEN** the name's existing presentation is unchanged by this requirement (linkification on those surfaces is out of scope)

#### Scenario: Hidden for owner

- **WHEN** a viewer acting as the profile that owns the list views that list
- **THEN** no Follow button is rendered in the byline sub-row

#### Scenario: Offered on a list owned by a profile the viewer runs but is not acting as

- **WHEN** a viewer acting as their self-profile loads a non-private list owned by a managed profile they run
- **THEN** the Follow button is rendered, unchanged from the current trunk behavior

#### Scenario: A block hides the button whatever profile the viewer acts as

- **WHEN** a viewer acting as a managed profile loads a non-private list whose owning profile has blocked the viewer's self-profile
- **THEN** no Follow button is rendered — the gate compares the self-profile, not the profile being acted as

#### Scenario: Hidden for unauthenticated

- **WHEN** an unauthenticated viewer loads a list
- **THEN** no Follow button is rendered

### Requirement: Owners SHALL view and manage their followers

The connections settings page (`/settings/connections`) SHALL show three sections: **Following** (with per-row unfollow), **Followers** (with per-row remove and per-row block), and **Blocked** (with per-row unblock). Each section SHALL be paginated or list-limited as needed. The page is account-scoped: it SHALL resolve the viewer by their self-profile and SHALL NOT follow the active profile, so what it shows does not change as the viewer switches.

A block is recorded as a single `user_blocks` row whose blocker and blocked are both **profiles**. Blocking SHALL create exactly one row, and SHALL NOT materialize additional rows for any other profile either party runs. Its blocker end SHALL always be the acting account's **self**-profile, whatever profile that account is currently acting as: a block is an act by a human, so it does not follow the switcher, and it means the same thing before and after one. Its blocked end is the named profile alone, per the model decision that no blocked-side resolution is built. A cascade across the profiles an account owns is not built here and is carried with the rest of the blocking model to the change that reworks association.

#### Scenario: View following

- **WHEN** an authenticated user loads `/settings/connections`
- **THEN** the Following section lists each profile the viewer follows, with an Unfollow button per row

#### Scenario: Remove a follower

- **WHEN** the viewer clicks Remove next to a follower
- **THEN** the `user_follows` row `(follower = that account, followee = the viewer's profile)` is deleted; the follower can re-follow

#### Scenario: Block a user

- **WHEN** the viewer clicks Block next to a user
- **THEN** any `user_follows` rows between the two parties in either direction are deleted, and a `user_blocks` row `(blocker = the viewer's self-profile, blocked = the target's profile)` is inserted

#### Scenario: Block inserts exactly one row

- **WHEN** the viewer blocks a target
- **THEN** exactly one `user_blocks` row is inserted, regardless of how many profiles either party runs

#### Scenario: Blocking while acting as another profile still names the human

- **WHEN** a viewer acting as a managed profile blocks a target
- **THEN** the inserted row's blocker end is the viewer's self-profile, not the profile they are acting as

#### Scenario: Unblock a user

- **WHEN** the viewer clicks Unblock in the Blocked section
- **THEN** the `user_blocks` row is deleted; the target can attempt to follow again

### Requirement: Blocks SHALL gate URL access for signed-in blocked viewers; signed-out access is unchanged

A block SHALL prevent follow actions in both directions and SHALL exclude the blocker's `'public'` lists from the blocked party's Following feed (and vice versa). Every gate compares the viewer's **self**-profile against the counterparty profile named on the `user_blocks` row, whatever profile the viewer is currently acting as — so a block filters what that human sees in every profile they act as, and switching neither escapes a block nor acquires one. When the blocked party is **signed in** AND attempts to load the blocker's list page or profile page, the system SHALL respond as if the resource were unavailable, using the existing app idioms (list page redirects to `/lists`, the same response a deleted list produces, via the shared `guardListViewable` helper; profile page returns a not-found response). When the blocked party is **signed out**, URL access is unchanged — the page renders normally. This signed-out seam is acknowledged: deleting the list or setting it to `'private'` is the only universal recourse.

A block names the profile it was made against, so a party running more than one profile can evade it by acting as another. That evasion is accepted rather than closed: it is strictly more effort than the signed-out seam above, there is no messaging surface to harass through, and claim-griefing is unaffected either way. The durable answer is consent-gated association, owned by the change that reworks it; blocking's surviving job there is third-party visibility filtering.

Conversely, a block does not reach the profiles the blocker runs but is not: content owned by a managed profile of theirs stays visible to a party they have blocked, because the block names the human's own profile alone. This is the accepted cost of building no cascade, and it closes with the same association rework.

#### Scenario: Blocked user cannot follow

- **WHEN** profile A's account blocks profile B, and B's account attempts `followUser(A)`
- **THEN** the action returns an error and no `user_follows` row is created

#### Scenario: Blocked user no longer sees blocker in feed

- **WHEN** profile A's account blocks profile B, and B's account previously followed A
- **THEN** A no longer appears in B's Following feed (the prior `user_follows` row is deleted by the block action)

#### Scenario: Signed-in blocked user redirected from list page

- **WHEN** profile A's account has blocked profile B, and B's account (signed in) navigates to a list whose owning profile is A
- **THEN** the system redirects to `/lists` (the same response shape used for a deleted list), without rendering the list contents

#### Scenario: Signed-in blocked user 404s on profile page

- **WHEN** profile A's account has blocked profile B, and B's account (signed in) navigates to `/user/<A's profile id>`
- **THEN** the system returns a not-found response (the same response shape used for a non-existent profile)

#### Scenario: A block still gates while the blocked viewer acts as another profile

- **WHEN** profile A's account has blocked profile B, and B's account switches to a managed profile it runs and navigates to A's list page
- **THEN** the system responds as it does for B's own profile — the gate compares B's self-profile, not the profile B is acting as

#### Scenario: Signed-out access intact for unlisted/public lists

- **WHEN** profile A's account has blocked profile B, and B (signed out) navigates to A's `'unlisted'` or `'public'` list URL
- **THEN** the page renders normally — block gating applies only to signed-in viewers

#### Scenario: Shared `guardListViewable` helper centralizes the redirect target

- **WHEN** the list-page render checks fail (list missing OR viewer blocked by the owning profile)
- **THEN** both conditions flow through `lib/listAccess.ts`'s `guardListViewable` helper and exit via the same `redirect('/lists')` call, so future changes to the response shape (e.g. to a 404 page) edit one place
