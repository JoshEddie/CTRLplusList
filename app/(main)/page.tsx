import { Suspense } from 'react';
import LoadingIndicator from '@/app/ui/components/LoadingIndicator';
import HomePage from './HomePage';

export default function Page() {
  return (
    <Suspense fallback={<LoadingIndicator size="page" />}>
      <HomePage />
    </Suspense>
  );
}
