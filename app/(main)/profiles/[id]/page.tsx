import LoadingIndicator from '@/app/ui/components/LoadingIndicator';
import { Suspense } from 'react';
import ProfileSpacePage from './ProfileSpacePage';

// `params` is handed down unawaited: awaiting it in the shell holds the whole
// navigation on runtime data, where awaiting it inside the boundary streams
// the fallback immediately.
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="container container--profile-space">
      <Suspense fallback={<LoadingIndicator size="page" />}>
        <ProfileSpacePage params={params} />
      </Suspense>
    </main>
  );
}
