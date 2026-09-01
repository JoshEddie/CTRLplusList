## MODIFIED Requirements

### Requirement: DAL item reads SHALL sanitize purchase attribution by viewer role

The item reads (`getItemsByListId` and `getItemsByProfile` in `lib/data/item.ts`; `getItemsByPurchased` in `lib/data/purchase.ts`) SHALL project each item's `purchases` through a state-aware sanitizer (`sanitizePurchases`, exported from `lib/data/purchase.ts`) before any row escapes the data-layer boundary, so that claim attribution never leaks beyond what the viewer is entitled to see. The sanitized projection SHALL expose, per purchase, only a stable `id`, a `by` tag (`'self'` or `'other'`), and a `firstName` — never a full name, email address, account or profile id, or raw guest identity.

**The projection SHALL run outside the cache boundary.** Each exported read whose spoiler tier is resolved per viewer (`getItemsByListId`, `getItemsByProfile`) SHALL be an uncached function wrapping a cached read that returns unprojected rows, and SHALL apply the sanitizer to that result before returning. The boundary the projection must precede is the *data-layer* boundary, not the cached function: unprojected rows SHALL NOT leave `lib/data/`. Sanitizing inside the cached read is forbidden, because the resolved spoiler tier is database-backed and would key the cache on an input that goes stale without the read's own tags firing. A consequence to be accepted knowingly: the cache holds unprojected rows, carrying names and ids that no single viewer is entitled to.

The sanitizer's inputs SHALL be the viewer's self-profile and a **resolved spoiler tier** (owned by `spoiler-visibility`); ownership SHALL NOT be an input. The projection SHALL obey these rules, keyed on the tier:

- **Tier `surprise` or `progress`** — the read SHALL return, for every item, only those claims the viewer holds as purchaser or recorder. No other party's claim SHALL appear, and an item claimed only by others SHALL be indistinguishable in the projection from an unclaimed one. Both tiers conceal per-item claim state; `progress` adds only the list-level claimed count, which comes from the separate aggregate read below and never from this per-item projection.
- **Tier `claims`** — every other party's claim SHALL be reduced to a bare count and the item's remaining capacity; no `firstName` SHALL be exposed for them. Claims the viewer holds SHALL be exposed in full.
- **Tier `identity`** — each claim SHALL be exposed as `{ by, firstName }` where `by` is `'self'` only when the viewer's profile matches the claim's **purchaser** profile, and `'other'` otherwise. The match is a profile-id comparison; matching a purchaser profile against an account id would be silently always false, marking every viewer's own claim as someone else's. A claim whose asserter differs from its purchaser SHALL additionally expose the recorder's first name. The purchaser-keyed choice of column (rather than the asserter) is owned by `claim-attribution`.

A viewer holding no membership on the owning profile resolves to tier `identity` per `spoiler-visibility`, which is the projection a non-owner receives today. `getItemsByPurchased` SHALL always project at `identity`: every row it returns is one the viewer is the purchaser of, so there is no surprise to protect, and resolving a baseline there would mean fanning out membership across every owning profile the results touch. Its projection is therefore keyed on a constant rather than on a resolved tier, and it SHALL keep its current shape — cached, sanitizing inside the cached read. The rule above exists because a database-backed input would key the cache on a value that goes stale without the read's tags firing; a constant cannot go stale, so splitting this read would buy nothing and cost a second function.

`firstName` SHALL be derived as the first whitespace-delimited token of the purchaser profile's stored name (falling back to the guest name), and SHALL be the literal `'Someone'` when that name is null, empty, or whitespace-only. The per-item `hasPurchases` flag SHALL be set by every item read — in the uncached wrapper for the reads that have one, and alongside the projection in `getItemsByPurchased`. It SHALL reflect only what the resolved tier discloses on that item: at `surprise` and `progress` it SHALL be false for an item carrying no claim the viewer holds, and from `claims` upward it SHALL reflect whether any claim exists. There is no claim-state filter to serve a pre-sanitization truth (`items-browser-chrome` removed it), so a `hasPurchases` that revealed a concealed claim would be a passive leak with no operated consumer to justify it.

The list-level aggregate the `progress` tier discloses — the count of claimed items — SHALL be derived from unprojected rows, since at `surprise` and `progress` the projected set no longer carries the claims it counts. It SHALL NOT be derived in an item read's wrapper: the hero that discloses it and the items section that performs that read are sibling server components with no shared fetching parent, so a value derived there cannot reach the surface that needs it. It SHALL come instead from a separate list-scoped read over unprojected rows. That read is viewer-independent — it counts claims rather than projecting them — so it MAY stay cached, under the same tags as the item read, and the rule placing a viewer-scoped projection outside the cache does not reach it. It SHALL be performed only where the viewer's resolved tier is `progress` or above, so the fully protected default (`surprise`) costs no query. There is no shopper-names aggregate: that disclosure is dropped.

#### Scenario: Owner without spoilers sees no claim attribution

- **WHEN** an account whose membership resolves to tier `surprise` reads items owned by that profile (`getItemsByProfile` / `getItemsByListId`)
- **THEN** every item's sanitized `purchases` array contains only claims that viewer holds
- **AND** no other party's first name, full name, email, account id, or profile id is present in the result
- **AND** `hasPurchases` is false for an item carrying only other parties' claims

#### Scenario: Owner with spoilers sees first names tagged other

- **WHEN** an account whose resolved tier is `identity` reads items owned by the profile it is a member of
- **THEN** each claim is exposed as `{ by, firstName }`
- **AND** `firstName` is the first token of the purchaser profile's stored name, or `'Someone'` when that name is null/empty/whitespace-only

#### Scenario: Non-owner viewer sees self versus other first names only

- **WHEN** an authenticated viewer holding no membership on the owning profile reads items (`getItemsByListId` with a viewer, or `getItemsByPurchased`)
- **THEN** a claim whose purchaser equals the viewer's profile is tagged `{ by: 'self' }` and every other claim `{ by: 'other' }`
- **AND** only `firstName` is exposed for each claim — never a full name, email, account id, profile id, or raw guest identity

#### Scenario: Claims tier exposes a count without names

- **WHEN** a viewer whose resolved tier is `claims` reads an item carrying two claims by other parties
- **THEN** the projection reports that the item carries claims and what capacity remains
- **AND** no `firstName` is present for either claim

#### Scenario: The cached read returns unprojected rows

- **WHEN** the same list is read by two viewers whose resolved tiers differ
- **THEN** the cached read is entered once for that list and its result carries unprojected rows
- **AND** each viewer's returned rows are projected separately, outside the cache

#### Scenario: The count survives while per-item stays concealed

- **WHEN** a viewer whose resolved tier is `progress` reads a list where four of twelve items carry claims
- **THEN** the aggregate read reports four claimed items
- **AND** no item in that viewer's projected item set discloses that it is one of them

#### Scenario: Surprise costs no aggregate query

- **WHEN** a viewer whose resolved tier is `surprise` opens a list
- **THEN** the aggregate read is not performed
