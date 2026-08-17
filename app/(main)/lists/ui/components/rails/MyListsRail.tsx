import ListCardRow from '@/app/ui/components/ListCardRow';
import { getListsByProfile } from '@/lib/data/list';
import { capRail } from './utils';

export default async function MyListsRail({ profileId }: { profileId: string }) {
  const all = await getListsByProfile(profileId);
  const { shown: lists, moreCount } = capRail(all);
  return (
    <ListCardRow
      lists={lists}
      emptyMessage="No lists yet. Create your first one."
      moreCount={moreCount}
      seeAllHref="/lists"
    />
  );
}
