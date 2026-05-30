## ADDED Requirements

### Requirement: `setListVisibility` SHALL fail-closed re-validate the visibility argument before any DB access

`setListVisibility(id, visibility)` SHALL validate `visibility` against the canonical `VISIBILITY_VALUES` enum (via `VisibilitySchema.safeParse`) and, on a value outside that enum, SHALL return `{ success: false, error: 'Validation' }` **before** reading the target list and **before** issuing any UPDATE. The re-validation SHALL occur even though the function's TypeScript parameter is typed `ListVisibility`, because as a `'use server'` action the argument crosses the network boundary from an untrusted client where the static type is erased. A rejected value SHALL leave the target row's `visibility`, `shared`, and `shared_at` columns entirely unchanged, and SHALL NOT trigger `updateTag('lists')`.

#### Scenario: Out-of-enum value is rejected before any write

- **WHEN** an authenticated owner calls `setListVisibility(id, v)` where `v` is not one of `'private' | 'unlisted' | 'public'` (e.g. `'owner'`, `'admin'`, or `''`)
- **THEN** the action returns `{ success: false, error: 'Validation' }`
- **AND** the target list's `visibility`, `shared`, and `shared_at` are identical to their pre-call values
- **AND** `updateTag('lists')` is not called

#### Scenario: Validation precedes the ownership/existence lookup

- **WHEN** `setListVisibility` is called with an out-of-enum `visibility` value, regardless of whether `id` refers to a real list or whether the caller owns it
- **THEN** the action returns the `'Validation'` error without the outcome depending on the list's existence or ownership (validation fails closed first)
