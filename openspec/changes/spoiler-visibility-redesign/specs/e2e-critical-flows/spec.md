## ADDED Requirements

### Requirement: Critical user flows SHALL be covered by an end-to-end spec

The repository SHALL maintain a Playwright end-to-end suite under `e2e/` that exercises each of the following user flows through the running application, against the seeded development database. Each flow SHALL be covered by at least one spec that drives real user-visible affordances (by role, accessible name, label, or visible text) and asserts an observable outcome — rendered content, persisted state reflected on reload, or navigation — NOT mere execution. Removing or disabling coverage of any listed flow SHALL be a violation of this requirement.

The covered flows SHALL be:

1. **Sign-in surface** — the AuthPage sign-in UI renders its sign-in affordance.
2. **Sign-in via bypass** — under the local-mode session bypass (`USE_PG_DRIVER=1`, session selector unset), a protected page renders for the seeded viewer without a sign-in step.
3. **Create list** — a list is created through the list-creation form.
4. **Add items** — items are attached to a list through the choose-items surface, and the attached item is asserted to render on the resulting list page by name — not merely by the post-save URL and list heading, which a silent no-op in the save action would also satisfy.
5. **Set visibility** — a list's visibility is changed through the visibility picker.
6. **Share** — the share affordance is reachable for a non-hidden list.
7. **Signed-in (authenticated non-owner) claims an item** — a signed-in viewer who is not the owner opens the purchase modal via the card's `Add Claim` affordance (per `item-actions`) and claims an item — whether via the one-tap self-claim ("Claim this gift"), on behalf of a linked user via the attributed-purchaser picker (expanding the "Claiming for someone else?" disclosure), or on behalf of a named non-user via the "Someone not listed?" fallback — and sees their own claim; a protected member of the owning profile, at their default state, does not see it. (Being a follower of the owner is incidental — any caller may view/claim a non-Hidden list; what distinguishes this from flow 9 is the signed-in vs logged-out session.)
8. **A protected member raises their claim visibility** — a member of the owning profile, whose baseline leaves them at the fully protected state, raises the tier through the hero's Spoilers tile and sees a claim their default view withheld; leaving and returning to the list restores the protected view, since the control is transient.
9. **Guest (logged-out) claims an item on a public list** — REQUIRED; see the dedicated requirement below.
10. **Attributed claim round-trips through the picker** — a signed-in non-owner expands the modal's disclosure, marks a seeded mutual-of-the-owner as the purchaser via the picker's select-then-confirm interaction; the claim displays the attributed user's first name, and the attribution is persisted (reflected on reload).
11. **A fully protected member claims and master-unclaims through the confirmation** — a member at the fully protected state, on a list their profile owns, reaches the claim affordance without changing any setting, confirms the reveal, claims an item ("I bought this myself"), and removes an existing claim they did not create via master unclaim. The affordances render whatever the resolved state; the confirmation, not their absence, is what stands between the member and an unasked-for reveal.

#### Scenario: Sign-in surface renders without completing OAuth

- **WHEN** the suite navigates to the sign-in route with no active session
- **THEN** the AuthPage sign-in UI renders, including the "Sign in with Google" affordance
- **AND** the test asserts the affordance is present and does NOT complete a Google OAuth handshake

#### Scenario: Bypass session renders a protected page

- **WHEN** the suite navigates to a protected page under the local-mode session bypass (seeded-viewer session)
- **THEN** the page renders for the seeded viewer ("Test Viewer") without any sign-in step

#### Scenario: Owner lifecycle arc is covered

- **WHEN** the suite runs the create-list → add-items → set-visibility → share arc as the seeded viewer
- **THEN** each step asserts its observable result: the new list is reachable, the chosen item's name renders on the list page after saving (proving the attach round-tripped through the save action, not just that navigation succeeded), the visibility control reflects the selected state ("Shared"), and the share affordance is reachable on the now-non-hidden list

#### Scenario: Claim visibility diverges between the protected default and a raised tier

- **WHEN** a protected member views a list whose item carries a claim, first at their baseline and then with the tier raised to `identity` through the Spoilers tile
- **THEN** the baseline view shows the item with no claim and no claimer revealed
- **AND** the raised view reveals the claimer's first name on that item

#### Scenario: The raised tier does not survive leaving the list

- **WHEN** the member raises the tier, navigates away from the list, and returns to it
- **THEN** the list renders at their baseline again, with the claim withheld

#### Scenario: Attributed claim via the picker round-trips

- **WHEN** the seeded viewer opens the purchase modal on a claimable item of a followed owner's list, expands the "Claiming for someone else?" disclosure, selects a seeded mutual of that owner, and confirms
- **THEN** the claim succeeds and the item displays the attributed user's first name
- **AND** on reload the attribution persists

#### Scenario: Claim affordances render for a fully protected member

- **WHEN** a member at the fully protected state views their own profile's seeded list
- **THEN** the claim affordance renders on every item regardless of its claim state, and no item's action set discloses whether it is claimed

#### Scenario: The confirmation gates the reveal, not the claim

- **WHEN** that member activates the claim affordance
- **THEN** a confirmation is presented before the modal opens
- **AND** after confirming, the member claims an unclaimed item and removes a seeded claim they did not create, each reflected after reload

#### Scenario: The card offers View item in every claim state

- **WHEN** a signed-in non-owner views a claimable item and a fully-claimed item, each with a complete store
- **THEN** each card renders a `View item ↗` affordance targeting the store URL in a new tab — including the fully-claimed card, whose claim affordance is replaced by the `Fully claimed` status

#### Scenario: The modal still carries the store row

- **WHEN** a signed-in non-owner opens the purchase modal on an item with a complete store
- **THEN** the modal renders the store row (primary store link opening in a new tab) and the claim CTA in the same surface

#### Scenario: Dropping a flow fails the suite

- **WHEN** a future change removes or skips the spec covering any listed flow
- **THEN** the corresponding e2e coverage is absent and this requirement is violated

## REMOVED Requirements

### Requirement: Critical user flows SHALL be covered by an end-to-end test

**Reason**: Its flow list and two of its scenarios are written against the owner-only spoiler toggle. "Owner claim entry and master unclaim are spoiler-gated" asserts the exact rule this change reverses — affordances are now ungoverned — so no rewriting of its body can make its name true, and `MODIFIED` cannot rename a scenario without archive rejecting the block for omitting it. Flow 8, "Owner sees a claim — the owner's spoiler-enabled view reveals a claim that the default view hides", names a view that no longer exists.

**Migration**: Replaced by "Critical user flows SHALL be covered by an end-to-end spec", added in this delta, which carries every unaffected flow and scenario verbatim and restates flows 7, 8 and 11 against the resolved spoiler tier — flow 8 becoming the transient Spoilers tile, flow 11 becoming the reveal confirmation. Coverage is not reduced: the replacement carries two scenarios more than the requirement it replaces.
