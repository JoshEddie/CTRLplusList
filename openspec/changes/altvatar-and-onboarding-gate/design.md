## Context

See `proposal.md` — Why. What shapes the approach here, beyond it:

- **No interactive transactions.** Every write is its own HTTP round-trip, so multi-row atomicity is only available inside one statement. Self-profile minting already solves this with a CTE (`lib/auth.ts`'s `createSelfProfile`); the avatar and accent writes cannot join it.
- **`resolveIdentity` already returns `null` when an account holds no `self` membership**, so a profile-less account can already write nothing *through a write that resolves that way*. An action resolving on `authedUserId()` alone is outside it — `createProfile` mints a profile plus an `'owner'` membership for an un-onboarded account that calls it directly, and the `visit.actions.ts` writers key rows on the account id. The gate's structural enforcement is a property the code has, not one this change invents — it only removes the thing that was preventing profile-less accounts from existing.
- **The actor path already runs on every authenticated request.** `getMembershipsForUser` joins `profiles`, `profile_members` and `profile_preferences` and is tagged for all three. The latch and the art both ride it.
- **Eight reads reach a profile's picture through `profile_members` → `users.image`.** They are `lib/data/profile.ts` (×4), `user.ts` (×2), `purchase.ts`, `profile.identity.ts`.
- **`lib/data/profile.ts` (413 lines) and `profile.actions.ts` (439) are at the size ceiling**, so this change cannot add endpoints to them.
- **The design is settled.** Claude Design `Profiles Flow Prototype` / `Profiles Mockups`, surfaces `1e` (gate) and `1f` (customizer), through turn 6.

## Goals / Non-Goals

**Goals**

- One customizer component with one persistence contract, hosted three ways.
- A style set that expands by adding data, not by touching the customizer's structure.
- A latch that costs no extra round-trip and cannot be left half-cleared in a way that strands a user.
- One avatar disc component, so a slot filled today cannot drift from a slot filled tomorrow.

**Non-Goals**

- **Reshaping the birth form or the Settings form beyond the header the customizer brings with it.** [#314](https://github.com/JoshEddie/CTRLplusList/issues/314) owns their shape, including whether a card-shaped preview survives and finding B14's three copies of the card head. This change extracts the *disc* and repoints it, and the birth form takes the customizer's own accent band and footer in place of the shell's title bar — the band is what puts the accent being chosen on the surface choosing it. The layouts and `AccentPicker`'s fieldset form stay where they are.
- **Caching the two reads that lose their "not cached" reason.** Sourcing art from our own table removes the stated cause (`users.image` written out-of-band), but adopting `'use cache'` on them is a freshness decision with its own tag audit, and this change does not make it. The now-false comments are deleted; the reads keep their current behaviour.
- **A focus trap or `aria-modal` anywhere.** The gate least needs one — it is not an overlay over content, so there is nothing behind it to trap focus away from. `role="dialog"` is *not* in this Non-Goal: `HistoryActions`, `StoreFilterPopover` and `PriceFilterPopover` already carry it, so the gate and the customizer carrying it too is the app's existing practice rather than a departure, and it is what both the unit suites and the e2e specs locate these surfaces by.

## Decisions

### D1 — One table, primary-keyed on the profile

`profile_avatars(profile_id PK → profiles.id ON DELETE CASCADE, style, options jsonb, art, created_at, updated_at)`. The primary key *is* the one-row-per-profile rule, so no separate unique index is owed and no `ON CONFLICT` target has to be invented. No default, no backfill, no seeding path outside the seed script's explicit fixtures — the row's absence is what `onboarding-gate` reads.

*Alternative rejected:* columns on `profiles`, per [#186](https://github.com/JoshEddie/CTRLplusList/issues/186)'s original shape. A jsonb blob plus a multi-KB art string on the hottest table in the app, loaded by every read that touches a profile name, for data most of those reads do not want.

### D2 — The vocabulary is authored data, and the only entry into the design

`lib/altvatar/` holds:

- `vocabulary.ts` — the canonical axes, and for each, its canonical values with their human labels. This is the whitelist: a value not here does not exist as far as the app is concerned. It *assembles* rather than declares: the rows live in `axes.hair.ts`, `axes.face.ts` and `axes.extras.ts`, split by group for file size alone. One vocabulary, canonical and style-independent, spread over four files.
- `styles/<style>.ts` — one module per style: which canonical axes it has, and canonical value → native value for each. Plus its native defaults, used when a canonical value has no row. `styles/icons.glyphs.ts` carries the glyph table beside `icons.ts` for the same reason.
- `resolve.ts` — canonical selections + style → the native option object, pure, no library import.
- `render.ts` — native options + style → SVG. The only module importing `@dicebear/*`.
- `registry.ts` — the one line per style that the style modules are reached through. `types.ts` holds the shared unions, `palettes.ts` the colour ramps every style shares, `shuffle.ts` the roll (D14) and `legibility.ts` the patch pass (D15).

Labels are hand-authored, not derived at runtime. `avataaars`' entries can be *seeded* by de-camelCasing its own names as an authoring convenience, but what ships is reviewed text. Deriving at runtime would put `variant07` one missing override away from the screen, which is the failure the vocabulary exists to prevent.

Splitting per style is what keeps every module inside the size bands as styles are added, and makes "adding a style" a new file plus one registry line.

*Alternative rejected:* storing options keyed by style (`{avataaars: {...}, micah: {...}}`), which the proposal originally assumed. It stores the same intent three times and drifts, and it makes "keep my choices across a style switch" a merge problem instead of a lookup.

### D3 — Style resolution on switch: a style change overwrites nothing

Selecting a style walks every canonical axis: an axis the style lacks renders no control and keeps its stored value; an axis the style has and can map renders it unchanged; an axis the style has but **cannot** map also keeps its stored value, draws the part as absent where the style can express absence and as its own default where it cannot, and leaves no control reading as chosen. An axis holding nothing at all takes the style's default, so a control a viewer has never touched still starts on a value.

Where a style has no close equivalent for a stored value, dropping it beats carrying it over as something else. The alternative — resolving to the style's own default and writing that back — makes every style a lossy pass: switch to a style whose hat axis holds one value and every hat becomes that hat, permanently, because the substitute is what comes home on the way back. Silence costs a control that reads as unset while the viewer is in a style that cannot draw their choice; substitution costs the choice itself.

*Alternative rejected:* overwriting, on the grounds that a control showing one value while storage holds another is a lie. It is the smaller lie. The control shows nothing chosen, which is true — this style has nothing that draws it — and the art shows what it can draw.

### D4 — Client-side preview, one style chunk at a time

`render.ts` loads its style through `await import('@dicebear/styles/<style>.json')` inside a switch, so Next code-splits one chunk per style and only the selected style's definition is ever fetched. The paths are written out rather than built from the id: a template literal defeats the bundler's static analysis and would pull all sixty definitions the package publishes into the chunk. The same module runs on the server for the save path, where the dynamic import is inert.

The chunk is fetched when `<AltvatarPreview>` mounts, not when the customizer opens — the gate and the Settings form both render a preview before anything is opened. What the split buys is unchanged: one chunk per style, only the selected one, never eagerly.

*Alternative rejected:* a server action per control change. The gate is the one screen every user passes through; a round-trip per stepper click is where it would feel broken.

### D5 — `<ProfileAvatar>` is the single disc

`app/ui/components/ProfileAvatar.tsx`, taking `{ profile, className }` — one `ProfileAvatarView` (`{ name, accent, art, avatarStyle }`) rather than four loose props, so a caller cannot assemble half a disc, and size is the consumer's own class rather than an enumerated prop the disc has to keep a list of. It paints the accent's light stop, then fills: `<img src={art}>` for a figurative style, `mask-image: url(art)` over the accent's ink for a glyph style, initials otherwise. Consumers are the nav circle, switcher rows, profile cards, the identity header, the birth-form preview, the claims rows and the list byline.

A name with no profile behind it — a free-text purchaser, or an account whose active profile has not resolved — reaches the same disc through the exported `facelessView(name)`, which is the unset disc the component already draws rather than a fourth branch inside it.

Masking rather than baking the glyph colour: baking would couple every future accent write to a regeneration, and the accent is edited in the same place as the art only *today*. `<img>` stays a native element with its existing lint exemption, whose comment is rewritten: the reason is now a data URI, not an open-ended third-party origin.

`Avatar.tsx`'s `imgFailed` / `onError` state goes with `users.image` — a data URI cannot fail to load — and so does the `FaUser` branch, which is unreachable once every avatar resolves a profile whose `name` is notNull.

### D6 — The latch is a left join on a read that already runs

`getMembershipsForUser` gains `leftJoin(profile_avatars)` and selects `style` and `art` alongside the accent it already selects. Every switcher row and profile card needs the art anyway, so this is not a latch-specific cost. The latch is then pure: no `self` row ⇒ arm A; a `self` row with no art ⇒ arm B.

`lib/cacheTags.ts` gains `profileAvatars` (coarse) and `avatarOfProfile(profileId)` (narrow). `getMembershipsForUser` carries both; the onboarding submit, the profile update and managed-profile creation each fire the narrow tag for the profile they wrote.

### D7 — The layout omits `children` rather than redirecting

`app/(main)/layout.tsx` becomes async, resolves the latch, and returns the gate *instead of* `<ProfileSwitchProvider><AppFrame>…`. Not inside the frame: the gate renders on the sign-in gradient with no nav, per the design.

Because the page element is never included in the layout's output, React never invokes it and no page-level read is issued. This is load-bearing for `onboarding-gate`'s "no page work is performed" requirement, and it is a framework property rather than something the code asserts — `tasks.md` cuts an explicit check that a gated request issues no page query.

**The segment declares `export const instant = false`.** Whether `children` renders at all now depends on a database read, so nothing under `(main)` can be emitted before that read resolves — the gate's guarantee is exactly a refusal to stream the page optimistically. Declaring the block is honest; wrapping the frame in a Suspense boundary instead only hid the same block behind an empty fallback and left Next unable to validate the segments it drops.

**One page paid for that.** `FollowingPage` did its own read above any boundary, which a blocking layout turns into a doubled wait, so its feed moved behind a `Suspense` into `FollowingFeed.tsx` and the page itself became synchronous — the tab strip is the same for every viewer and now paints immediately. It is the only page this change reshapes — the other async pages under `(main)` are left exactly as they are, and reshaping them is not in scope here.

### D8 — Module placement follows table cohesion, not the feature

`profile_avatars` is a table-cohesive satellite, so it gets the pair `lib/data/profileAvatar.ts` / `profileAvatar.write.ts` — which is also the only placement available, since `profile.ts` and `profile.actions.ts` are both at the size ceiling. The self-profile mint leaving `lib/auth.ts` lands in a small internal module (`lib/data/profile.self.ts`) that both the onboarding submit and nothing else imports, which also gets NextAuth out of the business of knowing the schema. The account-deletion path is a `users` write and belongs in `user.actions.ts` (97 lines).

**The write half is `.write.ts`, not `.actions.ts`, and that is the point.** A `'use server'` module's exports are client-callable endpoints, and `writeAltvatar` writes a profile's identity without checking who is asking — its callers own that check. Naming it an action would publish it. The accent write has exactly the same shape and the same three callers, so it was extracted alongside as `lib/data/profilePreference.write.ts` rather than left inline in one of them.

Onboarding gets its own pair for the same table-cohesion reason, over a different subject: `lib/data/onboarding.ts` holds the latch derived off `getMembershipsForUser`'s rows, and `onboarding.actions.ts` — genuinely `'use server'` — holds the submit and the destructive cancel, which do check who is asking.

### D9 — Controls compose; nothing new enters the primitive families

An enum axis is a grid of tiles, one per canonical value, each drawing the face that choosing it produces — the axis name and the current value above it, a check on the selected tile. A colour axis is a row of chips over the shared ramp. `AccentPicker` moves into the customizer whole (`app/ui/components/altvatar/AccentPicker.tsx`), carrying its `TODO(#313)` about hand-copying `FormField`'s label unresolved rather than growing a second copy. `icons` is the same tile grid over glyphs. No new primitive family, no new family spec — the tiles are `<button>`s and the layout is the customizer's own CSS.

*Alternative rejected:* a stepper — `FormField` wrapping previous / next ghost buttons and a label reading the current value. It is what an axis of unnameable variants suggests when you are thinking about *labels*, and it makes choosing a linear walk: reaching the eighth hat means clicking seven times past seven hats, none of which you can see at once. The premise of the customizer is choosing by looking, and a grid is the control that lets you. D16 exists because the grid does — a stepper never had to answer what a covered axis draws.

*Alternative rejected:* a `SelectField` per axis. The values are visual variants with no self-evident names; the interaction is watching the art change, which a dropdown does not support.

### D10 — The mapping is a human task, unblocked by a contact sheet

`scripts/altvatar-sheet.ts` renders every native value of every axis of every style into one static HTML page, each tile captioned with its native key. `avataaars` seeds itself from its own names, and every other figurative style that ships names its parts in words too — so the sheet is how a mapping is *checked* against the art rather than the only route to authoring one. Colour axes need it least of all: a hex is a hex.

This is what made swapping a style out late cheap. `adventurer` was the one style whose values (`variant01`–`variant45`) could be read only off the sheet, so it alone carried an owner task that blocked the change; dropping it took the task with it.

### D11 — Submit ordering, and why a partial write is safe

Profile + `self` membership in one CTE (unchanged), then the avatar row, then the accent. If the avatar write fails the account stays un-onboarded, the gate stands, and re-submitting succeeds because the mint swallows its own 23505. Nothing else recovers a partial write, and nothing else needs to.

### D12 — Two seeded identities, two Playwright projects, no submitting

The seed adds an account with no membership (arm A) and an account whose self-profile has no art (arm B), and gives every other seeded profile art so local pages render instead of gating. `BYPASS_SESSION_USER` already accepts any seeded id — but `synthesizeSession` currently returns `{ user: { id } }` for a non-default id, and `authedUserId` requires `session.user.email`, so today every non-default identity resolves to nothing. That is fixed here, not worked around: the promise the `testing-foundation` spec already makes is made true.

E2E asserts the gate blocks, survives a reload, offers no exit, and raises the deletion confirmation — and submits nothing and confirms nothing, because both consume a fixture no reseed short of `db:reset:dev` restores. Minting, atomicity and deletion are covered over the actions.

### D13 — The brand mark ships as a placeholder

Only raster exists (`altvatar-{hor,stacked}-{color,white}.png` in the design project). It renders in two places — the customizer header and the gate headline — with accessible name `Altvatar`. Until a vector export lands, the asset is a placeholder holding the same box, so swapping it is replacing a file.

### D14 — Shuffle rolls the style, over the figurative pool only

Shuffle re-rolls the style alongside every curated axis and the seed, and the same roll seeds the customizer when it opens on a profile with no stored art — so a viewer meeting the gate does not always meet the same style first, and `DEFAULT_STYLE` returns to being only the fallback for an unrecognised stored id.

`icons` is excluded from the pool. It is the one style that answers a different question — a household or a trip, not a face — so rolling into it is a category jump rather than a different face, and it collapses every control group to one grid.

**A roll is weighted where uniform would misrepresent a value.** avataaars' hat axis holds eight values, so an even roll puts a hijab or a turban on one face in eight — headwear that means something specific about a person, handed out at costume-shop odds. A small weight table in `shuffle.ts` (`hat: { hijab, turban }`, everything unlisted weighing 1) brings them to roughly the share of people wearing one: measured over 200,000 rolls, hijab 0.49% and turban 0.25% against ~16.5% for each remaining hat. The table is keyed by axis and canonical value, so a second entry is data rather than code.

Only the dice are weighted. The control stack still offers both alongside every other hat, at the same size, one click away — a viewer who wants one is not made to hunt for it.

**A rolled style must reset the control group the viewer is on.** A group only renders where the selected style has axes in it, so a roll from `avataaars`' *Outfit* into a style with no clothing axis would leave the viewer on a group that no longer exists, looking at an empty panel. Selecting a style by hand already resets this; the roll takes the same path rather than a second one.

*Alternative rejected:* rolling across every style including `icons`, on the grounds that a shuffle should reach everything reachable. The style chooser is one click away and always visible — nothing is unreachable, only unrolled.

### D15 — Legibility is a pass over the art, not a smaller palette

Every shipping style draws a face's features by going darker than the skin, so on the darkest tones there is nothing darker left and the face loses its brows, eyes and mouth. None of them exposes a feature colour to set instead — micah, the one that did, is not the one that shipped — so the only lever is the SVG the library returns.

`lib/altvatar/legibility.ts` runs on the single path that also derives stored art. The three styles share the problem and nothing else, so it is three rules rather than one:

- **avataaars** inks features as `black` at `.5` opacity or more and its modelling as the same black at a fifth of that, so opacity is what tells them apart.
- **personas** does both: it draws lids and lips in one fixed near-black literal, *and* washes the whole face in a white `mix-blend-mode: overlay`, which reads as modelling on a light face and as ash on a dark one — the face stops matching the ears and neck under it. The wash is scaled back rather than removed, since it is also what keeps the nose and ears from going flat.
- **toon-head** draws every lid and lip in two fixed near-black literals. Fixed, not derived — and in the library's own uppercase, which no colour this app sets can collide with, since every hex reaching a style is lowercased at the boundary.

The fixed-ink lift is one rule over a per-style ink list, because personas and toon-head pose the identical problem; only avataaars, whose ink is opacity-keyed rather than literal, needs its own.

Each fades out as the skin lightens rather than switching at a threshold, so stepping down the swatch row never jumps. Measured through the real render path: features return on the tones below the dark point and Umber upward is byte-identical to what the style drew.

A fourth rule is not about skin at all. A glyph style is painted by the disc through a CSS mask, which reads the art's alpha and nothing else, and the library stacks two copies of each glyph — a blended one, which contributes nothing over the transparent background this app asks for, and one at four-tenths opacity. `flattenGlyph` restores the surviving copy to full alpha, so the mask paints the accent's ink at its full strength rather than at four-tenths.

Every rule matches literal markup, so a library change stops it applying rather than making it misapply. That is deliberate and it is also the module's cost: **`lib/altvatar/legibility.ts` is the file to re-read on every DiceBear bump**, against art actually rendered rather than against the schema. D18 records what that cost was in practice.

*Alternative rejected:* trimming the dark end of `SKIN_TONES`, or giving each style its own floor. Both fix the rendering by removing the tones — which is a worse answer for exactly the people the tones are there for.

### D16 — An overlay is lifted off the tiles beneath it

Two canonical axes can share one native part: avataaars draws hair and headwear through `top`, personas draws eyes and glasses through `eyes`. The overlay is written second and wins, so a tile grid for the axis underneath drew the same face for every value it offered — a control nobody could use, and the premise of the whole customizer (choose by looking) quietly broken.

`withoutOverlaysOver` lifts the covering overlay for those tiles only. The face itself keeps the hat, because that is what the art does; the grid shows the hair on offer, because that is what the viewer is choosing between. The overlay's own grid is untouched — a hat tile should draw a hat.

*Alternative rejected:* gating the covered axis behind `visibleWhen`, so the hair control disappears while a hat is worn. It is honest about the art and awful to use: hair and hats live in different tabs, so the Hair tab would half-empty itself with no visible cause.

### D17 — Rejected outright

- **A free hue dial** for accent (design turn 5b). It would replace 22 hand-authored preset triples with an oklch derivation, rewrite eleven `profiles-surface` scenarios, and migrate stored preset names to hues — trading a per-preset contrast bar a test can walk for a proof obligation over every hue. Storing a hue where a name is stored today stays additive if it ever earns its way in.
- **`bottts`.** It shares three canonical axes with the figurative styles and would need its own control set indefinitely; `icons` already covers the non-human case.
- **`micah`.** Built, mapped and then dropped on sight, for two reasons that only the rendered art shows. It draws a three-quarter profile where `avataaars`, `personas` and `toon-head` all face front, so a row of switcher faces stopped reading as one set. And it carried the mapping's sharpest edge: its only headwear is a turban, so every other hat resolved onto it — which is what exposed the overwrite D3 originally specified as lossy, and got D3 rewritten. Even under the rule as it now stands, a style drawing exactly one hat is a style where headwear mostly cannot be shown.
- **An ownership check before the destructive cancel.** Raised and declined by the owner: the destructive path runs only where there is no self-profile, and with no profile there is nothing to own.
- **DiceBear palette presets** (Sepia, Duotone, Bold Pop…). A per-avatar palette and an accent-driven disc are two colour identities that can disagree.

### D18 — DiceBear 10, and what the bump actually cost

The change was built on 9.4.3 and moved to `@dicebear/core@10.7.0` + `@dicebear/styles@10.6.0` before landing. Five per-style dependencies collapse to two, and the four styles arrive as JSON definitions from one package rather than as four modules — still one dynamic import per style, so the chunk-splitting the customizer relies on is unchanged.

The mapping tables, which are the expensive thing to author, survived almost intact. Every variant name carries over; only three components are renamed (`clothing`→`clothes` and `clothingGraphic`→`clothesGraphic` on avataaars, `body`→`clothes` on personas), and the `<component>Variant` suffix v10 introduces is applied in the one place that writes native options. Two options changed shape rather than name: `backgroundColor` no longer accepts the `transparent` keyword and takes a fully-transparent eight-digit hex instead, and `avataaars` drops its `style` option because v10's canvas no longer draws a background disc at all.

**What the schema could not have told us.** Three defects were found only by rendering the art and looking at it, and every one would have shipped silently:

- Two of the three legibility rules matched markup v10 no longer emits — avataaars moved from `#000` to `black`, and personas replaced its skin-derived features with a fixed literal. A rule that matches nothing fails quietly, and the darkest tones would have lost their features again.
- `shapes` gained an animation axis with no probability gate, so five of its six variants would have set every newly minted item placeholder moving.
- `icons` began stacking two copies of each glyph, one of them at four-tenths opacity, which the disc's mask would have carried straight through into a faint glyph.

That is the argument for D15's closing note, and for taking the contact sheet seriously rather than trusting a green suite.

*Deferred:* nothing. `lib/placeholderArt.ts` moved with the rest, so the repo carries one DiceBear major rather than two.

## Risks / Trade-offs

- **A failed art write flips a user's arm.** Their copy changes from sign-up to existing-account and their Cancel from *delete the account* to *sign out*, leaving them holding an account they can no longer cancel out of. → Accepted. It strands nothing (they can sign out, and the account owns nothing), and the alternative is the `onboarded_at` column [#302](https://github.com/JoshEddie/CTRLplusList/issues/302) explicitly refused.
- **"No page work is performed" rests on a framework property.** If Next ever renders a layout's unused `children`, the gate stops being free and starts being a race. → A task asserts a gated request issues no page-level query, so the property is pinned by a test rather than assumed.
- **The mapping table lands incomplete.** A style ships with axes offering little or nothing until its rows are authored. → By design: union semantics mean an unmapped axis simply offers less, never breaks. The risk is that it *stays* incomplete, which the sheet exists to catch — and which is smaller now that every shipping style names its own parts in words.
- **Inline data URIs add page weight.** The Profiles page renders several discs, each a multi-KB base64 string in the HTML. → Accepted; `item-placeholder-art` already ships this profile on item grids, which are denser. A route serving art with browser caching is the upgrade path if it measures badly.
- **The style chunk is tens of KB gzipped.** → Loaded only for the selected style, and only once a preview mounts — never eagerly, and never more than one at a time.
- **The layout now reads on every authenticated request.** → It calls `getMembershipsForUser`, which `authedIdentity` already calls in the same request, so `'use cache'` dedupes it.
- **`form-shell-system`'s class-composition requirement is already drifted** from `FormShell.tsx` (it names `form-shell` / `form-shell-split`; the code renders `modal-shell form-shell` and has no `split`). → Pre-existing and untouched here: this delta modifies only the dismiss requirement, which is accurate. Flagged for `spec-hygiene` rather than fixed inside a change that did not cause it.

## Migration Plan

1. **Additive migration only** — create `profile_avatars`. No backfill, no default: a backfilled row would silently disable the gate for every existing account, which is the one thing the latch cannot survive.
2. **`users.image` is not dropped.** NextAuth keeps writing it; application code stops reading it. Dropping the column is a later change with no urgency.
3. **Deploy is single-step.** The read sweep and the gate land together, so there is no window in which a profile has no art *and* nothing reads `users.image`.
4. **Everyone passes the gate once at release**, including accounts whose self-profile is named `UNTITLED` — which is how that sentinel is retired, one account at a time, with no sweep.
5. **Rollback** is a revert: with no backfill, the table is inert to anything that does not read it, and a reverted deploy resumes reading `users.image`. Rows written by users who onboarded before the revert survive and are picked up again on re-deploy.

## Open Questions

- **The vector export of the Altvatar mark.** The placeholder ships either way and swapping it changes no structure, no spec and no task beyond replacing a file.
- ~~**Whether `adventurer` survives to production.**~~ **Answered: it does not.** Judged in development against head-and-shoulders art at small sizes and dropped, with `micah`, `personas` and `toon-head` taking its place. It cost a registry line, a package swap and a table of canonical values — which is the point of D2, and the evidence that the point held.
