import Avatar from '@/app/(main)/users/ui/components/Avatar';
import FollowContainer from '@/app/(main)/users/ui/components/FollowContainer';
import { LinkButton } from '@/app/ui/components/button';
import { ListTable } from '@/lib/types';
import { VISIBILITY, type ListVisibility } from '@/lib/visibility';
import Link from 'next/link';
import { MdChecklist, MdVisibility } from 'react-icons/md';
import BookmarkContainer from './BookmarkContainer';
import EditListAction from './EditListAction';
import HeroCollapseShell from './HeroCollapseShell';
import {
  HeroCollapsedOwnerItems,
  HeroCollapsedViewerItems,
} from './HeroCollapsedItemsContainer';
import ListActionsMenu from './ListActionsMenu';
import ShareButton from './ShareButton';
import VisibilityPicker from './VisibilityPicker';

type ListWithVisibility = ListTable & {
  visibility?: ListVisibility;
};

// Relative-time helper. Returns "just now", "2 days ago", "3 weeks ago", etc.
// Inlined here because this is the only caller; promote to a shared util when
// a second surface needs it.
function timeAgo(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 60) return 'just now';
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const units: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, 'minute'],
    [3600, 'hour'],
    [86400, 'day'],
    [604800, 'week'],
    [2592000, 'month'],
    [31536000, 'year'],
  ];
  let value = diffSec;
  let unit: Intl.RelativeTimeFormatUnit = 'second';
  for (let i = 0; i < units.length; i++) {
    const [seconds, u] = units[i];
    if (diffSec >= seconds) {
      const next = units[i + 1];
      if (!next || diffSec < next[0]) {
        value = Math.round(diffSec / seconds);
        unit = u;
        break;
      }
    }
  }
  return rtf.format(-value, unit);
}

export default async function ListDetails({
  isOwner,
  list,
  owner_name,
  owner_image,
  viewer_id,
  showSpoilers,
  previewMode,
  itemCount,
}: {
  isOwner: boolean;
  list: ListWithVisibility;
  owner_name: string | undefined;
  owner_image: string | undefined;
  viewer_id: string | undefined;
  showSpoilers?: boolean;
  previewMode?: boolean;
  itemCount: number;
}) {
  const visibility =
    list.visibility ?? (list.shared ? VISIBILITY.LINK : VISIBILITY.OWNER);
  const previewHref = `/lists/${list.id}?preview=viewer${
    showSpoilers ? '&spoilers=1' : ''
  }`;
  const exitPreviewHref = `/lists/${list.id}${showSpoilers ? '?spoilers=1' : ''}`;
  const spoilerHref = showSpoilers
    ? `/lists/${list.id}${previewMode ? '?preview=viewer' : ''}`
    : `/lists/${list.id}?${previewMode ? 'preview=viewer&' : ''}spoilers=1`;

  const updatedDisplay = list.updated_at ? timeAgo(list.updated_at) : '';
  const itemsDisplay = `${itemCount} ${itemCount === 1 ? 'item' : 'items'}`;
  const showOwnerControls = isOwner && !previewMode;
  const showViewerControls = !isOwner && viewer_id && !previewMode;

  // Compose the prepended kebab items shown when the hero is collapsed.
  // Owner-preview gets the owner items (Share/Choose/Edit/Visibility are
  // still owner affordances in preview mode — visibility just shows current
  // state). Pure viewers get the viewer items.
  let collapsedPrepended: React.ReactNode = null;
  if (isOwner && !previewMode) {
    collapsedPrepended = (
      <HeroCollapsedOwnerItems list={list} visibility={visibility} />
    );
  } else if (!isOwner && viewer_id && !previewMode) {
    collapsedPrepended = (
      <HeroCollapsedViewerItems
        list={list}
        ownerId={list.user_id}
        ownerName={owner_name ?? null}
        viewerId={viewer_id}
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
    <HeroCollapseShell title={list.name} collapsedKebab={collapsedKebab}>
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
              <div className="list-hero-share-wrapper">
                {ownerControls}
              </div>
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
                {/* <ShareButton list={list} />
                <div className="list-hero-divider" /> */}
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
                  <Avatar src={owner_image} name={owner_name} size={44} />
                  <div className="list-hero-byline-text">
                    <Link
                      href={`/user/${list.user_id}`}
                      className="list-hero-byline-link"
                    >
                      {owner_name}
                    </Link>
                    <FollowContainer
                      ownerId={list.user_id}
                      ownerName={owner_name ?? null}
                      viewerId={viewer_id}
                      variant="on-dark"
                    />
                  </div>
                </div>
                <div className="list-hero-divider" />
                <div className="list-hero-action-row">
                  <ShareButton list={list} />
                  {viewer_id && (
                    <BookmarkContainer list_id={list.id} user_id={viewer_id} />
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
    </HeroCollapseShell>
  );
}
