import Header from '@/app/ui/components/Header';
import { getProfileCardsForUser } from '@/lib/data/profile';
import { authedIdentity } from '@/lib/data/user.session';
import { redirect } from 'next/navigation';
import NewProfileButton from './ui/components/NewProfileButton';
import ProfileCard from './ui/components/ProfileCard';

export default async function ProfilesPage() {
  const identity = await authedIdentity();
  if (!identity) redirect('/');

  // No empty state: every account holds a `self` membership on its own
  // profile, so a zero-card page is unreachable.
  const profiles = await getProfileCardsForUser(identity.userId);

  return (
    <div className="profiles-page">
      <div className="pinned-page-chrome">
        <Header title="Profiles">
          <NewProfileButton />
        </Header>
      </div>
      <p className="profiles-lede">
        Select a profile to make it active — everything you create belongs to
        it. Managing lives behind each card&rsquo;s ⋯ menu.
      </p>
      <div className="profiles-grid">
        {profiles.map((profile) => (
          <ProfileCard
            key={profile.id}
            profile={profile}
            activeProfileId={identity.activeProfile.id}
          />
        ))}
      </div>
    </div>
  );
}
