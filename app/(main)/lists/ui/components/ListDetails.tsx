import FollowContainer from '@/app/(main)/users/ui/components/FollowContainer';
import { ListTable } from '@/lib/types';
import Link from 'next/link';
import { FaCalendar, FaUser } from 'react-icons/fa';
import { MdChecklist, MdModeEdit, MdVisibility } from 'react-icons/md';
import BookmarkContainer from './BookmarkContainer';
import ListActionsMenu from './ListActionsMenu';
import ShareButton from './ShareButton';
import VisibilityPicker from './VisibilityPicker';

type ListWithVisibility = ListTable & {
  visibility?: 'private' | 'unlisted' | 'public';
};

function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    timeZone: 'UTC',
  });
}

export default function ListDetails({
  isOwner,
  list,
  user_name,
  user_id,
  showSpoilers,
  previewMode,
}: {
  isOwner: boolean;
  list: ListWithVisibility;
  user_name: string | undefined;
  user_id: string | undefined;
  showSpoilers?: boolean;
  previewMode?: boolean;
}) {
  const visibility = list.visibility ?? (list.shared ? 'unlisted' : 'private');
  const previewHref = `/lists/${list.id}?preview=viewer${
    showSpoilers ? '&spoilers=1' : ''
  }`;
  const exitPreviewHref = `/lists/${list.id}${showSpoilers ? '?spoilers=1' : ''}`;
  const spoilerHref = showSpoilers
    ? `/lists/${list.id}${previewMode ? '?preview=viewer' : ''}`
    : `/lists/${list.id}?${previewMode ? 'preview=viewer&' : ''}spoilers=1`;

  return (
    <div className="list-hero">
      {previewMode && (
        <div className="preview-banner" role="status">
          <MdVisibility />
          <span>You&apos;re previewing this list as a viewer.</span>
          <Link href={exitPreviewHref} className="btn">
            Exit preview
          </Link>
        </div>
      )}

      <div className="list-hero-row">
        <div className="list-hero-info">
          <h1 className="list-hero-title">{list.name}</h1>
          {list.subtitle ? (
            <div className="list-hero-subtitle">{list.subtitle}</div>
          ) : null}
          <div className="list-hero-meta">
            {user_name && (
              <span className="list-hero-mi">
                <FaUser aria-hidden /> {user_name}
              </span>
            )}
            <span className="list-hero-mi">
              <FaCalendar aria-hidden /> {formatDate(list.date)}
            </span>
            {list.occasion ? (
              <span className="list-hero-chip">{list.occasion}</span>
            ) : null}
          </div>
        </div>

        {/* Visibility status + picker on the right of the hero (owner only) */}
        {isOwner && !previewMode && (
          <div className="list-hero-side">
            <VisibilityPicker
              listId={list.id}
              initialVisibility={visibility}
            />
          </div>
        )}
      </div>

      <div className="list-hero-actions">
        {!previewMode && <ShareButton list={list} />}

        {isOwner && !previewMode && (
          <>
            <Link
              className="btn list-hero-btn"
              href={`/lists/${list.id}/choose-items`}
            >
              <MdChecklist />
              <span className="label">Choose items</span>
            </Link>
            <Link
              className="btn list-hero-btn"
              href={`/lists/${list.id}/edit`}
            >
              <MdModeEdit />
              <span className="label">Edit list</span>
            </Link>
            <ListActionsMenu
              listId={list.id}
              showSpoilers={!!showSpoilers}
              previewMode={!!previewMode}
              spoilerHref={spoilerHref}
              previewHref={previewHref}
              exitPreviewHref={exitPreviewHref}
            />
          </>
        )}

        {!isOwner && user_id && (
          <>
            <FollowContainer
              ownerId={list.user_id}
              ownerName={user_name ?? null}
              viewerId={user_id}
            />
            <BookmarkContainer list_id={list.id} user_id={user_id} />
          </>
        )}
      </div>
    </div>
  );
}
