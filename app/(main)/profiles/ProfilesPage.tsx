import Header from '@/app/ui/components/Header';
import { getProfileCardsForUser } from '@/lib/data/profile';
import { authedUserId } from '@/lib/data/user.session';
import { redirect } from 'next/navigation';
import NewProfileButton from './ui/components/NewProfileButton';
import ProfileCard from './ui/components/ProfileCard';

export default async function ProfilesPage() {
  const userId = await authedUserId();
  if (!userId) redirect('/');

  // No empty state: every account holds a `self` membership on its own
  // profile, so a zero-card page is unreachable.
  const profiles = await getProfileCardsForUser(userId);

  return (
    <div className="profiles-page">
      <Header title="Profiles">
        <NewProfileButton />
      </Header>
      <p className="profiles-lede">
        Select a profile to make it active — everything you create belongs to
        it. Managing lives behind each card&rsquo;s ⋯ menu.
      </p>
      <div className="profiles-grid">
        {profiles.map((profile) => (
          <ProfileCard key={profile.id} profile={profile} />
        ))}
      </div>
    </div>
  );
}
