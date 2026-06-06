import LoadingIndicator from '@/app/ui/components/LoadingIndicator';
import { Suspense } from 'react';
import MyListsPage from './MyListsPage';

export default function Page() {
  return (
    <main className="container container--list-collections">
      <Suspense fallback={<LoadingIndicator size="page" />}>
        <MyListsPage />
      </Suspense>
    </main>
  );
}
