import ListDetails from '@/app/(main)/lists/ui/components/ListDetails';
import { enterEditHref } from './editModeChanges';
import ListPrivate from '@/app/(main)/lists/ui/components/ListPrivate';
import { db } from '@/db';
import { list_visits } from '@/db/schema';
import { getList } from '@/lib/data/list';
import {
  getSpoilerBaseline,
  viewerIsProfileMember,
} from '@/lib/data/profile.members';
import { getListClaimedCount } from '@/lib/data/purchase';
import { authedIdentity } from '@/lib/data/user.session';
import { guardListViewable } from '@/lib/listAccess';
import { atLeast, resolveSpoilerTier } from '@/lib/spoilers';
import { VISIBILITY } from '@/lib/visibility';
import { sql } from 'drizzle-orm';
import { after } from 'next/server';
import type { ListSectionProps } from './types';

export default async function ListHeroSection({
  params,
  searchParams,
}: ListSectionProps) {
  const identity = await authedIdentity();

  const { id } = await params;
  const sp = await searchParams;

  // The guard's block check is the human's, so it takes the whole identity
  // and compares the self-profile; `isOwner` is an ownership comparison and
  // takes the profile the request acts as. The Follow affordance downstream
  // needs both, which is why neither is folded into one viewer id.
  const list = await guardListViewable(await getList(id), identity);

  const isOwner = identity?.activeProfile.id === list.profile_id;
  const previewMode = isOwner && sp.preview === 'viewer';

  // Edit mode replaces the hero with its own band; the two never coexist.
  if (isOwner && sp.edit === '1') return null;

  // Preview renders claim information at the OWNER's own resolved tier, not a
  // non-member's: a preview honest about claim data would show every claim with
  // names and spoil the person who opened it.
  const baseline = await getSpoilerBaseline(identity?.userId, list.profile_id);
  const tier = resolveSpoilerTier(baseline, sp);
  const viewerIsMember = await viewerIsProfileMember(
    identity?.userId,
    list.profile_id
  );

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
        owner={list.profile}
        viewer_user_id={identity?.userId || undefined}
        viewer_self_profile_id={identity?.selfProfile.id || undefined}
        tier={tier}
        viewerIsMember={viewerIsMember}
        baseline={baseline}
        claimedCount={
          atLeast(tier, 'progress')
            ? (await getListClaimedCount(id)).claimedItemCount
            : undefined
        }
        previewMode={previewMode}
        itemCount={list.item_count}
        editHref={enterEditHref(
          id,
          new URLSearchParams(sp as Record<string, string>)
        )}
      />
    </>
  );
}
