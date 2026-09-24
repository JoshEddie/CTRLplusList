import { getFollowState } from '@/lib/data/follow';
import { getProfileForViewer } from '@/lib/data/profile';
import { writableMembership } from '@/lib/data/profile.gate';
import { authedIdentity } from '@/lib/data/user.session';
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
import BylineProfileCard from './BylineProfileCard';
import EditListAction from './EditListAction';
import HeroActions from './HeroActions';
import HeroCollapsedOwnerItems from './HeroCollapsedOwnerItems';
import HeroCollapsedViewerItems from './HeroCollapsedViewerItems';
import HeroMeta from './HeroMeta';
import HeroSpoilerControl from './HeroSpoilerControl';
import ListActionsMenu from './ListActionsMenu';
import ListHeroSurface from './ListHeroSurface';
import SpoilerMenuItems from './SpoilerMenuItems';
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

  // Follow is keyed on the owning profile not being the viewer's own self —
  // narrower than the viewer-controls gate, so following a managed profile the
  // viewer owns keeps working while their own space never offers it.
  const followState =
    viewer_user_id &&
    viewer_self_profile_id &&
    viewer_self_profile_id !== list.profile_id
      ? await getFollowState({
          viewerUserId: viewer_user_id,
          viewerSelfProfileId: viewer_self_profile_id,
          ownerProfileId: list.profile_id,
        })
      : null;

  // The card's list count is the profile page's own — the same shared-list
  // tally, so the two surfaces never disagree about how much of a profile a
  // viewer can reach.
  const ownerProfile = await getProfileForViewer(list.profile_id, identity);
  const cardProps = {
    profileId: list.profile_id,
    owner,
    listCount: ownerProfile?.publicListCount ?? 0,
    followState,
    canSwitchProfile: !!otherProfileMembership,
  };

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
    <HeroSpoilerControl tier={tier} baseline={baseline} />
  ) : null;

  // Compose the prepended kebab items shown on the sticky strip while the
  // full hero is scrolled away. Owners get the owner items; pure viewers get
  // the viewer items.
  // The Spoilers menu hoists into the sticky-strip kebab as its own rows for a
  // member viewer, in lockstep with the hero tile (`list-hero-collapse`).
  const collapsedSpoilerItems = showSpoilerTile ? (
    <SpoilerMenuItems tier={tier} baseline={baseline} />
  ) : null;

  // The collapsed kebab mirrors the expanded hero: the byline first, as the
  // row that opens the same profile card, then the Spoilers rows for any
  // member viewer, then the owner OR viewer set (mutually exclusive).
  const collapsedPrepended: React.ReactNode = (
    <>
      <BylineProfileCard {...cardProps} asMenuRow />
      {collapsedSpoilerItems}
      {showOwnerControls && (
        <HeroCollapsedOwnerItems
          list={list}
          visibility={visibility}
          disabled={ownerFloorDisabled}
        />
      )}
      {showViewerControls && (
        <HeroCollapsedViewerItems list={list} viewerUserId={viewer_user_id} />
      )}
    </>
  );

  const collapsedKebab = (
    <ListActionsMenu
      list={list}
      isOwner={isOwner}
      prependedItems={collapsedPrepended}
      deleteDisabled={ownerFloorDisabled}
    />
  );

  return (
    <>
      <ListHeroSurface title={list.name} kebab={collapsedKebab}>
        <div className="list-hero">
          <div className="list-hero-main">
            <h1 className="list-hero-title">{list.name}</h1>
            {isOwner && (
              <EditListAction list={list} deleteDisabled={ownerFloorDisabled} />
            )}
            {list.subtitle ? (
              <div className="list-hero-eyebrow-subtitle-wrapper">
                {list.occasion ? (
                  <span className="list-hero-eyebrow">{list.occasion}</span>
                ) : null}{' '}
                <p className="list-hero-subtitle">{list.subtitle}</p>
              </div>
            ) : null}
            <div className="list-hero-row">
              <BylineProfileCard {...cardProps} />
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
              <HeroMeta
                tier={tier}
                claimedCount={claimedCount}
                itemCount={itemCount}
                updatedAt={list.updated_at}
              />
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
