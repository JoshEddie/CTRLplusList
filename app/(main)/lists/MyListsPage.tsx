import ListCollectionsNav from '@/app/ui/components/ListCollectionsNav';
import LoadingIndicator from '@/app/ui/components/LoadingIndicator';
import { auth } from '@/lib/auth';
import { getUserIdByEmail } from '@/lib/data/user';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import MyListsGrid from './ui/components/MyListsGrid';
import NewListButton from './ui/components/NewListButton';

export default async function MyListsPage() {
  const session = await auth();
  if (!session?.user?.email) redirect('/');
  const viewer = await getUserIdByEmail(session.user.email);
  if (!viewer) redirect('/');

  return (
    <div className="my-lists-page">
      <ListCollectionsNav>
        <NewListButton />
      </ListCollectionsNav>

      <Suspense fallback={<LoadingIndicator size="page" />}>
        <MyListsGrid userId={viewer.id} />
      </Suspense>
    </div>
  );
}
