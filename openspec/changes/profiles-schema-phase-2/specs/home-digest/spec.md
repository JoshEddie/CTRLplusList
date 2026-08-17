## MODIFIED Requirements

### Requirement: My Lists rail SHALL show the user's most recent owned lists

The **My Lists** rail SHALL show the lists owned by the **viewer's profile** — resolved by matching each list's owning profile against the profile the viewer's request acts as — ordered by `updated_at DESC`, limited to 5, with a **See all** link to `/lists` (the dedicated My Lists full page). The rail header SHALL NOT include a New list affordance — the **+ New List** CTA SHALL live on the `/lists` page's `<Header>`, not on the home rail.

#### Scenario: Owned lists shown newest-first

- **WHEN** an authenticated user whose profile owns 10 lists loads `/`
- **THEN** the My Lists rail shows the 5 most-recently-updated of those lists with **See all** linking to `/lists`

#### Scenario: Rail resolves lists through the viewer's profile

- **WHEN** the My Lists rail reads the viewer's lists
- **THEN** it matches each list's owning profile against the profile the viewer's request acts as, not against the viewer's account id

#### Scenario: New list CTA is not on the home rail

- **WHEN** the home page renders the My Lists rail
- **THEN** the rail header contains the rail title, chevron, and "See all →" link only — no "+ New list" affordance

#### Scenario: New list CTA lives on /lists

- **WHEN** the user navigates to `/lists`
- **THEN** the page's `<Header>` contains a "+ New List" button linking to `/lists/new`

### Requirement: Following rail SHALL show user cards sorted by recency of their latest followers-visible list

The **Following** rail SHALL show cards (avatar + name) for the **profiles** the viewer follows, sorted by `MAX(shared_at)` over each followed profile's **followers-visible** lists in descending order. A followers-visible list is one whose visibility is `VISIBILITY.FOLLOWERS` — the canonical state the following-feed read filters via `visibilityDbValues([VISIBILITY.FOLLOWERS])`, which matches the persisted DB encodings `'public'` (current) and `'followers'` (post-Stage-2-rename). Profiles with no followers-visible lists are sorted last by name. Each card SHALL show a "N new" badge if N > 0 (per the `last_seen_following_at` rule in the `following` capability, which stays keyed to the viewer's account and is unchanged by the move to profile-valued followees). The card SHALL link to the profile route `/user/[id]`, whose id segment is the followed **profile's** id. A **See all** link in the rail header SHALL route to `/following`.

#### Scenario: Active followee sorted first

- **WHEN** viewer follows profiles A and B; A's most recent followers-visible list has `shared_at = T1`, B's has `shared_at = T2 < T1`
- **THEN** A's card precedes B's in the Following rail

#### Scenario: Followee with no followers-visible lists

- **WHEN** viewer follows profile C which has no followers-visible lists
- **THEN** C's card appears in the rail (sorted after followees with followers-visible lists) with no "N new" badge

#### Scenario: Card links to the profile route by profile id

- **WHEN** a Following rail card renders for a followed profile
- **THEN** its href is `/user/<that profile's id>`

#### Scenario: See all link

- **WHEN** the user clicks See all on the Following rail
- **THEN** the user navigates to `/following`
