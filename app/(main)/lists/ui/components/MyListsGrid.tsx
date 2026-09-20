import Empty from '@/app/ui/components/Empty';
import ListCard from '@/app/ui/components/ListCard';
import { getListsByProfile } from '@/lib/data/list';
import { SWITCH_PROFILE_ACTION } from '@/lib/activeProfile';

export default async function MyListsGrid({
  profileId,
  actingAs,
}: {
  profileId: string;
  actingAs?: string;
}) {
  const lists = await getListsByProfile(profileId);

  if (lists.length === 0) {
    return (
      <Empty
        type="list"
        secondaryAction={actingAs ? SWITCH_PROFILE_ACTION : undefined}
      />
    );
  }

  return (
    <ul className="list-card-grid" role="list">
      {lists.map((list) => (
        <li key={list.id}>
          <ListCard list={list} />
        </li>
      ))}
    </ul>
  );
}
