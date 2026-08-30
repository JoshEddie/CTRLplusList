import { randomAccentName } from '@/lib/accent';
import { rollAltvatar } from '@/lib/altvatar/shuffle';
import { getProfileMembership } from '@/lib/data/profile';
import { getAltvatarOptions } from '@/lib/data/profileAvatar';
import { authedIdentity } from '@/lib/data/user.session';
import ProfileSettingsForm from '../ui/components/ProfileSettingsForm';
import InviteFlow from './InviteFlow';
import PermissionsSection from './PermissionsSection';
import ProfileSpaceListsPanel from './ProfileSpaceListsPanel';
import ProfilePage from './ProfilePage';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function AltvatarSpacePage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const identity = await authedIdentity();

  // One address, two audiences: a member administers the altvatar, and everyone
  // else — signed-out viewers included — gets the public view a shared link
  // lands on. The public view owns its own not-found and block handling.
  if (!identity) {
    return <ProfilePage params={params} searchParams={searchParams} />;
  }
  const profile = await getProfileMembership(identity.userId, id);
  if (!profile) {
    return <ProfilePage params={params} searchParams={searchParams} />;
  }

  // A face and a colour are rolled for a profile carrying neither, and written
  // only if the viewer submits — dismissing leaves the profile unset. Rolled
  // here rather than in the form: a roll taken in a client component would
  // differ between the server's render and the browser's.
  //
  // Only for a viewer who can act on it. A `manager`'s submit control is
  // disabled, so rolling for them would paint the header with an identity
  // nobody chose and nobody can save; they see what the profile actually holds.
  const isOwner = profile.role !== 'manager';
  const readOnly = !isOwner;
  const managed = profile.role !== 'self';
  const draft = readOnly
    ? null
    : {
        ...((await getAltvatarOptions(id)) ?? rollAltvatar()),
        accent: profile.accent ?? randomAccentName(),
      };

  return (
    <main className="container container--profile-space">
      <div className="profile-space">
        <ProfileSettingsForm
          profile={profile}
          draft={draft}
          readOnly={readOnly}
          listsPanel={<ProfileSpaceListsPanel profileId={id} />}
          identityActions={
            managed && (
              <InviteFlow
                profileId={id}
                profileName={profile.name}
                viewerIsOwner={isOwner}
              />
            )
          }
          permissionsPanel={
            managed && (
              <PermissionsSection
                profileId={id}
                viewerUserId={identity.userId}
                viewerIsOwner={isOwner}
              />
            )
          }
        />
      </div>
    </main>
  );
}
