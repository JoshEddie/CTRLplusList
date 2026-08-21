## Context

See [proposal.md](proposal.md) — Why. What shapes the approach here, beyond it:

- **The design is a mockup, not a description.** The Claude Design *Profiles Flow Prototype* (project `0abb3a4a-a908-46ce-a44f-9fa8e5900c0c`, file `Profiles Flow Prototype.dc.html`) spans #192–#199. `proposal.md` carves out this chunk's share, but the mockup carries layout, spacing and copy no prose artifact reproduces. **Opening it is the first task of implementation**, before any UI is written — an implementation that works from these documents alone will diverge from the design and be worse for it.
- **No transactions.** Managed-profile creation writes two rows across two HTTP round-trips; `2026-08-18-atomic-writes-in-one-cte` already governs the shape.
- **Two capabilities, one feature.** Storage and its constraints belong to `profiles-data-model`; everything a user sees belongs to `profiles-surface`. Several decisions below sit on that seam and say which side they landed on.
- **#193 and #194 follow immediately.** #193 adds profile switching, #194 adds permissions. Several decisions here are deliberately shaped so those two land as additions rather than rewrites.

## Goals / Non-Goals

**Goals**

- Give profiles a front door that stands on its own before switching (#193) or permissions (#194) exist.
- Keep every deferral additive: no affordance ships dead, and no structure ships that #193/#194 must tear out.
- Fix the accent's *invariant* in the spec and leave its *constants* to measurement.

**Non-Goals**

- Narrowing cache tags. Every tag in the app is a static global string; narrowing wants a read → tag → writer audit first ([#309](https://github.com/JoshEddie/CTRLplusList/issues/309)).
- Unifying the two profile writers. `createSelfProfile` stays in `lib/auth.ts` until #199 retires its caller — see `proposal.md`, Deliberately out of scope.
- Any avatar *art*. The card and the identity header carry the mockup's avatar **slot** — the accent-filled disc overlapping the band — and fill it with the initials fallback the brief's §4.5 names as the expected in-between state. #199 puts the Altvatar image inside the same slot; nothing about the card's shape changes when it lands.

## Decisions

### An accent is a named gradient band the palette owns

Each preset carries its own two gradient stops and its own ink, and the stored value is the preset's **name**.

**Alternative — store a hue and derive both stops in `oklch()` at fixed lightness and chroma.** Settled first and reversed mid-implementation. It cannot express the bands the design actually calls for: `--hero-gradient` and every accent in the mockup travel hue as well as lightness (`sun` runs yellow to orange, `ocean` mint to blue), and a single hue renders a colour at two brightnesses, not a journey between two. Fixed lightness also strands most hues in a narrow band of sRGB-reachable chroma, which rendered yellow and orange as olive and mud. Naming the preset keeps the re-branding property the hue was chosen for — change what a name renders as and every profile holding it follows, no stored row rewritten — while letting each band be designed rather than computed.

**Accepted trade-off.** The palette is now data a designer maintains rather than a formula, so a new preset is three authored colours and its legibility is not automatic. Contrast, band separation and midpoint chroma are asserted per preset by a test that walks the palette, and the palette's range is asserted over the table as a whole, so an addition that is illegible, flat or muddy fails without any test being edited.

### Long-travel bands are fudged complements, never exact ones

Bands that cross the wheel are what give the palette range, but a gradient between **exact** complements interpolates through the neutral axis: the midpoint greys out and the swatch reads muddy however vivid its ends are. Measured on the first cut, `tropic` kept 16% of its endpoints' chroma at the midpoint, `bloom` 20%, `sunset` 29% — and all three read visibly dull.

The long-travel presets therefore stop short of true opposites and share a dominant channel, so the middle of the band stays a real colour. A midpoint-chroma floor is asserted per preset, at the threshold below which the effect became visible.

### Travel is deliberately uneven across the palette

A preset that has to read as one colour cannot cross the wheel — travel far enough from red and it stops being red. So the presets that name a colour stay inside their family and earn their life from the depth of the dark stop, while the long-travel bands supply the range.

That unevenness is why the **per-preset** floor measures perceptual distance across lightness, hue and chroma together rather than hue travel alone. Hue is the wrong axis for a single-hue band: it separates by lightness on purpose, so a hue floor would fail exactly the presets meant to read as one colour. What pins the palette's dynamic character is the palette-level assertion instead — enough bands crossing the wheel, asserted over the table rather than of any one preset.

### The palette's order is arranged by eye, not computed

Declaration order in the palette table is swatch order, and the run is arranged by hand.

**Alternative — sort by the hue of each band's midpoint,** the colour a swatch reads as and what an avatar-sized disc averages to. Tried during design and rejected on the swatches themselves: a midpoint hue is a single number standing in for a band that travels, so it puts bands next to each other that do not look adjacent and separates ones that do. What a row of swatches reads as is a judgement no one axis captures, so the order stays authored — and, unlike the invariants, it is left out of the spec entirely rather than fixed to a rule the next palette would have to fight.

### A profile with no accent gets a fallback, not a derived one

**Alternative — derive a preset from the profile id.** Rejected once the birth form began preselecting: the id does not exist while that form is open, so derivation could never serve the case it was invented for, and keeping it for the remaining cases means two mechanisms answering one question.

The fallback is `--hero-gradient`, already in `global.css`. A gradient rather than a flat colour because it must read as *unset* rather than as one more preset — and the brand purple it uses sits close to several presets, so treatment is what separates them, not colour.

It doubles as the resilience path: a preference row lost to a failed write, a bad read, or a delete renders the fallback rather than nothing.

### Atomicity stops at the accent write

The profile row and its `owner` membership go in one CTE; the accent value does not. The criterion is `2026-08-18-atomic-writes-in-one-cte`'s, extended by this change — see `adr.md`. Applied here: a profile with no membership is unreachable by anyone; a profile with no accent is one edit away.

### Editing a profile's identity is owner-only; a manager sees the form disabled

A profile's name, tagline and accent are how it is recognized wherever it appears, so changing them is an ownership act. **Alternative — any member may edit, with #194 tightening later.** Rejected: it would ship a looser rule than the owner intends and make #194 a permissions regression rather than an expansion.

The manager's view is the disabled form rather than a hidden section, because the space is not empty for a manager even in this chunk — the header shows the profile, and #194's Permissions section (who owns and who manages) plus #193's lists are what fill it out. Showing the settings read-only is what makes that page coherent before those land.

### A non-member lands on `/profiles`, not a 404

**Alternative — `notFound()`,** which `/user/[id]` uses for a missing or blocking profile. Rejected in favour of the redirect, which bounces the viewer to the page listing the profiles they *do* run — a useful destination rather than a dead end. A nonexistent id produces the identical response, so the surface still discloses nothing.

### The self-profile card is marked active

There is exactly one active profile at all times and it is the viewer's own, so the mockup's active treatment — the accent painted across the card face, the body held off its edges as an inset panel, and the ✓ badge on the avatar — renders today on the `self` card. #193 makes which card carries it a function of the switcher rather than of the role; it does not introduce the state. An earlier cut deferred the whole treatment to #193, conflating *being* active with *changing* which profile is.

`ProfileCard` derives it as `role === 'self'` rather than taking an `isActive` prop, so no caller can render a page with two active cards or none.

### Cards order self → owned → managed, alphabetical within each run

Owner-only editing turns "owned" versus "managed" into a capability boundary rather than a trivia field. Sorting across it would scatter the cards the viewer can act on among the ones they cannot. **Alternatives** — one flat A→Z run (loses that grouping) or `created_at` ordering (unpredictable as the grid grows) — rejected.

### The card is inert on click, and management lives in the mockup's `⋯` menu, whose row reads "Edit"

The card carries the mockup's `⋯` menu from the start, holding one row today — `Edit <name>` — with Permissions (#194) and "Transfer a list in" (#198) joining it as their chunks land. An earlier cut of this design substituted a single `Edit` link and deferred the menu until it had three rows; that was a divergence from the mockup with nothing behind it, since the menu is *management* and only its later rows depend on later chunks. Deferring it would also have made #194 a change of the card's shape rather than an added row.

The row reads `Edit <name>` rather than the mockup's `Manage <name>` because *managed* already names a kind of profile in this model, so "Manage" on a card labelled `Owner` reads as a statement about the profile rather than as the action. That is a copy substitution inside the mockup's shape, not a substitution *for* it.

Card-click is the one part of the mockup's card that genuinely waits: it *switches the active profile*, and switching is #193. Two precedents exist for the interim — `ItemCard` is a plain `<div>`, `UserCard` is a whole-card `<Link>` — and `ItemCard`'s inert shape is the one that does not ship a dead primary affordance.

### No empty state

`<Empty>`'s spec locks title and description to exact strings branched on a hardcoded `type`, so `type="profile"` would be a MODIFIED requirement rewriting them — and the resulting copy ("No Profiles Found / Create your first Profile below") would be false on a page that is showing you a profile. The mockup's always-on explainer paragraph is likewise not carried: zero managed profiles is structurally impossible, so the explanation belongs on the birth form. The page keeps the mockup's lede, which states what selecting a profile does.

### The tagline line is reserved

`list-metadata` reserves an `aria-hidden` spacer on list cards to hold vertical alignment across a grid, and the mockup reserves the profile card's tagline line the same way (`min-height:17px`), so a row of cards keeps its counts on one baseline. The reserve is the card's own `min-height`, not a separate spacer node — nothing is announced, and there is no second element to keep in step.

An earlier cut dropped the reserve on the reasoning that "nothing in the layout needs it". That is true only of a single card; the grid is what needs it.

### The birth form is an overlay; success navigates and stays quiet

`/lists/new` is a route; item creation is a state overlay. Overlays are the direction the app is moving, and this form has exactly one call site, so there is nothing to intercept — `app/(main)/@modal` stays dormant. #193's inline "New profile…" escape mounts the same component from a second call site, still with no route.

Success navigates into the new profile's space. It has little to offer in this chunk, but it is the shape that stays correct once #193 and #194 fill that page — and a toast raised into a navigation would be discarded, so success is silent and only failure raises one.

The accent picker opens with one preset selected at random, and the accent is required. A fixed opening selection would put every profile whose creator did not change it on one colour, which is the failure the accent exists to prevent; the randomness is unseeded, since the form holds no id to seed from. The Settings form does the same for a profile carrying no accent, re-rolling on each open and writing nothing until submitted — so a dismissed form leaves the profile unset.

### Name is `min 1 / max 60`; duplicates allowed

Lists and items both use `min(3) / max(100)`. The 3-character floor is right for a list title and wrong for a person — "Jo", "AJ", "Bo" are real names. 60 over 100 for the same reason the tagline is 40: the card line is shared with the role label and counts. Duplicates are allowed because profiles are identified by id, and two children with the same first name is a household, not an error.

### Tagline is a column at 40 characters, not a preference

`lists.subtitle` is the precedent at 120, tightened here because a profile card is narrower. The general rule — what earns a column versus a preference row — is the surviving `adr.md` entry; the 40 is this change's. A preference value is generic text keyed by catalog id, so nothing per-preference can carry `notNull` or a check if the tagline ever becomes required.

### Accent lands in #192, not #199

It is authored in #199's customizer and was first routed there. Flipped when the owner ruled it out of the avatar table: with storage in `profile_preferences` the avatar-table latch argument evaporates, and #192 ships avatarless cards, making the accent the only thing distinguishing one faceless card from another.

### `/profiles/[id]` ships now, with no tab chrome

One tab is not a tab strip; #194 adds the sub-nav when Permissions gives it a second destination. **Alternative — a create-only #192** — rejected: a typo'd name would be unfixable until #194, and accent and tagline would be frozen at birth. This ticket builds the infrastructure; the following tickets fill it out.

### Connections stays where it is; a Profiles entry joins it

#183 settled the opposite. Reversed because #298 restructures that surface wholesale, so moving it now moves it twice — and the interim version would need a self-profile-only carve-out on the route, a rule existing purely to paper over deferred work (managed-profile followers are #298's). Cost measured: `app/(main)/settings/` contains *only* `connections/`, so moving it deletes the segment and relocates 8 components and 8 test files.

The popover's rows are ordered identity-first (Profiles, then Connections, then the terminal Sign out) so the menu has an ordering rule that survives #194 and #199 adding entries, rather than appending by arrival date.

### No fifth nav pill

#183 settled "top-level nav page alongside Lists/Items/Purchased". Deferred by the owner: cheap to raise once the feature sees use, while `app-frame` enumerates four pills across three requirements and ~6 scenarios plus the mobile collapse menu.

### Three grandfathered requirements are retired rather than carried forward

Each was made false by this change, and each failed today's bar — asserting a one-time migration state, a codebase state, or nothing observable at all.

- **`profiles-data-model` — "Profile preferences are normalized against a catalog".** Its only scenario asserted that both preference tables are empty once the phase-1 migration completes. This change writes the catalog's first row, and once a later migration inserts one the phase-1 end state is no longer independently observable. Removed, with its durable content (table shapes, cascade rules, feature-owns-its-catalog-row) re-added under a new name.
- **`menu-system` — "ListActionsMenu and UserAvatarPopover migrate to the Menu primitive".** Its third scenario asserted that a grep for retired CSS classes finds nothing "after migration" — a codebase state, not behavior, and unverifiable as a standing contract. Removed, with both wrappers' row enumerations re-added under a composition-framed name.
- **`profiles-data-model` — "Minted profile ids SHALL carry no account id".** Its scenario asserted an id is "opaque" — nothing observable — and that it contains no account's id, a negative substring check against a random string that passes for reasons unrelated to correctness. This change adds a third minting path, making the requirement's own two-path scoping false. Removed with nothing rehomed: "Profiles are first-class rows independent of accounts" already holds that the table carries no reference to the accounts table, and an account-derived id is such a reference.

## Risks / Trade-offs

- **The palette is authored, not computed** → A new preset's legibility, travel and midpoint saturation are a designer's choice rather than a formula's guarantee. Mitigated by asserting all three per preset against the palette table, so a bad addition fails the suite rather than shipping.
- **A stored name can outlive its preset** → Removing a preset from the palette leaves any profile holding that name rendering the fallback rather than breaking. Deliberate: the alternative, a migration that rewrites stored rows on every palette edit, is the cost the named-preset decision exists to avoid.
- **Coarse cache tags** → Every tag is a static global string, so `updateTag('profiles')` busts every user's cached read. Deliberately unchanged; logged [#309](https://github.com/JoshEddie/CTRLplusList/issues/309).
- **A stale comment becomes wrong** → `getBookmarkedListsByUser` in `lib/data/visit.ts` is deliberately uncached on the stated premise that no mutation fires `updateTag('profiles')`. This change makes that premise false. The comment must be corrected; the read stays uncached, because a self-profile name written out-of-band by NextAuth can still go stale.
- **Two profile writers coexist** → `createSelfProfile` and `createProfile` share a shape and not an implementation, until #199 retires the former's caller. Divergence between them is the risk; `proposal.md` states why sharing costs more.
- **Random preselection collides** → Two profiles created in a row can open on the same colour, the more so the smaller the palette. Accepted: the creator sees the selection before submitting and can change it, which a derived default never allowed.
- **A failed accent write is silent** → The profile is created and renders the fallback; no notice is raised. A toast cannot survive the navigation that follows a successful creation, and a "you have no accent saved" banner would misfire on someone who has just picked one — worse if a real bug made it persistent. Revisit as an enhancement once the design shape exists.
- **The manager's disabled form may read as broken** → Until #194 lands Permissions, a manager's profile space is a header and a form they cannot use. Accepted deliberately by the owner as the shape that becomes correct rather than one that has to be undone.
- **Implementation drifts from the mockup** → Mitigated only by reading it first. Recorded here because it has happened before on this map.

## Migration Plan

One additive migration, no backfill and no data movement:

1. `profiles.tagline` — nullable text, NULL for every existing row.
2. One `preferences` catalog row: id `accent`, name "Accent color", type `text` — the stored value is a preset name. The per-profile values table stays empty; every existing profile renders the fallback until it is given an accent.

Rollback is dropping the column and deleting the catalog row — the values table cascades. Nothing reads either before this change's code ships, so migration and deploy are independent.

## Open Questions

- None outstanding. The palette's size, membership and order are a design matter the spec deliberately does not fix — `profiles-surface` asserts the invariants (contrast, stops far enough apart to read as a band, a saturated midpoint, a distinct ink and band per preset, and enough long-travel bands across the palette) rather than the colours or the thresholds, so the palette can grow, be re-coloured or be re-tuned without a spec edit.
