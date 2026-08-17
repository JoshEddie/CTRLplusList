## MODIFIED Requirements

### Requirement: ListCard SHALL render the bookmark indicator and owner byline conditionally

The `ListCard` component SHALL render the bookmark indicator `<FaBookmark class="list-card-bookmark-indicator" aria-label="Bookmarked">` inside `.list-card-name` ONLY when its `bookmarked` prop is true; when `bookmarked` is false (the default), no element with the accessible name `"Bookmarked"` SHALL render. The owner byline `<div class="list-card-byline">` (containing an `aria-hidden` `<FaUser>` icon followed by the owner name) SHALL render ONLY when `showOwner` is true AND the list's **owning profile** resolves to a non-empty name. The name displayed is the owning profile's name, not the name of any account behind it — a managed profile has no account and still has a name. When `showOwner` is false (the default), or when the owning profile is absent, or when its name is null, no byline SHALL render. Because the `<FaUser>` icon is `aria-hidden`, the byline's accessible content SHALL be the owner name text alone.

#### Scenario: Bookmarked card shows the labeled indicator

- **WHEN** `ListCard` renders with `bookmarked` true
- **THEN** an element with `aria-label="Bookmarked"` (the `.list-card-bookmark-indicator`) renders inside `.list-card-name`

#### Scenario: Unbookmarked card shows no indicator

- **WHEN** `ListCard` renders with `bookmarked` false or omitted
- **THEN** no element with the accessible name `"Bookmarked"` renders

#### Scenario: Owner byline renders only when showOwner and a name are both present

- **WHEN** `ListCard` renders with `showOwner` true and the list's owning profile named `"Alice"`
- **THEN** `<div class="list-card-byline">` renders containing the text `Alice`

#### Scenario: Byline names the owning profile

- **WHEN** `ListCard` renders with `showOwner` true for a list whose owning profile's name differs from the name of the account behind it
- **THEN** the byline renders the owning profile's name

#### Scenario: No byline when showOwner is false

- **WHEN** `ListCard` renders with `showOwner` false (or omitted) even though the owning profile is named `"Alice"`
- **THEN** no `.list-card-byline` element renders

#### Scenario: No byline when the owner name is missing

- **WHEN** `ListCard` renders with `showOwner` true but the list's owning profile is absent (or its name is null)
- **THEN** no `.list-card-byline` element renders
