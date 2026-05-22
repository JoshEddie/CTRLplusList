## Why

The list-detail hero's action row mixes a user-action ("Follow {owner}") with two list-actions ("Share List", "Bookmark"). The three render as identical pills, and `Follow` carries an inline disclosure ("Shares your name and profile picture with the owner.") that dangles under only one of the three peers, breaking the row's rhythm. Worse, **the affordance "Follow" sitting next to "Bookmark" is genuinely ambiguous** — many products (Spotify, GitHub, Pinterest) use _follow_ for the surrounding content entity. A skimming user can plausibly read the row as "Follow this **list**" rather than "Follow this **user**." The disclosure (a privacy-affecting consequence) is part of the same component but doesn't visually anchor to its subject.

The owner's name in the meta row (e.g., "Hank Example") shows the identity but isn't a link, so users can't navigate to the profile to follow from there either. The result: Follow's subject is invisible in the affordance row, and the natural anchor for "follow this user" — the owner's name — is inert.

## What Changes

- **Move the Follow affordance out of `list-hero-actions`** and colocate it with the owner's name on the list-detail hero. The action row becomes purely list-actions (Share List, Bookmark) and stops conflating subjects.
- **Render the owner's name as a link** to `/user/{owner_id}` on the list-detail hero only. Other surfaces where the owner name appears (list cards, bookmarks rails, etc.) are explicitly out of scope and stay as-is.
- **Replace the inline `.follow-disclosure` note with a confirmation dialog** triggered when the viewer has zero existing follow rows. The dialog states what the action shares ("Following {owner-name} shares your name and profile picture with them.") and offers Cancel / Follow. Once the viewer has any followed user, the dialog never appears again — subsequent Follow clicks act immediately. The "have they seen this before?" signal is derived directly from `count(user_follows where follower_id = viewer) > 0`; no new column or acknowledgement field is added. **Trade-off accepted:** a viewer who unfollows everyone and then follows again will see the dialog a second time.
- **`FollowButton` stays full-size** in both contexts (list hero meta row, profile header) to satisfy WCAG 2.5.5 touch-target sizing. The list hero meta row layout adjusts so the full-height button doesn't crowd compact metadata — Follow renders on its own row directly under the byline, not inline with the date/occasion chips.
- **Remove the `.follow-disclosure` element and `.follow-button-wrap` column flex** from `FollowButton`. The component renders a bare button; the dialog lives at a higher level (client-rendered modal opened by a wrapper that decides whether to show it based on `users.follow_disclosure_acknowledged_at`).

## Capabilities

### Modified Capabilities

- `following` — the disclosure mechanism switches from "inline note" to "one-time confirm dialog"; the follow-affordance location requirement on list pages tightens to "colocated with the linked owner name" rather than "rendered prominently on the list page."

### New Capabilities

_None._ This refines an in-flight capability, it doesn't introduce a new one.

## Impact

- **Files touched (estimate, ~6):**
  - `app/(main)/lists/ui/components/ListDetails.tsx` — restructure hero meta row; render owner name as `<Link>`; mount `<FollowContainer>` adjacent to the name; remove Follow from `list-hero-actions`.
  - `app/(main)/users/ui/components/FollowButton.tsx` — strip `.follow-button-wrap` + `.follow-disclosure` markup; expose a `beforeConfirm` hook (or a sibling wrapper) so callers can interpose the disclosure dialog.
  - **New** `app/(main)/users/ui/components/FollowDisclosureDialog.tsx` — modal owned by the wrapper that gates the first-follow case.
  - **Extended** `FollowContainer.tsx` — reads `viewerHasAnyFollows` (derived from `count(user_follows where follower_id = viewer) > 0`); when `false`, interposes the dialog before calling `followUser`.
  - `app/(main)/lists/ui/styles/list.css` — meta-row layout adjustments; new selector for the owner-link affordance.
  - `app/(main)/lists/ui/styles/following-and-history.css` — remove `.follow-button-wrap` / `.follow-disclosure` rules (or scope to profile-page only if that surface keeps the inline column shape; design.md decides).
  - `lib/dal.ts` — small helper that returns `viewerHasAnyFollows: boolean` for the current viewer (or extend an existing helper).
- **No DB migration.** No schema change. The "first follow?" signal is derived at read time from the existing `user_follows` table.
- **No new server actions.** `followUser` / `unfollowUser` are unchanged; the dialog is purely a client-side interpose.
- **Coordination with `add-following-and-history`**: that change is in-progress (82/107 tasks) and currently owns the "inline disclosure" requirement plus the "list pages SHALL expose a follow affordance" requirement. **This change finishes before `add-following-and-history` is archived.** Therefore:
  - Spec deltas in this proposal are written as `ADDED Requirements` to a yet-to-exist `following` capability. Archiving this change creates `openspec/specs/following/spec.md` with the colocated list-pages-affordance requirement and the first-follow-dialog requirement.
  - As part of this change's tasks (section 10), the in-flight `add-following-and-history` change is edited in place: its `specs/following/spec.md` drops the now-superseded `Follow button SHALL include an inline disclosure` requirement and its `List pages SHALL expose a follow affordance for non-owner viewers` requirement (colocate owns the latter going forward). Its `tasks.md` items 15.6, 15.7 (CSS sub-part), and 16.9 — which built and verified the inline disclosure — get a strikethrough/superseded annotation so the historical record stays legible; the task numbering is not re-flowed.
  - When `add-following-and-history` later archives, its remaining `ADDED Requirements` (followUser/unfollowUser, profile pages, connections page, name-storage, block flow, etc.) merge cleanly into the now-existing `following` capability.
- **No behavior change for existing followers.** Anyone with ≥1 existing follow row never sees the dialog — the derived signal evaluates to "already past first follow" for them. (Conversely, anyone who hasn't followed anyone yet sees it on their next follow, which is the intended behavior.)
