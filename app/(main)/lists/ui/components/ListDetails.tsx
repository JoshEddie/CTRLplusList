import ProfileAvatar from '@/app/ui/components/ProfileAvatar';
import FollowContainer from '@/app/(main)/users/ui/components/FollowContainer';
import { LinkButton } from '@/app/ui/components/button';
import { timeAgo } from '@/lib/timeAgo';
import { ListTable, type ProfileAvatarView } from '@/lib/types';
import {
  VISIBILITY,
  resolveListVisibility,
  type ListVisibility,
} from '@/lib/visibility';
import Link from 'next/link';
import { MdChecklist, MdVisibility } from 'react-icons/md';
import BookmarkContainer from './BookmarkContainer';
import EditListAction from './EditListAction';
import {
  HeroCollapsedOwnerItems,
  HeroCollapsedViewerItems,
} from './HeroCollapsedItemsContainer';
import ListActionsMenu from './ListActionsMenu';
import ListHeroSurface from './ListHeroSurface';
import ShareButton from './ShareButton';
import VisibilityPicker from './VisibilityPicker';

type ListWithVisibility = ListTable & {
  visibility?: ListVisibility;
};

// The spoiler-toggle, enter-preview, and exit-preview links all depend on the
// same (showSpoilers, previewMode) pair; derive them together so ListDetails
// itself stays flat.
function navHrefs(
  listId: string,
  showSpoilers: boolean | undefined,
  previewMode: boolean | undefined
) {
  return {
    previewHref: `/lists/${listId}?preview=viewer${
      showSpoilers ? '&spoilers=1' : ''
    }`,
    exitPreviewHref: `/lists/${listId}${showSpoilers ? '?spoilers=1' : ''}`,
    spoilerHref: showSpoilers
      ? `/lists/${listId}${previewMode ? '?preview=viewer' : ''}`
      : `/lists/${listId}?${previewMode ? 'preview=viewer&' : ''}spoilers=1`,
  };
}

export default async function ListDetails({
  isOwner,
  list,
  owner,
  viewer_user_id,
  viewer_self_profile_id,
  showSpoilers,
  previewMode,
  itemCount,
}: {
  isOwner: boolean;
  list: ListWithVisibility;
  owner: ProfileAvatarView;
  viewer_user_id: string | undefined;
  viewer_self_profile_id: string | undefined;
  showSpoilers?: boolean;
  previewMode?: boolean;
  itemCount: number;
}) {
  const visibility = resolveListVisibility(list);
  const { previewHref, exitPreviewHref, spoilerHref } = navHrefs(
    list.id,
    showSpoilers,
    previewMode
  );

  const updatedDisplay = timeAgo(list.updated_at);
  const itemsDisplay = `${itemCount} ${itemCount === 1 ? 'item' : 'items'}`;
  const showOwnerControls = isOwner && !previewMode;
  const showViewerControls =
    !isOwner && viewer_user_id && viewer_self_profile_id && !previewMode;

  // Compose the prepended kebab items shown on the sticky strip while the
  // full hero is scrolled away. Owner-preview gets the owner items
  // (Share/Choose/Edit/Visibility are still owner affordances in preview
  // mode — visibility just shows current state). Pure viewers get the
  // viewer items.
  let collapsedPrepended: React.ReactNode = null;
  if (showOwnerControls) {
    collapsedPrepended = (
      <HeroCollapsedOwnerItems list={list} visibility={visibility} />
    );
  } else if (showViewerControls) {
    collapsedPrepended = (
      <HeroCollapsedViewerItems
        list={list}
        ownerProfileId={list.profile_id}
        ownerName={owner.name}
        viewerUserId={viewer_user_id}
        viewerSelfProfileId={viewer_self_profile_id}
      />
    );
  }

  const collapsedKebab = (
    <ListActionsMenu
      list={list}
      showSpoilers={!!showSpoilers}
      previewMode={!!previewMode}
      spoilerHref={spoilerHref}
      previewHref={previewHref}
      exitPreviewHref={exitPreviewHref}
      isOwner={isOwner}
      prependedItems={collapsedPrepended}
    />
  );

  let ownerControls: React.ReactNode = null;
  if (showOwnerControls) {
    ownerControls = (
      <div className="list-hero-share-wrapper">
        <VisibilityPicker listId={list.id} initialVisibility={visibility} />
        {visibility !== VISIBILITY.OWNER && <ShareButton list={list} />}
      </div>
    );
  }

  return (
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

        <div className="list-hero-grid">
          <div className="list-hero-card list-hero-card-identity">
            <div className="list-hero-identity-top">
              {ownerControls}
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
            <div className="list-hero-identity-foot">
              {itemsDisplay}
              {updatedDisplay && <> · updated {updatedDisplay}</>}
            </div>
          </div>

          <div className="list-hero-card list-hero-card-controls">
            {/* Owner non-preview: Share primary, divider, secondary actions.
                Visibility status pill lives in the identity zone, not here. */}
            {showOwnerControls && (
              <>
                <div className="list-hero-action-row">
                  <EditListAction list={list} />
                  <ListActionsMenu
                    list={list}
                    showSpoilers={!!showSpoilers}
                    previewMode={!!previewMode}
                    spoilerHref={spoilerHref}
                    previewHref={previewHref}
                    exitPreviewHref={exitPreviewHref}
                  />
                </div>
                <LinkButton
                  href={`/lists/${list.id}/choose-items`}
                  variant="on-dark"
                >
                  <MdChecklist />
                  <span className="label">Choose items</span>
                </LinkButton>
              </>
            )}

            {/* Viewer non-preview: byline group + divider + Share/Bookmark pair */}
            {showViewerControls && (
              <>
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
                      viewerUserId={viewer_user_id}
                      viewerSelfProfileId={viewer_self_profile_id}
                      variant="on-dark"
                    />
                  </div>
                </div>
                <div className="list-hero-divider" />
                <div className="list-hero-action-row">
                  <ShareButton list={list} />
                  {viewer_user_id && (
                    <BookmarkContainer
                      list_id={list.id}
                      user_id={viewer_user_id}
                    />
                  )}
                </div>
              </>
            )}

            {/* Owner preview: spoiler/preview controls only (everything else
                gated on !previewMode). The kebab still hosts Exit-preview. */}
            {isOwner && previewMode && (
              <div className="list-hero-action-row">
                <ListActionsMenu
                  list={list}
                  showSpoilers={!!showSpoilers}
                  previewMode={!!previewMode}
                  spoilerHref={spoilerHref}
                  previewHref={previewHref}
                  exitPreviewHref={exitPreviewHref}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </ListHeroSurface>
  );
}
