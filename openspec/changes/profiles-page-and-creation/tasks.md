## 1. Read the design first

- [x] 1.1 Open the Claude Design **Profiles Flow Prototype** named in `proposal.md` — project `0abb3a4a-a908-46ce-a44f-9fa8e5900c0c`, file `Profiles Flow Prototype.dc.html` — and read the real design under `project/deck/` (the JSX + CSS), not the rendered `.html`. Every UI task in groups 6–9 is written against it: it carries layout, spacing and copy that no artifact in this change reproduces.
- [x] 1.2 Mark which of the mockup's parts this chunk builds and which belong to #193–#199, using `proposal.md` — What Changes and Deliberately out of scope — as the cut. Card-click switching, the `⋯` menu, tab chrome, avatars, the recipients flag, important dates and the fifth nav pill are all out.
- [x] 1.3 Map every mockup colour and spacing value onto an existing token in `app/ui/styles/global.css` before adding any token; a new token only where no existing role covers it.

## 2. Promote the ADR

- [x] 2.1 Promote `2026-08-19-profile-attributes-column-or-preference` from `adr.md` into `openspec/adr/2026-08-19-profile-attributes-column-or-preference.md`, and add its `DB Schema` and `DAL` rows to the index table in `openspec/adr/INDEX.md`.
- [x] 2.2 Apply the `MODIFIED` entry for `2026-08-18-atomic-writes-in-one-cte` from `adr.md` to `openspec/adr/2026-08-18-atomic-writes-in-one-cte.md`, carrying the fixability criterion into Context and the closing clause into Consequences. **Touching** is unchanged, so `INDEX.md` needs no new row.

## 3. Schema and migration

- [x] 3.1 Add a nullable `tagline` text column to `profiles` in `db/schema.ts`.
- [x] 3.2 Generate the migration per `DATABASE.md`, and add to the generated SQL the single `preferences` catalog row: id `accent`, name `Accent color`, type `text`.
- [x] 3.3 Run `npm run db:migrate` and verify: `profiles.tagline` is nullable and NULL on every pre-existing row, the catalog holds the `accent` row, and `profile_preferences` holds no rows.

## 4. Accent palette

- [x] 4.1 Author the palette in `lib/accent.ts` as a table of named presets, each carrying its own `light` and `dark` gradient stops and its own `ink` — three authored colours per preset, not stops derived from a stored hue. The stored value is the preset's name alone, so re-colouring a preset rewrites no row. This reverses the derived-hue approach settled at design time; `design.md`'s "An accent is a named gradient band the palette owns" carries why.
- [x] 4.2 Arrange the table's order by eye, since declaration order is swatch order. Sorting by a band's midpoint hue was tried during design and read worse than an arranged run, so the order is authored and the spec fixes no rule for it.
- [x] 4.3 Assert the invariants with a test that walks the table rather than naming any preset or hex value, so adding or re-colouring one needs no test edit: each preset's ink clearing 4.5:1 against the light stop the initials disc paints, three parsable colours per preset, stops far enough apart to read as a band rather than one flat colour, a midpoint keeping enough of its endpoints' chroma not to grey out, a distinct band and a distinct ink per preset, and — at palette level — enough bands crossing the wheel to give the palette range.
- [x] 4.4 Implement the fallback for a profile carrying no preference row: render `--hero-gradient` from `app/ui/styles/global.css`, no new token. No derivation from the profile id. The fallback must read as unset rather than as an additional preset, and must not appear among the selectable swatches.

## 5. Data layer

- [x] 5.1 Add `createProfile` to `lib/data/profile.actions.ts`: plain arguments, the imported `db`, actor from `authedUserId`. Writes the `profiles` row and the creator's `owner` membership in one data-modifying CTE per `2026-08-18-atomic-writes-in-one-cte` — reuse the shape in `createSelfProfile` (`lib/auth.ts`), with `role: 'owner'`, no `self` membership, and no 23505 catch: creation is not idempotent and duplicate names are two profiles.
- [x] 5.2 Validate `createProfile`'s payload: name required, 1–60 characters after trimming; tagline optional, trimmed, empty/whitespace → `null`, at most 40 characters; accent required — a payload carrying none is rejected with a field error and no row is written.
- [x] 5.3 Write the accent preference value outside the CTE. It is deliberately not atomic with the profile and membership rows: a failed accent write leaves both of those in place and the profile renders the fallback. See `adr.md` — the fixability criterion on `2026-08-18-atomic-writes-in-one-cte`.
- [x] 5.4 Add the profile-update action to `lib/data/profile.actions.ts`: resolves the acting account from the session, loads that account's membership on the target profile, proceeds only for `self` or `owner`, and returns `Unauthorized` with no write for `manager` and non-member alike. Writes name, tagline and the `accent` value.
- [x] 5.5 Add the Profiles-page read to `lib/data/profile.ts`: membership containment is the whole query. Returns per card the profile name, tagline, the viewer's role, the count of lists it owns at every visibility, the count of its items with no archive timestamp, and its stored accent where one exists. Orders self → owned (name asc) → managed (name asc).
- [x] 5.6 Wire cache tags: `'use cache'` + `cacheTag` on the new read, and `updateTag('profiles')` plus `updateTag('profile_members')` on `createProfile`; the update action busts `profiles`. Do not narrow any tag ([#309](https://github.com/JoshEddie/CTRLplusList/issues/309)).
- [x] 5.7 Correct both comments in `lib/data/visit.ts` resting on the premise that no mutation fires `updateTag('profiles')` — the one on `getBookmarkedListsByUser` and the one on `getVisitHistoryByUser`, which back-references it. Both reads stay uncached: a self-profile name written by NextAuth out of band can still go stale.
- [x] 5.8 Check the file-size band on `lib/data/profile.ts` (323 lines before this change, already yellow). If the new read pushes it over 400, split by table cohesion; never `eslint-disable` the rule.

## 6. Profiles page

- [x] 6.1 Add `app/(main)/profiles/page.tsx` as a thin shell forwarding to a co-located `ProfilesPage.tsx` that owns auth, the read and the layout. An unauthenticated request redirects to `/`.
- [x] 6.2 Build the profile card as its own component: initials art, name, the role label (`You` / `Owner` / `Manager`, non-interactive text), tagline, counts, accent. No avatar and no avatar placeholder.
- [x] 6.3 Render no tagline node at all when the tagline is NULL — no placeholder spacer, deliberately unlike `list-metadata`'s list cards.
- [x] 6.4 Make the card body inert: no link and no click handler on the card, and a single **Edit** link — the `ItemCard` action-strip precedent, not `UserCard`'s whole-card link — navigating to that profile's space.
- [x] 6.5 Add the page header with the control that opens the birth overlay — its text comes from the mockup read in 1.1, not from these artifacts. Render no empty state.

## 7. Profile space

- [x] 7.1 Add `app/(main)/profiles/[id]/page.tsx` as a thin shell forwarding to a co-located page component. Renders for `self`, `owner` or `manager`; an authenticated non-member and an id no profile carries both redirect to `/profiles` with an identical response; unauthenticated redirects to `/`. No tab chrome.
- [x] 7.2 Render the identity header: name, initials art, accent, and the tagline only where present.
- [x] 7.3 Build the Settings form over name, tagline and accent through the existing `form-shell-system`, `form-field-system` and `button-system` primitives — no new variant or size. Mirror the tagline's length cap client-side with `maxLength` on the input; the trim-to-null stays the submission schema's own transform. Where the profile carries no stored accent, open with one preset selected at random on each open and write nothing until submitted — dismissing leaves the profile unset.
- [x] 7.4 For a viewer whose role is `manager`, render every field disabled and render no submit control at all — not a disabled one.

## 8. Managed-profile birth form

- [x] 8.1 Build the birth form as a client-state overlay mounted from the Profiles page, using `FormShell`'s `onClose` state dismissal. Add no `/profiles/new` route and leave `app/(main)/@modal` dormant.
- [x] 8.2 Fields: name (required, 1–60), tagline (optional, 40 cap, trim-to-null), accent chosen from the presets, required. The accent field opens with one preset already selected, chosen at random and unseeded — the form holds no profile id to seed from.
- [x] 8.3 On success, navigate to the new profile's space and raise no toast. On failure, keep the overlay mounted, render the returned message inline, raise a failure toast, and do not navigate.

## 9. Avatar popover

- [x] 9.1 Add a `<MenuLinkItem>` for Profiles to `app/(auth)/ui/components/UserAvatarPopover.tsx`, ordered above Connections and below the signed-in header, linking to `/profiles` with an icon visually distinct from the Connections row's. Leave Connections, `/settings/connections` and its eight components untouched.

## 10. Seed script

- [x] 10.1 Fix the log wording in `scripts/seed-dev-users.ts`: the two `.onConflictDoNothing()` inserts report `upserted` but do not pick up edits on reseed.

## 11. Tests

- [x] 11.1 Cover `createProfile` through the existing pglite seam in `lib/data/__tests__/profile.actions.test.ts`: the profile row and its lone `owner` membership, the absence of a `self` membership, two profiles sharing a name, a failed membership write leaving no profile row, and name/tagline validation including blank-tagline-to-NULL.
- [x] 11.2 Cover the profile-update action at the same seam: `manager` and non-member both rejected with `Unauthorized` and no write, `owner` persisting all three fields, and a `self` rename writing no account record.
- [x] 11.3 Cover the Profiles-page read: ordering across the three role runs, membership containment excluding a profile the viewer holds no membership on, and counts that include every list visibility and exclude archived items.
- [x] 11.4 Cover the card's render contract: role labels, an absent tagline rendering neither a tagline nor a placeholder node, no avatar node, and the inert body with its single Edit link.
- [x] 11.5 Cover the accent: every preset's ink clearing 4.5:1 against the light stop its initials disc paints, a stored accent being the one rendered, a profile with no preference row rendering the fallback, and the birth form opening on a preset. How the randomness is exercised is apply's call.
- [x] 11.6 Cover the birth overlay: success navigating with no toast, failure keeping it mounted with an inline message and a failure toast, and the preselected accent being stored when the creator does not change it.
- [x] 11.7 Update `app/(auth)/ui/components/__tests__/UserAvatarPopover.test.tsx` for the new row enumeration and its order.
- [x] 11.8 Add e2e coverage for the walk `acceptance.md` describes, following the existing suite's conventions.

## 12. Close out

- [x] 12.1 Refine `acceptance.md` with the literal handles the implementation landed — real button text, real routes, real field labels. Refine, not rewrite: flow identity and journey scope stay as drafted.
- [x] 12.2 Resolve the `*TODO:*` in `Flow: A viewer reaches Profiles from the avatar popover` — the real avatar trigger in the app frame.
- [x] 12.3 Resolve the `*TODO:*` in `Flow: A viewer gives birth to a managed profile` — the real control text that opens the birth overlay.
- [x] 12.4 `npm run lint` — zero errors, zero non-size warnings
- [x] 12.5 `npx tsc --noEmit` — zero errors
- [x] 12.6 `npm run build` — completes successfully
- [x] 12.7 `npm run test:coverage` — run result
- [x] 12.8 `npm run test:e2e` — run result

## 13. Mockup reconciliation

Applied after the owner found the shipped card had diverged from the Claude Design mockup the artifacts were drafted against. Fixed in place: the destination stands, the card's shape was wrong.

- [x] 13.1 Give the card the mockup's avatar slot — 72px disc on the accent's light stop, overlapping the band's lower edge with a 4px surface-coloured ring — filled with initials until #199 fills it with art.
- [x] 13.2 Replace the body's `Edit` link with the mockup's `⋯` menu on the band, routed through `menu-system`: an `on-dark` trigger named for its profile, opening one `Edit <name>` row. Permissions (#194) and "Transfer a list in" (#198) join it as rows later.
- [x] 13.3 Mark the active profile's card — accent across the card face, body inset as a panel, ✓ badge on the avatar with a text alternative. Derived as `role === 'self'`, since exactly one profile is active and switching (#193) only changes which.
- [x] 13.4 Reserve the tagline line so a row of cards holds its counts on one baseline.
- [x] 13.5 Carry the mockup's remaining card values: `120deg` band, card hover, the body's inset panel on the active card.
- [x] 13.6 Add the page lede above the cards. The always-on explainer stays off the page — the owner ruled it belongs on the birth form.
- [x] 13.7 Full-bleed the profile space's accent band to the white surface's own top edge, rounding to the surface's corners. Container padding and surface radius become variables so the bleed tracks them.
- [x] 13.8 Drop the card preview from the profile space's Settings form — the space's own head is the preview, repainting live as a swatch is picked. The birth form keeps it, passed as a slot.
- [x] 13.9 Hand `params` to the profile space unawaited, so the shell no longer holds a navigation on runtime data.
- [x] 13.10 Re-run the gates.

## 14. Gates — round 1

> Findings by durable ID (severity, `path:line`, citation, reconcile side) are in
> `review.md` Round 1. Resolve each open `Fix now` there before checking it off.

- [x] 14.1 A1+C15+T18 `/accent-lab` ships as an unreferenced, untested public route — delete the directory or adopt it with a task, spec requirement, primitives and tests — resolved — _dropped at adjudication; the lab stays as an undocumented admin/testing surface. Not zero work: `app/(main)/accent-lab/page.tsx` needs an in-file `/* v8 ignore file -- … */` or 14.28 fails. See `review.md` Round 1 § Adjudications._
- [x] 14.2 A2 `ACCENT_PRESETS` is not in the midpoint-hue order the spec SHALLs and task 4.2 claims — resolved — _took the round's second reconcile per the owner: the ordering SHALL is withdrawn and 4.2 reworded, rather than the hand-arranged palette being re-sorted to match it. Midpoint hue was tried during design and read worse; ordering is not spec material._
- [x] 14.3 A3 `acceptance.md`'s tagline-clearing flow contradicts the reserved-line spec and the shipped card — resolved
- [x] 14.4 A5+T22 `getProfileCardsForUser` joins `profile_preferences` without tagging it, and no test pins any read's tag set — resolved
- [x] 14.5 A4 The profile space's head paints a random preset instead of the fallback for an accentless profile — resolved — _dropped at adjudication; the accentless state is transitional and #199 closes it. See `review.md` Round 1 § Adjudications._
- [x] 14.6 A6 Task 4.1 and `design.md` cite a "`review.md` mirage note" that never existed — resolved
- [x] 14.7 A7 The `ProfileCard` view type sits in `lib/data/profile.ts`, not `lib/types.ts` as the change's own requirement SHALLs — resolved
- [x] 14.8 A8 `updateProfileSettings`'s partial-success outcome is implemented and tested but unspecified — resolved
- [x] 14.9 B9 Four cached reads projecting `profiles.name` carry no `cacheTag('profiles')` now that a writer fires it — resolved
- [x] 14.10 B10 The seed's new `accent` catalog row falsifies `profiles-data-model` spec:147 and `LOCALDEV.md`:48 — resolved
- [x] 14.11 B11 `AccentPicker` hand-copies the form-field primitive's label and required-indicator markup — resolved — _filed #313. Not zero work: `AccentPicker` still imports `form-field.css` directly plus a TODO pointing at #313. See `review.md` Round 1 § Adjudications._
- [x] 14.12 B12 A second, weaker `seedItem` helper duplicates the one in `test-helpers.ts` — resolved
- [x] 14.13 B13 `.profile-accent-input` duplicates the repo's `.sr-only` rule declaration-for-declaration — resolved
- [x] 14.14 B14 `AccentPreview` re-implements `ProfileCard`'s head instead of sharing it — resolved — _filed #314; the form's whole shape is placeholder until #199 lands, so there is no work here now. See `review.md` Round 1 § Adjudications._
- [x] 14.15 C17 `boxShadow` concatenates a hex alpha onto `accentDark`, which returns `var(--primary-color)` on the common null-accent path — resolved
- [x] 14.16 C16 19 commented-out rejected presets are interleaved through `ACCENT_PRESETS` — resolved — _dropped at adjudication; the commented presets are the preservation record until the palette settles. See `review.md` Round 1 § Adjudications._
- [x] 14.17 T19 `auth.test.ts:190` still asserts the requirement this change removes — resolved
- [x] 14.18 T21 Delta scenario "Nothing written, nothing invalidated" has no test — resolved
- [x] 14.19 T20 `test/helpers/profile.ts`'s carve-out comment documents a removed requirement — resolved
- [x] 14.20 T23 `not.toHaveAttribute('onclick')` is tautological for any React component — resolved — _reconcile widened per the owner's T25 call: the e2e click-then-assert-URL half is deleted too, so delta scenario "The card body does not navigate" ships with no test at any layer._
- [x] 14.21 T24 `UnknownProfileId_…` duplicates `NonMember_…` and round-trips its mock — resolved
- [x] 14.22 T25 The e2e inert-card assertion is a race-prone absence check with no settle signal — resolved — _dropped at adjudication; superseded by T23, whose reconcile deletes the assertion outright. See `review.md` Round 1 § Adjudications._
- [x] 14.23 T26 The e2e creation test wedges its own Playwright retries on leftover residue — resolved
- [x] 14.24 T27 Both `profile_preferences` cascade scenarios have no test — resolved
- [x] 14.25 `npm run lint` — 0 errors, 1 size warning (`lib/data/profile.ts` at 338 lines, yellow band, tolerated)
- [x] 14.26 `npx tsc --noEmit` — 0 errors
- [x] 14.27 `npm run build` — completed
- [x] 14.28 `npm run test:coverage` — 258 files, 3099 tests passed; 99.92% stmts / 99.06% branch / 100% funcs
- [x] 14.29 `npm run test:e2e` — 62 passed

## 15. Gates — round 2

> Findings by durable ID (severity, `path:line`, citation, reconcile side) are in
> `review.md` Round 2. Resolve each open `Fix now` there before checking it off.

- [x] 15.1 B1 Three cached reads project `profiles.name` through the `purchaserProfile`/`claimerProfile` relations and still tag `items` alone — resolved
- [x] 15.2 T2 `srgbChromaLimit`, `oklchToRgba` and `oklchStopsOf` are exported from `test/helpers/contrast.ts` with no caller — resolved
- [x] 15.3 `npm run lint` — zero errors, one tolerated size warning (`lib/data/profile.ts`, 338 lines, yellow band)
- [x] 15.4 `npx tsc --noEmit` — zero errors
- [x] 15.5 `npm run build` — completes successfully
- [x] 15.6 `npm run test:coverage` — 258 files / 3098 tests passed; 99.92% stmts, 99.06% branch, 100% funcs, 99.97% lines
- [x] 15.7 `npm run test:e2e` — 62 passed
