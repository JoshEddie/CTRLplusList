import EmptyListCTA from '@/app/(main)/items/ui/components/EmptyListCTA';
import ItemsContainer from '@/app/(main)/items/ui/components/ItemsContainer';
import { getList } from '@/lib/data/list';
import { getSpoilerBaseline } from '@/lib/data/profile.members';
import { authedIdentity } from '@/lib/data/user.session';
import { guardListViewable } from '@/lib/listAccess';
import { resolveSpoilerTier } from '@/lib/spoilers';
import { VISIBILITY } from '@/lib/visibility';
import type { ListSectionProps } from './types';

export default async function ListItemsSection({
  params,
  searchParams,
}: ListSectionProps) {
  const identity = await authedIdentity();

  const { id } = await params;
  const sp = await searchParams;

  const list = await guardListViewable(await getList(id), identity);

  const isOwner = identity?.activeProfile.id === list.profile_id;

  // Edit mode carries its own item surface; the default one steps aside.
  if (isOwner && sp.edit === '1') return null;

  // Membership on the owning profile, never the ownership comparison above: a
  // viewer acting as another profile they also run is still the human the
  // surprise is for.
  const tier = resolveSpoilerTier(
    await getSpoilerBaseline(identity?.userId, list.profile_id),
    sp
  );

  // Mirror the hero's visibility gate. When the hero surfaces <ListPrivate>,
  // the items section renders nothing so the page doesn't leak items below
  // the cover-story message.
  if (list.visibility === VISIBILITY.OWNER && !isOwner) {
    return null;
  }

  // One item surface for everyone: the owner's default view is what a member
  // sees, and every entry write lives behind edit mode.
  return (
    <ItemsContainer
      listId={id}
      viewerSelfProfileId={identity?.selfProfile.id}
      tier={tier}
      emptyState={isOwner ? <EmptyListCTA listId={id} /> : undefined}
    />
  );
}
