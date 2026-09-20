import ListCollectionsNav from '@/app/ui/components/ListCollectionsNav';
import LoadingIndicator from '@/app/ui/components/LoadingIndicator';
import { actingAsName } from '@/lib/data/profile.active';
import { authedIdentity } from '@/lib/data/user.session';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import MyListsGrid from './ui/components/MyListsGrid';
import NewListButton from './ui/components/NewListButton';

export default async function MyListsPage() {
  const identity = await authedIdentity();
  if (!identity) redirect('/');

  const actingAs = await actingAsName(identity);

  return (
    <div className="my-lists-page">
      <ListCollectionsNav>
        <NewListButton actingAs={actingAs} />
      </ListCollectionsNav>

      <Suspense fallback={<LoadingIndicator size="page" />}>
        <MyListsGrid
          profileId={identity.activeProfile.id}
          actingAs={actingAs}
        />
      </Suspense>
    </div>
  );
}
