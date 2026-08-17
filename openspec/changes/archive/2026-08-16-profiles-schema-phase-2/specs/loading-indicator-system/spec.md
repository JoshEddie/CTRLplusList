## MODIFIED Requirements

### Requirement: `/user/[id]` SHALL render two independent section Suspenses for profile header and lists grid

The `/user/[id]` route's `page.tsx` SHALL render `<ListCollectionsNav>` as static chrome, then a `<Suspense fallback={<LoadingIndicator size="rail" />}>` around an extracted `<ProfileHeaderSection>` (responsible for `getProfileForViewer` and the `<ProfileHeader>` + optional `<FollowPrompt>` render), then a static `<Header title="Lists" />`, then a `<Suspense fallback={<LoadingIndicator size="page" />}>` around an extracted `<ProfileListsSection>` (responsible for `getPublicListsByProfile` and the `<PublicListsGrid>` render). The two sections SHALL stream independently — a slow `getPublicListsByProfile` SHALL NOT delay the profile-header section's resolution.

#### Scenario: Profile header streams before lists grid resolves

- **WHEN** `/user/[id]` is loading and `getPublicListsByProfile` is slower than `getProfileForViewer`
- **THEN** the profile header section paints first with the resolved `<ProfileHeader>`, while the lists section still shows `<LoadingIndicator size="page" />` in the lists-grid container

#### Scenario: Two section spinners, not one page spinner

- **WHEN** `/user/[id]` is loading and neither section has resolved
- **THEN** two `<LoadingIndicator>` elements are visible: one at `size="rail"` inside the profile-header container, one at `size="page"` inside the lists-grid container. No single page-level spinner is rendered above them.

### Requirement: `/settings/connections` SHALL render one Suspense per `ConnectionsSection`

The `/settings/connections` route's `page.tsx` SHALL render `<Header title="Connections" />` as static chrome, then three `<ConnectionsSection>` shells (Following / Followers / Blocked), each wrapping its own `<Suspense fallback={<LoadingIndicator size="rail" />}>` around an extracted section-body component that owns its own `getFollowingByUser` / `getFollowersOfProfile` / `getBlockedByProfile` data fetch. The three sections SHALL stream independently — a slow Blocked query SHALL NOT delay the Following or Followers sections.

#### Scenario: Three independent section spinners

- **WHEN** `/settings/connections` is loading and no section has resolved
- **THEN** three `<LoadingIndicator size="rail" />` elements are visible, one inside each `<ConnectionsSection>` body. The section titles and counts (if statically known) render as part of the static shell above each spinner.

#### Scenario: Sections stream independently

- **WHEN** the Following query resolves before Followers and Blocked
- **THEN** the Following section paints its rows while the Followers and Blocked sections still show their rail-sized spinners
