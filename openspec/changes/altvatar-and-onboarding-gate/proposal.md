## Why

Issue: [#199](https://github.com/JoshEddie/CTRLplusList/issues/199) (MAP [#181](https://github.com/JoshEddie/CTRLplusList/issues/181)).

Profiles need faces without photo uploads, and an account needs a name and a face *before* it can use the app — `profiles.name` is notNull with no automatic source. The two ship together because the blocking one-time onboarding step renders the very customizer this change builds.

Three landed capabilities already cut the hole this change fills, and their SHALLs are inherited constraints rather than open choices:

- **`profiles-surface`** — "The avatar is a **slot**: it SHALL render the profile's avatar art where the profile has any, and its initials otherwise. Until the change that gives profiles avatar art, every profile renders the initials fallback. The slot SHALL paint the accent's light stop behind whatever fills it… and filling the slot later SHALL NOT change the card's shape." This change is that change. The accent stays *behind* the art, so art that carries its own background would violate the slot contract.
- **`profiles-surface`** — "The initials disc SHALL paint the preset's light stop alone, and the preset's ink SHALL meet at least 4.5:1 contrast against that stop." The light/ink pair is already a per-preset, test-walkable contrast bar; avatar art inherits it rather than inventing a palette.
- **`app-frame`** — the nav circle "SHALL render that profile's initials… where a profile has avatar art, the change that introduces it fills this slot as it fills the profile card's."
- **`menu-system`** — a switch row's leading slot "SHALL carry the profile's own avatar — its art where it has any, its initials on its accent otherwise, per `profiles-surface`'s slot." Already written for this change; no delta needed.

Two constraints come from outside the specs. DiceBear already landed via `item-placeholder-art` ([#259](https://github.com/JoshEddie/CTRLplusList/issues/259)), so the library itself is not an open decision — but which parts each style exposes bounds what the customizer can offer, and the repo carries one DiceBear major rather than two (D18). And `profiles-data-model` currently requires a self-profile at account creation; making onboarding structural means rewriting that requirement, not guarding around it.

## What Changes

- **Altvatar art per profile**, in its own table, one row per profile — DiceBear-generated, no uploads. Each row carries the chosen **style**, a **style-independent options blob**, and the **rendered SVG data URI**, derived server-side from the blob on every save and never accepted from the client. **The absence of the row is load-bearing**: it is the un-onboarded latch for pre-existing accounts, so the row is never auto-created and the table carries no seeding default.
- **Four styles ship: `avataaars`, `personas`, `toon-head`, `icons`.** `adventurer` is dropped — `design.md` left its survival an open question to be judged in development, and it did not survive; two head-and-shoulders styles take its place — `micah` was tried alongside them and dropped too, per `design.md` D17. It was also the one style naming every part `variant01`–`variant45`, so the by-eye mapping pass it alone required goes with it. `bottts` stays dropped — it shares almost no options with the figurative styles, so it would need a control set of its own indefinitely, and `icons` already covers the concept-profile case (household, trip) that a non-human style exists for. Adding or swapping a style is a data change, not a redesign — which is what let this substitution land after the customizer was built.
- **A curated-controls customizer with shuffle, speaking its own vocabulary.** Controls are named in an app-owned vocabulary (`hair: "short-curly"`), and a per-style table maps each canonical value to that style's native option. DiceBear's own names never reach a user — which matters because the styles disagree about them: `top` is hair in `avataaars`, while `personas` files `cap` and `beanie` under *hair* rather than under any headwear axis of its own. The vocabulary is a **closed whitelist**: a value with no label is not offered, so a DiceBear release adds nothing until it is named. Colour axes carry across a style switch verbatim, and every enum value shared by two styles carries with them. Shuffle re-rolls every curated axis, the seed, **and the style itself** — drawn from the figurative styles only, since landing on a glyph is a category jump rather than a different face. There is no pinned/unpinned state to design or unselect.
- **The mapping table fills in incrementally, and the code tolerates it being incomplete.** A canonical value exists as soon as one style has it; a style that has no row for it does not offer it. `avataaars` seeds the vocabulary mechanically from its own already-human names, and every other figurative style that ships names its parts in words too (`fonze`, `bobCut`, `mohawk`, `smirk`, `longBeard`) — so authoring the table is naming and labelling rather than matching art to opaque numbers, and the contact sheet checks the result rather than being the only route to it.
- **The accent picker moves inside the customizer.** Accent and avatar are edited together and stored apart: accent stays in `profile_preferences` as a named preset, and the avatar row gains no accent column. The palette stays the fixed named presets `profiles-surface` fixes — no free hue dial, so re-colouring a preset still rewrites no stored row.
- **A blocking one-time onboarding gate.** The `(main)` layout short-circuits — un-onboarded renders onboarding *instead of* `children`, so no page component runs, no data is fetched, no actor is resolved. It gates every route under `(main)`, public content included; no allowlist, no route, no redirect, no `?next=`, and the URL is untouched, so submitting reveals the page that was asked for.
- **BREAKING** — **`createSelfProfile` moves out of the NextAuth `createUser` event into the onboarding submit action.** Enforcement becomes structural: between sign-in and submit there is no profile, so nothing can own a list or item. No per-action guard ships. The `?? 'UNTITLED'` fallback and its test delete outright; **no sweep migration**.
- **BREAKING** — **`users.image` stops being read.** The gate is blocking and universal, so every account has an Altvatar the moment it can use the app, and the Google-photo fallback path stops being maintained. NextAuth keeps writing the column.
- **`FormShell` gains `dismissible={false}`** — suppresses the close button and overlay-click dismissal. Escape needs no code: the shell has never handled it.
- **Cancel, one button, behaviour by arm.** Signup arm ⇒ `ConfirmDialog`, then delete `users` + `accounts` (cascade) and sign out; the account owns nothing by construction. Existing-account arm ⇒ sign out only, never deletes.
- **One `<ProfileAvatar>` disc**, extracted and repointed from every slot that fills — nav circle, switcher rows, profile cards, the profile-space identity band, the birth-form preview, claims rows, list byline. The band, the layouts, and the accent picker's fieldset form stay [#314](https://github.com/JoshEddie/CTRLplusList/issues/314)'s.
- **Two seeded un-onboarded identities** — one per arm, through the existing `BYPASS_SESSION_USER` seam, no new flag — so both arms are previewable locally and testable e2e.

The issue named **customizer / gate** as the clean cut if this proved to be sprawl. `/embark-design` refused it: the halves are ordered, and the first cannot drop `users.image` — until the gate is universal an account with no avatar row still needs a face — so the cut would ship a fallback chain it then deletes and edit the same eight read sites twice. The sequencing lives in `tasks.md` instead.

## Capabilities

### New Capabilities

- `altvatar`: generated avatar art as a profile's face — its own table keyed one row per profile, the generation model (style, the app-owned option vocabulary, the per-style mapping), the curated-controls customizer with shuffle, how art fills the avatar slot the landed specs already reserve, and the Altvatar brand mark.
- `onboarding-gate`: the blocking one-time step every account passes through once — the two-armed latch, the layout short-circuit, the submit action that mints the self-profile, and the two Cancel behaviours.

### Modified Capabilities

- `profiles-data-model`: "Every new account gets a self-profile at creation" moves from the NextAuth `createUser` event to the onboarding submit; the `UNTITLED` sentinel requirement and its nameless-account scenario delete. Gains the avatar table and the rule that its row is never auto-created.
- `profiles-surface`: the avatar slot fills with art rather than always falling back to initials; the accent picker leaves the birth form and the Settings form for the customizer; the birth form requires an avatar.
- `app-frame`: the nav avatar circle renders the active profile's Altvatar art, filling the slot its own requirement reserves.
- `form-shell-system`: a non-dismissible mode — close button suppressed, overlay-self-click inert.
- `list-hero-header`: the viewer-view byline avatar's resolution chain (`user.image` → initials chip → `FaUser`) repoints off `users.image`, and its "Avatar falls back when `user.image` is null" scenario is rewritten against the profile avatar slot.
- `claim-attribution`: the claims-list row avatar currently renders "their profile image when the purchaser is a linked account, initials derived from the display name otherwise" — account-linkage stops governing, since a managed profile now carries art too.
- `testing-foundation`: the `BYPASS_SESSION_USER` seam gains the two un-onboarded seeded identities.
- `e2e-management-flows`: the onboarding gate joins the enumerated management flows.

## Impact

**Schema** — one new table (one row per profile, no seeding default) via the drizzle-kit migration workflow. No interactive transactions available; the "row absent = un-onboarded" invariant must survive that.

**Cache** — the avatar read rides the actor path that already runs on every authenticated request (`getMembershipsForUser`, tagged `profiles` / `profile_members` / `profile_preferences` / `profilesOfUser` / `profile(id)`). A new table needs its own coarse + narrow tags in `lib/cacheTags.ts`, and every writer that clears the latch — the onboarding submit, the customizer save, and managed-profile creation — must fire them, or the gate stands after a successful submit.

**Read sweep** — every read selecting `users.image` repoints: `lib/data/profile.ts` (×4), `lib/data/user.ts` (×2), `lib/data/purchase.ts`, `lib/data/profile.identity.ts`. All eight currently reach the image by joining `profile_members` → `users`; joining the avatar table on `profile_id` drops that hop. Two of them carry a "Not cached: reads `users.image` which NextAuth updates out-of-band" comment; sourcing from our own table removes that reason.

**Auth** — `lib/auth.ts`: `createSelfProfile` leaves the `createUser` event; `synthesizeSession` gains the un-onboarded identities.

**Render** — `app/(main)/layout.tsx` (short-circuit), the extracted `<ProfileAvatar>` disc replacing `Avatar.tsx`'s fallback chain, plus the slots the landed specs reserve: the nav circle, switcher menu rows, profile cards, the profile-space identity band, and the birth-form preview. `AccentPreview` is likely subsumed by the customizer's own preview.

**Dependencies** — this change moves DiceBear to `@dicebear/core@10.7.0` + `@dicebear/styles@10.6.0`, both pinned exact, and drops the five per-style packages the 9.x line needed (D18). All four styles arrive as JSON definitions in one package and enter the client bundle through a dynamic import on style selection, so live preview costs no server round-trip per control change.

**Tooling** — a dev-only contact-sheet script rendering every axis × every native value per style, captioned with the native key, so a style's table is authored and checked against the art it produces rather than against its schema alone.

**Deletions** — the `?? 'UNTITLED'` fallback and its test (`db/__tests__/profiles.test.ts:180`); `Avatar.tsx`'s `FaUser` branch, unreachable once every avatar resolves a profile whose `name` is notNull.

## Reconnaissance — non-binding

Verified against the landed code and the pinned 9.x packages during this change's explore step, and corrected where the design interview overturned it. **None of it is contract**: it is carried here so the measurements are not re-derived. Anything that binds is restated in `design.md`, `adr.md`, or a spec.

### The option model: pools, not values

Every enum option in the 9.x style schemas is `type: array` whose default is the full value list. You do not pass `eyes: 'wink'`; you pass `eyes: ['wink']`, and the seed picks from whatever pool remains. The second control kind is `*Probability` (integer 0–100): `facialHairProbability: 0` is how "no beard" is expressed. Between them that is the entire vocabulary DiceBear exposes.

Because shuffle re-rolls every curated axis, no pool is ever left wide by design — every curated axis is always pinned to one value, and the seed governs only the axes nobody curated.

### Per-style vocabularies

| | enum options | probability toggles | colour pools |
| --- | --- | --- | --- |
| avataaars | `top`(34) `eyes`(12) `eyebrows`(13) `mouth`(12) `clothing`(9) `accessories`(7) `facialHair`(5) `clothingGraphic`(10) `nose`(1) `base`(1) `style`(2) | accessories, facialHair, top | skin, hair, hat, clothes, accessories, facialHair |
| personas | `hair`(20) `eyes`(6) `mouth`(7) `facialHair`(6) `nose`(3) `body`(4) | facialHair | skin, hair, clothing |
| toon-head | `hair`(4) `rearHair`(4) `beard`(5) `eyes`(5) `eyebrows`(5) `mouth`(5) `clothes`(5) `head`(1) `body`(1) | hair, rearHair, beard | skin, hair, clothes |
| ~~micah~~ | ~~`hair`(8) `eyes`(5) `eyebrows`(4) `mouth`(8) `nose`(3) `ears`(2) `facialHair`(2) `glasses`(2) `earrings`(2) `shirt`(3)~~ | ~~hair, facialHair, glasses, earrings~~ | ~~base(skin), hair, glasses, earring, shirt, eyes, eyebrows, mouth, eyeShadow~~ |
| ~~adventurer~~ | ~~`hair`(45) `eyes`(26) `mouth`(30) `eyebrows`(15) `glasses`(5) `earrings`(6) `features`(4)~~ | ~~hair, glasses, earrings, features~~ | ~~skin, hair~~ |
| icons | `icon`(146) | — | background only |
| ~~bottts~~ | ~~`eyes`(14) `face`(6) `mouth`(9) `top`(9) `sides`(7) `texture`(8)~~ | ~~mouth, top, sides, texture~~ | ~~base~~ |

Axis names disagree across styles (`top` is *hair* in avataaars; personas files headwear inside *hair*; toon-head splits hair into `hair` and `rearHair`), and value sets only partly overlap (`smile`, `sad`, `wink` and `happy` recur across styles, while `fonze`, `pigtails`, `mohawk` and `agape` are each one style's own). An **earlier reading of this concluded no translation layer was viable — that was wrong.** It measured DiceBear's own names against each other. The app names both axes and values itself, so reconciliation happens once in an app-owned table rather than at every call site, and storage is style-independent rather than keyed by style.

What no table can supply is the **judgement**: whether personas' `curlyHighTop` and avataaars' `fro` are one canonical hair or two is a call someone makes by looking at both, not one a schema answers.

`icons` remains a different UI shape — one enum, no parts, no probabilities. A picker grid, not a control stack.

### Colour, and the `icons` glyph

`icons` glyphs are drawn in a single hardcoded white and the style exposes no glyph-colour option. Generating with a fully transparent background yields **glyph-only alpha**, which makes CSS masking viable: `mask-image: url(<data-uri>)` over `background: var(--accent-ink)` paints the glyph from CSS and re-themes live when the accent changes. Masking is preferred over baking the ink into the SVG: baking would couple every future accent write to a regeneration.

**Gotcha:** the background must be asked for explicitly. Left unset, the style paints a rect from its own palette, and an opaque square is exactly what a mask reading alpha would then show.

**Gotcha:** v10 stacks *two* copies of each glyph, one at four-tenths opacity, which a mask would carry through as a faint glyph. `flattenGlyph` restores full alpha — see D15.

v10 adds an Icon colour "linked to Background, strongest contrast preferred". `lib/accent.ts` already encodes that by hand — its comment states `ink` is measured against `light` — and `profiles-surface` already makes the light/ink pair a 4.5:1 test-walkable bar, so the disc keeps deciding the ink and the style's own colour is left unused.

### Why transparent backgrounds, in three independent arguments

1. `profiles-surface`'s slot contract already paints the accent *behind* whatever fills the slot.
2. The accent picker moves inside the customizer, so a baked background would mean a regeneration round-trip per swatch click across 20-odd presets.
3. Baking would add a third arm to `updateProfile`'s existing partial-failure branch ("Name and tagline were saved, but the accent was not"), and every future accent write path would have to remember to regenerate.

The cost is that the URI stops being self-contained — consumers need accent alongside it. That cost is near-zero here because the reads that lack accent are exactly the reads already being edited to stop selecting `users.image`.

Note this is the *opposite* call from `lib/placeholderArt.ts`, deliberately: item art has no owner whose taste can change, so baking is right there and wrong here. That module's "must never enter a client bundle" comment is scoped to placeholder art and binds nothing here.

### The latch is nearly free

`getMembershipsForUser` already runs on every authenticated request, already left-joins a per-profile side table (accent preference), and is already tagged `profilesOfUser(userId)` + `profile(id)`. Arm A (no self-profile) is zero rows with `role: 'self'` in a result it already computes — and `resolveIdentity` already returns `null` on exactly that condition, so a profile-less account can already write nothing. Arm B (no avatar row) is one more left join. No extra round-trip, and the existing tags already fire on both writers that clear the latch.

### Cancel-deletes-account: risk cleared

Guest claims are cookie-scoped (`guest_claims`, `httpOnly`, server-only, per `guest-claim-identity`) with no account linkage at sign-in. Deleting a fresh `users` + `accounts` pair destroys nothing a guest built, so "the account owns nothing by construction" holds — content hangs off profiles, and profiles are reachable only through membership.

### Assorted, verified

- **`avataaars` needs `style: ['default']`, not `circle`** — `circle` draws its own background disc inside the SVG, doubling with the disc the slot already paints.
- **Bundle cost of client-side preview.** Each style is a table of SVG parts that gzips poorly, but only the selected style's chunk loads, and the definitions are reached one dynamic import at a time so the bundler never pulls the sixty styles `@dicebear/styles` publishes into one chunk. Task 7.8 holds the served-chunk sizes measured against the built output, which is the figure that binds.
- **v10 ships, and this change is on it.** `@dicebear/core@10.7.0` exports `Style`/`StyleDefinition`/`Avatar`/`Color` with no `createAvatar`, and takes styles as JSON definitions rather than modules; `@dicebear/styles@10.6.0` publishes all four in one package, so the five per-style dependencies collapse to two. Variant names carry over from 9.4.3 unchanged — only three components are renamed (`clothing`→`clothes` and `clothingGraphic`→`clothesGraphic` on avataaars, `body`→`clothes` on personas), so the mapping tables survive intact. See D18 for what the migration cost.
- **`FormShell` handles no Escape key** — no `keydown` listener in `FormShell.tsx` or `use-dismiss.ts`, and no `role="dialog"` or focus trap anywhere in the app's modals.
- **The accent picker's move** leaves `writeAccent`, `profile_preferences`, `profile.schema.ts` and `useUnsavedChanges` untouched — only `ProfileFields` loses the picker and `AccentPreview` is likely subsumed. `AccentPicker` carries a `TODO(#313)` about hand-copying `FormField`'s label markup, which travels with it.

### Design source

Claude Design project `Profiles Flow Prototype` / `Profiles Mockups` — surfaces `1e` (gate) and `1f` (customizer), revised through turn 6. The gate is one layout with two copy sets on the sign-in gradient; the customizer is a modal opened *from* its host and returning to it. The brand mark exists as raster only (`altvatar-{hor,stacked}-{color,white}.png`) and ships as a placeholder until a vector export lands.
