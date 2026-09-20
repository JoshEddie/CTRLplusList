import { Suspense } from 'react';
import LoadingIndicator from '@/app/ui/components/LoadingIndicator';
import HomePage from './HomePage';

// The onboarding short-circuit in layout.tsx drops this segment for an
// un-onboarded account, so instant-navigation validation cannot see it;
// declaring the block opts it out rather than leaving the warning standing.
export const instant = false;

export default function Page() {
  return (
    <main className="container">
      <Suspense fallback={<LoadingIndicator size="page" />}>
        <HomePage />
      </Suspense>
    </main>
  );
}
