import ListDetails from '@/app/(main)/lists/ui/components/ListDetails';
import ListPrivate from '@/app/(main)/lists/ui/components/ListPrivate';
import { db } from '@/db';
import { list_visits } from '@/db/schema';
import { getList } from '@/lib/data/list';
import { authedIdentity } from '@/lib/data/user.session';
import { guardListViewable } from '@/lib/listAccess';
import { VISIBILITY } from '@/lib/visibility';
import { sql } from 'drizzle-orm';
import { after } from 'next/server';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function ListHeroSection({ params, searchParams }: Props) {
  const identity = await authedIdentity();

  const { id } = await params;
  const sp = await searchParams;

  const list = await guardListViewable(
    await getList(id),
    identity?.profile.id ?? null
  );

  const isOwner = identity?.profile.id === list.profile_id;
  const previewMode = isOwner && sp.preview === 'viewer';
  const showSpoilers = isOwner && sp.spoilers === '1';

  if (list.visibility === VISIBILITY.OWNER && !isOwner) {
    return <ListPrivate loggedIn={!!identity} />;
  }

  // Record the visit for authenticated non-owner viewers of non-private lists.
  // Inlined (not a server action) because the deferred work cannot call auth()
  // — Next 16 disallows headers()/cookies() inside after(). Viewer id is
  // captured into a local here so the closure never touches request state.
  // No tag fires here: updateTag throws in after(), and every read of
  // last_visited_at/visit_count is uncached — the one cached list_visits read,
  // getBookmarkStatus, keys on favorited_at, which this write never touches
  // (#305).
  if (identity && !isOwner && list.visibility !== VISIBILITY.OWNER) {
    const viewerId = identity.userId;
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
      } catch (error) {
        console.error('Error recording visit:', error);
      }
    });
  }

  return (
    <>
      {!identity && <div className="no-user" hidden />}
      <ListDetails
        isOwner={isOwner}
        list={list}
        owner_name={list.profile?.name || undefined}
        owner_image={list.profile?.members[0]?.user.image || undefined}
        viewer_user_id={identity?.userId || undefined}
        viewer_profile_id={identity?.profile.id || undefined}
        showSpoilers={showSpoilers}
        previewMode={previewMode}
        itemCount={list.items?.length ?? 0}
      />
    </>
  );
}
