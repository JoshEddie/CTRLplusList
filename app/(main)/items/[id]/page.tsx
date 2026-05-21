import Header from '@/app/ui/components/Header';
import LoadingIndicator from '@/app/ui/components/LoadingIndicator';
import { Suspense } from 'react';
import ItemFormBody from './ItemFormBody';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
};

export default function EditItemPage({ params, searchParams }: Props) {
  return (
    <main className="container">
      <Header title="Edit Item" />
      <Suspense fallback={<LoadingIndicator size="form" />}>
        <ItemFormBody params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
