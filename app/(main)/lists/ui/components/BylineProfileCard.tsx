'use client';

import ProfileAvatar from '@/app/ui/components/ProfileAvatar';
import { Button, LinkButton } from '@/app/ui/components/button';
import { MenuItem } from '@/app/ui/components/menu';
import { useProfileSwitch } from '@/app/ui/components/ProfileSwitchProvider';
import { useOutsideDismiss } from '@/app/ui/components/use-dismiss';
import FollowControls from '@/app/(main)/users/ui/components/FollowControls';
import type { FollowState } from '@/lib/data/follow';
import { accentVars } from '@/lib/accent';
import { getMessage } from '@/lib/i18n/utils';
import type { ProfileAvatarView } from '@/lib/types';
import { useLayoutEffect, useRef, useState } from 'react';

const EDGE_MARGIN_PX = 8;

// One card, three content shapes: the profile's name, its viewer-visible list
// count and its Altvatar space always; Follow whenever the owning profile is
// not the viewer's own self-profile; a switch offer whenever the account can
// act as it. Both extras arrive as props because each is a server read — a
// block check and a membership row.
export default function BylineProfileCard({
  profileId,
  owner,
  listCount,
  followState,
  canSwitchProfile = false,
  asMenuRow = false,
}: {
  profileId: string;
  owner: ProfileAvatarView;
  listCount: number;
  /** Absent where the profile is the viewer's own self, or either side blocks. */
  followState?: FollowState | null;
  /** The account holds a writable membership on the owning profile. */
  canSwitchProfile?: boolean;
  /** Renders the trigger as a kebab row, for the collapsed header. */
  asMenuRow?: boolean;
}) {
  const switchProfile = useProfileSwitch();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [rowOrigin, setRowOrigin] =
    useState<{ top: number; left: number; bridge: number }>();

  // The kebab clips its own overflow, so a card positioned inside it would be
  // cut off; it is taken out to the viewport instead.
  //
  // Where it lands is decided by the room there is. Beside the menu is the
  // better placement — the kebab hangs at the screen's right edge, and a card
  // over it hides the rows the viewer was reading — but a phone's menu is
  // nearly the whole width and leaves none, so there the card drops from the
  // row instead, flush against it. Either way it is clamped to the viewport
  // and measured before paint, so it never lands anywhere else first.
  useLayoutEffect(() => {
    const trigger = triggerRef.current;
    const card = cardRef.current;
    if (!open || !asMenuRow || !trigger || !card) return;
    const row = trigger.getBoundingClientRect();
    const menu = trigger.closest('.menu-popover')?.getBoundingClientRect();
    const { offsetWidth: width, offsetHeight: height } = card;
    const fit = (start: number, size: number, limit: number) =>
      Math.max(EDGE_MARGIN_PX, Math.min(start, limit - size - EDGE_MARGIN_PX));

    const beside = (menu?.left ?? row.left) - width - EDGE_MARGIN_PX;
    const fitsBeside = beside >= EDGE_MARGIN_PX;

    setRowOrigin({
      top: fit(fitsBeside ? row.top : row.bottom, height, window.innerHeight),
      left: fitsBeside ? beside : fit(row.left, width, window.innerWidth),
      // Beside the menu the pointer crosses a horizontal corridor to reach the
      // card — the flyout's gap and the menu's own padding, every pixel of it
      // outside the row that carries the leave handler. Dropped from the row
      // the card is already flush against it, so there is nothing to span.
      bridge: fitsBeside ? Math.max(0, row.left - (beside + width)) : 0,
    });
  }, [open, asMenuRow]);

  // The byline is hidden out from under the card when the hero collapses, and
  // that fires no event of its own — so any scroll closes, rather than the
  // anchor-visibility test a menu makes.
  const close = () => setOpen(false);
  useOutsideDismiss({
    open,
    contains: (target) => !!rootRef.current?.contains(target),
    dismiss: close,
    onScroll: close,
  });

  const name = owner.name || getMessage('owner_name_placeholder');
  const label = getMessage('byline_card_open_label', { name });

  // The first-follow disclosure is a modal dialog, which takes the pointer
  // with it — dismissing on that leave would close the card out from under
  // the dialog it opened.
  const closeOnLeave = () => {
    if (!document.querySelector('dialog[open]')) setOpen(false);
  };

  // The corridor is published to CSS from the measurement that opened it, so
  // the bridge spanning it can never drift out of step with the placement.
  const rowStyle =
    asMenuRow && rowOrigin
      ? {
          position: 'fixed' as const,
          top: rowOrigin.top,
          left: rowOrigin.left,
          '--byline-card-bridge': `${rowOrigin.bridge}px`,
        }
      : undefined;

  // Press opens rather than toggles: on a pointer device the hover has
  // already opened the card, so a toggle would make the press close it.
  const triggerProps = {
    ref: triggerRef,
    onClick: () => setOpen(true),
    'aria-haspopup': 'dialog' as const,
    'aria-expanded': open,
    'aria-label': label,
  };

  return (
    <div
      ref={rootRef}
      className="byline-card-anchor"
      // Movement, not `mouseenter`: a navigation re-runs hit-testing under a
      // pointer that never moved, so the byline landing beneath a parked
      // cursor would open the card over the hero nobody pointed at.
      onMouseMove={() => setOpen(true)}
      onMouseLeave={closeOnLeave}
    >
      {asMenuRow ? (
        <MenuItem
          {...triggerProps}
          icon={
            <ProfileAvatar profile={owner} className="menu-profile-avatar" />
          }
        >
          {owner.name}
        </MenuItem>
      ) : (
        <Button
          {...triggerProps}
          variant="link"
          className="list-hero-byline-button"
        >
          <ProfileAvatar profile={owner} />
          <span className="list-hero-byline-name">{owner.name}</span>
        </Button>
      )}
      {open && (
        <div
          ref={cardRef}
          className="byline-card"
          role="dialog"
          aria-label={label}
          style={{ ...accentVars(owner.accent), ...rowStyle }}
        >
          <div className="byline-card-band">
            <span className="byline-card-avatar">
              <ProfileAvatar profile={owner} />
            </span>
          </div>
          <div className="byline-card-meta">
            <div className="byline-card-name">{owner.name}</div>
            <div className="byline-card-count">
              {getMessage('profile_shared_list_count', { count: listCount })}
            </div>
          </div>
          <div className="byline-card-actions">
            <div className="byline-card-links">
              <LinkButton variant="secondary" href={`/altvatar/${profileId}`}>
                {getMessage('byline_card_altvatar_link')}
              </LinkButton>
              {followState && (
                <FollowControls
                  profileId={profileId}
                  userName={owner.name}
                  initialFollowing={followState.following}
                  requireDisclosure={followState.requireDisclosure}
                />
              )}
            </div>
            {canSwitchProfile && (
              <Button
                variant="primary"
                onClick={() => switchProfile(profileId)}
              >
                {getMessage('switch_profile_label', { name })}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
