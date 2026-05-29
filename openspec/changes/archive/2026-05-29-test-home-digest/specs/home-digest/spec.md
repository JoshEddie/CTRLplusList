## ADDED Requirements

### Requirement: The bookmark-migration toast SHALL suppress its pre-hydration flash

The one-time bookmark-migration toast (`BookmarkMigrationToast`) reads its dismissed state from `localStorage` via `useSyncExternalStore`. Because `localStorage` is unavailable during server render, the hook's server/initial snapshot SHALL report the toast as **dismissed** (hidden), so the toast does NOT render in the server-generated HTML and SHALL appear only after client hydration reads the real `localStorage` value. This prevents a flash-of-toast on every cold page load (server renders the toast → hydration reads a `dismissed` flag → toast disappears), which would otherwise occur if the un-hydrated state defaulted to *visible*. The dismissed flag is the `localStorage` key `home.bookmark-migration-toast.dismissed`; a value of `'true'` means dismissed. A `localStorage` read that throws (e.g. access denied) SHALL be treated as *not dismissed* on the client, and a write that throws on dismissal SHALL be swallowed without surfacing an error.

#### Scenario: Server/pre-hydration render hides the toast

- **WHEN** the home page is server-rendered (or the component renders before client hydration completes)
- **THEN** the toast does NOT appear in the rendered output (the un-hydrated snapshot reports dismissed)
- **AND** no flash-of-toast occurs on cold load before hydration resolves the real `localStorage` value

#### Scenario: Hydrated client with no flag shows the toast

- **WHEN** the client has hydrated and `localStorage['home.bookmark-migration-toast.dismissed']` is absent or not `'true'`
- **THEN** the toast renders (a `role="status"` element with the rename copy and a dismiss button)

#### Scenario: Hydrated client with the flag set keeps the toast hidden

- **WHEN** the client has hydrated and `localStorage['home.bookmark-migration-toast.dismissed']` is `'true'`
- **THEN** the toast does NOT render

#### Scenario: Dismissal persists and hides the toast

- **WHEN** the user clicks the toast's dismiss button
- **THEN** `localStorage['home.bookmark-migration-toast.dismissed']` is set to `'true'`
- **AND** the toast unmounts

#### Scenario: localStorage access failure is tolerated

- **WHEN** reading `localStorage` throws (access denied / disabled)
- **THEN** the client treats the toast as not dismissed (the read falls back without throwing)
- **AND WHEN** writing the dismissed flag throws
- **THEN** the dismissal handler swallows the error without surfacing it to the user
