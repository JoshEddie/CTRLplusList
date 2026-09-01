import { getItemsByListId } from '@/lib/data/item';
import { authedIdentity } from '@/lib/data/user.session';
import { ItemDisplay, SpoilerTier } from '@/lib/types';
import LoadingIndicator from '@/app/ui/components/LoadingIndicator';
import { Suspense } from 'react';
import SortItems from './SortItems';
import ToolbarSlot from './itemsToolbar/ToolbarSlot';

interface SortItemsContainerProps {
  listId: string;
  tier: SpoilerTier;
}

export default async function SortItemsContainer({
  listId,
  tier,
}: SortItemsContainerProps) {
  const identity = await authedIdentity();

  const items: ItemDisplay[] = await getItemsByListId(listId, {
    viewerSelfProfileId: identity?.selfProfile.id,
    tier,
  });

  const actor = identity?.activeProfile;

  // Mounted beside SortItems rather than inside it: the owner still needs to
  // search, sort, and filter their own list, and the filter is the one
  // condition that leaves this layout. The spoiler control now lives in the
  // hero tile, so the toolbar carries none of it (`spoiler-visibility`).
  return (
    <Suspense fallback={<LoadingIndicator size="page" />}>
      <ToolbarSlot items={items} mode="list" />
      <SortItems items={items} actor={actor} listId={listId} tier={tier} />
    </Suspense>
  );
}
