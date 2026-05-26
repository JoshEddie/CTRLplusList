import ListDetails from '@/app/(main)/lists/ui/components/ListDetails';
import ListPrivate from '@/app/(main)/lists/ui/components/ListPrivate';
import { db } from '@/db';
import { list_visits } from '@/db/schema';
import { auth } from '@/lib/auth';
import { getList, getUserById, getUserIdByEmail } from '@/lib/dal';
import { guardListViewable } from '@/lib/listAccess';
import { VISIBILITY } from '@/lib/visibility';
import { sql } from 'drizzle-orm';
import { updateTag } from 'next/cache';
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
  // Inlined (not a server action) because the deferred work cannot call auth()
  // — Next 16 disallows headers()/cookies() inside after(). Viewer id is
  // captured into a local here so the closure never touches request state.
  if (user && !isOwner && list.visibility !== VISIBILITY.OWNER) {
    const viewerId = user.id;
    const listId = id;
    after(async () => {
      try {
        await db
          .insert(list_visits)
          .values({
            user_id: viewerId,
            list_id: listId,
            last_visited_at: new Date(),
            visit_count: 1,
          })
          .onConflictDoUpdate({
            target: [list_visits.user_id, list_visits.list_id],
            set: {
              last_visited_at: new Date(),
              visit_count: sql`${list_visits.visit_count} + 1`,
            },
          });
        updateTag('list_visits');
      } catch (error) {
        console.error('Error recording visit:', error);
      }
    });
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
