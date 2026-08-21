## Why

Issue: https://github.com/JoshEddie/CTRLplusList/issues/192 — part of MAP #181.

Profiles shipped as a schema with no surface. Phases 1–3 (#189/#190/#191) made profiles first-class list-owning identities and repointed every content FK onto them, but the only profile any account holds is the self-profile NextAuth mints at sign-in. Nothing in the app creates a managed profile, and nothing shows a user the profiles they run. This chunk gives profiles their front door: a page listing you plus the profiles you own or manage, a space to edit one, and a birth form that creates one.

Design worked against the Claude Design *Profiles Flow Prototype* mockup, which spans #192–#199; only this chunk's parts are taken. The mockup revised four of #183's settled decisions and introduced two net-new features — recorded on [#183](https://github.com/JoshEddie/CTRLplusList/issues/183#issuecomment-5349965765) and re-synced onto MAP #181.

Inherited constraints found in active specs:

- `profiles-data-model` — a managed profile is one with **no** `self` membership; `role` is exactly one of `self`/`owner`/`manager`, database-enforced; the `profiles` table holds no reference to the accounts table, so creation rests idempotency on constraints rather than a re-derivable id. Cross-row creation must be atomic without an interactive transaction. The preferences catalog and its per-profile values table **ship empty**, and "features that introduce a preference own its catalog row" — this change writes the first one.
- `menu-system` — a requirement enumerates the avatar popover's children (header + `<MenuLinkItem>` Connections + `<MenuItem>` Sign out). Adding an entry edits that enumeration.
- `data-layer-organization` — `lib/data/` is the single home for data access; every export of a `'use server'` file mints a client-callable endpoint, so non-endpoint helpers stay out of `*.actions.ts`. `createProfile` is an endpoint by design, so it belongs there plainly.
- `list-metadata` — `lists.subtitle` is the contract the profile tagline mirrors: nullable text column, empty→NULL normalization, a character cap, and a render contract distinguishing absent from blank.
- `form-shell-system`, `form-field-system`, `button-system` — the birth form and the Settings form route through existing primitives; no new variant or size is proposed. `FormShell` already supports state-dismissal (`onClose`) as well as route-dismissal (`closeHref`).

## What Changes

- **New Profiles page** (`/profiles`) — cards for you plus every profile you own or manage. Membership containment is the query: `profiles` carries no account reference, so `profile_members` is the sole handle. A card carries the mockup's shape: an avatar slot overlapping its accent band, name, your role, tagline, counts, and the accent itself. Your own card is marked **active** — exactly one profile is active at all times and it is yours until #193 makes it switchable. The card is **inert on click** (the `ItemCard` precedent, not `UserCard`'s whole-card link), because card-click is the mockup's *switch* affordance and switching is #193; management is the mockup's `⋯` menu on the band, carrying an `Edit <name>` row today and gaining rows at #194/#198. A lede above the grid states what selecting a profile does. **No empty state** — your own card is always present, so a zero-profiles state is structurally impossible.
- **New profile space** (`/profiles/[id]`) — identity header plus a Settings form (name, tagline, accent), for self and managed profiles alike. **No tab chrome**: #194 adds the sub-nav when Permissions gives it a second destination. Without this, a typo'd name is unfixable until #194 and accent and tagline are frozen at birth.
- **New managed-profile birth form** — name (required), tagline, accent (required — one preset preselected at random). A client-state overlay on the Profiles page: one call site, nothing to intercept, `app/(main)/@modal` stays dormant. Creates the profile row and its creator's `owner` membership atomically, plus the accent preference row.
- **New profile accent** — stored in `profile_preferences` as a preset **name**, with the palette owning what each name renders as: two gradient stops that travel hue, plus the ink rendered on it. A name rather than a colour or a hue, so re-branding is a palette edit that rewrites no stored row. They ship grouped by what they read as, and adding one is three colours in a table. The birth form preselects one at random and the accent is required, so every profile created here carries a stored accent — random rather than fixed, because a fixed default would land every unedited profile on one colour and the feature would collapse into it. A profile carrying no preference row, or one naming a preset the palette no longer carries, renders the `--hero-gradient` fallback, so no backfill is needed. This change owns the catalog row.
- **New profile tagline** — nullable `profiles` column, empty→NULL, 40-character cap, mirroring `lists.subtitle`. A column rather than a preference row: a preference value is generic text with nowhere to hang a constraint.
- **New `createProfile` server action** in `lib/data/profile.actions.ts`, paying the `data-layer-organization` debt #189 deferred to this chunk. Plain arguments, the imported `db`, `authedUserId` for the actor — the shape `followUser`/`blockUser` already have, tested by the pglite seam `lib/data/__tests__/profile.actions.test.ts` already carries.
- **Avatar dropdown gains a "Profiles" entry beside Connections.** Connections is **not** replaced and `/settings/connections` is untouched — route, page, eight components and eight test files all stand.
- **Seed-log wording fix** — `scripts/seed-dev-users.ts` reports `upserted` for two `.onConflictDoNothing()` inserts, which do not pick up edits on reseed (#189 carry-over C8).

### Deliberately out of scope

- **`createSelfProfile` is not migrated.** It stays in `lib/auth.ts`, called from the NextAuth `createUser` event. It cannot become a `profile.actions.ts` export — that would mint a client-callable "create my self-profile" endpoint — and it cannot share the CTE either: `lib/auth.ts` → `profile.actions.ts` → `user.session.ts` → `@/lib/auth` is an import cycle, which is why `authedUserId` has its own module. Sharing would need an internal module whose sole justification evaporates at #199, when the NextAuth event dies and the caller becomes a server action. Two writers for one chunk is the cheaper of the two costs.
- **The `?? 'UNTITLED'` sentinel stays alive.** #199 deletes it and its test outright; no sweep migration.
- **No avatar control, and no avatar art.** There is no way to set an avatar and nothing to set until #199. What does ship is the mockup's avatar **slot** — the accent-filled disc set into the band on the card and in the profile space — falling back to existing initials art, which the brief names as the expected in-between state. #199 fills the same slot without reshaping either surface. Accent still lands here: it is what distinguishes one faceless card from another until it does.
- **No "managers are recipients" flag** on the birth form, diverging from #183. #197 owns the spoilers cascade that reads it and adds the field to the birth form and profile Settings together, where its copy can be written against the cascade it participates in. A flag nothing reads is dead data with a catalog row attached.
- **No fifth nav pill.** `app-frame` enumerates four pills across three requirements and ~6 scenarios plus the mobile collapse menu; entry is the avatar dropdown alone until the feature has real use.
- **Connections does not move into the own card**, diverging from #183 — deferred to the circle remap (#298), which restructures that surface wholesale. Moving it now means moving it twice, and the interim version would need a self-profile-only carve-out written purely to paper over deferred work.
- **Profile important dates** — drawn in the mockup, ruled outside this map's Destination. Logged [#310](https://github.com/JoshEddie/CTRLplusList/issues/310).
- **Cache-tag granularity** — logged [#309](https://github.com/JoshEddie/CTRLplusList/issues/309); see Impact.

### Stale carry-over instructions this change does NOT follow

The #192 carry-over comment predates later landings and one newer map decision:

- *"Preserve the deterministic `self-<userId>` id"* — gone. #191 replaced it with `nanoid()` plus the self-role partial uniques.
- *"Close C7 — cross-statement atomicity"* — already closed. `lib/auth.ts` writes both rows in one data-modifying CTE, and `createProfile` reuses that shape with `role: 'owner'`.
- *"Add `lib/data/profile.actions.ts`"* — the module exists (follow/unfollow/block/unblock). `createProfile` joins it as an ordinary action.
- *"Add the `profile` domain to `data-layer-organization`"* — already enumerated; only `profile_members` goes unnamed.
- *"Have `events.createUser` call it"* and *"preserve the `UNTITLED` fallback"* — superseded by #302, per the scope carve-out above.

## Capabilities

### New Capabilities

- `profiles-surface`: the Profiles page — own card, managed-profile cards and what they carry, the membership-containment query behind them, and the absence of an empty state — the profile space and its Settings form, and the managed-profile birth form: its fields, its writer's contract, and the `owner` membership it mints. Owns the accent's render contract (a named preset's band and ink, its legibility, travel and midpoint invariants, the random preselection and the no-row fallback) and the tagline's.

### Modified Capabilities

- `menu-system`: the avatar popover's child enumeration gains a "Profiles" entry (Connections stays), and the profile card's `⋯` menu joins the wrappers that compose their rows from the Menu primitive — an `on-dark` trigger named for its own profile, since a grid renders one per card.
- `profiles-data-model`: managed-profile creation — a profile row plus its creator's `owner` membership and no `self` membership, atomic across both rows on a driver without transactions — the accent value follows non-atomically, since a missing accent is a fallback colour and not an unreachable profile; the `tagline` column and its normalization contract; the accent preference's catalog row.
- `data-layer-organization`: the `profile` domain's table list gains `profile_members` and `profile_preferences` (it currently reads "`profiles` table").

## Impact

**Code**

- New routes under `app/(main)/profiles/` — thin `page.tsx` shells forwarding to co-located page components, plus card, birth-form and settings-form subcomponents. No `/profiles/new` route: the birth form is a client-state overlay.
- `lib/data/profile.actions.ts` gains `createProfile` and the profile-update action the Settings form calls. `lib/data/profile.ts` gains the page's membership-containment read.
- Avatar menu component: one added `<MenuLinkItem>`. The profile card's own menu is a new client wrapper beside the card, owning its trigger and open state the way `ListActionsMenu` does.
- `lib/accent.ts` gains `accentDark` — the dark stop alone, for the marks that sit beside the band rather than on it (the active badge's fill, the active card's cast shadow).
- Two shared style files gain variables rather than behaviour: `global.css` moves `.container`'s padding into `--container-padding-x` / `--container-padding-top`, and `app-frame.css` moves the surface's corner into `--app-surface-radius`. Both exist so the profile space's full-bleed band can cancel the well's padding and round to the surface's own corners without restating either value. No rendered result changes for any other page.
- `scripts/seed-dev-users.ts`: log wording only. Seeded profile fixtures already exist and their write mode does not change.

**Database** — one migration: the `tagline` column on `profiles`, and the accent preference's catalog row (`accent`, type `text` — the stored value is a preset name).

**Cache tags** — `createProfile` writes `profiles`, `profile_members` and `profile_preferences`, and must fire `updateTag('profiles')` and `updateTag('profile_members')`. No `profile_preferences` tag: the Profiles-page read joins preferences and caches under `profiles`, so a preference write busts it through that tag already — a third tag would always be fired alongside `profiles` and buy nothing. Per-profile granularity is [#309](https://github.com/JoshEddie/CTRLplusList/issues/309)'s. Consumers: `getEligiblePurchasers` (`profile_members`) and the new Profiles-page read. `getUserIdentity` is React `cache()`, request-scoped with no tag, and is unaffected. Note `getBookmarkedListsByUser` in `lib/data/visit.ts` is deliberately **uncached**, on the stated premise that no mutation fires `updateTag('profiles')`. This change makes that premise false, so the comment needs correcting — but the read stays uncached: a self-profile name written out-of-band by NextAuth can still go stale.

Every tag in the app is a static global string, so these two `updateTag` calls invalidate every user's cached read. Deliberately unchanged here — narrowing wants a read → tag → writer audit first, logged [#309](https://github.com/JoshEddie/CTRLplusList/issues/309).

**Not touched** — `app-frame`'s four nav pills; `/settings/connections` and its eight components; `app/(main)/@modal`, which stays dormant.

**Carried into #199** — no avatar rows on managed profiles, the `UNTITLED` sentinel, the duplicate profile writer, and the accent picker, which the Altvatar customizer absorbs without touching storage.
