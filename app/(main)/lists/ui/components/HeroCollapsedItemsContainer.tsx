import {
  getBookmarkStatus,
  isBlocked,
  isFollowing,
  viewerHasAnyFollows,
} from '@/lib/dal';
import { ListTable } from '@/lib/types';
import { type ListVisibility } from '@/lib/visibility';
import {
  BookmarkMenuItem,
  FollowMenuItem,
  ShareMenuItem,
  VisibilityMenuItems,
} from './HeroCollapsedItems';

// Owner variant — composes the kebab items added when the hero is
// collapsed. Only items NOT already in the base `ListActionsMenu`
// are added here. Choose items and Edit list are already in the base
// menu (they render unconditionally for owner-non-preview), so we
// only prepend Share + Visibility radio rows here.
export async function HeroCollapsedOwnerItems({
  list,
  visibility,
}: {
  list: ListTable;
  visibility: ListVisibility;
}) {
  return (
    <>
      <ShareMenuItem list={list} />
      <VisibilityMenuItems listId={list.id} initialVisibility={visibility} />
    </>
  );
}

// Viewer variant — pre-fetches bookmark + follow + block state so the
// client MenuItems can be hydrated with the correct initial state.
// Block-gating mirrors FollowContainer: if either party blocks, the
// Follow row is suppressed.
export async function HeroCollapsedViewerItems({
  list,
  ownerId,
  ownerName,
  viewerId,
}: {
  list: ListTable;
  ownerId: string;
  ownerName: string | null;
  viewerId: string;
}) {
  const [
    bookmarked,
    following,
    blockedByOwner,
    blockedByViewer,
    hasAnyFollows,
  ] = await Promise.all([
    getBookmarkStatus(list.id, viewerId),
    isFollowing(viewerId, ownerId),
    isBlocked(ownerId, viewerId),
    isBlocked(viewerId, ownerId),
    viewerHasAnyFollows(viewerId),
  ]);

  const showFollow = !blockedByOwner && !blockedByViewer;

  return (
    <>
      <ShareMenuItem list={list} />
      <BookmarkMenuItem listId={list.id} initialBookmarked={bookmarked} />
      {showFollow && (
        <FollowMenuItem
          ownerId={ownerId}
          ownerName={ownerName}
          initialFollowing={following}
          requireDisclosure={!hasAnyFollows}
        />
      )}
    </>
  );
}
