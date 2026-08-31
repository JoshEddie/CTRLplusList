## MODIFIED Requirements

### Requirement: The application frame SHALL render onboarding instead of the application

For an un-onboarded account, the layout wrapping the application SHALL render the onboarding step **in place of** the page that was requested, and SHALL render it inside the application frame rather than in place of it. No page component SHALL run and no page data SHALL be fetched. The frame's own reading of who the viewer is is not page work and SHALL be permitted; nothing else about the account may be read.

The gate SHALL cover every route the frame wraps, with no exemption list — including routes that render content the requester does not own. An un-onboarded account can claim nothing, follow nothing and bookmark nothing, so every affordance on such a page is inert regardless.

The frame's own destinations SHALL remain present and SHALL remain inert: following one changes the address and the gate renders again in place of that page too. They are not suppressed — a control that quietly does nothing is a smaller surprise than a frame that is missing the controls the viewer expects.

The gate SHALL NOT be a route: it has no URL of its own, it issues no redirect, and it records no return destination. Because the requested URL is untouched, completing the gate SHALL reveal the page that was originally requested.

An unauthenticated request SHALL be unaffected — it takes the path it takes today.

#### Scenario: A requested page does not render

- **WHEN** an un-onboarded account requests any page inside the application frame
- **THEN** the onboarding step renders and the requested page's content does not

#### Scenario: The frame renders around the gate

- **WHEN** an un-onboarded account requests any page inside the application frame
- **THEN** the frame's navigation bar renders above the gate

#### Scenario: No page work is performed

- **WHEN** an un-onboarded account requests a page that would otherwise read data
- **THEN** no read for that page is issued

#### Scenario: A frame destination leads back to the gate

- **WHEN** an un-onboarded account follows one of the frame's navigation destinations
- **THEN** the address becomes that destination and the gate renders in place of its page

#### Scenario: A shared list link is gated like every other page

- **WHEN** an un-onboarded account opens a link to a list owned by someone else
- **THEN** the onboarding step renders in place of the list

#### Scenario: The address is untouched and the destination survives

- **WHEN** an un-onboarded account requests a page, the gate renders, and the account completes it
- **THEN** no redirect occurred at any point
- **AND** the page originally requested is what renders

#### Scenario: A signed-out visitor is unaffected

- **WHEN** an unauthenticated request reaches any page
- **THEN** the gate does not render and the request behaves as it does for an account that has onboarded

### Requirement: The gate SHALL offer no way out but submit

The gate SHALL offer no way *into the application* but a successful submit. It SHALL render with no close control and no cancel control, SHALL NOT dismiss when its backdrop is activated, and SHALL NOT dismiss on Escape.

Ending the session is not an exit the gate withholds. Signing out reaches no page the gate stands in front of — it discards the session and lands on the sign-in page — so it SHALL remain available, and the gate SHALL NOT be the reason an account cannot leave.

It SHALL occupy the whole viewport below the frame's navigation bar, for both populations alike, so arriving at it reads as a continuation of signing in rather than as a dialog over the app. Nothing SHALL be visible behind it: the gate is not an overlay over content, because the page it stands in place of was never rendered.

Focus SHALL move into the gate when it renders, and onto each step's primary control as the steps change — never into the name field, which is usually already right and whose focus raises a phone keyboard over the controls that matter.

#### Scenario: No close or cancel control renders

- **WHEN** the gate renders
- **THEN** it carries no close control and no cancel control

#### Scenario: The backdrop does not dismiss

- **WHEN** the gate's backdrop is activated
- **THEN** the gate stays

#### Scenario: Escape does not dismiss

- **WHEN** Escape is pressed while the gate is showing
- **THEN** the gate stays

#### Scenario: Reloading does not escape the gate

- **WHEN** an un-onboarded account reloads the page
- **THEN** the gate renders again

#### Scenario: The gate does not cover the navigation bar

- **WHEN** the gate renders
- **THEN** it fills the viewport below the frame's navigation bar, and the bar is neither covered nor scrolled away

## ADDED Requirements

### Requirement: The gate SHALL state which account it is attached to, and SHALL let that account leave

An account meeting the gate SHALL be able to learn which account it is signed in as, and to sign out, without first completing the gate. Both SHALL be reachable through the frame's account menu, which SHALL name the signed-in account and SHALL carry the same sign-out the rest of the app carries.

This is what the gate owes a viewer it is about to attach a profile to. On a shared device the account that signed in last is not reliably the one at the keyboard, and the gate's pre-filled name is drawn from whoever that was — so an account that cannot check has no way to notice, and an account that cannot leave must mint a profile on the wrong account to reach the control that would have corrected it.

The gate SHALL NOT offer profile switching. It needs no rule enforcing this: an account that has not passed the gate holds at most one profile, and a viewer running one profile is already offered no switch rows.

#### Scenario: The account menu names the signed-in account

- **WHEN** an un-onboarded account opens the frame's account menu
- **THEN** the menu states the signed-in account's name and email address

#### Scenario: Signing out at the gate ends the session

- **WHEN** an un-onboarded account signs out from the frame's account menu
- **THEN** the session ends and the sign-in page renders

#### Scenario: Signing in as another account reaches that account's own state

- **WHEN** an account signs out at the gate and signs in as an account that has already onboarded
- **THEN** the gate does not render and the application renders as it does for that account

#### Scenario: The gate offers no profile switching

- **WHEN** an un-onboarded account opens the frame's account menu
- **THEN** it carries no switch rows and no profile count
