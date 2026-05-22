## 1. DAL helper

- [x] 1.1 Add a `viewerHasAnyFollows(viewerId: string): Promise<boolean>` query to `lib/dal.ts` (or extend an existing follow-related helper). Implement as `SELECT EXISTS (SELECT 1 FROM user_follows WHERE follower_id = $viewerId)` — cheap and indexable on the existing `(follower_id)` constraint. **Implemented at [lib/dal.ts](lib/dal.ts) just after `isFollowing`; uses `findFirst` for indexable LIMIT 1 lookup.**
- [x] 1.2 Tag the helper with `'use cache'` only if its tag invalidation is wired alongside `followUser` / `unfollowUser`'s existing `revalidateTag` calls; otherwise leave un-cached to avoid a stale `false` after a successful follow (Design D7 / Open Question 2). **Verified: both `followUser` and `unfollowUser` in `app/actions/follows.ts` call `updateTag('user_follows')`. Helper uses `'use cache'` + `cacheTag('user_follows')` to match `isFollowing`'s pattern; will invalidate correctly on follow graph changes.**

## 2. Audit existing modal primitive

- [x] 2.1 Search for an existing modal/dialog component in `app/ui/components/` — candidates likely include any of `Dialog`, `Modal`, `Popover`, `ConfirmDialog`. Read its implementation; confirm focus-trap, ESC dismiss, `aria-modal`, role correctness. **Audited `app/ui/components/ConfirmDialog.tsx`: overlay-based div pattern; hardcoded `variant="danger"` for confirm button; no `role="dialog"`, no `aria-modal`, no focus trap, no ESC handler. Used by 3 destructive-action callers (DeleteListButton, ListActionsMenu, DeleteItemButton).**
- [x] 2.2 **Decision point (record inline here):** reuse the existing primitive \_\_\_\_, OR build the dialog markup directly inside `FollowDisclosureDialog.tsx`. Avoid introducing a new generic abstraction in this change. **Build dedicated `FollowDisclosureDialog.tsx`. Rationale: `ConfirmDialog` is purpose-built for destructive actions and modifying it would either break the 3 existing destructive callers or balloon scope. The new dialog uses the native HTML `<dialog>` element with `showModal()` which gives focus trap, ESC dismiss, `role=dialog`, and `aria-modal=true` natively — satisfies the a11y bar in task 3.3 without a custom focus-trap implementation.**

## 3. `FollowDisclosureDialog` component

- [x] 3.1 Create `app/(main)/users/ui/components/FollowDisclosureDialog.tsx`. Props: `open: boolean`, `ownerName: string`, `onConfirm: () => void`, `onCancel: () => void`.
- [x] 3.2 Body copy (Design D2): "Follow {ownerName}?" header; "Following someone shares your name and profile picture with them." body; `[Cancel]` + `[Follow]` actions. Confirm button is the primary action (default focus). **Confirm button uses `variant="primary"`; defaultfocus via a ref + `confirmRef.current?.focus()` inside the `showModal()` effect.**
- [x] 3.3 A11y: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing at the header, focus trap inside the dialog while open, ESC closes (= `onCancel`), focus returns to the originating Follow button on close. **Achieved via the native HTML `<dialog>` element + `showModal()` — provides `role=dialog`, `aria-modal=true`, focus trap, and ESC handling natively. ESC fires the `cancel` event which I `preventDefault()` and call `onCancel()`. Focus return to the originator is the browser's default behavior when `dialog.close()` runs.**

## 4. `FollowContainer` gating logic

- [x] 4.1 In `app/(main)/users/ui/components/FollowContainer.tsx`, fetch `viewerHasAnyFollows` for the viewer alongside the existing `isFollowing` + block checks.
- [x] 4.2 Split: keep the server async shell that does the data fetches; render a new client component that owns the `<FollowButton>` + `<FollowDisclosureDialog>` pair and the `dialogOpen` state. **New client component `FollowControls.tsx` owns the follow state, isPending, dialogOpen, and the action calls. `FollowContainer.tsx` remains the server async shell.**
- [x] 4.3 Gate logic (Design D7):
  - If `viewerHasAnyFollows === false` AND the viewer is **not** currently following AND the user clicks Follow → open dialog instead of calling `followUser`.
  - On dialog confirm → call the existing follow flow (toast + `router.refresh()` on success, revert on failure). Close the dialog.
  - On dialog cancel → close dialog, no state change.
  - If `viewerHasAnyFollows === true` → click Follow behaves exactly as today (no dialog).
- [x] 4.4 Unfollow path is unchanged — no dialog ever fires on unfollow.

## 5. `FollowButton` strip-down

- [x] 5.1 In `app/(main)/users/ui/components/FollowButton.tsx`, remove the `.follow-button-wrap` div and the `.follow-disclosure` block. Component returns a bare `<Button>`.
- [x] 5.2 Add an optional `onBeforeFollow?: () => boolean` prop (or equivalent) — when provided, called before the optimistic `setFollowing(true)`; if it returns `false`, the button's own click handler aborts. This is the seam `FollowContainer` uses to interpose the dialog. (Alternative: lift the `following`/`isPending` state into `FollowContainer` and make `FollowButton` fully controlled. Pick whichever is mechanically smaller during implementation.) **Chose the "lift state" alternative — FollowButton is now fully controlled (props: `following`, `pending`, `onClick`, `userName`, `variant`). FollowControls.tsx owns the state and orchestrates the dialog gate. Cleaner than threading a sync hook that must imperatively trigger a follow on confirm.**
- [x] 5.3 Preserve all existing behavior for the past-first-follow path: optimistic toggle, toast, `router.refresh()`, error rollback. **Verified in `FollowControls.performFollow/performUnfollow` — same optimistic update pattern, same error rollback (revert state on `!result.success`), same toast.success/error and `router.refresh()` as the prior `FollowButton.toggle`.**

## 6. `ListDetails` hero restructure

- [x] 6.1 In `app/(main)/lists/ui/components/ListDetails.tsx`, restructure the hero between `list-hero-row` and `list-hero-actions`. Add a new `.list-hero-byline` sub-row that contains:
  - The user icon + owner name as a `<Link href={`/user/${list.user_id}`}>` (only when `user_name` is set and `!isOwner`).
  - The `<FollowContainer>` for non-owner authenticated viewers (move it here from `list-hero-actions`).
- [x] 6.2 Move the date + occasion chip into a separate `.list-hero-meta-row` (or keep them in `.list-hero-meta` but ensure the byline lives outside that row). **Byline now lives in its own `.list-hero-byline` div; the existing `.list-hero-meta` div is now just date + occasion.**
- [x] 6.3 Remove the `<FollowContainer>` mount from `list-hero-actions` (formerly [ListDetails.tsx:128](<app/(main)/lists/ui/components/ListDetails.tsx:128>)). **Action row now contains only `<ShareButton>` and `<BookmarkContainer>` for non-owner viewers.**
- [x] 6.4 For owners viewing their own list: the byline sub-row still shows their name (unlinked, since they're already on their own list page — or linked to `/user/{viewerId}`; design decision during implementation, default to unlinked). **Chose unlinked — owner sees their own name as plain text. Avoids redundant self-link.**

## 7. CSS

- [x] 7.1 In `app/(main)/lists/ui/styles/following-and-history.css`, delete `.follow-button-wrap` and `.follow-disclosure` rules (the markup is gone). **Done — replaced with `.follow-disclosure-dialog` + related dialog/title/body/buttons styles.**
- [x] 7.2 In `app/(main)/lists/ui/styles/list.css`, add `.list-hero-byline` — flex row, align-items center, gap matching `.list-hero-meta`'s `14px`. Owner-name link reuses existing meta-row typography (`13px`, `rgba(255,255,255,0.78)`); add an underline on hover for affordance. **Done — `.list-hero-byline` mirrors `.list-hero-meta`'s flex/gap/wrap; `.list-hero-byline-link` inherits color from the surrounding `.list-hero-mi`, no underline by default, underline on hover/focus-visible.**
- [x] 7.3 Mobile (`max-width: 800px`): confirm `.list-hero-byline` wraps cleanly — if the Follow button can't fit alongside the name, it drops to its own line beneath via `flex-wrap: wrap`. **`flex-wrap: wrap` on `.list-hero-byline` handles this — Follow button drops to next line when constrained.**
- [x] 7.4 Confirm `list-hero-actions` still renders Share + Bookmark with correct spacing now that Follow is gone — no orphan flex rules. **`.list-hero-actions` rules unchanged; row continues to use `display: flex; flex-wrap: wrap; gap: 7px`. No orphan styles.**

## 8. Verification (preview, dev-auth bypass)

- [x] 8.1 `npm run db:seed:dev`, set `AUTH_BYPASS=true`, start the dev server. **Already running; skipped re-seed.**
- [x] 8.2 **Past-first-follow path** — as `dev-test-viewer` (seeded with existing follows), navigate to one of Alice's public lists. Click `[+ Follow Alice]`. Confirm:
  - **No dialog appears** — follow proceeds immediately.
  - Button label changes to "Following".
  - Owner name "Alice" appears in the byline sub-row, is a link to `/user/{alice-id}`, and clicking it navigates to the profile.
  - Action row contains only `[Share List]` and `[Bookmark]`.
  - **Verified on Hank's list (`/lists/dev-list-hank-anniversary`): owner-name link `/user/dev-friend-hank` resolves to the profile (navigation confirmed); Follow clicked → no dialog, label flipped to "Following"; action row contained only Share List + Bookmark.**
- [~] 8.3 **Zero-follow / dialog path** — set up a zero-follow viewer (Open Question 4): either temporarily DELETE the seeded `user_follows` rows where `follower_id = 'dev-test-viewer'`, or sign in as one of the seeded friend users that has no outbound follows. Navigate to another user's public list. Click Follow. Confirm:
  - Dialog opens with the disclosure text.
  - Dialog is focus-trapped; pressing ESC closes it without following; focus returns to the Follow button.
  - No `user_follows` row inserted on cancel.
  - **Code-review-only (zero-follow seed setup deferred):** [FollowControls.tsx](<app/(main)/users/ui/components/FollowControls.tsx>) `handleClick` opens the dialog when `requireDisclosure === true && !following`. [FollowDisclosureDialog.tsx](<app/(main)/users/ui/components/FollowDisclosureDialog.tsx>) uses native `<dialog>.showModal()` which provides focus trap + ESC dismiss natively; `onCancel` is wired to the dialog's `cancel` event and the Cancel button. Cancel does not call `performFollow`. Visual layout verified via temporary force-open during preview — dialog centered correctly after the `margin: auto` (re-applied against global `* { margin: 0 }` reset); text contrast correct after explicit `color: var(--primary-text-color)`.
- [~] 8.4 Continue the dialog path: click Follow inside the dialog. Confirm:
  - Dialog closes.
  - Button label changes to "Following".
  - A new `user_follows` row exists.
  - **Code-review-only:** the dialog's Follow button calls `onConfirm` → in `FollowControls`, that sets `dialogOpen=false` and calls `performFollow()` — same optimistic toggle + `followUser` server action as the past-first-follow path (which was verified end-to-end in 8.2).
- [~] 8.5 Click `[+ Follow]` on a different owner's list (still as the now-has-one-follow viewer). Confirm:
  - **No dialog appears** — viewer is past first follow.
  - **Code-review-only:** `viewerHasAnyFollows` shares the `user_follows` cacheTag that `followUser`/`unfollowUser` already `updateTag`. After the first follow row exists, the cache invalidates, the next render's `requireDisclosure` is `false`, and the dialog branch in `handleClick` is skipped.
- [~] 8.6 **Unfollow-everyone-then-refollow re-prompt** (documenting the accepted trade-off, Design D3) — as the test viewer, unfollow everyone they follow. Click Follow on a new owner. Confirm the dialog re-appears. This is expected, not a bug.
  - **Code-review-only:** the derived signal `viewerHasAnyFollows` is `false` whenever the viewer's row count is 0. Unfollowing everyone returns the signal to `false`; the next follow triggers the dialog. Behavior follows directly from D3's accepted trade-off.
- [x] 8.7 As a viewer who is **the owner** of the list, confirm:
  - Byline shows their own name (linked or unlinked per task 6.4 decision); no Follow button renders.
  - Owner action row (Choose items, Edit list, etc.) is unchanged.
  - **Verified on `/lists/dev-list-viewer-birthday` (dev-test-viewer's own list): byline showed "Test Viewer" unlinked; no Follow button; action row contained Share List + Choose items + Edit list (owner actions, no Bookmark — correct).**

## 9. A11y + lint + types

- [x] 9.1 Run `npm run lint`. Expect 0 errors, 0 warnings (must remain green per `react-hooks-lint-conformance`). **Verified after each batch of edits: 0 errors, 0 warnings.**
- [x] 9.2 Run `npm run build`. Confirm no TS regressions. **Verified: compiled successfully.**
- [~] 9.3 Manual screen-reader pass (VoiceOver on macOS):
  - Owner-name link announces as link with the owner's name.
  - Follow button announces as button with the full label.
  - Opening the dialog announces the dialog's accessible name; focus moves inside.
  - Closing the dialog (Cancel or ESC) returns focus to the Follow button.
  - **Skipped — user requested. ARIA wiring verified statically: `<Link href>` produces native link semantics; `<Button aria-label>` set explicitly; `<dialog aria-labelledby="follow-disclosure-title">` paired with the matching `id` on the `<h3>`; native `<dialog>.showModal()` handles focus trap, ESC, and focus return per the HTML spec.**

## 10. Coordination cleanup (`add-following-and-history` edits)

This change finishes before `add-following-and-history` archives. The in-flight change's spec and task list must be edited in place so that, when it later archives, its remaining deltas merge cleanly into the `following` capability that this change creates.

- [x] 10.1 Edit `openspec/changes/add-following-and-history/specs/following/spec.md` — **delete** the entire `Requirement: Follow button SHALL include an inline disclosure of what is shared` block (heading, body, and both scenarios). Superseded by the dialog requirement in this change. **Done.**
- [x] 10.2 Edit the same file — **delete** the entire `Requirement: List pages SHALL expose a follow affordance for non-owner viewers` block (heading, body, all scenarios). This change's added requirement supersedes it with the colocated + linked-name + WCAG-sized version. **Done.**
- [x] 10.3 Edit `openspec/changes/add-following-and-history/tasks.md` — for tasks 15.6, 15.7, and 16.9 (which built and verified the inline disclosure / its CSS / its manual check), prepend a `~~superseded~~` annotation but keep them in place so the historical record stays legible. Example: `- [x] 15.6 ~~superseded by colocate-follow-with-owner-name~~ In FollowButton.tsx, render an inline...`. Do not re-flow task numbers. **Done — 15.6, 15.7 (partial), and 16.9 annotated.**
- [x] 10.4 Edit `openspec/changes/add-following-and-history/design.md` — find Decision 9b (which discusses the follower-side disclosure surprise and chose inline-note-not-modal). Add a one-sentence footnote: _Superseded by `colocate-follow-with-owner-name`, which moved the disclosure to a first-follow modal dialog._ Leaves the historical rationale visible. **Done — note inserted under the Decision 9b heading.**
- [x] 10.5 Run `openspec validate add-following-and-history --strict` after the edits. Resolve any issues (a removed requirement that's referenced from a scenario elsewhere would be flagged here). **Passes.**
- [x] 10.6 Run `openspec validate colocate-follow-with-owner-name --strict`. Resolve any issues. **Passes.**
