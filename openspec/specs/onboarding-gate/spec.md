# onboarding-gate Specification

## Purpose
The blocking one-time step every account passes through exactly once before it can use the app: it collects the name and look a profile cannot exist without, and it is where the self-profile is minted — so an account that has not passed it owns nothing and can own nothing.

## Requirements

### Requirement: An account SHALL be un-onboarded until its self-profile holds Altvatar art

An account SHALL be treated as un-onboarded when either of two conditions holds: it has no self-profile, or its self-profile holds no Altvatar art. Both are read from rows that already exist for other reasons; no column records onboarding, and no timestamp is written when it completes.

The two conditions are the two populations. An account created after this capability lands has no self-profile at all, because self-profile creation happens at this gate's submit. An account that predates it holds a self-profile the migration backfilled, and no art, because art has never been created automatically.

An account whose self-profile holds art SHALL be onboarded, permanently and without further check — there is no state that can un-onboard it.

#### Scenario: An account with no self-profile is un-onboarded

- **WHEN** an authenticated account holds no `self` membership
- **THEN** it is un-onboarded

#### Scenario: A backfilled account with no art is un-onboarded

- **WHEN** an authenticated account holds a self-profile carrying no Altvatar art
- **THEN** it is un-onboarded

#### Scenario: An account whose self-profile has art is onboarded

- **WHEN** an authenticated account holds a self-profile carrying Altvatar art
- **THEN** it is onboarded, and the gate does not render

#### Scenario: A managed profile's missing art means nothing

- **WHEN** an account whose self-profile holds art also runs a managed profile holding none
- **THEN** it is still onboarded

### Requirement: The application frame SHALL render onboarding instead of the application

For an un-onboarded account, the layout wrapping the application SHALL render the onboarding step **in place of** the page that was requested. No page component SHALL run, no page data SHALL be fetched, and no actor SHALL be resolved.

The gate SHALL cover every route the frame wraps, with no exemption list — including routes that render content the requester does not own. An un-onboarded account can claim nothing, follow nothing and bookmark nothing, so every affordance on such a page is inert regardless.

The gate SHALL NOT be a route: it has no URL of its own, it issues no redirect, and it records no return destination. Because the requested URL is untouched, completing the gate SHALL reveal the page that was originally requested.

An unauthenticated request SHALL be unaffected — it takes the path it takes today.

#### Scenario: A requested page does not render

- **WHEN** an un-onboarded account requests any page inside the application frame
- **THEN** the onboarding step renders and the requested page's content does not

#### Scenario: No page work is performed

- **WHEN** an un-onboarded account requests a page that would otherwise read data
- **THEN** no read for that page is issued

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

The gate SHALL render with no close control and no cancel control, SHALL NOT dismiss when its backdrop is activated, and SHALL NOT dismiss on Escape. Its only exit is a successful submit.

It SHALL render on the same full-screen treatment the sign-in page uses, for both populations alike, so arriving at it reads as a continuation of signing in.

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

### Requirement: The gate SHALL introduce Altvatars before it asks for anything

The gate SHALL open on an introduction rather than a form: a short sequence of steps presenting what an Altvatar is, through which the viewer moves forward and back at will. The last introductory step SHALL offer opening the customizer as the only way forward, and the confirmation step — the one carrying the gate's inputs and its submit — SHALL be reachable only by confirming a look in the customizer.

The number of steps and their content are not fixed here; that the inputs come after the introduction, and after a confirmed look, is.

#### Scenario: The gate opens on an introduction

- **WHEN** the gate renders
- **THEN** an introductory step renders, and neither the name input nor the submit does

#### Scenario: Steps retreat as well as advance

- **WHEN** the viewer advances a step and then goes back
- **THEN** the prior step renders again

#### Scenario: The introduction ends at the customizer

- **WHEN** the viewer has advanced through every introductory step without confirming a look
- **THEN** no submit is offered and opening the customizer is the only way forward

#### Scenario: Confirming a look reveals the confirmation step

- **WHEN** the viewer confirms a look in the customizer
- **THEN** the confirmation step renders, carrying the inputs and the submit

### Requirement: The gate SHALL collect a name and a confirmed look, and nothing else

The gate SHALL carry exactly two inputs: a name, and an Altvatar chosen through the customizer `altvatar` owns.

The name SHALL be pre-filled from whatever name the account already carries where it carries one, and SHALL be subject to the same bounds a profile name is subject to everywhere else.

The look SHALL NOT be accepted unseen. A rolled suggestion seeds the customizer, but nothing is submitted that the viewer has not confirmed there — confirming the suggestion untouched is sufficient, and is the shortest path through.

No other setting SHALL appear. Nothing collected here is final, and the gate SHALL say so — the name and the look stay changeable afterwards.

#### Scenario: The name arrives pre-filled

- **WHEN** the gate's confirmation step renders for an account carrying a name
- **THEN** the name input holds that name

#### Scenario: A nameless account gets an empty name input

- **WHEN** the gate's confirmation step renders for an account carrying no name
- **THEN** the name input is empty and submitting requires one to be typed

#### Scenario: The customizer's suggestion, confirmed untouched, is a valid answer

- **WHEN** the viewer opens the customizer and confirms it without changing anything
- **THEN** submitting succeeds and the suggested look is what is stored

#### Scenario: A blank name is rejected without a write

- **WHEN** the viewer submits with an empty or whitespace-only name
- **THEN** validation fails with a field error on name and nothing is written

#### Scenario: No other setting is offered

- **WHEN** the gate renders
- **THEN** its only inputs are the name and the look

### Requirement: The gate's copy SHALL differ by population

The gate serves someone who has just created an account and someone who has been using the app for months, and its copy SHALL acknowledge which. It SHALL remain one story with one layout: only its wording differs.

Copy for an account with no self-profile SHALL read as finishing signing up, and SHALL read as a standing part of signing up rather than as news — that arm greets every future signup, long after the feature stops being new. Copy for an account that already has one SHALL NOT read as signing up: that person is being introduced to a new feature and asked to confirm a name they already have.

The exact wording is not fixed here.

#### Scenario: A new account is addressed as signing up

- **WHEN** the gate renders for an account with no self-profile
- **THEN** its copy addresses completing sign-up

#### Scenario: An existing account is not addressed as signing up

- **WHEN** the gate renders for an account that already holds a self-profile
- **THEN** its copy does not describe creating an account

#### Scenario: One layout serves both

- **WHEN** the gate renders for either population
- **THEN** the same steps, inputs and arrangement are presented

### Requirement: Submit SHALL mint whatever the account lacks, and the gate SHALL stand until it is complete

Submitting SHALL bring the account to the onboarded state: a self-profile carrying the submitted name, its `self` membership, the Altvatar art, and the chosen accent. Where a self-profile already exists, its name SHALL be updated rather than a second one created.

The profile and its membership SHALL be written atomically, as `profiles-data-model` requires of every self-profile creation. The art and the accent SHALL be written after, as separate writes, because no interactive transaction is available.

A submission that writes the profile but not the art SHALL leave the account un-onboarded — the gate stands, and re-submitting SHALL succeed rather than fail on the profile that already exists. This is the recovery mechanism, not a defect: the same condition that raises the gate is the one a partial write leaves behind.

Every cached read holding a table the submit wrote SHALL be invalidated, so the gate does not stand after a submission that succeeded.

#### Scenario: A new account is fully minted

- **WHEN** an account with no self-profile submits a valid name
- **THEN** a self-profile carrying that name exists with a `self` membership, holding Altvatar art and the chosen accent
- **AND** the account is onboarded

#### Scenario: An existing account is renamed rather than duplicated

- **WHEN** an account that already holds a self-profile submits a name
- **THEN** that profile's name is updated, no second profile is created, and it gains Altvatar art

#### Scenario: A partial submission leaves the gate standing

- **WHEN** a submission writes the self-profile and its membership but not the art
- **THEN** the account is still un-onboarded and the gate renders on the next request

#### Scenario: Re-submitting after a partial write succeeds

- **WHEN** an account whose previous submission wrote only the profile submits again
- **THEN** the submission succeeds, no duplicate profile is created, and the account becomes onboarded

#### Scenario: A successful submission clears the gate without a reload

- **WHEN** a submission succeeds
- **THEN** the next read no longer finds the account un-onboarded

### Requirement: Abandoning the gate SHALL leave nothing to clean up

Closing the browser at the gate SHALL have no consequence beyond leaving the account as it was. An account that has never completed the gate persists un-onboarded indefinitely and meets the gate again on its next request. Such an account owns nothing: content hangs off profiles, and profiles are reachable only through membership.

No sweep, expiry, or background collection SHALL be introduced for accounts abandoned at the gate.

#### Scenario: Abandonment leaves the account un-onboarded

- **WHEN** an account reaches the gate and the browser is closed without submitting
- **THEN** the account still exists, still holds no self-profile, and meets the gate on its next request
