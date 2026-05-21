## ADDED Requirements

### Requirement: Lists SHALL support an optional subtitle field

The `lists` table SHALL include a nullable `subtitle` text column. The field SHALL be editable through the list create and update forms. When persisted, the subtitle SHALL render alongside the list name on the home rail card and on any list-card view of the list. When `subtitle IS NULL`, no subtitle slot SHALL be rendered.

#### Scenario: Subtitle persists through create

- **WHEN** an authenticated user creates a list with name "Christmas List 2025" and subtitle "Brandy Family"
- **THEN** the row's `subtitle` column stores "Brandy Family" and subsequent reads return it

#### Scenario: Subtitle persists through update

- **WHEN** the owner edits a list to set `subtitle = "Josh Family"`
- **THEN** the row's `subtitle` column is updated and subsequent reads return the new value

#### Scenario: Empty subtitle stores NULL

- **WHEN** the owner submits a list edit form with the subtitle field blank
- **THEN** the row's `subtitle` column is set to NULL (not an empty string)

#### Scenario: Subtitle renders on list cards

- **WHEN** a list with `subtitle = "Brandy Family"` is rendered as a card on the home digest or My Lists page
- **THEN** the card shows the subtitle text below the list name and above the meta row

#### Scenario: Null subtitle renders no slot

- **WHEN** a list with `subtitle = NULL` is rendered as a card
- **THEN** no subtitle line is rendered (the meta row sits directly below the name)

### Requirement: Existing lists SHALL NOT be backfilled with derived subtitles

The migration that adds `lists.subtitle` SHALL leave the column NULL for every existing row. The system SHALL NOT auto-parse or derive subtitle values from existing list names or owner relationships.

#### Scenario: Migration leaves existing rows unchanged

- **WHEN** the `subtitle` migration runs over a database with existing list rows
- **THEN** every existing row has `subtitle = NULL` after the migration, regardless of name contents

#### Scenario: Existing lists render identically until edited

- **WHEN** an existing list (created before this change) is viewed without being edited
- **THEN** the card renders with name only (no subtitle slot)
