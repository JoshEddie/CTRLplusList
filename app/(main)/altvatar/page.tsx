import LoadingIndicator from '@/app/ui/components/LoadingIndicator';
import { Suspense } from 'react';
import ProfilesPage from './ProfilesPage';

export default function Page() {
  return (
    <main className="container container--profiles">
      <Suspense fallback={<LoadingIndicator size="page" />}>
        <ProfilesPage />
      </Suspense>
    </main>
  );
}
