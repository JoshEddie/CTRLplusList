import ItemsContainer from '@/app/(main)/items/ui/components/ItemsContainer';
import SortItemsContainer from '@/app/(main)/items/ui/components/SortItemsContainer';
import { hasActiveFilter } from '@/app/(main)/items/ui/components/itemsToolbar/utils';
import { getList } from '@/lib/data/list';
import { getSpoilerBaseline } from '@/lib/data/profile.members';
import { authedIdentity } from '@/lib/data/user.session';
import { guardListViewable } from '@/lib/listAccess';
import { resolveSpoilerTier } from '@/lib/spoilers';
import { VISIBILITY } from '@/lib/visibility';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function ListItemsSection({
  params,
  searchParams,
}: Props) {
  const identity = await authedIdentity();

  const { id } = await params;
  const sp = await searchParams;

  const list = await guardListViewable(await getList(id), identity);

  const isOwner = identity?.activeProfile.id === list.profile_id;
  const previewMode = isOwner && sp.preview === 'viewer';

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

  // The filter condition alone leaves the reorder layout: raising the tier
  // changes what each row discloses, not which rows are present or their order,
  // so a drag still writes a position derived from the full set. The owner
  // adjusts their tier from the hero tile while the sortable rows stay put.
  const reorderable =
    isOwner && !previewMode && !hasActiveFilter(sp, 'list_order');

  return reorderable ? (
    <SortItemsContainer listId={id} tier={tier} />
  ) : (
    <ItemsContainer
      listId={id}
      viewerSelfProfileId={identity?.selfProfile.id}
      tier={tier}
      // Preview is the owner asking to be shown their list as a viewer, so it
      // withdraws the ghost entries along with everything else owner-only.
      isOwner={isOwner && !previewMode}
    />
  );
}
