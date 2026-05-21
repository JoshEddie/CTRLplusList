import LoadingIndicator from '@/app/ui/components/LoadingIndicator';
import { Metadata } from 'next';
import { Suspense } from 'react';
import ChooseItemsBody from './ChooseItemsBody';

export const metadata: Metadata = {
  title: 'Choose items',
};

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default function ChooseItemsPage({ params, searchParams }: Props) {
  return (
    <main className="container">
      <Suspense fallback={<LoadingIndicator size="form" />}>
        <ChooseItemsBody params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
