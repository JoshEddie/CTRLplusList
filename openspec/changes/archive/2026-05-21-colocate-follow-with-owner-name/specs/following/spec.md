## ADDED Requirements

### Requirement: List pages SHALL expose a follow affordance for non-owner viewers, colocated with the linked owner name

When an authenticated viewer who is not the list owner renders a list with `visibility != 'private'`, the list-detail hero SHALL display a Follow / Following button targeting the list's owner. The button SHALL be a full-size button satisfying WCAG 2.5.5 (44×44 CSS px touch target). The button SHALL be rendered in a byline sub-row of the list hero adjacent to the owner's name (which itself SHALL be rendered as a link to `/user/{owner_id}` on this surface), and SHALL NOT be rendered in the list-hero action row alongside list-actions such as Share and Bookmark. The button SHALL be hidden when the viewer is the owner, when the viewer is unauthenticated, or when the viewer has blocked or been blocked by the owner.

#### Scenario: Follow button colocated with linked owner name

- **WHEN** an authenticated viewer (not the owner) loads a non-private list
- **THEN** the list hero renders a byline sub-row containing the owner's name as a link to `/user/{owner_id}` and a full-size button labeled "Follow {owner-name}" adjacent to it
- **AND** the list-hero action row contains only list-actions (Share, Bookmark) — no Follow button

#### Scenario: Following state shown after follow

- **WHEN** the viewer already follows the owner
- **THEN** the button label reads "Following" and clicking it unfollows (no dialog gating on unfollow)

#### Scenario: Owner name linkified only on list-detail hero

- **WHEN** the owner's name appears on a list-detail hero
- **THEN** it renders as a link to `/user/{owner_id}`

- **WHEN** the owner's name appears on other surfaces (list cards, bookmark rails, feed entries)
- **THEN** the name's existing presentation is unchanged by this requirement (linkification on those surfaces is out of scope)

#### Scenario: Hidden for owner

- **WHEN** the list owner views their own list
- **THEN** no Follow button is rendered in the byline sub-row

#### Scenario: Hidden for unauthenticated

- **WHEN** an unauthenticated viewer loads a list
- **THEN** no Follow button is rendered

### Requirement: First follow by a viewer SHALL surface a disclosure dialog

When an authenticated viewer with zero existing follow relationships (i.e., no row in `user_follows` where `follower_id` is the viewer) attempts to follow another user, the UI SHALL surface a modal confirmation dialog stating what is shared by following ("Following someone shares your name and profile picture with them.") and offering Cancel / Follow actions. On Confirm, the follow SHALL proceed (a `user_follows` row is inserted unless blocked). On Cancel, no follow SHALL occur. Once the viewer has at least one row in `user_follows` with `follower_id = viewer`, the dialog SHALL NOT appear on any subsequent follow action — the viewer's own follow graph is the source of truth for "have they been past first follow before?" No separate acknowledgement field is stored.

The dialog SHALL replace the previously-specified inline disclosure note rendered under the Follow button. The Follow button itself SHALL NOT render an inline disclosure on any surface.

The system MAY re-surface the dialog if the viewer unfollows every user they follow and then attempts a new follow — the derived signal returns to zero in that case. This is an accepted trade-off; the system SHALL NOT add storage to suppress it.

#### Scenario: First-time follow surfaces dialog

- **WHEN** an authenticated viewer with zero rows in `user_follows` (where `follower_id` is the viewer) clicks Follow on any user
- **THEN** a modal dialog appears with the disclosure text and Cancel / Follow buttons
- **AND** no `user_follows` row is inserted yet

#### Scenario: Confirm proceeds with follow

- **WHEN** the viewer clicks Follow inside the dialog
- **THEN** the follow proceeds (a `user_follows` row is inserted unless blocked)
- **AND** the dialog closes

#### Scenario: Cancel aborts the follow

- **WHEN** the viewer clicks Cancel (or presses ESC) inside the dialog
- **THEN** the dialog closes
- **AND** no `user_follows` row is inserted

#### Scenario: Subsequent follows skip the dialog

- **WHEN** an authenticated viewer with at least one row in `user_follows` (where `follower_id` is the viewer) clicks Follow on any other user
- **THEN** no dialog appears
- **AND** the follow proceeds immediately

#### Scenario: Unfollow never gates on the dialog

- **WHEN** an authenticated viewer clicks Following to unfollow another user
- **THEN** the unfollow proceeds immediately with no dialog, regardless of the viewer's follow count

#### Scenario: Existing followers automatically skip the dialog

- **WHEN** a viewer who already follows other users (pre-existing from before this change) clicks Follow on a new user
- **THEN** no dialog appears — the derived signal evaluates to "past first follow"
- **AND** the follow proceeds immediately

#### Scenario: Re-prompt after unfollowing everyone (accepted edge case)

- **WHEN** a viewer who has previously followed users unfollows every user they follow, and then later clicks Follow on a new user
- **THEN** the dialog re-appears, because the derived "first follow?" signal is again zero
- **AND** confirming proceeds with the follow as in the first-follow case
