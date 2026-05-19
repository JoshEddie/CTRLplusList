import MoreCard from '@/app/ui/components/MoreCard';
import UserCard from './UserCard';

export type FollowingFeedUser = {
  id: string;
  name: string | null;
  image: string | null;
  new_count: number;
  latest_shared_at: Date | null;
};

export default function UserCardGrid({
  users,
  emptyMessage,
  moreCount = 0,
  seeAllHref,
}: {
  users: FollowingFeedUser[];
  emptyMessage: React.ReactNode;
  moreCount?: number;
  seeAllHref?: string;
}) {
  if (users.length === 0) {
    return <p className="following-empty">{emptyMessage}</p>;
  }
  const showMore = moreCount > 0 && seeAllHref;
  return (
    <ul className="user-card-grid">
      {users.map((u) => (
        <li key={u.id}>
          <UserCard
            user={{ id: u.id, name: u.name, image: u.image }}
            newCount={u.new_count}
            latestSharedAt={u.latest_shared_at}
          />
        </li>
      ))}
      {showMore && (
        <li>
          <MoreCard moreCount={moreCount} href={seeAllHref} />
        </li>
      )}
    </ul>
  );
}
