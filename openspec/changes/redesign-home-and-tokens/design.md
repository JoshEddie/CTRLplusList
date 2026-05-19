## Context

The four-rail digest just shipped in `add-following-and-history`. A Claude Design pass produced a locked-in visual direction (handoff bundle in chat transcript, design file `Ctrl+List Homepage.html`). The mockup uses a card-on-gradient pattern at every breakpoint: a dark gradient nav, a white card with rounded top corners floating on the gradient with the gradient visible as a margin on the sides, and horizontally-scrolling rails of compact list cards inside the white card.

Today's `global.css` declares ~7 color custom properties and a max-width — no spacing, type, radius, elevation, or motion tokens. Each feature folder writes raw values into its own CSS file. The user's durable preference (saved in memory) is to **reuse existing `--<role>-color` variables wherever the mockup's value matches that role**, and only introduce new tokens when the design demands a value with no existing analog. This design respects that.

The in-flight gradient brand colors (`--primary-color #7324ce`, `--secondary-color #2264c1`) remain the brand and continue to drive buttons, links, the visibility-picker active state, etc. The page-frame gradient is a **separate, darker** treatment (`rgb(37, 25, 78) → rgb(26, 37, 84)`) chosen by the user after the initial mockup felt too saturated. It does not derive from the brand colors.

## Goals / Non-Goals

**Goals:**
- Make this the **governing change** for the site-wide visual revamp. Establish the token layer, app frame, and home pattern that every other page consumes.
- Make the digest the actual home (`/`) and give it a persistent, branded frame so subsequent pages inherit the same chrome without re-deriving values.
- Capture every non-mappable design value as a named token in `global.css` once, so re-skinning the rest of the site is a token-substitution exercise rather than a re-derivation.
- Move "My Lists" out of the digest URL into its own dedicated page at `/lists`, closing the dead-link gap left by the digest's `seeAllHref="/lists/all"`.
- Replace the rail grid with a horizontal-scrolling row that works identically across desktop and mobile.
- Add a `subtitle` field to lists so family/group context can live on its own line instead of being baked into the list name.
- Define a **staged rollout** for the remaining `(main)/` pages, with explicit checkpoints between stages and flags for which stages will require a dedicated Claude Design session before implementation.

**Non-Goals:**
- **Skipping** the rest of the site. The revamp is intentionally site-wide; the only question is *when* each page lands, not *whether*. The proposal's "Out of scope" framing in earlier drafts was wrong.
- Implementing every page in this single change. Stages 0–2 (Foundation, App Frame, Home + My Lists) land here; Stages 3–8 are tracked here but their per-page implementation may execute in this change or spin out into follow-up changes depending on the checkpoint decision and whether a Claude Design session is required.
- Auto-parsing existing list names into `name` + `subtitle`. The migration is purely schema-additive; backfill is left to the user via the edit form.
- A theme-switching mechanism. The token names are role-named, which keeps the door open, but dark mode is not delivered here.
- Touching the `add-following-and-history` capabilities (`following`, `list-visibility`, `visit-history`) — this change only modifies `home-digest` and adds `app-frame` + `list-metadata`.
- Re-skinning `(auth)/` pages. They live outside the frame; their treatment is decided at the Stage 8 checkpoint.

## Decisions

### D1. Route shape: digest at `/`, My Lists at `/lists`

**Decision:** Move `HomePage` (the four-rail digest) to render at `/`. Repurpose the `/lists` URL as the dedicated **My Lists** page. Delete the planned `/lists/all` route and update `seeAllHref` accordingly.

**Why:** The mockup's nav has **Home** as a distinct active tab, and the design chat made it explicit: *"I'm going to convert this page into home and make lists a separate page."* A URL named `/lists` whose primary content is rails of *other* people's lists, bookmarks, and history is a tiny but real lie users will feel. Putting the digest at `/` makes the nav honest and lets `/lists` be the natural destination from the My Lists rail's "See all".

**Alternatives considered:**
- *Keep digest at `/lists`, create `/lists/all` for My Lists* — the original structure planned by `add-following-and-history`. Rejected: leaves `/lists` semantically misleading, makes the "See all" URL awkward.
- *Digest at `/home`, `/` is a marketing landing* — rejected: the app is auth-gated; signed-in users land at `/` and there's no marketing landing to preserve. Adds a redirect hop for no benefit.

**Routing detail:** With Next.js App Router, the cleanest placement is `app/(main)/page.tsx` so the digest inherits the `(main)/layout.tsx` frame. `app/page.tsx` is left absent (or is the signed-out fallback if one is added later); auth redirects handle the signed-out case as they do today.

### D2. App frame in `(main)/layout.tsx`, not in each page

**Decision:** Render the gradient nav and white-card frame from `app/(main)/layout.tsx`. Per-page `<Header>` continues to render inside the white surface for page titles and CTAs.

**Why:** Every authenticated route already shares `(main)/layout.tsx`, and the frame is invariant across pages — same nav, same white-card-on-gradient. Putting it in the layout makes the chrome free for every existing and future page in the group. The current per-page `<Header>` is unaffected: it occupies the top of the white-card content, exactly where it does today.

**Alternatives considered:**
- *Render the frame in `MainShell`* — `MainShell` is a client component that branches on `pathname` for the `container--list-details` variant. Adding the nav there pulls more weight into client land than necessary. The layout is a server component and is the right seam.
- *Render the frame per-page* — would mean duplicating it across `lists/page.tsx`, the new `/`, `/items`, `/purchased`, etc. Rejected as obvious churn.

### D3. Token strategy: reuse-first, role-named residue

**Decision:** Add only the tokens the mockup needs that don't match an existing variable's role. Name new tokens in the existing `--<role>-color` style (e.g. `--heading-text-color`, not `--ink`). Reuse `--primary-color`, `--secondary-color`, `--light-color`, `--secondary-background-color` wherever the values match their existing role.

**Mockup → existing variable mapping:**

| Mockup value | Role in mockup | Existing var | Action |
|---|---|---|---|
| `#7324ce` | brand purple (used by gradient, accents) | `--primary-color` | reuse |
| `#2264c1` | brand blue (gradient, accents) | `--secondary-color` | reuse |
| `#ffffff` | card surface | `--light-color` | reuse |
| `#f5f5f8` | occasion chip background | `--secondary-background-color` (`#f5f5f5`) | reuse (within 2/255) |

**New tokens (no existing analog):**

```css
--page-frame-gradient: linear-gradient(120deg, rgb(37, 25, 78) 0%, rgb(26, 37, 84) 100%);
--heading-text-color: #1a1a2e;          /* Crimson Pro titles + card names — distinct from --neutral-text-color (#1f2937) */
--subtitle-text-color: #aaaaaa;          /* card subtitle */
--meta-text-color: #bbbbbb;              /* occasion chip text, chevron */
--date-text-color: #cccccc;              /* card date, empty-state copy */
--divider-color: #f0f0f8;                /* 1px divider between rails */
--card-border-color: #ebebf5;            /* card resting border */
--card-border-hover-color: #d4baf5;      /* card hover border */
--card-hover-background-color: #fafaff;  /* card hover surface */
--card-shadow: 0 2px 8px rgba(0,0,0,0.06);
--card-shadow-hover: 0 6px 24px rgba(0,0,0,0.10);
--surface-shadow: 0 -8px 40px rgba(0,0,0,0.18);  /* white card top shadow */
```

**Why role-named, not scale-named:** Matches the existing convention (`--primary-text-color`, `--contrast-text-color`, `--danger-text-color`). A 3-step muted ramp under scale names (`--muted-1/2/3`) would be flexible but invites misuse; role names lock intent and read clearly at the call site.

**Why `--page-frame-gradient` is a composed value (not two endpoint vars):** It's only ever used as a single gradient. Splitting it into `--gradient-start` / `--gradient-end` would create two tokens that have no meaning apart from each other.

**`body::before` consolidation:** Today `body::before` builds a dark gradient ad-hoc from `--primary-color-transparent` over `--secondary-color-transparent` over black. Rewrite it to use `--page-frame-gradient` directly. `--primary-color-transparent` and `--secondary-color-transparent` are kept (they may be used elsewhere).

### D4. Cards: horizontal scroll, no hover lift

**Decision:** Each rail body is a single horizontal-scrolling row (`overflowX: auto`) of fixed-width cards. Hover changes only background tint, border tint, and shadow — no `translateY`.

**Why:** The mockup is explicit on both. The grid layout the current build uses doesn't scale to small viewports without wrapping awkwardly, and the user specifically requested the design work on mobile. The hover lift was removed in the design chat after it clipped against the scroll container's `overflow-x: auto` boundary.

**Card widths by breakpoint:** 236px (default), 260px (≥1700px wide outer container), 190px (mobile, when content padding compacts).

**Alternatives considered:**
- *Responsive grid with `auto-fill, minmax(220px, 1fr)`* — what we have today. Rejected: doesn't match the design; rails of 5 lists wrap to a second row on common widths.
- *Snap scrolling* — could add `scroll-snap-type: x mandatory` later, but the mockup doesn't ship it. Defer.

### D5. `lists.subtitle` — additive, nullable, no backfill

**Decision:** Add `lists.subtitle text NULL` in a single additive Drizzle migration. Render `subtitle` in the card and on the My Lists page when present; render nothing in the slot when null. Provide a subtitle input on the list edit form. No data migration — existing rows keep `subtitle = NULL` and continue to render with name only.

**Why:** The mockup data carries "Brandy Family" / "Josh Family" as a secondary line distinct from the list name. Today users encode the same idea inside the name itself ("Josh's Christmas List 25"). A nullable column lets the UI render cleanly when present without forcing a backfill or asking the user to manually rename every existing list before the change ships.

**Alternatives considered:**
- *Derive subtitle from owner relationship* — fragile; the value is editorial (e.g. "Brandy Family" isn't necessarily the owner's name).
- *Auto-parse `name` into `name` + `subtitle`* — heuristic, error-prone, and irreversible without storing the original. Rejected.
- *Skip subtitle entirely for this change, render name only* — the design specifically requested it ("Taking those Brandy Family, Josh Family details into the subtitle"). Skipping would invalidate part of the design.

### D6. Nav active state, mobile collapse

**Decision:** Active nav item is computed from `pathname`. Mobile nav drops the pill row entirely — only logo and avatar remain. The four primary nav items (Home, Lists, Items, Purchased) are visible on widths above the existing `nav-hide` breakpoint (`@media (max-width: 800px)` per `global.css`).

**Why:** Reuses the existing `nav-hide` utility class already wired up in `global.css`. Avatar becomes the mobile entry point to navigation that doesn't fit in the bar (settings, profile, etc.) — same pattern the existing app already uses.

### D7. Staged rollout with checkpoints; design sessions are stage-gated

**Decision:** Implement the visual revamp in eight stages (Foundation → App Frame → Home + My Lists → List Collections → List Interior → Items → Purchased → Settings + Profile → Auth). Each stage ends with a **checkpoint** where the user reviews completed work before the next stage begins. Stages flagged as needing a Claude Design session pause for that design pass before any implementation tasks within the stage start.

**Why staged, not big-bang:** A site-wide redesign touched in a single PR is unreviewable, hard to revert in pieces, and forces design decisions on pages that aren't ready yet (e.g. the list-interior page needs its own design pass and can't just inherit the home pattern). Staging lets the foundation prove out, gives the user a natural point to revise direction, and lets design sessions happen *just-in-time* for the page being worked on.

**Why a single governing change instead of one change per stage:** The token layer and app-frame requirements are global contracts that every page depends on. Putting them in one change with one set of spec deltas keeps the contract canonical. Implementation work for individual stages may still spin out into separate changes if a stage produces meaningful new spec deltas (e.g. a redesigned list-interior page might introduce a `list-detail-layout` capability of its own); that decision is made at the checkpoint, not in advance.

**Per-stage checkpoint protocol:**
1. Verify previously-completed stages still render correctly (visual smoke pass on already-skinned pages).
2. Review the next stage's scope. If the stage is flagged "Claude Design session required," open the session before opening any code.
3. Decide: continue within this change, OR spin the stage out into a new OpenSpec change (and update this change's tasks to mark the stage as deferred).

**Stage-by-stage notes:**
- Stages 0–2 (Foundation, App Frame, Home + My Lists): no design session needed; the design bundle covers them.
- Stage 3 (List Collections — bookmarks, history, following): likely reuses the home rail card. Design session optional, decided at the Stage 2 checkpoint.
- Stage 4 (View / Browse — `/lists/[id]`, `/items`, `/items/[id]`, Purchase modal): design session **required**. This stage births the item card/row primitive in the presence of both read contexts (inside a list and in the library) plus the list-as-container chrome and the item detail layout.
- Stage 5 (Create / Manage — `/lists/new`, `/lists/[id]/edit`, `/lists/[id]/choose-items`, item form, image-search modal): design session **required** but narrower. The item primitive is locked by Stage 4; this session resolves list/item form patterns, the selection chrome layered onto the items picker, and the image-search modal.
- Stages 6–7 (Purchased, Settings + Profile): design session **required** before implementation, but each may reduce to reusing primitives established in earlier stages.
- Stage 8 (Auth): outside the `(main)/` frame; treatment decided at checkpoint, may be deferred entirely.

**Why Stage 4 / Stage 5 is split by user mode, not URL prefix:** The original sequencing grouped Stage 4 around the `/lists/*` URL tree and Stage 5 around `/items/*`. That cuts against the actual component dependency — `/lists/[id]` renders items via the same primitive `/items` uses, and `/lists/[id]/choose-items` is the items library with a selection state layered on top. Designing the item primitive in `/items` *after* it has already shipped inside `/lists/[id]` either forces double-design or commits Stage 4 to an item treatment that wasn't designed in its library context. Splitting by user mode (view vs. manage) instead means the item primitive is designed once, against both read contexts, and Stage 5 inherits it. List forms (`new`, `edit`) and item forms cluster naturally into the manage stage. The choose-items route lands in Stage 5 because its visual increment over the items library is selection chrome, not a new item primitive.

### D8. Sequencing: depends on `add-following-and-history` archival

**Decision:** This change is intentionally drafted against the post-archive baseline. It will not pass `openspec validate` until `add-following-and-history` is archived, because it modifies `home-digest` (a capability that change introduces).

**Why:** The alternative — folding the redesign into `add-following-and-history`'s remaining 15 tasks — bloats a feature change with styling decisions, conflates spec deltas, and makes review and revert harder. The clean ordering is: finish + archive the feature, then this change applies on top.

## Risks / Trade-offs

- **[Visual regression on non-redesigned pages]** → The new tokens change `body::before` and add new variables, but every existing page's CSS continues to consume the unchanged `--primary-color`, `--secondary-color`, `--light-color`, etc. Net visual change on out-of-scope pages should be limited to the body background (which goes slightly darker/cooler). Mitigation: visual smoke pass on `/lists/[id]`, `/lists/new`, `/following`, `/settings/*`, `/items/*`, `/purchased/*` after the global.css change lands and before merging.
- **[Subtitle migration leaves the field dormant for most rows]** → All existing lists render with `subtitle = NULL`, identical to today. The feature is opt-in: only newly created or edited lists will populate it. Acceptable — no data loss, no forced rename, low-risk additive migration.
- **[Horizontal scroll on touch is gesture-only]** → No visible scroll affordance other than the row clipping at the edge. The user explicitly accepted this in the design chat. Mitigation: rely on touch momentum on mobile (HTML default); on desktop the rail card width and gap let users see the next card half-clipped, which is the standard affordance.
- **[Breaking the `/lists` URL]** → External links pointing at `/lists` now land on My Lists, not the digest. The digest is at `/`. No external integrations are known to deep-link `/lists`; in-app links are updated as part of this change.
- **[Layout-rendered frame interferes with auth-gated routes that skip the frame]** → All routes in `(main)/` are auth-gated and want the frame, so this is fine. Future routes that want to opt out of the frame would need to live outside `(main)/`. Acceptable constraint.

## Migration Plan

1. **Wait for `add-following-and-history` to archive.** Verify with `openspec list --json` that the change is no longer active and `openspec/specs/home-digest/spec.md` etc. exist in baseline.
2. **Land the schema migration first** in its own commit (`lists.subtitle text NULL`). The column is additive and harmless if the rest of the change rolls back.
3. **Land the token layer** (`global.css` additions + `body::before` rewrite) in a second commit. Verify the non-redesigned pages still render correctly.
4. **Land the app frame + route move** as a third commit. This is the visually disruptive step. Verify nav active state on each route, the white-card frame, the gradient bleed on the sides, the rounded top corners on mobile.
5. **Land the rail re-skin + new My Lists page + subtitle UI** as a fourth commit.

**Rollback:** Each commit reverts cleanly. The migration is additive (no down-migration needed beyond `ALTER TABLE lists DROP COLUMN subtitle`). The route move is the only structurally destructive step; rolling it back restores the digest at `/lists`.

## Open Questions

- **Should the occasion chip be on by default, or off?** The design chat had the user "debating getting rid of those altogether." This proposal keeps the chip rendering by default with the existing neutral-gray treatment (`--meta-text-color` on `--secondary-background-color`). The `showOccasion` tweak from the design's tweaks panel is not wired to a real user setting in this change — defer to a follow-up if the user decides to make it user-configurable.
- **Should the "Items" and "Purchased" nav pills link to existing routes or to placeholder pages?** Both routes exist under `(main)/`. This change wires Home → `/`, Lists → `/lists`, Items → `/items`, Purchased → `/purchased`. If either route is empty or pre-redesign, the nav still links to them; their visual treatment is out of scope.
- **Avatar menu interaction?** The mockup renders an inert avatar circle with initials. This change ships the same — a static avatar with initials. The dropdown menu (settings, sign out, profile) is a follow-up.
