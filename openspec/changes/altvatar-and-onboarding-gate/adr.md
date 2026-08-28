## ADDED ADRs

### 2026-08-26-generated-art-speaks-our-own-option-vocabulary

**Touching**: `Generated Art` — proposed term, covering `lib/placeholderArt.ts` and the Altvatar generation module

**Context**: DiceBear's 9.x styles name the same part differently — `top` is hair in `avataaars` and an antenna in `bottts`, `personas` files headwear inside its own `hair` axis, and `toon-head` splits hair into `hair` and `rearHair` — and some styles name their values in a way no viewer can read at all, as `adventurer`'s `variant01`–`variant45` did. An earlier reading concluded no translation layer was viable; it was comparing the libraries' names against each other rather than against a vocabulary of our own.

**Decision**: Generated-art options are named in an app-owned vocabulary — both the axis (`hair`) and the value (`short-curly`) — and a per-style table maps each canonical value to that style's native option. Storage holds the canonical value; the library's own names reach neither storage nor a user. The vocabulary is a closed whitelist: an option with no canonical name is not offered, so a library release adds nothing until it is named. The table may be incomplete — a canonical value a style carries no row for is simply not offered while that style is selected — because whether two styles draw the same canonical thing is a judgement someone makes by looking at the art.

**Consequences**: Adding a style becomes a data change (name its values, map them) rather than a redesign, and any value two styles share survives a style switch untouched. The cost is a mapping no code can generate, which a human must extend for every style added.

### 2026-08-26-onboarding-is-a-layout-short-circuit-not-a-guard

**Touching**: `DAL`, `app/(main)/layout.tsx`

**Context**: `profiles.name` is notNull with no automatic source, so an account must supply a name and a face before it can own anything — but `createSelfProfile` ran inside NextAuth's `createUser` event, where nothing can ask a human for either. Guarding every server action against a profile-less actor would mean a check per action that any new action can forget to add.

**Decision**: Self-profile creation happens in the onboarding submit action, and the `(main)` layout renders onboarding *instead of* `children` for an un-onboarded account. Between sign-in and submit there is no profile, so no page component runs and no data is fetched. Every write that resolves its actor through `resolveIdentity` — `authedIdentity()` / `authedWriter()` — yields null for an account holding no `self` membership, so no profile-scoped write lands. No per-action onboarding guard ships, and none is to be added. The gate covers every route under `(main)`, public content included; it is not a route and never changes the URL, so submitting reveals the page that was requested.

**Consequences**: A new page, and any server action resolving through `resolveIdentity`, inherits the guarantee without doing anything, and an actor that resolves is by construction fully set up. An action resolving on `authedUserId()` alone does not: `createProfile` mints a profile and an `'owner'` membership for an un-onboarded account that calls it directly, and the visit writers key rows on the account id. Those stand — the surfaces are unreachable before the gate and the endpoints only by hand — but an action choosing that resolution is outside the guarantee and owes a reason. In exchange the layout performs a read on every authenticated request, and any future surface that must render for a profile-less account has to live outside `(main)`.

### 2026-08-26-profile-art-never-comes-from-the-account

**Touching**: `DAL`, `DB Queries`

**Context**: Eight reads across `lib/data/` resolved a profile's picture by joining `profile_members` → `users` for `users.image`, a column NextAuth writes out-of-band from Google — which forced two of them to opt out of caching entirely. A managed profile has no account, so that chain could never give one a face.

**Decision**: A profile's identity art is read from the app's own per-profile table, joined directly on the profile id. `users.image` is never read: NextAuth keeps writing it and no application code consults it. Every avatar in the app is profile-valued — there is no account-valued avatar, and no account-linkage branch decides whether a face is available.

**Consequences**: The profile → account hop disappears from eight reads, and the out-of-band-write caching exemption goes with it. A managed profile and a self-profile render through one path, so no surface has to ask which kind it is holding.

### 2026-08-26-customizable-art-stores-its-inputs-and-its-rendering

**Touching**: `Generated Art` — proposed term, covering `lib/placeholderArt.ts` and the Altvatar generation module; `DB Schema`

**Context**: A generated avatar is cheap to render once but is read on every authenticated request, and its inputs have to survive so the editor reopens on what the user actually chose rather than on a guess reverse-engineered from the art.

**Decision**: User-customizable generated art persists both its inputs and its rendering. The rendering is derived server-side from the submitted inputs on every save and is never accepted from a client — a client-supplied rendering is arbitrary content displayed to other people. Reads take the stored rendering; only the editor reads the inputs.

**Consequences**: Rendering becomes a string read rather than a generation, and stored art is stable — upgrading the generator library does not silently redraw everyone's face. The cost is that a deliberate re-render across the corpus needs a migration rather than a deploy.

### 2026-08-27-patched-library-markup-is-re-verified-by-rendering

**Touching**: `Generated Art` — proposed term, covering `lib/placeholderArt.ts` and the Altvatar generation module

**Context**: The drawing library exposes no option for several things this app needs — a feature colour that stays legible on the darkest skin tones, a glyph at full alpha for the disc's CSS mask — so the SVG it returns is patched by matching literal markup. Literal matching fails safe in one direction only: when the library changes what it emits, a rule stops applying rather than misapplying. It is silent either way.

**Decision**: Patching the library's own markup is accepted where no option exists, on the single path that also derives stored art, and every rule lives in one module. In exchange, a library upgrade is not complete until each rule has been re-verified **against rendered art**, not against the library's schema or a green test suite — the tests pin the rules against fixtures, and a fixture updated to match new markup proves nothing about the art.

**Consequences**: Features stay legible and glyphs stay solid without waiting on upstream options. The cost is a standing re-verification step on every upgrade, and it is not optional: the 9.4.3 → 10.7.0 bump silently broke two of three legibility rules, started animating every new item placeholder, and dimmed every glyph to four-tenths alpha — none of which any gate caught.

## MODIFIED ADRs

None.

## REMOVED ADRs

None.
