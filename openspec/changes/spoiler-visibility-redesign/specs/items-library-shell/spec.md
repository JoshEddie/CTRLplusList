## ADDED Requirements

### Requirement: The library read SHALL take a resolved spoiler tier, and the library SHALL offer a three-stage spoiler toggle

The `/items` route SHALL resolve the viewer's spoiler tier (`spoiler-visibility`) from the account's membership on the profile its request acts as, and SHALL pass that resolved tier into the active and archived item reads. No search parameter SHALL be interpreted as a request to reveal claim information, and no `purchases` value SHALL be interpreted as a claim-state filter.

The library SHALL offer its spoiler control as a compact toggle placed to the **left of the search field**, not as a toolbar filter facet and not as a row in the filters sheet. The toggle SHALL offer three stages — `surprise`, `claims`, and `identity` — and SHALL omit the `progress` stage: `progress` discloses a single list's total claimed count, and the library spans every list the profile owns, with no one list to progress toward. The page SHALL therefore render no claimed count and no progress bar anywhere. Selecting a stage SHALL set the transient per-page tier in the URL, exactly as the hero Spoilers tile does on a list page (`spoiler-visibility`); it SHALL NOT write the viewer's stored baseline.

#### Scenario: The library read is resolved from membership

- **WHEN** `/items` renders for an authenticated viewer
- **THEN** the active and archived item reads are performed with the spoiler tier resolved from that account's membership on the profile it acts as

#### Scenario: No parameter reveals claim information or filters by claim state

- **WHEN** the URL contains `?purchases=reveal`, `?purchases=only`, or any other value
- **THEN** the resolved spoiler tier is unaffected by it
- **AND** the value narrows no items, since the library carries no claim-state filter

#### Scenario: The library toggle omits the progress stage

- **WHEN** the library's spoiler toggle renders
- **THEN** it offers `surprise`, `claims`, and `identity` and no `progress` stage
- **AND** no claimed count or progress bar renders anywhere on the page

#### Scenario: The spoiler toggle sits left of the search field

- **WHEN** the library toolbar renders
- **THEN** the spoiler toggle renders to the left of the search field, and no Claims facet renders among the toolbar's filters or in the filters sheet

## MODIFIED Requirements

### Requirement: ItemsContainer SHALL route between list-scoped and library reads by the presence of listId

`ItemsContainer` SHALL, when given a `listId`, read items via the list-scoped read honoring the forwarded viewer identity and resolved spoiler tier, and render the list-mode browser; when given no `listId`, it SHALL read the items owned by the **viewer's profile** — matching each item's owning profile against the profile the viewer's request acts as — and render the library view. The unauthenticated redirect guard SHALL apply only to the no-`listId` branch — a list-scoped read SHALL proceed for an unauthenticated viewer (with no viewer identity), leaving list visibility to the list-scoped read itself.

The resolved spoiler tier SHALL arrive as a forwarded value rather than being resolved inside the read, per `list-item-management`: it is database-backed, so resolving it beneath the cache boundary would key the cache on an input that can go stale.

#### Scenario: A listId selects the list-scoped read and list-mode browser

- **WHEN** `ItemsContainer` is invoked with a `listId` plus a viewer identity and a resolved spoiler tier
- **THEN** it reads items scoped to that list with those values and renders the list-mode browser

#### Scenario: No listId selects the viewer's items and the library view

- **WHEN** `ItemsContainer` is invoked without a `listId` for a resolved viewer
- **THEN** it reads the items whose owning profile is the profile the viewer's request acts as, and renders the library view

#### Scenario: The list branch does not redirect an unauthenticated viewer

- **WHEN** `ItemsContainer` is invoked with a `listId` but no authenticated viewer
- **THEN** it does not redirect and performs the list-scoped read with no viewer identity
- **AND** the resolved spoiler tier is the maximal projection, since no membership can be resolved

## REMOVED Requirements

### Requirement: The reveal-purchases URL parameter SHALL control spoiler disclosure for the library read

**Reason**: Spoiler state is no longer carried by a URL parameter on this route. It resolves from the viewer's membership on the acting profile, and `purchases` is no longer interpreted as a spoiler signal or as a claim-state filter — so both the requirement's name and every one of its scenarios assert a mechanism that no longer exists.

**Migration**: Replaced by "The library read SHALL take a resolved spoiler tier, and the library SHALL offer a three-stage spoiler toggle", added in this delta. Existing links carrying `?purchases=reveal` or `?purchases=only` remain valid URLs; the value is simply not recognized and narrows nothing and reveals nothing, exactly as any other unrecognized value does.
