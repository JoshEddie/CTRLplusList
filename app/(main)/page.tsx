import { Suspense } from 'react';
import LoadingIndicator from '@/app/ui/components/LoadingIndicator';
import HomePage from './HomePage';

export default function Page() {
  return (
    <main className="container">
      <Suspense fallback={<LoadingIndicator size="page" />}>
        <HomePage />
      </Suspense>
    </main>
  );
}
