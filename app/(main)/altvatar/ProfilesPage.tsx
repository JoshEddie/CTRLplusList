import Header from '@/app/ui/components/Header';
import { getProfileCardsForUser } from '@/lib/data/profile';
import { authedIdentity } from '@/lib/data/user.session';
import Image from 'next/image';
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
        <Header
          title={
            <Image
              src="/altvatar.webp"
              alt="Altvatar"
              width={208}
              height={36}
              priority
            />
          }
        >
          <NewProfileButton />
        </Header>
      </div>

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
