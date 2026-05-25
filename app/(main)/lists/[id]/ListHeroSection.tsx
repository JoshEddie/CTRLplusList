import ListDetails from '@/app/(main)/lists/ui/components/ListDetails';
import ListPrivate from '@/app/(main)/lists/ui/components/ListPrivate';
import { recordVisit } from '@/app/actions/lists';
import { auth } from '@/lib/auth';
import { getList, getUserById, getUserIdByEmail } from '@/lib/dal';
import { guardListViewable } from '@/lib/listAccess';
import { VISIBILITY } from '@/lib/visibility';
import { after } from 'next/server';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function ListHeroSection({ params, searchParams }: Props) {
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

  if (list.visibility === VISIBILITY.OWNER && !isOwner) {
    return <ListPrivate loggedIn={!!user} />;
  }

  // Record the visit for authenticated non-owner viewers of non-private lists.
  // Deferred via after() because the action calls updateTag, which Next 16
  // disallows during render. Server-side, idempotent on (user_id, list_id).
  if (user && !isOwner && list.visibility !== VISIBILITY.OWNER) {
    after(() => recordVisit(id));
  }

  const listOwner = await getUserById(list.user_id);

  return (
    <>
      {!user && <div className="no-user" hidden />}
      <ListDetails
        isOwner={isOwner}
        list={list}
        owner_name={listOwner?.name || undefined}
        owner_image={listOwner?.image || undefined}
        viewer_id={user?.id || undefined}
        showSpoilers={showSpoilers}
        previewMode={previewMode}
        itemCount={list.items?.length ?? 0}
      />
    </>
  );
}
