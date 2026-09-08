// TODO(#343): split the extra components into their own files, then drop this disable
/* eslint-disable react/no-multi-comp */

import ProfileAvatar from '@/app/ui/components/ProfileAvatar';
import FollowContainer from '@/app/(main)/users/ui/components/FollowContainer';
import SpoilerPicker from '@/app/ui/components/SpoilerPicker';
import { writableMembership } from '@/lib/data/profile.gate';
import { atLeast } from '@/lib/spoilers';
import { authedIdentity } from '@/lib/data/user.session';
import { timeAgo } from '@/lib/timeAgo';
import {
  ListTable,
  type ProfileAvatarView,
  type SpoilerTier,
} from '@/lib/types';
import {
  VISIBILITY,
  resolveListVisibility,
  type ListVisibility,
} from '@/lib/visibility';
import Link from 'next/link';
import BookmarkContainer from './BookmarkContainer';
import ClaimProgress from './ClaimProgress';
import EditListAction from './EditListAction';
import {
  HeroCollapsedOwnerItems,
  HeroCollapsedViewerItems,
} from './HeroCollapsedItemsContainer';
import { SpoilerMenuItems } from './HeroCollapsedItems';
import ListActionsMenu from './ListActionsMenu';
import ListHeroSurface from './ListHeroSurface';
import ShareButton from './ShareButton';
import SwitchProfileOffer from './SwitchProfileOffer';
import VisibilityPicker from './VisibilityPicker';

type ListWithVisibility = ListTable & {
  visibility?: ListVisibility;
};

export default async function ListDetails({
  isOwner,
  list,
  owner,
  viewer_user_id,
  viewer_self_profile_id,
  tier,
  viewerIsMember,
  baseline,
  claimedCount,
  itemCount,
}: {
  isOwner: boolean;
  list: ListWithVisibility;
  owner: ProfileAvatarView;
  viewer_user_id: string | undefined;
  viewer_self_profile_id: string | undefined;
  /** The viewer's resolved tier, and the baseline the Spoilers tile writes deltas against. */
  tier: SpoilerTier;
  /** The viewer holds a membership on the owning profile — gates the Spoilers tile. */
  viewerIsMember: boolean;
  baseline: SpoilerTier;
  /** Present only where the resolved tier is `progress` or above — `surprise` costs no query. */
  claimedCount?: number;
  itemCount: number;
}) {
  const identity = await authedIdentity();
  const ownerFloorDisabled = !!identity && !identity.activeProfile.role.admin;

  const visibility = resolveListVisibility(list);

  // Membership on the OWNING profile while acting as another. Independent of
  // the resolved spoiler state: it reports what the viewer may act as, not
  // what they may see.
  const otherProfileMembership =
    identity && identity.activeProfile.id !== list.profile_id
      ? await writableMembership(identity.userId, list.profile_id)
      : null;

  const updatedDisplay = timeAgo(list.updated_at);
  const itemsDisplay = `${itemCount} ${itemCount === 1 ? 'item' : 'items'}`;
  const showOwnerControls = isOwner;
  const showViewerControls =
    !isOwner && !!viewer_user_id && !!viewer_self_profile_id;

  // Share is the button cluster's only unconditional member, so a list nobody
  // else can reach leaves the row with nothing to hold. It is also the only
  // control in the row that is not keyed on the viewer, which is why it leads.
  const showActions = isOwner
    ? visibility !== VISIBILITY.OWNER
    : showViewerControls;

  // The Spoilers tile: offered to any viewer resolving a membership on the
  // owning profile — a non-member has no baseline to adjust. The owner keeps
  // it too: their default view is a member's view, at their own tier.
  const showSpoilerTile = viewerIsMember;
  const spoilerTile = showSpoilerTile ? (
    <SpoilerPicker tier={tier} baseline={baseline} />
  ) : null;

  // Compose the prepended kebab items shown on the sticky strip while the
  // full hero is scrolled away. Owners get the owner items; pure viewers get
  // the viewer items.
  // The Spoilers menu hoists into the sticky-strip kebab as its own rows for a
  // member viewer, in lockstep with the hero tile (`list-hero-collapse`).
  const collapsedSpoilerItems = showSpoilerTile ? (
    <SpoilerMenuItems tier={tier} baseline={baseline} />
  ) : null;

  // The three prepends are independent and combine in one fragment: the
  // Spoilers rows for any member viewer, then the owner OR viewer kebab set
  // (mutually exclusive). A pure non-member gets none, leaving this null.
  const collapsedPrepended: React.ReactNode =
    showSpoilerTile || showOwnerControls || showViewerControls ? (
      <>
        {collapsedSpoilerItems}
        {showOwnerControls && (
          <HeroCollapsedOwnerItems
            list={list}
            visibility={visibility}
            disabled={ownerFloorDisabled}
          />
        )}
        {showViewerControls && (
          <HeroCollapsedViewerItems
            list={list}
            ownerProfileId={list.profile_id}
            ownerName={owner.name}
            viewerUserId={viewer_user_id}
            viewerSelfProfileId={viewer_self_profile_id}
          />
        )}
      </>
    ) : null;

  const collapsedKebab = (
    <ListActionsMenu
      list={list}
      isOwner={isOwner}
      prependedItems={collapsedPrepended}
      deleteDisabled={ownerFloorDisabled}
    />
  );

  const follow = showViewerControls ? (
    <FollowContainer
      ownerProfileId={list.profile_id}
      ownerName={owner.name}
      viewerUserId={viewer_user_id}
      viewerSelfProfileId={viewer_self_profile_id}
      variant="on-dark"
    />
  ) : null;

  return (
    <>
      <ListHeroSurface title={list.name} kebab={collapsedKebab}>
        <div className="list-hero">
          <div className="list-hero-main">
            <div className="list-hero-row">
              <div className="list-hero-titleblock">
                <div className="list-hero-title-line">
                  <h1 className="list-hero-title">{list.name}</h1>
                  {isOwner && (
                    <EditListAction
                      list={list}
                      deleteDisabled={ownerFloorDisabled}
                    />
                  )}
                </div>
                {list.subtitle ? (
                  <div className="list-hero-eyebrow-subtitle-wrapper">
                    {list.occasion ? (
                      <span className="list-hero-eyebrow">{list.occasion}</span>
                    ) : null}{' '}
                    <p className="list-hero-subtitle">{list.subtitle}</p>
                  </div>
                ) : null}
              </div>
              <HeroByline
                profileId={list.profile_id}
                owner={owner}
                follow={follow}
              />
            </div>
            <div className="list-hero-row">
              {showActions && (
                <HeroActions
                  list={list}
                  viewerUserId={showViewerControls ? viewer_user_id : undefined}
                />
              )}
              {showOwnerControls && (
                <VisibilityPicker
                  listId={list.id}
                  initialVisibility={visibility}
                  disabled={ownerFloorDisabled}
                />
              )}
              {spoilerTile}
              {/* The claimed count describes the list, not the visible item
                set. At `surprise` the line carries item count and time alone. */}
              <div className="list-hero-meta">
                <span>
                  {itemsDisplay}
                  {updatedDisplay && <> · updated {updatedDisplay}</>}
                </span>
                {atLeast(tier, 'progress') && claimedCount !== undefined && (
                  <ClaimProgress claimed={claimedCount} total={itemCount} />
                )}
              </div>
            </div>
          </div>
        </div>
      </ListHeroSurface>
      {/* Floating, dismissible — sits over the list panel rather than in the
          hero, per the mockup. Fixed positioning, so its DOM home here does not
          affect layout. */}
      {otherProfileMembership && (
        <SwitchProfileOffer
          profileId={list.profile_id}
          profileName={otherProfileMembership.name}
        />
      )}
    </>
  );
}

// Row 2's button cluster. Share leads and never moves — every other control
// in the row comes and goes with who is looking, so anchoring the one constant
// keeps a control from landing where a different one stood a moment ago.
function HeroActions({
  list,
  viewerUserId,
}: {
  list: ListWithVisibility;
  viewerUserId: string | undefined;
}) {
  return (
    <div className="list-hero-actions">
      <ShareButton list={list} />
      {viewerUserId && (
        <BookmarkContainer list_id={list.id} user_id={viewerUserId} />
      )}
    </div>
  );
}

// The byline names the profile that owns the list, to every viewer — an owner
// running more than one Altvatar needs it as much as a stranger does.
function HeroByline({
  profileId,
  owner,
  follow,
}: {
  profileId: string;
  owner: ProfileAvatarView;
  follow: React.ReactNode;
}) {
  return (
    <div className="list-hero-byline-group">
      <ProfileAvatar profile={owner} />
      <div className="list-hero-byline-text">
        <Link href={`/altvatar/${profileId}`} className="list-hero-byline-link">
          {owner.name}
        </Link>
        {follow}
      </div>
    </div>
  );
}
