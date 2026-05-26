import Header from '@/app/ui/components/Header';
import ListCollectionsNav from '@/app/ui/components/ListCollectionsNav';
import LoadingIndicator from '@/app/ui/components/LoadingIndicator';
import { Suspense } from 'react';
import ProfileHeaderSection from './ProfileHeaderSection';
import ProfileListsSection from './ProfileListsSection';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default function ProfilePage({ params, searchParams }: Props) {
  return (
    <main className="container">
      <div className="profile-page">
        <ListCollectionsNav />
        <Suspense fallback={<LoadingIndicator size="rail" />}>
          <ProfileHeaderSection params={params} searchParams={searchParams} />
        </Suspense>
        <Header title="Lists" />
        <Suspense fallback={<LoadingIndicator size="page" />}>
          <ProfileListsSection params={params} />
        </Suspense>
      </div>
    </main>
  );
}
