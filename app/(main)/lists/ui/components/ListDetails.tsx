// TODO(#343): split the extra components into their own files, then drop this disable
/* eslint-disable react/no-multi-comp */

import ProfileAvatar from '@/app/ui/components/ProfileAvatar';
import FollowContainer from '@/app/(main)/users/ui/components/FollowContainer';
import { LinkButton } from '@/app/ui/components/button';
import SpoilerPicker from '@/app/ui/components/SpoilerPicker';
import { writableMembership } from '@/lib/data/profile.gate';
import { atLeast } from '@/lib/spoilers';
import { authedIdentity } from '@/lib/data/user.session';
import { timeAgo } from '@/lib/timeAgo';
import { ListTable, type ProfileAvatarView, type SpoilerTier } from '@/lib/types';
import {
  VISIBILITY,
  resolveListVisibility,
  type ListVisibility,
} from '@/lib/visibility';
import Link from 'next/link';
import { MdChecklist, MdVisibility } from 'react-icons/md';
import BookmarkContainer from './BookmarkContainer';
import ClaimProgress from './ClaimProgress';
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
  previewMode,
  itemCount,
  editHref,
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
  previewMode?: boolean;
  itemCount: number;
  /** Built where the request's searchParams are known, so the tier and any filters ride into the mode. */
  editHref: string;
}) {
  const identity = await authedIdentity();
  const ownerFloorDisabled =
    !!identity && !identity.activeProfile.role.admin;

  const visibility = resolveListVisibility(list);
  const previewHref = `/lists/${list.id}?preview=viewer`;
  const exitPreviewHref = `/lists/${list.id}`;

  // Membership on the OWNING profile while acting as another. Independent of
  // the resolved spoiler state: it reports what the viewer may act as, not
  // what they may see.
  const otherProfileMembership =
    identity && identity.activeProfile.id !== list.profile_id
      ? await writableMembership(identity.userId, list.profile_id)
      : null;

  const updatedDisplay = timeAgo(list.updated_at);
  const itemsDisplay = `${itemCount} ${itemCount === 1 ? 'item' : 'items'}`;
  const showOwnerControls = isOwner && !previewMode;
  const showViewerControls =
    !isOwner && viewer_user_id && viewer_self_profile_id && !previewMode;

  // The Spoilers tile: offered to any viewer resolving a membership on the
  // owning profile — a non-member has no baseline to adjust — and hidden in
  // preview, where the owner is pinned to their own resolved tier.
  const showSpoilerTile = viewerIsMember && !previewMode;
  const spoilerTile = showSpoilerTile ? (
    <SpoilerPicker tier={tier} baseline={baseline} />
  ) : null;

  // Compose the prepended kebab items shown on the sticky strip while the
  // full hero is scrolled away. Owner-preview gets the owner items
  // (Share/Choose/Edit/Visibility are still owner affordances in preview
  // mode — visibility just shows current state). Pure viewers get the
  // viewer items.
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
      previewMode={!!previewMode}
      previewHref={previewHref}
      exitPreviewHref={exitPreviewHref}
      isOwner={isOwner}
      prependedItems={collapsedPrepended}
      disabled={ownerFloorDisabled}
    />
  );

  // One role for the hero's two role-keyed regions (actions row, tiles/byline
  // row). Extracted into subcomponents below so this component stays lean and
  // its branching does not compound.
  const heroMode = heroModeOf({
    showOwnerControls,
    showViewerControls,
    isOwner,
    previewMode: !!previewMode,
  });

  // The kebab holds Choose/Edit/Preview/Delete — Edit is never a hero button,
  // only a menu row. It closes the owner's action cluster; in preview it is
  // the only control and stands alone.
  const heroKebab = (
    <div className="list-hero-kebab">
      <ListActionsMenu
        list={list}
        previewMode={!!previewMode}
        previewHref={previewHref}
        exitPreviewHref={exitPreviewHref}
        disabled={ownerFloorDisabled}
      />
    </div>
  );

  const heroActions = (
    <HeroActions
      mode={heroMode}
      list={list}
      visibility={visibility}
      viewerUserId={viewer_user_id}
      kebab={heroKebab}
      editHref={editHref}
    />
  );

  const heroLead = (
    <HeroLead
      mode={heroMode}
      list={list}
      owner={owner}
      visibility={visibility}
      ownerFloorDisabled={ownerFloorDisabled}
      viewerUserId={viewer_user_id}
      viewerSelfProfileId={viewer_self_profile_id}
    />
  );

  return (
    <>

    <ListHeroSurface title={list.name} kebab={collapsedKebab}>
      <div className="list-hero">
        {previewMode && (
          <div className="preview-banner" role="status">
            <MdVisibility />
            <span>You&apos;re previewing this list as a viewer.</span>
            <LinkButton href={exitPreviewHref} variant="on-dark" size="sm">
              Exit preview
            </LinkButton>
          </div>
        )}

        {/* Two rows per the 2026-09-01 mockup: title | actions, then
            lead | meta | spoilers. Desktop lays each row out with flex so
            the rows share no columns; mobile flattens both rows into one
            stack (see list.css). */}
        <div className="list-hero-main">
          <div className="list-hero-row">
            <div className="list-hero-titleblock">
              <h1 className="list-hero-title">{list.name}</h1>
              {list.subtitle ? (
                <div className="list-hero-eyebrow-subtitle-wrapper">
                  {list.occasion ? (
                    <span className="list-hero-eyebrow">{list.occasion}</span>
                  ) : null}{' '}
                  <p className="list-hero-subtitle">{list.subtitle}</p>
                </div>
              ) : null}
            </div>
            {heroActions}
          </div>
          <div className="list-hero-row">
            {heroLead}
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
            {spoilerTile}
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

type HeroMode = 'owner' | 'viewer' | 'preview' | null;

function heroModeOf({
  showOwnerControls,
  showViewerControls,
  isOwner,
  previewMode,
}: {
  showOwnerControls: boolean;
  showViewerControls: boolean | '' | undefined;
  isOwner: boolean;
  previewMode: boolean;
}): HeroMode {
  if (showOwnerControls) return 'owner';
  if (showViewerControls) return 'viewer';
  if (isOwner && previewMode) return 'preview';
  return null;
}

// The hero's primary-action cluster (mockup: Share / Choose). Owner gets
// Share + Choose items; a signed-in viewer gets Share + Bookmark. Edit, Preview
// and Delete are never hero buttons — they live in the corner kebab. Preview
// mode renders none (the kebab's Exit-preview is the only control).
function HeroActions({
  mode,
  list,
  visibility,
  viewerUserId,
  kebab,
  editHref,
}: {
  mode: HeroMode;
  list: ListWithVisibility;
  visibility: ListVisibility;
  viewerUserId: string | undefined;
  kebab: React.ReactNode;
  editHref: string;
}) {
  if (mode === 'owner') {
    return (
      <div className="list-hero-actions">
        {visibility !== VISIBILITY.OWNER && <ShareButton list={list} />}
        <LinkButton href={editHref} variant="on-dark">
          <MdChecklist />
          <span className="label">Choose items</span>
        </LinkButton>
        {kebab}
      </div>
    );
  }
  if (mode === 'preview') return kebab;
  if (mode === 'viewer') {
    return (
      <div className="list-hero-actions">
        <ShareButton list={list} />
        {viewerUserId && (
          <BookmarkContainer list_id={list.id} user_id={viewerUserId} />
        )}
      </div>
    );
  }
  return null;
}

// Row 2's leading slot: the owner's Visibility tile, or the owner byline
// (+ Follow) for a signed-in viewer.
function HeroLead({
  mode,
  list,
  owner,
  visibility,
  ownerFloorDisabled,
  viewerUserId,
  viewerSelfProfileId,
}: {
  mode: HeroMode;
  list: ListWithVisibility;
  owner: ProfileAvatarView;
  visibility: ListVisibility;
  ownerFloorDisabled: boolean;
  viewerUserId: string | undefined;
  viewerSelfProfileId: string | undefined;
}) {
  if (mode === 'owner') {
    return (
      <VisibilityPicker
        listId={list.id}
        initialVisibility={visibility}
        disabled={ownerFloorDisabled}
      />
    );
  }
  if (mode !== 'viewer' || !viewerUserId || !viewerSelfProfileId) return null;
  return (
    <div className="list-hero-byline-group">
      <ProfileAvatar profile={owner} />
      <div className="list-hero-byline-text">
        <Link
          href={`/altvatar/${list.profile_id}`}
          className="list-hero-byline-link"
        >
          {owner.name}
        </Link>
        <FollowContainer
          ownerProfileId={list.profile_id}
          ownerName={owner.name}
          viewerUserId={viewerUserId}
          viewerSelfProfileId={viewerSelfProfileId}
          variant="on-dark"
        />
      </div>
    </div>
  );
}
