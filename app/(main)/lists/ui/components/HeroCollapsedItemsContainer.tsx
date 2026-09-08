// TODO(#343): split the extra components into their own files, then drop this disable
/* eslint-disable react/no-multi-comp */

import { getBookmarkStatus } from '@/lib/data/visit';
import { ListTable } from '@/lib/types';
import { type ListVisibility } from '@/lib/visibility';
import {
  BookmarkMenuItem,
  ShareMenuItem,
  VisibilityMenuItems,
} from './HeroCollapsedItems';

// Owner variant — composes the kebab items added when the hero is
// collapsed. Only items NOT already in the base `ListActionsMenu`
// are added here. Edit list is already in the base menu, so we
// only prepend Share + Visibility radio rows here.
export async function HeroCollapsedOwnerItems({
  list,
  visibility,
  disabled,
}: {
  list: ListTable;
  visibility: ListVisibility;
  disabled: boolean;
}) {
  return (
    <>
      <ShareMenuItem list={list} />
      <VisibilityMenuItems
        listId={list.id}
        initialVisibility={visibility}
        disabled={disabled}
      />
    </>
  );
}

// Viewer variant — pre-fetches bookmark state so the client MenuItem can be
// hydrated with it. Follow is not here: it lives inside the profile card the
// byline row opens.
export async function HeroCollapsedViewerItems({
  list,
  viewerUserId,
}: {
  list: ListTable;
  viewerUserId: string;
}) {
  const bookmarked = await getBookmarkStatus(list.id, viewerUserId);

  return (
    <>
      <ShareMenuItem list={list} />
      <BookmarkMenuItem listId={list.id} initialBookmarked={bookmarked} />
    </>
  );
}
