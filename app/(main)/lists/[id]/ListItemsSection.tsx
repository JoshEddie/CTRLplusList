import ItemsContainer from '@/app/(main)/items/ui/components/ItemsContainer';
import SortItemsContainer from '@/app/(main)/items/ui/components/SortItemsContainer';
import { auth } from '@/lib/auth';
import { getList } from '@/lib/data/list';
import { getUserIdByEmail } from '@/lib/data/user';
import { guardListViewable } from '@/lib/listAccess';
import { VISIBILITY } from '@/lib/visibility';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function ListItemsSection({
  params,
  searchParams,
}: Props) {
  const session = await auth();
  const user = session?.user?.email
    ? await getUserIdByEmail(session.user.email)
    : null;

  const { id } = await params;
  const sp = await searchParams;

  const list = await guardListViewable(await getList(id), user?.id ?? null);

  const isOwner = user?.id === list.user_id;
  const previewMode = isOwner && sp.preview === 'viewer';
  const showSpoilers = isOwner && sp.spoilers === '1';

  // Mirror the hero's visibility gate. When the hero surfaces <ListPrivate>,
  // the items section renders nothing so the page doesn't leak items below
  // the cover-story message.
  if (list.visibility === VISIBILITY.OWNER && !isOwner) {
    return null;
  }

  const effectiveOwner = isOwner && !previewMode;

  return effectiveOwner ? (
    <SortItemsContainer
      listId={id}
      isOwner={true}
      showSpoilers={showSpoilers}
    />
  ) : (
    <ItemsContainer
      listId={id}
      // In preview mode, route through the owner-sanitize path so the
      // spoilers toggle fully gates visibility (off = nothing, on = full names)
      // instead of leaking first names regardless.
      isListOwner={previewMode}
      viewerId={user?.id}
      showSpoilers={showSpoilers}
    />
  );
}
