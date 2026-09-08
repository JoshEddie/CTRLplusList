import EmptyListCTA from '@/app/(main)/items/ui/components/EmptyListCTA';
import ItemsContainer from '@/app/(main)/items/ui/components/ItemsContainer';
import { getList, getListsByProfile } from '@/lib/data/list';
import { actingAsName } from '@/lib/data/profile.active';
import { getSpoilerBaseline } from '@/lib/data/profile.members';
import { authedIdentity } from '@/lib/data/user.session';
import { guardListViewable } from '@/lib/listAccess';
import { resolveSpoilerTier } from '@/lib/spoilers';
import { VISIBILITY } from '@/lib/visibility';
import ListLibraryPanel from './ListLibraryPanel';
import ListOwnerTabs from './ListOwnerTabs';
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

  // One item surface for everyone; the owner gets a band above it offering the
  // other tab and the way onto this one.
  const surface = (
    <ItemsContainer
      listId={id}
      viewerSelfProfileId={identity?.selfProfile.id}
      tier={tier}
      emptyState={isOwner ? <EmptyListCTA /> : undefined}
    />
  );

  if (!isOwner || !identity) return surface;

  return (
    <ListOwnerTabs
      listId={id}
      inListCount={list.item_count ?? 0}
      lists={await getListsByProfile(identity.activeProfile.id)}
      actingAs={await actingAsName(identity)}
      library={<ListLibraryPanel listId={id} actor={identity.activeProfile} />}
    >
      {surface}
    </ListOwnerTabs>
  );
}
