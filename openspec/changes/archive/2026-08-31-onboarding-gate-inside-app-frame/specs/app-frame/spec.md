## ADDED Requirements

### Requirement: Where no active profile resolves, the nav avatar SHALL fall back to the account's name

The avatar circle states the active profile. One authenticated case resolves none: an account that has not passed `onboarding-gate` and holds no membership at all, for which there is no self-profile to fall back to. For that case only, the circle SHALL render the initials of the name the account carries, with no accent ring, and SHALL render nothing where the account carries no name.

This is not the account image `altvatar` forbids and is not a third link in its resolution chain, which begins at a profile: it is what the frame shows when there is no profile yet. It SHALL apply only while no active profile resolves — the moment one does, the avatar requirement governs unchanged.

#### Scenario: A membership-less account gets its own initials

- **WHEN** an authenticated account holding no membership loads any `(main)/` page
- **THEN** the avatar circle renders the initials of the name the account carries, with no accent ring

#### Scenario: A nameless membership-less account gets an empty circle

- **WHEN** an authenticated account holding no membership and carrying no name loads any `(main)/` page
- **THEN** the avatar circle renders no initials

#### Scenario: A resolved profile is unaffected by the fallback

- **WHEN** an account holding a self-profile that carries no Altvatar art loads any `(main)/` page
- **THEN** the avatar circle renders that profile's initials and its accent, not the account's name
