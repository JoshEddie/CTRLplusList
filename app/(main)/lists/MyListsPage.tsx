import ListCollectionsNav from '@/app/ui/components/ListCollectionsNav';
import LoadingIndicator from '@/app/ui/components/LoadingIndicator';
import { authedIdentity } from '@/lib/data/user.session';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import MyListsGrid from './ui/components/MyListsGrid';
import NewListButton from './ui/components/NewListButton';

export default async function MyListsPage() {
  const identity = await authedIdentity();
  if (!identity) redirect('/');

  return (
    <div className="my-lists-page">
      <ListCollectionsNav>
        <NewListButton />
      </ListCollectionsNav>

      <Suspense fallback={<LoadingIndicator size="page" />}>
        <MyListsGrid profileId={identity.profile.id} />
      </Suspense>
    </div>
  );
}
