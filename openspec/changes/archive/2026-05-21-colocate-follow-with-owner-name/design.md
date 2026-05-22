## Context

`add-following-and-history` introduced the Follow button on the list-detail hero with an inline disclosure note rendered underneath: _"Shares your name and profile picture with the owner."_ In practice the placement is awkward — three pills sit in `list-hero-actions` (`Share List`, `Follow {owner}`, `Bookmark`), the disclosure dangles below only the middle pill, and the row's subject-coherence breaks (two pills act on the list, one acts on a user). Beyond aesthetics, the `Follow` ↔ `Bookmark` adjacency invites a misread — many products use _follow_ to subscribe to whatever entity the page is about, so a list-page Follow next to Bookmark can read as "follow this list" instead of "follow this user."

The list-hero meta row already shows the owner's name with a person icon, but the name isn't a link. That row is the natural visual anchor for "this list belongs to this user" — the right place to put the Follow affordance.

The disclosure copy itself is correct and worth preserving — following another user does expose your name and profile picture to them, which not every user expects. The fix is to surface it at a more useful moment (first-follow consent), not to remove it.

## Goals / Non-Goals

**Goals:**

- Eliminate the subject-ambiguity between Follow and Bookmark by separating them visually and structurally.
- Make the owner name in the list-detail hero a navigable link to `/user/{owner_id}`.
- Preserve the privacy disclosure as a deliberate consent moment, shown on the viewer's first-ever follow and never again.
- Maintain WCAG 2.5.5 touch-target sizing — the Follow button stays a full-size button in both list-hero and profile contexts.

**Non-Goals:**

- Linkifying the owner name on other surfaces (list cards, bookmark rails, feed entries). Out of scope; possibly worth a follow-up but explicitly not this change.
- Redesigning Bookmark or Share. They stay as they are; we're only changing what shares the row with them.
- Reworking the profile-page Follow surface. It already has room for the inline-or-dialog distinction — design D5 below decides whether the profile keeps inline copy or also adopts the dialog.
- Auto-following or unfollowing migration. The new column is purely additive.

## Decisions

### D1 — New hero layout

**Decision:** Restructure the list-hero meta row so the owner's identity gets its own visual sub-row containing the linked name plus the Follow affordance. Date and occasion stay on the existing meta row. Action row keeps only list-actions.

```
┌──────────────────────────────────────────────────────────────────────┐
│  Hank & Spouse's Anniversary       10 years!                         │
│                                                                      │
│  👤  Hank Example →   [+ Follow Hank Example]                       │
│  📅  May 20, 2026   [Anniversary]                                    │
│  ──────────────────────────────────────────────────────────────────  │
│  [Share List]                                          [Bookmark]    │
└──────────────────────────────────────────────────────────────────────┘
```

**Why:** The Follow button is full-size (WCAG 2.5.5, decision D6); inlining it with the compact 13px meta chips would crowd them and create an uneven baseline. Giving the byline its own sub-row lets Follow occupy its natural height without disturbing the date/occasion chips. The linked name + Follow sit visually adjacent so the affordance's subject is unambiguous.

**Alternatives considered:**

- _Single meta row with Follow inline._ Forces either shrinking Follow (violates D6) or stretching the row vertically and misaligning the date chip with the date icon. Rejected.
- _Follow on its own row beneath the action row._ Keeps the action row clean but separates Follow from the name, partially defeating the colocation goal. Rejected.
- _Move Follow to a `list-hero-side` slot on the right._ Available when the owner views their own list (visibility picker), but for non-owners the side is empty. Could work but breaks alignment with the linked name on the left. Rejected for symmetry.

### D2 — Disclosure presentation: one-time confirm dialog

**Decision:** Replace the inline disclosure with a modal dialog shown the first time a viewer attempts to follow anyone. Dialog content:

> **Follow {owner-name}?**
>
> Following someone shares your name and profile picture with them.
>
> [ Cancel ] [ Follow ]

On confirm, the follow proceeds and `users.follow_disclosure_acknowledged_at` is set to `now()`. On cancel, no follow occurs and no acknowledgement is recorded. After acknowledgement, subsequent Follow clicks act immediately with no dialog.

**Why:** The inline note achieves "make the privacy consequence visible," but ambient noise doesn't equal informed consent — a user can click Follow without ever reading the note. A modal forces attention at exactly the moment the action matters, and only once per user. After acknowledgement, the dialog becomes friction without value, hence the one-time semantics.

**Alternatives considered:**

- _Keep inline disclosure, just move it._ Solves the dangling-tail layout issue but doesn't address the "users don't read ambient text" problem. Rejected.
- _Tooltip on the Follow button (`aria-describedby`)._ Improves layout but worsens disclosure — tooltips on touch devices require a hover-equivalent gesture most users don't perform. Rejected.
- _Show the dialog every time._ Heavy-handed; the disclosure is informational, not transactional. Rejected.
- _Show the inline note AND the dialog._ Belt-and-suspenders without payoff. Rejected.

### D3 — Tracking "first follow": derive from `user_follows` row count

**Decision:** No new column or acknowledgement field. The signal "should we surface the dialog?" is derived at read time as `count(user_follows where follower_id = viewer) === 0`. When the viewer has zero follows, the dialog opens before `followUser` is called. The act of following someone naturally moves them past the zero-count threshold, which suppresses the dialog on every subsequent follow.

**Why:** Smallest possible footprint — zero schema change, zero new server actions, zero backfill question. The "did this user see the disclosure?" question collapses to "do they have a follow relationship?", which the existing `user_follows` table already answers authoritatively. Persistent across devices and sessions (it's server data). Existing followers automatically skip the dialog (their count is already > 0), which is the desired no-friction-for-existing-users outcome.

**Trade-off accepted:** A viewer who unfollows every user they follow and then follows someone new will see the dialog a second time. This is a small re-friction in a niche edge case; not worth a dedicated column.

**Alternatives considered:**

- _Dedicated nullable timestamp column `users.follow_disclosure_acknowledged_at`._ Strictly more precise — survives the unfollow-everyone-then-refollow edge case and would let us later answer "when did this user accept?". Cost: schema migration, new server action `acknowledgeFollowDisclosure()`, DAL plumbing, backfill question for existing users. **Rejected** as overbuilt for the actual ambiguity (one edge-case re-prompt vs. weeks of integration cost). Re-evaluate if the edge case turns out to be common.
- _`localStorage` flag._ Cheap, but resets on cache clear or new device. A privacy-affecting prompt re-appearing because the user opened a private window is a regression in trust. Rejected.
- _Store the acknowledgement in the session cookie._ Survives only as long as the session. Rejected.

### D5 — Profile-page Follow disclosure

**Decision:** The profile page (`ProfileHeader.tsx`) also uses the dialog, not an inline note. After this change, `FollowButton` never renders disclosure text inline — the consent dialog is the single source of disclosure.

**Why:** Two sources of truth for the same disclosure is a maintenance hazard. The dialog wraps `FollowButton` at one level up; both list-hero and profile-header callers get the same gating for free. The profile page has more room than the list hero, but "more room" isn't a reason to keep a worse pattern.

**Alternatives considered:**

- _Keep inline disclosure on profile, dialog on list hero._ Two patterns, two test surfaces, easy to drift. Rejected.
- _Dialog only on list hero; profile-only Follow has no disclosure._ Plausible (profile-page follow is a more deliberate act), but breaks the "first-time follow" semantic — a user who first-follows on a profile page would never see the disclosure. Rejected.

### D6 — WCAG sizing

**Decision:** Follow button keeps the full button styling used in `list-hero-actions` today (≥44pt touch target via padding). Do not shrink it for the meta row. The meta row layout (D1) accommodates the button's full height by giving it its own sub-row.

**Why:** WCAG 2.5.5 (Target Size, AAA — 44×44 CSS px) is the user-stated constraint. WCAG 2.5.8 (Target Size Minimum, AA in 2.2 — 24×24) would technically permit a smaller chip, but the user has chosen the stricter bar. Hero pills already satisfy 44×44 via padding; reusing them is free.

### D7 — `FollowButton` API change

**Decision:** `FollowButton` becomes a bare button — no `.follow-button-wrap`, no `.follow-disclosure`. The disclosure-gating responsibility moves to a wrapper component (`FollowContainer` already exists; extend it). The wrapper:

1. Reads `viewerHasAnyFollows: boolean` for the viewer (server-side prop threaded through, derived from `count(user_follows where follower_id = viewer) > 0`).
2. Renders `<FollowDisclosureDialog>` as a controlled modal.
3. On `FollowButton`'s `onClick`, if `viewerHasAnyFollows === false` and `following` is currently `false`, opens the dialog instead of calling `followUser` directly.
4. On dialog confirm, calls `followUser`. Once that returns success, no separate acknowledgement write is needed — the inserted `user_follows` row is itself the signal that flips `viewerHasAnyFollows` on next render.
5. On dialog cancel, closes the dialog with no side effects.

**Why:** Single-responsibility — `FollowButton` is the button; the wrapper handles the conditional consent gate. This also lets us drop the column-flex markup entirely so the bare button drops cleanly into either layout (list-hero meta row, profile header).

### D8 — No new server action

**Decision:** `followUser` and `unfollowUser` are unchanged. There is no `acknowledgeFollowDisclosure()` action. The dialog is a pure client-side interpose: it gates the call to `followUser` and writes nothing on its own.

**Why:** With the derived-from-count approach (D3), there's nothing to record. The follow row itself is the acknowledgement.

**Race-condition note:** A viewer with `viewerHasAnyFollows = false` in tab A and tab B who follows someone in tab B, then clicks Follow in tab A, will see the dialog in tab A because the boolean was server-rendered when tab A loaded. They confirm and the follow proceeds. They've seen the dialog once "extra." Acceptable — same outcome as the unfollow-everyone-then-refollow edge case from D3.

## Risks / Trade-offs

- **Coordination with `add-following-and-history`.** Ordering is fixed: this change finishes before `add-following-and-history` archives. The in-flight change's `specs/following/spec.md` is edited in place (within this change's tasks) to remove the inline-disclosure requirement and the list-pages-affordance requirement (this change owns the latter going forward). Tasks 15.6, 15.7 (CSS sub-part), and 16.9 in `add-following-and-history/tasks.md` get a `~~superseded~~` annotation so the historical record stays legible without re-flowing task numbers.
- **Linkifying only the list-detail hero owner name** creates a small inconsistency across surfaces (list cards' owner attribution still won't link to the profile). Mitigation: explicit non-goal, easy follow-up. The alternative — linkifying everywhere in one change — would balloon scope and require auditing several rail components.
- **Dialog as the only disclosure path** depends on the dialog being unmissable. A user who clicks Follow rapidly may dismiss the dialog reflexively without reading. Mitigation: the disclosure copy is one short sentence; the dialog requires an explicit click — no auto-close, no "press anywhere to confirm" UX.
- **Unfollow-everyone-then-refollow re-prompts the dialog.** Accepted (D3 trade-off). Niche enough that adding a column to suppress it is overbuilt.
- **Existing followers never see the dialog.** Side effect of the derived-from-count signal: anyone with ≥1 follow row at the moment this change ships counts as "past first follow" and is never prompted. Defensible — the inline disclosure shipped in `add-following-and-history` was presumably visible to them at their original follow; we're not silently losing consent, we're refining how new users get it.

## Migration Plan

1. **DAL helper** — add (or extend) a query in `lib/dal.ts` that returns `viewerHasAnyFollows: boolean` for the current viewer. Likely a `select exists (select 1 from user_follows where follower_id = $viewer)`.
2. **Dialog component** — `FollowDisclosureDialog.tsx`. Reuse the app's existing modal primitive (find which one and reuse — design.md ought to name it, but the audit happens in tasks step 3.1).
3. **`FollowContainer` extension** — add the gating logic (D7). `FollowContainer` becomes the client-rendered component; the existing async server component shape may need a small split (server fetches `viewerHasAnyFollows`, client renders the gate).
4. **`FollowButton` strip-down** — remove `.follow-button-wrap` and `.follow-disclosure` markup; component renders a bare `<Button>`.
5. **`ListDetails` restructure** — split the meta row into byline-sub-row + meta-sub-row (D1); linkify the owner name; mount `<FollowContainer>` in the byline sub-row; remove `<FollowContainer>` from `list-hero-actions`.
6. **CSS** — delete `.follow-button-wrap` and `.follow-disclosure` from `following-and-history.css`; add `.list-hero-byline` (or equivalent) for the new sub-row layout; ensure mobile wrap behavior is correct.
7. **Verification** — preview-verify via the dev-auth bypass: as `dev-test-viewer` (who is seeded with existing follows, so will skip the dialog — see verification task for the zero-follow path).
8. **Manual a11y check** — confirm dialog is focus-trapped, has correct ARIA role, ESC dismisses, focus returns to the trigger on close.

**Rollback:** revert the commit. No schema state to undo.

## Open Questions

- _Which modal primitive does the app already use, and does it satisfy our a11y requirements?_ — Audit in tasks step 3.1 before implementing `FollowDisclosureDialog.tsx`. If none exists, build one inline to this change rather than introducing a generic modal abstraction.
- _Where does the `viewerHasAnyFollows` fetch live?_ — A per-render server fetch in `FollowContainer` is correct (the value can flip mid-session, the moment the viewer follows someone). Session caching is _not_ appropriate here — it would let a stale `false` persist after a successful follow. A simple `EXISTS` query is cheap.
- _Mobile layout for the byline sub-row_ — at very narrow widths, "Hank Example → [+ Follow Hank Example]" may need to wrap with the Follow button dropping to its own line. Confirm during preview verification.
- _Verification path for the dialog_ — `dev-test-viewer` is seeded with existing follow relationships, so the dialog won't appear for them by default. Verifier options: (a) temporarily delete the seeded `user_follows` rows for `dev-test-viewer` before testing, (b) sign in as one of the other seeded users that has no outbound follows, (c) add a dedicated "zero-follow viewer" to the seed script. Decide during verification.
