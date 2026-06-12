# e2e-critical-flows Specification (delta)

## MODIFIED Requirements

### Requirement: Critical user flows SHALL be covered by an end-to-end test

The repository SHALL maintain a Playwright end-to-end suite under `e2e/` that exercises each of the following user flows through the running application, against the seeded development database. Each flow SHALL be covered by at least one spec that drives real user-visible affordances (by role, accessible name, label, or visible text) and asserts an observable outcome — rendered content, persisted state reflected on reload, or navigation — NOT mere execution. Removing or disabling coverage of any listed flow SHALL be a violation of this requirement.

The covered flows SHALL be:

1. **Sign-in surface** — the AuthPage sign-in UI renders its sign-in affordance.
2. **Sign-in via bypass** — under the local-mode session bypass (`USE_PG_DRIVER=1`, session selector unset), a protected page renders for the seeded viewer without a sign-in step.
3. **Create list** — a list is created through the list-creation form.
4. **Add items** — items are attached to a list through the choose-items surface, and the attached item is asserted to render on the resulting list page by name — not merely by the post-save URL and list heading, which a silent no-op in the save action would also satisfy.
5. **Set visibility** — a list's visibility is changed through the visibility picker.
6. **Share** — the share affordance is reachable for a non-hidden list.
7. **Signed-in (authenticated non-owner) claims an item with spoiler hiding** — a signed-in viewer who is not the owner claims an item — whether marking it as their own purchase ("I purchased it") or on behalf of someone else ("Someone else") — and sees their own claim; the owner's default (no-spoiler) view of a claimed item hides the claim. (Being a follower of the owner is incidental — any caller may view/claim a non-Hidden list; what distinguishes this from flow 9 is the signed-in vs logged-out session.)
8. **Owner sees a claim** — the owner's spoiler-enabled view reveals a claim that the default view hides.
9. **Guest (logged-out) claims an item on a public list** — REQUIRED; see the dedicated requirement below.

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

#### Scenario: Spoiler hiding diverges for owner default vs. owner-with-spoilers

- **WHEN** the owner views a list whose item carries a claim, first without and then with the spoiler reveal enabled
- **THEN** the default view shows the item with no claimer revealed
- **AND** the spoiler-enabled view reveals the claimer's first name on that item

#### Scenario: Dropping a flow fails the suite

- **WHEN** a future change removes or skips the spec covering any listed flow
- **THEN** the corresponding e2e coverage is absent and this requirement is violated
