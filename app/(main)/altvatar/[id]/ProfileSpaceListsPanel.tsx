import { getListsByProfile } from '@/lib/data/list';
import PublicListsGrid from '../../users/ui/components/PublicListsGrid';

// Every list the profile owns, not just the shared ones the public view shows:
// this surface is reached only by a member, and a member administering the
// profile needs to see what it actually holds.
export default async function ProfileSpaceListsPanel({
  profileId,
}: {
  profileId: string;
}) {
  const lists = await getListsByProfile(profileId);
  return (
    <div className="profile-space-lists">
      <PublicListsGrid lists={lists} />
    </div>
  );
}
