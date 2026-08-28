## ADDED Requirements

### Requirement: Viewer views SHALL anchor on a byline group containing the owning profile's avatar, linked name, and Follow

On viewer views (the authenticated viewer is not the list owner, on a non-preview view), the controls card SHALL render — at the top of the controls card — a byline group containing in left-to-right order:

1. A 44px avatar resolving the **owning profile** through `altvatar`'s chain: the profile's Altvatar art where it has any, its initials otherwise. The account behind the profile SHALL NOT be consulted, and no generic-icon fallback SHALL be rendered — a profile's name is required, so initials always resolve.
2. The owner's name rendered as a link to `/user/{owner_id}` (per the `following` capability).
3. The Follow / Following button (per the `following` capability's colocation requirement), stretched to fill the byline column.

The avatar, name, and Follow button SHALL be visually grouped (flex siblings with shared alignment) such that they read as one unit anchoring the controls card. The Follow button SHALL satisfy WCAG 2.5.5 (44×44 CSS px touch target) as required by the `following` capability.

#### Scenario: Viewer sees avatar + linked name + Follow grouped

- **WHEN** an authenticated viewer (not the owner) on a non-preview view loads a non-private list
- **THEN** the controls card's top group contains a 44px avatar, the owner's name as an anchor with `href="/user/{owner_id}"`, and a Follow / Following button — all visually grouped inside `.list-hero-byline-group`

#### Scenario: Avatar falls back to initials where the owning profile has no art

- **WHEN** the list's owning profile carries no Altvatar art
- **THEN** the avatar renders an initials chip generated from the profile's name at the same 44px size

#### Scenario: A managed profile's list carries a face like any other

- **WHEN** the list is owned by a managed profile carrying Altvatar art
- **THEN** the byline avatar renders that art, with no account consulted and no difference in treatment from a self-profile's list

## REMOVED Requirements

### Requirement: Viewer views SHALL anchor on a byline group containing avatar, linked owner name, and Follow

**Reason**: Its resolution chain was written against `users.image`, a column this change stops reading everywhere, and its fallback scenario was keyed on that column being null — a condition no longer visible to any behaviour. The chain also had a third leg, a generic icon, that only existed because an account could have neither an image nor a resolvable name; a profile's name is required, so initials always resolve and the leg is unreachable.

**Migration**: Replaced by **Viewer views SHALL anchor on a byline group containing the owning profile's avatar, linked name, and Follow**, added in this same delta. The group's composition, ordering, grouping and touch-target rules are carried over unchanged; only the avatar's source and fallback change, from the owning account's image to the owning profile's Altvatar art, with initials as the sole fallback.
