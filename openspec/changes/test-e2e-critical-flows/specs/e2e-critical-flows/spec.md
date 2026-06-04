## ADDED Requirements

### Requirement: Critical user flows SHALL be covered by an end-to-end test

The repository SHALL maintain a Playwright end-to-end suite under `e2e/` that exercises each of the following user flows through the running application, against the seeded development database. Each flow SHALL be covered by at least one spec that drives real user-visible affordances (by role, accessible name, label, or visible text) and asserts an observable outcome — rendered content, persisted state reflected on reload, or navigation — NOT mere execution. Removing or disabling coverage of any listed flow SHALL be a violation of this requirement.

The covered flows SHALL be:

1. **Sign-in surface** — the AuthPage sign-in UI renders its sign-in affordance.
2. **Sign-in via bypass** — with `AUTH_BYPASS=true`, a protected page renders for the seeded viewer without a sign-in step.
3. **Create list** — a list is created through the list-creation form.
4. **Add items** — items are attached to a list through the choose-items surface.
5. **Set visibility** — a list's visibility is changed through the visibility picker.
6. **Share** — the share affordance is reachable for a non-hidden list.
7. **Friend (authenticated non-owner) claims an item with spoiler hiding** — a follower of the owner claims an item and sees their own claim; the owner's default (no-spoiler) view of a claimed item hides the claim.
8. **Owner sees a claim** — the owner's spoiler-enabled view reveals a claim that the default view hides.
9. **Guest (logged-out) claims an item on a public list** — REQUIRED; see the dedicated requirement below.

#### Scenario: Sign-in surface renders without completing OAuth

- **WHEN** the suite navigates to the sign-in route with no active session
- **THEN** the AuthPage sign-in UI renders, including the "Sign in with Google" affordance
- **AND** the test asserts the affordance is present and does NOT complete a Google OAuth handshake

#### Scenario: Bypass session renders a protected page

- **WHEN** the suite navigates to a protected page with `AUTH_BYPASS=true`
- **THEN** the page renders for the seeded viewer ("Test Viewer") without any sign-in step

#### Scenario: Owner lifecycle arc is covered

- **WHEN** the suite runs the create-list → add-items → set-visibility → share arc as the seeded viewer
- **THEN** each step asserts its observable result: the new list is reachable, the chosen items attach to it, the visibility control reflects the selected state ("Shared"), and the share affordance is reachable on the now-non-hidden list

#### Scenario: Spoiler hiding diverges for owner default vs. owner-with-spoilers

- **WHEN** the owner views a list whose item carries a claim, first without and then with the spoiler reveal enabled
- **THEN** the default view shows the item with no claimer revealed
- **AND** the spoiler-enabled view reveals the claimer's first name on that item

#### Scenario: Dropping a flow fails the suite

- **WHEN** a future change removes or skips the spec covering any listed flow
- **THEN** the corresponding e2e coverage is absent and this requirement is violated

### Requirement: A logged-out guest SHALL be able to claim an item on a public list

The suite SHALL pin the guest-claim regression ([issue #88](https://github.com/JoshEddie/CTRLplusList/issues/88)). A caller with NO active session SHALL be able to open a public ("Shared", `visibility = 'public'`) list by URL, claim an item through the purchase modal's guest path (a guest-name entry followed by the guest-purchase confirmation), and observe the claim reflected on the item after reload. This flow SHALL run with the auth bypass DISABLED so the caller is genuinely unauthenticated; it SHALL NOT be satisfied by a mocked or bypassed session.

#### Scenario: Guest views a public list without signing in

- **WHEN** an unauthenticated caller navigates by URL to a list whose `visibility` is `'public'`
- **THEN** the list and its items render
- **AND** no sign-in is required to view it

#### Scenario: Guest claims an item via the guest path

- **WHEN** the unauthenticated caller opens the purchase modal on a claimable item, enters a guest name, and confirms the guest purchase
- **THEN** the claim succeeds (a purchase with no user and the entered guest name is recorded)
- **AND** on reload the item reflects the claim

#### Scenario: Guest-claim pin runs without a session

- **WHEN** the guest-claim spec executes
- **THEN** it runs against a server with the auth bypass disabled (no `dev-test-viewer` session is injected)
- **AND** a future regression that re-blocks unauthenticated claims on public lists fails this spec

### Requirement: Critical-flow specs SHALL run under the foundation harness in the session mode each flow requires

The critical-flow specs SHALL run under the e2e execution harness established by the `test-e2e-foundation` carve-out, which provides a bypass-ENABLED session mode (the authenticated seeded viewer) and a bypass-DISABLED session mode (a logged-out guest, and the real sign-in surface). Each spec SHALL be assigned to the mode its flow requires; this capability SHALL NOT redefine the harness mechanics (server configuration, DB target, CI) — those are the foundation's contract. Because the harness runs the modes as separate server processes whose caches do not cross-invalidate, each spec SHALL assert only state its own server produced or that the seed established, and SHALL NOT depend on a write made under one mode being observed under the other.

#### Scenario: Authenticated flows run under the bypass-enabled mode

- **WHEN** a spec covering create/add/visibility/share/friend-claim/owner-spoiler runs
- **THEN** it runs under the bypass-enabled mode and resolves to the seeded `dev-test-viewer` session

#### Scenario: Guest and sign-in-surface flows run under the bypass-disabled mode

- **WHEN** the guest-claim spec or the sign-in-surface assertion runs
- **THEN** it runs under the bypass-disabled mode with no injected session

#### Scenario: No spec depends on cross-process cache propagation

- **WHEN** a spec asserts that a write is observable
- **THEN** the write and the asserting read occur within the same server process (so in-process revalidation applies)
- **AND** no spec waits for a write made under the other mode to become visible

### Requirement: E2E tests SHALL NOT complete real external authentication or call rate-limited services

The suite SHALL NOT complete a real Google OAuth handshake, nor call any external service that imposes a quota, charges per call, or requires interactive credentials. The sanctioned stand-in for an authenticated session is the `AUTH_BYPASS` mechanism; the sign-in surface is asserted at the affordance level only.

#### Scenario: OAuth is never completed

- **WHEN** the sign-in surface is exercised
- **THEN** the test asserts the rendered sign-in affordance and stops short of invoking the OAuth provider
- **AND** no network call to a real Google endpoint occurs in CI or local runs
