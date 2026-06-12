## ADDED Requirements

### Requirement: DAL item reads SHALL sanitize purchase attribution by viewer role

The `lib/dal.ts` item reads (`getItemsByListId`, `getItemsByUser`, `getItemsByPurchased`) SHALL project each item's `purchases` through a role-aware sanitizer before any row escapes the DAL boundary, so that claim attribution never leaks beyond what the viewer is entitled to see. The sanitized projection SHALL expose, per purchase, only a stable `id`, a `by` tag (`'self'` or `'other'`), and a `firstName` — never a full name, email address, user id, or raw guest identity.

The projection SHALL obey these rules, keyed on whether the viewer owns the items and whether spoilers are explicitly enabled:

- **Owner without spoilers** — when the viewer owns the items and spoilers are NOT enabled, the read SHALL return an **empty** purchases array for every item, regardless of how many claims exist. An owner SHALL NOT be able to infer that, or by whom, their own items were claimed. (Owners cannot claim their own items, so every claim is gift-surprise information.)
- **Owner with spoilers** — when the viewer owns the items and spoilers ARE explicitly enabled, each claim SHALL be exposed as `{ by: 'other', firstName }` (the owner is never the claimer of their own items).
- **Non-owner viewer** — each claim SHALL be exposed as `{ by, firstName }` where `by` is `'self'` only when an authenticated `viewerId` matches the claim's `user_id`, and `'other'` otherwise.

`firstName` SHALL be derived as the first whitespace-delimited token of the claimer's stored name (falling back to the guest name), and SHALL be the literal `'Someone'` when that name is null, empty, or whitespace-only. The per-item `hasPurchases` flag (where exposed) SHALL reflect whether any claim exists **before** sanitization, so an owner-without-spoilers view can still indicate "claimed" without revealing the claimer.

#### Scenario: Owner without spoilers sees no claim attribution

- **WHEN** an item owner reads their own items (`getItemsByUser` / `getItemsByListId` with `isOwner` true) and spoilers are not enabled
- **THEN** every item's sanitized `purchases` array is empty
- **AND** no claimer first name, full name, email, or user id is present in the result
- **AND** `hasPurchases` (where exposed) still reflects that a claim exists

#### Scenario: Owner with spoilers sees first names tagged other

- **WHEN** an item owner reads their own items with spoilers explicitly enabled
- **THEN** each claim is exposed as `{ by: 'other', firstName }`
- **AND** `firstName` is the first token of the claimer's stored name, or `'Someone'` when that name is null/empty/whitespace-only

#### Scenario: Non-owner viewer sees self versus other first names only

- **WHEN** an authenticated non-owner reads items (`getItemsByListId` with a `viewerId`, or `getItemsByPurchased`)
- **THEN** a claim whose `user_id` equals the `viewerId` is tagged `{ by: 'self' }` and every other claim `{ by: 'other' }`
- **AND** only `firstName` is exposed for each claim — never a full name, email, user id, or raw guest identity
