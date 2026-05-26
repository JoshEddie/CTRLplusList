import Header from '@/app/ui/components/Header';
import LoadingIndicator from '@/app/ui/components/LoadingIndicator';
import { Suspense } from 'react';
import BlockedSection from './BlockedSection';
import FollowersSection from './FollowersSection';
import FollowingSection from './FollowingSection';

export default function ConnectionsPage() {
  return (
    <main className="container">
      <div className="connections-page">
        <Header title="Connections" />

        <Suspense fallback={<LoadingIndicator size="rail" />}>
          <FollowingSection />
        </Suspense>

        <div className="home-rail-divider" role="separator" />

        <Suspense fallback={<LoadingIndicator size="rail" />}>
          <FollowersSection />
        </Suspense>

        <div className="home-rail-divider" role="separator" />

        <Suspense fallback={<LoadingIndicator size="rail" />}>
          <BlockedSection />
        </Suspense>
      </div>
    </main>
  );
}
