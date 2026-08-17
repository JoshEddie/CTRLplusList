import MoreCard from '@/app/ui/components/MoreCard';
import UserCard from './UserCard';

export type FollowingFeedProfile = {
  id: string;
  name: string | null;
  image: string | null;
  new_count: number;
  latest_shared_at: Date | null;
};

export default function UserCardGrid({
  profiles,
  emptyMessage,
  moreCount = 0,
  seeAllHref,
}: {
  profiles: FollowingFeedProfile[];
  emptyMessage: React.ReactNode;
  moreCount?: number;
  seeAllHref?: string;
}) {
  if (profiles.length === 0) {
    return <p className="following-empty">{emptyMessage}</p>;
  }
  const showMore = moreCount > 0 && seeAllHref;
  return (
    <ul className="user-card-grid">
      {profiles.map((p) => (
        <li key={p.id}>
          <UserCard
            profile={{ id: p.id, name: p.name, image: p.image }}
            newCount={p.new_count}
            latestSharedAt={p.latest_shared_at}
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
