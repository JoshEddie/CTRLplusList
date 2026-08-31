# Acceptance — onboarding-gate-inside-app-frame

## Flows

### Flow: A returning viewer on a shared device leaves the wrong account

- **Given** a browser signed in as an account holding a self-profile that carries no Altvatar art
- **And** a second account, holding a self-profile that carries Altvatar art, belongs to the person at the keyboard
- **When** the viewer requests `/lists`
- **Then** the gate renders and `/lists`'s own content does not
- **And** the frame's navigation bar renders above the gate
- **And** the gate's copy does not describe creating an account
- **And** the address is still `/lists`

### Flow: The viewer checks the account and signs out

- **Given** the gate is rendering for an account holding a self-profile that carries no Altvatar art
- **When** the viewer clicks the `User menu` control in the navigation bar
- **Then** the menu states the signed-in account's name and email address
- **And** the menu carries `Altvatars`, `Connections` and `Sign out`
- **And** the menu carries no switch rows and no profile count
- **When** the viewer clicks `Sign out`
- **Then** the session ends and the sign-in page renders, offering `Sign in with Google`
- **And** the stored active-profile selection is discarded

### Flow: The viewer signs in as their own account and reaches the app

- **Given** a signed-out browser at the sign-in page
- **And** the person at the keyboard holds an account whose self-profile carries Altvatar art
- **When** the viewer clicks `Sign in with Google` and completes it as that account
- **Then** the gate does not render
- **And** the requested page's own content renders

### Flow: A viewer signing up confirms the account before minting a profile

- **Given** a browser signed in as an account holding no membership at all
- **When** the viewer requests `/`
- **Then** the gate renders, addressing the viewer as completing sign-up
- **And** the navigation bar's avatar circle renders the initials of the name the account carries, with no accent ring
- **When** the viewer clicks the `User menu` control
- **Then** the menu states that account's name and email address
- **And** the menu carries no switch rows and no profile count
- **And** no profile has been created

### Flow: The gate still admits nobody to the application

- **Given** the gate is rendering for an account holding a self-profile that carries no Altvatar art
- **When** the viewer clicks the `Lists` navigation pill
- **Then** the address becomes `/lists` and the gate renders in place of that page
- **When** the viewer reloads
- **Then** the gate renders again
- **When** the viewer clicks the gate's backdrop and then presses Escape
- **Then** the gate stays
- **And** the gate carries no close control and no cancel control
- **And** the navigation bar is neither covered by the gate nor scrolled away

### Flow: Completing the gate reveals the page that was asked for

- **Given** the gate is rendering for an account holding a self-profile that carries no Altvatar art, requested at `/lists`
- **When** the viewer advances through the gate's beats, confirms a look in the customizer, and submits a valid name
- **Then** `/lists`'s own content renders
- **And** the address is still `/lists`
- **And** that account's self-profile carries the submitted name and the chosen art, with no second profile created
- **And** no redirect occurred at any point
